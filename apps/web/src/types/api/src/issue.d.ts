declare const app: import("hono/hono-base").HonoBase<
  import("hono/types").BlankEnv,
  {
    "/": {
      $post:
        | {
            input: {
              json: {
                body: string;
                title: string;
                labels: string[];
                turnstileToken?: string | undefined;
              };
            };
            output: {
              error: string;
              code?: string | undefined;
              details?: string | undefined;
            };
            outputFormat: "json";
            status: any;
          }
        | {
            input: {
              json: {
                body: string;
                title: string;
                labels: string[];
                turnstileToken?: string | undefined;
              };
            };
            output: {
              url: string;
              repository_url: string;
              labels_url: string;
              comments_url: string;
              events_url: string;
              html_url: string;
              id: number;
              node_id: string;
              number: number;
              title: string;
              user: {
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
              };
              labels: string[];
              state: string;
              locked: boolean;
              assignee: null;
              assignees: [];
              milestone: null;
              comments: number;
              created_at: string;
              updated_at: string;
              closed_at: null;
              author_association: string;
              active_lock_reason: null;
              draft: boolean;
              pull_request: {
                url: string;
                html_url: string;
                diff_url: string;
                patch_url: string;
                merged_at: null;
              };
              body: null;
              reactions: {
                url: string;
                total_count: number;
                "+1": number;
                "-1": number;
                laugh: number;
                hooray: number;
                confused: number;
                heart: number;
                rocket: number;
                eyes: number;
              };
              timeline_url: string;
              performed_via_github_app: null;
              state_reason: null;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
          };
    };
  } & {
    "/": {
      $get:
        | {
            input: {
              query: {
                tag: string;
              };
            };
            output: {
              error: string;
              code?: string | undefined;
              details?: string | undefined;
            };
            outputFormat: "json";
            status: any;
          }
        | {
            input: {
              query: {
                tag: string;
              };
            };
            output: {
              url: string;
              repository_url: string;
              labels_url: string;
              comments_url: string;
              events_url: string;
              html_url: string;
              id: number;
              node_id: string;
              number: number;
              title: string;
              user: {
                login: string;
                id: number;
                node_id: string;
                avatar_url: string;
                gravatar_id: string;
                url: string;
                html_url: string;
                followers_url: string;
                following_url: string;
                gists_url: string;
                starred_url: string;
                subscriptions_url: string;
                organizations_url: string;
                repos_url: string;
                events_url: string;
                received_events_url: string;
                type: string;
                site_admin: boolean;
              };
              labels: string[];
              state: string;
              locked: boolean;
              assignee: null;
              assignees: [];
              milestone: null;
              comments: number;
              created_at: string;
              updated_at: string;
              closed_at: null;
              author_association: string;
              active_lock_reason: null;
              draft: boolean;
              pull_request: {
                url: string;
                html_url: string;
                diff_url: string;
                patch_url: string;
                merged_at: null;
              };
              body: null;
              reactions: {
                url: string;
                total_count: number;
                "+1": number;
                "-1": number;
                laugh: number;
                hooray: number;
                confused: number;
                heart: number;
                rocket: number;
                eyes: number;
              };
              timeline_url: string;
              performed_via_github_app: null;
              state_reason: null;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
          };
    };
  },
  "/"
>;
export default app;
