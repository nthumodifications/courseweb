"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit, Save, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  getSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  toggleSemesterActive,
  generateSemesterId,
} from "./data/semesters";
import { useRxCollection } from "rxdb-hooks";
import { SemesterDocType } from "@/config/rxdb";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { semesterInfo } from "@/const/semester";

// Define the validation schema with Zod
const semesterFormSchema = z.object({
  id: z.string().min(1, { message: "學期ID為必填欄位" }),
  name: z.string().min(1, { message: "學期名稱為必填欄位" }),
  year: z.string().min(1, { message: "學年為必填欄位" }),
  term: z.string().min(1, { message: "學期為必填欄位" }),
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
  const [semesters, setSemesters] = useState<SemesterDocType[]>([]);
  const [selectedSemester, setSelectedSemester] =
    useState<SemesterDocType | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [newSemester, setNewSemester] = useState<boolean>(false);
  const [semesterLookupMessage, setSemesterLookupMessage] =
    useState<string>("");
  const semesterCol = useRxCollection<SemesterDocType>("semesters");

  // Set up form with React Hook Form and Zod validation
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SemesterFormValues>({
    resolver: zodResolver(semesterFormSchema),
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

  // Lookup and fill semester dates when ID is entered
  useEffect(() => {
    if (watchId && editMode) {
      const foundSemester = findSemesterById(watchId);
      if (foundSemester) {
        // Set dates from predefined semester data
        const startDate = foundSemester.begins.toISOString().split("T")[0];
        const endDate = foundSemester.ends.toISOString().split("T")[0];

        setValue("startDate", startDate);
        setValue("endDate", endDate);

        // Extract ROC year and term from ID
        const taiwaneseYear = watchId.substring(0, 3);
        const term = watchId.substring(3, 4) === "1" ? "1" : "2";

        setValue("year", taiwaneseYear);
        setValue("term", term);
        setSemesterLookupMessage("✓ 從學期代碼找到學期資料");

        // Update name based on the extracted values
        const name = `${taiwaneseYear}-${term} ${term === "1" ? "(秋季學期)" : "(春季學期)"}`;
        setValue("name", name);
      } else {
        setSemesterLookupMessage("");
      }
    } else {
      setSemesterLookupMessage("");
    }
  }, [watchId, editMode, setValue]);

  // Update ID and name when year or term changes
  useEffect(() => {
    if (watchYear && watchTerm && editMode) {
      const id = generateSemesterId(watchYear, watchTerm);
      const name = `${watchYear}-${watchTerm} ${watchTerm === "1" ? "(秋季學期)" : "(春季學期)"}`;

      setValue("id", id);
      setValue("name", name);

      // Check if we can auto-fill dates from predefined semesters
      const foundSemester = findSemesterById(id);
      if (foundSemester) {
        const startDate = foundSemester.begins.toISOString().split("T")[0];
        const endDate = foundSemester.ends.toISOString().split("T")[0];

        setValue("startDate", startDate);
        setValue("endDate", endDate);
        setSemesterLookupMessage("✓ 從學期代碼找到學期資料");
      } else {
        setSemesterLookupMessage("");
      }
    }
  }, [watchYear, watchTerm, editMode, setValue]);

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
  }, [isOpen]);

  // Handle semester selection
  const handleSelectSemester = (semester: SemesterDocType) => {
    setSelectedSemester(semester);
    setEditMode(false);
    setNewSemester(false);
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
        order: selectedSemester.order,
        startDate: selectedSemester.startDate,
        endDate: selectedSemester.endDate,
      });
      setEditMode(true);
      setNewSemester(false);
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
    const name = `${nextYear}-${nextTerm} ${nextTerm === "1" ? "(秋季學期)" : "(春季學期)"}`;

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

    try {
      await deleteSemester(semesterCol!, selectedSemester.id);

      // Refresh semesters
      const updatedSemesters = await getSemesters(semesterCol!);
      setSemesters(updatedSemesters.sort((a, b) => (a.id > b.id ? 1 : -1)));

      // Reset state
      setSelectedSemester(null);
      setEditMode(false);
      setNewSemester(false);

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
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600">已完成</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-600">進行中</Badge>;
      default:
        return <Badge variant="outline">計劃中</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>學期管理</DialogTitle>
          <DialogDescription className="text-gray-400">
            管理學期和學年
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Left side - Semester list */}
          <div className="w-1/2 border border-border rounded-md overflow-hidden flex flex-col">
            <div className="p-2 border-b border-border flex justify-between items-center">
              <h3 className="font-medium">學期列表</h3>
              <Button size="sm" onClick={handleNewSemester}>
                <Plus className="h-4 w-4 mr-2" />
                新增學期
              </Button>
            </div>

            <ScrollArea className="flex-1">
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
                        {semester.isActive ? "啟用" : "停用"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right side - Semester details/edit */}
          <div className="w-1/2 border border-border rounded-md overflow-hidden flex flex-col">
            {selectedSemester && !editMode ? (
              <>
                <div className="p-2 border-b border-border flex justify-between items-center">
                  <h3 className="font-medium">學期詳情</h3>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEditMode}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      編輯
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      刪除
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        學期名稱
                      </h4>
                      <p className="mt-1">{selectedSemester.name}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        學年
                      </h4>
                      <p className="mt-1">{selectedSemester.year}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        學期
                      </h4>
                      <p className="mt-1">
                        {selectedSemester.term === "1"
                          ? "秋季學期"
                          : "春季學期"}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        狀態
                      </h4>
                      <div className="mt-1">
                        {getStatusBadge(selectedSemester.status)}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        啟用狀態
                      </h4>
                      <p className="mt-1">
                        {selectedSemester.isActive ? "啟用" : "停用"}
                      </p>
                    </div>

                    {selectedSemester.startDate && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400">
                          開始日期
                        </h4>
                        <p className="mt-1">
                          {new Date(
                            selectedSemester.startDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {selectedSemester.endDate && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400">
                          結束日期
                        </h4>
                        <p className="mt-1">
                          {new Date(
                            selectedSemester.endDate,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : editMode ? (
              <>
                <div className="p-2 border-b border-border flex justify-between items-center">
                  <h3 className="font-medium">
                    {newSemester ? "新增學期" : "編輯學期"}
                  </h3>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditMode(false);
                        setNewSemester(false);
                        setSemesterLookupMessage("");
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit(onSubmit)}
                      disabled={isSubmitting}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      儲存
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <form className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="semester-id">
                        學期代碼 (民國年份+學期，例如: 11310)
                      </Label>
                      <Input
                        id="semester-id"
                        className="bg-neutral-50 border-border dark:bg-neutral-800  "
                        placeholder="例如: 11310 (113學年度第1學期)"
                        {...register("id")}
                      />
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
                        <Label htmlFor="semester-year">學年 (民國年)</Label>
                        <Input
                          id="semester-year"
                          className="bg-neutral-50 border-border dark:bg-neutral-800  "
                          placeholder="例如: 113"
                          {...register("year")}
                        />
                        {errors.year && (
                          <p className="text-red-500 text-sm">
                            {errors.year.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="semester-term">學期</Label>
                        <Select
                          defaultValue={watch("term")}
                          onValueChange={(value) => setValue("term", value)}
                        >
                          <SelectTrigger
                            id="semester-term"
                            className="bg-neutral-50 border-border dark:bg-neutral-800 "
                          >
                            <SelectValue placeholder="選擇學期" />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-50 border-border dark:bg-neutral-800 ">
                            <SelectItem value="1">秋季學期 (1)</SelectItem>
                            <SelectItem value="2">春季學期 (2)</SelectItem>
                            <SelectItem value="3">暑假 (3)</SelectItem>
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
                      <Label htmlFor="semester-name">學期名稱</Label>
                      <Input
                        id="semester-name"
                        className="bg-neutral-50 border-border dark:bg-neutral-800  "
                        {...register("name")}
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm">
                          {errors.name.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        學期名稱會自動生成，但您可以自行修改
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="semester-status">狀態</Label>
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
                          className="bg-neutral-50 border-border dark:bg-neutral-800 "
                        >
                          <SelectValue placeholder="選擇狀態" />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-50 border-border dark:bg-neutral-800 ">
                          <SelectItem value="completed">已完成</SelectItem>
                          <SelectItem value="in-progress">進行中</SelectItem>
                          <SelectItem value="planned">計劃中</SelectItem>
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
                        <Label htmlFor="semester-start-date">開始日期</Label>
                        <Input
                          id="semester-start-date"
                          type="date"
                          className="bg-neutral-50 border-border dark:bg-neutral-800  "
                          {...register("startDate")}
                        />
                        {errors.startDate && (
                          <p className="text-red-500 text-sm">
                            {errors.startDate.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="semester-end-date">結束日期</Label>
                        <Input
                          id="semester-end-date"
                          type="date"
                          className="bg-neutral-50 border-border dark:bg-neutral-800  "
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
                      <Label htmlFor="semester-active">啟用此學期</Label>
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
                <p>選擇一個學期以查看詳情</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            關閉
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
