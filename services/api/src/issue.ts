import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import jwt from "@tsndr/cloudflare-worker-jwt";
import { z } from "zod";
import { env } from "hono/adapter";

type GithubEnv = {
  GITHUB_CLIENT_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_INSTALLATION_ID: string;
  TURNSTILE_SECRET_KEY: string;
};

type ErrorResponse = {
  error: string;
  code?: string;
  details?: string;
};

type GithubIssue = {
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

const getJwt = (client_id: string, privateKey: string) => {
  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
    iss: client_id,
  };

  const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });
  return token;
};

const getInstallationAccessToken = async (
  client_id: string,
  privateKey: string,
  installation_id: string,
) => {
  const jwtToken = await getJwt(client_id, privateKey);

  const response = await fetch(
    `https://api.github.com/app/installations/${installation_id}/access_tokens`,
    {
      method: "POST",
      headers: {
        "User-Agent": "nthumods-app",
        Authorization: `Bearer ${jwtToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get installation access token: ${response.status} ${response.statusText}`,
    );
  }
  const text = await response.text();

  const data = JSON.parse(text) as { token: string; expires_at: string };

  return data.token;
};

const verifyTurnstile = async (token: string, secretKey: string) => {
  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);

  try {
    const result = await fetch(url, {
      body: formData,
      method: "POST",
    });
    const outcome = (await result.json()) as { success: boolean };
    return outcome.success;
  } catch (err) {
    return false;
  }
};

const app = new Hono()
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        title: z.string(),
        body: z.string(),
        labels: z.array(z.string()),
        turnstileToken: z.string().optional(),
      }),
    ),
    async (c) => {
      const { title, body, labels, turnstileToken } = c.req.valid("json");

      const {
        GITHUB_CLIENT_ID,
        GITHUB_APP_PRIVATE_KEY,
        GITHUB_INSTALLATION_ID,
        TURNSTILE_SECRET_KEY,
      } = env<GithubEnv>(c);

      // Verify Turnstile token if provided
      if (turnstileToken) {
        const isValid = await verifyTurnstile(
          turnstileToken,
          TURNSTILE_SECRET_KEY,
        );
        if (!isValid) {
          return c.json(
            {
              error: "Invalid Turnstile verification",
              code: "TURNSTILE_VERIFICATION_FAILED",
              details: "Please refresh the page and try again",
            } as ErrorResponse,
            400,
          );
        }
      }

      // Validate input
      if (!title || title.length < 7) {
        return c.json(
          {
            error: "Title is required and must be at least 7 characters long",
            code: "INVALID_TITLE",
          } as ErrorResponse,
          400,
        );
      }

      if (!body || body.trim().length < 10) {
        return c.json(
          {
            error:
              "Description is required and must be at least 10 characters long",
            code: "INVALID_DESCRIPTION",
          } as ErrorResponse,
          400,
        );
      }

      // base64 encoded private key to utf8, not using buffer
      const privateKey = atob(GITHUB_APP_PRIVATE_KEY);

      let accessToken: string;
      try {
        accessToken = await getInstallationAccessToken(
          GITHUB_CLIENT_ID,
          privateKey,
          GITHUB_INSTALLATION_ID,
        );
      } catch (error) {
        console.error("Failed to get GitHub access token:", error);
        return c.json(
          {
            error: "Failed to authenticate with GitHub",
            code: "GITHUB_AUTH_FAILED",
            details: "Please try again later",
          } as ErrorResponse,
          500,
        );
      }
      const repoOwner = "nthumodifications";
      const repoName = "courseweb";

      try {
        const response = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
          {
            method: "POST",
            headers: {
              "User-Agent": "nthumods-app",
              Authorization: `token ${accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
            body: JSON.stringify({ title, body, labels }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`GitHub API error: ${response.status} ${errorText}`);

          let errorResponse: ErrorResponse;

          switch (response.status) {
            case 401:
              errorResponse = {
                error: "Authentication failed with GitHub",
                code: "GITHUB_AUTH_INVALID",
                details: "Please refresh and try again",
              };
              break;
            case 403:
              errorResponse = {
                error: "Access denied by GitHub",
                code: "GITHUB_ACCESS_DENIED",
                details: "Rate limit exceeded or insufficient permissions",
              };
              break;
            case 422:
              errorResponse = {
                error: "Invalid issue data",
                code: "GITHUB_VALIDATION_ERROR",
                details: "The issue data was rejected by GitHub",
              };
              break;
            default:
              errorResponse = {
                error: "Failed to create GitHub issue",
                code: "GITHUB_API_ERROR",
                details: `HTTP ${response.status}: ${response.statusText}`,
              };
          }

          return c.json(errorResponse, response.status as any);
        }

        const data = (await response.json()) as GithubIssue;
        return c.json(data);
      } catch (error) {
        console.error("Error creating GitHub issue:", error);
        return c.json(
          {
            error: "Failed to submit issue",
            code: "NETWORK_ERROR",
            details: "Please check your connection and try again",
          } as ErrorResponse,
          500,
        );
      }
    },
  )
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        tag: z.string(),
      }),
    ),
    async (c) => {
      const { tag } = c.req.valid("query");

      // Validate tag parameter
      if (!tag || tag.trim().length === 0) {
        return c.json(
          {
            error: "Tag parameter is required",
            code: "MISSING_TAG",
          } as ErrorResponse,
          400,
        );
      }

      const {
        GITHUB_CLIENT_ID,
        GITHUB_APP_PRIVATE_KEY,
        GITHUB_INSTALLATION_ID,
      } = env<GithubEnv>(c);
      const privateKey = atob(GITHUB_APP_PRIVATE_KEY);

      let accessToken: string;
      try {
        accessToken = await getInstallationAccessToken(
          GITHUB_CLIENT_ID,
          privateKey,
          GITHUB_INSTALLATION_ID,
        );
      } catch (error) {
        console.error("Failed to get GitHub access token for GET:", error);
        return c.json(
          {
            error: "Failed to authenticate with GitHub",
            code: "GITHUB_AUTH_FAILED",
            details: "Please try again later",
          } as ErrorResponse,
          500,
        );
      }

      const repoOwner = "nthumodifications";
      const repoName = "courseweb";

      try {
        const response = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/issues?filter=all&labels=${encodeURIComponent(tag)}&state=open`,
          {
            method: "GET",
            headers: {
              "User-Agent": "nthumods-app",
              Authorization: `token ${accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `GitHub API GET error: ${response.status} ${errorText}`,
          );

          let errorResponse: ErrorResponse;

          switch (response.status) {
            case 401:
              errorResponse = {
                error: "Authentication failed with GitHub",
                code: "GITHUB_AUTH_INVALID",
                details: "Please refresh and try again",
              };
              break;
            case 403:
              errorResponse = {
                error: "Access denied by GitHub",
                code: "GITHUB_ACCESS_DENIED",
                details: "Rate limit exceeded or insufficient permissions",
              };
              break;
            case 404:
              errorResponse = {
                error: "Repository not found",
                code: "GITHUB_REPO_NOT_FOUND",
                details: "The repository may have been moved or deleted",
              };
              break;
            default:
              errorResponse = {
                error: "Failed to fetch issues from GitHub",
                code: "GITHUB_API_ERROR",
                details: `HTTP ${response.status}: ${response.statusText}`,
              };
          }

          return c.json(
            errorResponse,
            (response.status >= 500 ? 500 : response.status) as any,
          );
        }

        const data = (await response.json()) as GithubIssue[];

        // Validate response data
        if (!Array.isArray(data)) {
          return c.json(
            {
              error: "Invalid response from GitHub",
              code: "INVALID_GITHUB_RESPONSE",
              details: "Expected an array of issues",
            } as ErrorResponse,
            502,
          );
        }

        return c.json(data);
      } catch (error) {
        console.error("Error fetching GitHub issues:", error);
        return c.json(
          {
            error: "Failed to fetch issues",
            code: "NETWORK_ERROR",
            details: "Please check your connection and try again",
          } as ErrorResponse,
          500,
        );
      }
    },
  );

export default app;
