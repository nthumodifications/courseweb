import type { NthuUser, Scopes, Token } from "./types";
declare const nthuAuth: (options: {
    scopes: Scopes[];
    client_id: string;
    client_secret: string;
    redirect_uri?: string;
    state?: string;
}) => import("hono").MiddlewareHandler<{
    Variables: {
        user: Partial<NthuUser> | undefined;
        token: Token | undefined;
        "refresh-token": Token | undefined;
        "granted-scopes": string[] | undefined;
        state: string | undefined;
    };
}, string, {}>;
export default nthuAuth;
