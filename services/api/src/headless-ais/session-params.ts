import { z } from "zod";

/**
 * The school's session ID (`ACIXSTORE`), as these routes accept it.
 *
 * The value is pasted into URLs and form bodies sent to the school, so it is
 * held to the shape of a real session ID. Anything else, an `&` in particular,
 * could add or override parameters in those requests. This is the same rule
 * `/contribute/grades` applies.
 */
export const acixStoreSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{16,64}$/, "Invalid session value");
