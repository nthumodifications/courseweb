import { type User } from "@prisma/client";
export declare const requireAuth: (requiredScopes?: string[]) => import("hono").MiddlewareHandler<{
    Variables: {
        user: User;
    };
}, string, {}>;
