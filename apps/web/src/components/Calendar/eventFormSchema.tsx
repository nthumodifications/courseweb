import { z } from "zod";
import { getTaipeiDateKey } from "@/helpers/dates";
const schemaDates = z
  .object({
    start: z.date(),
    end: z.date(),
  })
  .refine((data) => data.end && data.start && data.end > data.start, {
    message: "End date cannot be earlier than start date.",
    path: ["end"],
  });

const schemaDetails = z.object({
  id: z.string(),
  title: z.string().min(2),
  details: z.string().optional(),
  location: z.string().optional(),
  allDay: z.boolean(),
  repeat: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("daily"),
      interval: z.number(),
      mode: z.union([z.literal("count"), z.literal("date")]),
      value: z.number(),
    }),
    z.object({
      type: z.literal("weekly"),
      interval: z.number(),
      mode: z.union([z.literal("count"), z.literal("date")]),
      value: z.number(),
    }),
    z.object({
      type: z.literal("monthly"),
      interval: z.number(),
      mode: z.union([z.literal("count"), z.literal("date")]),
      value: z.number(),
    }),
    z.object({
      type: z.literal("yearly"),
      interval: z.number(),
      mode: z.union([z.literal("count"), z.literal("date")]),
      value: z.number(),
    }),
    z.object({
      type: z.null(),
    }),
  ]),
  color: z.string(),
  tag: z.string().min(2),
});

export const eventFormSchema = z
  .intersection(schemaDates, schemaDetails)
  .superRefine((data, context) => {
    if (
      data.repeat.type !== null &&
      data.repeat.mode === "date" &&
      getTaipeiDateKey(new Date(data.repeat.value)) <
        getTaipeiDateKey(data.start)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Repeat end date cannot be earlier than event start date.",
        path: ["repeat", "value"],
      });
    }
  });
