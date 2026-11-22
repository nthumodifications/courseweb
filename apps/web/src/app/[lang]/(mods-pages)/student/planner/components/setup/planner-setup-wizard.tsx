import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useQuery } from "@tanstack/react-query";
import { useRxCollection } from "rxdb-hooks";
import { v4 as uuidv4 } from "uuid";
import {
  usePlannerTemplates,
  useMarkPlannerTemplateUsed,
  type PlannerTemplate,
} from "@/lib/planner-templates";
import { plannerTemplateEvents } from "@/lib/trackingEvents";
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@courseweb/ui";
import {
  CalendarRange,
  Check,
  ChevronDown,
  FileText,
  Grid2X2,
  ListChecks,
  Plus,
  Trash2,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import client from "@/config/api";
import { decodeCourseText } from "@/lib/course-text";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import type {
  FolderDocType,
  ItemDocType,
  PlannerDataDocType,
  SemesterDocType,
} from "../../rxdb";
import { createCourseItem } from "../../data/courses";
import { createFolder, ensureUnsortedFolder } from "../../data/folders";
import { getSemesters } from "../../data/semesters";
import {
  createPlannerData,
  getPlannerData,
  updatePlannerData,
} from "../../data/planner";
import {
  getFolderColorDotClass,
  FOLDER_COLOR_NAMES,
} from "../../lib/folder-colors";
import {
  parseFolderTemplate,
  type FolderTemplateEntry,
} from "../../lib/folder-template";
import {
  defaultGraduationYear,
  dedupeTimetableCourses,
  detectDepartmentTag,
  enumerateTermsFromEnrollment,
  guessCourseCategory,
  mergeTemplateAndTimetableItems,
  normalizePlannerCourseCode,
  parseEnrollmentYearFromStudentId,
} from "../../lib/setup";
import { templatePayloadToPlannerDocs } from "../../lib/templates";
import { normalizeSemesterId } from "../../lib/progress";
import { formatPlannerText } from "../remake/shared";
import {
  selectedHistoryCourses,
  TimetableCourseSelection,
  TimetableHistoryTerm,
  usePlannerTimetableHistory,
} from "./timetable-course-selection";
import { TemplateGalleryDialog } from "../dialogs/template-gallery-dialog";

type ViewChoice = "checklist" | "board" | "matrix";
type CategoryChoice = "hosted" | "default" | "file" | "none";

interface CategoryDraft {
  id: string;
  parent: string;
  title: string;
  min: string;
  color: string;
}

interface PlannerSetupWizardProps {
  currentSemesterId: string;
  onDismiss: () => void;
  onComplete: (view: ViewChoice) => void;
}

interface DepartmentOption {
  college: string;
  name: string;
  years: { year: string; pdfUrl: string }[];
}

const rocYearNow = () => String(new Date().getFullYear() - 1911);

function makeDefaultCategories(t: Record<string, string>): CategoryDraft[] {
  return [
    {
      id: "setup-core",
      parent: "planner-1",
      title: t.coreCategory,
      min: "",
      color: "blue",
    },
    {
      id: "setup-chinese",
      parent: "setup-core",
      title: t.chineseCategory,
      min: "",
      color: "sky",
    },
    {
      id: "setup-english",
      parent: "setup-core",
      title: t.englishCategory,
      min: "",
      color: "cyan",
    },
    {
      id: "setup-pe",
      parent: "setup-core",
      title: t.peCategory,
      min: "",
      color: "teal",
    },
    {
      id: "setup-general-education",
      parent: "planner-1",
      title: t.generalEducationCategory,
      min: "",
      color: "green",
    },
    {
      id: "setup-major-required",
      parent: "planner-1",
      title: t.majorRequiredCategory,
      min: "",
      color: "amber",
    },
    {
      id: "setup-major-elective",
      parent: "planner-1",
      title: t.majorElectiveCategory,
      min: "",
      color: "violet",
    },
    {
      id: "setup-free-elective",
      parent: "planner-1",
      title: t.freeElectiveCategory,
      min: "",
      color: "neutral",
    },
  ];
}

export function PlannerSetupWizard({
  currentSemesterId,
  onDismiss,
  onComplete,
}: PlannerSetupWizardProps) {
  const dict = useDictionary();
  const t = dict.planner.setup as Record<string, string>;
  const common = dict.planner.common;
  const auth = useAuth();
  const { lang = "zh" } = useParams<{ lang: string }>();
  const normalizedNow = normalizeSemesterId(currentSemesterId);
  const studentId =
    typeof auth.user?.profile?.sub === "string" ? auth.user.profile.sub : "";
  const studentYear = parseEnrollmentYearFromStudentId(studentId);
  const fallbackYear = normalizedNow.slice(0, 3) || rocYearNow();

  const [step, setStep] = useState(0);
  const [department, setDepartment] = useState("");
  const [departmentPickerOpen, setDepartmentPickerOpen] = useState(false);
  const [enrollmentYear, setEnrollmentYear] = useState(
    studentYear ?? fallbackYear,
  );
  const [enrollmentFromId, setEnrollmentFromId] = useState(
    Boolean(studentYear),
  );
  const [enrollmentEdited, setEnrollmentEdited] = useState(false);
  const [graduationYear, setGraduationYear] = useState(
    defaultGraduationYear(studentYear ?? fallbackYear),
  );
  const [graduationYearEdited, setGraduationYearEdited] = useState(false);
  const [requiredCredits, setRequiredCredits] = useState("128");
  const [categoryChoice, setCategoryChoice] =
    useState<CategoryChoice>("default");
  const [selectedHostedTemplate, setSelectedHostedTemplate] =
    useState<PlannerTemplate | null>(null);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [categoryDrafts, setCategoryDrafts] = useState<CategoryDraft[]>(() =>
    makeDefaultCategories(t),
  );
  const [templateFolders, setTemplateFolders] = useState<
    FolderTemplateEntry[] | null
  >(null);
  const [templateName, setTemplateName] = useState("");
  const [templateError, setTemplateError] = useState(false);
  const [viewChoice, setViewChoice] = useState<ViewChoice>("checklist");
  const [selectedTerms, setSelectedTerms] = useState<Record<string, boolean>>(
    {},
  );
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const plannerCol = useRxCollection<PlannerDataDocType>("plannerdata");
  const foldersCol = useRxCollection<FolderDocType>("folders");
  const itemsCol = useRxCollection<ItemDocType>("items");
  const semesterCol = useRxCollection<SemesterDocType>("semesters");
  const markTemplateUsed = useMarkPlannerTemplateUsed();

  const hostedTemplatesQuery = usePlannerTemplates(
    {
      department: department.trim() || undefined,
      entranceYear: /^\d{3}$/.test(enrollmentYear) ? enrollmentYear : undefined,
    },
    { enabled: Boolean(department.trim() && /^\d{3}$/.test(enrollmentYear)) },
  );
  const hasHostedTemplates =
    (hostedTemplatesQuery.data?.templates.length ?? 0) > 0;

  useEffect(() => {
    if (
      selectedHostedTemplate &&
      (selectedHostedTemplate.department !== department ||
        selectedHostedTemplate.entranceYear !== enrollmentYear)
    ) {
      setSelectedHostedTemplate(null);
      setTemplateError(false);
      if (categoryChoice === "hosted") setCategoryChoice("default");
    }
  }, [categoryChoice, department, enrollmentYear, selectedHostedTemplate]);

  const {
    data: departmentOptions = [],
    isError: departmentLoadFailed,
    isLoading: departmentsLoading,
  } = useQuery({
    queryKey: ["graduation-departments"],
    queryFn: async (): Promise<DepartmentOption[]> => {
      const response = await client.graduation.colleges.$get();
      if (!response.ok) throw new Error("Could not load departments");
      const data = await response.json();
      return data.colleges.flatMap((college) =>
        college.departments.map((entry) => ({
          college: college.name,
          name: entry.name,
          years: entry.years.map(({ year, pdfUrl }) => ({ year, pdfUrl })),
        })),
      );
    },
  });

  const availableDepartment = departmentOptions.find(
    (entry) => entry.name === department,
  );
  const requirementPdf = availableDepartment?.years.find(
    (entry) => entry.year === enrollmentYear,
  );

  useEffect(() => {
    if (studentYear && !enrollmentEdited && !enrollmentFromId) {
      setEnrollmentYear(studentYear);
      setEnrollmentFromId(true);
      if (!graduationYearEdited)
        setGraduationYear(defaultGraduationYear(studentYear));
    }
  }, [enrollmentEdited, enrollmentFromId, graduationYearEdited, studentYear]);

  useEffect(() => {
    if (!graduationYearEdited && /^\d{3}$/.test(enrollmentYear)) {
      setGraduationYear(defaultGraduationYear(enrollmentYear));
    }
  }, [enrollmentYear, graduationYearEdited]);

  const history = usePlannerTimetableHistory(enrollmentYear, currentSemesterId);
  const terms = history.terms;
  const selectedTermIds = useMemo(
    () =>
      new Set(
        terms
          .filter(
            (term) =>
              selectedTerms[term.id] ??
              normalizeSemesterId(term.id) <= normalizedNow,
          )
          .map((term) => term.id),
      ),
    [normalizedNow, selectedTerms, terms],
  );
  const activeFolders = useMemo(() => {
    if (categoryChoice === "none") return [];
    if (categoryChoice === "hosted")
      return (selectedHostedTemplate?.payload.folders ?? []).map((folder) => ({
        id: folder.key,
        title: folder.title,
        order: folder.order,
      }));
    if (categoryChoice === "file")
      return (templateFolders ?? []).map((folder, index) => ({
        id: folder.id,
        title: folder.title,
        order: folder.order ?? index,
      }));
    return categoryDrafts.map((folder, index) => ({
      id: folder.id,
      title: folder.title,
      order: index,
    }));
  }, [categoryChoice, categoryDrafts, selectedHostedTemplate, templateFolders]);
  const selectedCourses = useMemo(
    () =>
      dedupeTimetableCourses(selectedHistoryCourses(terms, selectedTermIds)),
    [selectedTermIds, terms],
  );
  const detectedDepartmentTag = useMemo(
    () => detectDepartmentTag(selectedCourses, enrollmentYear),
    [enrollmentYear, selectedCourses],
  );

  const selectHistoryTerm = (termId: string, checked: boolean) =>
    setSelectedTerms((previous) => ({ ...previous, [termId]: checked }));

  const selectTemplateFile = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = parseFolderTemplate(await file.text());
      setTemplateFolders(parsed);
      setTemplateName(file.name);
      setTemplateError(false);
    } catch {
      setTemplateFolders(null);
      setTemplateName("");
      setTemplateError(true);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const skipStep = () => {
    if (step === 1 && categoryChoice === "file" && !templateFolders) {
      setCategoryChoice("default");
    }
    if (step === 1 && categoryChoice === "hosted" && !selectedHostedTemplate) {
      setCategoryChoice("default");
    }
    if (step === 2) {
      setSelectedTerms(
        Object.fromEntries(terms.map((term) => [term.id, false])),
      );
    }
    setStep((previous) => Math.min(previous + 1, 3));
  };

  const changeDraft = (id: string, change: Partial<CategoryDraft>) =>
    setCategoryDrafts((previous) =>
      previous.map((folder) =>
        folder.id === id ? { ...folder, ...change } : folder,
      ),
    );

  const addCategory = () => {
    const id = `setup-category-${uuidv4()}`;
    setCategoryDrafts((previous) => [
      ...previous,
      {
        id,
        parent: "planner-1",
        title: t.newCategory,
        min: "",
        color:
          FOLDER_COLOR_NAMES[(previous.length + 3) % FOLDER_COLOR_NAMES.length],
      },
    ]);
  };

  const removeCategory = (id: string) => {
    setCategoryDrafts((previous) => {
      const removed = new Set([id]);
      let added = true;
      while (added) {
        added = false;
        for (const folder of previous) {
          if (removed.has(folder.parent) && !removed.has(folder.id)) {
            removed.add(folder.id);
            added = true;
          }
        }
      }
      return previous.filter((folder) => !removed.has(folder.id));
    });
  };

  const finishSetup = async () => {
    if (!plannerCol || !foldersCol || !itemsCol || saving) return;
    if (
      (categoryChoice === "file" && !templateFolders) ||
      (categoryChoice === "hosted" && !selectedHostedTemplate)
    ) {
      setTemplateError(true);
      return;
    }

    setSaving(true);
    try {
      const enteredCredits = Number(requiredCredits);
      const safeRequiredCredits =
        Number.isFinite(enteredCredits) && enteredCredits >= 0
          ? enteredCredits
          : 128;
      const safeEnrollmentYear = /^\d{3}$/.test(enrollmentYear)
        ? enrollmentYear
        : fallbackYear;
      const safeGraduationYear =
        /^\d{3}$/.test(graduationYear) &&
        Number(graduationYear) >= Number(safeEnrollmentYear)
          ? graduationYear
          : defaultGraduationYear(safeEnrollmentYear);
      const planner: PlannerDataDocType = {
        id: "planner-1",
        title: department.trim() || t.defaultPlannerTitle,
        department: department.trim(),
        enrollmentYear: safeEnrollmentYear,
        graduationYear: safeGraduationYear,
        requiredCredits: safeRequiredCredits,
        includedSemesters: enumerateTermsFromEnrollment(
          safeEnrollmentYear,
          `${String(Number(safeGraduationYear)).padStart(3, "0")}30`,
        ),
        description: null,
      };
      const existingSemesters = semesterCol
        ? await getSemesters(semesterCol)
        : [];
      const hostedTemplateDocs =
        categoryChoice === "hosted" && selectedHostedTemplate
          ? templatePayloadToPlannerDocs(selectedHostedTemplate.payload, {
              enrollmentYear: safeEnrollmentYear,
              existingSemesters,
            })
          : null;
      const folderDocs: FolderDocType[] =
        categoryChoice === "none"
          ? []
          : categoryChoice === "hosted"
            ? (hostedTemplateDocs?.folders ?? [])
            : categoryChoice === "file"
              ? ((templateFolders ?? [])
                  .filter(
                    (folder) =>
                      folder.id !== "_unsorted" && folder.id !== "planner-1",
                  )
                  .map((folder, index) => ({
                    ...folder,
                    color:
                      FOLDER_COLOR_NAMES[index % FOLDER_COLOR_NAMES.length],
                    expanded: false,
                  })) as FolderDocType[])
              : categoryDrafts
                  .filter((folder) => folder.title.trim())
                  .map((folder, index) => ({
                    id: folder.id,
                    title: folder.title.trim(),
                    parent: folder.parent,
                    min: Math.max(0, Number(folder.min) || 0),
                    max: 0,
                    metric: "credits" as const,
                    requireChildValidation: false,
                    titlePlacement: "top",
                    order:
                      folder.parent === "planner-1"
                        ? categoryDrafts
                            .filter(
                              (candidate) => candidate.parent === "planner-1",
                            )
                            .findIndex(
                              (candidate) => candidate.id === folder.id,
                            )
                        : categoryDrafts
                            .filter(
                              (candidate) => candidate.parent === folder.parent,
                            )
                            .findIndex(
                              (candidate) => candidate.id === folder.id,
                            ),
                    color:
                      folder.color ||
                      FOLDER_COLOR_NAMES[index % FOLDER_COLOR_NAMES.length],
                    expanded: false,
                  }));

      const existingPlanner = await getPlannerData(plannerCol);
      if (existingPlanner) {
        await updatePlannerData(plannerCol, {
          title: planner.title,
          department: planner.department,
          enrollmentYear: planner.enrollmentYear,
          graduationYear: planner.graduationYear,
          requiredCredits: planner.requiredCredits,
          includedSemesters: planner.includedSemesters,
          description: planner.description,
        });
      } else {
        await createPlannerData(plannerCol, planner);
      }
      for (const folder of folderDocs) await createFolder(foldersCol, folder);
      await ensureUnsortedFolder(foldersCol);

      const timetableItems = selectedCourses.map((course, index) => {
        const rawId = course.raw_id ?? "";
        const assignmentKey =
          rawId || `${course.plannerSemester}:${course.course}`;
        const requestedParent = assignments[assignmentKey];
        const requestedFolderId =
          categoryChoice === "hosted" && requestedParent
            ? hostedTemplateDocs?.folderIdByKey.get(requestedParent)
            : requestedParent;
        const guessedParent = guessCourseCategory(
          course,
          department,
          folderDocs,
          enrollmentYear,
          detectedDepartmentTag,
        );
        const title = [course.name_zh, course.name_en]
          .filter(Boolean)
          .map(decodeCourseText)
          .join(" ");
        const id = rawId
          ? rawId.replace(/^\d{5}/, "").trim()
          : `${course.department} ${course.course}${course.class}`.trim();
        const normalizedCode = normalizePlannerCourseCode(id);
        const matchingTemplateItem = hostedTemplateDocs?.items.find(
          (item) => normalizePlannerCourseCode(item.id) === normalizedCode,
        );
        const parent =
          requestedParent === "_unsorted"
            ? "_unsorted"
            : requestedFolderId &&
                folderDocs.some((folder) => folder.id === requestedFolderId)
              ? requestedFolderId
              : guessedParent !== "_unsorted"
                ? guessedParent
                : (matchingTemplateItem?.parent ?? "_unsorted");
        return {
          uuid: uuidv4(),
          id,
          raw_id: rawId || null,
          title: title || id,
          credits: course.credits ?? 0,
          parent: parent || "_unsorted",
          status: "planned",
          order: (hostedTemplateDocs?.items.length ?? 0) + index,
          dependson: [],
          semester: course.plannerSemester,
        } as ItemDocType;
      });
      const courseItems = hostedTemplateDocs
        ? mergeTemplateAndTimetableItems(
            hostedTemplateDocs.items,
            timetableItems,
          )
        : timetableItems;
      if (hostedTemplateDocs?.semesters.length && semesterCol) {
        await semesterCol.bulkInsert(hostedTemplateDocs.semesters);
      }
      for (const item of courseItems) await createCourseItem(itemsCol, item);

      if (selectedHostedTemplate && categoryChoice === "hosted") {
        void markTemplateUsed
          .mutateAsync(selectedHostedTemplate.id)
          .catch(() => undefined);
        plannerTemplateEvents.applied(
          selectedHostedTemplate.id,
          selectedHostedTemplate.department,
          "replace",
        );
      }

      try {
        window.localStorage.setItem("planner:view", viewChoice);
        window.localStorage.setItem("planner:setup-dismissed", "true");
      } catch {
        // The completed planner remains usable for this session.
      }
      toast({ title: t.createdToast });
      onComplete(viewChoice);
    } catch (error) {
      console.error("Could not create planner from setup:", error);
      toast({
        title: t.createFailed,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const stageLabels = [
    t.stepBasic,
    t.stepCategories,
    t.stepCourses,
    t.stepView,
  ];

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto w-full max-w-[560px] space-y-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">
              {formatPlannerText(t.stepIndicator, {
                current: step + 1,
                total: stageLabels.length,
                name: stageLabels[step],
              })}
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
              {t.later}
            </Button>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold">{stageLabels[step]}</h2>
            <p className="text-sm text-muted-foreground">
              {
                [
                  t.basicDescription,
                  t.categoriesDescription,
                  t.coursesDescription,
                  t.viewDescription,
                ][step]
              }
            </p>
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t.departmentLabel}</Label>
                {departmentLoadFailed ? (
                  <Input
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    placeholder={t.departmentPlaceholder}
                  />
                ) : (
                  <Popover
                    open={departmentPickerOpen}
                    onOpenChange={setDepartmentPickerOpen}
                    modal
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={departmentPickerOpen}
                        className="w-full justify-between font-normal"
                        disabled={departmentsLoading}
                      >
                        <span className="truncate">
                          {department ||
                            (departmentsLoading
                              ? dict.common.loading
                              : t.departmentPlaceholder)}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[min(520px,calc(100vw-2rem))] p-1"
                      align="start"
                    >
                      <Command>
                        <CommandInput
                          placeholder={dict.common.search}
                          autoFocus
                        />
                        <CommandList>
                          <CommandEmpty>{dict.common.no_results}</CommandEmpty>
                          <CommandGroup>
                            {departmentOptions.map((entry) => (
                              <CommandItem
                                key={`${entry.name}-${entry.college}`}
                                value={`${entry.name} ${entry.college}`}
                                keywords={[entry.name, entry.college]}
                                onSelect={() => {
                                  setDepartment(entry.name);
                                  setDepartmentPickerOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${department === entry.name ? "opacity-100" : "opacity-0"}`}
                                />
                                {entry.name} ({entry.college})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="planner-setup-enrollment">
                    {t.enrollmentYearLabel}
                  </Label>
                  <Input
                    id="planner-setup-enrollment"
                    type="number"
                    min="100"
                    max={rocYearNow()}
                    value={enrollmentYear}
                    onChange={(event) => {
                      setEnrollmentYear(event.target.value);
                      setEnrollmentFromId(false);
                      setEnrollmentEdited(true);
                    }}
                  />
                  {enrollmentFromId && (
                    <p className="text-xs text-muted-foreground">
                      {t.studentIdHint}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="planner-setup-graduation">
                    {t.graduationYearLabel}
                  </Label>
                  <Input
                    id="planner-setup-graduation"
                    type="number"
                    min="100"
                    value={graduationYear}
                    onChange={(event) => {
                      setGraduationYear(event.target.value);
                      setGraduationYearEdited(true);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="planner-setup-credits">
                    {t.requiredCreditsLabel}
                  </Label>
                  <Input
                    id="planner-setup-credits"
                    type="number"
                    min="0"
                    value={requiredCredits}
                    onChange={(event) => setRequiredCredits(event.target.value)}
                  />
                </div>
              </div>

              {requirementPdf && (
                <a
                  href={requirementPdf.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4"
                >
                  <FileText className="h-4 w-4" />
                  {formatPlannerText(t.requirementsPdf, {
                    year: requirementPdf.year,
                  })}
                </a>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <RadioGroup
                value={categoryChoice}
                onValueChange={(value) => {
                  setCategoryChoice(value as CategoryChoice);
                  setTemplateError(false);
                }}
                className="space-y-2"
              >
                {[
                  ...(hasHostedTemplates
                    ? [{ value: "hosted" as const, label: "hosted" }]
                    : []),
                  { value: "default" as const, label: "default" },
                  { value: "file" as const, label: "template" },
                  { value: "none" as const, label: "none" },
                ].map(({ value: choice, label }) => (
                  <Label
                    key={choice}
                    htmlFor={`planner-setup-category-${choice}`}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3"
                  >
                    <RadioGroupItem
                      id={`planner-setup-category-${choice}`}
                      value={choice}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {t[`categoryChoice_${label}`]}
                      </span>
                      <span className="block text-xs leading-relaxed text-muted-foreground">
                        {t[`categoryChoice_${label}_description`]}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>

              {categoryChoice === "default" && (
                <div className="space-y-3 rounded-md border border-border p-3">
                  {requirementPdf && (
                    <a
                      href={requirementPdf.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4"
                    >
                      <FileText className="h-4 w-4" />
                      {t.categoryPdf}
                    </a>
                  )}
                  <div className="space-y-2">
                    {categoryDrafts.map((folder) => (
                      <div
                        key={folder.id}
                        className={`flex min-w-0 items-center gap-2 ${folder.parent !== "planner-1" ? "ml-4" : ""}`}
                      >
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${getFolderColorDotClass(folder.color)}`}
                        />
                        <Input
                          value={folder.title}
                          onChange={(event) =>
                            changeDraft(folder.id, {
                              title: event.target.value,
                            })
                          }
                          aria-label={t.categoryNameLabel}
                          className="h-8 min-w-0 flex-1"
                        />
                        <Input
                          type="number"
                          min="0"
                          value={folder.min}
                          onChange={(event) =>
                            changeDraft(folder.id, { min: event.target.value })
                          }
                          aria-label={t.minimumCreditsLabel}
                          placeholder={t.minimumCreditsPlaceholder}
                          className="h-8 w-24 shrink-0"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeCategory(folder.id)}
                          aria-label={t.removeCategory}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCategory}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    {t.addCategory}
                  </Button>
                </div>
              )}

              {categoryChoice === "hosted" && (
                <div className="space-y-2 rounded-md border border-border p-3">
                  {selectedHostedTemplate ? (
                    <p className="text-sm text-muted-foreground">
                      {formatPlannerText(t.hostedTemplateSelected, {
                        name: selectedHostedTemplate.title,
                      })}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t.hostedTemplateNotSelected}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTemplateGalleryOpen(true)}
                  >
                    {selectedHostedTemplate
                      ? t.changeHostedTemplate
                      : t.chooseHostedTemplate}
                  </Button>
                  {templateError && !selectedHostedTemplate && (
                    <p className="text-xs text-red-500">
                      {t.hostedTemplateRequired}
                    </p>
                  )}
                </div>
              )}

              {categoryChoice === "file" && (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(event) =>
                      void selectTemplateFile(event.target.files?.[0])
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t.chooseTemplateFile}
                  </Button>
                  {templateName && (
                    <p className="text-xs text-muted-foreground">
                      {formatPlannerText(t.templateLoaded, {
                        name: templateName,
                        count: templateFolders?.length ?? 0,
                      })}
                    </p>
                  )}
                  {templateError && (
                    <p className="text-xs text-red-500">{t.templateError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {!history.isReady && (
                <p className="text-sm text-muted-foreground">
                  {t.loadingHistory}
                </p>
              )}
              {history.isReady && history.hasError && (
                <p className="text-sm text-muted-foreground">
                  {t.historyLoadError}
                </p>
              )}
              {history.isReady && !history.hasError && (
                <TimetableCourseSelection
                  terms={terms}
                  currentSemesterId={currentSemesterId}
                  folders={activeFolders}
                  department={department}
                  enrollmentYear={enrollmentYear}
                  selectedTermIds={selectedTermIds}
                  onToggleTerm={selectHistoryTerm}
                  assignments={assignments}
                  onAssignmentChange={(rawId, folderId) =>
                    setAssignments((previous) => ({
                      ...previous,
                      [rawId]: folderId,
                    }))
                  }
                  lang={lang}
                />
              )}
            </div>
          )}

          {step === 3 && (
            <RadioGroup
              value={viewChoice}
              onValueChange={(value) => setViewChoice(value as ViewChoice)}
              className="space-y-2"
            >
              {(
                [
                  [
                    "checklist",
                    ListChecks,
                    dict.planner.remake.viewChecklist,
                    t.viewChecklistDescription,
                  ],
                  [
                    "board",
                    CalendarRange,
                    dict.planner.remake.viewBoard,
                    t.viewBoardDescription,
                  ],
                  [
                    "matrix",
                    Grid2X2,
                    dict.planner.remake.viewMatrix,
                    t.viewMatrixDescription,
                  ],
                ] as const
              ).map(([value, Icon, title, description]) => (
                <Label
                  key={value}
                  htmlFor={`planner-setup-view-${value}`}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3"
                >
                  <RadioGroupItem
                    id={`planner-setup-view-${value}`}
                    value={value}
                    className="mt-1"
                  />
                  <Icon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {description}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0 || saving}
              onClick={() => setStep((previous) => Math.max(0, previous - 1))}
            >
              {common.back}
            </Button>
            <div className="ml-auto flex items-center gap-2">
              {step < 3 && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saving}
                  onClick={skipStep}
                >
                  {t.skipStep}
                </Button>
              )}
              {step < 3 ? (
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (
                      step === 1 &&
                      ((categoryChoice === "file" && !templateFolders) ||
                        (categoryChoice === "hosted" &&
                          !selectedHostedTemplate))
                    ) {
                      setTemplateError(true);
                      return;
                    }
                    setStep((previous) => Math.min(3, previous + 1));
                  }}
                >
                  {t.nextStep}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => void finishSetup()}
                >
                  {saving ? dict.common.loading : t.finish}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <TemplateGalleryDialog
        open={templateGalleryOpen}
        onOpenChange={setTemplateGalleryOpen}
        planner={null}
        folders={[]}
        items={[]}
        semesters={[]}
        onApplied={() => undefined}
        selectionOnly
        initialDepartment={department}
        initialEntranceYear={enrollmentYear}
        onTemplateSelected={(template) => {
          setSelectedHostedTemplate(template);
          setCategoryChoice("hosted");
          setTemplateError(false);
        }}
      />
    </>
  );
}
