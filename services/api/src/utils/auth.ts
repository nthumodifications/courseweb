import type { Context, MiddlewareHandler, Next } from "hono";
import { env } from "hono/adapter";
import { HTTPException } from "hono/http-exception";

// Define User interface for type safety
export interface User {
  sub: string | undefined;
  scopes: string[];
}

// Updated interface for the introspection response
interface IntrospectionResponse {
  active: boolean;
  scope?: string;
  username?: string; // This contains the user ID
  client_id?: string;
  exp?: number;
  iat?: number;
}

/**
 * Creates a middleware to authenticate and authorize requests based on scopes.
 * @param requiredScopes - The scopes required to access the route
 * @returns A Hono middleware
 */
export const auth = (requiredScopes?: string[]): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HTTPException(401, {
        message: "Unauthorized",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      const {
        NTHUMODS_AUTH_INTROSPECTION_URL,
        NTHUMODS_AUTH_CLIENT_ID,
        NTHUMODS_AUTH_CLIENT_SECRET,
      } = env<{
        NTHUMODS_AUTH_INTROSPECTION_URL: string;
        NTHUMODS_AUTH_CLIENT_ID: string;
        NTHUMODS_AUTH_CLIENT_SECRET: string;
      }>(c);
      // Check if the required environment variables are set
      const introspectionUrl = NTHUMODS_AUTH_INTROSPECTION_URL;
      const clientId = NTHUMODS_AUTH_CLIENT_ID;
      const clientSecret = NTHUMODS_AUTH_CLIENT_SECRET;

      if (!introspectionUrl || !clientId || !clientSecret) {
        console.error(
          "Missing required environment variables for authentication",
        );
        throw new HTTPException(500, {
          message: "Internal Server Error",
        });
      }

      // Call the introspection endpoint with Basic Auth
      const basicAuth = btoa(`${clientId}:${clientSecret}`);
      const response = await fetch(introspectionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          token,
        }),
      });

      if (!response.ok) {
        throw new HTTPException(401, {
          message: "Invalid token",
        });
      }

      const introspection: IntrospectionResponse = await response.json();

      if (!introspection.active) {
        throw new HTTPException(401, {
          message: "Unauthorized",
        });
      }

      // Create user object
      const userScopes = introspection.scope?.split(" ") || [];
      const user: User = {
        sub: introspection.username,
        scopes: userScopes,
      };

      // If no scopes are required, just set the user info and proceed
      if (!requiredScopes || requiredScopes.length === 0) {
        c.set("user", user);
        await next();
        return;
      }

      // Check if the user has the required scopes
      const hasRequiredScope = requiredScopes.some((requiredScope) => {
        // Handle patterns like "user:read" where "user" scope is sufficient
        const [baseScope] = requiredScope.split(":");
        return (
          userScopes.includes(requiredScope) || userScopes.includes(baseScope)
        );
      });

      if (!hasRequiredScope) {
        throw new HTTPException(403, {
          message: "Forbidden",
        });
      }

      // Set user information in the context for downstream handlers
      c.set("user", user);

      await next();
    } catch (error) {
      console.error("Authentication error:", error);
      throw new HTTPException(500, {
        message: "Internal Server Error",
      });
    }
  };
};

/**
 * Middleware factory to make user available in route handlers
 */
export const withUser = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, {
        message: "Unauthorized",
      });
    }

    // Make user available as a property on the request
    c.req.user = user;

    await next();
  };
};

// Type declarations to extend Hono types
declare module "hono" {
  interface ContextVariableMap {
    user: User;
  }

  interface HonoRequest {
    user?: User;
  }
}
