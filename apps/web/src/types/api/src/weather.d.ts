declare const app: import("hono/hono-base").HonoBase<
  import("hono/types").BlankEnv,
  {
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
  },
  "/"
>;
export default app;
