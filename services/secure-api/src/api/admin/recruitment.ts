import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import supabase from "../../config/supabase";
import { recordAdminAction } from "../../utils/adminAudit";
import type { AdminEnv } from "./env";

/**
 * Recruitment applications.
 *
 * Applicants submit through the main API into `public.recruitment_applications`,
 * a table with RLS that grants browser roles nothing at all — until now there
 * was no way to read an application short of a database console, so every
 * submission went into a drawer nobody could open.
 *
 * Everything here is personal data: a statement someone wrote about themselves,
 * their contact preference, their links and their CV. It is read with the
 * service role, behind the staff gate, and every read of a CV is audited.
 */

const RESUME_BUCKET = "resumes";

/** Matches the statuses the table's CHECK constraint allows. */
const STATUS = z.enum(["submitted", "reviewing", "accepted", "rejected"]);

const app = new Hono<AdminEnv>()
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        status: STATUS.optional(),
        role: z.string().trim().max(50).optional(),
      }),
    ),
    async (c) => {
      const { status, role } = c.req.valid("query");

      let query = supabase
        .from("recruitment_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);
      if (role) query = query.eq("role", role);

      const { data, error } = await query;

      if (error) {
        console.error("admin recruitment: list failed", error.message);
        return c.json({ error: "upstream_error" }, 502);
      }

      // The CV path is deliberately not returned. It is only useful through a
      // signed URL, and handing every list response an object path invites
      // someone to build a link to it.
      const applications = (data ?? []).map(
        ({ resume_object_path, ...application }) => application,
      );

      return c.json(applications);
    },
  )

  .patch(
    "/:id",
    zValidator("json", z.object({ status: STATUS })),
    async (c) => {
      const actor = c.get("user");
      const id = c.req.param("id");
      const { status } = c.req.valid("json");

      const { data: existing, error: readError } = await supabase
        .from("recruitment_applications")
        .select("id, status")
        .eq("id", id)
        .maybeSingle();

      if (readError) {
        console.error("admin recruitment: read failed", readError.message);
        return c.json({ error: "upstream_error" }, 502);
      }
      if (!existing) return c.json({ error: "not_found" }, 404);

      const { data, error } = await supabase
        .from("recruitment_applications")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("admin recruitment: update failed", error.message);
        return c.json({ error: "upstream_error" }, 502);
      }
      if (!data) return c.json({ error: "not_found" }, 404);

      await recordAdminAction({
        actorId: actor.userId,
        action: "recruitment.status",
        targetType: "recruitment_application",
        targetId: id,
        metadata: { from: existing.status, to: status },
      });

      const { resume_object_path, ...application } = data;
      return c.json(application);
    },
  )

  // A short-lived link to one applicant's CV.
  //
  // Signed rather than proxied so the PDF never passes through this service,
  // and audited because reading someone's CV is an act worth being able to
  // attribute later. Five minutes is enough to open it once.
  .post("/:id/resume", async (c) => {
    const actor = c.get("user");
    const id = c.req.param("id");

    const { data: application, error: readError } = await supabase
      .from("recruitment_applications")
      .select("id, resume_object_path, applicant_sub")
      .eq("id", id)
      .maybeSingle();

    if (readError) {
      console.error("admin recruitment: read failed", readError.message);
      return c.json({ error: "upstream_error" }, 502);
    }
    if (!application) return c.json({ error: "not_found" }, 404);

    const { data, error } = await supabase.storage
      .from(RESUME_BUCKET)
      .createSignedUrl(application.resume_object_path, 300);

    if (error || !data) {
      console.error(
        "admin recruitment: signing failed",
        error?.message ?? "no url returned",
      );
      return c.json({ error: "upstream_error" }, 502);
    }

    await recordAdminAction({
      actorId: actor.userId,
      action: "recruitment.resume.view",
      targetType: "recruitment_application",
      targetId: id,
    });

    return c.json({ url: data.signedUrl, expiresInSeconds: 300 });
  });

export default app;
