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
                    [x: string]: string | undefined;
                    serverTimestamp: string | undefined;
                } | null;
                documents: never[];
            } | {
                documents: any;
                checkpoint: {
                    [x: string]: string;
                    serverTimestamp: string;
                };
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
                message: string;
            };
            outputFormat: "json";
            status: 400;
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
            output: never;
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
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
                message: string;
            };
            outputFormat: "json";
            status: 400;
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
                    [x: string]: string | undefined;
                    serverTimestamp: string | undefined;
                } | null;
                documents: never[];
            } | {
                documents: any;
                checkpoint: {
                    [x: string]: string;
                    serverTimestamp: string;
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    uuid: string | string[];
                    serverTimestamp: string | string[];
                    batchSize?: string | string[] | undefined;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 400;
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
            output: never;
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
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
                message: string;
            };
            outputFormat: "json";
            status: 400;
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
                    [x: string]: string | undefined;
                    serverTimestamp: string | undefined;
                } | null;
                documents: never[];
            } | {
                documents: any;
                checkpoint: {
                    [x: string]: string;
                    serverTimestamp: string;
                };
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
                message: string;
            };
            outputFormat: "json";
            status: 400;
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
            output: never;
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
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
                message: string;
            };
            outputFormat: "json";
            status: 400;
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
                    [x: string]: string | undefined;
                    serverTimestamp: string | undefined;
                } | null;
                documents: never[];
            } | {
                documents: any;
                checkpoint: {
                    [x: string]: string;
                    serverTimestamp: string;
                };
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
                message: string;
            };
            outputFormat: "json";
            status: 400;
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
            output: never;
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
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
                message: string;
            };
            outputFormat: "json";
            status: 400;
        };
    };
}, "/">;
export default app;
