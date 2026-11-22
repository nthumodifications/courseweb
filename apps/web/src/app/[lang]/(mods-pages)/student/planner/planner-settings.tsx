import { useState, useEffect, useRef } from "react";
import { useAuth } from "react-oidc-context";
import {
  Save,
  X,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  MoreHorizontal,
  Share2,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  toast,
} from "@courseweb/ui";
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
import { getCourseItems } from "./data/courses";
import { getFolders, ensureUnsortedFolder } from "./data/folders";
import useDictionary from "@/dictionaries/useDictionary";
import { useConfirm } from "./lib/use-confirm";
import {
  useCreatePlannerTemplate,
  useDeletePlannerTemplate,
  usePlannerTemplates,
  useUpdatePlannerTemplate,
} from "@/lib/planner-templates";
import { plannerToTemplatePayload } from "./lib/templates";
import { plannerTemplateEvents } from "@/lib/trackingEvents";

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
  const templateText = dict.planner.templates;
  const auth = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const myTemplatesQuery = usePlannerTemplates({ mine: true });
  const createTemplate = useCreatePlannerTemplate();
  const updateTemplate = useUpdatePlannerTemplate();
  const deleteTemplate = useDeletePlannerTemplate();

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
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishDepartment, setPublishDepartment] = useState("");
  const [publishYear, setPublishYear] = useState("");
  const [departmentSuggestions, setDepartmentSuggestions] = useState<string[]>(
    [],
  );
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
        title: z.string().min(1, { message: ps.titleRequired }),
        department: z.string().min(1, { message: ps.departmentRequired }),
        enrollmentYear: z.string().min(1, {
          message: ps.enrollmentYearRequired,
        }),
        graduationYear: z.string().min(1, {
          message: ps.graduationYearRequired,
        }),
        requiredCredits: z.number().min(0, { message: ps.creditsNonNegative }),
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
          setPublishTitle(data.title || "");
          setPublishDepartment(data.department || "");
          setPublishYear(data.enrollmentYear || "");
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
          setPublishTitle("");
          setPublishDepartment("");
          setPublishYear("");
        }
      } catch (error) {
        console.error("Error loading planner data:", error);
      }
    };

    if (isOpen) {
      void loadData();
    }
  }, [isOpen, plannerCol, reset]);

  // Reset the active tab every time the dialog is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setActiveTab("basic");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetch(`${import.meta.env.VITE_COURSEWEB_API_URL}/graduation/colleges`)
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as {
              colleges?: { departments?: { name?: string }[] }[];
            })
          : null,
      )
      .then((result) => {
        if (!active) return;
        const names = (result?.colleges ?? []).flatMap((college) =>
          (college.departments ?? [])
            .map((department) => department.name)
            .filter((name): name is string => Boolean(name)),
        );
        setDepartmentSuggestions([...new Set(names)]);
      })
      .catch(() => {
        if (active) setDepartmentSuggestions([]);
      });
    return () => {
      active = false;
    };
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
            title: ps.removeCoursesSuccessTitle,
            description: ps.removeCoursesSuccessDescription,
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
            title: ps.resetPlannerSuccessTitle,
            description: ps.resetPlannerSuccessDescription,
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
        title: ps.actionFailTitle,
        description: ps.actionFailDescription,
        variant: "destructive",
      });
    }
  };

  // Destructive actions are now routed through the shared `useConfirm()`
  // modal instead of an inline `<Alert>` panel that stayed in the tree and
  // executed on a second click of a differently-styled button.
  const handleRemoveCoursesClick = async () => {
    const ok = await confirm({
      title: ps.removeCoursesConfirmTitle,
      description: ps.removeCoursesConfirmDescription,
      confirmLabel: common.delete,
      cancelLabel: common.cancel,
      destructive: true,
    });
    if (!ok) return;
    await handleConfirmAction("removeCourses");
  };

  const handleResetPlannerClick = async () => {
    const ok = await confirm({
      title: ps.resetPlannerConfirmTitle,
      description: ps.resetPlannerConfirmDescription,
      confirmLabel: common.delete,
      cancelLabel: common.cancel,
      destructive: true,
    });
    if (!ok) return;
    await handleConfirmAction("resetPlanner");
  };

  const captureCurrentPlanner = async () => {
    if (!plannerCol || !semesterCol || !courseCol || !foldersCol) {
      throw new Error("Planner data is not ready");
    }
    const [planner, currentFolders, currentItems, currentSemesters] =
      await Promise.all([
        getPlannerData(plannerCol),
        getFolders(foldersCol),
        getCourseItems(courseCol),
        getSemesters(semesterCol),
      ]);
    if (!planner)
      throw new Error("Create a planner before publishing a template");
    return {
      title: publishTitle.trim() || planner.title,
      description: publishDescription.trim(),
      department: publishDepartment.trim() || planner.department,
      entranceYear: publishYear.trim() || planner.enrollmentYear,
      requiredCredits: planner.requiredCredits,
      payload: plannerToTemplatePayload({
        planner,
        folders: currentFolders,
        items: currentItems,
        semesters: currentSemesters,
      }),
    };
  };

  const handlePublishTemplate = async () => {
    try {
      const values = await captureCurrentPlanner();
      const result = await createTemplate.mutateAsync(values);
      plannerTemplateEvents.published(result.template.id);
      toast({ title: templateText.publishSuccess });
    } catch {
      toast({
        title: templateText.publishFailed,
        variant: "destructive",
      });
    }
  };

  const handleUpdateTemplate = async (
    id: string,
    title: string,
    description: string,
  ) => {
    try {
      const values = await captureCurrentPlanner();
      await updateTemplate.mutateAsync({
        id,
        values: {
          ...values,
          title,
          description,
        },
      });
      toast({ title: templateText.updateSuccess });
    } catch {
      toast({
        title: templateText.updateFailed,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const accepted = await confirm({
      title: templateText.deleteConfirmTitle,
      description: templateText.deleteConfirmDescription,
      confirmLabel: templateText.delete,
      cancelLabel: common.cancel,
      destructive: true,
    });
    if (!accepted) return;
    try {
      await deleteTemplate.mutateAsync(id);
      toast({ title: templateText.deleteSuccess });
    } catch {
      toast({ title: templateText.deleteFailed, variant: "destructive" });
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
          throw new Error("Invalid import data format");
        }

        setImportData(importedData);
        setImportConfirmOpen(true);
      } catch (error) {
        console.error("Error parsing import data:", error);
        toast({
          title: ps.importFailTitle,
          description: ps.importParseFailDescription,
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
            title: ps.importFailTitle,
            description: ps.importSemestersFailDescription,
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
            title: ps.importFailTitle,
            description: ps.importCoursesFailDescription,
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
            title: ps.importFailTitle,
            description: ps.importFoldersFailDescription,
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
        title: ps.importSuccessTitle,
        description: ps.importSuccessDescription,
      });

      // Notify parent and close
      onSettingsUpdated();
      onClose();
    } catch (error) {
      console.error("Error importing data:", error);
      toast({
        title: ps.importFailTitle,
        description: ps.importGenericFailDescription,
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
              {isNewPlanner ? ps.createTitle : ps.settingsTitle}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {isNewPlanner ? ps.createDescription : ps.settingsDescription}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="bg-muted/50 mb-2">
              <TabsTrigger value="basic">{ps.basicTab}</TabsTrigger>
              <TabsTrigger value="actions">{ps.actionsTab}</TabsTrigger>
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
                        {ps.titleLabel}
                      </Label>
                      <Input
                        id="planner-title"
                        className="bg-muted/50 border-border h-8 mt-1"
                        placeholder={ps.titlePlaceholder}
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
                        {ps.departmentLabel}
                      </Label>
                      <Input
                        id="planner-department"
                        className="bg-muted/50 border-border h-8 mt-1"
                        placeholder={ps.departmentPlaceholder}
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
                          {ps.enrollmentYearLabel}
                        </Label>
                        <Input
                          id="planner-enrollment-year"
                          className="bg-muted/50 border-border h-8 mt-1"
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
                          {ps.graduationYearLabel}
                        </Label>
                        <Input
                          id="planner-graduation-year"
                          className="bg-muted/50 border-border h-8 mt-1"
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
                        {ps.requiredCreditsLabel}
                      </Label>
                      <Input
                        id="planner-required-credits"
                        type="number"
                        className="bg-muted/50 border-border h-8 mt-1"
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
                        {ps.descriptionLabel}
                      </Label>
                      <Textarea
                        id="planner-description"
                        className="bg-muted/50 border-border min-h-[80px] mt-1"
                        placeholder={ps.descriptionPlaceholder}
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
                          {ps.dataManagementTitle}
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
                              {ps.removeCoursesAction}
                            </Button>
                            <p className="text-muted-foreground text-xs mt-1">
                              {ps.removeCoursesDescription}
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
                              {ps.resetPlannerAction}
                            </Button>
                            <p className="text-muted-foreground text-xs mt-1">
                              {ps.resetPlannerDescription}
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="export" className="border-border">
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center">
                          <Download className="h-4 w-4 mr-2" />
                          {ps.exportImportTitle}
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
                              {ps.exportAction}
                            </Button>
                            <p className="text-muted-foreground text-xs mt-1">
                              {ps.exportDescription}
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
                              {ps.importAction}
                            </Button>
                            <p className="text-muted-foreground text-xs mt-1">
                              {ps.importDescription}
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

                    <AccordionItem value="publish" className="border-border">
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center">
                          <Share2 className="h-4 w-4 mr-2" />
                          {templateText.publishTitle}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <section className="space-y-3">
                          <p className="text-xs text-muted-foreground">
                            {templateText.publishDescription}
                          </p>
                          {auth.isAuthenticated && !auth.user?.expired ? (
                            <>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div>
                                  <Label
                                    htmlFor="planner-template-title"
                                    className="text-xs"
                                  >
                                    {templateText.titleLabel}
                                  </Label>
                                  <Input
                                    id="planner-template-title"
                                    value={publishTitle}
                                    onChange={(event) =>
                                      setPublishTitle(event.target.value)
                                    }
                                    maxLength={100}
                                    className="mt-1 h-8"
                                  />
                                </div>
                                <div>
                                  <Label
                                    htmlFor="planner-template-department"
                                    className="text-xs"
                                  >
                                    {templateText.departmentLabel}
                                  </Label>
                                  <Input
                                    id="planner-template-department"
                                    list="planner-template-departments"
                                    value={publishDepartment}
                                    onChange={(event) =>
                                      setPublishDepartment(event.target.value)
                                    }
                                    maxLength={100}
                                    className="mt-1 h-8"
                                  />
                                  <datalist id="planner-template-departments">
                                    {departmentSuggestions.map((department) => (
                                      <option
                                        key={department}
                                        value={department}
                                      />
                                    ))}
                                  </datalist>
                                </div>
                                <div>
                                  <Label
                                    htmlFor="planner-template-year"
                                    className="text-xs"
                                  >
                                    {templateText.yearLabel}
                                  </Label>
                                  <Input
                                    id="planner-template-year"
                                    value={publishYear}
                                    onChange={(event) =>
                                      setPublishYear(event.target.value)
                                    }
                                    maxLength={3}
                                    className="mt-1 h-8"
                                  />
                                </div>
                                <div>
                                  <Label
                                    htmlFor="planner-template-description"
                                    className="text-xs"
                                  >
                                    {templateText.descriptionLabel}
                                  </Label>
                                  <Textarea
                                    id="planner-template-description"
                                    value={publishDescription}
                                    onChange={(event) =>
                                      setPublishDescription(event.target.value)
                                    }
                                    maxLength={1000}
                                    rows={2}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => void handlePublishTemplate()}
                                disabled={createTemplate.isPending}
                              >
                                {templateText.publishTemplate}
                              </Button>
                              <div className="space-y-1">
                                <h4 className="text-sm font-medium">
                                  {templateText.myTemplates}
                                </h4>
                                {myTemplatesQuery.isLoading ? (
                                  <p className="text-xs text-muted-foreground">
                                    {templateText.loading}
                                  </p>
                                ) : myTemplatesQuery.data?.templates.length ? (
                                  <div className="divide-y divide-border">
                                    {myTemplatesQuery.data.templates.map(
                                      (entry) => (
                                        <div
                                          key={entry.id}
                                          className="flex items-center justify-between gap-2 py-2"
                                        >
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                              <span className="truncate">
                                                {entry.title}
                                              </span>
                                              {entry.status === "hidden" && (
                                                <Badge variant="secondary">
                                                  {templateText.hidden}
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                              {templateText.usedCount.replace(
                                                "{count}",
                                                String(entry.useCount),
                                              )}
                                            </p>
                                          </div>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                aria-label={
                                                  templateText.moreActions
                                                }
                                              >
                                                <MoreHorizontal className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  void handleUpdateTemplate(
                                                    entry.id,
                                                    entry.title,
                                                    entry.description,
                                                  )
                                                }
                                              >
                                                {templateText.updateCurrentPlan}
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  void handleDeleteTemplate(
                                                    entry.id,
                                                  )
                                                }
                                              >
                                                {templateText.delete}
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    {templateText.myTemplatesEmpty}
                                  </p>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                              <span>{templateText.signInPrompt}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void auth.signinRedirect()}
                              >
                                {templateText.signIn}
                              </Button>
                            </div>
                          )}
                        </section>
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
              {isNewPlanner ? ps.createSubmit : ps.saveSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ps.importConfirmDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {ps.importConfirmDialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-200 hover:bg-red-400 dark:bg-red-900 dark:hover:bg-red-800"
              onClick={handleImportConfirm}
            >
              {ps.confirmImport}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
