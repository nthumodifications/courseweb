declare const app: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
    "/": {
        $post: {
            input: {
                form: {
                    ACIXSTORE: string;
                };
            };
            output: {};
            outputFormat: string;
            status: import("hono/utils/http-status").StatusCode;
        };
    };
} & {
    "/latest": {
        $post: {
            input: {
                form: {
                    ACIXSTORE: string;
                };
            };
            output: {
                semester: string;
                phase: string;
                studentid: string;
                courses: (string | null)[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/latest-enrollment": {
        $post: {
            input: {
                form: {
                    ACIXSTORE: string;
                    dept: string;
                };
            };
            output: never;
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/hidden-course-selection": {
        $post: {
            input: {
                form: {
                    ACIXSTORE: string;
                    dept: string;
                };
            };
            output: {
                ckey: string;
                code: string;
                div: string;
                real: string;
                cred: string;
                ctime: string;
                num: string;
                glimit: string;
                type: string;
                pre: string;
                range: string;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/class-detailed": {
        $post: {
            input: {
                form: {
                    ACIXSTORE: string;
                };
            };
            output: {
                department: string;
                degreeType: string;
                year: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
}, "/">;
export default app;
