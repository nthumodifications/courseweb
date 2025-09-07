import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { sha256hash } from "../utils/sha256";

const prisma = new PrismaClient();

const app = new Hono()
  // Middleware to ensure user is authenticated
  .use("*", requireAuth())

  // List all API keys for the authenticated user
  .get("/", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId: user.userId,
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
        lastUsedAt: true,
        isRevoked: true,
      },
    });

    return c.json(apiKeys);
  })

  // Create a new API key
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        name: z.string().min(1),
        scopes: z.array(
          z.enum(["calendar:read", "calendar:write", "profile:read"]),
        ),
        expiresAt: z.string().datetime().optional(),
      }),
    ),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      const { name, scopes, expiresAt } = c.req.valid("json");

      // Generate a secure API key with 32 bytes of randomness
      const apiKeyString =
        "api_" +
        Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");

      const hashedKey = await sha256hash(apiKeyString);

      const apiKey = await prisma.apiKey.create({
        data: {
          name,
          key: hashedKey,
          scopes,
          userId: user.userId,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        },
        select: {
          id: true,
          name: true,
          key: true,
          scopes: true,
          expiresAt: true,
        },
      });

      return c.json(
        {
          ...apiKey,
          key: apiKeyString, // Return the plain API key to the user
        },
        201,
      );
    },
  )

  // Delete an API key
  .delete(
    "/:id",
    zValidator(
      "param",
      z.object({
        id: z.string().uuid(),
      }),
    ),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { id } = c.req.valid("param");

      // Verify the API key belongs to the user
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          id,
          userId: user.userId,
        },
      });

      if (!apiKey) {
        return c.json({ error: "API key not found" }, 404);
      }

      await prisma.apiKey.delete({
        where: { id },
      });

      return c.json({ success: true });
    },
  )

  // Revoke an API key (mark as revoked but don't delete)
  .put(
    "/:id/revoke",
    zValidator(
      "param",
      z.object({
        id: z.string().uuid(),
      }),
    ),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { id } = c.req.valid("param");

      // Verify the API key belongs to the user
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          id,
          userId: user.userId,
        },
      });

      if (!apiKey) {
        return c.json({ error: "API key not found" }, 404);
      }

      await prisma.apiKey.update({
        where: { id },
        data: { isRevoked: true },
      });

      return c.json({ success: true });
    },
  );

export default app;
