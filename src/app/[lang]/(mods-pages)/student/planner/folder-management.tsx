"use client";

import { useState, useEffect } from "react";
import {
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  reorderFolders,
} from "./data/folders";
import { FolderDocType } from "@/config/rxdb";
import { useRxCollection } from "rxdb-hooks";
import { useForm, Controller } from "react-hook-form";

interface FolderManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onFoldersUpdated: () => void;
}

type FolderFormValues = Omit<
  FolderDocType,
  "toJSON" | "toMutableJSON" | "deleted$"
>;

export function FolderManagement({
  isOpen,
  onClose,
  onFoldersUpdated,
}: FolderManagementProps) {
  const [folders, setFolders] = useState<FolderDocType[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderDocType | null>(
    null,
  );
  const [editMode, setEditMode] = useState<boolean>(false);
  const [newFolder, setNewFolder] = useState<boolean>(false);

  // Form with react-hook-form
  const { register, handleSubmit, control, reset, setValue, watch } =
    useForm<FolderFormValues>({
      defaultValues: {
        id: "",
        title: "",
        parent: "planner-1",
        min: 0,
        max: 0,
        metric: "credits",
        requireChildValidation: false,
        titlePlacement: "top",
        order: 0,
      },
    });

  const folderCol = useRxCollection<FolderDocType>("folders");

  // Load folders
  useEffect(() => {
    const loadFolders = async () => {
      if (!folderCol) return;
      const data = await getFolders(folderCol);
      setFolders(data);
    };

    if (isOpen) {
      loadFolders();
    }
  }, [isOpen, folderCol]);

  // Get root folders
  const getRootFolders = () => {
    return folders
      .filter((folder) => folder.parent === "planner-1")
      .sort((a, b) => a.order - b.order);
  };

  // Get child folders
  const getChildFolders = (parentId: string) => {
    return folders
      .filter((folder) => folder.parent === parentId)
      .sort((a, b) => a.order - b.order);
  };

  // Handle folder selection
  const handleSelectFolder = (folder: FolderDocType) => {
    setSelectedFolder(folder);
    setEditMode(false);
    setNewFolder(false);
  };

  // Handle edit mode
  const handleEditMode = () => {
    if (selectedFolder) {
      // Reset form with selected folder data
      reset({
        ...selectedFolder,
      });
      setEditMode(true);
      setNewFolder(false);
    }
  };

  // Handle new folder
  const handleNewFolder = () => {
    const newId = `folder-${Date.now()}`;
    const parentId = selectedFolder ? selectedFolder.id : "planner-1";
    const newOrder = folders.filter((f) => f.parent === parentId).length;

    reset({
      id: newId,
      title: "新類別",
      parent: parentId,
      min: 0,
      max: 0,
      metric: "credits",
      requireChildValidation: false,
      titlePlacement: "top",
      order: newOrder,
    });

    setEditMode(true);
    setNewFolder(true);
  };

  // Handle save
  const onSubmit = async (data: FolderFormValues) => {
    if (!data.id || !data.title) return;

    try {
      if (newFolder) {
        await createFolder(folderCol!, data as FolderDocType);
      } else {
        await updateFolder(folderCol!, data as FolderDocType);
      }

      // Refresh folders
      const updatedFolders = await getFolders(folderCol!);
      setFolders(updatedFolders);

      // Reset state
      setEditMode(false);
      setNewFolder(false);

      // Update selected folder with the refreshed data
      const updatedFolder =
        updatedFolders.find((f) => f.id === data.id) || null;
      setSelectedFolder(updatedFolder);

      // Notify parent
      onFoldersUpdated();
    } catch (error) {
      console.error("Error saving folder:", error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedFolder) return;

    try {
      await deleteFolder(folderCol!, selectedFolder.id);

      // Refresh folders
      const updatedFolders = await getFolders(folderCol!);
      setFolders(updatedFolders);

      // Reset state
      setSelectedFolder(null);
      setEditMode(false);
      setNewFolder(false);
      reset();

      // Notify parent
      onFoldersUpdated();
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
  };

  // Handle move up
  const handleMoveUp = async () => {
    if (!selectedFolder) return;

    const siblings = folders
      .filter((f) => f.parent === selectedFolder.parent)
      .sort((a, b) => a.order - b.order);

    const index = siblings.findIndex((f) => f.id === selectedFolder.id);
    if (index <= 0) return;

    try {
      // Swap order with previous sibling
      const prevSibling = siblings[index - 1];
      await reorderFolders(folderCol!, selectedFolder.id, prevSibling.order);
      await reorderFolders(folderCol!, prevSibling.id, selectedFolder.order);

      // Refresh folders
      const updatedFolders = await getFolders(folderCol!);
      setFolders(updatedFolders);

      // Update selected folder
      setSelectedFolder(
        updatedFolders.find((f) => f.id === selectedFolder.id) || null,
      );

      // Notify parent
      onFoldersUpdated();
    } catch (error) {
      console.error("Error moving folder:", error);
    }
  };

  // Handle move down
  const handleMoveDown = async () => {
    if (!selectedFolder) return;

    const siblings = folders
      .filter((f) => f.parent === selectedFolder.parent)
      .sort((a, b) => a.order - b.order);

    const index = siblings.findIndex((f) => f.id === selectedFolder.id);
    if (index >= siblings.length - 1) return;

    try {
      // Swap order with next sibling
      const nextSibling = siblings[index + 1];
      await reorderFolders(folderCol!, selectedFolder.id, nextSibling.order);
      await reorderFolders(folderCol!, nextSibling.id, selectedFolder.order);

      // Refresh folders
      const updatedFolders = await getFolders(folderCol!);
      setFolders(updatedFolders);

      // Update selected folder
      setSelectedFolder(
        updatedFolders.find((f) => f.id === selectedFolder.id) || null,
      );

      // Notify parent
      onFoldersUpdated();
    } catch (error) {
      console.error("Error moving folder:", error);
    }
  };

  // Render folder tree item
  const renderFolderItem = (folder: FolderDocType, level = 0) => {
    const children = getChildFolders(folder.id);
    const hasChildren = children.length > 0;

    return (
      <div key={folder.id} className="mb-1">
        <div
          className={`flex items-center p-2 rounded-md ${selectedFolder?.id === folder.id ? "bg-gray-800" : "hover:bg-gray-800/50"} cursor-pointer`}
          onClick={() => handleSelectFolder(folder)}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          <div className="mr-2 flex-shrink-0">
            {hasChildren ? (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            ) : (
              <div className="w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{folder.title}</div>
            <div className="text-xs text-gray-400">
              {folder.min} - {folder.max === 0 ? "∞" : folder.max}{" "}
              {folder.metric === "credits" ? "學分" : "課程"}
            </div>
          </div>
        </div>

        {hasChildren && (
          <div className="ml-6">
            {children.map((child) => renderFolderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>類別管理</DialogTitle>
          <DialogDescription className="text-gray-400">
            管理畢業要求類別和結構
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Left side - Folder tree */}
          <div className="w-1/2 border border-gray-700 rounded-md overflow-hidden flex flex-col">
            <div className="p-2 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-medium">類別結構</h3>
              <Button size="sm" onClick={handleNewFolder}>
                <Plus className="h-4 w-4 mr-2" />
                新增類別
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2">
                {getRootFolders().map((folder) => renderFolderItem(folder))}
              </div>
            </ScrollArea>
          </div>

          {/* Right side - Folder details/edit */}
          <div className="w-1/2 border border-gray-700 rounded-md overflow-hidden flex flex-col">
            {selectedFolder && !editMode ? (
              <>
                <div className="p-2 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="font-medium">類別詳情</h3>
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
                        類別名稱
                      </h4>
                      <p className="mt-1">{selectedFolder.title}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        學分要求
                      </h4>
                      <p className="mt-1">
                        {selectedFolder.min} -{" "}
                        {selectedFolder.max === 0
                          ? "無上限"
                          : selectedFolder.max}{" "}
                        {selectedFolder.metric === "credits" ? "學分" : "課程"}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        父類別
                      </h4>
                      <p className="mt-1">
                        {selectedFolder.parent === "planner-1"
                          ? "無 (根類別)"
                          : folders.find((f) => f.id === selectedFolder.parent)
                              ?.title || "無"}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        排序
                      </h4>
                      <div className="mt-1 flex items-center gap-2">
                        <p>{selectedFolder.order}</p>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleMoveUp}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleMoveDown}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400">
                        需要子類別驗證
                      </h4>
                      <p className="mt-1">
                        {selectedFolder.requireChildValidation ? "是" : "否"}
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </>
            ) : editMode ? (
              <>
                <div className="p-2 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="font-medium">
                    {newFolder ? "新增類別" : "編輯類別"}
                  </h3>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditMode(false);
                        setNewFolder(false);
                        reset();
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      取消
                    </Button>
                    <Button size="sm" onClick={handleSubmit(onSubmit)}>
                      <Save className="h-4 w-4 mr-2" />
                      儲存
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="p-4 space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="folder-title">類別名稱</Label>
                      <Input
                        id="folder-title"
                        {...register("title", { required: true })}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="folder-min">最低要求</Label>
                        <Input
                          id="folder-min"
                          type="number"
                          {...register("min", { valueAsNumber: true })}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="folder-max">最高要求</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="folder-max"
                            type="number"
                            {...register("max", { valueAsNumber: true })}
                            className="bg-gray-800 border-gray-700 text-white"
                          />
                          <div className="flex items-center gap-1">
                            <Controller
                              control={control}
                              name="max"
                              render={({ field }) => (
                                <Checkbox
                                  id="infinite-max"
                                  checked={field.value === 0}
                                  onCheckedChange={(checked) => {
                                    setValue(
                                      "max",
                                      checked ? 0 : watch("min") || 0,
                                    );
                                  }}
                                />
                              )}
                            />
                            <Label htmlFor="infinite-max" className="text-sm">
                              無上限
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="folder-metric">計算單位</Label>
                      <Controller
                        control={control}
                        name="metric"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              id="folder-metric"
                              className="bg-gray-800 border-gray-700"
                            >
                              <SelectValue placeholder="選擇計算單位" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="credits">學分</SelectItem>
                              <SelectItem value="courses">課程數</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="folder-parent">父類別</Label>
                      <Controller
                        control={control}
                        name="parent"
                        render={({ field }) => (
                          <Select
                            value={field.value || "planner-1"}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              id="folder-parent"
                              className="bg-gray-800 border-gray-700"
                            >
                              <SelectValue placeholder="選擇父類別" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="planner-1">
                                無 (根類別)
                              </SelectItem>
                              {folders
                                .filter((f) => f.id !== watch("id"))
                                .map((folder) => (
                                  <SelectItem key={folder.id} value={folder.id}>
                                    {folder.title}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Controller
                        control={control}
                        name="requireChildValidation"
                        render={({ field }) => (
                          <Checkbox
                            id="require-child-validation"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="require-child-validation">
                        需要子類別驗證
                      </Label>
                    </div>

                    <input type="hidden" {...register("id")} />
                    <input type="hidden" {...register("order")} />
                    <input type="hidden" {...register("titlePlacement")} />
                  </form>
                </ScrollArea>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>選擇一個類別以查看詳情</p>
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
