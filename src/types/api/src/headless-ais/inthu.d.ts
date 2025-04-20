declare const app: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
    "/code": {
        $post: {
            input: {
                form: {
                    ACIXSTORE: string;
                };
            };
            output: {
                user_id: string;
                refreshToken: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/token": {
        $post: {
            input: {
                form: {
                    user_id: string;
                    refreshToken: string;
                };
            };
            output: {
                accessToken: any;
                deviceId: string;
                session_id: string;
                authToken: string;
                lang: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/door-access-qr": {
        $post: {
            input: {
                form: {
                    deviceId: string;
                    session_id: string;
                    authToken: string;
                };
            };
            output: string;
            outputFormat: "text";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/parcel-information": {
        $post: {
            input: {
                form: {
                    deviceId: string;
                    session_id: string;
                    authToken: string;
                };
            };
            output: {
                takeTime: string;
                studentNumber: string;
                statusText: string;
                name: string;
                logistic: string;
                barcode: string;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
}, "/">;
export default app;
