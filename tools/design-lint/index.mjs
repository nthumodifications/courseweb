import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const baselinePath = path.join(root, "tools", "design-lint", "baseline.json");

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
      value: match[0].trim(),
    }),
  );
}

function emptyCounts() {
  return Object.fromEntries(
    Object.keys(RULES).map((ruleName) => [ruleName, {}]),
  );
}

const violations = emptyCounts();
const findings = [];

for (const sourceRoot of sourceRoots) {
  for (const filePath of walk(sourceRoot)) {
    const source = fs.readFileSync(filePath, "utf8");
    const relativePath = normalize(filePath);
    for (const ruleName of Object.keys(RULES)) {
      const matches = matchesFor(ruleName, filePath, source);
      if (matches.length === 0) continue;
      violations[ruleName][relativePath] = matches.length;
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

if (process.argv.includes("--write-baseline")) {
  const generatedBaseline = {
    version: 1,
    rules: Object.fromEntries(
      Object.keys(RULES).map((ruleName) => [
        ruleName,
        { files: violations[ruleName], cleaned: [] },
      ]),
    ),
  };
  fs.writeFileSync(
    baselinePath,
    `${JSON.stringify(generatedBaseline, null, 2)}\n`,
  );
  console.log(`Wrote ${normalize(baselinePath)}`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
} catch (error) {
  console.error(`Unable to read ${normalize(baselinePath)}: ${error.message}`);
  process.exit(1);
}

const newFindings = findings.filter(({ ruleName, file }) => {
  const ruleBaseline = baseline.rules?.[ruleName] ?? {};
  const allowed = ruleBaseline.files?.[file];
  const cleaned = ruleBaseline.cleaned?.includes(file);
  return (
    cleaned ||
    typeof allowed !== "number" ||
    violations[ruleName][file] > allowed
  );
});

console.log("Design lint summary");
for (const [ruleName, rule] of Object.entries(RULES)) {
  const total = Object.values(violations[ruleName]).reduce(
    (sum, count) => sum + count,
    0,
  );
  console.log(`  ${ruleName}: ${total} (${rule.description})`);
}

const cleanedFiles = [];
for (const [ruleName, ruleBaseline] of Object.entries(baseline.rules ?? {})) {
  for (const file of Object.keys(ruleBaseline.files ?? {})) {
    if (
      !violations[ruleName]?.[file] &&
      !ruleBaseline.cleaned?.includes(file)
    ) {
      cleanedFiles.push(`${ruleName}: ${file}`);
    }
  }
}
if (cleanedFiles.length > 0) {
  console.log(`Cleaned baseline entries: ${cleanedFiles.length}`);
}

if (newFindings.length > 0) {
  console.error("New design-lint violations:");
  for (const finding of newFindings) {
    console.error(
      `  ${finding.file}:${finding.line} ${finding.ruleName} ${finding.value}`,
    );
  }
  process.exit(1);
}

console.log("No new design-lint violations.");
