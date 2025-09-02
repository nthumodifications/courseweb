import type { Context } from "hono";
declare const algolia: (c: Context) => import("algoliasearch").SearchIndex;
export declare const algoliaWithEnv: (appId: string, apiKey: string) => import("algoliasearch").SearchIndex;
export default algolia;
