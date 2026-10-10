import { afterEach, describe, expect, mock, test } from "bun:test";
import { Database } from "bun:sqlite";
import { encode as encodeBig5 } from "iconv-lite";
import type {
  D1Database,
  D1PreparedStatement,
  RateLimit,
} from "@cloudflare/workers-types";

import app, {
  fetchSemesterOptions,
  fetchSemesterPage,
  parseSemesterOptions,
  parseSemesterPage,
  refreshSemester,
} from "./contribute-grades";

const originalFetch = globalThis.fetch;
const originalError = console.error;
const originalLog = console.log;

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.error = originalError;
  console.log = originalLog;
});

const fixture = async (name: string) =>
  new TextDecoder("big5").decode(
    await Bun.file(
      new URL(`./fixtures/ccxp/${name}`, import.meta.url),
    ).arrayBuffer(),
  );

const fixtureResponse = async (name: string) =>
  new Response(
    await Bun.file(
      new URL(`./fixtures/ccxp/${name}`, import.meta.url),
    ).arrayBuffer(),
  );

const limiter = {
  limit: async () => ({ success: true }),
} as unknown as RateLimit;

const emptyDatabase = () => {
  const statement = {
    bind() {
      return statement;
    },
    first: async () => null,
    all: async () => ({ results: [] }),
    run: async () => ({ success: true, meta: {} }),
  };
  return {
    prepare: () => statement,
    batch: async () => [],
  } as unknown as D1Database;
};

type TestStatement = D1PreparedStatement & {
  execute: (mode: "first" | "all" | "run") => unknown;
  boundParameterCount: number;
};

class SQLiteD1 {
  readonly sqlite = new Database(":memory:");
  readonly batchStatementCounts: number[] = [];
  readonly boundParameterCounts: number[] = [];
  queryCount = 0;
  beforeBatch?: (call: number) => Promise<void>;

  constructor() {
    this.sqlite.run(`
      CREATE TABLE "CourseStatistic" (
        "rawId" TEXT NOT NULL PRIMARY KEY,
        "courseCode" TEXT NOT NULL,
        "semester" TEXT NOT NULL,
        "enrollment" INTEGER NOT NULL,
        "scale" TEXT NOT NULL,
        "average" REAL NOT NULL,
        "stdDev" REAL NOT NULL,
        "updatedAt" DATETIME NOT NULL
      );
      CREATE INDEX "CourseStatistic_courseCode_idx"
        ON "CourseStatistic"("courseCode");
      CREATE INDEX "CourseStatistic_semester_idx"
        ON "CourseStatistic"("semester");
      CREATE TABLE "CourseStatisticSemester" (
        "semester" TEXT NOT NULL PRIMARY KEY,
        "contentHash" TEXT NOT NULL,
        "courseCount" INTEGER NOT NULL,
        "updatedAt" DATETIME NOT NULL
      );
      CREATE INDEX "CourseStatisticSemester_updatedAt_idx"
        ON "CourseStatisticSemester"("updatedAt");
    `);
  }

  prepare(sql: string) {
    let values: unknown[] = [];
    const execute = (mode: "first" | "all" | "run") => {
      const parameterCount = values.length;
      if (parameterCount > 100) {
        throw new Error(`too many bound parameters: ${parameterCount}`);
      }
      if (new TextEncoder().encode(sql).byteLength > 100_000) {
        throw new Error("statement is too large");
      }
      if (this.queryCount >= 1_000) {
        throw new Error("too many D1 queries");
      }
      this.boundParameterCounts.push(parameterCount);
      this.queryCount += 1;
      const query = this.sqlite.query(sql);
      if (mode === "first") return query.get(...values) ?? null;
      if (mode === "all") return { results: query.all(...values) };
      const result = query.run(...values);
      return { success: true, meta: { changes: result.changes } };
    };
    const statement = {
      bind: (...bound: unknown[]) => {
        values = bound;
        return statement;
      },
      first: async <T>() => execute("first") as T | null,
      all: async <T>() => execute("all") as { results: T[] },
      run: async () => execute("run"),
      execute: (mode: "first" | "all" | "run") => execute(mode),
      boundParameterCount: 0,
    } as TestStatement;
    Object.defineProperty(statement, "boundParameterCount", {
      get: () => values.length,
    });
    return statement;
  }

  async batch(statements: D1PreparedStatement[]) {
    this.batchStatementCounts.push(statements.length);
    await this.beforeBatch?.(this.batchStatementCounts.length);
    const transaction = this.sqlite.transaction(() =>
      statements.map((statement) =>
        (statement as TestStatement).execute("run"),
      ),
    );
    return transaction();
  }

  close() {
    this.sqlite.close();
  }
}

const asD1 = (database: SQLiteD1) => database as unknown as D1Database;

const resultResponse = (rows: number, semester = "114|30") => {
  const compact = semester.replace("|", "");
  const body = [
    "<html><body>",
    `<p>共 ${rows} 科目</p>`,
    `<table><tr>${Array.from({ length: 6 }, () => "<th>科號 Course No.</th>").join("")}</tr>`,
    ...Array.from({ length: rows }, (_, index) => {
      const rawId = `${compact}${String(index).padStart(8, "0")}`;
      return `<tr><td>${rawId}</td><td>Course ${index}</td><td>Teacher</td><td>10</td><td>3</td><td>1</td><td></td><td></td></tr>`;
    }),
    "</table>",
    "</body></html>",
  ].join("");
  return new Response(encodeBig5(body, "big5"));
};

const setResultFetch = (...responses: Response[]) => {
  const queue = [...responses];
  globalThis.fetch = mock(
    async () => queue.shift()!,
  ) as unknown as typeof fetch;
};

const request = (body: Record<string, string>, database = emptyDatabase()) =>
  app.fetch(
    new Request("https://api.example.test/grades", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    }),
    {
      DB: database,
      CONTRIBUTE_RATE_LIMITER: limiter,
    },
  );

describe("course statistics parser", () => {
  test("reads all semester options from the form", async () => {
    const options = parseSemesterOptions(await fixture("JH84201.html"));

    expect(options.map(({ value }) => value)).toEqual([
      "115|10",
      "114|30",
      "114|20",
      "114|10",
    ]);
  });

  test("reads both scales, empty alternate cells, and multiple teachers", async () => {
    const result = parseSemesterPage(
      await fixture("JH84202_114_30.html"),
      "114|30",
    );

    expect(result.expectedCount).toBe(15);
    expect(result.rows).toHaveLength(15);
    expect(result.rows[0]).toMatchObject({ scale: "percent", average: 85.59 });
    expect(result.rows[2]).toMatchObject({
      scale: "gpa",
      average: 3,
      stdDev: 1.08,
    });
    expect(result.rows.at(-1)).toMatchObject({
      rawId: "11430EECS205000",
      scale: "gpa",
    });
  });

  test("accepts the valid no-data page", async () => {
    expect(
      parseSemesterPage(await fixture("JH84202_115_10.html"), "115|10"),
    ).toEqual({ expectedCount: 0, rows: [] });
  });

  test("rejects malformed pages", () => {
    expect(() =>
      parseSemesterPage("<html><body>not a result</body></html>", "114|30"),
    ).toThrow("school_response_invalid");
  });
});

describe("course statistics upstream requests", () => {
  test("uses one fixed GET and one fixed form POST", async () => {
    const responses = [
      await fixtureResponse("JH84201.html"),
      await fixtureResponse("JH84202_114_30.html"),
    ];
    const calls: Array<{ input: string; init?: RequestInit }> = [];
    globalThis.fetch = mock(async (input, init) => {
      calls.push({ input: String(input), init });
      return responses.shift()!;
    }) as unknown as typeof fetch;

    await fetchSemesterOptions("a".repeat(24));
    await fetchSemesterPage("a".repeat(24), "114|30");

    expect(calls).toHaveLength(2);
    expect(calls[0].input).toBe(
      "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/8/8.4/8.4.2/JH84201.php?ACIXSTORE=" +
        "a".repeat(24),
    );
    expect(calls[0].init?.method).toBe("GET");
    expect(calls[1].input).toBe(
      "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/8/8.4/8.4.2/JH84202.php",
    );
    expect(calls[1].init?.method).toBe("POST");
    expect(calls[1].init?.body).toContain("qyt=114%7C30");
    expect(calls[1].init?.body).toContain("kwc=");
    expect(calls[1].init?.body).toContain("kwt=");
    expect(calls[1].init?.body).toContain("sort=ckey");
  });
});

describe("course statistics contribution security", () => {
  test("returns a typed session error without logging or echoing the value", async () => {
    const session = "s".repeat(24);
    const logs: string[] = [];
    console.error = (...args) => logs.push(args.join(" "));
    console.log = (...args) => logs.push(args.join(" "));
    let requestCount = 0;
    globalThis.fetch = mock(async () => {
      requestCount += 1;
      return new Response("session is interrupted!");
    }) as unknown as typeof fetch;

    const response = await request({ ACIXSTORE: session, semester: "114|30" });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "session_expired" });
    expect(requestCount).toBe(1);
    expect(logs.join(" ")).not.toContain(session);
  });

  test("rejects a value that cannot be used as a CCXP session", async () => {
    let requestCount = 0;
    globalThis.fetch = mock(async () => {
      requestCount += 1;
      return new Response();
    }) as unknown as typeof fetch;

    const response = await request({ ACIXSTORE: "https://attacker.example" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_session" });
    expect(requestCount).toBe(0);
  });
});

describe("course statistics persistence", () => {
  test("successfully writes rows and keeps every statement under the D1 parameter limit", async () => {
    const database = new SQLiteD1();
    try {
      setResultFetch(await fixtureResponse("JH84202_114_30.html"));

      const result = await refreshSemester(
        asD1(database),
        "s".repeat(24),
        "114|30",
        new Date("2026-01-01T00:00:00.000Z"),
      );

      expect(result).toEqual({
        status: "saved",
        semester: "11430",
        savedCourses: 15,
      });
      expect(database.boundParameterCounts).toHaveLength(5);
      expect(Math.max(...database.boundParameterCounts)).toBeLessThanOrEqual(
        100,
      );
      expect(
        database.sqlite
          .query('SELECT COUNT(*) AS "count" FROM "CourseStatistic"')
          .get(),
      ).toEqual({ count: 15 });
    } finally {
      database.close();
    }
  });

  test("skips course writes when the page hash is unchanged", async () => {
    const database = new SQLiteD1();
    try {
      setResultFetch(
        await fixtureResponse("JH84202_114_30.html"),
        await fixtureResponse("JH84202_114_30.html"),
      );

      await refreshSemester(
        asD1(database),
        "s".repeat(24),
        "114|30",
        new Date("2026-01-01T00:00:00.000Z"),
      );
      const result = await refreshSemester(
        asD1(database),
        "s".repeat(24),
        "114|30",
        new Date("2026-01-01T07:00:00.000Z"),
      );

      expect(result.status).toBe("already_up_to_date");
      expect(database.batchStatementCounts).toEqual([4, 1]);
      expect(
        database.sqlite
          .query('SELECT COUNT(*) AS "count" FROM "CourseStatistic"')
          .get(),
      ).toEqual({ count: 15 });
    } finally {
      database.close();
    }
  });

  test("uses the six-hour cooldown without an upstream call", async () => {
    const database = new SQLiteD1();
    try {
      setResultFetch(await fixtureResponse("JH84202_114_30.html"));
      await refreshSemester(
        asD1(database),
        "s".repeat(24),
        "114|30",
        new Date("2026-01-01T00:00:00.000Z"),
      );

      let upstreamCalls = 0;
      globalThis.fetch = mock(async () => {
        upstreamCalls += 1;
        throw new Error("upstream should not be called");
      }) as unknown as typeof fetch;
      const result = await refreshSemester(
        asD1(database),
        "s".repeat(24),
        "114|30",
        new Date("2026-01-01T05:59:59.000Z"),
      );

      expect(result).toMatchObject({ status: "already_up_to_date" });
      expect(upstreamCalls).toBe(0);
    } finally {
      database.close();
    }
  });

  test("does not delete existing rows when a refresh page is empty", async () => {
    const database = new SQLiteD1();
    try {
      setResultFetch(
        await fixtureResponse("JH84202_114_30.html"),
        await fixtureResponse("JH84202_115_10.html"),
      );
      await refreshSemester(
        asD1(database),
        "s".repeat(24),
        "114|30",
        new Date("2026-01-01T00:00:00.000Z"),
      );
      const result = await refreshSemester(
        asD1(database),
        "s".repeat(24),
        "114|30",
        new Date("2026-01-01T07:00:00.000Z"),
      );

      expect(result).toEqual({
        status: "no_data",
        semester: "11430",
        savedCourses: 15,
      });
      expect(database.batchStatementCounts).toEqual([4]);
      expect(
        database.sqlite
          .query(
            'SELECT COUNT(*) AS "count" FROM "CourseStatistic" WHERE "semester" = "11430"',
          )
          .get(),
      ).toEqual({ count: 15 });
    } finally {
      database.close();
    }
  });

  test("lets the winner of concurrent refreshes discard the loser's stale result", async () => {
    const database = new SQLiteD1();
    let firstBatchStarted!: () => void;
    const firstBatchReady = new Promise<void>((resolve) => {
      firstBatchStarted = resolve;
    });
    let releaseFirstBatch!: () => void;
    const release = new Promise<void>((resolve) => {
      releaseFirstBatch = resolve;
    });
    try {
      setResultFetch(resultResponse(14));
      await refreshSemester(
        asD1(database),
        "s".repeat(24),
        "114|30",
        new Date("2025-12-31T00:00:00.000Z"),
      );
      database.batchStatementCounts.length = 0;
      database.boundParameterCounts.length = 0;
      database.queryCount = 0;
      database.beforeBatch = async (call) => {
        if (call === 1) {
          firstBatchStarted();
          await release;
        }
      };
      setResultFetch(resultResponse(15), resultResponse(16));
      const older = refreshSemester(
        asD1(database),
        "s".repeat(24),
        "114|30",
        new Date("2026-01-01T00:00:00.000Z"),
      );
      await firstBatchReady;
      const newer = refreshSemester(
        asD1(database),
        "s".repeat(24),
        "114|30",
        new Date("2026-01-01T01:00:00.000Z"),
      );

      await expect(newer).resolves.toMatchObject({
        status: "saved",
        savedCourses: 16,
      });
      releaseFirstBatch();
      await expect(older).resolves.toMatchObject({
        status: "already_up_to_date",
        savedCourses: 16,
      });
      expect(
        database.sqlite
          .query('SELECT COUNT(*) AS "count" FROM "CourseStatistic"')
          .get(),
      ).toEqual({ count: 16 });
      expect(
        database.sqlite
          .query(
            'SELECT "courseCount" FROM "CourseStatisticSemester" WHERE "semester" = "11430"',
          )
          .get(),
      ).toEqual({ courseCount: 16 });
    } finally {
      releaseFirstBatch();
      database.close();
    }
  });

  test("persists a full-size semester within the paid-plan D1 query and statement limits", async () => {
    const database = new SQLiteD1();
    try {
      setResultFetch(resultResponse(2_900));
      const result = await refreshSemester(
        asD1(database),
        "s".repeat(24),
        "114|30",
        new Date("2026-01-01T00:00:00.000Z"),
      );

      expect(result).toMatchObject({ status: "saved", savedCourses: 2_900 });
      expect(database.batchStatementCounts).toEqual([244]);
      expect(database.queryCount).toBe(245);
      expect(Math.max(...database.boundParameterCounts)).toBeLessThanOrEqual(
        100,
      );
      expect(
        database.sqlite
          .query('SELECT COUNT(*) AS "count" FROM "CourseStatistic"')
          .get(),
      ).toEqual({ count: 2_900 });
    } finally {
      database.close();
    }
  });
});

describe("course statistics routes", () => {
  test("returns a successful write from the public contribution route", async () => {
    const database = new SQLiteD1();
    try {
      setResultFetch(await fixtureResponse("JH84202_114_30.html"));
      const response = await request(
        { ACIXSTORE: "s".repeat(24), semester: "114|30" },
        asD1(database),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        status: "saved",
        savedCourses: 15,
      });
    } finally {
      database.close();
    }
  });

  test("returns public statistics with a five-minute cache header", async () => {
    const database = new SQLiteD1();
    try {
      database.sqlite.run(
        `INSERT INTO "CourseStatistic"
          ("rawId", "courseCode", "semester", "enrollment", "scale", "average", "stdDev", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        "11430EECS205000",
        "EECS205000",
        "11430",
        10,
        "gpa",
        3,
        1,
        "2026-01-01T00:00:00.000Z",
      );
      const response = await app.fetch(
        new Request("https://api.example.test/grades/EECS205000"),
        { DB: asD1(database), CONTRIBUTE_RATE_LIMITER: limiter },
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
      expect(await response.json()).toMatchObject({
        courseCode: "EECS205000",
        statistics: [{ semester: "11430" }],
      });
    } finally {
      database.close();
    }
  });
});
