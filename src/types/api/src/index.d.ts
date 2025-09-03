import { D1Database } from "@cloudflare/workers-types";
export type Bindings = {
    DB: D1Database;
};
export declare const app: import("hono/hono-base").HonoBase<{
    Bindings: Bindings;
}, {
    "/": {
        $get: {
            input: {};
            output: "I AM NTHUMODS UWU";
            outputFormat: "text";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} | import("hono/types").MergeSchemaPath<{
    "/": {
        $get: {
            input: {
                query: {
                    start: string | string[];
                    end: string | string[];
                };
            };
            output: {
                summary: string;
                date: string;
                id: string;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
}, "/acacalendar"> | import("hono/types").MergeSchemaPath<{
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
}, "/calendar"> | import("hono/types").MergeSchemaPath<{
    "/": {
        $get: {
            input: {};
            output: {
                date: string;
                weatherData: {
                    MinT: string | undefined;
                    MaxT: string | undefined;
                    PoP12h: string | undefined;
                    Wx: string | undefined;
                    WeatherDescription: string | undefined;
                };
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
}, "/weather"> | import("hono/types").MergeSchemaPath<{
    "/": {
        $get: {
            input: {
                query: {
                    courses: string | string[];
                };
            };
            output: {
                capacity: number | null;
                class: string;
                closed_mark: string | null;
                compulsory_for: string[] | null;
                course: string;
                credits: number;
                cross_discipline: string[] | null;
                department: string;
                elective_for: string[] | null;
                enrolled: number;
                first_specialization: string[] | null;
                ge_target: string | null;
                ge_type: string | null;
                language: string;
                name_en: string;
                name_zh: string;
                no_extra_selection: boolean | null;
                note: string | null;
                prerequisites: string | null;
                raw_id: string;
                reserve: number | null;
                restrictions: string | null;
                second_specialization: string[] | null;
                semester: string;
                tags: string[];
                teacher_en: string[] | null;
                teacher_zh: string[];
                times: string[];
                updated_at: string;
                venues: string[];
                time_slots: string[] | null;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/:courseId": {
        $get: {
            input: {
                param: {
                    courseId: string;
                };
            };
            output: {
                capacity: number | null;
                class: string;
                closed_mark: string | null;
                compulsory_for: string[] | null;
                course: string;
                credits: number;
                cross_discipline: string[] | null;
                department: string;
                elective_for: string[] | null;
                enrolled: number;
                first_specialization: string[] | null;
                ge_target: string | null;
                ge_type: string | null;
                language: string;
                name_en: string;
                name_zh: string;
                no_extra_selection: boolean | null;
                note: string | null;
                prerequisites: string | null;
                raw_id: string;
                reserve: number | null;
                restrictions: string | null;
                second_specialization: string[] | null;
                semester: string;
                tags: string[];
                teacher_en: string[] | null;
                teacher_zh: string[];
                times: string[];
                updated_at: string;
                venues: string[];
                time_slots: string[] | null;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/:courseId/syllabus": {
        $get: {
            input: {
                param: {
                    courseId: string;
                };
            };
            output: {
                capacity: number | null;
                class: string;
                closed_mark: string | null;
                compulsory_for: string[] | null;
                course: string;
                credits: number;
                cross_discipline: string[] | null;
                department: string;
                elective_for: string[] | null;
                enrolled: number;
                first_specialization: string[] | null;
                ge_target: string | null;
                ge_type: string | null;
                language: string;
                name_en: string;
                name_zh: string;
                no_extra_selection: boolean | null;
                note: string | null;
                prerequisites: string | null;
                raw_id: string;
                reserve: number | null;
                restrictions: string | null;
                second_specialization: string[] | null;
                semester: string;
                tags: string[];
                teacher_en: string[] | null;
                teacher_zh: string[];
                times: string[];
                updated_at: string;
                venues: string[];
                time_slots: string[] | null;
                course_syllabus: {
                    brief: string | null;
                    content: string | null;
                    has_file: boolean;
                    keywords: string[] | null;
                    raw_id: string;
                    updated_at: string;
                } | null;
                course_scores: {
                    average: number;
                    created_at: string;
                    enrollment: number | null;
                    raw_id: string;
                    std_dev: number;
                    type: string;
                    updated_at: string;
                } | null;
                course_dates: {
                    created: string;
                    date: string;
                    id: number;
                    raw_id: string;
                    submitter: string;
                    title: string;
                    type: string;
                }[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/:courseId/minimal": {
        $get: {
            input: {
                param: {
                    courseId: string;
                };
            };
            output: {
                raw_id: string;
                name_zh: string;
                name_en: string;
                semester: string;
                department: string;
                course: string;
                class: string;
                credits: number;
                venues: string[];
                times: string[];
                teacher_zh: string[];
                teacher_en: string[] | null;
                language: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/:courseId/ptt": {
        $get: {
            input: {
                param: {
                    courseId: string;
                };
            };
            output: {
                content: string;
                date: string | null;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/:courseId/related": {
        $get: {
            input: {
                param: {
                    courseId: string;
                };
            };
            output: {
                capacity: number | null;
                class: string;
                closed_mark: string | null;
                compulsory_for: string[] | null;
                course: string;
                credits: number;
                cross_discipline: string[] | null;
                department: string;
                elective_for: string[] | null;
                enrolled: number;
                first_specialization: string[] | null;
                ge_target: string | null;
                ge_type: string | null;
                language: string;
                name_en: string;
                name_zh: string;
                no_extra_selection: boolean | null;
                note: string | null;
                prerequisites: string | null;
                raw_id: string;
                reserve: number | null;
                restrictions: string | null;
                second_specialization: string[] | null;
                semester: string;
                tags: string[];
                teacher_en: string[] | null;
                teacher_zh: string[];
                times: string[];
                updated_at: string;
                venues: string[];
                time_slots: string[] | null;
                course_scores: {
                    average: number;
                    created_at: string;
                    enrollment: number | null;
                    raw_id: string;
                    std_dev: number;
                    type: string;
                    updated_at: string;
                } | null;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/classes": {
        $get: {
            input: {};
            output: string[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/:courseId/syllabus/file": {
        $get: {
            input: {
                param: {
                    courseId: string;
                };
            };
            output: undefined;
            outputFormat: "redirect";
            status: 302;
        };
    };
} & {
    "/:courseId/dates": {
        $get: {
            input: {
                param: {
                    courseId: string;
                };
            };
            output: {
                id: number;
                type: string;
                title: string;
                date: string;
            }[] | null;
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/:courseId/dates": {
        $post: {
            input: {
                json: {
                    dates: {
                        type: string;
                        date: string;
                        title: string;
                        id?: number | undefined;
                    }[];
                };
            } & {
                param: {
                    courseId: string;
                };
            };
            output: {};
            outputFormat: string;
            status: import("hono/utils/http-status").StatusCode;
        };
    };
}, "/course"> | import("hono/types").MergeSchemaPath<{
    "/": {
        $get: {
            input: {};
            output: string[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/:venueId/courses": {
        $get: {
            input: {
                param: {
                    venueId: string;
                };
            } & {
                query: {
                    semester: string;
                };
            };
            output: {
                capacity: number | null;
                class: string;
                closed_mark: string | null;
                compulsory_for: string[] | null;
                course: string;
                credits: number;
                cross_discipline: string[] | null;
                department: string;
                elective_for: string[] | null;
                enrolled: number;
                first_specialization: string[] | null;
                ge_target: string | null;
                ge_type: string | null;
                language: string;
                name_en: string;
                name_zh: string;
                no_extra_selection: boolean | null;
                note: string | null;
                prerequisites: string | null;
                raw_id: string;
                reserve: number | null;
                restrictions: string | null;
                second_specialization: string[] | null;
                semester: string;
                tags: string[];
                teacher_en: string[] | null;
                teacher_zh: string[];
                times: string[];
                updated_at: string;
                venues: string[];
                time_slots: string[] | null;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
}, "/venue"> | import("hono/types").MergeSchemaPath<{
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
}, "/shortlink"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
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
}, "/grades">, "/ccxp"> | import("hono/types").MergeSchemaPath<{
    "/": {
        $post: {
            input: {
                json: {
                    body: string;
                    title: string;
                    labels: string[];
                    turnstileToken?: string | undefined;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {
                json: {
                    body: string;
                    title: string;
                    labels: string[];
                    turnstileToken?: string | undefined;
                };
            };
            output: {
                url: string;
                repository_url: string;
                labels_url: string;
                comments_url: string;
                events_url: string;
                html_url: string;
                id: number;
                node_id: string;
                number: number;
                title: string;
                user: {
                    login: string;
                    id: number;
                    node_id: string;
                    avatar_url: string;
                    gravatar_id: string;
                    url: string;
                    html_url: string;
                    followers_url: string;
                    following_url: string;
                    gists_url: string;
                    starred_url: string;
                    subscriptions_url: string;
                    organizations_url: string;
                    repos_url: string;
                    events_url: string;
                    received_events_url: string;
                    type: string;
                    site_admin: boolean;
                };
                labels: string[];
                state: string;
                locked: boolean;
                assignee: null;
                assignees: [];
                milestone: null;
                comments: number;
                created_at: string;
                updated_at: string;
                closed_at: null;
                author_association: string;
                active_lock_reason: null;
                draft: boolean;
                pull_request: {
                    url: string;
                    html_url: string;
                    diff_url: string;
                    patch_url: string;
                    merged_at: null;
                };
                body: null;
                reactions: {
                    url: string;
                    total_count: number;
                    "+1": number;
                    "-1": number;
                    laugh: number;
                    hooray: number;
                    confused: number;
                    heart: number;
                    rocket: number;
                    eyes: number;
                };
                timeline_url: string;
                performed_via_github_app: null;
                state_reason: null;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/": {
        $get: {
            input: {
                query: {
                    tag: string;
                };
            };
            output: {
                url: string;
                repository_url: string;
                labels_url: string;
                comments_url: string;
                events_url: string;
                html_url: string;
                id: number;
                node_id: string;
                number: number;
                title: string;
                user: {
                    login: string;
                    id: number;
                    node_id: string;
                    avatar_url: string;
                    gravatar_id: string;
                    url: string;
                    html_url: string;
                    followers_url: string;
                    following_url: string;
                    gists_url: string;
                    starred_url: string;
                    subscriptions_url: string;
                    organizations_url: string;
                    repos_url: string;
                    events_url: string;
                    received_events_url: string;
                    type: string;
                    site_admin: boolean;
                };
                labels: string[];
                state: string;
                locked: boolean;
                assignee: null;
                assignees: [];
                milestone: null;
                comments: number;
                created_at: string;
                updated_at: string;
                closed_at: null;
                author_association: string;
                active_lock_reason: null;
                draft: boolean;
                pull_request: {
                    url: string;
                    html_url: string;
                    diff_url: string;
                    patch_url: string;
                    merged_at: null;
                };
                body: null;
                reactions: {
                    url: string;
                    total_count: number;
                    "+1": number;
                    "-1": number;
                    laugh: number;
                    hooray: number;
                    confused: number;
                    heart: number;
                    rocket: number;
                    eyes: number;
                };
                timeline_url: string;
                performed_via_github_app: null;
                state_reason: null;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
}, "/issue"> | import("hono/types").MergeSchemaPath<{
    "/folders/pull": {
        $get: {
            input: {
                query: {
                    id: string | string[];
                    serverTimestamp: string | string[];
                    batchSize?: string | string[] | undefined;
                };
            };
            output: {
                checkpoint: {
                    id: string;
                    serverTimestamp: string;
                } | null;
                documents: {
                    id: string;
                    title: string;
                    min: number;
                    max: number;
                    parent: string | null;
                    metric: string;
                    requireChildValidation: boolean;
                    titlePlacement: string;
                    order: number;
                    color: string | null;
                    expanded: boolean | null;
                    _deleted: boolean;
                }[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/folders/push": {
        $post: {
            input: {
                json: {
                    newDocumentState: {
                        id: string;
                        _deleted: boolean;
                    } & {
                        [k: string]: unknown;
                    };
                    assumedMasterState?: import("zod").objectInputType<{
                        id: import("zod").ZodString;
                        _deleted: import("zod").ZodBoolean;
                    }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                }[];
            };
            output: {
                id: string;
                title: string;
                min: number;
                max: number;
                parent: string | null;
                metric: string;
                requireChildValidation: boolean;
                titlePlacement: string;
                order: number;
                color: string | null;
                expanded: boolean | null;
                _deleted: boolean;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/items/pull": {
        $get: {
            input: {
                query: {
                    uuid: string | string[];
                    serverTimestamp: string | string[];
                    batchSize?: string | string[] | undefined;
                };
            };
            output: {
                checkpoint: {
                    uuid: string;
                    serverTimestamp: string;
                } | null;
                documents: {
                    status: string | null;
                    id: string;
                    raw_id: string | null;
                    description: string | null;
                    title: string;
                    credits: number;
                    semester: string | null;
                    uuid: string;
                    comments: string | null;
                    parent: string | null;
                    order: number;
                    instructor: string | null;
                    dependson: string | null;
                    _deleted: boolean;
                }[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/items/push": {
        $post: {
            input: {
                json: {
                    newDocumentState: {
                        uuid: string;
                        _deleted: boolean;
                    } & {
                        [k: string]: unknown;
                    };
                    assumedMasterState?: import("zod").objectInputType<{
                        uuid: import("zod").ZodString;
                        _deleted: import("zod").ZodBoolean;
                    }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                }[];
            };
            output: {
                status: string | null;
                id: string;
                raw_id: string | null;
                description: string | null;
                title: string;
                credits: number;
                semester: string | null;
                uuid: string;
                comments: string | null;
                parent: string | null;
                order: number;
                instructor: string | null;
                dependson: string | null;
                _deleted: boolean;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/plannerdata/pull": {
        $get: {
            input: {
                query: {
                    id: string | string[];
                    serverTimestamp: string | string[];
                    batchSize?: string | string[] | undefined;
                };
            };
            output: {
                checkpoint: {
                    id: string;
                    serverTimestamp: string;
                } | null;
                documents: {
                    id: string;
                    description: string | null;
                    title: string;
                    department: string;
                    requiredCredits: number;
                    enrollmentYear: string;
                    graduationYear: string;
                    includedSemesters: string;
                    _deleted: boolean;
                }[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/plannerdata/push": {
        $post: {
            input: {
                json: {
                    newDocumentState: {
                        id: string;
                        _deleted: boolean;
                    } & {
                        [k: string]: unknown;
                    };
                    assumedMasterState?: import("zod").objectInputType<{
                        id: import("zod").ZodString;
                        _deleted: import("zod").ZodBoolean;
                    }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                }[];
            };
            output: {
                id: string;
                description: string | null;
                title: string;
                department: string;
                requiredCredits: number;
                enrollmentYear: string;
                graduationYear: string;
                _deleted: boolean;
                includedSemesters: string[];
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/semesters/pull": {
        $get: {
            input: {
                query: {
                    id: string | string[];
                    serverTimestamp: string | string[];
                    batchSize?: string | string[] | undefined;
                };
            };
            output: {
                checkpoint: {
                    id: string;
                    serverTimestamp: string;
                } | null;
                documents: {
                    status: string;
                    id: string;
                    term: string;
                    name: string;
                    year: string;
                    order: number | null;
                    startDate: string | null;
                    endDate: string | null;
                    isActive: boolean;
                    _deleted: boolean;
                }[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/semesters/push": {
        $post: {
            input: {
                json: {
                    newDocumentState: {
                        id: string;
                        _deleted: boolean;
                    } & {
                        [k: string]: unknown;
                    };
                    assumedMasterState?: import("zod").objectInputType<{
                        id: import("zod").ZodString;
                        _deleted: import("zod").ZodBoolean;
                    }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                }[];
            };
            output: {
                status: string;
                id: string;
                term: string;
                name: string;
                year: string;
                order: number | null;
                startDate: string | null;
                endDate: string | null;
                isActive: boolean;
                _deleted: boolean;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
}, "/planner">, "/">;
declare const APIHandler: {
    scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void>;
    get: import("hono/types").HandlerInterface<{
        Bindings: Bindings;
    }, "get", {
        "/": {
            $get: {
                input: {};
                output: "I AM NTHUMODS UWU";
                outputFormat: "text";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        start: string | string[];
                        end: string | string[];
                    };
                };
                output: {
                    summary: string;
                    date: string;
                    id: string;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/acacalendar"> | import("hono/types").MergeSchemaPath<{
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
    }, "/calendar"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: {
                    date: string;
                    weatherData: {
                        MinT: string | undefined;
                        MaxT: string | undefined;
                        PoP12h: string | undefined;
                        Wx: string | undefined;
                        WeatherDescription: string | undefined;
                    };
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/weather"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        courses: string | string[];
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_syllabus: {
                        brief: string | null;
                        content: string | null;
                        has_file: boolean;
                        keywords: string[] | null;
                        raw_id: string;
                        updated_at: string;
                    } | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                    course_dates: {
                        created: string;
                        date: string;
                        id: number;
                        raw_id: string;
                        submitter: string;
                        title: string;
                        type: string;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/minimal": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    raw_id: string;
                    name_zh: string;
                    name_en: string;
                    semester: string;
                    department: string;
                    course: string;
                    class: string;
                    credits: number;
                    venues: string[];
                    times: string[];
                    teacher_zh: string[];
                    teacher_en: string[] | null;
                    language: string;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/ptt": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    content: string;
                    date: string | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/related": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/classes": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus/file": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: undefined;
                outputFormat: "redirect";
                status: 302;
            };
        };
    } & {
        "/:courseId/dates": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    id: number;
                    type: string;
                    title: string;
                    date: string;
                }[] | null;
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/dates": {
            $post: {
                input: {
                    json: {
                        dates: {
                            type: string;
                            date: string;
                            title: string;
                            id?: number | undefined;
                        }[];
                    };
                } & {
                    param: {
                        courseId: string;
                    };
                };
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
            };
        };
    }, "/course"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:venueId/courses": {
            $get: {
                input: {
                    param: {
                        venueId: string;
                    };
                } & {
                    query: {
                        semester: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/venue"> | import("hono/types").MergeSchemaPath<{
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
    }, "/shortlink"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
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
    }, "/grades">, "/ccxp"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $post: {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    error: string;
                };
                outputFormat: "json";
                status: 400;
            } | {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/": {
            $get: {
                input: {
                    query: {
                        tag: string;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/issue"> | import("hono/types").MergeSchemaPath<{
        "/folders/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        title: string;
                        min: number;
                        max: number;
                        parent: string | null;
                        metric: string;
                        requireChildValidation: boolean;
                        titlePlacement: string;
                        order: number;
                        color: string | null;
                        expanded: boolean | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/folders/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    title: string;
                    min: number;
                    max: number;
                    parent: string | null;
                    metric: string;
                    requireChildValidation: boolean;
                    titlePlacement: string;
                    order: number;
                    color: string | null;
                    expanded: boolean | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/pull": {
            $get: {
                input: {
                    query: {
                        uuid: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        uuid: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string | null;
                        id: string;
                        raw_id: string | null;
                        description: string | null;
                        title: string;
                        credits: number;
                        semester: string | null;
                        uuid: string;
                        comments: string | null;
                        parent: string | null;
                        order: number;
                        instructor: string | null;
                        dependson: string | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            uuid: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            uuid: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string | null;
                    id: string;
                    raw_id: string | null;
                    description: string | null;
                    title: string;
                    credits: number;
                    semester: string | null;
                    uuid: string;
                    comments: string | null;
                    parent: string | null;
                    order: number;
                    instructor: string | null;
                    dependson: string | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        description: string | null;
                        title: string;
                        department: string;
                        requiredCredits: number;
                        enrollmentYear: string;
                        graduationYear: string;
                        includedSemesters: string;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    description: string | null;
                    title: string;
                    department: string;
                    requiredCredits: number;
                    enrollmentYear: string;
                    graduationYear: string;
                    _deleted: boolean;
                    includedSemesters: string[];
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string;
                        id: string;
                        term: string;
                        name: string;
                        year: string;
                        order: number | null;
                        startDate: string | null;
                        endDate: string | null;
                        isActive: boolean;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string;
                    id: string;
                    term: string;
                    name: string;
                    year: string;
                    order: number | null;
                    startDate: string | null;
                    endDate: string | null;
                    isActive: boolean;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/planner">, "/">;
    post: import("hono/types").HandlerInterface<{
        Bindings: Bindings;
    }, "post", {
        "/": {
            $get: {
                input: {};
                output: "I AM NTHUMODS UWU";
                outputFormat: "text";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        start: string | string[];
                        end: string | string[];
                    };
                };
                output: {
                    summary: string;
                    date: string;
                    id: string;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/acacalendar"> | import("hono/types").MergeSchemaPath<{
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
    }, "/calendar"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: {
                    date: string;
                    weatherData: {
                        MinT: string | undefined;
                        MaxT: string | undefined;
                        PoP12h: string | undefined;
                        Wx: string | undefined;
                        WeatherDescription: string | undefined;
                    };
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/weather"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        courses: string | string[];
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_syllabus: {
                        brief: string | null;
                        content: string | null;
                        has_file: boolean;
                        keywords: string[] | null;
                        raw_id: string;
                        updated_at: string;
                    } | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                    course_dates: {
                        created: string;
                        date: string;
                        id: number;
                        raw_id: string;
                        submitter: string;
                        title: string;
                        type: string;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/minimal": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    raw_id: string;
                    name_zh: string;
                    name_en: string;
                    semester: string;
                    department: string;
                    course: string;
                    class: string;
                    credits: number;
                    venues: string[];
                    times: string[];
                    teacher_zh: string[];
                    teacher_en: string[] | null;
                    language: string;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/ptt": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    content: string;
                    date: string | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/related": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/classes": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus/file": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: undefined;
                outputFormat: "redirect";
                status: 302;
            };
        };
    } & {
        "/:courseId/dates": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    id: number;
                    type: string;
                    title: string;
                    date: string;
                }[] | null;
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/dates": {
            $post: {
                input: {
                    json: {
                        dates: {
                            type: string;
                            date: string;
                            title: string;
                            id?: number | undefined;
                        }[];
                    };
                } & {
                    param: {
                        courseId: string;
                    };
                };
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
            };
        };
    }, "/course"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:venueId/courses": {
            $get: {
                input: {
                    param: {
                        venueId: string;
                    };
                } & {
                    query: {
                        semester: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/venue"> | import("hono/types").MergeSchemaPath<{
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
    }, "/shortlink"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
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
    }, "/grades">, "/ccxp"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $post: {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    error: string;
                };
                outputFormat: "json";
                status: 400;
            } | {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/": {
            $get: {
                input: {
                    query: {
                        tag: string;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/issue"> | import("hono/types").MergeSchemaPath<{
        "/folders/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        title: string;
                        min: number;
                        max: number;
                        parent: string | null;
                        metric: string;
                        requireChildValidation: boolean;
                        titlePlacement: string;
                        order: number;
                        color: string | null;
                        expanded: boolean | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/folders/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    title: string;
                    min: number;
                    max: number;
                    parent: string | null;
                    metric: string;
                    requireChildValidation: boolean;
                    titlePlacement: string;
                    order: number;
                    color: string | null;
                    expanded: boolean | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/pull": {
            $get: {
                input: {
                    query: {
                        uuid: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        uuid: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string | null;
                        id: string;
                        raw_id: string | null;
                        description: string | null;
                        title: string;
                        credits: number;
                        semester: string | null;
                        uuid: string;
                        comments: string | null;
                        parent: string | null;
                        order: number;
                        instructor: string | null;
                        dependson: string | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            uuid: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            uuid: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string | null;
                    id: string;
                    raw_id: string | null;
                    description: string | null;
                    title: string;
                    credits: number;
                    semester: string | null;
                    uuid: string;
                    comments: string | null;
                    parent: string | null;
                    order: number;
                    instructor: string | null;
                    dependson: string | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        description: string | null;
                        title: string;
                        department: string;
                        requiredCredits: number;
                        enrollmentYear: string;
                        graduationYear: string;
                        includedSemesters: string;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    description: string | null;
                    title: string;
                    department: string;
                    requiredCredits: number;
                    enrollmentYear: string;
                    graduationYear: string;
                    _deleted: boolean;
                    includedSemesters: string[];
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string;
                        id: string;
                        term: string;
                        name: string;
                        year: string;
                        order: number | null;
                        startDate: string | null;
                        endDate: string | null;
                        isActive: boolean;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string;
                    id: string;
                    term: string;
                    name: string;
                    year: string;
                    order: number | null;
                    startDate: string | null;
                    endDate: string | null;
                    isActive: boolean;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/planner">, "/">;
    put: import("hono/types").HandlerInterface<{
        Bindings: Bindings;
    }, "put", {
        "/": {
            $get: {
                input: {};
                output: "I AM NTHUMODS UWU";
                outputFormat: "text";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        start: string | string[];
                        end: string | string[];
                    };
                };
                output: {
                    summary: string;
                    date: string;
                    id: string;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/acacalendar"> | import("hono/types").MergeSchemaPath<{
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
    }, "/calendar"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: {
                    date: string;
                    weatherData: {
                        MinT: string | undefined;
                        MaxT: string | undefined;
                        PoP12h: string | undefined;
                        Wx: string | undefined;
                        WeatherDescription: string | undefined;
                    };
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/weather"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        courses: string | string[];
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_syllabus: {
                        brief: string | null;
                        content: string | null;
                        has_file: boolean;
                        keywords: string[] | null;
                        raw_id: string;
                        updated_at: string;
                    } | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                    course_dates: {
                        created: string;
                        date: string;
                        id: number;
                        raw_id: string;
                        submitter: string;
                        title: string;
                        type: string;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/minimal": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    raw_id: string;
                    name_zh: string;
                    name_en: string;
                    semester: string;
                    department: string;
                    course: string;
                    class: string;
                    credits: number;
                    venues: string[];
                    times: string[];
                    teacher_zh: string[];
                    teacher_en: string[] | null;
                    language: string;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/ptt": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    content: string;
                    date: string | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/related": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/classes": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus/file": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: undefined;
                outputFormat: "redirect";
                status: 302;
            };
        };
    } & {
        "/:courseId/dates": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    id: number;
                    type: string;
                    title: string;
                    date: string;
                }[] | null;
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/dates": {
            $post: {
                input: {
                    json: {
                        dates: {
                            type: string;
                            date: string;
                            title: string;
                            id?: number | undefined;
                        }[];
                    };
                } & {
                    param: {
                        courseId: string;
                    };
                };
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
            };
        };
    }, "/course"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:venueId/courses": {
            $get: {
                input: {
                    param: {
                        venueId: string;
                    };
                } & {
                    query: {
                        semester: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/venue"> | import("hono/types").MergeSchemaPath<{
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
    }, "/shortlink"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
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
    }, "/grades">, "/ccxp"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $post: {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    error: string;
                };
                outputFormat: "json";
                status: 400;
            } | {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/": {
            $get: {
                input: {
                    query: {
                        tag: string;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/issue"> | import("hono/types").MergeSchemaPath<{
        "/folders/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        title: string;
                        min: number;
                        max: number;
                        parent: string | null;
                        metric: string;
                        requireChildValidation: boolean;
                        titlePlacement: string;
                        order: number;
                        color: string | null;
                        expanded: boolean | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/folders/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    title: string;
                    min: number;
                    max: number;
                    parent: string | null;
                    metric: string;
                    requireChildValidation: boolean;
                    titlePlacement: string;
                    order: number;
                    color: string | null;
                    expanded: boolean | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/pull": {
            $get: {
                input: {
                    query: {
                        uuid: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        uuid: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string | null;
                        id: string;
                        raw_id: string | null;
                        description: string | null;
                        title: string;
                        credits: number;
                        semester: string | null;
                        uuid: string;
                        comments: string | null;
                        parent: string | null;
                        order: number;
                        instructor: string | null;
                        dependson: string | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            uuid: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            uuid: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string | null;
                    id: string;
                    raw_id: string | null;
                    description: string | null;
                    title: string;
                    credits: number;
                    semester: string | null;
                    uuid: string;
                    comments: string | null;
                    parent: string | null;
                    order: number;
                    instructor: string | null;
                    dependson: string | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        description: string | null;
                        title: string;
                        department: string;
                        requiredCredits: number;
                        enrollmentYear: string;
                        graduationYear: string;
                        includedSemesters: string;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    description: string | null;
                    title: string;
                    department: string;
                    requiredCredits: number;
                    enrollmentYear: string;
                    graduationYear: string;
                    _deleted: boolean;
                    includedSemesters: string[];
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string;
                        id: string;
                        term: string;
                        name: string;
                        year: string;
                        order: number | null;
                        startDate: string | null;
                        endDate: string | null;
                        isActive: boolean;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string;
                    id: string;
                    term: string;
                    name: string;
                    year: string;
                    order: number | null;
                    startDate: string | null;
                    endDate: string | null;
                    isActive: boolean;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/planner">, "/">;
    delete: import("hono/types").HandlerInterface<{
        Bindings: Bindings;
    }, "delete", {
        "/": {
            $get: {
                input: {};
                output: "I AM NTHUMODS UWU";
                outputFormat: "text";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        start: string | string[];
                        end: string | string[];
                    };
                };
                output: {
                    summary: string;
                    date: string;
                    id: string;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/acacalendar"> | import("hono/types").MergeSchemaPath<{
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
    }, "/calendar"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: {
                    date: string;
                    weatherData: {
                        MinT: string | undefined;
                        MaxT: string | undefined;
                        PoP12h: string | undefined;
                        Wx: string | undefined;
                        WeatherDescription: string | undefined;
                    };
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/weather"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        courses: string | string[];
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_syllabus: {
                        brief: string | null;
                        content: string | null;
                        has_file: boolean;
                        keywords: string[] | null;
                        raw_id: string;
                        updated_at: string;
                    } | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                    course_dates: {
                        created: string;
                        date: string;
                        id: number;
                        raw_id: string;
                        submitter: string;
                        title: string;
                        type: string;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/minimal": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    raw_id: string;
                    name_zh: string;
                    name_en: string;
                    semester: string;
                    department: string;
                    course: string;
                    class: string;
                    credits: number;
                    venues: string[];
                    times: string[];
                    teacher_zh: string[];
                    teacher_en: string[] | null;
                    language: string;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/ptt": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    content: string;
                    date: string | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/related": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/classes": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus/file": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: undefined;
                outputFormat: "redirect";
                status: 302;
            };
        };
    } & {
        "/:courseId/dates": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    id: number;
                    type: string;
                    title: string;
                    date: string;
                }[] | null;
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/dates": {
            $post: {
                input: {
                    json: {
                        dates: {
                            type: string;
                            date: string;
                            title: string;
                            id?: number | undefined;
                        }[];
                    };
                } & {
                    param: {
                        courseId: string;
                    };
                };
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
            };
        };
    }, "/course"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:venueId/courses": {
            $get: {
                input: {
                    param: {
                        venueId: string;
                    };
                } & {
                    query: {
                        semester: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/venue"> | import("hono/types").MergeSchemaPath<{
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
    }, "/shortlink"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
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
    }, "/grades">, "/ccxp"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $post: {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    error: string;
                };
                outputFormat: "json";
                status: 400;
            } | {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/": {
            $get: {
                input: {
                    query: {
                        tag: string;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/issue"> | import("hono/types").MergeSchemaPath<{
        "/folders/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        title: string;
                        min: number;
                        max: number;
                        parent: string | null;
                        metric: string;
                        requireChildValidation: boolean;
                        titlePlacement: string;
                        order: number;
                        color: string | null;
                        expanded: boolean | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/folders/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    title: string;
                    min: number;
                    max: number;
                    parent: string | null;
                    metric: string;
                    requireChildValidation: boolean;
                    titlePlacement: string;
                    order: number;
                    color: string | null;
                    expanded: boolean | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/pull": {
            $get: {
                input: {
                    query: {
                        uuid: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        uuid: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string | null;
                        id: string;
                        raw_id: string | null;
                        description: string | null;
                        title: string;
                        credits: number;
                        semester: string | null;
                        uuid: string;
                        comments: string | null;
                        parent: string | null;
                        order: number;
                        instructor: string | null;
                        dependson: string | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            uuid: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            uuid: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string | null;
                    id: string;
                    raw_id: string | null;
                    description: string | null;
                    title: string;
                    credits: number;
                    semester: string | null;
                    uuid: string;
                    comments: string | null;
                    parent: string | null;
                    order: number;
                    instructor: string | null;
                    dependson: string | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        description: string | null;
                        title: string;
                        department: string;
                        requiredCredits: number;
                        enrollmentYear: string;
                        graduationYear: string;
                        includedSemesters: string;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    description: string | null;
                    title: string;
                    department: string;
                    requiredCredits: number;
                    enrollmentYear: string;
                    graduationYear: string;
                    _deleted: boolean;
                    includedSemesters: string[];
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string;
                        id: string;
                        term: string;
                        name: string;
                        year: string;
                        order: number | null;
                        startDate: string | null;
                        endDate: string | null;
                        isActive: boolean;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string;
                    id: string;
                    term: string;
                    name: string;
                    year: string;
                    order: number | null;
                    startDate: string | null;
                    endDate: string | null;
                    isActive: boolean;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/planner">, "/">;
    options: import("hono/types").HandlerInterface<{
        Bindings: Bindings;
    }, "options", {
        "/": {
            $get: {
                input: {};
                output: "I AM NTHUMODS UWU";
                outputFormat: "text";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        start: string | string[];
                        end: string | string[];
                    };
                };
                output: {
                    summary: string;
                    date: string;
                    id: string;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/acacalendar"> | import("hono/types").MergeSchemaPath<{
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
    }, "/calendar"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: {
                    date: string;
                    weatherData: {
                        MinT: string | undefined;
                        MaxT: string | undefined;
                        PoP12h: string | undefined;
                        Wx: string | undefined;
                        WeatherDescription: string | undefined;
                    };
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/weather"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        courses: string | string[];
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_syllabus: {
                        brief: string | null;
                        content: string | null;
                        has_file: boolean;
                        keywords: string[] | null;
                        raw_id: string;
                        updated_at: string;
                    } | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                    course_dates: {
                        created: string;
                        date: string;
                        id: number;
                        raw_id: string;
                        submitter: string;
                        title: string;
                        type: string;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/minimal": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    raw_id: string;
                    name_zh: string;
                    name_en: string;
                    semester: string;
                    department: string;
                    course: string;
                    class: string;
                    credits: number;
                    venues: string[];
                    times: string[];
                    teacher_zh: string[];
                    teacher_en: string[] | null;
                    language: string;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/ptt": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    content: string;
                    date: string | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/related": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/classes": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus/file": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: undefined;
                outputFormat: "redirect";
                status: 302;
            };
        };
    } & {
        "/:courseId/dates": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    id: number;
                    type: string;
                    title: string;
                    date: string;
                }[] | null;
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/dates": {
            $post: {
                input: {
                    json: {
                        dates: {
                            type: string;
                            date: string;
                            title: string;
                            id?: number | undefined;
                        }[];
                    };
                } & {
                    param: {
                        courseId: string;
                    };
                };
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
            };
        };
    }, "/course"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:venueId/courses": {
            $get: {
                input: {
                    param: {
                        venueId: string;
                    };
                } & {
                    query: {
                        semester: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/venue"> | import("hono/types").MergeSchemaPath<{
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
    }, "/shortlink"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
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
    }, "/grades">, "/ccxp"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $post: {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    error: string;
                };
                outputFormat: "json";
                status: 400;
            } | {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/": {
            $get: {
                input: {
                    query: {
                        tag: string;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/issue"> | import("hono/types").MergeSchemaPath<{
        "/folders/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        title: string;
                        min: number;
                        max: number;
                        parent: string | null;
                        metric: string;
                        requireChildValidation: boolean;
                        titlePlacement: string;
                        order: number;
                        color: string | null;
                        expanded: boolean | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/folders/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    title: string;
                    min: number;
                    max: number;
                    parent: string | null;
                    metric: string;
                    requireChildValidation: boolean;
                    titlePlacement: string;
                    order: number;
                    color: string | null;
                    expanded: boolean | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/pull": {
            $get: {
                input: {
                    query: {
                        uuid: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        uuid: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string | null;
                        id: string;
                        raw_id: string | null;
                        description: string | null;
                        title: string;
                        credits: number;
                        semester: string | null;
                        uuid: string;
                        comments: string | null;
                        parent: string | null;
                        order: number;
                        instructor: string | null;
                        dependson: string | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            uuid: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            uuid: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string | null;
                    id: string;
                    raw_id: string | null;
                    description: string | null;
                    title: string;
                    credits: number;
                    semester: string | null;
                    uuid: string;
                    comments: string | null;
                    parent: string | null;
                    order: number;
                    instructor: string | null;
                    dependson: string | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        description: string | null;
                        title: string;
                        department: string;
                        requiredCredits: number;
                        enrollmentYear: string;
                        graduationYear: string;
                        includedSemesters: string;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    description: string | null;
                    title: string;
                    department: string;
                    requiredCredits: number;
                    enrollmentYear: string;
                    graduationYear: string;
                    _deleted: boolean;
                    includedSemesters: string[];
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string;
                        id: string;
                        term: string;
                        name: string;
                        year: string;
                        order: number | null;
                        startDate: string | null;
                        endDate: string | null;
                        isActive: boolean;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string;
                    id: string;
                    term: string;
                    name: string;
                    year: string;
                    order: number | null;
                    startDate: string | null;
                    endDate: string | null;
                    isActive: boolean;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/planner">, "/">;
    patch: import("hono/types").HandlerInterface<{
        Bindings: Bindings;
    }, "patch", {
        "/": {
            $get: {
                input: {};
                output: "I AM NTHUMODS UWU";
                outputFormat: "text";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        start: string | string[];
                        end: string | string[];
                    };
                };
                output: {
                    summary: string;
                    date: string;
                    id: string;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/acacalendar"> | import("hono/types").MergeSchemaPath<{
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
    }, "/calendar"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: {
                    date: string;
                    weatherData: {
                        MinT: string | undefined;
                        MaxT: string | undefined;
                        PoP12h: string | undefined;
                        Wx: string | undefined;
                        WeatherDescription: string | undefined;
                    };
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/weather"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        courses: string | string[];
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_syllabus: {
                        brief: string | null;
                        content: string | null;
                        has_file: boolean;
                        keywords: string[] | null;
                        raw_id: string;
                        updated_at: string;
                    } | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                    course_dates: {
                        created: string;
                        date: string;
                        id: number;
                        raw_id: string;
                        submitter: string;
                        title: string;
                        type: string;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/minimal": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    raw_id: string;
                    name_zh: string;
                    name_en: string;
                    semester: string;
                    department: string;
                    course: string;
                    class: string;
                    credits: number;
                    venues: string[];
                    times: string[];
                    teacher_zh: string[];
                    teacher_en: string[] | null;
                    language: string;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/ptt": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    content: string;
                    date: string | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/related": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/classes": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus/file": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: undefined;
                outputFormat: "redirect";
                status: 302;
            };
        };
    } & {
        "/:courseId/dates": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    id: number;
                    type: string;
                    title: string;
                    date: string;
                }[] | null;
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/dates": {
            $post: {
                input: {
                    json: {
                        dates: {
                            type: string;
                            date: string;
                            title: string;
                            id?: number | undefined;
                        }[];
                    };
                } & {
                    param: {
                        courseId: string;
                    };
                };
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
            };
        };
    }, "/course"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:venueId/courses": {
            $get: {
                input: {
                    param: {
                        venueId: string;
                    };
                } & {
                    query: {
                        semester: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/venue"> | import("hono/types").MergeSchemaPath<{
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
    }, "/shortlink"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
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
    }, "/grades">, "/ccxp"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $post: {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    error: string;
                };
                outputFormat: "json";
                status: 400;
            } | {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/": {
            $get: {
                input: {
                    query: {
                        tag: string;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/issue"> | import("hono/types").MergeSchemaPath<{
        "/folders/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        title: string;
                        min: number;
                        max: number;
                        parent: string | null;
                        metric: string;
                        requireChildValidation: boolean;
                        titlePlacement: string;
                        order: number;
                        color: string | null;
                        expanded: boolean | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/folders/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    title: string;
                    min: number;
                    max: number;
                    parent: string | null;
                    metric: string;
                    requireChildValidation: boolean;
                    titlePlacement: string;
                    order: number;
                    color: string | null;
                    expanded: boolean | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/pull": {
            $get: {
                input: {
                    query: {
                        uuid: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        uuid: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string | null;
                        id: string;
                        raw_id: string | null;
                        description: string | null;
                        title: string;
                        credits: number;
                        semester: string | null;
                        uuid: string;
                        comments: string | null;
                        parent: string | null;
                        order: number;
                        instructor: string | null;
                        dependson: string | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            uuid: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            uuid: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string | null;
                    id: string;
                    raw_id: string | null;
                    description: string | null;
                    title: string;
                    credits: number;
                    semester: string | null;
                    uuid: string;
                    comments: string | null;
                    parent: string | null;
                    order: number;
                    instructor: string | null;
                    dependson: string | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        description: string | null;
                        title: string;
                        department: string;
                        requiredCredits: number;
                        enrollmentYear: string;
                        graduationYear: string;
                        includedSemesters: string;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    description: string | null;
                    title: string;
                    department: string;
                    requiredCredits: number;
                    enrollmentYear: string;
                    graduationYear: string;
                    _deleted: boolean;
                    includedSemesters: string[];
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string;
                        id: string;
                        term: string;
                        name: string;
                        year: string;
                        order: number | null;
                        startDate: string | null;
                        endDate: string | null;
                        isActive: boolean;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string;
                    id: string;
                    term: string;
                    name: string;
                    year: string;
                    order: number | null;
                    startDate: string | null;
                    endDate: string | null;
                    isActive: boolean;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/planner">, "/">;
    all: import("hono/types").HandlerInterface<{
        Bindings: Bindings;
    }, "all", {
        "/": {
            $get: {
                input: {};
                output: "I AM NTHUMODS UWU";
                outputFormat: "text";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        start: string | string[];
                        end: string | string[];
                    };
                };
                output: {
                    summary: string;
                    date: string;
                    id: string;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/acacalendar"> | import("hono/types").MergeSchemaPath<{
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
    }, "/calendar"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: {
                    date: string;
                    weatherData: {
                        MinT: string | undefined;
                        MaxT: string | undefined;
                        PoP12h: string | undefined;
                        Wx: string | undefined;
                        WeatherDescription: string | undefined;
                    };
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/weather"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        courses: string | string[];
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_syllabus: {
                        brief: string | null;
                        content: string | null;
                        has_file: boolean;
                        keywords: string[] | null;
                        raw_id: string;
                        updated_at: string;
                    } | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                    course_dates: {
                        created: string;
                        date: string;
                        id: number;
                        raw_id: string;
                        submitter: string;
                        title: string;
                        type: string;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/minimal": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    raw_id: string;
                    name_zh: string;
                    name_en: string;
                    semester: string;
                    department: string;
                    course: string;
                    class: string;
                    credits: number;
                    venues: string[];
                    times: string[];
                    teacher_zh: string[];
                    teacher_en: string[] | null;
                    language: string;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/ptt": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    content: string;
                    date: string | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/related": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/classes": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus/file": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: undefined;
                outputFormat: "redirect";
                status: 302;
            };
        };
    } & {
        "/:courseId/dates": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    id: number;
                    type: string;
                    title: string;
                    date: string;
                }[] | null;
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/dates": {
            $post: {
                input: {
                    json: {
                        dates: {
                            type: string;
                            date: string;
                            title: string;
                            id?: number | undefined;
                        }[];
                    };
                } & {
                    param: {
                        courseId: string;
                    };
                };
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
            };
        };
    }, "/course"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:venueId/courses": {
            $get: {
                input: {
                    param: {
                        venueId: string;
                    };
                } & {
                    query: {
                        semester: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/venue"> | import("hono/types").MergeSchemaPath<{
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
    }, "/shortlink"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
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
    }, "/grades">, "/ccxp"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $post: {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    error: string;
                };
                outputFormat: "json";
                status: 400;
            } | {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/": {
            $get: {
                input: {
                    query: {
                        tag: string;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/issue"> | import("hono/types").MergeSchemaPath<{
        "/folders/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        title: string;
                        min: number;
                        max: number;
                        parent: string | null;
                        metric: string;
                        requireChildValidation: boolean;
                        titlePlacement: string;
                        order: number;
                        color: string | null;
                        expanded: boolean | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/folders/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    title: string;
                    min: number;
                    max: number;
                    parent: string | null;
                    metric: string;
                    requireChildValidation: boolean;
                    titlePlacement: string;
                    order: number;
                    color: string | null;
                    expanded: boolean | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/pull": {
            $get: {
                input: {
                    query: {
                        uuid: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        uuid: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string | null;
                        id: string;
                        raw_id: string | null;
                        description: string | null;
                        title: string;
                        credits: number;
                        semester: string | null;
                        uuid: string;
                        comments: string | null;
                        parent: string | null;
                        order: number;
                        instructor: string | null;
                        dependson: string | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            uuid: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            uuid: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string | null;
                    id: string;
                    raw_id: string | null;
                    description: string | null;
                    title: string;
                    credits: number;
                    semester: string | null;
                    uuid: string;
                    comments: string | null;
                    parent: string | null;
                    order: number;
                    instructor: string | null;
                    dependson: string | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        description: string | null;
                        title: string;
                        department: string;
                        requiredCredits: number;
                        enrollmentYear: string;
                        graduationYear: string;
                        includedSemesters: string;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    description: string | null;
                    title: string;
                    department: string;
                    requiredCredits: number;
                    enrollmentYear: string;
                    graduationYear: string;
                    _deleted: boolean;
                    includedSemesters: string[];
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string;
                        id: string;
                        term: string;
                        name: string;
                        year: string;
                        order: number | null;
                        startDate: string | null;
                        endDate: string | null;
                        isActive: boolean;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string;
                    id: string;
                    term: string;
                    name: string;
                    year: string;
                    order: number | null;
                    startDate: string | null;
                    endDate: string | null;
                    isActive: boolean;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/planner">, "/">;
    on: import("hono/types").OnHandlerInterface<{
        Bindings: Bindings;
    }, {
        "/": {
            $get: {
                input: {};
                output: "I AM NTHUMODS UWU";
                outputFormat: "text";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        start: string | string[];
                        end: string | string[];
                    };
                };
                output: {
                    summary: string;
                    date: string;
                    id: string;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/acacalendar"> | import("hono/types").MergeSchemaPath<{
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
    }, "/calendar"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: {
                    date: string;
                    weatherData: {
                        MinT: string | undefined;
                        MaxT: string | undefined;
                        PoP12h: string | undefined;
                        Wx: string | undefined;
                        WeatherDescription: string | undefined;
                    };
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/weather"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        courses: string | string[];
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_syllabus: {
                        brief: string | null;
                        content: string | null;
                        has_file: boolean;
                        keywords: string[] | null;
                        raw_id: string;
                        updated_at: string;
                    } | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                    course_dates: {
                        created: string;
                        date: string;
                        id: number;
                        raw_id: string;
                        submitter: string;
                        title: string;
                        type: string;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/minimal": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    raw_id: string;
                    name_zh: string;
                    name_en: string;
                    semester: string;
                    department: string;
                    course: string;
                    class: string;
                    credits: number;
                    venues: string[];
                    times: string[];
                    teacher_zh: string[];
                    teacher_en: string[] | null;
                    language: string;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/ptt": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    content: string;
                    date: string | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/related": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/classes": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus/file": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: undefined;
                outputFormat: "redirect";
                status: 302;
            };
        };
    } & {
        "/:courseId/dates": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    id: number;
                    type: string;
                    title: string;
                    date: string;
                }[] | null;
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/dates": {
            $post: {
                input: {
                    json: {
                        dates: {
                            type: string;
                            date: string;
                            title: string;
                            id?: number | undefined;
                        }[];
                    };
                } & {
                    param: {
                        courseId: string;
                    };
                };
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
            };
        };
    }, "/course"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:venueId/courses": {
            $get: {
                input: {
                    param: {
                        venueId: string;
                    };
                } & {
                    query: {
                        semester: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/venue"> | import("hono/types").MergeSchemaPath<{
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
    }, "/shortlink"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
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
    }, "/grades">, "/ccxp"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $post: {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    error: string;
                };
                outputFormat: "json";
                status: 400;
            } | {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/": {
            $get: {
                input: {
                    query: {
                        tag: string;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/issue"> | import("hono/types").MergeSchemaPath<{
        "/folders/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        title: string;
                        min: number;
                        max: number;
                        parent: string | null;
                        metric: string;
                        requireChildValidation: boolean;
                        titlePlacement: string;
                        order: number;
                        color: string | null;
                        expanded: boolean | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/folders/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    title: string;
                    min: number;
                    max: number;
                    parent: string | null;
                    metric: string;
                    requireChildValidation: boolean;
                    titlePlacement: string;
                    order: number;
                    color: string | null;
                    expanded: boolean | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/pull": {
            $get: {
                input: {
                    query: {
                        uuid: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        uuid: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string | null;
                        id: string;
                        raw_id: string | null;
                        description: string | null;
                        title: string;
                        credits: number;
                        semester: string | null;
                        uuid: string;
                        comments: string | null;
                        parent: string | null;
                        order: number;
                        instructor: string | null;
                        dependson: string | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            uuid: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            uuid: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string | null;
                    id: string;
                    raw_id: string | null;
                    description: string | null;
                    title: string;
                    credits: number;
                    semester: string | null;
                    uuid: string;
                    comments: string | null;
                    parent: string | null;
                    order: number;
                    instructor: string | null;
                    dependson: string | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        description: string | null;
                        title: string;
                        department: string;
                        requiredCredits: number;
                        enrollmentYear: string;
                        graduationYear: string;
                        includedSemesters: string;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    description: string | null;
                    title: string;
                    department: string;
                    requiredCredits: number;
                    enrollmentYear: string;
                    graduationYear: string;
                    _deleted: boolean;
                    includedSemesters: string[];
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string;
                        id: string;
                        term: string;
                        name: string;
                        year: string;
                        order: number | null;
                        startDate: string | null;
                        endDate: string | null;
                        isActive: boolean;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string;
                    id: string;
                    term: string;
                    name: string;
                    year: string;
                    order: number | null;
                    startDate: string | null;
                    endDate: string | null;
                    isActive: boolean;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/planner">, "/">;
    use: import("hono/types").MiddlewareHandlerInterface<{
        Bindings: Bindings;
    }, {
        "/": {
            $get: {
                input: {};
                output: "I AM NTHUMODS UWU";
                outputFormat: "text";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        start: string | string[];
                        end: string | string[];
                    };
                };
                output: {
                    summary: string;
                    date: string;
                    id: string;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/acacalendar"> | import("hono/types").MergeSchemaPath<{
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
    }, "/calendar"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: {
                    date: string;
                    weatherData: {
                        MinT: string | undefined;
                        MaxT: string | undefined;
                        PoP12h: string | undefined;
                        Wx: string | undefined;
                        WeatherDescription: string | undefined;
                    };
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/weather"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        courses: string | string[];
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_syllabus: {
                        brief: string | null;
                        content: string | null;
                        has_file: boolean;
                        keywords: string[] | null;
                        raw_id: string;
                        updated_at: string;
                    } | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                    course_dates: {
                        created: string;
                        date: string;
                        id: number;
                        raw_id: string;
                        submitter: string;
                        title: string;
                        type: string;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/minimal": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    raw_id: string;
                    name_zh: string;
                    name_en: string;
                    semester: string;
                    department: string;
                    course: string;
                    class: string;
                    credits: number;
                    venues: string[];
                    times: string[];
                    teacher_zh: string[];
                    teacher_en: string[] | null;
                    language: string;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/ptt": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    content: string;
                    date: string | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/related": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/classes": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus/file": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: undefined;
                outputFormat: "redirect";
                status: 302;
            };
        };
    } & {
        "/:courseId/dates": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    id: number;
                    type: string;
                    title: string;
                    date: string;
                }[] | null;
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/dates": {
            $post: {
                input: {
                    json: {
                        dates: {
                            type: string;
                            date: string;
                            title: string;
                            id?: number | undefined;
                        }[];
                    };
                } & {
                    param: {
                        courseId: string;
                    };
                };
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
            };
        };
    }, "/course"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:venueId/courses": {
            $get: {
                input: {
                    param: {
                        venueId: string;
                    };
                } & {
                    query: {
                        semester: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/venue"> | import("hono/types").MergeSchemaPath<{
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
    }, "/shortlink"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
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
    }, "/grades">, "/ccxp"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $post: {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    error: string;
                };
                outputFormat: "json";
                status: 400;
            } | {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/": {
            $get: {
                input: {
                    query: {
                        tag: string;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/issue"> | import("hono/types").MergeSchemaPath<{
        "/folders/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        title: string;
                        min: number;
                        max: number;
                        parent: string | null;
                        metric: string;
                        requireChildValidation: boolean;
                        titlePlacement: string;
                        order: number;
                        color: string | null;
                        expanded: boolean | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/folders/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    title: string;
                    min: number;
                    max: number;
                    parent: string | null;
                    metric: string;
                    requireChildValidation: boolean;
                    titlePlacement: string;
                    order: number;
                    color: string | null;
                    expanded: boolean | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/pull": {
            $get: {
                input: {
                    query: {
                        uuid: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        uuid: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string | null;
                        id: string;
                        raw_id: string | null;
                        description: string | null;
                        title: string;
                        credits: number;
                        semester: string | null;
                        uuid: string;
                        comments: string | null;
                        parent: string | null;
                        order: number;
                        instructor: string | null;
                        dependson: string | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            uuid: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            uuid: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string | null;
                    id: string;
                    raw_id: string | null;
                    description: string | null;
                    title: string;
                    credits: number;
                    semester: string | null;
                    uuid: string;
                    comments: string | null;
                    parent: string | null;
                    order: number;
                    instructor: string | null;
                    dependson: string | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        description: string | null;
                        title: string;
                        department: string;
                        requiredCredits: number;
                        enrollmentYear: string;
                        graduationYear: string;
                        includedSemesters: string;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    description: string | null;
                    title: string;
                    department: string;
                    requiredCredits: number;
                    enrollmentYear: string;
                    graduationYear: string;
                    _deleted: boolean;
                    includedSemesters: string[];
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string;
                        id: string;
                        term: string;
                        name: string;
                        year: string;
                        order: number | null;
                        startDate: string | null;
                        endDate: string | null;
                        isActive: boolean;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string;
                    id: string;
                    term: string;
                    name: string;
                    year: string;
                    order: number | null;
                    startDate: string | null;
                    endDate: string | null;
                    isActive: boolean;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/planner">, "/">;
    router: import("hono/router").Router<[import("hono/types").H, import("hono/types").RouterRoute]>;
    getPath: (request: Request, options?: {
        env?: Bindings | undefined;
    } | undefined) => string;
    routes: import("hono/types").RouterRoute[];
    onError: (handler: import("hono").ErrorHandler<{
        Bindings: Bindings;
    }>) => import("hono/hono-base").HonoBase<{
        Bindings: Bindings;
    }, {
        "/": {
            $get: {
                input: {};
                output: "I AM NTHUMODS UWU";
                outputFormat: "text";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        start: string | string[];
                        end: string | string[];
                    };
                };
                output: {
                    summary: string;
                    date: string;
                    id: string;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/acacalendar"> | import("hono/types").MergeSchemaPath<{
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
    }, "/calendar"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: {
                    date: string;
                    weatherData: {
                        MinT: string | undefined;
                        MaxT: string | undefined;
                        PoP12h: string | undefined;
                        Wx: string | undefined;
                        WeatherDescription: string | undefined;
                    };
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/weather"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        courses: string | string[];
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_syllabus: {
                        brief: string | null;
                        content: string | null;
                        has_file: boolean;
                        keywords: string[] | null;
                        raw_id: string;
                        updated_at: string;
                    } | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                    course_dates: {
                        created: string;
                        date: string;
                        id: number;
                        raw_id: string;
                        submitter: string;
                        title: string;
                        type: string;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/minimal": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    raw_id: string;
                    name_zh: string;
                    name_en: string;
                    semester: string;
                    department: string;
                    course: string;
                    class: string;
                    credits: number;
                    venues: string[];
                    times: string[];
                    teacher_zh: string[];
                    teacher_en: string[] | null;
                    language: string;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/ptt": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    content: string;
                    date: string | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/related": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/classes": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus/file": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: undefined;
                outputFormat: "redirect";
                status: 302;
            };
        };
    } & {
        "/:courseId/dates": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    id: number;
                    type: string;
                    title: string;
                    date: string;
                }[] | null;
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/dates": {
            $post: {
                input: {
                    json: {
                        dates: {
                            type: string;
                            date: string;
                            title: string;
                            id?: number | undefined;
                        }[];
                    };
                } & {
                    param: {
                        courseId: string;
                    };
                };
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
            };
        };
    }, "/course"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:venueId/courses": {
            $get: {
                input: {
                    param: {
                        venueId: string;
                    };
                } & {
                    query: {
                        semester: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/venue"> | import("hono/types").MergeSchemaPath<{
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
    }, "/shortlink"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
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
    }, "/grades">, "/ccxp"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $post: {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    error: string;
                };
                outputFormat: "json";
                status: 400;
            } | {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/": {
            $get: {
                input: {
                    query: {
                        tag: string;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/issue"> | import("hono/types").MergeSchemaPath<{
        "/folders/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        title: string;
                        min: number;
                        max: number;
                        parent: string | null;
                        metric: string;
                        requireChildValidation: boolean;
                        titlePlacement: string;
                        order: number;
                        color: string | null;
                        expanded: boolean | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/folders/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    title: string;
                    min: number;
                    max: number;
                    parent: string | null;
                    metric: string;
                    requireChildValidation: boolean;
                    titlePlacement: string;
                    order: number;
                    color: string | null;
                    expanded: boolean | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/pull": {
            $get: {
                input: {
                    query: {
                        uuid: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        uuid: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string | null;
                        id: string;
                        raw_id: string | null;
                        description: string | null;
                        title: string;
                        credits: number;
                        semester: string | null;
                        uuid: string;
                        comments: string | null;
                        parent: string | null;
                        order: number;
                        instructor: string | null;
                        dependson: string | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            uuid: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            uuid: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string | null;
                    id: string;
                    raw_id: string | null;
                    description: string | null;
                    title: string;
                    credits: number;
                    semester: string | null;
                    uuid: string;
                    comments: string | null;
                    parent: string | null;
                    order: number;
                    instructor: string | null;
                    dependson: string | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        description: string | null;
                        title: string;
                        department: string;
                        requiredCredits: number;
                        enrollmentYear: string;
                        graduationYear: string;
                        includedSemesters: string;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    description: string | null;
                    title: string;
                    department: string;
                    requiredCredits: number;
                    enrollmentYear: string;
                    graduationYear: string;
                    _deleted: boolean;
                    includedSemesters: string[];
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string;
                        id: string;
                        term: string;
                        name: string;
                        year: string;
                        order: number | null;
                        startDate: string | null;
                        endDate: string | null;
                        isActive: boolean;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string;
                    id: string;
                    term: string;
                    name: string;
                    year: string;
                    order: number | null;
                    startDate: string | null;
                    endDate: string | null;
                    isActive: boolean;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/planner">, "/">;
    notFound: (handler: import("hono").NotFoundHandler<{
        Bindings: Bindings;
    }>) => import("hono/hono-base").HonoBase<{
        Bindings: Bindings;
    }, {
        "/": {
            $get: {
                input: {};
                output: "I AM NTHUMODS UWU";
                outputFormat: "text";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        start: string | string[];
                        end: string | string[];
                    };
                };
                output: {
                    summary: string;
                    date: string;
                    id: string;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/acacalendar"> | import("hono/types").MergeSchemaPath<{
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
    }, "/calendar"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: {
                    date: string;
                    weatherData: {
                        MinT: string | undefined;
                        MaxT: string | undefined;
                        PoP12h: string | undefined;
                        Wx: string | undefined;
                        WeatherDescription: string | undefined;
                    };
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/weather"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {
                    query: {
                        courses: string | string[];
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_syllabus: {
                        brief: string | null;
                        content: string | null;
                        has_file: boolean;
                        keywords: string[] | null;
                        raw_id: string;
                        updated_at: string;
                    } | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                    course_dates: {
                        created: string;
                        date: string;
                        id: number;
                        raw_id: string;
                        submitter: string;
                        title: string;
                        type: string;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/minimal": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    raw_id: string;
                    name_zh: string;
                    name_en: string;
                    semester: string;
                    department: string;
                    course: string;
                    class: string;
                    credits: number;
                    venues: string[];
                    times: string[];
                    teacher_zh: string[];
                    teacher_en: string[] | null;
                    language: string;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/ptt": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    content: string;
                    date: string | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/related": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                    course_scores: {
                        average: number;
                        created_at: string;
                        enrollment: number | null;
                        raw_id: string;
                        std_dev: number;
                        type: string;
                        updated_at: string;
                    } | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/classes": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/syllabus/file": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: undefined;
                outputFormat: "redirect";
                status: 302;
            };
        };
    } & {
        "/:courseId/dates": {
            $get: {
                input: {
                    param: {
                        courseId: string;
                    };
                };
                output: {
                    id: number;
                    type: string;
                    title: string;
                    date: string;
                }[] | null;
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:courseId/dates": {
            $post: {
                input: {
                    json: {
                        dates: {
                            type: string;
                            date: string;
                            title: string;
                            id?: number | undefined;
                        }[];
                    };
                } & {
                    param: {
                        courseId: string;
                    };
                };
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
            };
        };
    }, "/course"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $get: {
                input: {};
                output: string[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/:venueId/courses": {
            $get: {
                input: {
                    param: {
                        venueId: string;
                    };
                } & {
                    query: {
                        semester: string;
                    };
                };
                output: {
                    capacity: number | null;
                    class: string;
                    closed_mark: string | null;
                    compulsory_for: string[] | null;
                    course: string;
                    credits: number;
                    cross_discipline: string[] | null;
                    department: string;
                    elective_for: string[] | null;
                    enrolled: number;
                    first_specialization: string[] | null;
                    ge_target: string | null;
                    ge_type: string | null;
                    language: string;
                    name_en: string;
                    name_zh: string;
                    no_extra_selection: boolean | null;
                    note: string | null;
                    prerequisites: string | null;
                    raw_id: string;
                    reserve: number | null;
                    restrictions: string | null;
                    second_specialization: string[] | null;
                    semester: string;
                    tags: string[];
                    teacher_en: string[] | null;
                    teacher_zh: string[];
                    times: string[];
                    updated_at: string;
                    venues: string[];
                    time_slots: string[] | null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/venue"> | import("hono/types").MergeSchemaPath<{
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
    }, "/shortlink"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema | import("hono/types").MergeSchemaPath<{
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
    }, "/grades">, "/ccxp"> | import("hono/types").MergeSchemaPath<{
        "/": {
            $post: {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    error: string;
                };
                outputFormat: "json";
                status: 400;
            } | {
                input: {
                    json: {
                        body: string;
                        title: string;
                        labels: string[];
                        turnstileToken?: string | undefined;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/": {
            $get: {
                input: {
                    query: {
                        tag: string;
                    };
                };
                output: {
                    url: string;
                    repository_url: string;
                    labels_url: string;
                    comments_url: string;
                    events_url: string;
                    html_url: string;
                    id: number;
                    node_id: string;
                    number: number;
                    title: string;
                    user: {
                        login: string;
                        id: number;
                        node_id: string;
                        avatar_url: string;
                        gravatar_id: string;
                        url: string;
                        html_url: string;
                        followers_url: string;
                        following_url: string;
                        gists_url: string;
                        starred_url: string;
                        subscriptions_url: string;
                        organizations_url: string;
                        repos_url: string;
                        events_url: string;
                        received_events_url: string;
                        type: string;
                        site_admin: boolean;
                    };
                    labels: string[];
                    state: string;
                    locked: boolean;
                    assignee: null;
                    assignees: [];
                    milestone: null;
                    comments: number;
                    created_at: string;
                    updated_at: string;
                    closed_at: null;
                    author_association: string;
                    active_lock_reason: null;
                    draft: boolean;
                    pull_request: {
                        url: string;
                        html_url: string;
                        diff_url: string;
                        patch_url: string;
                        merged_at: null;
                    };
                    body: null;
                    reactions: {
                        url: string;
                        total_count: number;
                        "+1": number;
                        "-1": number;
                        laugh: number;
                        hooray: number;
                        confused: number;
                        heart: number;
                        rocket: number;
                        eyes: number;
                    };
                    timeline_url: string;
                    performed_via_github_app: null;
                    state_reason: null;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/issue"> | import("hono/types").MergeSchemaPath<{
        "/folders/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        title: string;
                        min: number;
                        max: number;
                        parent: string | null;
                        metric: string;
                        requireChildValidation: boolean;
                        titlePlacement: string;
                        order: number;
                        color: string | null;
                        expanded: boolean | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/folders/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    title: string;
                    min: number;
                    max: number;
                    parent: string | null;
                    metric: string;
                    requireChildValidation: boolean;
                    titlePlacement: string;
                    order: number;
                    color: string | null;
                    expanded: boolean | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/pull": {
            $get: {
                input: {
                    query: {
                        uuid: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        uuid: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string | null;
                        id: string;
                        raw_id: string | null;
                        description: string | null;
                        title: string;
                        credits: number;
                        semester: string | null;
                        uuid: string;
                        comments: string | null;
                        parent: string | null;
                        order: number;
                        instructor: string | null;
                        dependson: string | null;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/items/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            uuid: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            uuid: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string | null;
                    id: string;
                    raw_id: string | null;
                    description: string | null;
                    title: string;
                    credits: number;
                    semester: string | null;
                    uuid: string;
                    comments: string | null;
                    parent: string | null;
                    order: number;
                    instructor: string | null;
                    dependson: string | null;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        id: string;
                        description: string | null;
                        title: string;
                        department: string;
                        requiredCredits: number;
                        enrollmentYear: string;
                        graduationYear: string;
                        includedSemesters: string;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/plannerdata/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    id: string;
                    description: string | null;
                    title: string;
                    department: string;
                    requiredCredits: number;
                    enrollmentYear: string;
                    graduationYear: string;
                    _deleted: boolean;
                    includedSemesters: string[];
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/pull": {
            $get: {
                input: {
                    query: {
                        id: string | string[];
                        serverTimestamp: string | string[];
                        batchSize?: string | string[] | undefined;
                    };
                };
                output: {
                    checkpoint: {
                        id: string;
                        serverTimestamp: string;
                    } | null;
                    documents: {
                        status: string;
                        id: string;
                        term: string;
                        name: string;
                        year: string;
                        order: number | null;
                        startDate: string | null;
                        endDate: string | null;
                        isActive: boolean;
                        _deleted: boolean;
                    }[];
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    } & {
        "/semesters/push": {
            $post: {
                input: {
                    json: {
                        newDocumentState: {
                            id: string;
                            _deleted: boolean;
                        } & {
                            [k: string]: unknown;
                        };
                        assumedMasterState?: import("zod").objectInputType<{
                            id: import("zod").ZodString;
                            _deleted: import("zod").ZodBoolean;
                        }, import("zod").ZodTypeAny, "passthrough"> | undefined;
                    }[];
                };
                output: {
                    status: string;
                    id: string;
                    term: string;
                    name: string;
                    year: string;
                    order: number | null;
                    startDate: string | null;
                    endDate: string | null;
                    isActive: boolean;
                    _deleted: boolean;
                }[];
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
            };
        };
    }, "/planner">, "/">;
    fetch: (request: Request, Env?: {} | Bindings | undefined, executionCtx?: import("hono").ExecutionContext) => Response | Promise<Response>;
    request: (input: RequestInfo | URL, requestInit?: RequestInit, Env?: {} | Bindings | undefined, executionCtx?: import("hono").ExecutionContext) => Response | Promise<Response>;
    fire: () => void;
};
export default APIHandler;
