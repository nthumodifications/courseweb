import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { createAuthTestEnvironment } from "./test-auth";
import { createPrismaClientMock } from "./test-helpers/module-mocks";

const findMany = mock(async () => []);
const findFirst = mock(async () => null);

mock.module("./prisma/client", () =>
  createPrismaClientMock(async () => ({
    sharedTimetable: { findMany, findFirst },
    savedTimetable: { findMany },
    timetableGroup: { findMany },
  })),
);

const { default: timetableShare } = await import("./timetable-share");

const authEnvironment = createAuthTestEnvironment(
  () =>
    mock(async () =>
      Response.json({ active: true, username: "user-1", scope: "calendar" }),
    ) as unknown as typeof fetch,
);

beforeEach(authEnvironment.setup);
afterEach(authEnvironment.restore);

describe("authenticated timetable-share list bounds", () => {
  it.each(["/", "/saved", "/groups"])(
    "does not cap the complete %s list returned by HEAD",
    async (path) => {
      findMany.mockClear();

      const response = await timetableShare.request(
        path,
        { headers: { Authorization: "Bearer calendar-token" } },
        { DB: {} },
      );

      expect(response.status).toBe(200);
      expect(findMany).toHaveBeenCalled();
      expect(findMany.mock.calls[0]?.[0]).not.toHaveProperty("take");
    },
  );

  it("returns all saved rows instead of the first 100", async () => {
    const savedRows = Array.from({ length: 101 }, (_, index) => ({
      id: `saved-${index}`,
      viewerId: "user-1",
      sharedTimetableId: `share-${index}`,
      label: null,
      syncMode: "live",
      savedCourses: null,
      addedAt: new Date(index).toISOString(),
      lastSeenAt: new Date(index).toISOString(),
    }));
    findMany.mockResolvedValueOnce(savedRows as never);
    findFirst.mockClear();

    const response = await timetableShare.request(
      "/saved",
      { headers: { Authorization: "Bearer calendar-token" } },
      { DB: {} },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toHaveLength(101);
  });

  it("returns a member group beyond the newest 1,000 rows", async () => {
    const groups = Array.from({ length: 1_001 }, (_, index) => ({
      id: `group-${index}`,
      name: `Group ${index}`,
      inviteCode: `code-${index}`,
      semester: "11510",
      createdBy: "other-user",
      members: JSON.stringify([
        { userId: index === 1_000 ? "user-1" : "other-user" },
      ]),
      createdAt: new Date(index).toISOString(),
      updatedAt: new Date(index).toISOString(),
    }));
    findMany.mockResolvedValueOnce(groups as never);

    const response = await timetableShare.request(
      "/groups",
      { headers: { Authorization: "Bearer calendar-token" } },
      { DB: {} },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toHaveLength(1);
  });

  it("preserves the web gallery pagination request", async () => {
    findMany.mockClear();

    const response = await timetableShare.request(
      "/public?limit=24&offset=24",
      {},
      { DB: {} },
    );

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 25, skip: 24 }),
    );
  });
});
