import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import supabase from "../../config/supabase";
import { recordAdminAction } from "../../utils/adminAudit";
import type { AdminEnv } from "./env";

/**
 * Announcements live in the public content database (`public.alerts`), not in
 * the auth database, because the banner is read by every anonymous visitor.
 * RLS there only exposes rows with `active = true`; this router holds the
 * service role key, so drafts are visible here and nowhere else.
 */

const severity = z.enum(["info", "warning", "error"]);

const announcementBody = z.object({
  title: z.string().trim().min(1).max(200),
  title_en: z.string().trim().max(200).nullish(),
  description: z.string().trim().max(1000).nullish(),
  description_en: z.string().trim().max(1000).nullish(),
  link_url: z.string().trim().max(500).nullish(),
  link_label: z.string().trim().max(100).nullish(),
  link_label_en: z.string().trim().max(100).nullish(),
  severity,
  start_date: z.string().datetime({ offset: true }),
  end_date: z.string().datetime({ offset: true }),
  active: z.boolean().default(true),
  dismissible: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(0),
});

/**
 * A link is either an in-app path or a full URL. Anything else — `javascript:`
 * above all — would be rendered straight into an anchor on a page every visitor
 * sees, so it is rejected at the edge rather than sanitised at render time.
 */
const isAllowedLink = (link: string | null | undefined) => {
  if (!link) return true;
  if (link.startsWith("/")) return true;
  try {
    const url = new URL(link);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const validateDates = (start: string, end: string) =>
  new Date(start).getTime() < new Date(end).getTime();

const app = new Hono<AdminEnv>()
  // Every announcement, drafts included, newest window first.
  .get("/", async (c) => {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      console.error("admin announcements: list failed", error.message);
      return c.json({ error: "upstream_error" }, 502);
    }

    return c.json(data ?? []);
  })

  .post("/", zValidator("json", announcementBody), async (c) => {
    const actor = c.get("user");
    const body = c.req.valid("json");

    if (!isAllowedLink(body.link_url)) {
      return c.json(
        {
          error: "invalid_request",
          error_description:
            "link_url must be an in-app path or an http(s) URL",
        },
        400,
      );
    }

    if (!validateDates(body.start_date, body.end_date)) {
      return c.json(
        {
          error: "invalid_request",
          error_description: "start_date must fall before end_date",
        },
        400,
      );
    }

    const { data, error } = await supabase
      .from("alerts")
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error("admin announcements: create failed", error.message);
      return c.json({ error: "upstream_error" }, 502);
    }

    await recordAdminAction({
      actorId: actor.userId,
      action: "announcement.create",
      targetType: "announcement",
      targetId: String(data.id),
      metadata: { title: body.title, active: body.active },
    });

    return c.json(data, 201);
  })

  .patch("/:id", zValidator("json", announcementBody.partial()), async (c) => {
    const actor = c.get("user");
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) {
      return c.json({ error: "invalid_request" }, 400);
    }

    const body = c.req.valid("json");

    if (!isAllowedLink(body.link_url)) {
      return c.json(
        {
          error: "invalid_request",
          error_description:
            "link_url must be an in-app path or an http(s) URL",
        },
        400,
      );
    }

    if (
      body.start_date &&
      body.end_date &&
      !validateDates(body.start_date, body.end_date)
    ) {
      return c.json(
        {
          error: "invalid_request",
          error_description: "start_date must fall before end_date",
        },
        400,
      );
    }

    const { data, error } = await supabase
      .from("alerts")
      .update(body)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("admin announcements: update failed", error.message);
      return c.json({ error: "upstream_error" }, 502);
    }
    if (!data) return c.json({ error: "not_found" }, 404);

    await recordAdminAction({
      actorId: actor.userId,
      action: "announcement.update",
      targetType: "announcement",
      targetId: String(id),
      metadata: { fields: Object.keys(body) },
    });

    return c.json(data);
  })

  .delete("/:id", async (c) => {
    const actor = c.get("user");
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) {
      return c.json({ error: "invalid_request" }, 400);
    }

    const { data, error } = await supabase
      .from("alerts")
      .delete()
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("admin announcements: delete failed", error.message);
      return c.json({ error: "upstream_error" }, 502);
    }
    if (!data) return c.json({ error: "not_found" }, 404);

    await recordAdminAction({
      actorId: actor.userId,
      action: "announcement.delete",
      targetType: "announcement",
      targetId: String(id),
      metadata: { title: data.title },
    });

    return c.json({ deleted: true });
  });

export default app;
