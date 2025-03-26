declare const app: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
    "/": {
        $put: {
            input: {
                query: {
                    url: string;
                };
            };
            output: `https://nthumods.com/l/${string}`;
            outputFormat: "text";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/:key": {
        $get: {
            input: {
                param: {
                    key: string;
                };
            };
            output: string;
            outputFormat: "text";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
}, "/">;
export default app;
