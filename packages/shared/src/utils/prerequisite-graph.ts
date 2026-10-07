import {
  getPrerequisiteItemNames,
  normalizePrerequisiteName,
  parsePrerequisites,
  type ParsedPrerequisites,
  type PrerequisiteNode,
} from "./prerequisites";

export interface PrerequisiteGraphNode {
  name: string;
  courseRawId?: string;
  minimumGrade?: string;
  mustNotHaveTaken?: boolean;
}

export interface PrerequisiteGraphGroup {
  mode: "all" | "any";
  items: PrerequisiteGraphNode[];
}

export interface PrerequisiteGraphCourse {
  raw_id: string;
  semester: string;
  department: string;
  course: string;
  name_zh: string;
  name_en?: string | null;
}

export interface PrerequisiteGraphRow extends PrerequisiteGraphCourse {
  prerequisites: string | null;
}

export interface PrerequisiteGraph {
  requirements: PrerequisiteGraphGroup[];
  unlocks: PrerequisiteGraphNode[];
}

const isNewerSemester = (left: string, right: string) => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber > rightNumber;
  }
  return left > right;
};

const getNodeItems = (
  nodes: readonly PrerequisiteNode[],
  mode: PrerequisiteGraphGroup["mode"],
): PrerequisiteGraphGroup[] => {
  const items: Extract<PrerequisiteNode, { type: "course" | "unparsed" }>[] =
    [];
  const groups: PrerequisiteGraphGroup[] = [];

  for (const node of nodes) {
    if (node.type === "course" || node.type === "unparsed") {
      items.push(node);
      continue;
    }

    groups.push(
      ...getNodeItems(node.children, node.type === "anyOf" ? "any" : "all"),
    );
  }

  if (items.length > 0) {
    groups.unshift({ mode, items: [] });
    groups[0].items = items.map((item) =>
      item.type === "course"
        ? {
            name: item.name,
            ...(item.minimumGrade ? { minimumGrade: item.minimumGrade } : {}),
            ...(item.mustNotHaveTaken ? { mustNotHaveTaken: true } : {}),
          }
        : { name: item.rawText },
    );
  }

  return groups;
};

const findCourse = (
  name: string,
  course: PrerequisiteGraphCourse,
  rows: readonly PrerequisiteGraphRow[],
) => {
  const normalizedName = normalizePrerequisiteName(name);
  return rows
    .filter((row) => normalizePrerequisiteName(row.name_zh) === normalizedName)
    .sort((left, right) => {
      const leftDepartment = left.department === course.department ? 0 : 1;
      const rightDepartment = right.department === course.department ? 0 : 1;
      if (leftDepartment !== rightDepartment) {
        return leftDepartment - rightDepartment;
      }
      if (left.semester !== right.semester) {
        return isNewerSemester(left.semester, right.semester) ? -1 : 1;
      }
      return 0;
    })[0];
};

const resolveRequirements = (
  parsed: ParsedPrerequisites,
  course: PrerequisiteGraphCourse,
  rows: readonly PrerequisiteGraphRow[],
) =>
  getNodeItems(parsed.nodes, "all").map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const resolved = findCourse(item.name, course, rows);
      return resolved ? { ...item, courseRawId: resolved.raw_id } : item;
    }),
  }));

const resolveUnlocks = (
  course: PrerequisiteGraphCourse,
  rows: readonly PrerequisiteGraphRow[],
) => {
  const normalizedCourseName = normalizePrerequisiteName(course.name_zh);
  const latestByCourse = new Map<string, PrerequisiteGraphRow>();

  for (const row of rows) {
    if (row.department === course.department && row.course === course.course) {
      continue;
    }
    if (!row.prerequisites?.trim()) continue;

    const parsed = parsePrerequisites(row.prerequisites, rows);
    if (
      !getPrerequisiteItemNames(parsed).some(
        (name) => normalizePrerequisiteName(name) === normalizedCourseName,
      )
    ) {
      continue;
    }

    const key = `${row.department}\u0000${row.course}`;
    const existing = latestByCourse.get(key);
    if (!existing || isNewerSemester(row.semester, existing.semester)) {
      latestByCourse.set(key, row);
    }
  }

  return [...latestByCourse.values()]
    .sort((left, right) => {
      const departmentOrder = left.department.localeCompare(right.department);
      return (
        departmentOrder ||
        left.course.localeCompare(right.course, undefined, { numeric: true })
      );
    })
    .map((row) => ({ name: row.name_zh, courseRawId: row.raw_id }));
};

export const buildPrerequisiteGraph = (
  course: PrerequisiteGraphCourse,
  parsed: ParsedPrerequisites,
  rows: readonly PrerequisiteGraphRow[],
): PrerequisiteGraph => ({
  requirements: resolveRequirements(parsed, course, rows),
  unlocks: resolveUnlocks(course, rows),
});
