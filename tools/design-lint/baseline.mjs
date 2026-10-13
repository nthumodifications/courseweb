export const SHRINK_BASELINE_COMMAND = "bun run design-lint --write-baseline";

export function compareBaseline({ violations, baseline, existingFiles }) {
  const excess = [];
  const stale = [];

  for (const [ruleName, files] of Object.entries(violations)) {
    const ruleBaseline = baseline.rules?.[ruleName]?.files ?? {};
    for (const [file, actual] of Object.entries(files)) {
      const allowed = ruleBaseline[file];
      if (typeof allowed !== "number" || actual > allowed) {
        excess.push({ ruleName, file, actual, allowed });
      }
    }
  }

  for (const [ruleName, ruleBaseline] of Object.entries(
    baseline.rules ?? {},
  )) {
    for (const [file, recorded] of Object.entries(ruleBaseline.files ?? {})) {
      const actual = violations[ruleName]?.[file] ?? 0;
      if (actual < recorded) {
        stale.push({
          ruleName,
          file,
          recorded,
          actual,
          deleted: !existingFiles.has(file),
        });
      }
    }
  }

  return { excess, stale };
}

export function formatStaleBaseline(stale) {
  return [
    `Stale design-lint baseline entries. Run \`${SHRINK_BASELINE_COMMAND}\` to shrink the baseline:`,
    ...stale.map((entry) => {
      const status = entry.deleted
        ? "file no longer exists"
        : `now has ${entry.actual} finding(s)`;
      return `  ${entry.file} ${entry.ruleName}: ${status}; baseline records ${entry.recorded}`;
    }),
  ];
}
