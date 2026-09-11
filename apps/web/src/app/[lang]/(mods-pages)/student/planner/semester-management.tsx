import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, Edit, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@courseweb/ui";
import { Input } from "@courseweb/ui";
import { Label } from "@courseweb/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { ScrollArea } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
import { Switch } from "@courseweb/ui";
import {
  getSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  toggleSemesterActive,
  generateSemesterId,
  getSemesterTermLabel,
} from "./data/semesters";
import { useRxCollection } from "rxdb-hooks";
import { SemesterDocType } from "./rxdb";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { semesterInfo } from "@courseweb/shared";
import { cn } from "@/lib/utils";
import useDictionary from "@/dictionaries/useDictionary";
import { ResponsiveDialog } from "./components/responsive-dialog";
import { useConfirm } from "./lib/use-confirm";
import { useSettings } from "@/hooks/contexts/settings";

// Static schema kept purely for `z.infer` typing purposes. The actual
// resolver used by the form is built at runtime (see `useMemo` below) so
// validation messages can be localized via the active dictionary without
// losing type inference here.
const semesterFormSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  year: z.string().min(1),
  term: z.string().min(1),
  status: z.enum(["completed", "in-progress", "planned"]).default("planned"),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type SemesterFormValues = z.infer<typeof semesterFormSchema>;

interface SemesterManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onSemestersUpdated: () => void;
}

export function SemesterManagement({
  isOpen,
  onClose,
  onSemestersUpdated,
}: SemesterManagementProps) {
  const dict = useDictionary();
  const { language } = useSettings();
  const sm = dict.planner.semesterManagement as Record<string, string>;
  const common = dict.planner.common;
  const status = dict.planner.status;
  const { confirm, ConfirmDialog } = useConfirm();

  const [semesters, setSemesters] = useState<SemesterDocType[]>([]);
  const [selectedSemester, setSelectedSemester] =
    useState<SemesterDocType | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [newSemester, setNewSemester] = useState<boolean>(false);
  const [semesterLookupMessage, setSemesterLookupMessage] =
    useState<string>("");
  // Drives the single-column mobile layout: the list pane and the
  // detail/edit pane are shown one at a time on narrow screens, with a
  // "back" affordance to return to the list.
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const semesterCol = useRxCollection<SemesterDocType>("semesters");

  const resolver = useMemo(
    () =>
      zodResolver(
        z.object({
          id: z
            .string()
            .min(1, { message: sm.idRequired ?? "學期ID為必填欄位" }),
          name: z
            .string()
            .min(1, { message: sm.nameRequired ?? "學期名稱為必填欄位" }),
          year: z
            .string()
            .min(1, { message: sm.yearRequired ?? "學年為必填欄位" }),
          term: z
            .string()
            .min(1, { message: sm.termRequired ?? "學期為必填欄位" }),
          status: z
            .enum(["completed", "in-progress", "planned"])
            .default("planned"),
          isActive: z.boolean().default(true),
          order: z.number().int().default(0),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
      ),
    [sm],
  );

  // Set up form with React Hook Form and (localized) Zod validation
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SemesterFormValues>({
    resolver,
    defaultValues: {
      name: "",
      status: "planned",
      year: "",
      term: "1",
      isActive: true,
      order: 0,
    },
  });

  // Watch fields to update automatically
  const watchYear = watch("year");
  const watchTerm = watch("term");
  const watchId = watch("id");

  // Function to find semester info by ID
  const findSemesterById = (id: string) => {
    return semesterInfo.find((semester) => semester.id === id);
  };

  // Derive the semester ID and name purely from year + term. This is the
  // ONLY effect that writes id/name — there used to be a second effect that
  // reverse-parsed the ID back into year/term and wrote those back too,
  // which formed a feedback loop (editing the ID field could recompute
  // year/term, which would then recompute the ID again, potentially
  // clobbering what the user just typed). The ID field is now read-only in
  // the form (see below), so it can only ever be produced by this effect,
  // eliminating the cycle entirely.
  useEffect(() => {
    if (watchYear && watchTerm && editMode) {
      const id = generateSemesterId(watchYear, watchTerm);
      const name = `${watchYear}-${watchTerm} (${getSemesterTermLabel(watchTerm)})`;

      setValue("id", id);
      setValue("name", name);

      // Check if we can auto-fill dates from predefined semesters
      const foundSemester = findSemesterById(id);
      if (foundSemester) {
        const startDate = foundSemester.begins.toISOString().split("T")[0];
        const endDate = foundSemester.ends.toISOString().split("T")[0];

        setValue("startDate", startDate);
        setValue("endDate", endDate);
        setSemesterLookupMessage(sm.lookupFound ?? "✓ 從學期代碼找到學期資料");
      } else {
        setSemesterLookupMessage("");
      }
    }
  }, [watchYear, watchTerm, editMode, setValue, sm]);

  // Load semesters
  useEffect(() => {
    if (!semesterCol) return;
    const loadSemesters = async () => {
      const data = await getSemesters(semesterCol);
      setSemesters(data.sort((a, b) => (a.id > b.id ? 1 : -1)));
    };

    if (isOpen) {
      loadSemesters();
    }
  }, [isOpen, semesterCol]);

  // Reset to the list pane every time the dialog is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setMobileView("list");
    }
  }, [isOpen]);

  // Handle semester selection
  const handleSelectSemester = (semester: SemesterDocType) => {
    setSelectedSemester(semester);
    setEditMode(false);
    setNewSemester(false);
    setMobileView("detail");
  };

  // Handle edit mode
  const handleEditMode = () => {
    if (selectedSemester) {
      reset({
        id: selectedSemester.id,
        name: selectedSemester.name,
        status: selectedSemester.status as
          | "completed"
          | "in-progress"
          | "planned",
        year: selectedSemester.year,
        term: selectedSemester.term,
        isActive: selectedSemester.isActive,
        order: selectedSemester.order ?? 0,
        startDate: selectedSemester.startDate ?? "",
        endDate: selectedSemester.endDate ?? "",
      });
      setEditMode(true);
      setNewSemester(false);
      setMobileView("detail");
    }
  };

  // Handle new semester
  const handleNewSemester = () => {
    const lastSemester = [...semesters]
      .sort((a, b) => (a.id > b.id ? 1 : -1))
      .pop();
    let nextYear = "111";
    let nextTerm = "1";

    if (lastSemester) {
      if (lastSemester.term === "1") {
        nextYear = lastSemester.year;
        nextTerm = "2";
      } else {
        nextYear = (Number.parseInt(lastSemester.year) + 1).toString();
        nextTerm = "1";
      }
    }

    const id = generateSemesterId(nextYear, nextTerm);
    const name = `${nextYear}-${nextTerm} (${getSemesterTermLabel(nextTerm)})`;

    reset({
      id,
      name,
      status: "planned",
      year: nextYear,
      term: nextTerm,
      isActive: true,
      order: semesters.length,
      startDate: "",
      endDate: "",
    });
    setEditMode(true);
    setNewSemester(true);
    setMobileView("detail");
  };

  // Handle form submission
  const onSubmit = async (data: SemesterFormValues) => {
    try {
      if (newSemester) {
        await createSemester(semesterCol!, data as SemesterDocType);
      } else {
        await updateSemester(semesterCol!, data as SemesterDocType);
      }

      // Refresh semesters
      const updatedSemesters = await getSemesters(semesterCol!);
      setSemesters(updatedSemesters.sort((a, b) => (a.id > b.id ? 1 : -1)));

      // Reset state
      setEditMode(false);
      setNewSemester(false);
      setSelectedSemester(
        updatedSemesters.find((s) => s.id === data.id) || null,
      );

      // Notify parent
      onSemestersUpdated();
    } catch (error) {
      console.error("Error saving semester:", error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedSemester) return;

    const ok = await confirm({
      title: sm.deleteConfirmTitle ?? "刪除學期？",
      description:
        sm.deleteConfirmDescription ?? "此操作無法復原，確定要刪除此學期嗎？",
      confirmLabel: common.delete,
      cancelLabel: common.cancel,
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteSemester(semesterCol!, selectedSemester.id);

      // Refresh semesters
      const updatedSemesters = await getSemesters(semesterCol!);
      setSemesters(updatedSemesters.sort((a, b) => (a.id > b.id ? 1 : -1)));

      // Reset state
      setSelectedSemester(null);
      setEditMode(false);
      setNewSemester(false);
      setMobileView("list");

      // Notify parent
      onSemestersUpdated();
    } catch (error) {
      console.error("Error deleting semester:", error);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (semester: SemesterDocType) => {
    try {
      await toggleSemesterActive(semesterCol!, semester.id);

      // Refresh semesters
      const updatedSemesters = await getSemesters(semesterCol!);
      setSemesters(updatedSemesters.sort((a, b) => (a.id > b.id ? 1 : -1)));

      // Update selected semester if needed
      if (selectedSemester && selectedSemester.id === semester.id) {
        setSelectedSemester(
          updatedSemesters.find((s) => s.id === semester.id) || null,
        );
      }

      // Notify parent
      onSemestersUpdated();
    } catch (error) {
      console.error("Error toggling semester active status:", error);
    }
  };

  // Get status badge
  const getStatusBadge = (value: string) => {
    switch (value) {
      case "completed":
        return <Badge className="bg-green-600">{status.completed}</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-600">{status.inProgress}</Badge>;
      default:
        return <Badge variant="outline">{status.planned}</Badge>;
    }
  };

  return (
    <>
      {ConfirmDialog}
      <ResponsiveDialog
        open={isOpen}
        onOpenChange={onClose}
        title={sm.title ?? "學期管理"}
        description={sm.description ?? "管理學期和學年"}
        contentClassName="sm:max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        footer={
          <Button variant="outline" onClick={onClose}>
            {common.close}
          </Button>
        }
      >
        <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
          {/* Semester list */}
          <div
            className={cn(
              mobileView === "detail" ? "hidden" : "flex",
              "md:flex flex-col w-full md:w-1/2 border border-border rounded-md overflow-hidden",
            )}
          >
            <div className="p-2 border-b border-border flex justify-between items-center">
              <h3 className="font-medium">{sm.listTitle ?? "學期列表"}</h3>
              <Button size="sm" onClick={handleNewSemester}>
                <Plus className="h-4 w-4 mr-2" />
                {sm.addSemester ?? "新增學期"}
              </Button>
            </div>

            <ScrollArea className="flex-1 h-[45vh] md:h-auto">
              <div className="p-2 space-y-2">
                {semesters.map((semester) => (
                  <div
                    key={semester.id}
                    className={`flex items-center justify-between p-2 rounded-md ${selectedSemester?.id === semester.id ? "bg-neutral-50 dark:bg-neutral-800" : "hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50"} cursor-pointer`}
                    onClick={() => handleSelectSemester(semester)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{semester.name}</span>
                        {getStatusBadge(semester.status)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={semester.isActive}
                        onCheckedChange={() => handleToggleActive(semester)}
                      />
                      <span className="text-xs text-gray-400">
                        {semester.isActive
                          ? (sm.active ?? "啟用")
                          : (sm.inactive ?? "停用")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Semester details/edit */}
          <div
            className={cn(
              mobileView === "list" ? "hidden" : "flex",
              "md:flex flex-col w-full md:w-1/2 border border-border rounded-md overflow-hidden",
            )}
          >
            {selectedSemester && !editMode ? (
              <>
                <div className="p-2 border-b border-border flex justify-between items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="md:hidden"
                    onClick={() => setMobileView("list")}
                    aria-label={common.back}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="font-medium flex-1 truncate">
                    {sm.detailsTitle ?? "學期詳情"}
                  </h3>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEditMode}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {sm.edit ?? "編輯"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {common.delete}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 h-[45vh] md:h-auto">
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        {sm.nameLabel ?? "學期名稱"}
                      </h4>
                      <p className="mt-1">{selectedSemester.name}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        {sm.yearLabel ?? "學年"}
                      </h4>
                      <p className="mt-1">{selectedSemester.year}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        {sm.termLabel ?? "學期"}
                      </h4>
                      <p className="mt-1">
                        {getSemesterTermLabel(selectedSemester.term)}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        {sm.statusLabel ?? "狀態"}
                      </h4>
                      <div className="mt-1">
                        {getStatusBadge(selectedSemester.status)}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        {sm.activeStatusLabel ?? "啟用狀態"}
                      </h4>
                      <p className="mt-1">
                        {selectedSemester.isActive
                          ? (sm.active ?? "啟用")
                          : (sm.inactive ?? "停用")}
                      </p>
                    </div>

                    {selectedSemester.startDate && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400">
                          {sm.startDateLabel ?? "開始日期"}
                        </h4>
                        <p className="mt-1">
                          {new Date(
                            selectedSemester.startDate,
                          ).toLocaleDateString(
                            language === "en" ? "en-US" : "zh-TW",
                          )}
                        </p>
                      </div>
                    )}

                    {selectedSemester.endDate && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400">
                          {sm.endDateLabel ?? "結束日期"}
                        </h4>
                        <p className="mt-1">
                          {new Date(
                            selectedSemester.endDate,
                          ).toLocaleDateString(
                            language === "en" ? "en-US" : "zh-TW",
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : editMode ? (
              <>
                <div className="p-2 border-b border-border flex justify-between items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="md:hidden"
                    onClick={() => {
                      setEditMode(false);
                      setNewSemester(false);
                      setSemesterLookupMessage("");
                      setMobileView(selectedSemester ? "detail" : "list");
                    }}
                    aria-label={common.back}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="font-medium flex-1 truncate">
                    {newSemester
                      ? (sm.newSemesterTitle ?? "新增學期")
                      : (sm.editSemesterTitle ?? "編輯學期")}
                  </h3>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditMode(false);
                        setNewSemester(false);
                        setSemesterLookupMessage("");
                        setMobileView(selectedSemester ? "detail" : "list");
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {common.cancel}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit(onSubmit)}
                      disabled={isSubmitting}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {common.save}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 h-[45vh] md:h-auto">
                  <form className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="semester-id">
                        {sm.idLabel ?? "學期代碼 (民國年份+學期，例如: 11310)"}
                      </Label>
                      <Input
                        id="semester-id"
                        className="bg-neutral-50 border-border dark:bg-neutral-800"
                        disabled
                        readOnly
                        value={watchId ?? ""}
                      />
                      <p className="text-xs text-gray-400">
                        {sm.idHelp ?? "學期代碼會依學年與學期自動產生"}
                      </p>
                      {semesterLookupMessage && (
                        <p className="text-green-500 text-sm flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {semesterLookupMessage}
                        </p>
                      )}
                      {errors.id && (
                        <p className="text-red-500 text-sm">
                          {errors.id.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="semester-year">
                          {sm.yearLabel ?? "學年 (民國年)"}
                        </Label>
                        <Input
                          id="semester-year"
                          className="bg-neutral-50 border-border dark:bg-neutral-800"
                          placeholder={sm.yearPlaceholder ?? "例如: 113"}
                          {...register("year")}
                        />
                        {errors.year && (
                          <p className="text-red-500 text-sm">
                            {errors.year.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="semester-term">
                          {sm.termLabel ?? "學期"}
                        </Label>
                        <Select
                          defaultValue={watch("term")}
                          onValueChange={(value) => setValue("term", value)}
                        >
                          <SelectTrigger
                            id="semester-term"
                            className="bg-neutral-50 border-border dark:bg-neutral-800"
                          >
                            <SelectValue
                              placeholder={
                                sm.termSelectPlaceholder ?? "選擇學期"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-50 border-border dark:bg-neutral-800">
                            <SelectItem value="1">
                              {getSemesterTermLabel("1")} (1)
                            </SelectItem>
                            <SelectItem value="2">
                              {getSemesterTermLabel("2")} (2)
                            </SelectItem>
                            <SelectItem value="3">
                              {getSemesterTermLabel("3")} (3)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.term && (
                          <p className="text-red-500 text-sm">
                            {errors.term.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="semester-name">
                        {sm.nameLabel ?? "學期名稱"}
                      </Label>
                      <Input
                        id="semester-name"
                        className="bg-neutral-50 border-border dark:bg-neutral-800"
                        {...register("name")}
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm">
                          {errors.name.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {sm.nameAutoHint ??
                          "學期名稱會自動生成，但您可以自行修改"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="semester-status">
                        {sm.statusLabel ?? "狀態"}
                      </Label>
                      <Select
                        defaultValue={watch("status")}
                        onValueChange={(value) =>
                          setValue(
                            "status",
                            value as "completed" | "in-progress" | "planned",
                          )
                        }
                      >
                        <SelectTrigger
                          id="semester-status"
                          className="bg-neutral-50 border-border dark:bg-neutral-800"
                        >
                          <SelectValue
                            placeholder={
                              sm.statusSelectPlaceholder ?? "選擇狀態"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-50 border-border dark:bg-neutral-800">
                          <SelectItem value="completed">
                            {status.completed}
                          </SelectItem>
                          <SelectItem value="in-progress">
                            {status.inProgress}
                          </SelectItem>
                          <SelectItem value="planned">
                            {status.planned}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.status && (
                        <p className="text-red-500 text-sm">
                          {errors.status.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="semester-start-date">
                          {sm.startDateLabel ?? "開始日期"}
                        </Label>
                        <Input
                          id="semester-start-date"
                          type="date"
                          className="bg-neutral-50 border-border dark:bg-neutral-800"
                          {...register("startDate")}
                        />
                        {errors.startDate && (
                          <p className="text-red-500 text-sm">
                            {errors.startDate.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="semester-end-date">
                          {sm.endDateLabel ?? "結束日期"}
                        </Label>
                        <Input
                          id="semester-end-date"
                          type="date"
                          className="bg-neutral-50 border-border dark:bg-neutral-800"
                          {...register("endDate")}
                        />
                        {errors.endDate && (
                          <p className="text-red-500 text-sm">
                            {errors.endDate.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id="semester-active"
                        checked={watch("isActive")}
                        onCheckedChange={(checked) =>
                          setValue("isActive", checked)
                        }
                      />
                      <Label htmlFor="semester-active">
                        {sm.activeSwitchLabel ?? "啟用此學期"}
                      </Label>
                      {errors.isActive && (
                        <p className="text-red-500 text-sm">
                          {errors.isActive.message}
                        </p>
                      )}
                    </div>
                  </form>
                </ScrollArea>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>{sm.selectPrompt ?? "選擇一個學期以查看詳情"}</p>
              </div>
            )}
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
}
