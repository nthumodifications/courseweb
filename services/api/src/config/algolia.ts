import algoliasearch, { type SearchIndex } from "algoliasearch";
import type { Context } from "hono";
import { env } from "hono/adapter";
import { createFetchRequester } from "@algolia/requester-fetch";

export type AlgoliaCredentials = {
  appId?: string;
  apiKey?: string;
};

type AlgoliaEnv = {
  ALGOLIA_APP_ID?: string;
  ALGOLIA_API_KEY?: string;
  ALGOLIA_BACKUP_APP_ID?: string;
  ALGOLIA_BACKUP_API_KEY?: string;
};

export type AlgoliaFailureKind = "immediate" | "transient" | "bug";

type AlgoliaErrorLike = {
  name?: string;
  message?: string;
  status?: number;
  statusCode?: number;
  response?: {
    status?: number;
    message?: string;
    body?: { message?: string } | string;
  };
};

const asAlgoliaError = (error: unknown): AlgoliaErrorLike =>
  error && typeof error === "object" ? (error as AlgoliaErrorLike) : {};

const getAlgoliaStatus = (error: unknown) => {
  const candidate = asAlgoliaError(error);
  return candidate.status ?? candidate.statusCode ?? candidate.response?.status;
};

const getAlgoliaMessage = (error: unknown) => {
  const candidate = asAlgoliaError(error);
  const errorMessage = error instanceof Error ? error.message : undefined;
  if (typeof error === "string") return error;
  const responseBody = candidate.response?.body;
  const responseMessage =
    typeof responseBody === "string" ? responseBody : responseBody?.message;
  return [
    errorMessage,
    candidate.message,
    candidate.response?.message,
    responseMessage,
  ]
    .filter(Boolean)
    .join(" ");
};

/**
 * Classify only failures that make the Algolia tier unusable. A malformed
 * request, such as a 400 caused by a bad filter, remains a bug and must not
 * be hidden by failover.
 */
export const classifyAlgoliaError = (error: unknown): AlgoliaFailureKind => {
  const status = getAlgoliaStatus(error);
  const message = getAlgoliaMessage(error);
  const candidate = asAlgoliaError(error);
  const immediate =
    status === 402 ||
    status === 429 ||
    (status === 403 && /blocked/i.test(message)) ||
    /quota|record limit|too many requests|\bplan\b|unblock/i.test(message);

  if (immediate) return "immediate";

  const isNetworkFailure =
    candidate.name === "TypeError" ||
    candidate.name === "TimeoutError" ||
    candidate.name === "AbortError" ||
    /network|timeout|timed out|failed to fetch|fetch failed|ETIMEDOUT|ENETUNREACH|ECONNRESET/i.test(
      message,
    );
  return isNetworkFailure ? "transient" : "bug";
};

export const isAlgoliaUnusableError = (error: unknown) =>
  classifyAlgoliaError(error) !== "bug";

/** Safe diagnostic metadata. It deliberately excludes error messages and
 * request objects, which could contain credentials supplied by a requester. */
export const describeAlgoliaError = (error: unknown) => ({
  status: getAlgoliaStatus(error) ?? "network-or-unknown",
  kind: classifyAlgoliaError(error),
});

const algolia = (c: Context) => {
  const index = getAlgoliaClients(c)[0];
  if (!index) throw new Error("Algolia credentials not found");
  return index;
};

/**
 * Return configured course indexes in failover order. A pair is only used
 * when both values are present so a partially rotated credential cannot be
 * selected accidentally.
 */
export const algoliaClientsWithEnv = (
  primary: AlgoliaCredentials,
  backup?: AlgoliaCredentials,
) => {
  const credentials = [primary, backup]
    .map((value) => ({
      appId: value?.appId?.trim(),
      apiKey: value?.apiKey?.trim(),
    }))
    .filter((value): value is Required<AlgoliaCredentials> =>
      Boolean(value.appId && value.apiKey),
    );

  return credentials
    .filter(({ appId }, index, all) => index === 0 || appId !== all[0]?.appId)
    .map(({ appId, apiKey }) => algoliaWithEnv(appId, apiKey));
};

export const getAlgoliaClients = (c: Context) => {
  const values = env<AlgoliaEnv>(c);

  return algoliaClientsWithEnv(
    { appId: values.ALGOLIA_APP_ID, apiKey: values.ALGOLIA_API_KEY },
    {
      appId: values.ALGOLIA_BACKUP_APP_ID,
      apiKey: values.ALGOLIA_BACKUP_API_KEY,
    },
  );
};

// The return type is annotated explicitly: without it TypeScript infers a type
// that can only be named through a deep path into @algolia/transporter, which
// is not portable and fails with TS2742 whenever node_modules is reached
// through a link (worktrees, hoisted installs, some CI layouts).
export const algoliaWithEnv = (
  appId: string,
  apiKey: string,
): SearchIndex => {
  const client = algoliasearch(appId, apiKey, {
    requester: createFetchRequester(),
  });
  const index = client.initIndex("nthu_courses");
  return index;
};

export default algolia;
