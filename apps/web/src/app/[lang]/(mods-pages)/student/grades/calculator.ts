export type GradeEntry = {
  id: string;
  courseName: string;
  credits: number;
  score: number;
};

export type GradebookBaseline = {
  currentGpa: string;
  completedCredits: string;
};

export type Gradebook = {
  entries: GradeEntry[];
  baseline: GradebookBaseline;
};

export const DEFAULT_GRADEBOOK: Gradebook = {
  entries: [],
  baseline: {
    currentGpa: "",
    completedCredits: "",
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const GRADE_SCALE = [
  { minimum: 90, letter: "A+", points: 4.3 },
  { minimum: 85, letter: "A", points: 4.0 },
  { minimum: 80, letter: "A-", points: 3.7 },
  { minimum: 77, letter: "B+", points: 3.3 },
  { minimum: 73, letter: "B", points: 3.0 },
  { minimum: 70, letter: "B-", points: 2.7 },
  { minimum: 67, letter: "C+", points: 2.3 },
  { minimum: 63, letter: "C", points: 2.0 },
  { minimum: 60, letter: "C-", points: 1.7 },
  { minimum: 0, letter: "F", points: 0 },
] as const;

export const normalizeGradebook = (value: unknown): Gradebook => {
  if (!isRecord(value)) return DEFAULT_GRADEBOOK;

  const entries = Array.isArray(value.entries)
    ? value.entries.flatMap((entry) => {
        if (!isRecord(entry)) return [];
        const { id, courseName, credits, score } = entry;
        if (
          typeof id !== "string" ||
          typeof courseName !== "string" ||
          typeof credits !== "number" ||
          typeof score !== "number" ||
          !Number.isFinite(credits) ||
          !Number.isFinite(score) ||
          credits <= 0 ||
          score < 0 ||
          score > 100
        ) {
          return [];
        }
        return [{ id, courseName, credits, score }];
      })
    : [];

  const baseline = isRecord(value.baseline) ? value.baseline : {};
  return {
    entries,
    baseline: {
      currentGpa:
        typeof baseline.currentGpa === "string" ? baseline.currentGpa : "",
      completedCredits:
        typeof baseline.completedCredits === "string"
          ? baseline.completedCredits
          : "",
    },
  };
};

export const mergeGradebooks = (
  local: Gradebook,
  remote: Gradebook,
): Gradebook => {
  const entriesById = new Map(local.entries.map((entry) => [entry.id, entry]));
  for (const entry of remote.entries) {
    if (!entriesById.has(entry.id)) entriesById.set(entry.id, entry);
  }

  return {
    entries: [...entriesById.values()],
    baseline: {
      currentGpa: local.baseline.currentGpa || remote.baseline.currentGpa || "",
      completedCredits:
        local.baseline.completedCredits ||
        remote.baseline.completedCredits ||
        "",
    },
  };
};

export const getGradeBand = (score: number) =>
  GRADE_SCALE.find((band) => score >= band.minimum) ?? GRADE_SCALE.at(-1)!;

const isCountableEntry = (entry: GradeEntry) =>
  Number.isFinite(entry.credits) &&
  entry.credits > 0 &&
  Number.isFinite(entry.score) &&
  entry.score >= 0 &&
  entry.score <= 100;

export const calculateGpa = (entries: readonly GradeEntry[]) => {
  const countableEntries = entries.filter(isCountableEntry);
  const totalCredits = countableEntries.reduce(
    (total, entry) => total + entry.credits,
    0,
  );

  if (totalCredits === 0) return null;

  const weightedPoints = countableEntries.reduce(
    (total, entry) => total + getGradeBand(entry.score).points * entry.credits,
    0,
  );

  return roundGpa(weightedPoints / totalCredits);
};

export const calculateCredits = (entries: readonly GradeEntry[]) =>
  entries
    .filter(isCountableEntry)
    .reduce((total, entry) => total + entry.credits, 0);

export const calculateProjectedCumulativeGpa = ({
  entries,
  currentGpa,
  completedCredits,
}: {
  entries: readonly GradeEntry[];
  currentGpa: number | null;
  completedCredits: number | null;
}) => {
  const termGpa = calculateGpa(entries);
  const termCredits = calculateCredits(entries);

  if (termGpa === null || termCredits === 0) {
    return currentGpa !== null && completedCredits !== null
      ? roundGpa(currentGpa)
      : null;
  }

  if (
    currentGpa === null ||
    completedCredits === null ||
    completedCredits <= 0
  ) {
    return termGpa;
  }

  return roundGpa(
    (currentGpa * completedCredits + termGpa * termCredits) /
      (completedCredits + termCredits),
  );
};

export const roundGpa = (value: number) =>
  Math.round((value + 1e-8) * 100) / 100;
