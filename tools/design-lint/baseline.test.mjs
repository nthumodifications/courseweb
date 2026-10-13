import fs from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  compareBaseline,
  formatStaleBaseline,
  SHRINK_BASELINE_COMMAND,
} from "./baseline.mjs";

const cliPath = fileURLToPath(new URL("./index.mjs", import.meta.url));
const fixtureFile = "apps/web/src/fixture.tsx";

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-lint-cli-"));
  fs.mkdirSync(path.join(root, "apps", "web", "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages", "ui", "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, fixtureFile),
    'export const Fixture = () => <div className="p-5">fixture</div>;\n',
  );
  return root;
}

function writeBaseline(root, files) {
  const baselinePath = path.join(root, "baseline.json");
  fs.writeFileSync(
    baselinePath,
    `${JSON.stringify(
      { version: 1, rules: { "spacing-vocab": { files } } },
      null,
      2,
    )}\n`,
  );
  return baselinePath;
}

function runCli(root, baselinePath, args = []) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      DESIGN_LINT_ROOT: root,
      DESIGN_LINT_BASELINE: baselinePath,
    },
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    output: `${result.stdout}${result.stderr}`,
  };
}

function withFixture(callback) {
  const root = createFixture();
  try {
    return callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("CLI exits 0 for a clean baseline", () => {
  withFixture((root) => {
    const baselinePath = writeBaseline(root, { [fixtureFile]: 1 });
    const result = runCli(root, baselinePath);

    assert.equal(result.status, 0);
    assert.match(result.output, /No new design-lint violations\./);
  });
});

test("CLI exits 1 for a new finding", () => {
  withFixture((root) => {
    const baselinePath = writeBaseline(root, { [fixtureFile]: 0 });
    const result = runCli(root, baselinePath);

    assert.equal(result.status, 1);
    assert.match(result.output, /New design-lint violations:/);
    assert.doesNotMatch(result.output, /No new design-lint violations\./);
  });
});

test("CLI exits 1 when a baseline count is too high", () => {
  withFixture((root) => {
    const baselinePath = writeBaseline(root, { [fixtureFile]: 2 });
    const result = runCli(root, baselinePath);

    assert.equal(result.status, 1);
    assert.match(result.output, /Stale design-lint baseline entries/);
    assert.match(result.output, /bun run design-lint --write-baseline/);
    assert.doesNotMatch(result.output, /No new design-lint violations\./);
  });
});

test("CLI exits 1 when a baseline names a deleted file", () => {
  withFixture((root) => {
    const deletedFile = "apps/web/src/deleted.tsx";
    fs.rmSync(path.join(root, fixtureFile));
    const baselinePath = writeBaseline(root, { [deletedFile]: 1 });
    const result = runCli(root, baselinePath);

    assert.equal(result.status, 1);
    assert.match(result.output, /Stale design-lint baseline entries/);
    assert.match(result.output, /bun run design-lint --write-baseline/);
    assert.match(result.output, /file no longer exists/);
    assert.doesNotMatch(result.output, /No new design-lint violations\./);
  });
});

test("CLI reports stale and excess entries together", () => {
  withFixture((root) => {
    const deletedFile = "apps/web/src/deleted.tsx";
    const baselinePath = writeBaseline(root, {
      [fixtureFile]: 0,
      [deletedFile]: 1,
    });
    const result = runCli(root, baselinePath);

    assert.equal(result.status, 1);
    assert.match(result.output, /Stale design-lint baseline entries/);
    assert.match(result.output, /New design-lint violations:/);
    assert.doesNotMatch(result.output, /No new design-lint violations\./);
  });
});

test("CLI writes a baseline and then passes a clean run", () => {
  withFixture((root) => {
    const baselinePath = writeBaseline(root, {});
    const writeResult = runCli(root, baselinePath, ["--write-baseline"]);
    const cleanResult = runCli(root, baselinePath);

    assert.equal(writeResult.status, 0);
    assert.equal(cleanResult.status, 0);
    assert.match(cleanResult.output, /No new design-lint violations\./);
  });
});

const baseline = (count) => ({
  rules: { "spacing-vocab": { files: { "src/example.tsx": count } } },
});

test("a new finding fails the baseline comparison", () => {
  const result = compareBaseline({
    violations: { "spacing-vocab": { "src/example.tsx": 2 } },
    baseline: baseline(1),
    existingFiles: new Set(["src/example.tsx"]),
  });

  assert.deepEqual(result.excess, [
    { ruleName: "spacing-vocab", file: "src/example.tsx", actual: 2, allowed: 1 },
  ]);
  assert.deepEqual(result.stale, []);
});

test("an equal finding count passes", () => {
  const result = compareBaseline({
    violations: { "spacing-vocab": { "src/example.tsx": 1 } },
    baseline: baseline(1),
    existingFiles: new Set(["src/example.tsx"]),
  });

  assert.deepEqual(result, { excess: [], stale: [] });
});

test("fewer findings fails and identifies the shrink command", () => {
  const result = compareBaseline({
    violations: { "spacing-vocab": { "src/example.tsx": 0 } },
    baseline: baseline(1),
    existingFiles: new Set(["src/example.tsx"]),
  });

  assert.deepEqual(result.excess, []);
  assert.deepEqual(result.stale, [
    {
      ruleName: "spacing-vocab",
      file: "src/example.tsx",
      recorded: 1,
      actual: 0,
      deleted: false,
    },
  ]);
  assert.match(formatStaleBaseline(result.stale).join("\n"), /bun run design-lint --write-baseline/);
  assert.match(formatStaleBaseline(result.stale).join("\n"), /now has 0 finding\(s\)/);
});

test("a deleted file fails and identifies the shrink command", () => {
  const result = compareBaseline({
    violations: {},
    baseline: baseline(1),
    existingFiles: new Set(),
  });

  assert.deepEqual(result.excess, []);
  assert.deepEqual(result.stale, [
    {
      ruleName: "spacing-vocab",
      file: "src/example.tsx",
      recorded: 1,
      actual: 0,
      deleted: true,
    },
  ]);
  const message = formatStaleBaseline(result.stale).join("\n");
  assert.match(message, new RegExp(SHRINK_BASELINE_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(message, /file no longer exists/);
});
