declare const app: import("hono/hono-base").HonoBase<
  import("hono/types").BlankEnv,
  {
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
  },
  "/"
>;
export default app;
