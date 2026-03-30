import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import type { Bindings } from "../index";
import { loginToCCXP, CCXPLoginError } from "./browser-login";
import {
  storeCredential,
  retrieveCredential,
  revokeCredential,
  cleanupExpired,
} from "./credential-store";
import prismaClients from "../prisma/client";

const COOKIE_NAME = "ccxp_credential_token";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

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
    secure: process.env.NODE_ENV === "production",
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

// Chained route definitions for Hono RPC type inference
const app = new Hono<{ Bindings: Bindings }>()
  // POST /ccxp/auth/login
  .post(
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
            const prisma = await prismaClients.fetch(c.env.DB);
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
  )
  // POST /ccxp/auth/refresh
  .post("/refresh", async (c) => {
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
          error: {
            message: "No stored credentials found. Please log in again.",
          },
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

    const prisma = await prismaClients.fetch(c.env.DB);
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
  })
  // POST /ccxp/auth/logout
  .post("/logout", async (c) => {
    const credentialToken = getCookie(c, COOKIE_NAME);
    if (credentialToken) {
      const prisma = await prismaClients.fetch(c.env.DB);
      await revokeCredential(prisma, credentialToken);
    }
    deleteCookie(c, COOKIE_NAME, { path: "/ccxp/auth" });
    return c.json({ success: true });
  })
  // POST /ccxp/auth/cleanup — rate-limited to prevent abuse
  .post("/cleanup", async (c) => {
    const { success } = await c.env.LOGIN_RATE_LIMITER.limit({
      key: `cleanup:${getClientIP(c)}`,
    });
    if (!success) {
      return c.json({ error: { message: "Too many requests." } }, 429);
    }
    const prisma = await prismaClients.fetch(c.env.DB);
    const count = await cleanupExpired(prisma);
    return c.json({ purged: count });
  });

export default app;
