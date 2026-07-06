import { useState, useEffect, useRef } from "react";
import { Save, X, Trash2, Download, Upload, RefreshCw } from "lucide-react";
import { Button } from "@courseweb/ui";
import { Input } from "@courseweb/ui";
import { Label } from "@courseweb/ui";
import { Textarea } from "@courseweb/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@courseweb/ui";
import { ScrollArea } from "@courseweb/ui";
import {
  FolderDocType,
  ItemDocType,
  PlannerDataDocType,
  SemesterDocType,
} from "./rxdb";
import { useRxCollection } from "rxdb-hooks";
import {
  createPlannerData,
  getPlannerData,
  updatePlannerData,
} from "./data/planner";
import { getSemesters } from "./data/semesters";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from "uuid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@courseweb/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@courseweb/ui";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@courseweb/ui";
import { getCourseItems } from "./data/courses";
import { getFolders, ensureUnsortedFolder } from "./data/folders";
import { toast } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { useConfirm } from "./lib/use-confirm";

interface PlannerSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated: () => void;
}

export function PlannerSettings({
  isOpen,
  onClose,
  onSettingsUpdated,
}: PlannerSettingsProps) {
  const dict = useDictionary();
  const ps = dict.planner.settings as Record<string, string>;
  const common = dict.planner.common;
  const { confirm, ConfirmDialog } = useConfirm();

  // Static schema kept for `z.infer` typing; the resolver actually used by
  // the form is built below via `useMemo` so validation messages can be
  // localized without losing type inference here.
  const plannerFormSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1),
    department: z.string().min(1),
    enrollmentYear: z.string().min(1),
    graduationYear: z.string().min(1),
    requiredCredits: z.number().min(0),
    description: z.string().optional(),
  });
  type PlannerFormValues = z.infer<typeof plannerFormSchema>;

  const [isNewPlanner, setIsNewPlanner] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const plannerCol = useRxCollection<PlannerDataDocType>("plannerdata");
  const semesterCol = useRxCollection<SemesterDocType>("semesters");
  const courseCol = useRxCollection<ItemDocType>("items");
  const foldersCol = useRxCollection<FolderDocType>("folders");
  // Set up form with React Hook Form and localized Zod validation
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlannerFormValues>({
    resolver: zodResolver(
      z.object({
        id: z.string().optional(),
        title: z
          .string()
          .min(1, { message: ps.titleRequired ?? "規劃名稱為必填欄位" }),
        department: z
          .string()
          .min(1, { message: ps.departmentRequired ?? "學系/學院為必填欄位" }),
        enrollmentYear: z
          .string()
          .min(1, {
            message: ps.enrollmentYearRequired ?? "入學學年為必填欄位",
          }),
        graduationYear: z.string().min(1, {
          message: ps.graduationYearRequired ?? "預計畢業學年為必填欄位",
        }),
        requiredCredits: z
          .number()
          .min(0, { message: ps.creditsNonNegative ?? "畢業學分不能為負數" }),
        description: z.string().optional(),
      }),
    ),
    defaultValues: {
      title: "",
      department: "",
      enrollmentYear: "",
      graduationYear: "",
      requiredCredits: 0,
      description: "",
    },
  });

  // Load planner data
  useEffect(() => {
    const loadData = async () => {
      if (!plannerCol) return;

      try {
        const data = await getPlannerData(plannerCol);

        if (data) {
          // Reset form with existing data
          reset({
            id: data.id,
            title: data.title || "",
            department: data.department || "",
            enrollmentYear: data.enrollmentYear || "",
            graduationYear: data.graduationYear || "",
            requiredCredits: data.requiredCredits || 128,
            description: data.description || "",
          });
          setIsNewPlanner(false);
        } else {
          // No planner exists, prepare for creating a new one
          reset({
            id: uuidv4(),
            title: "",
            department: "",
            enrollmentYear: "",
            graduationYear: "",
            requiredCredits: 128,
            description: "",
          });
          setIsNewPlanner(true);
        }
      } catch (error) {
        console.error("Error loading planner data:", error);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, plannerCol, reset]);

  // Reset the active tab every time the dialog is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setActiveTab("basic");
    }
  }, [isOpen]);

  // Handle save with form validation
  const onSubmit = async (data: PlannerFormValues) => {
    if (!plannerCol) return;

    try {
      if (isNewPlanner) {
        // Create a new planner with required includedSemesters field
        await createPlannerData(plannerCol, {
          includedSemesters: [],
          ...data,
        } as PlannerDataDocType);
      } else {
        // Update existing planner
        await updatePlannerData(plannerCol, data as PlannerDataDocType);
      }
      // Notify parent
      onSettingsUpdated();
      onClose();
    } catch (error) {
      console.error("Error saving planner settings:", error);
    }
  };

  // Handle non-destructive/destructive actions once already confirmed (or,
  // for "export", with no confirmation needed at all).
  const handleConfirmAction = async (
    action: "removeCourses" | "resetPlanner" | "export",
  ) => {
    try {
      switch (action) {
        case "removeCourses":
          await courseCol!.find().remove();
          // Previously this left the dialog open with stale course data and
          // never told the parent view to refresh. Both are now handled.
          onSettingsUpdated();
          toast({
            title: ps.removeCoursesSuccessTitle ?? "課程已移除",
            description:
              ps.removeCoursesSuccessDescription ?? "所有課程已被移除。",
          });
          break;
        case "resetPlanner": {
          await plannerCol!.find().remove();
          await semesterCol!.find().remove();
          await courseCol!.find().remove();
          await foldersCol!.find().remove();
          // A full reset invalidates everything this dialog was showing
          // (including the planner id backing the still-open form), so
          // notify the parent and close rather than leaving a dialog full
          // of now-nonexistent data on screen.
          onSettingsUpdated();
          toast({
            title: ps.resetPlannerSuccessTitle ?? "規劃已重設",
            description:
              ps.resetPlannerSuccessDescription ?? "所有規劃資料已被刪除。",
          });
          onClose();
          break;
        }
        case "export":
          if (plannerCol) {
            const data = await getPlannerData(plannerCol);
            const semesters = await getSemesters(semesterCol!);
            const courses = await getCourseItems(courseCol!);
            const folders = await getFolders(foldersCol!);
            const exportData = {
              planner: data,
              semesters: semesters,
              courses: courses,
              folders: folders,
            };
            const dataStr =
              "data:text/json;charset=utf-8," +
              encodeURIComponent(JSON.stringify(exportData));
            const downloadAnchorNode = document.createElement("a");
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute(
              "download",
              `${data?.title || "planner"}_export.json`,
            );
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
      toast({
        title: ps.actionFailTitle ?? "操作失敗",
        description: ps.actionFailDescription ?? "操作失敗，請再試一次。",
        variant: "destructive",
      });
    }
  };

  // Destructive actions are now routed through the shared `useConfirm()`
  // modal instead of an inline `<Alert>` panel that stayed in the tree and
  // executed on a second click of a differently-styled button.
  const handleRemoveCoursesClick = async () => {
    const ok = await confirm({
      title: ps.removeCoursesConfirmTitle ?? "移除所有課程？",
      description:
        ps.removeCoursesConfirmDescription ??
        "確定要移除所有課程嗎？此操作無法還原。",
      confirmLabel: common.delete,
      cancelLabel: common.cancel,
      destructive: true,
    });
    if (!ok) return;
    await handleConfirmAction("removeCourses");
  };

  const handleResetPlannerClick = async () => {
    const ok = await confirm({
      title: ps.resetPlannerConfirmTitle ?? "重設整個規劃？",
      description:
        ps.resetPlannerConfirmDescription ??
        "確定要重設整個規劃嗎？所有資料將會被刪除，此操作無法還原。",
      confirmLabel: common.delete,
      cancelLabel: common.cancel,
      destructive: true,
    });
    if (!ok) return;
    await handleConfirmAction("resetPlanner");
  };

  // Handle file selection for import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);

        // Basic validation
        if (
          !importedData.planner ||
          !Array.isArray(importedData.semesters) ||
          !Array.isArray(importedData.courses) ||
          !Array.isArray(importedData.folders)
        ) {
          throw new Error("Invalid import data format");
        }

        setImportData(importedData);
        setImportConfirmOpen(true);
      } catch (error) {
        console.error("Error parsing import data:", error);
        toast({
          title: ps.importFailTitle ?? "匯入失敗",
          description:
            ps.importParseFailDescription ??
            "無法解析匯入的資料檔案，請確保它是有效的格式。",
          variant: "destructive",
        });
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Handle import confirmation
  const handleImportConfirm = async () => {
    if (
      !plannerCol ||
      !semesterCol ||
      !courseCol ||
      !foldersCol ||
      !importData
    ) {
      return;
    }

    try {
      // Remove existing data
      await plannerCol.find().remove();
      await semesterCol.find().remove();
      await courseCol.find().remove();
      await foldersCol.find().remove();

      // Import planner data
      if (importData.planner) {
        // Use destructuring to create a clean object without unwanted properties
        const {
          createdAt,
          updatedAt,
          _rev,
          _attachments,
          _meta,
          ...cleanPlannerData
        } = importData.planner;
        await createPlannerData(plannerCol, cleanPlannerData);
      }

      // Import semesters
      if (importData.semesters && Array.isArray(importData.semesters)) {
        const result = await semesterCol.bulkInsert(importData.semesters);
        if (result.error.length > 0) {
          console.error("Error importing semesters:", result.error);
          toast({
            title: ps.importFailTitle ?? "匯入失敗",
            description:
              ps.importSemestersFailDescription ??
              "無法匯入學期資料，請檢查格式。",
            variant: "destructive",
          });
        }
      }

      // Import courses
      if (importData.courses && Array.isArray(importData.courses)) {
        // remove updatedAt from each course
        importData.courses = importData.courses.map((course: any) => {
          const { updatedAt, ...rest } = course;
          return rest;
        });
        const result = await courseCol.bulkInsert(importData.courses);
        if (result.error.length > 0) {
          console.error("Error importing courses:", result.error);
          toast({
            title: ps.importFailTitle ?? "匯入失敗",
            description:
              ps.importCoursesFailDescription ??
              "無法匯入課程資料，請檢查格式。",
            variant: "destructive",
          });
        }
      }

      // Import folders
      if (importData.folders && Array.isArray(importData.folders)) {
        const newFolders = importData.folders.filter(
          (f: any) => f?.id !== "_unsorted",
        );
        const result = await foldersCol.bulkInsert(newFolders);
        if (result.error.length > 0) {
          console.error("Error importing folders:", result.error);
          toast({
            title: ps.importFailTitle ?? "匯入失敗",
            description:
              ps.importFoldersFailDescription ??
              "無法匯入資料夾資料，請檢查格式。",
            variant: "destructive",
          });
        }
      }

      // Ensure _unsorted folder exists
      await ensureUnsortedFolder(foldersCol);

      // Reset import state
      setImportData(null);
      setImportConfirmOpen(false);

      toast({
        title: ps.importSuccessTitle ?? "匯入成功",
        description: ps.importSuccessDescription ?? "規劃資料已成功匯入",
      });

      // Notify parent and close
      onSettingsUpdated();
      onClose();
    } catch (error) {
      console.error("Error importing data:", error);
      toast({
        title: ps.importFailTitle ?? "匯入失敗",
        description:
          ps.importGenericFailDescription ?? "無法匯入資料，請再試一次。",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {ConfirmDialog}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="border-border max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle>
              {isNewPlanner
                ? (ps.createTitle ?? "建立新規劃")
                : (ps.settingsTitle ?? "規劃設定")}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              {isNewPlanner
                ? (ps.createDescription ?? "建立新的畢業規劃")
                : (ps.settingsDescription ?? "設定畢業規劃的基本資訊")}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="bg-neutral-50 dark:bg-neutral-800 mb-2">
              <TabsTrigger value="basic">
                {ps.basicTab ?? "基本設定"}
              </TabsTrigger>
              <TabsTrigger value="actions">
                {ps.actionsTab ?? "進階操作"}
              </TabsTrigger>
            </TabsList>

            {/*
              `forceMount` keeps this tab's form mounted in the DOM (Radix
              hides it with the native `hidden` attribute instead of
              unmounting it) even while the "actions" tab is active. The
              footer's Save button is associated with this form via
              `form="plannerForm"` and previously only worked while this tab
              was the visible one — react-hook-form tracks values via the
              mounted field refs regardless of visibility, so keeping the
              form mounted lets Save work from either tab.
            */}
            <TabsContent
              value="basic"
              forceMount
              className="flex-1 overflow-hidden data-[state=inactive]:hidden"
            >
              <form
                id="plannerForm"
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col h-full"
              >
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="planner-title" className="text-sm">
                        {ps.titleLabel ?? "規劃名稱"}
                      </Label>
                      <Input
                        id="planner-title"
                        className="bg-neutral-50 border-border dark:bg-neutral-800 h-8 mt-1"
                        placeholder={
                          ps.titlePlaceholder ?? "例如：我的畢業規劃"
                        }
                        {...register("title")}
                      />
                      {errors.title && (
                        <p className="text-red-500 text-xs">
                          {errors.title.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="planner-department" className="text-sm">
                        {ps.departmentLabel ?? "學系/學院"}
                      </Label>
                      <Input
                        id="planner-department"
                        className="bg-neutral-50 border-border dark:bg-neutral-800 h-8 mt-1"
                        placeholder={
                          ps.departmentPlaceholder ?? "例如：資訊工程學系"
                        }
                        {...register("department")}
                      />
                      {errors.department && (
                        <p className="text-red-500 text-xs">
                          {errors.department.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label
                          htmlFor="planner-enrollment-year"
                          className="text-sm"
                        >
                          {ps.enrollmentYearLabel ?? "入學學年"}
                        </Label>
                        <Input
                          id="planner-enrollment-year"
                          className="bg-neutral-50 border-border dark:bg-neutral-800 h-8 mt-1"
                          placeholder="113"
                          {...register("enrollmentYear")}
                        />
                        {errors.enrollmentYear && (
                          <p className="text-red-500 text-xs">
                            {errors.enrollmentYear.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label
                          htmlFor="planner-graduation-year"
                          className="text-sm"
                        >
                          {ps.graduationYearLabel ?? "預計畢業學年"}
                        </Label>
                        <Input
                          id="planner-graduation-year"
                          className="bg-neutral-50 border-border dark:bg-neutral-800 h-8 mt-1"
                          placeholder="123"
                          {...register("graduationYear")}
                        />
                        {errors.graduationYear && (
                          <p className="text-red-500 text-xs">
                            {errors.graduationYear.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label
                        htmlFor="planner-required-credits"
                        className="text-sm"
                      >
                        {ps.requiredCreditsLabel ?? "畢業學分要求"}
                      </Label>
                      <Input
                        id="planner-required-credits"
                        type="number"
                        className="bg-neutral-50 border-border dark:bg-neutral-800 h-8 mt-1"
                        {...register("requiredCredits", {
                          valueAsNumber: true,
                        })}
                      />
                      {errors.requiredCredits && (
                        <p className="text-red-500 text-xs">
                          {errors.requiredCredits.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="planner-description" className="text-sm">
                        {ps.descriptionLabel ?? "規劃描述"}
                      </Label>
                      <Textarea
                        id="planner-description"
                        className="bg-neutral-50 border-border dark:bg-neutral-800 min-h-[80px] mt-1"
                        placeholder={ps.descriptionPlaceholder ?? "不必填"}
                        {...register("description")}
                      />
                      {errors.description && (
                        <p className="text-red-500 text-xs">
                          {errors.description.message}
                        </p>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </form>
            </TabsContent>

            <TabsContent value="actions" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="manage" className="border-border">
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center">
                          <Trash2 className="h-4 w-4 mr-2" />
                          {ps.dataManagementTitle ?? "資料管理"}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          <div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={handleRemoveCoursesClick}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {ps.removeCoursesAction ?? "移除所有課程"}
                            </Button>
                            <p className="text-gray-400 text-xs mt-1">
                              {ps.removeCoursesDescription ??
                                "從所有學期移除課程，但保留學期和規劃設定"}
                            </p>
                          </div>

                          <div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={handleResetPlannerClick}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              {ps.resetPlannerAction ?? "完全重設規劃"}
                            </Button>
                            <p className="text-gray-400 text-xs mt-1">
                              {ps.resetPlannerDescription ??
                                "刪除所有規劃資料，包含學期和課程"}
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="export" className="border-border">
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center">
                          <Download className="h-4 w-4 mr-2" />
                          {ps.exportImportTitle ?? "匯出/匯入資料"}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleConfirmAction("export")}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {ps.exportAction ?? "匯出規劃資料 (JSON)"}
                            </Button>
                            <p className="text-gray-400 text-xs mt-1">
                              {ps.exportDescription ??
                                "匯出所有規劃資料，包含學期和課程"}
                            </p>
                          </div>

                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {ps.importAction ?? "匯入規劃資料 (JSON)"}
                            </Button>
                            <p className="text-gray-400 text-xs mt-1">
                              {ps.importDescription ??
                                "從匯出的 JSON 檔案匯入完整規劃資料"}
                            </p>
                            <input
                              aria-label="json"
                              ref={fileInputRef}
                              type="file"
                              accept=".json"
                              className="hidden"
                              onChange={handleFileSelect}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              {common.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting} form="plannerForm">
              <Save className="h-4 w-4 mr-2" />
              {isNewPlanner
                ? (ps.createSubmit ?? "建立規劃")
                : (ps.saveSubmit ?? "儲存設定")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {ps.importConfirmDialogTitle ?? "確認匯入資料"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {ps.importConfirmDialogDescription ??
                "這將會覆蓋所有現有的規劃資料，包括學期、課程和類別。此操作無法還原。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-200 hover:bg-red-400 dark:bg-red-900 dark:hover:bg-red-800"
              onClick={handleImportConfirm}
            >
              {ps.confirmImport ?? "確認匯入"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
