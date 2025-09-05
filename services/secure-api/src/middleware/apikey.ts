import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { validateApiKey } from "../utils/apiKeyValidation";

export async function verifyApiKey(c: Context, next: Next) {
  try {
    // Try to get API key from Authorization header first
    const authHeader = c.req.header("Authorization");
    let apiKeyString: string | undefined;

    if (authHeader && authHeader.startsWith("ApiKey ")) {
      apiKeyString = authHeader.slice(7); // Remove "ApiKey " prefix
    } else {
      // If not in header, check for key in query parameters
      apiKeyString = c.req.query("key");
    }

    // Validate that we have an API key from one of the sources
    if (!apiKeyString) {
      throw new HTTPException(401, { message: "Missing or invalid API key" });
    }

    // Get the required scope from context (if set)
    const requiredScope = c.get("requiredScope") as string | undefined;

    // Validate the API key using our utility function
    const apiKey = await validateApiKey(apiKeyString, requiredScope);

    // Store the API key and user in the context
    c.set("apiKey", apiKey);
    c.set("user", apiKey.user);

    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      return c.json({ error: error.message }, error.status);
    }
    return c.json({ error: "Unauthorized" }, 401);
  }
}

export function requireScope(scope: string) {
  return async (c: Context, next: Next) => {
    c.set("requiredScope", scope);
    await next();
  };
}
