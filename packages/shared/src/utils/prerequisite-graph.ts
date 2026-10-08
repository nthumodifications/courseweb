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
  moduleDepartment?: string;
  moduleCourse?: string;
  courseSearchQuery?: string;
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

const moduleKey = (
  row: Pick<PrerequisiteGraphCourse, "department" | "course">,
) => `${row.department}\u0000${row.course}`;

const isSameDepartment = (left: string, right: string) =>
  left === right ||
  (["CS", "EECS"].includes(left) && ["CS", "EECS"].includes(right));

const NON_COURSE_PREREQUISITE_SUFFIX =
  /\((?:(?:基本|基礎)科目免修測試|AP先修課程)\)$/u;

const isNonCoursePrerequisiteName = (name: string) =>
  NON_COURSE_PREREQUISITE_SUFFIX.test(name.normalize("NFKC"));

const latestModuleRows = (rows: readonly PrerequisiteGraphRow[]) => {
  const latestByModule = new Map<string, PrerequisiteGraphRow>();

  for (const row of rows) {
    const key = moduleKey(row);
    const existing = latestByModule.get(key);
    if (!existing || isNewerSemester(row.semester, existing.semester)) {
      latestByModule.set(key, row);
    }
  }

  return [...latestByModule.values()];
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
            ...(isNonCoursePrerequisiteName(item.name)
              ? {}
              : { courseSearchQuery: item.name }),
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
  additionalCourses: readonly PrerequisiteGraphCourse[] = [],
) => {
  const candidateRows = [
    ...rows,
    ...additionalCourses.map((additionalCourse) => ({
      ...additionalCourse,
      prerequisites: null,
    })),
  ];
  const codeMatch = /\b([A-Za-z]{2,8})\s*[- ]?\s*(\d{3,6})\b/u.exec(name);
  if (codeMatch) {
    const departmentCode = codeMatch[1].toLocaleUpperCase();
    const courseCode = codeMatch[2].replace(/^0+(?=\d)/, "");
    const codeMatches = candidateRows.filter(
      (row) =>
        row.department.replace(/\s+/g, "").toLocaleUpperCase() ===
          departmentCode &&
        row.course.replace(/\s+/g, "").replace(/^0+(?=\d)/, "") === courseCode,
    );
    const modules = latestModuleRows(codeMatches);
    if (modules.length === 1) return modules[0];
  }

  const normalizedName = normalizePrerequisiteName(name);
  const nameMatches = latestModuleRows(
    candidateRows.filter(
      (row) => normalizePrerequisiteName(row.name_zh) === normalizedName,
    ),
  );
  const sameDepartmentMatches = nameMatches.filter((row) =>
    isSameDepartment(row.department, course.department),
  );
  if (sameDepartmentMatches.length === 1) return sameDepartmentMatches[0];
  return nameMatches.length === 1 ? nameMatches[0] : undefined;
};

const resolveRequirements = (
  parsed: ParsedPrerequisites,
  course: PrerequisiteGraphCourse,
  rows: readonly PrerequisiteGraphRow[],
) =>
  getNodeItems(parsed.nodes, "all").map((group) => ({
    ...group,
    items: group.items.map((item) => {
      if (!item.courseSearchQuery) return item;
      const resolved = findCourse(item.name, course, rows);
      if (!resolved) return item;
      const { courseSearchQuery: _courseSearchQuery, ...resolvedItem } = item;
      return {
        ...resolvedItem,
        courseRawId: resolved.raw_id,
        moduleDepartment: resolved.department,
        moduleCourse: resolved.course,
      };
    }),
  }));

const referencesCourse = (
  name: string,
  requiringCourse: PrerequisiteGraphCourse,
  targetCourse: PrerequisiteGraphCourse,
  rows: readonly PrerequisiteGraphRow[],
) => {
  const resolved = findCourse(name, requiringCourse, rows, [targetCourse]);
  return Boolean(resolved && moduleKey(resolved) === moduleKey(targetCourse));
};

const resolveUnlocks = (
  course: PrerequisiteGraphCourse,
  rows: readonly PrerequisiteGraphRow[],
) => {
  const latestByModule = new Map<string, PrerequisiteGraphRow>();

  for (const row of rows) {
    if (row.department === course.department && row.course === course.course) {
      continue;
    }
    if (!row.prerequisites?.trim()) continue;

    const parsed = parsePrerequisites(row.prerequisites, rows, {
      currentDepartment: row.department,
    });
    if (
      !getPrerequisiteItemNames(parsed).some((name) =>
        referencesCourse(name, row, course, rows),
      )
    ) {
      continue;
    }

    const key = moduleKey(row);
    const existing = latestByModule.get(key);
    if (!existing || isNewerSemester(row.semester, existing.semester)) {
      latestByModule.set(key, row);
    }
  }

  return [...latestByModule.values()]
    .sort((left, right) => {
      const leftDepartmentOrder = left.department === course.department ? 0 : 1;
      const rightDepartmentOrder =
        right.department === course.department ? 0 : 1;
      const departmentPriority = leftDepartmentOrder - rightDepartmentOrder;
      if (departmentPriority) return departmentPriority;

      const departmentOrder = left.department.localeCompare(right.department);
      return (
        departmentOrder ||
        left.course.localeCompare(right.course, undefined, { numeric: true })
      );
    })
    .map((row) => ({
      name: row.name_zh,
      courseRawId: row.raw_id,
      moduleDepartment: row.department,
      moduleCourse: row.course,
    }));
};

export const buildPrerequisiteGraph = (
  course: PrerequisiteGraphCourse,
  parsed: ParsedPrerequisites,
  rows: readonly PrerequisiteGraphRow[],
): PrerequisiteGraph => ({
  requirements: resolveRequirements(parsed, course, rows),
  unlocks: resolveUnlocks(course, rows),
});
