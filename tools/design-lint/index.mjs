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
  "centered-layout": {
    description: "centered page layout or vertically centered page state",
    pattern: null,
  },
  "reading-column": {
    description: "max-width reading column on a page root",
    pattern: null,
  },
  "cjk-hostile": {
    description: "typography utility hostile to Traditional Chinese",
    pattern:
      /(?:^|[\s"'`])(?:[\w-]+:)*(?:uppercase|lowercase|capitalize|italic|tracking-tight|tracking-tighter|text-balance|text-pretty|hyphens-[\w-]+)(?=$|[\s"'`])/g,
  },
  "synthetic-weight": {
    description: "synthetic font weight utility",
    pattern:
      /(?:^|[\s"'`])(?:[\w-]+:)*font-(?:semibold|light|extrabold|black)(?=$|[\s"'`])/g,
  },
  "spacing-vocab": {
    description: "padding, margin, or gap outside the spacing vocabulary",
    pattern: null,
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

function isPageOrPageSection(filePath) {
  const normalizedPath = normalize(filePath);
  return (
    (normalizedPath.startsWith("apps/web/src/app/") &&
      /\/page\.(?:js|jsx|ts|tsx)$/.test(normalizedPath)) ||
    normalizedPath.startsWith("apps/web/src/pages/") ||
    /(?:^|\/)[^/]*(?:Page|Section)\.(?:js|jsx|ts|tsx)$/.test(normalizedPath)
  );
}

function isOverlay(filePath) {
  return /(?:dialog|popover|dropdown|drawer|toast)/i.test(filePath);
}

const classNameAttributePattern =
  /className\s*=\s*(?:"([^"]*)"|'([^']*)'|{([\s\S]*?)})/g;
const classTokenPattern =
  /(?:^|[\s"'`()])((?:[\w-]+:)*-?[\w./:\[\]%+-]+)(?=$|[\s"'`()])/g;

function classNameAttributes(source) {
  return [
    ...source.matchAll(new RegExp(classNameAttributePattern.source, "g")),
  ].map((match) => {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    return {
      value,
      valueIndex: (match.index ?? 0) + match[0].indexOf(value),
    };
  });
}

function classTokens(value) {
  return [...value.matchAll(new RegExp(classTokenPattern.source, "g"))].map(
    (match) => ({
      value: match[1],
      index: match.index ?? 0,
    }),
  );
}

function utilityName(token) {
  return token.split(":").at(-1) ?? token;
}

function classNameMatches(source, predicate) {
  const matches = [];
  for (const attribute of classNameAttributes(source)) {
    for (const token of classTokens(attribute.value)) {
      if (!predicate(token.value)) continue;
      matches.push({
        line: lineNumber(source, attribute.valueIndex + token.index),
        value: token.value,
      });
    }
  }
  return matches;
}

function centeredLayoutMatches(filePath, source) {
  if (!isPageOrPageSection(filePath)) return [];

  const matches = [];
  for (const attribute of classNameAttributes(source)) {
    const tokens = classTokens(attribute.value);
    const hasHeightClass = tokens.some((token) => {
      const utility = utilityName(token.value);
      return (
        utility.startsWith("min-h-") ||
        utility === "h-full" ||
        utility === "h-screen"
      );
    });

    for (const token of tokens) {
      const utility = utilityName(token.value);
      if (
        utility === "mx-auto" ||
        utility === "text-center" ||
        (hasHeightClass &&
          (utility === "justify-center" || utility === "items-center"))
      ) {
        matches.push({
          line: lineNumber(source, attribute.valueIndex + token.index),
          value: token.value,
        });
      }
    }
  }
  return matches;
}

function openingTagEnd(source, start) {
  let quote;
  let braceDepth = 0;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote && source[index - 1] !== "\\") quote = undefined;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") {
      braceDepth += 1;
      continue;
    }
    if (character === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (character === ">" && braceDepth === 0) return index;
  }
  return -1;
}

function returnedRootOpeningTags(source) {
  const tags = [];
  for (const returnMatch of source.matchAll(/\breturn\b/g)) {
    let start = (returnMatch.index ?? 0) + returnMatch[0].length;
    while (/\s/.test(source[start] ?? "")) start += 1;
    if (source[start] === "(") {
      start += 1;
      while (/\s/.test(source[start] ?? "")) start += 1;
    }
    if (source[start] !== "<" || source[start + 1] === ">") continue;

    const tagMatch = source.slice(start).match(/^<[A-Za-z][\w.-]*/);
    if (!tagMatch) continue;
    const end = openingTagEnd(source, start);
    if (end === -1) continue;
    tags.push({ source: source.slice(start, end + 1), index: start });
  }
  return tags;
}

function readingColumnMatches(filePath, source) {
  if (!isPageOrPageSection(filePath)) return [];

  const matches = [];
  for (const tag of returnedRootOpeningTags(source)) {
    for (const attribute of classNameAttributes(tag.source)) {
      for (const token of classTokens(attribute.value)) {
        if (!utilityName(token.value).startsWith("max-w-")) continue;
        matches.push({
          line: lineNumber(
            source,
            tag.index + attribute.valueIndex + token.index,
          ),
          value: token.value,
        });
      }
    }
  }
  return matches;
}

function spacingVocabMatches(source) {
  const allowedSteps = new Set(["1", "2", "4", "6"]);
  return classNameMatches(source, (token) => {
    const utility = utilityName(token);
    const spacing = utility.match(
      /^-?(?:p|m)(?:[trblxy])?-(.+)$|^(?:gap|gap-[xy])-(.+)$/,
    );
    if (!spacing) return false;
    const step = spacing[1] ?? spacing[2];
    if (step === "auto") return false;
    return !allowedSteps.has(step);
  });
}

function matchesFor(ruleName, filePath, source) {
  if (ruleName === "large-type" && !isAppPage(filePath)) return [];
  if (ruleName === "overlay-shadow" && isOverlay(filePath)) return [];
  if (ruleName === "centered-layout") {
    return centeredLayoutMatches(filePath, source);
  }
  if (ruleName === "reading-column") {
    return readingColumnMatches(filePath, source);
  }
  if (ruleName === "spacing-vocab") return spacingVocabMatches(source);

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

const baselineFindings = newFindings.filter((finding) => {
  const ruleBaseline = baseline.rules?.[finding.ruleName] ?? {};
  const allowed = ruleBaseline.files?.[finding.file];
  const cleaned = ruleBaseline.cleaned?.includes(finding.file);
  return (
    cleaned ||
    typeof allowed !== "number" ||
    violations[finding.ruleName][finding.file] > allowed
  );
});

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

console.log("Design lint summary");
for (const [ruleName, rule] of Object.entries(RULES)) {
  const total = Object.values(violations[ruleName]).reduce(
    (sum, count) => sum + count,
    0,
  );
  console.log(`  ${ruleName}: ${total} (${rule.description})`);
}

if (baselineFindings.length > 0) {
  console.error("New design-lint violations:");
  for (const finding of baselineFindings) {
    console.error(
      `  ${finding.file}:${finding.line} ${finding.ruleName} ${finding.value}`,
    );
  }
  process.exit(1);
}

console.log("No new design-lint violations.");
