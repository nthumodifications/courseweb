import { describe, expect, it } from "bun:test";
import search from "./search";

const postSearch = (body: Record<string, unknown>) =>
  search.request("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("search input controls", () => {
  it("rejects queries longer than 200 characters", async () => {
    const response = await postSearch({ query: "x".repeat(201) });

    expect(response.status).toBe(400);
  });

  it("rejects attributes outside the course projection", async () => {
    const response = await postSearch({
      query: "machine learning",
      attributesToRetrieve: ["service_role_key"],
    });

    expect(response.status).toBe(400);
  });

  it("accepts the two supported highlight pairs only", async () => {
    const response = await postSearch({
      query: "machine learning",
      highlightPreTag: "<strong>",
      highlightPostTag: "</strong>",
    });

    expect(response.status).toBe(400);
  });

  it("rejects unknown filter and facet attributes", async () => {
    const filterResponse = await postSearch({
      query: "machine learning",
      filters: "secret_field:exposed",
    });
    const facetResponse = await postSearch({
      query: "machine learning",
      facetFilters: ["secret_field:exposed"],
    });

    expect(filterResponse.status).toBe(400);
    expect(facetResponse.status).toBe(400);
  });

  it("bounds filters, facet filters, and result limits", async () => {
    const longFilter = await postSearch({
      query: "machine learning",
      filters: "department:CS".repeat(40),
    });
    const tooManyFacets = await postSearch({
      query: "machine learning",
      facetFilters: Array.from({ length: 21 }, () => "department:CS"),
    });
    const tooManyResults = await postSearch({
      query: "machine learning",
      limit: 51,
    });

    expect(longFilter.status).toBe(400);
    expect(tooManyFacets.status).toBe(400);
    expect(tooManyResults.status).toBe(400);
  });

  it("applies the same allowlist to GET parameters", async () => {
    const response = await search.request(
      "/?q=machine%20learning&attributesToRetrieve=unknown_field",
    );

    expect(response.status).toBe(400);
  });
});
