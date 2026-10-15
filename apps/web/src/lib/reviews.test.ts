import { afterEach, describe, expect, test } from "bun:test";
import {
  createReview,
  deleteReview,
  listReviews,
  reportReview,
  reviewSummaryHasAverages,
  updateReview,
} from "@/lib/reviews";

const originalFetch = globalThis.fetch;

const reviewsOrigin = () =>
  import.meta.env.VITE_NTHUMODS_AUTH_URL || "https://auth.nthumods.com";

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("lists by module without an Authorization header when signed out", async () => {
  let request: Request | undefined;
  globalThis.fetch = (async (input, init) => {
    request = new Request(input, init);
    return response({
      reviews: [],
      summary: { count: 0, workload: null, grading: null, learning: null },
    });
  }) as typeof fetch;

  await listReviews({ moduleKey: "CS:2104" });

  expect(request?.url).toBe(
    `${reviewsOrigin()}/api/reviews?moduleKey=CS%3A2104`,
  );
  expect(request?.headers.has("Authorization")).toBe(false);
});

test("authenticated mutations use the contract paths and bearer token", async () => {
  const requests: Request[] = [];
  globalThis.fetch = (async (input, init) => {
    requests.push(new Request(input, init));
    return response({ review: {} });
  }) as typeof fetch;
  const values = {
    moduleKey: "CS:2104",
    instructor: "林教授",
    semester: "11310",
    workload: 3 as const,
    grading: 4 as const,
    learning: 5 as const,
    attendance: "none" as const,
    examStyle: ["written"] as const,
    body: "This is a sufficiently long review body for the contract.",
  };

  await createReview(values, "live-token");
  await updateReview("review/1", { body: values.body }, "live-token");
  await deleteReview("review/1", "live-token");
  await reportReview("review/2", { reason: "spam" }, "live-token");

  expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual(
    [
      `POST ${reviewsOrigin()}/api/reviews`,
      `PATCH ${reviewsOrigin()}/api/reviews/review%2F1`,
      `DELETE ${reviewsOrigin()}/api/reviews/review%2F1`,
      `POST ${reviewsOrigin()}/api/reviews/review%2F2/report`,
    ],
  );
  expect(
    requests.every(
      (request) => request.headers.get("Authorization") === "Bearer live-token",
    ),
  ).toBe(true);
});

test("summary averages are only considered available when all are non-null", () => {
  expect(
    reviewSummaryHasAverages({
      count: 2,
      workload: null,
      grading: null,
      learning: null,
    }),
  ).toBe(false);
  expect(
    reviewSummaryHasAverages({
      count: 3,
      workload: 3.2,
      grading: 4,
      learning: 4.5,
    }),
  ).toBe(true);
});
