import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { PrismaClient } from "../generated/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import type { Bindings } from "../index";
import { loginToCCXP, CCXPLoginError } from "./browser-login";
import {
  storeCredential,
  retrieveCredential,
  revokeCredential,
} from "./credential-store";

const app = new Hono<{ Bindings: Bindings }>();

// POST /ccxp/auth/login
app.post(
  "/login",
  zValidator(
    "form",
    z.object({
      studentid: z.string().nonempty(),
      password: z.string().nonempty(),
      store_credentials: z.string().optional(), // "true" to opt in
    }),
  ),
  async (c) => {
    // Rate limit
    const { success } = await c.env.LOGIN_RATE_LIMITER.limit({
      key: c.req.header("cf-connecting-ip") ?? "unknown",
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

      let credential_token: string | undefined;

      if (store_credentials === "true") {
        const encKey =
          c.env.NTHU_HEADLESS_AIS_ENCRYPTION_KEY ??
          process.env.NTHU_HEADLESS_AIS_ENCRYPTION_KEY ??
          "";
        if (encKey) {
          const adapter = new PrismaD1(c.env.DB);
          const prisma = new PrismaClient({ adapter } as any);
          credential_token = await storeCredential(
            prisma,
            studentid,
            password,
            encKey,
          );
        }
      }

      return c.json({ ...result, credential_token });
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
      console.error("auth/login unexpected error", err);
      return c.json({ error: { message: "Login failed." } }, 500);
    }
  },
);

// POST /ccxp/auth/refresh
app.post(
  "/refresh",
  zValidator(
    "form",
    z.object({
      credential_token: z.string().nonempty(),
    }),
  ),
  async (c) => {
    const { credential_token } = c.req.valid("form");
    const encKey =
      c.env.NTHU_HEADLESS_AIS_ENCRYPTION_KEY ??
      process.env.NTHU_HEADLESS_AIS_ENCRYPTION_KEY ??
      "";

    if (!encKey) {
      return c.json(
        { error: { message: "Server credential storage not configured." } },
        503,
      );
    }

    const adapter = new PrismaD1(c.env.DB);
    const prisma = new PrismaClient({ adapter } as any);

    const creds = await retrieveCredential(prisma, credential_token, encKey);
    if (!creds) {
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

      // Rotate the token: delete old, create new
      await revokeCredential(prisma, credential_token);
      const new_credential_token = await storeCredential(
        prisma,
        creds.studentId,
        creds.password,
        encKey,
      );

      return c.json({
        ACIXSTORE: result.ACIXSTORE,
        credential_token: new_credential_token,
      });
    } catch (err) {
      if (err instanceof CCXPLoginError) {
        return c.json(
          { error: { message: "Re-login failed. Please log in again." } },
          401,
        );
      }
      return c.json({ error: { message: "Refresh failed." } }, 500);
    }
  },
);

// POST /ccxp/auth/logout
app.post(
  "/logout",
  zValidator(
    "form",
    z.object({
      credential_token: z.string().nonempty(),
    }),
  ),
  async (c) => {
    const { credential_token } = c.req.valid("form");

    const adapter = new PrismaD1(c.env.DB);
    const prisma = new PrismaClient({ adapter } as any);
    await revokeCredential(prisma, credential_token);

    return c.json({ success: true });
  },
);

export default app;
