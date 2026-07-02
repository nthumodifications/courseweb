import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import supabase from "../config/supabase";

const app = new Hono().post(
  "/:courseId",
  zValidator(
    "param",
    z.object({
      courseId: z.string(),
    }),
  ),
  zValidator(
    "json",
    z.object({
      dates: z.array(
        z.object({
          id: z.coerce.number().optional(),
          type: z.enum(["exam", "quiz", "no_class", "other"]),
          title: z.string().min(1),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
      ),
    }),
  ),
  requireAuth(),
  async (c) => {
    const { courseId } = c.req.valid("param");
    const { dates } = c.req.valid("json");
    const user = c.get("user");

    const { data: existing, error: fetchError } = await supabase
      .from("course_dates")
      .select("id")
      .eq("raw_id", courseId);

    if (fetchError) {
      return c.json({ error: "Failed to fetch existing dates" }, 500);
    }

    const existingIds = new Set((existing ?? []).map((d) => d.id));
    const submittedIds = new Set(
      dates.filter((d) => d.id != null).map((d) => d.id!),
    );

    // Delete rows that were removed by this user's submission
    const toDelete = [...existingIds].filter((id) => !submittedIds.has(id));
    if (toDelete.length > 0) {
      await supabase
        .from("course_dates")
        .delete()
        .in("id", toDelete)
        .eq("submitter", user.userId);
    }

    // Upsert new and updated rows
    const toUpsert = dates.map((d) => ({
      ...(d.id ? { id: d.id } : {}),
      raw_id: courseId,
      type: d.type,
      title: d.title,
      date: d.date,
      submitter: user.userId,
    }));

    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("course_dates")
        .upsert(toUpsert);

      if (upsertError) {
        return c.json({ error: "Failed to save dates" }, 500);
      }
    }

    return c.json({ success: true });
  },
);

export default app;
