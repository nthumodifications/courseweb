import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import algolia from "./config/algolia";

const app = new Hono()
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        query: z.string().min(1, "Search query is required"),
        limit: z.number().min(1).max(100).optional().default(10),
        filters: z.string().optional(),
        facetFilters: z.array(z.string()).optional(),
        attributesToRetrieve: z.array(z.string()).optional(),
        highlightPreTag: z.string().optional().default("<mark>"),
        highlightPostTag: z.string().optional().default("</mark>"),
      })
    ),
    async (c) => {
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
        const index = algolia(c);
        const searchParams: any = {
          hitsPerPage: limit,
          highlightPreTag,
          highlightPostTag,
        };

        if (filters) searchParams.filters = filters;
        if (facetFilters) searchParams.facetFilters = facetFilters;
        if (attributesToRetrieve) searchParams.attributesToRetrieve = attributesToRetrieve;

        const result = await index.search(query, searchParams);

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
        console.error("Search error:", error);
        return c.json(
          {
            success: false,
            error: {
              message: "Search failed",
              details: error instanceof Error ? error.message : "Unknown error",
            },
          },
          500
        );
      }
    }
  )
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        q: z.string().min(1, "Search query is required"),
        limit: z.coerce.number().min(1).max(100).optional().default(10),
        filters: z.string().optional(),
        facetFilters: z.string().optional(),
        attributesToRetrieve: z.string().optional(),
      })
    ),
    async (c) => {
      const { q: query, limit, filters, facetFilters, attributesToRetrieve } = c.req.valid("query");

      try {
        const index = algolia(c);
        const searchParams: any = {
          hitsPerPage: limit,
          highlightPreTag: "<mark>",
          highlightPostTag: "</mark>",
        };

        if (filters) searchParams.filters = filters;
        if (facetFilters) searchParams.facetFilters = facetFilters.split(",");
        if (attributesToRetrieve) searchParams.attributesToRetrieve = attributesToRetrieve.split(",");

        const result = await index.search(query, searchParams);

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
        console.error("Search error:", error);
        return c.json(
          {
            success: false,
            error: {
              message: "Search failed",
              details: error instanceof Error ? error.message : "Unknown error",
            },
          },
          500
        );
      }
    }
  )
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
              query: "string (required) - Search query",
              limit: "number (optional, default: 10, max: 100) - Number of results",
              filters: "string (optional) - Algolia filters",
              facetFilters: "array (optional) - Facet filters",
              attributesToRetrieve: "array (optional) - Specific attributes to retrieve",
              highlightPreTag: "string (optional, default: '<mark>') - HTML tag for highlighting",
              highlightPostTag: "string (optional, default: '</mark>') - HTML closing tag for highlighting",
            },
          },
          get: {
            path: "/search?q=query",
            description: "Simple search with query parameters",
            parameters: {
              q: "string (required) - Search query",
              limit: "number (optional, default: 10, max: 100) - Number of results",
              filters: "string (optional) - Algolia filters",
              facetFilters: "string (optional) - Comma-separated facet filters",
              attributesToRetrieve: "string (optional) - Comma-separated attributes to retrieve",
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
            attributesToRetrieve: ["course", "name_zh", "name_en", "teacher_zh", "credits"],
          },
        },
      },
    });
  });

export default app;