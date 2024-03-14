import { z } from "zod";

export const eventFormSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    details: z.string().optional(),
    allDay: z.boolean(),
    start: z.date(),
    end: z.date(),
    repeat: z.union([
        z.object({
            type: z.literal('daily'),
            interval: z.number().optional(),
            count: z.number().optional(),
        }),
        z.object({
            type: z.literal('weekly'),
            interval: z.number().optional(),
            count: z.number().optional(),
        }),
        z.object({
            type: z.literal('monthly'),
            interval: z.number().optional(),
            count: z.number().optional(),
        }),
        z.object({
            type: z.literal('yearly'),
            interval: z.number().optional(),
            count: z.number().optional(),
        }),
        z.object({
            type: z.literal('daily'),
            interval: z.number().optional(),
            date: z.date().optional(),
        }),
        z.object({
            type: z.literal('weekly'),
            interval: z.number().optional(),
            date: z.date().optional(),
        }),
        z.object({
            type: z.literal('monthly'),
            interval: z.number().optional(),
            date: z.date(),
        }),
        z.object({
            type: z.literal('yearly'),
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
