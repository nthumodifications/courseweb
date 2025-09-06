declare const app: import("hono/hono-base").HonoBase<
  import("hono/types").BlankEnv,
  {
    "/": {
      $get: {
        input: {
          query: {
            courses: string | string[];
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
  } & {
    "/:courseId": {
      $get: {
        input: {
          param: {
            courseId: string;
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
        };
        outputFormat: "json";
        status: import("hono/utils/http-status").ContentfulStatusCode;
      };
    };
  } & {
    "/:courseId/syllabus": {
      $get: {
        input: {
          param: {
            courseId: string;
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
          course_syllabus: {
            brief: string | null;
            content: string | null;
            has_file: boolean;
            keywords: string[] | null;
            raw_id: string;
            updated_at: string;
          } | null;
          course_scores: {
            average: number;
            created_at: string;
            enrollment: number | null;
            raw_id: string;
            std_dev: number;
            type: string;
            updated_at: string;
          } | null;
          course_dates: {
            created: string;
            date: string;
            id: number;
            raw_id: string;
            submitter: string;
            title: string;
            type: string;
          }[];
        };
        outputFormat: "json";
        status: import("hono/utils/http-status").ContentfulStatusCode;
      };
    };
  } & {
    "/:courseId/minimal": {
      $get: {
        input: {
          param: {
            courseId: string;
          };
        };
        output: {
          raw_id: string;
          name_zh: string;
          name_en: string;
          semester: string;
          department: string;
          course: string;
          class: string;
          credits: number;
          venues: string[];
          times: string[];
          teacher_zh: string[];
          teacher_en: string[] | null;
          language: string;
        };
        outputFormat: "json";
        status: import("hono/utils/http-status").ContentfulStatusCode;
      };
    };
  } & {
    "/:courseId/ptt": {
      $get: {
        input: {
          param: {
            courseId: string;
          };
        };
        output: {
          content: string;
          date: string | null;
        }[];
        outputFormat: "json";
        status: import("hono/utils/http-status").ContentfulStatusCode;
      };
    };
  } & {
    "/:courseId/related": {
      $get: {
        input: {
          param: {
            courseId: string;
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
          course_scores: {
            average: number;
            created_at: string;
            enrollment: number | null;
            raw_id: string;
            std_dev: number;
            type: string;
            updated_at: string;
          } | null;
        }[];
        outputFormat: "json";
        status: import("hono/utils/http-status").ContentfulStatusCode;
      };
    };
  } & {
    "/classes": {
      $get: {
        input: {};
        output: string[];
        outputFormat: "json";
        status: import("hono/utils/http-status").ContentfulStatusCode;
      };
    };
  } & {
    "/:courseId/syllabus/file": {
      $get: {
        input: {
          param: {
            courseId: string;
          };
        };
        output: undefined;
        outputFormat: "redirect";
        status: 302;
      };
    };
  } & {
    "/:courseId/dates": {
      $get: {
        input: {
          param: {
            courseId: string;
          };
        };
        output:
          | {
              id: number;
              type: string;
              title: string;
              date: string;
            }[]
          | null;
        outputFormat: "json";
        status: import("hono/utils/http-status").ContentfulStatusCode;
      };
    };
  } & {
    "/:courseId/dates": {
      $post: {
        input: {
          json: {
            dates: {
              type: string;
              date: string;
              title: string;
              id?: number | undefined;
            }[];
          };
        } & {
          param: {
            courseId: string;
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
