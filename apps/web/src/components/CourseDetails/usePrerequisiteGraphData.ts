import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  buildPrerequisiteGraph,
  getPrerequisiteItemNames,
  parsePrerequisites,
  type ParsedPrerequisites,
  type PrerequisiteGraph,
  type PrerequisiteGraphCourse,
  type PrerequisiteGraphRow,
} from "@courseweb/shared";

export type PrerequisiteGraphSource = PrerequisiteGraphCourse & {
  prerequisites?: string | null;
};

const previousSemester = (semester: string) => {
  const year = Number(semester.slice(0, 3));
  return semester.slice(3, 4) === "1" ? `${year - 1}20` : `${year}10`;
};

const COURSE_SELECT =
  "raw_id, semester, department, course, name_zh, name_en, prerequisites";
const COURSE_PAGE_SIZE = 1000;

type SupabaseQueryResponse = {
  data: unknown;
  error: unknown;
};

export type PrerequisiteGraphSupabaseQuery = {
  select: (columns: string) => PrerequisiteGraphSupabaseQuery;
  in: (column: string, values: string[]) => PrerequisiteGraphSupabaseQuery;
  not: (
    column: string,
    operator: string,
    value: null,
  ) => PrerequisiteGraphSupabaseQuery;
  neq: (column: string, value: string) => PrerequisiteGraphSupabaseQuery;
  order: (
    column: string,
    options: { ascending: boolean },
  ) => PrerequisiteGraphSupabaseQuery;
  range: (from: number, to: number) => PrerequisiteGraphSupabaseQuery;
  then: <TResult1 = SupabaseQueryResponse, TResult2 = never>(
    onfulfilled?:
      | ((value: SupabaseQueryResponse) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => PromiseLike<TResult1 | TResult2>;
};

export type PrerequisiteGraphSupabaseClient = {
  from: (table: "courses") => PrerequisiteGraphSupabaseQuery;
};

const fetchAllCourseRows = async (
  client: PrerequisiteGraphSupabaseClient,
  configure: (
    query: PrerequisiteGraphSupabaseQuery,
  ) => PrerequisiteGraphSupabaseQuery,
) => {
  const rows: PrerequisiteGraphRow[] = [];

  for (let offset = 0; ; offset += COURSE_PAGE_SIZE) {
    const { data, error } = await configure(
      client.from("courses").select(COURSE_SELECT),
    )
      .order("raw_id", { ascending: true })
      .range(offset, offset + COURSE_PAGE_SIZE - 1);
    if (error) throw error;

    const page = (data ?? []) as PrerequisiteGraphRow[];
    rows.push(...page);
    if (page.length < COURSE_PAGE_SIZE) return rows;
  }
};

export const fetchPrerequisiteGraphRows = async (
  client: PrerequisiteGraphSupabaseClient,
  course: PrerequisiteGraphSource,
  parsedPrerequisite: ParsedPrerequisites,
) => {
  const semesters = [course.semester, previousSemester(course.semester)];
  const rowsWithPrerequisites = await fetchAllCourseRows(client, (query) =>
    query
      .in("semester", semesters)
      .not("prerequisites", "is", null)
      .neq("prerequisites", ""),
  );
  const targetNames = [
    ...new Set([
      ...getPrerequisiteItemNames(parsedPrerequisite),
      course.name_zh,
    ]),
  ];
  const requirementTargets = await fetchAllCourseRows(client, (query) =>
    query.in("semester", semesters).in("name_zh", targetNames),
  );

  const rowsByRawId = new Map<string, PrerequisiteGraphRow>();
  for (const row of [...rowsWithPrerequisites, ...requirementTargets]) {
    rowsByRawId.set(row.raw_id, row);
  }
  return [...rowsByRawId.values()];
};

export const usePrerequisiteGraphData = (
  course: PrerequisiteGraphSource | null | undefined,
  enabled = true,
): {
  parsedPrerequisite: ParsedPrerequisites | null;
  hasStructuredPrerequisites: boolean;
  prerequisiteRows: PrerequisiteGraphRow[];
  prerequisiteGraph: PrerequisiteGraph | null;
} => {
  const parsedPrerequisite = useMemo(
    () =>
      course?.prerequisites?.trim()
        ? parsePrerequisites(course.prerequisites)
        : null,
    [course?.prerequisites],
  );
  const hasStructuredPrerequisites =
    parsedPrerequisite?.coverage === "full" &&
    parsedPrerequisite.nodes.some((node) => node.type !== "unparsed");

  const {
    data: fetchedPrerequisiteRows = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["course-prerequisite-graph", course?.semester, course?.raw_id],
    queryFn: async () => {
      const { default: supabase } = await import("@/config/supabase");
      return fetchPrerequisiteGraphRows(
        supabase as unknown as PrerequisiteGraphSupabaseClient,
        course!,
        parsedPrerequisite!,
      );
    },
    enabled: enabled && Boolean(course && hasStructuredPrerequisites),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });

  const prerequisiteRows = isLoading || error ? [] : fetchedPrerequisiteRows;
  const prerequisiteGraph = useMemo(
    () =>
      course && parsedPrerequisite && hasStructuredPrerequisites
        ? buildPrerequisiteGraph(course, parsedPrerequisite, prerequisiteRows)
        : null,
    [course, hasStructuredPrerequisites, parsedPrerequisite, prerequisiteRows],
  );

  return {
    parsedPrerequisite,
    hasStructuredPrerequisites,
    prerequisiteRows,
    prerequisiteGraph,
  };
};
