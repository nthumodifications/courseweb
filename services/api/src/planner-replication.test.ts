import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { createAuthTestEnvironment } from "./test-auth";
import { createPrismaClientMock } from "./test-helpers/module-mocks";

const findMany = mock(async () => []);

mock.module("./prisma/client", () =>
  createPrismaClientMock(async () => ({
    folder: { findMany },
    item: { findMany },
    plannerData: { findMany },
    semester: { findMany },
  })),
);

const { default: planner } = await import("./planner-replication");

const requestEnv = { DB: {} };
const authEnvironment = createAuthTestEnvironment(
  () =>
    mock(async () =>
      Response.json({ active: true, username: "user-1", scope: "planner" }),
    ) as unknown as typeof fetch,
);

beforeEach(authEnvironment.setup);
afterEach(authEnvironment.restore);

const authHeaders = { Authorization: "Bearer planner-token" };

describe("planner replication request bounds", () => {
  it.each([
    ["folders", "id"],
    ["items", "uuid"],
    ["plannerdata", "id"],
    ["semesters", "id"],
  ])("preserves the empty initial %s pull", async (model, idField) => {
    const response = await planner.request(
      `/${model}/pull?${idField}=&serverTimestamp=&batchSize=10`,
      { headers: authHeaders },
      requestEnv,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      checkpoint: null,
      documents: [],
    });
  });

  it("rejects an oversized pull batch before touching D1", async () => {
    const response = await planner.request(
      "/folders/pull?id=folder-1&serverTimestamp=2026-01-01T00%3A00%3A00.000Z&batchSize=1000000",
      { headers: authHeaders },
      requestEnv,
    );

    expect(response.status).toBe(400);
  });

  it("rejects an oversized push array before touching D1", async () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      newDocumentState: { id: `folder-${index}`, _deleted: false },
    }));
    const response = await planner.request(
      "/folders/push",
      {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      },
      requestEnv,
    );

    expect(response.status).toBe(400);
  });
});
