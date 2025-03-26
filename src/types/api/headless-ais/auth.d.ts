declare const app: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
    "/login": {
        $post: {
            input: {
                form: {
                    studentid: string;
                    password: string;
                };
            };
            output: {
                data: {
                    studentid: string;
                    name_zh: string;
                    name_en: string;
                    department: string;
                    grade: string;
                    email: string;
                };
                ACIXSTORE: string;
                passwordExpired: boolean;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
}, "/">;
export default app;
