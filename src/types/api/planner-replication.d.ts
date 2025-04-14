import { z } from "zod";
declare const app: import("hono/hono-base").HonoBase<{}, {
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
                    assumedMasterState?: z.objectInputType<{
                        id: z.ZodString;
                        _deleted: z.ZodBoolean;
                    }, z.ZodTypeAny, "passthrough"> | undefined;
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
                    dependson: string[];
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
                    assumedMasterState?: z.objectInputType<{
                        uuid: z.ZodString;
                        _deleted: z.ZodBoolean;
                    }, z.ZodTypeAny, "passthrough"> | undefined;
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
                dependson: string[];
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
                    includedSemesters: string[];
                    createdAt: string;
                    updatedAt: string;
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
                    assumedMasterState?: z.objectInputType<{
                        id: z.ZodString;
                        _deleted: z.ZodBoolean;
                    }, z.ZodTypeAny, "passthrough"> | undefined;
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
                includedSemesters: string[];
                createdAt: string;
                updatedAt: string;
                _deleted: boolean;
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
                    assumedMasterState?: z.objectInputType<{
                        id: z.ZodString;
                        _deleted: z.ZodBoolean;
                    }, z.ZodTypeAny, "passthrough"> | undefined;
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
}, "/">;
export default app;
