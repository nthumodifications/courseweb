export type CalendarApiResponse = {
    kind: string;
    etag: string;
    id: string;
    status: string;
    htmlLink: string;
    created: string;
    updated: string;
    summary: string;
    creator: unknown;
    organizer: unknown;
    start: {
        date: string;
    };
    end: {
        date: string;
    };
    transparency: string;
    iCalUID: string;
    sequence: number;
    eventType: string;
};
declare const app: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
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
}, "/">;
export default app;
