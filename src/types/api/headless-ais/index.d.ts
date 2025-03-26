declare const app: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
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
}, "/auth"> | import("hono/types").MergeSchemaPath<{
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
}, "/courses"> | import("hono/types").MergeSchemaPath<{
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
}, "/inthu"> | import("hono/types").MergeSchemaPath<{
    login: {
        $post: {
            input: {
                form: {
                    studentid: string;
                    password: string;
                };
            };
            output: {};
            outputFormat: string;
            status: import("hono/utils/http-status").StatusCode;
        } | {
            input: {
                form: {
                    studentid: string;
                    password: string;
                };
            };
            output: {};
            outputFormat: string;
            status: import("hono/utils/http-status").StatusCode;
        };
    };
}, "/eeclass"> | import("hono/types").MergeSchemaPath<{
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
}, "/grades">, "/">;
export default app;
