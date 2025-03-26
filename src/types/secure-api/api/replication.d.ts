import { z } from "zod";
declare const app: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
    "/events/pull": {
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
                documents: never[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    id: string | string[];
                    serverTimestamp: string | string[];
                    batchSize?: string | string[] | undefined;
                };
            };
            output: {
                documents: {
                    id: string | undefined;
                    _deleted: boolean;
                }[];
                checkpoint: {
                    id: string;
                    serverTimestamp: string;
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/events/push": {
        $post: {
            input: {
                json: {
                    newDocumentState: {
                        _deleted: boolean;
                        id?: string | undefined;
                    } & {
                        [k: string]: unknown;
                    };
                    assumedMasterState?: z.objectInputType<{
                        id: z.ZodOptional<z.ZodString>;
                        _deleted: z.ZodBoolean;
                    }, z.ZodTypeAny, "passthrough"> | undefined;
                }[];
            };
            output: {
                id: string | undefined;
                _deleted: boolean;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/timetablesync/pull": {
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
                documents: never[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    id: string | string[];
                    serverTimestamp: string | string[];
                    batchSize?: string | string[] | undefined;
                };
            };
            output: {
                documents: {
                    semester: string;
                    _deleted: boolean;
                }[];
                checkpoint: {
                    id: string;
                    serverTimestamp: string;
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/timetablesync/push": {
        $post: {
            input: {
                json: {
                    newDocumentState: {
                        _deleted: boolean;
                        semester?: string | undefined;
                    } & {
                        [k: string]: unknown;
                    };
                    assumedMasterState?: z.objectInputType<{
                        semester: z.ZodOptional<z.ZodString>;
                        _deleted: z.ZodBoolean;
                    }, z.ZodTypeAny, "passthrough"> | undefined;
                }[];
            };
            output: {
                semester: string;
                _deleted: boolean;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
}, "/">;
export default app;
