import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import {
  InstantSearch,
  useInstantSearch,
  useMenu,
  useSearchBox,
} from "react-instantsearch";
import { Plus } from "lucide-react";
import type { CourseSyllabusView } from "@/config/supabase";
import type { ResilientSearchClient } from "@/lib/search-client";
import { createResilientSearchClient } from "@/lib/search-client";
import {
  useLocalizedZhData,
  useLocalizedZhQuery,
} from "@/hooks/useLocalizedZh";
import { useCourseTextHits } from "@/hooks/useCourseTextHits";
import SearchBox from "@/components/SearchBox/SearchBox";
import useDictionary from "@/dictionaries/useDictionary";
import { decodeCourseText } from "@/lib/course-text";
import { FolderDocType, ItemDocType, SemesterDocType } from "../../rxdb";
import { CreateCourseDialog } from "./create-course-dialog";
import { effectiveStatus, normalizeSemesterId } from "../../lib/progress";
import { formatPlannerSemester, formatPlannerText } from "../remake/shared";
import type { CourseStatus } from "../../types";

const NONE_VALUE = "__none__";
const ALL_VALUE = "__all__";

const courseCodeKey = (value?: string | null) => {
  if (!value) return "";
  const stripped = value.replace(/^\d{3}(?:[1-3]0|-[1-3])\s*/, "").trim();
  return stripped.toLowerCase().replace(/\s+/g, " ");
};

const courseCodeFromHit = (hit: CourseSyllabusView) => {
  const rawId = hit.raw_id ?? "";
  if (/^\d{5}/.test(rawId)) return rawId.slice(5).trim();
  if (/^\d{3}-[1-3]/.test(rawId)) return rawId.slice(5).trim();
  return `${hit.department ?? ""} ${hit.course ?? ""}${hit.class ?? ""}`.trim();
};

const termFromHit = (hit: CourseSyllabusView) => {
  const rawId = hit.raw_id ?? "";
  if (/^\d{5}/.test(rawId)) return rawId.slice(0, 5);
  const legacy = rawId.match(/^\d{3}-[1-3]/);
  return legacy?.[0] ?? "";
};

interface CourseAssignment {
  folderId?: string;
  semesterId?: string;
}

interface AddSearchContentProps {
  searchClient: ResilientSearchClient;
  items: ItemDocType[];
  folders: FolderDocType[];
  semesters: SemesterDocType[];
  now: string;
  defaultFolderId: string;
  defaultSemesterId: string;
  onDefaultFolderChange: (folderId: string) => void;
  onDefaultSemesterChange: (semesterId: string) => void;
  onAddCourse: (
    course: CourseSyllabusView,
    folderId: string,
    semesterId?: string,
  ) => Promise<void>;
}

function AddSearchContent({
  searchClient,
  items,
  folders,
  semesters,
  now,
  defaultFolderId,
  defaultSemesterId,
  onDefaultFolderChange,
  onDefaultSemesterChange,
  onAddCourse,
}: AddSearchContentProps) {
  const dict = useDictionary();
  const t = dict.planner.remake;
  const { hits, showMore, isLastPage } = useCourseTextHits(searchClient, {
    showPrevious: false,
  });
  const { status } = useInstantSearch();
  const { query } = useSearchBox();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [assignments, setAssignments] = useState<
    Record<string, CourseAssignment>
  >({});
  const [addedCodes, setAddedCodes] = useState<Record<string, boolean>>({});
  const [isAddingCode, setIsAddingCode] = useState<Record<string, boolean>>({});
  const { items: semesterFilters, refine } = useMenu({
    attribute: "semester",
    limit: 100,
  });
  const [filterSemester, setFilterSemester] = useState(ALL_VALUE);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!query.trim() || !target || isLastPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) showMore();
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [isLastPage, query, showMore]);

  const uniqueHits = useMemo(() => {
    const grouped = new Map<string, CourseSyllabusView[]>();
    for (const hit of hits) {
      const code = courseCodeKey(courseCodeFromHit(hit));
      const key =
        code || hit.raw_id || `${hit.department}-${hit.course}-${hit.class}`;
      const group = grouped.get(key) ?? [];
      group.push(hit);
      grouped.set(key, group);
    }
    return [...grouped.entries()].map(([code, offers]) => ({
      code,
      course: offers[0],
      offeredTerms: [
        ...new Set(
          offers.map(termFromHit).filter(Boolean).map(normalizeSemesterId),
        ),
      ].sort((left, right) => right.localeCompare(left)),
    }));
  }, [hits]);

  const existingByCode = useMemo(() => {
    const result = new Map<string, ItemDocType[]>();
    for (const item of items) {
      for (const code of [courseCodeKey(item.raw_id), courseCodeKey(item.id)]) {
        if (!code) continue;
        const existing = result.get(code) ?? [];
        if (!existing.some((entry) => entry.uuid === item.uuid)) {
          existing.push(item);
          result.set(code, existing);
        }
      }
    }
    return result;
  }, [items]);

  const visibleFolders = folders
    .filter((folder) => folder.id !== "planner-1")
    .sort((left, right) => left.order - right.order);
  const semesterOptions = useMemo(() => {
    const values = [...semesters.map((semester) => semester.id), now];
    return [...new Set(values)].sort((left, right) =>
      normalizeSemesterId(left).localeCompare(normalizeSemesterId(right)),
    );
  }, [now, semesters]);

  const handleAdd = async (
    course: CourseSyllabusView,
    code: string,
    defaultFolderId: string,
    defaultSemesterId: string,
  ) => {
    const assignment = assignments[code];
    setIsAddingCode((previous) => ({ ...previous, [code]: true }));
    try {
      await onAddCourse(
        course,
        assignment?.folderId ?? defaultFolderId,
        assignment?.semesterId ?? defaultSemesterId,
      );
      setAddedCodes((previous) => ({ ...previous, [code]: true }));
    } finally {
      setIsAddingCode((previous) => ({ ...previous, [code]: false }));
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border p-4 md:px-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <SearchBox
            placeholder={t.searchPlaceholder}
            autoFocus
            className="h-10 min-w-0 flex-1"
          />
          <div className="flex shrink-0 items-center gap-2">
            <Label
              htmlFor="planner-add-term-filter"
              className="text-xs text-muted-foreground"
            >
              {t.offeredTermLabel}
            </Label>
            <Select
              value={filterSemester}
              onValueChange={(value) => {
                setFilterSemester(value);
                refine(value === ALL_VALUE ? "" : value);
              }}
            >
              <SelectTrigger
                id="planner-add-term-filter"
                className="h-9 w-36 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>
                  {dict.planner.coursePicker.all}
                </SelectItem>
                {semesterFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {formatPlannerSemester(filter.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="shrink-0 text-sm text-muted-foreground">
            {t.addTo}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <Select
              value={defaultFolderId}
              onValueChange={onDefaultFolderChange}
            >
              <SelectTrigger
                className="h-9 w-full sm:w-44"
                aria-label={t.categoryLabel}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planner-1">{t.noneCategory}</SelectItem>
                {visibleFolders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={defaultSemesterId || NONE_VALUE}
              onValueChange={(value) =>
                onDefaultSemesterChange(value === NONE_VALUE ? "" : value)
              }
            >
              <SelectTrigger
                className="h-9 w-full sm:w-36"
                aria-label={t.termLabel}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>{t.noneTerm}</SelectItem>
                {semesterOptions.map((semesterId) => (
                  <SelectItem key={semesterId} value={semesterId}>
                    {formatPlannerSemester(semesterId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="hidden text-xs text-muted-foreground md:block">
            {t.rowAssignmentHint}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 md:px-4">
        {!query.trim() && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t.searchHint}
          </p>
        )}
        {query.trim() &&
          uniqueHits.map(({ code, course, offeredTerms }) => {
            const existing = existingByCode.get(code) ?? [];
            const alreadyAdded = addedCodes[code];
            const completed = existing.find(
              (item) =>
                effectiveStatus(item, now) === "completed" &&
                Boolean(item.semester),
            );
            const blocked = existing.length > 0 || alreadyAdded;
            const termId = assignments[code]?.semesterId ?? defaultSemesterId;
            const folderId = assignments[code]?.folderId ?? defaultFolderId;
            const rawId = courseCodeFromHit(course);
            const teacher = (course.teacher_zh ?? [])
              .map(decodeCourseText)
              .join(", ");
            const recentTerms = offeredTerms
              .slice(0, 3)
              .map(formatPlannerSemester)
              .join(t.termListSeparator);
            const title = [course.name_zh, course.name_en]
              .filter(Boolean)
              .map(decodeCourseText);

            return (
              <div
                key={
                  code ||
                  course.raw_id ||
                  `${course.department}-${course.course}-${course.class}`
                }
                className={`flex flex-col gap-3 border-b border-border py-3 sm:flex-row sm:items-center ${blocked ? "opacity-55" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{title[0]}</span>
                    {title[1] && (
                      <span className="text-xs text-muted-foreground">
                        {title[1]}
                      </span>
                    )}
                    {alreadyAdded && (
                      <span className="rounded bg-muted px-1.5 py-1 text-xs">
                        {t.resultAdded}
                      </span>
                    )}
                    {!alreadyAdded && completed?.semester && (
                      <span className="rounded bg-muted px-1.5 py-1 text-xs">
                        {formatPlannerText(t.alreadyTaken, {
                          semester: formatPlannerSemester(completed.semester),
                        })}
                      </span>
                    )}
                    {!alreadyAdded && existing.length > 0 && !completed && (
                      <span className="rounded bg-muted px-1.5 py-1 text-xs">
                        {t.alreadyPlanned}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    <span>{rawId}</span>
                    <span>•</span>
                    <span>
                      {formatPlannerText(t.credits, {
                        count: course.credits ?? 0,
                      })}
                    </span>
                    {teacher && (
                      <>
                        <span>•</span>
                        <span>{teacher}</span>
                      </>
                    )}
                    {recentTerms && (
                      <>
                        <span>•</span>
                        <span>
                          {formatPlannerText(t.recentTerms, {
                            terms: recentTerms,
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {!blocked && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select
                      value={folderId}
                      onValueChange={(value) =>
                        setAssignments((previous) => ({
                          ...previous,
                          [code]: { ...previous[code], folderId: value },
                        }))
                      }
                    >
                      <SelectTrigger
                        className="h-8 w-full sm:w-36"
                        aria-label={t.categoryLabel}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planner-1">
                          {t.noneCategory}
                        </SelectItem>
                        {visibleFolders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={termId || NONE_VALUE}
                      onValueChange={(value) =>
                        setAssignments((previous) => ({
                          ...previous,
                          [code]: {
                            ...previous[code],
                            semesterId: value === NONE_VALUE ? "" : value,
                          },
                        }))
                      }
                    >
                      <SelectTrigger
                        className="h-8 w-full sm:w-28"
                        aria-label={t.termLabel}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>{t.noneTerm}</SelectItem>
                        {semesterOptions.map((semesterId) => (
                          <SelectItem key={semesterId} value={semesterId}>
                            {formatPlannerSemester(semesterId)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 shrink-0"
                      disabled={isAddingCode[code]}
                      onClick={() =>
                        void handleAdd(
                          course,
                          code,
                          defaultFolderId,
                          defaultSemesterId,
                        )
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      {isAddingCode[code] ? dict.common.loading : t.resultAdd}
                    </Button>
                  </div>
                )}
                {blocked && !alreadyAdded && !completed && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t.alreadyPlanned}
                  </span>
                )}
              </div>
            );
          })}
        {query.trim() && status === "loading" && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t.searching}
          </p>
        )}
        {query.trim() && status === "idle" && uniqueHits.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t.noResults}
          </p>
        )}
        <div ref={sentinelRef} className="h-8" />
        {query.trim() && !isLastPage && uniqueHits.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-4 w-full"
            onClick={showMore}
          >
            {dict.planner.coursePicker.showMore}
          </Button>
        )}
      </div>
    </div>
  );
}

interface PlannerAddCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FolderDocType[];
  items: ItemDocType[];
  semesters: SemesterDocType[];
  now: string;
  initialFolderId?: string;
  initialSemesterId?: string;
  onAddCourse: (
    course: CourseSyllabusView,
    folderId: string,
    semesterId?: string,
  ) => Promise<void>;
  onCreateCourse: (course: {
    uuid: string;
    id: string;
    title: string;
    credits: number;
    status: CourseStatus;
    parent: string | null;
    order: number;
    dependson: string[];
    semester?: string;
  }) => Promise<void>;
}

export function PlannerAddCourseDialog({
  open,
  onOpenChange,
  folders,
  items,
  semesters,
  now,
  initialFolderId,
  initialSemesterId,
  onAddCourse,
  onCreateCourse,
}: PlannerAddCourseDialogProps) {
  const dict = useDictionary();
  const localizeQuery = useLocalizedZhQuery();
  const localizeSearchText = useLocalizedZhData();
  const searchClient = useMemo(
    () =>
      createResilientSearchClient({
        localQueryTransform: localizeQuery,
        localSearchTextTransform: localizeSearchText,
      }),
    [localizeQuery, localizeSearchText],
  );
  const currentTerm = semesters.some(
    (semester) => normalizeSemesterId(semester.id) === normalizeSemesterId(now),
  )
    ? (semesters.find(
        (semester) =>
          normalizeSemesterId(semester.id) === normalizeSemesterId(now),
      )?.id ?? now)
    : now;
  const defaultFolder = useMemo(() => {
    const category = [...folders]
      .filter(
        (folder) => folder.parent === "planner-1" && folder.id !== "_unsorted",
      )
      .sort((left, right) => left.order - right.order)[0];
    return (
      category?.id ??
      (folders.some((folder) => folder.id === "_unsorted")
        ? "_unsorted"
        : "planner-1")
    );
  }, [folders]);
  const [folderId, setFolderId] = useState(initialFolderId ?? "planner-1");
  const [semesterId, setSemesterId] = useState(
    initialSemesterId ?? currentTerm,
  );
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialFolderId) setFolderId(initialFolderId);
    else if (folderId === "planner-1") setFolderId(defaultFolder);
    if (initialSemesterId) setSemesterId(initialSemesterId);
  }, [defaultFolder, folderId, open, initialFolderId, initialSemesterId]);

  const onCreateManual = async (course: {
    uuid: string;
    id: string;
    title: string;
    credits: number;
    status: CourseStatus;
    parent: string | null;
    order: number;
    dependson: string[];
    semester?: string;
  }) => onCreateCourse(course);

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName="nthu_courses"
      routing={false}
    >
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          style={{ gap: 0, padding: 0 }}
          className="fixed left-0 top-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 sm:max-w-none md:left-1/2 md:top-1/2 md:h-[min(850px,calc(100dvh-4rem))] md:w-[min(760px,calc(100vw-2rem))] md:max-w-[760px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:border"
        >
          <DialogHeader className="shrink-0 border-b border-border px-4 py-4 text-left md:px-4">
            <DialogTitle>{dict.planner.remake.searchTitle}</DialogTitle>
          </DialogHeader>
          <AddSearchContent
            searchClient={searchClient}
            items={items}
            folders={folders}
            semesters={semesters}
            now={now}
            defaultFolderId={folderId}
            defaultSemesterId={semesterId}
            onDefaultFolderChange={setFolderId}
            onDefaultSemesterChange={setSemesterId}
            onAddCourse={onAddCourse}
          />
          <div className="shrink-0 border-t border-border px-4 py-3 md:px-4">
            <Button
              type="button"
              variant="link"
              className="h-auto px-1 text-primary"
              onClick={() => setCreateOpen(true)}
            >
              {dict.planner.remake.createCourseLink}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <CreateCourseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        selectedFolder={folderId}
        selectedSemester={semesterId}
        folders={folders}
        semesters={semesters}
        onCreateCourse={onCreateManual}
      />
    </InstantSearch>
  );
}
