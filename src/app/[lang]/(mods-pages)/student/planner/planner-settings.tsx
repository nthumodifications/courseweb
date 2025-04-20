"use client";

import { useState, useEffect, useRef } from "react";
import {
  Save,
  X,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  FolderGit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getCourseItems } from "./data/courses";
import { getFolders, ensureUnsortedFolder } from "./data/folders";
import { toast } from "@/components/ui/use-toast";

// Define the validation schema with Zod
const plannerFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, { message: "規劃名稱為必填欄位" }),
  department: z.string().min(1, { message: "學系/學院為必填欄位" }),
  enrollmentYear: z.string().min(1, { message: "入學學年為必填欄位" }),
  graduationYear: z.string().min(1, { message: "預計畢業學年為必填欄位" }),
  requiredCredits: z.number().min(0, { message: "畢業學分不能為負數" }),
  description: z.string().optional(),
});

type PlannerFormValues = z.infer<typeof plannerFormSchema>;

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
  const [isNewPlanner, setIsNewPlanner] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const plannerCol = useRxCollection<PlannerDataDocType>("plannerdata");
  const semesterCol = useRxCollection<SemesterDocType>("semesters");
  const courseCol = useRxCollection<ItemDocType>("items");
  const foldersCol = useRxCollection<FolderDocType>("folders");
  // Set up form with React Hook Form and Zod validation
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PlannerFormValues>({
    resolver: zodResolver(plannerFormSchema),
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

  // Handle save with form validation
  const onSubmit = async (data: PlannerFormValues) => {
    if (!plannerCol) return;

    try {
      if (isNewPlanner) {
        // Create a new planner
        await createPlannerData(plannerCol, data as PlannerDataDocType);
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

  // Handle action confirmations
  const handleConfirmAction = async (action: string) => {
    try {
      switch (action) {
        case "removeCourses":
          console.log("Remove all courses action triggered");
          await courseCol!.find().remove();
          break;
        case "resetPlanner":
          // Implementation to reset the planner
          console.log("Reset planner action triggered");
          await plannerCol!.find().remove();
          await semesterCol!.find().remove();
          await courseCol!.find().remove();
          await foldersCol!.find().remove();
          break;
        case "export":
          // Implementation to export planner data
          console.log("Export planner data action triggered");
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
      setShowConfirmation(null);
    } catch (error) {
      console.error(`Error during ${action}:`, error);
    }
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
          throw new Error("無效的資料格式");
        }

        setImportData(importedData);
        setImportConfirmOpen(true);
      } catch (error) {
        console.error("Error parsing import data:", error);
        toast({
          title: "匯入失敗",
          description: "無法解析匯入的資料檔案，請確保它是有效的格式。",
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
            title: "匯入失敗",
            description: "無法匯入學期資料，請檢查格式。",
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
            title: "匯入失敗",
            description: "無法匯入課程資料，請檢查格式。",
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
            title: "匯入失敗",
            description: "無法匯入資料夾資料，請檢查格式。",
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
        title: "匯入成功",
        description: "規劃資料已成功匯入",
      });

      // Notify parent and close
      onSettingsUpdated();
      onClose();
    } catch (error) {
      console.error("Error importing data:", error);
      toast({
        title: "匯入失敗",
        description: "無法匯入資料，請再試一次。",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="border-border max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle>
              {isNewPlanner ? "建立新規劃" : "規劃設定"}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              {isNewPlanner ? "建立新的畢業規劃" : "設定畢業規劃的基本資訊"}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col"
          >
            <TabsList className="bg-neutral-50 dark:bg-neutral-800 mb-2">
              <TabsTrigger value="basic">基本設定</TabsTrigger>
              <TabsTrigger value="actions">進階操作</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="flex-1 overflow-hidden">
              <form
                id="plannerForm"
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col h-full"
              >
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="planner-title" className="text-sm">
                        規劃名稱
                      </Label>
                      <Input
                        id="planner-title"
                        className="bg-neutral-50 border-border dark:bg-neutral-800 h-8 mt-1"
                        placeholder="逃離新竹!"
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
                        學系/學院
                      </Label>
                      <Input
                        id="planner-department"
                        className="bg-neutral-50 border-border dark:bg-neutral-800 h-8 mt-1"
                        placeholder="科技管理學院學士班26級"
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
                          入學學年
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
                          預計畢業學年
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
                        畢業學分要求
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
                        規劃描述
                      </Label>
                      <Textarea
                        id="planner-description"
                        className="bg-neutral-50 border-border dark:bg-neutral-800 min-h-[80px] mt-1"
                        placeholder="不必填"
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
                          資料管理
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          <div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                setShowConfirmation("removeCourses")
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              移除所有課程
                            </Button>
                            <p className="text-gray-400 text-xs mt-1">
                              從所有學期移除課程，但保留學期和規劃設定
                            </p>
                          </div>

                          <div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                setShowConfirmation("resetPlanner")
                              }
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              完全重設規劃
                            </Button>
                            <p className="text-gray-400 text-xs mt-1">
                              刪除所有規劃資料，包含學期和課程
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="export" className="border-border">
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center">
                          <Download className="h-4 w-4 mr-2" />
                          匯出/匯入資料
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
                              匯出規劃資料 (JSON)
                            </Button>
                            <p className="text-gray-400 text-xs mt-1">
                              匯出所有規劃資料，包含學期和課程
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
                              匯入規劃資料 (JSON)
                            </Button>
                            <p className="text-gray-400 text-xs mt-1">
                              從匯出的 JSON 檔案匯入完整規劃資料
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

                  {showConfirmation && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>確認操作</AlertTitle>
                      <AlertDescription>
                        {showConfirmation === "removeCourses" &&
                          "確定要移除所有課程嗎？此操作無法還原。"}
                        {showConfirmation === "resetPlanner" &&
                          "確定要重設整個規劃嗎？所有資料將會被刪除，此操作無法還原。"}

                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleConfirmAction(showConfirmation)
                            }
                          >
                            確認
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConfirmation(null)}
                          >
                            取消
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || activeTab !== "basic"}
              form="plannerForm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isNewPlanner ? "建立規劃" : "儲存設定"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認匯入資料</AlertDialogTitle>
            <AlertDialogDescription>
              這將會覆蓋所有現有的規劃資料，包括學期、課程和類別。此操作無法還原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-200 hover:bg-red-400 dark:bg-red-900 dark:hover:bg-red-800"
              onClick={handleImportConfirm}
            >
              確認匯入
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
