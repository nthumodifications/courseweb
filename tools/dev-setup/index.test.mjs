import { describe, expect, test } from "bun:test";
import {
  compareVersions,
  parseArgs,
  parseBunRequirement,
  setupCommands,
  setupCopies,
} from "./index.mjs";

describe("dev setup pure helpers", () => {
  test("parses the pinned Bun version", () => {
    expect(parseBunRequirement("bun@1.3.11")).toBe("1.3.11");
    expect(parseBunRequirement("npm@10.0.0")).toBeUndefined();
  });

  test("compares semantic versions numerically", () => {
    expect(compareVersions("1.3.11", "1.3.11")).toBe(0);
    expect(compareVersions("1.3.4", "1.3.11")).toBeLessThan(0);
    expect(compareVersions("1.4.0", "1.3.11")).toBeGreaterThan(0);
  });

  test("parses setup modes", () => {
    expect(parseArgs(["--full", "--dry-run"])).toEqual({
      doctor: false,
      dryRun: true,
      full: true,
      help: false,
    });
  });

  test("does not prepare backend files for frontend-only setup", () => {
    expect(setupCopies()).toEqual([
      ["apps/web/.env.example", "apps/web/.env.development.local"],
    ]);
    expect(setupCommands()).toEqual([
      ["run", "--cwd", "packages/shared", "build"],
      ["run", "--cwd", "packages/ui", "build"],
    ]);
  });

  test("adds backend files and build prerequisites for full setup", () => {
    expect(setupCopies({ full: true })).toHaveLength(4);
    expect(setupCommands({ full: true }).at(-1)).toEqual([
      "run",
      "build:api-types",
    ]);
  });
});
