import { z } from "zod";
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
  repeat: z.union([
    z.object({
      type: z.union([
        z.literal("daily"),
        z.literal("weekly"),
        z.literal("monthly"),
        z.literal("yearly"),
      ]),
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

export const eventFormSchema = z.intersection(schemaDates, schemaDetails);
