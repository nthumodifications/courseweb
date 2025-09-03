declare const app: import("hono/hono-base").HonoBase<
  {},
  | import("hono/types").BlankSchema
  | import("hono/types").MergeSchemaPath<
      {
        "/:key": {
          $get:
            | {
                input: {
                  param: {
                    key: string;
                  };
                };
                output: {
                  error: string;
                };
                outputFormat: "json";
                status: 400;
              }
            | {
                input: {
                  param: {
                    key: string;
                  };
                };
                output: {
                  error: string;
                };
                outputFormat: "json";
                status: 404;
              }
            | {
                input: {
                  param: {
                    key: string;
                  };
                };
                output: never;
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
              };
        };
      } & {
        "/:key": {
          $post:
            | {
                input: {
                  param: {
                    key: string;
                  };
                } & {
                  json: {
                    lastModified: number;
                    value?: any;
                  };
                };
                output: {
                  error: string;
                };
                outputFormat: "json";
                status: 400;
              }
            | {
                input: {
                  param: {
                    key: string;
                  };
                } & {
                  json: {
                    lastModified: number;
                    value?: any;
                  };
                };
                output: {
                  success: boolean;
                };
                outputFormat: "json";
                status: import("hono/utils/http-status").ContentfulStatusCode;
              };
        };
      },
      "/kv"
    >
  | import("hono/types").MergeSchemaPath<
      {
        "/events/pull": {
          $get:
            | {
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
              }
            | {
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
                assumedMasterState?:
                  | import("zod").objectInputType<
                      {
                        id: import("zod").ZodOptional<import("zod").ZodString>;
                        _deleted: import("zod").ZodBoolean;
                      },
                      import("zod").ZodTypeAny,
                      "passthrough"
                    >
                  | undefined;
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
          $get:
            | {
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
              }
            | {
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
                assumedMasterState?:
                  | import("zod").objectInputType<
                      {
                        semester: import("zod").ZodOptional<
                          import("zod").ZodString
                        >;
                        _deleted: import("zod").ZodBoolean;
                      },
                      import("zod").ZodTypeAny,
                      "passthrough"
                    >
                  | undefined;
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
      },
      "/replication"
    >,
  "/"
>;
export default app;
