import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import { PrismaClient } from "../generated/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import type { Bindings } from "../index";
import { loginToCCXP, CCXPLoginError } from "./browser-login";
import {
  storeCredential,
  retrieveCredential,
  revokeCredential,
  cleanupExpired,
} from "./credential-store";

const COOKIE_NAME = "ccxp_credential_token";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

const app = new Hono<{ Bindings: Bindings }>();

function getClientIP(c: {
  req: { header: (name: string) => string | undefined };
}): string {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown-ip"
  );
}

function setCredentialCookie(c: any, token: string) {
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    path: "/ccxp/auth",
    maxAge: COOKIE_MAX_AGE,
  });
}

function getEncKey(c: any): string {
  return (
    c.env.NTHU_HEADLESS_AIS_ENCRYPTION_KEY ??
    process.env.NTHU_HEADLESS_AIS_ENCRYPTION_KEY ??
    ""
  );
}

function getPrisma(c: any): PrismaClient {
  const adapter = new PrismaD1(c.env.DB);
  return new PrismaClient({ adapter } as any);
}

// POST /ccxp/auth/login
app.post(
  "/login",
  zValidator(
    "form",
    z.object({
      studentid: z.string().nonempty(),
      password: z.string().nonempty(),
      store_credentials: z.string().optional(),
    }),
  ),
  async (c) => {
    const { success } = await c.env.LOGIN_RATE_LIMITER.limit({
      key: getClientIP(c),
    });
    if (!success) {
      return c.json(
        {
          error: {
            message: "Too many login attempts. Please try again later.",
          },
        },
        429,
      );
    }

    const { studentid, password, store_credentials } = c.req.valid("form");
    const ocrBaseUrl =
      c.env.NTHUMODS_OCR_BASE_URL ?? process.env.NTHUMODS_OCR_BASE_URL ?? "";

    try {
      const result = await loginToCCXP(
        c.env.BROWSER,
        ocrBaseUrl,
        studentid,
        password,
      );

      let hasStoredCredentials = false;

      if (store_credentials === "true") {
        const encKey = getEncKey(c);
        if (encKey) {
          const prisma = getPrisma(c);
          const credentialToken = await storeCredential(
            prisma,
            studentid,
            password,
            encKey,
          );
          setCredentialCookie(c, credentialToken);
          hasStoredCredentials = true;
        }
      }

      // credential_token is NOT returned in the response body — it's in an httpOnly cookie
      return c.json({
        ACIXSTORE: result.ACIXSTORE,
        passwordExpired: result.passwordExpired,
        data: result.data,
        hasStoredCredentials,
      });
    } catch (err) {
      if (err instanceof CCXPLoginError) {
        const messages: Record<string, string> = {
          IncorrectCredentials: "Incorrect student ID or password.",
          CaptchaError:
            "Too many failed login attempts on CCXP. Please wait 15 minutes.",
          OCRFailed: "CAPTCHA solving failed. Please try again.",
          Unknown: "An unexpected error occurred. Please try again.",
        };
        return c.json(
          { error: { message: messages[err.code] ?? "Login failed." } },
          err.code === "IncorrectCredentials" ? 401 : 500,
        );
      }
      console.error("auth/login error");
      return c.json({ error: { message: "Login failed." } }, 500);
    }
  },
);

// POST /ccxp/auth/refresh
// Reads credential_token from httpOnly cookie, not from request body
app.post("/refresh", async (c) => {
  // Rate limit refresh too — each refresh triggers a full CCXP login
  const { success } = await c.env.LOGIN_RATE_LIMITER.limit({
    key: `refresh:${getClientIP(c)}`,
  });
  if (!success) {
    return c.json(
      {
        error: {
          message: "Too many refresh attempts. Please try again later.",
        },
      },
      429,
    );
  }

  const credentialToken = getCookie(c, COOKIE_NAME);
  if (!credentialToken) {
    return c.json(
      {
        error: { message: "No stored credentials found. Please log in again." },
      },
      401,
    );
  }

  const encKey = getEncKey(c);
  if (!encKey) {
    return c.json(
      { error: { message: "Server credential storage not configured." } },
      503,
    );
  }

  const prisma = getPrisma(c);
  const creds = await retrieveCredential(prisma, credentialToken, encKey);
  if (!creds) {
    deleteCookie(c, COOKIE_NAME, { path: "/ccxp/auth" });
    return c.json(
      {
        error: {
          message:
            "Credential token expired or not found. Please log in again.",
        },
      },
      401,
    );
  }

  const ocrBaseUrl =
    c.env.NTHUMODS_OCR_BASE_URL ?? process.env.NTHUMODS_OCR_BASE_URL ?? "";

  try {
    const result = await loginToCCXP(
      c.env.BROWSER,
      ocrBaseUrl,
      creds.studentId,
      creds.password,
    );

    // Rotate token: delete old, create new
    await revokeCredential(prisma, credentialToken);
    const newToken = await storeCredential(
      prisma,
      creds.studentId,
      creds.password,
      encKey,
    );
    setCredentialCookie(c, newToken);

    return c.json({ ACIXSTORE: result.ACIXSTORE });
  } catch (err) {
    if (err instanceof CCXPLoginError) {
      return c.json(
        { error: { message: "Re-login failed. Please log in again." } },
        401,
      );
    }
    return c.json({ error: { message: "Refresh failed." } }, 500);
  }
});

// POST /ccxp/auth/logout
// Reads credential_token from httpOnly cookie
app.post("/logout", async (c) => {
  const credentialToken = getCookie(c, COOKIE_NAME);
  if (credentialToken) {
    const prisma = getPrisma(c);
    await revokeCredential(prisma, credentialToken);
  }
  deleteCookie(c, COOKIE_NAME, { path: "/ccxp/auth" });
  return c.json({ success: true });
});

// POST /ccxp/auth/cleanup — purge expired credentials (call from cron or admin)
app.post("/cleanup", async (c) => {
  const prisma = getPrisma(c);
  const count = await cleanupExpired(prisma);
  return c.json({ purged: count });
});

export default app;
