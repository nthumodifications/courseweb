import algoliasearch from "algoliasearch";
import type { Context } from "hono";
import { env } from "hono/adapter";
import { createFetchRequester } from "@algolia/requester-fetch";

const algolia = (c: Context) => {
  const { ALGOLIA_APP_ID, ALGOLIA_API_KEY } = env<{
    ALGOLIA_APP_ID: string;
    ALGOLIA_API_KEY: string;
  }>(c);

  return algoliaWithEnv(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
};

export const algoliaWithEnv = (appId: string, apiKey: string) => {
  const client = algoliasearch(appId, apiKey, {
    requester: createFetchRequester(),
  });
  const index = client.initIndex("nthu_courses");
  return index;
};

export default algolia;
