import { v4 as uuidv4 } from "uuid";
import type {
  FolderDocType,
  ItemDocType,
  PlannerDataDocType,
  SemesterDocType,
} from "../rxdb";
import type { PlannerTemplatePayload } from "@/lib/planner-templates";
import { generateSemesterId, getSemesterTermLabel } from "../data/semesters";

type PlannerTemplateSource = {
  planner: PlannerDataDocType;
  folders: FolderDocType[];
  items: ItemDocType[];
  semesters: SemesterDocType[];
};

type PlannerTemplateDocs = {
  folders: FolderDocType[];
  items: ItemDocType[];
  semesters: SemesterDocType[];
};

export const plannerToTemplatePayload = ({
  planner,
  folders,
  items,
  semesters,
}: PlannerTemplateSource): PlannerTemplatePayload => {
  const itemsByFolder = new Map<string, number>();
  for (const item of items) {
    if (item.parent)
      itemsByFolder.set(item.parent, (itemsByFolder.get(item.parent) ?? 0) + 1);
  }
  const includedFolders = folders.filter(
    (folder) =>
      folder.id !== "_unsorted" || (itemsByFolder.get(folder.id) ?? 0) > 0,
  );
  const includedFolderIds = new Set(includedFolders.map((folder) => folder.id));
  const folderKeys = new Map(
    includedFolders.map((folder) => [folder.id, uuidv4().slice(0, 12)]),
  );
  const itemKeys = new Map(
    items.map((item) => [item.uuid, uuidv4().slice(0, 12)]),
  );
  const itemKeyByReference = new Map<string, string>();
  for (const item of items) {
    const key = itemKeys.get(item.uuid)!;
    itemKeyByReference.set(item.uuid, key);
    if (item.id) itemKeyByReference.set(item.id, key);
  }
  const semesterById = new Map(
    semesters.map((semester) => [semester.id, semester]),
  );
  const enrollmentYear = Number.parseInt(planner.enrollmentYear, 10);

  return {
    version: 1,
    folders: includedFolders.map((folder) => ({
      key: folderKeys.get(folder.id)!,
      title: folder.title,
      parentKey:
        folder.parent && includedFolderIds.has(folder.parent)
          ? folderKeys.get(folder.parent)!
          : null,
      min: folder.min,
      max: folder.max,
      metric: folder.metric as "credits" | "courses",
      requireChildValidation: folder.requireChildValidation,
      titlePlacement: folder.titlePlacement,
      order: folder.order,
      color: folder.color ?? null,
    })),
    items: items.map((item) => {
      const semester = item.semester
        ? semesterById.get(item.semester)
        : undefined;
      const yearOffset = semester
        ? Number.parseInt(semester.year, 10) - enrollmentYear + 1
        : 0;
      const term =
        semester &&
        Number.isFinite(yearOffset) &&
        yearOffset >= 1 &&
        yearOffset <= 7 &&
        ["1", "2"].includes(semester.term)
          ? `${yearOffset}-${semester.term}`
          : null;
      return {
        key: itemKeys.get(item.uuid)!,
        courseId: item.id ?? "",
        title: item.title,
        credits: item.credits,
        folderKey:
          item.parent && folderKeys.has(item.parent)
            ? folderKeys.get(item.parent)!
            : null,
        term,
        description: item.description ?? null,
        dependson: (item.dependson ?? [])
          .map((dependency) => itemKeyByReference.get(dependency))
          .filter((dependency): dependency is string => Boolean(dependency)),
      };
    }),
  };
};

export const templatePayloadToPlannerDocs = (
  payload: PlannerTemplatePayload,
  {
    enrollmentYear,
    existingSemesters,
  }: { enrollmentYear: string; existingSemesters: SemesterDocType[] },
): PlannerTemplateDocs => {
  const folderIds = new Map(
    payload.folders.map((folder) => [folder.key, uuidv4()]),
  );
  const itemUuids = new Map(payload.items.map((item) => [item.key, uuidv4()]));
  const semestersById = new Map(
    existingSemesters.map((semester) => [semester.id, semester]),
  );
  const newSemesters: SemesterDocType[] = [];
  let nextOrder =
    existingSemesters.reduce(
      (maximum, semester) => Math.max(maximum, semester.order ?? -1),
      -1,
    ) + 1;
  const semesterIdForTerm = (relativeTerm: string | null) => {
    if (!relativeTerm || !/^[1-7]-[12]$/u.test(relativeTerm)) return null;
    const [relativeYear, term] = relativeTerm.split("-");
    const startYear = Number.parseInt(enrollmentYear, 10);
    const offset = Number.parseInt(relativeYear!, 10);
    const year = startYear + offset - 1;
    if (
      !Number.isFinite(year) ||
      !Number.isFinite(startYear) ||
      offset < 1 ||
      offset > 7
    )
      return null;
    const id = generateSemesterId(String(year), term!);
    if (!semestersById.has(id)) {
      const semester: SemesterDocType = {
        id,
        name: `${year}-${term} (${getSemesterTermLabel(term!)})`,
        status: "planned",
        year: String(year),
        term: term!,
        startDate: null,
        endDate: null,
        isActive: true,
        order: nextOrder++,
      };
      semestersById.set(id, semester);
      newSemesters.push(semester);
    }
    return id;
  };

  const convertedFolders: FolderDocType[] = payload.folders.map((folder) => ({
    id: folderIds.get(folder.key)!,
    title: folder.title,
    parent: folder.parentKey
      ? (folderIds.get(folder.parentKey) ?? "planner-1")
      : "planner-1",
    min: folder.min,
    max: folder.max,
    metric: folder.metric,
    requireChildValidation: folder.requireChildValidation,
    titlePlacement: folder.titlePlacement,
    order: folder.order,
    color: folder.color,
    expanded: null,
  }));
  const convertedItems: ItemDocType[] = payload.items.map((item, index) => ({
    uuid: itemUuids.get(item.key)!,
    id: item.courseId,
    title: item.title,
    parent: item.folderKey
      ? (folderIds.get(item.folderKey) ?? "_unsorted")
      : "_unsorted",
    credits: item.credits,
    raw_id: null,
    semester: semesterIdForTerm(item.term),
    status: "planned",
    description: item.description,
    comments: null,
    instructor: null,
    dependson: item.dependson
      .map((key) => itemUuids.get(key))
      .filter((key): key is string => Boolean(key)),
    order: index,
  }));

  return {
    folders: convertedFolders,
    items: convertedItems,
    semesters: newSemesters,
  };
};
