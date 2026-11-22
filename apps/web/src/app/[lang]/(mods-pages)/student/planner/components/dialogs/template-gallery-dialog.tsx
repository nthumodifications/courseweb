import { useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@courseweb/ui";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import {
  PlannerTemplate,
  PlannerTemplateSummary,
  useMarkPlannerTemplateUsed,
  usePlannerTemplate,
  usePlannerTemplateDepartments,
  usePlannerTemplates,
  useReportPlannerTemplate,
  type PlannerTemplateReportReason,
} from "@/lib/planner-templates";
import type {
  FolderDocType,
  ItemDocType,
  PlannerDataDocType,
  SemesterDocType,
} from "../../rxdb";
import { ResponsiveDialog } from "../responsive-dialog";
import { useConfirm } from "../../lib/use-confirm";
import { templatePayloadToPlannerDocs } from "../../lib/templates";
import { ensureUnsortedFolder } from "../../data/folders";
import {
  createPlannerData,
  getPlannerData,
  updatePlannerData,
} from "../../data/planner";
import { useRxCollection } from "rxdb-hooks";
import { v4 as uuidv4 } from "uuid";
import { plannerTemplateEvents } from "@/lib/trackingEvents";

interface TemplateGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planner: PlannerDataDocType | null;
  folders: FolderDocType[];
  items: ItemDocType[];
  semesters: SemesterDocType[];
  onApplied: () => void;
  selectionOnly?: boolean;
  initialDepartment?: string;
  initialEntranceYear?: string;
  onTemplateSelected?: (template: PlannerTemplate) => void;
}

const metadataLine = (template: PlannerTemplateSummary, format: string) =>
  format
    .replace("{department}", template.department)
    .replace("{year}", template.entranceYear)
    .replace("{credits}", String(template.requiredCredits))
    .replace("{folders}", String(template.folderCount))
    .replace("{courses}", String(template.courseCount))
    .replace("{uses}", String(template.useCount));

export function TemplateGalleryDialog({
  open,
  onOpenChange,
  planner,
  folders,
  items,
  semesters,
  onApplied,
  selectionOnly = false,
  initialDepartment,
  initialEntranceYear,
  onTemplateSelected,
}: TemplateGalleryDialogProps) {
  const dict = useDictionary();
  const t = dict.planner.templates;
  const auth = useAuth();
  const { choose, ConfirmDialog } = useConfirm();
  const [department, setDepartment] = useState("all");
  const [entranceYear, setEntranceYear] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] =
    useState<PlannerTemplateReportReason>("WRONG_INFO");
  const [reportNote, setReportNote] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const departmentsQuery = usePlannerTemplateDepartments();
  const listQuery = usePlannerTemplates({
    department: department === "all" ? undefined : department,
    entranceYear: entranceYear === "all" ? undefined : entranceYear,
    q: search.trim() || undefined,
  });
  const detailQuery = usePlannerTemplate(selectedId);
  const report = useReportPlannerTemplate();
  const markUsed = useMarkPlannerTemplateUsed();
  const plannerCol = useRxCollection<PlannerDataDocType>("plannerdata");
  const foldersCol = useRxCollection<FolderDocType>("folders");
  const itemsCol = useRxCollection<ItemDocType>("items");
  const semesterCol = useRxCollection<SemesterDocType>("semesters");
  const template = detailQuery.data;
  const allDepartments = useMemo(
    () => [
      ...new Set(
        (departmentsQuery.data?.departments ?? []).map(
          (item) => item.department,
        ),
      ),
    ],
    [departmentsQuery.data?.departments],
  );
  const years = useMemo(
    () =>
      [
        ...new Set([
          ...(departmentsQuery.data?.departments ?? [])
            .filter(
              (item) => department === "all" || item.department === department,
            )
            .map((item) => item.entranceYear),
          ...(planner?.enrollmentYear ? [planner.enrollmentYear] : []),
        ]),
      ].sort((left, right) => Number(right) - Number(left)),
    [departmentsQuery.data?.departments, department, planner?.enrollmentYear],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedId("");
    setReportOpen(false);
    setPdfUrl(null);
    setDepartment(initialDepartment || planner?.department || "all");
    setEntranceYear(initialEntranceYear || planner?.enrollmentYear || "all");
  }, [
    open,
    planner?.department,
    planner?.enrollmentYear,
    allDepartments,
    initialDepartment,
    initialEntranceYear,
  ]);

  useEffect(() => {
    if (!open || !template) return;
    let active = true;
    const params = new URLSearchParams({
      department: template.department,
      year: template.entranceYear,
    });
    fetch(`${import.meta.env.VITE_COURSEWEB_API_URL}/graduation/find?${params}`)
      .then(async (response) =>
        response.ok ? ((await response.json()) as { pdfUrl?: string }) : null,
      )
      .then((result) => {
        if (active) setPdfUrl(result?.pdfUrl ?? null);
      })
      .catch(() => {
        if (active) setPdfUrl(null);
      });
    return () => {
      active = false;
    };
  }, [open, template]);

  const renderTree = (selected: PlannerTemplate) => {
    const childFolders = (parentKey: string | null) =>
      selected.payload.folders
        .filter((folder) => folder.parentKey === parentKey)
        .sort((left, right) => left.order - right.order);
    const renderFolder = (
      folderKey: string | null,
      depth: number,
    ): React.ReactNode => {
      const folder = selected.payload.folders.find(
        (entry) => entry.key === folderKey,
      );
      if (!folder) return null;
      const courses = selected.payload.items.filter(
        (item) => item.folderKey === folder.key,
      );
      return (
        <div
          key={folder.key}
          className="border-l border-border pl-3"
          style={{ marginLeft: `${depth * 0.5}rem` }}
        >
          <div className="py-1 text-sm font-medium">
            {folder.title} · {folder.min}–{folder.max}{" "}
            {folder.metric === "credits" ? t.creditsLabel : t.coursesLabel}
          </div>
          {courses.map((course) => (
            <div
              key={course.key}
              className="py-1 text-sm text-muted-foreground"
            >
              {course.title} ·{" "}
              {course.term ? `${t.termLabel} ${course.term}` : t.noTerm}
            </div>
          ))}
          {childFolders(folder.key).map((child) =>
            renderFolder(child.key, depth + 1),
          )}
        </div>
      );
    };
    return (
      <div className="space-y-1">
        {childFolders(null).map((folder) => renderFolder(folder.key, 0))}
        {selected.payload.items
          .filter((item) => !item.folderKey)
          .map((item) => (
            <div key={item.key} className="py-1 text-sm text-muted-foreground">
              {item.title} ·{" "}
              {item.term ? `${t.termLabel} ${item.term}` : t.noTerm}
            </div>
          ))}
      </div>
    );
  };

  const applyTemplate = async (selected: PlannerTemplate) => {
    if (selectionOnly) {
      onTemplateSelected?.(selected);
      onOpenChange(false);
      return;
    }
    if (!plannerCol || !foldersCol || !itemsCol || !semesterCol) return;
    const hasExistingPlan =
      items.length > 0 || folders.some((folder) => folder.id !== "_unsorted");
    let mode: "add" | "replace" = "add";
    if (hasExistingPlan) {
      const choice = await choose({
        title: t.applyConfirmTitle,
        description: t.applyConfirmDescription,
        cancelLabel: dict.planner.common.cancel,
        choices: [
          { value: "add", label: t.addToPlan },
          { value: "replace", label: t.replacePlan, destructive: true },
        ],
      });
      if (!choice) return;
      mode = choice as "add" | "replace";
    }

    // Relative terms map onto the student's own cohort, never the template's.
    const useEnrollmentYear = planner?.enrollmentYear || selected.entranceYear;
    const converted = templatePayloadToPlannerDocs(selected.payload, {
      enrollmentYear: useEnrollmentYear,
      existingSemesters: semesters,
    });
    try {
      if (mode === "replace") {
        // Replace swaps the plan, not the student's record: completed and
        // in-progress courses are kept and moved to the unsorted folder.
        const kept = ["completed", "in-progress", "failed"];
        await itemsCol.find({ selector: { status: { $nin: kept } } }).remove();
        await itemsCol
          .find({ selector: { status: { $in: kept } } })
          .update({ $set: { parent: "_unsorted" } });
        await foldersCol
          .find({ selector: { id: { $ne: "_unsorted" } } })
          .remove();
      }
      await ensureUnsortedFolder(foldersCol);
      if (converted.semesters.length > 0)
        await semesterCol.bulkInsert(converted.semesters);
      if (converted.folders.length > 0)
        await foldersCol.bulkInsert(converted.folders);
      if (converted.items.length > 0)
        await itemsCol.bulkInsert(converted.items);

      const current = await getPlannerData(plannerCol);
      const data = {
        ...(mode === "replace" || !current?.department
          ? { department: selected.department }
          : {}),
        ...(!current?.enrollmentYear
          ? { enrollmentYear: selected.entranceYear }
          : {}),
        ...(mode === "replace" || !current?.requiredCredits
          ? { requiredCredits: selected.requiredCredits }
          : {}),
        ...(!current?.title ? { title: selected.title } : {}),
      };
      if (current) await updatePlannerData(plannerCol, data);
      else {
        await createPlannerData(plannerCol, {
          id: uuidv4(),
          title: selected.title,
          department: selected.department,
          enrollmentYear: selected.entranceYear,
          graduationYear: "",
          requiredCredits: selected.requiredCredits,
          includedSemesters: [],
          description: "",
        } as PlannerDataDocType);
      }
      void markUsed.mutateAsync(selected.id).catch(() => undefined);
      plannerTemplateEvents.applied(selected.id, selected.department, mode);
      toast({ title: t.applySuccess });
      onApplied();
      onOpenChange(false);
    } catch {
      toast({
        title: t.applyFailed,
        variant: "destructive",
      });
    }
  };

  const submitReport = async () => {
    if (!template) return;
    if (!auth.isAuthenticated || auth.user?.expired) {
      await auth.signinRedirect();
      return;
    }
    try {
      await report.mutateAsync({
        id: template.id,
        values: {
          reason: reportReason,
          ...(reportNote.trim() ? { note: reportNote.trim() } : {}),
        },
      });
      toast({ title: t.reportSuccess });
      setReportOpen(false);
      setReportNote("");
    } catch {
      toast({ title: t.reportFailed, variant: "destructive" });
    }
  };

  const title = selectedId ? (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={t.back}
        onClick={() => {
          setSelectedId("");
          setReportOpen(false);
        }}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <span>{template?.title ?? t.previewTitle}</span>
    </div>
  ) : (
    t.title
  );

  return (
    <>
      {ConfirmDialog}
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={selectedId ? t.previewDescription : t.description}
        contentClassName="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        footer={
          selectedId && template ? (
            <div className="flex w-full items-center justify-between gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t.moreActions}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => setReportOpen((value) => !value)}
                  >
                    {t.report}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => void applyTemplate(template)}>
                {t.useTemplate}
              </Button>
            </div>
          ) : null
        }
      >
        {selectedId ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
            {detailQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t.loading}</p>
            ) : null}
            {detailQuery.isError ? (
              <p className="text-sm text-muted-foreground">{t.loadFailed}</p>
            ) : null}
            {template ? (
              <>
                {template.description && (
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  {metadataLine(template, t.metadata)}
                </div>
                <div className="divide-y divide-border">
                  {renderTree(template)}
                </div>
                {pdfUrl && (
                  <a
                    className="text-sm underline underline-offset-2"
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.officialRequirements}
                  </a>
                )}
                {reportOpen && (
                  <div className="space-y-2 border-t border-border pt-3">
                    {auth.isAuthenticated && !auth.user?.expired ? (
                      <>
                        <Select
                          value={reportReason}
                          onValueChange={(value) =>
                            setReportReason(
                              value as PlannerTemplateReportReason,
                            )
                          }
                        >
                          <SelectTrigger aria-label={t.reportReason}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WRONG_INFO">
                              {t.reportReasons.wrongInfo}
                            </SelectItem>
                            <SelectItem value="SPAM">
                              {t.reportReasons.spam}
                            </SelectItem>
                            <SelectItem value="OFFENSIVE">
                              {t.reportReasons.offensive}
                            </SelectItem>
                            <SelectItem value="OTHER">
                              {t.reportReasons.other}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Textarea
                          value={reportNote}
                          onChange={(event) =>
                            setReportNote(event.target.value)
                          }
                          maxLength={500}
                          placeholder={t.reportNote}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReportOpen(false)}
                          >
                            {dict.planner.common.cancel}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void submitReport()}
                            disabled={report.isPending}
                          >
                            {t.submitReport}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                        <span>{t.signInToReport}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void auth.signinRedirect()}
                        >
                          {t.signIn}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto pb-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Select
                value={department}
                onValueChange={(value) => {
                  setDepartment(value);
                  setEntranceYear("all");
                }}
              >
                <SelectTrigger aria-label={t.departmentFilter}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allDepartments}</SelectItem>
                  {department !== "all" &&
                    !allDepartments.includes(department) && (
                      <SelectItem value={department}>{department}</SelectItem>
                    )}
                  {allDepartments.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={entranceYear} onValueChange={setEntranceYear}>
                <SelectTrigger aria-label={t.yearFilter}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allYears}</SelectItem>
                  {years.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchPlaceholder}
              />
            </div>
            {departmentsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">{t.loading}</p>
            )}
            {departmentsQuery.isError && (
              <p className="text-sm text-muted-foreground">{t.loadFailed}</p>
            )}
            {listQuery.isLoading && (
              <p className="text-sm text-muted-foreground">{t.loading}</p>
            )}
            {listQuery.isError && (
              <p className="text-sm text-muted-foreground">{t.loadFailed}</p>
            )}
            {listQuery.data?.templates.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t.noResults}</span>
                {department !== "all" && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-1"
                    onClick={() => setDepartment("all")}
                  >
                    {t.showAllDepartments}
                  </Button>
                )}
              </div>
            )}
            <div className="divide-y divide-border">
              {(listQuery.data?.templates ?? []).map((entry) => (
                <Button
                  key={entry.id}
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-none px-2 py-2 text-left"
                  onClick={() => {
                    setSelectedId(entry.id);
                    setPdfUrl(null);
                    plannerTemplateEvents.opened(entry.id);
                  }}
                >
                  <span className="block min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{entry.title}</span>
                      {entry.official && (
                        <Badge variant="secondary">{t.officialBadge}</Badge>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
                      {metadataLine(entry, t.metadata)}
                    </span>
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </>
  );
}
