import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  describeAlgoliaError,
  getAlgoliaClients,
  isAlgoliaUnusableError,
} from "./config/algolia";
import fallbackSearch from "./search-fallback";
import searchChunk from "./search-chunk";
import type { Bindings } from "./index";
import { rateLimitMiddleware } from "./utils/rate-limit";
import {
  SEARCH_ATTRIBUTE_ALLOWLIST,
  SUPPORTED_FACETS,
} from "./search-projection";

const MAX_QUERY_LENGTH = 200;
const MAX_FILTER_LENGTH = 500;
const MAX_FACET_FILTERS = 20;
const MAX_FACET_FILTER_LENGTH = 120;
const MAX_ATTRIBUTES = 50;

const attributeAllowlist = new Set<string>(SEARCH_ATTRIBUTE_ALLOWLIST);
const facetAllowlist = new Set<string>(SUPPORTED_FACETS);

const hasAllowedFilterAttributes = (value: string) => {
  let tokenCount = 0;
  const tokenPattern =
    /(?:^|[\s(])([A-Za-z_][A-Za-z0-9_]*)\s*(>=|<=|!=|=|>|<|:)/g;
  for (const match of value.matchAll(tokenPattern)) {
    tokenCount += 1;
    if (!facetAllowlist.has(match[1])) return false;
  }
  return value.trim().length === 0 || tokenCount > 0;
};

const hasAllowedFacetFilter = (value: string) => {
  const match = value.trim().match(/^-?([A-Za-z_][A-Za-z0-9_]*)\s*:/);
  return Boolean(match && facetAllowlist.has(match[1]));
};

const validateAttributes = (attributes: string[]) =>
  attributes.length <= MAX_ATTRIBUTES &&
  attributes.every((attribute) => attributeAllowlist.has(attribute));

const validateFacetFilters = (filters: string[]) =>
  filters.length <= MAX_FACET_FILTERS &&
  filters.every(
    (filter) =>
      filter.length <= MAX_FACET_FILTER_LENGTH && hasAllowedFacetFilter(filter),
  );

const searchSchema = z
  .object({
    query: z.string().min(1, "Search query is required").max(MAX_QUERY_LENGTH),
    limit: z.number().int().min(1).max(50).optional().default(10),
    filters: z
      .string()
      .max(MAX_FILTER_LENGTH)
      .refine(hasAllowedFilterAttributes, "Invalid filter attribute")
      .optional(),
    facetFilters: z
      .array(z.string().max(MAX_FACET_FILTER_LENGTH))
      .max(MAX_FACET_FILTERS)
      .refine(validateFacetFilters, "Invalid facet filter attribute")
      .optional(),
    attributesToRetrieve: z
      .array(z.string())
      .max(MAX_ATTRIBUTES)
      .refine(validateAttributes, "Invalid attribute to retrieve")
      .optional(),
    highlightPreTag: z.string().optional().default("<mark>"),
    highlightPostTag: z.string().optional().default("</mark>"),
  })
  .superRefine((value, context) => {
    const isMarkPair =
      value.highlightPreTag === "<mark>" &&
      value.highlightPostTag === "</mark>";
    const isEmPair =
      value.highlightPreTag === "<em>" && value.highlightPostTag === "</em>";
    if (!isMarkPair && !isEmPair) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid highlight tags",
        path: ["highlightPreTag"],
      });
    }
  });

const getSearchSchema = z.object({
  q: z.string().min(1, "Search query is required").max(MAX_QUERY_LENGTH),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  filters: z
    .string()
    .max(MAX_FILTER_LENGTH)
    .refine(hasAllowedFilterAttributes, "Invalid filter attribute")
    .optional(),
  facetFilters: z.string().optional(),
  attributesToRetrieve: z.string().optional(),
});

const searchAlgolia = async (c: Context, query: string, searchParams: any) => {
  const clients = getAlgoliaClients(c);
  let lastError: unknown;
  for (const index of clients) {
    try {
      return await index.search(query, searchParams);
    } catch (error) {
      lastError = error;
      if (!isAlgoliaUnusableError(error)) {
        console.error(
          "Algolia search request bug:",
          describeAlgoliaError(error),
        );
        throw error;
      }
    }
  }
  throw lastError ?? new Error("Algolia credentials not found");
};

// Only the routes that cost something are limited; reads stay open.
const searchRateLimit = rateLimitMiddleware({
  limiter: "SEARCH_RATE_LIMITER",
  errorMessage: "Too many search requests. Please try again in a minute.",
});

const app = new Hono<{ Bindings: Bindings }>()
  .post("/", searchRateLimit, zValidator("json", searchSchema), async (c) => {
    const {
      query,
      limit,
      filters,
      facetFilters,
      attributesToRetrieve,
      highlightPreTag,
      highlightPostTag,
    } = c.req.valid("json");

    try {
      const searchParams: any = {
        hitsPerPage: limit,
        highlightPreTag,
        highlightPostTag,
      };

      if (filters) searchParams.filters = filters;
      if (facetFilters) searchParams.facetFilters = facetFilters;
      if (attributesToRetrieve)
        searchParams.attributesToRetrieve = attributesToRetrieve;

      const result = await searchAlgolia(c, query, searchParams);

      return c.json({
        success: true,
        data: {
          hits: result.hits,
          nbHits: result.nbHits,
          page: result.page,
          nbPages: result.nbPages,
          hitsPerPage: result.hitsPerPage,
          processingTimeMS: result.processingTimeMS,
          query: result.query,
          params: result.params,
        },
      });
    } catch (error) {
      console.error("Search error:", describeAlgoliaError(error));
      return c.json(
        {
          success: false,
          error: {
            message: "Search failed",
            details: `Algolia request failed (${String(describeAlgoliaError(error).status)})`,
          },
        },
        500,
      );
    }
  })
  .get(
    "/",
    searchRateLimit,
    zValidator("query", getSearchSchema),
    async (c) => {
      const {
        q: query,
        limit,
        filters,
        facetFilters,
        attributesToRetrieve,
      } = c.req.valid("query");

      try {
        const searchParams: any = {
          hitsPerPage: limit,
          highlightPreTag: "<mark>",
          highlightPostTag: "</mark>",
        };

        const parsedFacetFilters = facetFilters
          ?.split(",")
          .map((item) => item.trim());
        const parsedAttributes = attributesToRetrieve
          ?.split(",")
          .map((item) => item.trim());
        if (
          (parsedFacetFilters && !validateFacetFilters(parsedFacetFilters)) ||
          (parsedAttributes && !validateAttributes(parsedAttributes))
        ) {
          return c.json(
            {
              success: false,
              error: { message: "Invalid search parameters" },
            },
            400,
          );
        }

        if (filters) searchParams.filters = filters;
        if (parsedFacetFilters) searchParams.facetFilters = parsedFacetFilters;
        if (parsedAttributes)
          searchParams.attributesToRetrieve = parsedAttributes;

        const result = await searchAlgolia(c, query, searchParams);

        return c.json({
          success: true,
          data: {
            hits: result.hits,
            nbHits: result.nbHits,
            page: result.page,
            nbPages: result.nbPages,
            hitsPerPage: result.hitsPerPage,
            processingTimeMS: result.processingTimeMS,
            query: result.query,
          },
        });
      } catch (error) {
        console.error("Search error:", describeAlgoliaError(error));
        return c.json(
          {
            success: false,
            error: {
              message: "Search failed",
              details: `Algolia request failed (${String(describeAlgoliaError(error).status)})`,
            },
          },
          500,
        );
      }
    },
  )
  .route("/chunk", searchChunk)
  .route("/fallback", fallbackSearch)
  .get("/info", (c) => {
    return c.json({
      name: "CourseWeb Search API",
      description: "Full-text search API powered by Algolia for NTHU courses",
      version: "1.0.0",
      endpoints: {
        search: {
          post: {
            path: "/search",
            description: "Advanced search with JSON payload",
            parameters: {
              query: "string (required, max 200 characters) - Search query",
              limit:
                "number (optional, default: 10, max: 50) - Number of results",
              filters:
                "string (optional, max 500 characters, allowlisted attributes) - Algolia filters",
              facetFilters:
                "array (optional, max 20 entries of 120 characters each) - Allowlisted facet filters",
              attributesToRetrieve:
                "array (optional, max 50 allowlisted fields) - Specific attributes to retrieve",
              highlightPreTag:
                "string (optional, '<mark>' or '<em>') - HTML tag for highlighting",
              highlightPostTag:
                "string (optional, matching closing tag) - HTML closing tag for highlighting",
            },
          },
          get: {
            path: "/search?q=query",
            description: "Simple search with query parameters",
            parameters: {
              q: "string (required, max 200 characters) - Search query",
              limit:
                "number (optional, default: 10, max: 50) - Number of results",
              filters:
                "string (optional, max 500 characters, allowlisted attributes) - Algolia filters",
              facetFilters:
                "string (optional, up to 20 comma-separated entries of 120 characters each) - Facet filters",
              attributesToRetrieve:
                "string (optional, allowlisted comma-separated fields) - Attributes to retrieve",
            },
          },
        },
        info: {
          get: {
            path: "/search/info",
            description: "API information and usage",
          },
        },
      },
      examples: {
        simpleSearch: "GET /search?q=machine%20learning&limit=5",
        advancedSearch: {
          method: "POST",
          path: "/search",
          body: {
            query: "machine learning",
            limit: 10,
            filters: "department:'Computer Science'",
            facetFilters: ["language:English"],
            attributesToRetrieve: [
              "course",
              "name_zh",
              "name_en",
              "teacher_zh",
              "credits",
            ],
          },
        },
      },
    });
  });

export default app;
