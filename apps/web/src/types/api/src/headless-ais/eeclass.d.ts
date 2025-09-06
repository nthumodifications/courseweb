declare const app: import("hono/hono-base").HonoBase<
  import("hono/types").BlankEnv,
  {
    login: {
      $post:
        | {
            input: {
              form: {
                studentid: string;
                password: string;
              };
            };
            output: {};
            outputFormat: string;
            status: import("hono/utils/http-status").StatusCode;
          }
        | {
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
  },
  "/"
>;
export default app;
