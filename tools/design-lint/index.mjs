import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const RULES = {
  "hardcoded-color": {
    description: "hardcoded gray/slate/zinc/neutral color utility",
    pattern:
      /(?:^|[\s"'`])(?:[\w-]+:)*(?:text|bg|border)-(?:gray|slate|zinc|neutral)-[\w/.[\]%-]+/g,
  },
  "dark-color": {
    description: "dark: color override",
    pattern:
      /(?:^|[\s"'`])dark:(?:[\w-]+:)*(?:text|bg|border|ring|divide|from|via|to|fill|stroke|decoration|accent|placeholder|caret|outline)-[\w/.[\]%-]+/g,
  },
  "large-type": {
    description: "type size above text-xl inside app pages",
    pattern:
      /(?:^|[\s"'`])(?:[\w-]+:)*text-(?:2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)(?=$|[\s"'`])/g,
  },
  "overlay-shadow": {
    description: "shadow-sm or shadow-md outside overlay components",
    pattern: /(?:^|[\s"'`])(?:[\w-]+:)*shadow-(?:sm|md)(?=$|[\s"'`])/g,
  },
};

// These are narrowly scoped data/overlay exceptions plus one admin-owned line
// outside this migration. Keep every entry tied to a file, line, and utility so
// a new violation still fails.
const ALLOWED_FINDINGS = [
  {
    ruleName: "hardcoded-color",
    file: "apps/web/src/app/[lang]/(mods-pages)/student/planner/lib/folder-colors.ts",
    line: 2,
    value: "bg-neutral-500",
    reason: "user-selected course-folder palette",
  },
  {
    ruleName: "hardcoded-color",
    file: "apps/web/src/components/Today/WeatherIcon.tsx",
    line: 25,
    value: "text-gray-400",
    reason: "weather icon data palette",
  },
  {
    ruleName: "hardcoded-color",
    file: "apps/web/src/components/Today/WeatherIcon.tsx",
    line: 29,
    value: "text-gray-300",
    reason: "weather icon data palette",
  },
  {
    ruleName: "dark-color",
    file: "apps/web/src/app/[lang]/admin/announcements/page.tsx",
    line: 266,
    value: "dark:border-destructive",
    reason: "admin route owned outside this migration",
  },
  {
    ruleName: "overlay-shadow",
    file: "apps/web/src/app/[lang]/admin/page.tsx",
    line: 75,
    value: "shadow-sm",
    reason: "floating chart tooltip",
  },
  {
    ruleName: "overlay-shadow",
    file: "apps/web/src/components/Calendar/calendar_hook.tsx",
    line: 700,
    value: "shadow-sm",
    reason: "fixed replication status toast",
  },
  {
    ruleName: "overlay-shadow",
    file: "packages/ui/src/components/ui/custom_timeselect.tsx",
    line: 162,
    value: "shadow-md",
    reason: "absolute time-picker dropdown",
  },
  {
    ruleName: "overlay-shadow",
    file: "packages/ui/src/components/ui/hover-card.tsx",
    line: 21,
    value: "shadow-md",
    reason: "floating hover card",
  },
  {
    ruleName: "overlay-shadow",
    file: "packages/ui/src/components/ui/select.tsx",
    line: 78,
    value: "shadow-md",
    reason: "floating select dropdown",
  },
  {
    ruleName: "overlay-shadow",
    file: "packages/ui/src/components/ui/tooltip.tsx",
    line: 22,
    value: "shadow-md",
    reason: "floating tooltip",
  },
];

const sourceRoots = [
  path.join(root, "apps", "web", "src"),
  path.join(root, "packages", "ui", "src"),
];

const normalize = (filePath) =>
  path.relative(root, filePath).split(path.sep).join("/");

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(filePath);
    if (!/\.(?:css|js|jsx|ts|tsx)$/.test(entry.name)) return [];
    return [filePath];
  });
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function isSidePage(filePath) {
  return normalize(filePath).includes(
    "apps/web/src/app/[lang]/(mods-pages)/(side-pages)/",
  );
}

function isAppPage(filePath) {
  const normalizedPath = normalize(filePath);
  return (
    normalizedPath.includes("apps/web/src/app/[lang]/(mods-pages)/") &&
    !isSidePage(filePath)
  );
}

function isOverlay(filePath) {
  return /(?:dialog|popover|dropdown|drawer|toast)/i.test(filePath);
}

function matchesFor(ruleName, filePath, source) {
  if (ruleName === "large-type" && !isAppPage(filePath)) return [];
  if (ruleName === "overlay-shadow" && isOverlay(filePath)) return [];

  const pattern = RULES[ruleName].pattern;
  return [...source.matchAll(new RegExp(pattern.source, pattern.flags))].map(
    (match) => ({
      line: lineNumber(source, match.index ?? 0),
      value: match[0].trim().replace(/^["'`]+/, ""),
    }),
  );
}

function emptyCounts() {
  return Object.fromEntries(
    Object.keys(RULES).map((ruleName) => [ruleName, {}]),
  );
}

const findings = [];

for (const sourceRoot of sourceRoots) {
  for (const filePath of walk(sourceRoot)) {
    const source = fs.readFileSync(filePath, "utf8");
    const relativePath = normalize(filePath);
    for (const ruleName of Object.keys(RULES)) {
      const matches = matchesFor(ruleName, filePath, source);
      findings.push(
        ...matches.map((match) => ({
          ruleName,
          file: relativePath,
          ...match,
        })),
      );
    }
  }
}

const isAllowedFinding = (finding) =>
  ALLOWED_FINDINGS.some(
    (allowed) =>
      allowed.ruleName === finding.ruleName &&
      allowed.file === finding.file &&
      allowed.line === finding.line &&
      allowed.value === finding.value,
  );

const newFindings = findings.filter((finding) => !isAllowedFinding(finding));
const violations = emptyCounts();
for (const finding of newFindings) {
  violations[finding.ruleName][finding.file] =
    (violations[finding.ruleName][finding.file] ?? 0) + 1;
}

console.log("Design lint summary");
for (const [ruleName, rule] of Object.entries(RULES)) {
  const total = Object.values(violations[ruleName]).reduce(
    (sum, count) => sum + count,
    0,
  );
  console.log(`  ${ruleName}: ${total} (${rule.description})`);
}

if (newFindings.length > 0) {
  console.error("Unallowlisted design-lint violations:");
  for (const finding of newFindings) {
    console.error(
      `  ${finding.file}:${finding.line} ${finding.ruleName} ${finding.value}`,
    );
  }
  process.exit(1);
}

console.log("No unallowlisted design-lint violations.");
