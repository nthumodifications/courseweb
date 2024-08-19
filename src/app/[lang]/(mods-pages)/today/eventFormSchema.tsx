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
  title: z.string(),
  details: z.string().optional(),
  allDay: z.boolean(),
  repeat: z.union([
    z.object({
      type: z.literal("daily"),
      interval: z.number().optional(),
      count: z.number().optional(),
    }),
    z.object({
      type: z.literal("weekly"),
      interval: z.number().optional(),
      count: z.number().optional(),
    }),
    z.object({
      type: z.literal("monthly"),
      interval: z.number().optional(),
      count: z.number().optional(),
    }),
    z.object({
      type: z.literal("yearly"),
      interval: z.number().optional(),
      count: z.number().optional(),
    }),
    z.object({
      type: z.literal("daily"),
      interval: z.number().optional(),
      date: z.date().optional(),
    }),
    z.object({
      type: z.literal("weekly"),
      interval: z.number().optional(),
      date: z.date().optional(),
    }),
    z.object({
      type: z.literal("monthly"),
      interval: z.number().optional(),
      date: z.date(),
    }),
    z.object({
      type: z.literal("yearly"),
      interval: z.number().optional(),
      date: z.date(),
    }),
    z.object({
      type: z.null(),
    }),
  ]),
  color: z.string(),
  tag: z.string(),
});

export const eventFormSchema = z.intersection(schemaDates, schemaDetails);
