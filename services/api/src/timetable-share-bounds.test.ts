import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { createAuthTestEnvironment } from "./test-auth";
import { createPrismaClientMock } from "./test-helpers/module-mocks";

const findMany = mock(async () => []);
const findFirst = mock(async () => null);
const findUnique = mock(async () => null);
const update = mock(async () => null);

mock.module("./prisma/client", () =>
  createPrismaClientMock(async () => ({
    sharedTimetable: { findMany, findFirst },
    savedTimetable: { findMany },
    timetableGroup: { findMany, findUnique, update },
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

const OWNER_STUDENT_ID = "111000001";
const OTHER_STUDENT_ID = "111000002";

const shareRow = (id: string, ownerId: string) => ({
  id,
  ownerId,
  displayName: "Anonymous timetable",
  semesters: JSON.stringify(["11510"]),
  courses: JSON.stringify({ "11510": ["11510CS 100100"] }),
  courseNotes: "{}",
  visibility: "public",
  isLive: false,
  isAnonymous: true,
  gradeContext: null,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  deletedAt: null,
});

const groupRow = () => ({
  id: "group-1",
  name: "Study group",
  inviteCode: "ABC234",
  semester: "11510",
  createdBy: "user-1",
  members: JSON.stringify([
    {
      userId: "user-1",
      sharedTimetableId: "share001",
      label: "Me",
      joinedAt: new Date(0).toISOString(),
    },
    {
      userId: OTHER_STUDENT_ID,
      sharedTimetableId: "share002",
      label: "Friend",
      joinedAt: new Date(0).toISOString(),
    },
  ]),
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
});

const authed = { headers: { Authorization: "Bearer calendar-token" } };

describe("timetable-share responses hide other people's student IDs", () => {
  it("omits the owner's student ID from the public gallery", async () => {
    findMany.mockResolvedValueOnce([
      shareRow("share001", OWNER_STUDENT_ID),
    ] as never);

    const response = await timetableShare.request("/public", {}, { DB: {} });
    const body = (await response.json()) as { items: unknown[] };

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).not.toHaveProperty("ownerId");
    expect(JSON.stringify(body)).not.toContain(OWNER_STUDENT_ID);
  });

  it("omits the owner's student ID from a shared timetable link", async () => {
    findFirst.mockResolvedValueOnce(
      shareRow("share001", OWNER_STUDENT_ID) as never,
    );

    const response = await timetableShare.request(
      "/view/share001",
      {},
      { DB: {} },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("id", "share001");
    expect(body).not.toHaveProperty("ownerId");
    expect(JSON.stringify(body)).not.toContain(OWNER_STUDENT_ID);
  });

  it("omits the owner's student ID from timetables saved by a viewer", async () => {
    findMany.mockResolvedValueOnce([
      {
        id: "saved-1",
        viewerId: "user-1",
        sharedTimetableId: "share001",
        label: null,
        syncMode: "live",
        savedCourses: null,
        addedAt: new Date(0).toISOString(),
        lastSeenAt: new Date(0).toISOString(),
      },
    ] as never);
    findFirst.mockResolvedValueOnce(
      shareRow("share001", OWNER_STUDENT_ID) as never,
    );

    const response = await timetableShare.request("/saved", authed, {
      DB: {},
    });
    const body = (await response.json()) as Array<{ share: unknown }>;

    expect(response.status).toBe(200);
    expect(body[0]?.share).toHaveProperty("id", "share001");
    expect(JSON.stringify(body)).not.toContain(OWNER_STUDENT_ID);
  });

  it("shows an anonymous visitor a group without any student IDs", async () => {
    findUnique.mockResolvedValueOnce(groupRow() as never);
    findFirst
      .mockResolvedValueOnce(shareRow("share001", "user-1") as never)
      .mockResolvedValueOnce(shareRow("share002", OTHER_STUDENT_ID) as never);

    const response = await timetableShare.request(
      "/group/ABC234",
      {},
      { DB: {} },
    );
    const body = (await response.json()) as {
      isCreator: boolean;
      members: Array<{ isSelf: boolean; sharedTimetableId: string }>;
    };

    expect(response.status).toBe(200);
    expect(body).not.toHaveProperty("createdBy");
    expect(body.isCreator).toBe(false);
    expect(body.members.map((member) => member.sharedTimetableId)).toEqual([
      "share001",
      "share002",
    ]);
    expect(body.members.map((member) => member.isSelf)).toEqual([false, false]);
    for (const member of body.members) {
      expect(member).not.toHaveProperty("userId");
    }
    expect(JSON.stringify(body)).not.toContain(OTHER_STUDENT_ID);
    expect(JSON.stringify(body)).not.toContain("user-1");
  });

  it("tells a signed-in member which group entry is theirs", async () => {
    findUnique.mockResolvedValueOnce(groupRow() as never);
    findFirst
      .mockResolvedValueOnce(shareRow("share001", "user-1") as never)
      .mockResolvedValueOnce(shareRow("share002", OTHER_STUDENT_ID) as never);

    const response = await timetableShare.request("/group/ABC234", authed, {
      DB: {},
    });
    const body = (await response.json()) as {
      isCreator: boolean;
      members: Array<{ isSelf: boolean }>;
    };

    expect(response.status).toBe(200);
    expect(body.isCreator).toBe(true);
    expect(body.members.map((member) => member.isSelf)).toEqual([true, false]);
    expect(JSON.stringify(body)).not.toContain(OTHER_STUDENT_ID);
  });

  it("omits other members' student IDs from a member's own group list", async () => {
    findMany.mockResolvedValueOnce([groupRow()] as never);

    const response = await timetableShare.request("/groups", authed, {
      DB: {},
    });
    const body = (await response.json()) as Array<{
      isCreator: boolean;
      members: Array<{ isSelf: boolean }>;
    }>;

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]?.isCreator).toBe(true);
    expect(body[0]?.members.map((member) => member.isSelf)).toEqual([
      true,
      false,
    ]);
    expect(JSON.stringify(body)).not.toContain(OTHER_STUDENT_ID);
  });

  it("omits other members' student IDs when someone leaves a group", async () => {
    findUnique.mockResolvedValueOnce(groupRow() as never);
    update.mockImplementationOnce((async (args: {
      data: { members: string };
    }) => ({ ...groupRow(), members: args.data.members })) as never);

    const response = await timetableShare.request(
      "/group/ABC234/leave",
      { ...authed, method: "DELETE" },
      { DB: {} },
    );
    const body = (await response.json()) as { members: unknown[] };

    expect(response.status).toBe(200);
    expect(body.members).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain(OTHER_STUDENT_ID);
  });
});
