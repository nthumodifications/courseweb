import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useRxCollection } from "rxdb-hooks";
import { v4 as uuidv4 } from "uuid";
import { Button, toast } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { decodeCourseText } from "@/lib/course-text";
import type {
  FolderDocType,
  ItemDocType,
  PlannerDataDocType,
} from "../../rxdb";
import { createCourseItem } from "../../data/courses";
import {
  detectDepartmentTag,
  mergeTimetableCourses,
  guessCourseCategory,
} from "../../lib/setup";
import { normalizeSemesterId } from "../../lib/progress";
import { formatPlannerText } from "../remake/shared";
import { ResponsiveDialog } from "../responsive-dialog";
import {
  selectedHistoryCourses,
  TimetableCourseSelection,
  usePlannerTimetableHistory,
} from "./timetable-course-selection";

interface TimetableImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planner: PlannerDataDocType | null;
  folders: FolderDocType[];
  items: ItemDocType[];
  currentSemesterId: string;
}

export function TimetableImportDialog({
  open,
  onOpenChange,
  planner,
  folders,
  items,
  currentSemesterId,
}: TimetableImportDialogProps) {
  const dict = useDictionary();
  const t = dict.planner.setup as Record<string, string>;
  const { lang = "zh" } = useParams<{ lang: string }>();
  const startYear = planner?.enrollmentYear || currentSemesterId.slice(0, 3);
  const history = usePlannerTimetableHistory(startYear, currentSemesterId);
  const [selectedTerms, setSelectedTerms] = useState<Record<string, boolean>>(
    {},
  );
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const itemsCol = useRxCollection<ItemDocType>("items");

  useEffect(() => {
    if (open) {
      setSelectedTerms({});
      setAssignments({});
    }
  }, [open]);

  const terms = useMemo(
    () =>
      history.terms
        .map((term) => ({
          ...term,
          courses: mergeTimetableCourses(term.courses, items),
        }))
        .filter((term) => term.courses.length > 0),
    [history.terms, items],
  );
  const now = normalizeSemesterId(currentSemesterId);
  const selectedTermIds = useMemo(
    () =>
      new Set(
        terms
          .filter(
            (term) =>
              selectedTerms[term.id] ?? normalizeSemesterId(term.id) <= now,
          )
          .map((term) => term.id),
      ),
    [now, selectedTerms, terms],
  );
  const selectedCourses = useMemo(
    () => selectedHistoryCourses(terms, selectedTermIds),
    [selectedTermIds, terms],
  );
  const detectedDepartmentTag = useMemo(
    () => detectDepartmentTag(selectedCourses, startYear),
    [selectedCourses, startYear],
  );

  const importCourses = async () => {
    if (!itemsCol || selectedCourses.length === 0 || isImporting) return;
    setIsImporting(true);
    try {
      const uniqueCourses = mergeTimetableCourses(selectedCourses, items);
      let order = items.length
        ? Math.max(...items.map((item) => item.order)) + 1
        : 0;
      for (const course of uniqueCourses) {
        const rawId = course.raw_id ?? "";
        const title = [course.name_zh, course.name_en]
          .filter(Boolean)
          .map(decodeCourseText)
          .join(" ");
        const requestedCategoryId = assignments[rawId];
        const categoryId =
          requestedCategoryId === "_unsorted" ||
          folders.some((folder) => folder.id === requestedCategoryId)
            ? requestedCategoryId
            : guessCourseCategory(
                course,
                planner?.department ?? "",
                folders,
                startYear,
                detectedDepartmentTag,
              );
        const id = rawId
          ? rawId.replace(/^\d{5}/, "").trim()
          : `${course.department} ${course.course}${course.class}`.trim();
        await createCourseItem(itemsCol, {
          uuid: uuidv4(),
          id,
          raw_id: rawId || null,
          title: title || id,
          credits: course.credits ?? 0,
          parent: categoryId || "_unsorted",
          status: "planned",
          order,
          dependson: [],
          semester: course.plannerSemester,
        } as ItemDocType);
        order += 1;
      }
      toast({
        title: formatPlannerText(t.importAddedToast, {
          count: uniqueCourses.length,
        }),
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Could not import timetable courses:", error);
      toast({ title: t.importFailedToast, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const footer = (
    <div className="flex w-full justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
      >
        {dict.planner.common.cancel}
      </Button>
      <Button
        type="button"
        disabled={
          !history.isReady || selectedCourses.length === 0 || isImporting
        }
        onClick={() => void importCourses()}
      >
        {formatPlannerText(t.importSelected, { count: selectedCourses.length })}
      </Button>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.importFromTimetableTitle}
      description={t.importFromTimetableDescription}
      footer={footer}
      contentClassName="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
    >
      <div className="space-y-3 pb-3">
        {!history.isReady && (
          <p className="text-sm text-muted-foreground">{t.loadingHistory}</p>
        )}
        {history.isReady && history.hasError && (
          <p className="text-sm text-muted-foreground">{t.historyLoadError}</p>
        )}
        {history.isReady && !history.hasError && terms.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {history.terms.length > 0
              ? t.importNoNewCourses
              : t.noTimetableHistory}
          </p>
        )}
        {history.isReady && !history.hasError && terms.length > 0 && (
          <TimetableCourseSelection
            terms={terms}
            currentSemesterId={currentSemesterId}
            folders={folders}
            department={planner?.department ?? ""}
            enrollmentYear={startYear}
            selectedTermIds={selectedTermIds}
            onToggleTerm={(termId, checked) =>
              setSelectedTerms((previous) => ({
                ...previous,
                [termId]: checked,
              }))
            }
            assignments={assignments}
            onAssignmentChange={(rawId, folderId) =>
              setAssignments((previous) => ({ ...previous, [rawId]: folderId }))
            }
            lang={lang}
          />
        )}
      </div>
    </ResponsiveDialog>
  );
}
