declare const app: import("hono/hono-base").HonoBase<
  import("hono/types").BlankEnv,
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
  "/"
>;
export default app;
