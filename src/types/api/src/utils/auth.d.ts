import type { MiddlewareHandler } from 'hono';
export interface User {
    sub: string | undefined;
    scopes: string[];
}
/**
 * Creates a middleware to authenticate and authorize requests based on scopes.
 * @param requiredScopes - The scopes required to access the route
 * @returns A Hono middleware
 */
export declare const auth: (requiredScopes?: string[]) => MiddlewareHandler;
/**
 * Middleware factory to make user available in route handlers
 */
export declare const withUser: () => MiddlewareHandler;
declare module 'hono' {
    interface ContextVariableMap {
        user: User;
    }
    interface HonoRequest {
        user?: User;
    }
}
