interface AppEnv {
    NTHUMODS_AUTH_URL: string;
}
declare const app: import("hono/hono-base").HonoBase<{
    Bindings: AppEnv;
}, {
    "/ical/:userId": {
        $get: {
            input: {
                query: {
                    type?: "basic" | "full" | undefined;
                    key?: string | undefined;
                };
            } & {
                param: {
                    userId: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {
                query: {
                    type?: "basic" | "full" | undefined;
                    key?: string | undefined;
                };
            } & {
                param: {
                    userId: string;
                };
            };
            output: {
                error: string;
                status: number;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    type?: "basic" | "full" | undefined;
                    key?: string | undefined;
                };
            } & {
                param: {
                    userId: string;
                };
            };
            output: {};
            outputFormat: "body";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    type?: "basic" | "full" | undefined;
                    key?: string | undefined;
                };
            } & {
                param: {
                    userId: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 500;
        };
    };
}, "/">;
export default app;
