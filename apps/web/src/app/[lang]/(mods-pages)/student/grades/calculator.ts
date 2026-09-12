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

export type GradeLetter = (typeof GRADE_SCALE)[number]["letter"];
export type GradeBand = (typeof GRADE_SCALE)[number];

export type GradeEntry = {
  id: string;
  courseName: string;
  credits: number;
  score: number | null;
  letterGrade: GradeLetter | null;
};

export type SemesterRecord = {
  id: string;
  name: string;
  gpa: number;
  credits: number;
  cumulativeGpa: number | null;
};

export type GradebookBaseline = {
  currentGpa: string;
  completedCredits: string;
};

export type Gradebook = {
  entries: GradeEntry[];
  semesters: SemesterRecord[];
  baseline: GradebookBaseline;
};

export const DEFAULT_GRADEBOOK: Gradebook = {
  entries: [],
  semesters: [],
  baseline: {
    currentGpa: "",
    completedCredits: "",
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidScore = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100;

const isValidGpa = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 4.3;

const isValidCredits = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const getGradeBandForLetter = (letter: unknown): GradeBand | null =>
  GRADE_SCALE.find((band) => band.letter === letter) ?? null;

export const getGradeBand = (score: number): GradeBand =>
  GRADE_SCALE.find((band) => score >= band.minimum) ?? GRADE_SCALE.at(-1)!;

export const getGradeBandForEntry = (
  entry: Pick<GradeEntry, "score" | "letterGrade">,
): GradeBand | null => {
  if (isValidScore(entry.score)) return getGradeBand(entry.score);
  return getGradeBandForLetter(entry.letterGrade);
};

const normalizeLetterGrade = (value: unknown): GradeLetter | null =>
  getGradeBandForLetter(value)?.letter ?? null;

export const normalizeGradebook = (value: unknown): Gradebook => {
  if (!isRecord(value)) return DEFAULT_GRADEBOOK;

  const entries = Array.isArray(value.entries)
    ? value.entries.flatMap((entry) => {
        if (!isRecord(entry)) return [];
        const { id, courseName, credits } = entry;
        const score = isValidScore(entry.score) ? entry.score : null;
        const letterGrade = normalizeLetterGrade(entry.letterGrade);
        if (
          typeof id !== "string" ||
          typeof courseName !== "string" ||
          !isValidCredits(credits) ||
          (score === null && letterGrade === null)
        ) {
          return [];
        }

        return [
          {
            id,
            courseName,
            credits,
            score,
            letterGrade:
              score === null ? letterGrade : getGradeBand(score).letter,
          },
        ];
      })
    : [];

  const semesters = Array.isArray(value.semesters)
    ? value.semesters.flatMap((semester) => {
        if (!isRecord(semester)) return [];
        const { id, name, gpa, credits } = semester;
        const cumulativeGpa = isValidGpa(semester.cumulativeGpa)
          ? semester.cumulativeGpa
          : null;
        if (
          typeof id !== "string" ||
          typeof name !== "string" ||
          !isValidGpa(gpa) ||
          !isValidCredits(credits)
        ) {
          return [];
        }

        return [{ id, name, gpa, credits, cumulativeGpa }];
      })
    : [];

  const baseline = isRecord(value.baseline) ? value.baseline : {};
  return {
    entries,
    semesters,
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
  const normalizedLocal = normalizeGradebook(local);
  const normalizedRemote = normalizeGradebook(remote);
  const entriesById = new Map(
    normalizedLocal.entries.map((entry) => [entry.id, entry]),
  );
  for (const entry of normalizedRemote.entries) {
    if (!entriesById.has(entry.id)) entriesById.set(entry.id, entry);
  }

  const semestersById = new Map(
    normalizedLocal.semesters.map((semester) => [semester.id, semester]),
  );
  for (const semester of normalizedRemote.semesters) {
    if (!semestersById.has(semester.id))
      semestersById.set(semester.id, semester);
  }

  return {
    entries: [...entriesById.values()],
    semesters: [...semestersById.values()],
    baseline: {
      currentGpa:
        normalizedLocal.baseline.currentGpa ||
        normalizedRemote.baseline.currentGpa ||
        "",
      completedCredits:
        normalizedLocal.baseline.completedCredits ||
        normalizedRemote.baseline.completedCredits ||
        "",
    },
  };
};

const isCountableEntry = (entry: GradeEntry) =>
  isValidCredits(entry.credits) && getGradeBandForEntry(entry) !== null;

export const calculateGpa = (entries: readonly GradeEntry[]) => {
  const countableEntries = entries.filter(isCountableEntry);
  const totalCredits = countableEntries.reduce(
    (total, entry) => total + entry.credits,
    0,
  );

  if (totalCredits === 0) return null;

  const weightedPoints = countableEntries.reduce(
    (total, entry) =>
      total + getGradeBandForEntry(entry)!.points * entry.credits,
    0,
  );

  return roundGpa(weightedPoints / totalCredits);
};

export const calculateCredits = (entries: readonly GradeEntry[]) =>
  entries
    .filter(isCountableEntry)
    .reduce((total, entry) => total + entry.credits, 0);

type CumulativeSemester = SemesterRecord & {
  totalCredits: number;
  calculatedCumulativeGpa: number;
};

const isCountableSemester = (semester: SemesterRecord) =>
  isValidGpa(semester.gpa) && isValidCredits(semester.credits);

export const calculateSemesterCumulativeGpas = ({
  semesters,
  currentGpa,
  completedCredits,
}: {
  semesters: readonly SemesterRecord[];
  currentGpa: number | null;
  completedCredits: number | null;
}): CumulativeSemester[] => {
  let totalCredits =
    currentGpa !== null && completedCredits !== null && completedCredits > 0
      ? completedCredits
      : 0;
  let weightedPoints =
    currentGpa !== null && completedCredits !== null && completedCredits > 0
      ? currentGpa * completedCredits
      : 0;

  return semesters.filter(isCountableSemester).map((semester) => {
    totalCredits += semester.credits;
    weightedPoints += semester.gpa * semester.credits;

    if (semester.cumulativeGpa !== null) {
      weightedPoints = semester.cumulativeGpa * totalCredits;
    }

    return {
      ...semester,
      totalCredits,
      calculatedCumulativeGpa: roundGpa(weightedPoints / totalCredits),
    };
  });
};

export const calculateProjectedCumulativeGpa = ({
  entries,
  semesters = [],
  currentGpa,
  completedCredits,
}: {
  entries: readonly GradeEntry[];
  semesters?: readonly SemesterRecord[];
  currentGpa: number | null;
  completedCredits: number | null;
}) => {
  const termGpa = calculateGpa(entries);
  const termCredits = calculateCredits(entries);
  const semesterHistory = calculateSemesterCumulativeGpas({
    semesters,
    currentGpa,
    completedCredits,
  });
  const latestSemester = semesterHistory.at(-1);
  const previousGpa = latestSemester?.calculatedCumulativeGpa ?? currentGpa;
  const previousCredits = latestSemester?.totalCredits ?? completedCredits;

  if (termGpa === null || termCredits === 0) {
    return previousGpa !== null &&
      previousCredits !== null &&
      previousCredits > 0
      ? roundGpa(previousGpa)
      : null;
  }

  if (
    previousGpa === null ||
    previousCredits === null ||
    previousCredits <= 0
  ) {
    return termGpa;
  }

  return roundGpa(
    (previousGpa * previousCredits + termGpa * termCredits) /
      (previousCredits + termCredits),
  );
};

export const roundGpa = (value: number) =>
  Math.round((value + 1e-8) * 100) / 100;
