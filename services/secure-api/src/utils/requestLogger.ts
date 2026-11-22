import { logger as honoLogger } from "hono/logger";

/**
 * Request logging without query strings.
 *
 * `hono/logger` prints the request URL from the first slash onward, query
 * string included. Query strings here carry secrets: calendar feed tokens
 * (`?token=`), which are long-lived, and OAuth `code` and `state` values. Logs
 * are kept and read more widely than those values should ever be, so only the
 * path is written.
 */
const withoutQuery = (line: string) => line.replace(/\?\S*/, "");

export const logger = () =>
  honoLogger((line, ...rest) => {
    console.log(withoutQuery(line), ...rest);
  });
