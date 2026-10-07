import { lastSemester } from "@courseweb/shared";

// Kept free of the Supabase client so it can be imported anywhere, tests
// included, without any environment configured.
export type SemesterTerm = "fall" | "spring" | "summer";

const getSemesterTerm = (semester: string): SemesterTerm | null => {
  if (!/^\d{5}$/.test(semester)) return null;
  return (
    ({ "1": "fall", "2": "spring", "3": "summer" } as const)[
      semester[3] as "1" | "2" | "3"
    ] ?? null
  );
};

export type TermAvailabilityStatus =
  | "every_year"
  | "most_years"
  | "some_years"
  | "once"
  | "stopped"
  | "never";

export interface TermAvailability {
  term: SemesterTerm;
  status: TermAvailabilityStatus;
  /** Academic years in which this term was offered. */
  offeredYears: number;
  /** Academic years, since the course first appeared, in which it could have been. */
  possibleYears: number;
  lastSemester?: string;
}

const TERM_DIGIT: Record<SemesterTerm, string> = {
  fall: "1",
  spring: "2",
  summer: "3",
};

/**
 * How reliably a course runs in each term, as one status per term.
 *
 * The span runs from the academic year the course first appeared to the
 * newest semester the site knows. A term counts as stopped when it ran
 * before but not in either of its two most recent possible years.
 */
export const getTermAvailability = (
  semesters: readonly string[],
  latestKnownSemester = lastSemester.id,
): TermAvailability[] => {
  const offered = [...new Set(semesters)].filter(getSemesterTerm);
  const newest = [...offered, latestKnownSemester]
    .sort((left, right) => left.localeCompare(right))
    .at(-1)!;
  const firstYear = Math.min(
    ...offered.map((semester) => Number(semester.slice(0, 3))),
  );
  const terms: SemesterTerm[] = offered.some(
    (semester) => getSemesterTerm(semester) === "summer",
  )
    ? ["fall", "spring", "summer"]
    : ["fall", "spring"];

  return terms.map((term) => {
    const mine = offered
      .filter((semester) => getSemesterTerm(semester) === term)
      .sort((left, right) => left.localeCompare(right));
    if (offered.length === 0 || mine.length === 0) {
      return { term, status: "never", offeredYears: 0, possibleYears: 0 };
    }

    // The newest year only counts if this term of it has been published.
    const newestYear = Number(newest.slice(0, 3));
    const lastPossibleYear =
      `${newestYear}${TERM_DIGIT[term]}0` <= newest
        ? newestYear
        : newestYear - 1;
    const possibleYears = Math.max(lastPossibleYear - firstYear + 1, 1);
    const offeredYears = new Set(mine.map((semester) => semester.slice(0, 3)))
      .size;
    const lastOffered = mine.at(-1)!;
    const yearsSinceLast = lastPossibleYear - Number(lastOffered.slice(0, 3));

    let status: TermAvailabilityStatus;
    if (yearsSinceLast >= 2) status = "stopped";
    else if (offeredYears === 1) status = "once";
    else if (offeredYears >= possibleYears) status = "every_year";
    else if (offeredYears / possibleYears >= 2 / 3) status = "most_years";
    else status = "some_years";

    return {
      term,
      status,
      offeredYears,
      possibleYears,
      lastSemester: lastOffered,
    };
  });
};
