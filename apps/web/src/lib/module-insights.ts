// Pure summaries of a module's offerings. No Supabase import, so tests and
// any component can use it without an environment.

export interface InsightOffering {
  raw_id: string;
  semester: string;
  teacher_zh: string[] | null;
  teacher_en: string[] | null;
  times: string[] | null;
  language: string | null;
  capacity: number | null;
  enrolled: number | null;
}

export interface ModuleScore {
  raw_id: string;
  average: number;
  std_dev: number;
  type: string;
  enrollment: number | null;
}

export interface DemandPoint {
  semester: string;
  enrolled: number;
  capacity: number;
  /** Enrolled as a share of capacity; 1 means exactly full. */
  fill: number;
  sections: number;
}

/** Seats filled per semester, over sections that publish both numbers. */
export const getDemandSeries = (
  offerings: readonly InsightOffering[],
): DemandPoint[] => {
  const bySemester = new Map<string, DemandPoint>();
  for (const offering of offerings) {
    // Older semesters store 0 enrolled because the number was never recorded.
    if (!offering.capacity || !offering.enrolled) continue;
    const point = bySemester.get(offering.semester) ?? {
      semester: offering.semester,
      enrolled: 0,
      capacity: 0,
      fill: 0,
      sections: 0,
    };
    point.enrolled += offering.enrolled;
    point.capacity += offering.capacity;
    point.sections += 1;
    bySemester.set(offering.semester, point);
  }
  return [...bySemester.values()]
    .map((point) => ({ ...point, fill: point.enrolled / point.capacity }))
    .sort((left, right) => left.semester.localeCompare(right.semester));
};

/** Seat-weighted fill over the most recent semesters, or null without data. */
export const getRecentFill = (series: readonly DemandPoint[], recent = 4) => {
  const points = series.slice(-recent);
  const capacity = points.reduce((sum, point) => sum + point.capacity, 0);
  if (capacity === 0) return null;
  return points.reduce((sum, point) => sum + point.enrolled, 0) / capacity;
};

const mostCommon = (values: readonly string[]) => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .map(([value, count]) => ({ value, count }));
};

/** Time-slot codes the course has used, most frequent first. */
export const getCommonTimes = (offerings: readonly InsightOffering[]) =>
  mostCommon(
    offerings.flatMap((offering) =>
      (offering.times ?? []).map((time) => time.trim()).filter(Boolean),
    ),
  );

export const getLanguages = (offerings: readonly InsightOffering[]) =>
  mostCommon(
    offerings
      .map((offering) => (offering.language ?? "").trim())
      .filter(Boolean),
  );

export interface ScoreSummary {
  type: string;
  average: number;
  count: number;
}

/**
 * Mean of the published class averages, per grading scale. Percent and GPA
 * averages are never mixed; the scale with more data comes first.
 */
export const summariseScores = (
  scores: readonly ModuleScore[],
): ScoreSummary[] => {
  const byType = new Map<string, number[]>();
  for (const score of scores) {
    if (!Number.isFinite(score.average)) continue;
    byType.set(score.type, [...(byType.get(score.type) ?? []), score.average]);
  }
  return [...byType.entries()]
    .map(([type, values]) => ({
      type,
      count: values.length,
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
    }))
    .sort((left, right) => right.count - left.count);
};

export interface InstructorInsight {
  key: string;
  nameZh: string;
  nameEn: string;
  semesters: string[];
  latestSemester: string;
  scores: ScoreSummary[];
}

/** Who has taught it: semesters taught and their published class averages. */
export const getInstructorInsights = (
  offerings: readonly InsightOffering[],
  scores: readonly ModuleScore[],
): InstructorInsight[] => {
  const scoresByOffering = new Map<string, ModuleScore[]>();
  for (const score of scores) {
    scoresByOffering.set(score.raw_id, [
      ...(scoresByOffering.get(score.raw_id) ?? []),
      score,
    ]);
  }

  const byInstructor = new Map<
    string,
    {
      nameZh: string;
      nameEn: string;
      semesters: Set<string>;
      scores: ModuleScore[];
    }
  >();
  for (const offering of offerings) {
    (offering.teacher_zh ?? []).forEach((nameZh, index) => {
      const key = nameZh.trim();
      if (!key) return;
      const entry = byInstructor.get(key) ?? {
        nameZh: key,
        nameEn: (offering.teacher_en?.[index] ?? "").trim(),
        semesters: new Set<string>(),
        scores: [],
      };
      entry.semesters.add(offering.semester);
      entry.scores.push(...(scoresByOffering.get(offering.raw_id) ?? []));
      byInstructor.set(key, entry);
    });
  }

  return [...byInstructor.entries()]
    .map(([key, entry]) => {
      const semesters = [...entry.semesters].sort((left, right) =>
        left.localeCompare(right),
      );
      return {
        key,
        nameZh: entry.nameZh,
        nameEn: entry.nameEn,
        semesters,
        latestSemester: semesters.at(-1)!,
        scores: summariseScores(entry.scores),
      };
    })
    .sort(
      (left, right) =>
        right.latestSemester.localeCompare(left.latestSemester) ||
        right.semesters.length - left.semesters.length ||
        left.key.localeCompare(right.key),
    );
};
