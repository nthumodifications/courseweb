export type CourseChangeRow = {
  id: bigint | number | string;
  raw_id: string;
  semester: string;
  field: string;
  kind: string;
  old_value: unknown;
  new_value: unknown;
  detected_at: string;
};

export type CourseNameRow = {
  raw_id: string;
  name_zh: string;
  name_en: string;
};

export const withTimeout = async <T>(
  operation: PromiseLike<T>,
  timeoutMs = 10_000,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Operation timed out after ${timeoutMs} ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const asCourseChangeRow = (value: unknown): CourseChangeRow | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    (typeof row["id"] !== "number" &&
      typeof row["id"] !== "string" &&
      typeof row["id"] !== "bigint") ||
    typeof row["raw_id"] !== "string" ||
    typeof row["semester"] !== "string" ||
    typeof row["field"] !== "string" ||
    typeof row["kind"] !== "string" ||
    typeof row["detected_at"] !== "string"
  ) {
    return null;
  }
  return {
    id: row["id"],
    raw_id: row["raw_id"],
    semester: row["semester"],
    field: row["field"],
    kind: row["kind"],
    old_value: row["old_value"],
    new_value: row["new_value"],
    detected_at: row["detected_at"],
  };
};

export const getCurrentCourseChangeId = async (): Promise<bigint> => {
  const { default: supabase } = await import("../config/supabase");
  const { data, error } = await withTimeout(
    supabase
      .from("course_changes")
      .select("id")
      .order("id", { ascending: false })
      .limit(1),
  );
  if (error)
    throw new Error(`Failed to read course change cursor: ${error.message}`);
  const id = data?.[0]?.id;
  return id === undefined || id === null ? 0n : BigInt(id);
};

export const getCourseChanges = async (
  afterId: bigint,
  limit: number,
): Promise<CourseChangeRow[]> => {
  const { default: supabase } = await import("../config/supabase");
  const { data, error } = await withTimeout(
    supabase
      .from("course_changes")
      .select("id,raw_id,semester,field,kind,old_value,new_value,detected_at")
      .gt("id", afterId.toString())
      .order("id", { ascending: true })
      .limit(limit),
  );
  if (error) throw new Error(`Failed to read course changes: ${error.message}`);
  return (data ?? []).flatMap((row) => {
    const parsed = asCourseChangeRow(row);
    return parsed ? [parsed] : [];
  });
};

export const getCourseNames = async (
  rawIds: readonly string[],
): Promise<Map<string, CourseNameRow>> => {
  if (rawIds.length === 0) return new Map();
  const { default: supabase } = await import("../config/supabase");
  const { data, error } = await withTimeout(
    supabase
      .from("courses")
      .select("raw_id,name_zh,name_en")
      .in("raw_id", [...new Set(rawIds)]),
  );
  if (error) throw new Error(`Failed to read course names: ${error.message}`);
  return new Map(
    (data ?? []).flatMap((row) =>
      typeof row.raw_id === "string" &&
      typeof row.name_zh === "string" &&
      typeof row.name_en === "string"
        ? [[row.raw_id, row]]
        : [],
    ),
  );
};
