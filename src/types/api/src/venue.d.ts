declare const app: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
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
}, "/">;
export default app;
