import { useState, useEffect, useRef } from "react";
import {
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  Download,
  Upload,
  ExternalLink,
} from "lucide-react";
import { Button } from "@courseweb/ui";
import { Input } from "@courseweb/ui";
import { Label } from "@courseweb/ui";
import { Checkbox } from "@courseweb/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@courseweb/ui";
import { toast } from "@courseweb/ui";
import { Alert, AlertDescription } from "@courseweb/ui";
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  reorderFolders,
  ensureUnsortedFolder,
} from "./data/folders";
import { FolderDocType } from "./rxdb";
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
  const [isRootSelected, setIsRootSelected] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [newFolder, setNewFolder] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<boolean>(false);
  const [importPreview, setImportPreview] = useState<FolderDocType[]>([]);
  const [importConfirmOpen, setImportConfirmOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Ensure _unsorted folder exists
      await ensureUnsortedFolder(folderCol);
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
      .filter(
        (folder) => folder.parent === "planner-1" && folder.id !== "_unsorted",
      )
      .sort((a, b) => a.order - b.order)
      .concat(folders.filter((folder) => folder.id === "_unsorted"));
  };

  // Get child folders
  const getChildFolders = (parentId: string) => {
    return folders
      .filter((folder) => folder.parent === parentId)
      .sort((a, b) => a.order - b.order);
  };

  // Handle folder selection
  const handleSelectFolder = (folder: FolderDocType) => {
    // Don't allow editing the _unsorted folder
    if (folder.id === "_unsorted") {
      setSelectedFolder(folder);
      setEditMode(false);
      setNewFolder(false);
      setIsRootSelected(false);
      return;
    }
    setSelectedFolder(folder);
    setEditMode(false);
    setNewFolder(false);
    setIsRootSelected(false);
  };

  // Handle root selection
  const handleSelectRoot = () => {
    setSelectedFolder(null);
    setEditMode(false);
    setNewFolder(false);
    setIsRootSelected(true);
  };

  // Handle edit mode
  const handleEditMode = () => {
    if (selectedFolder && selectedFolder.id !== "_unsorted") {
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
    // If root is selected or no folder is selected, create at root level
    const parentId = isRootSelected
      ? "planner-1"
      : selectedFolder
        ? selectedFolder.id
        : "planner-1";
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
    if (!selectedFolder || selectedFolder.id === "_unsorted") return;

    try {
      // Get items collection
      const itemsCol = folderCol?.database.collections.items;
      if (!itemsCol) return;

      // Helper function to get all child folder IDs recursively
      const getAllChildFolderIds = (
        parentId: string,
        allFolders: FolderDocType[],
      ): string[] => {
        const directChildren = allFolders
          .filter((f) => f.parent === parentId)
          .map((f) => f.id);
        const allChildren = [...directChildren];

        for (const childId of directChildren) {
          const grandchildren = getAllChildFolderIds(childId, allFolders);
          allChildren.push(...grandchildren);
        }

        return allChildren;
      };

      // Get all child folders of the selected folder
      const childFolderIds = getAllChildFolderIds(selectedFolder.id, folders);

      // Get all folder IDs to be deleted (selected folder and all its descendants)
      const folderIdsToDelete = [selectedFolder.id, ...childFolderIds];

      // Move all items from these folders to _unsorted
      const items = await itemsCol
        .find()
        .where("parent")
        .in(folderIdsToDelete)
        .exec();

      for (const item of items) {
        await item.patch({ parent: "_unsorted" });
      }

      // Delete all child folders first (bottom-up to avoid referential issues)
      for (const folderId of childFolderIds.reverse()) {
        await deleteFolder(folderCol!, folderId);
      }

      // Delete the selected folder
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

      toast({
        title: "類別已刪除",
        description: `類別及其子類別已被刪除，${items.length > 0 ? "相關課程已移至「未分類」" : ""}。`,
      });
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast({
        title: "刪除失敗",
        description: "無法刪除類別，請再試一次。",
        variant: "destructive",
      });
    }
  };

  // Handle move up
  const handleMoveUp = async () => {
    if (!selectedFolder || selectedFolder.id === "_unsorted") return;

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
    if (!selectedFolder || selectedFolder.id === "_unsorted") return;

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

  // Export folders as template
  const handleExportTemplate = () => {
    try {
      // Prepare folders data for export (omitting rxdb-specific properties and _unsorted folder)
      const exportData = folders
        .filter((folder) => folder.id !== "_unsorted")
        .map((folder) => ({
          id: folder.id,
          title: folder.title,
          parent: folder.parent,
          min: folder.min,
          max: folder.max,
          metric: folder.metric,
          requireChildValidation: folder.requireChildValidation,
          titlePlacement: folder.titlePlacement,
          order: folder.order,
        }));

      // Create JSON blob
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      // Create download URL
      const url = URL.createObjectURL(blob);

      // Create temporary link and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `folder-template-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "範本匯出成功",
        description: "範本已下載，您可以在 Notion 頁面上分享它。",
      });
    } catch (error) {
      console.error("Error exporting template:", error);
      toast({
        title: "匯出失敗",
        description: "無法匯出範本，請再試一次。",
        variant: "destructive",
      });
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
          !Array.isArray(importedData) ||
          !importedData.every(
            (item) =>
              item.id &&
              item.title &&
              typeof item.min === "number" &&
              typeof item.max === "number" &&
              item.parent,
          )
        ) {
          throw new Error("無效的範本檔案格式");
        }

        setImportPreview(importedData);
        setImportMode(true);
      } catch (error) {
        console.error("Error parsing template:", error);
        toast({
          title: "匯入失敗",
          description: "無法解析範本檔案，請確保它是有效的 JSON 格式。",
          variant: "destructive",
        });

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  // Import template
  const handleImportConfirm = async () => {
    if (!folderCol || importPreview.length === 0) return;

    try {
      // Get the items collection to update their references
      const itemsCol = folderCol.database.collections.items;
      if (itemsCol) {
        // Get all items that reference folders
        const items = await itemsCol.find().exec();

        // Get all valid folder IDs from the new structure
        const newFolderIds = importPreview.map((folder) => folder.id);

        // Update items' parent references
        for (const item of items) {
          if (item.parent && !newFolderIds.includes(item.parent)) {
            // If the parent folder doesn't exist in the new structure, set parent to _unsorted
            await item.patch({ parent: "_unsorted" });
          }
        }
      }

      // Save _unsorted folder if it exists
      const unsortedFolder = folders.find((f) => f.id === "_unsorted");

      // Delete all existing folders except _unsorted
      for (const folder of folders.filter((f) => f.id !== "_unsorted")) {
        await deleteFolder(folderCol, folder.id);
      }

      // Create new folders
      for (const folder of importPreview.filter((f) => f.id !== "_unsorted")) {
        await createFolder(folderCol, folder as FolderDocType);
      }

      // Ensure _unsorted folder exists
      await ensureUnsortedFolder(folderCol);

      // Refresh folders
      const updatedFolders = await getFolders(folderCol);
      setFolders(updatedFolders);

      // Reset state
      setImportMode(false);
      setImportPreview([]);
      setImportConfirmOpen(false);

      toast({
        title: "範本匯入成功",
        description: "資料夾結構已更新，未匹配的項目已移至「未分類」。",
      });

      // Notify parent
      onFoldersUpdated();
    } catch (error) {
      console.error("Error importing template:", error);
      toast({
        title: "匯入失敗",
        description: "無法匯入範本，請再試一次。",
        variant: "destructive",
      });
    }
  };

  // Cancel import
  const handleCancelImport = () => {
    setImportMode(false);
    setImportPreview([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Render folder tree item
  const renderFolderItem = (folder: FolderDocType, level = 0) => {
    const children = getChildFolders(folder.id);
    const hasChildren = children.length > 0;
    const isUnsorted = folder.id === "_unsorted";

    return (
      <div key={folder.id} className="mb-1">
        <div
          className={`flex items-center p-2 rounded-md ${selectedFolder?.id === folder.id ? "bg-neutral-50 dark:bg-neutral-800" : "hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50"} cursor-pointer ${isUnsorted ? "opacity-70" : ""}`}
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
            <div className="font-medium truncate">
              {folder.title}
              {isUnsorted && " (系統)"}
            </div>
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

  // Render folder tree item for preview
  const renderFolderPreviewItem = (folder: FolderDocType, level = 0) => {
    const children = importPreview
      .filter((f) => f.parent === folder.id)
      .sort((a, b) => a.order - b.order);
    const hasChildren = children.length > 0;

    return (
      <div key={folder.id} className="mb-1">
        <div
          className={`flex items-center p-2 rounded-md hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50`}
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
            {children.map((child) => renderFolderPreviewItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Get preview root folders
  const getPreviewRootFolders = () => {
    return importPreview
      .filter((folder) => folder.parent === "planner-1")
      .sort((a, b) => a.order - b.order);
  };

  // Render folder tree
  const renderFolderTree = () => {
    const rootFolders = getRootFolders();

    return (
      <div className="p-2">
        {/* Root container folder */}
        <div className="mb-2">
          <div
            className={`flex items-center p-2 rounded-md ${isRootSelected ? "bg-neutral-50 dark:bg-neutral-800" : "hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50"} cursor-pointer`}
            onClick={handleSelectRoot}
          >
            <div className="mr-2 flex-shrink-0">
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">根目錄</div>
              <div className="text-xs text-gray-400">所有類別的最上層</div>
            </div>
          </div>

          {/* Root folder children */}
          <div className="ml-6">
            {rootFolders.map((folder) => renderFolderItem(folder, 1))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>類別管理</DialogTitle>
            <DialogDescription className="text-gray-400">
              管理畢業要求類別和結構
            </DialogDescription>
          </DialogHeader>

          {!importMode ? (
            <div className="flex flex-1 gap-4 overflow-hidden">
              {/* Left side - Folder tree */}
              <div className="w-1/2 border border-border rounded-md overflow-hidden flex flex-col">
                <div className="p-2 border-b border-border flex justify-between items-center">
                  <h3 className="font-medium">類別結構</h3>
                  <Button size="sm" onClick={handleNewFolder}>
                    <Plus className="h-4 w-4 mr-2" />
                    新增類別
                  </Button>
                </div>

                <ScrollArea className="flex-1">{renderFolderTree()}</ScrollArea>
              </div>

              {/* Right side - Folder details/edit */}
              {selectedFolder && !editMode ? (
                <>
                  <div className="w-1/2 border border-border rounded-md overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-border flex justify-between items-center">
                      <h3 className="font-medium">類別詳情</h3>
                      <div className="flex gap-1">
                        {selectedFolder.id !== "_unsorted" && (
                          <>
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
                          </>
                        )}
                        {selectedFolder.id === "_unsorted" && (
                          <div className="text-xs text-gray-400 italic">
                            系統類別，不可編輯
                          </div>
                        )}
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
                            {selectedFolder.metric === "credits"
                              ? "學分"
                              : "課程"}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-400">
                            父類別
                          </h4>
                          <p className="mt-1">
                            {selectedFolder.parent === "planner-1"
                              ? "無 (根類別)"
                              : folders.find(
                                  (f) => f.id === selectedFolder.parent,
                                )?.title || "無"}
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
                            {selectedFolder.requireChildValidation
                              ? "是"
                              : "否"}
                          </p>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                </>
              ) : editMode ? (
                <>
                  <div className="w-1/2 border border-border rounded-md overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-border flex justify-between items-center">
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
                            className="bg-neutral-50 dark:bg-neutral-800 border-border"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="folder-min">最低要求</Label>
                            <Input
                              id="folder-min"
                              type="number"
                              {...register("min", { valueAsNumber: true })}
                              className="bg-neutral-50 dark:bg-neutral-800 border-border"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="folder-max">最高要求</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="folder-max"
                                type="number"
                                {...register("max", { valueAsNumber: true })}
                                className="bg-neutral-50 dark:bg-neutral-800 border-border"
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
                                <Label
                                  htmlFor="infinite-max"
                                  className="text-sm"
                                >
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
                                  className="bg-neutral-50 dark:bg-neutral-800 border-border"
                                >
                                  <SelectValue placeholder="選擇計算單位" />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-50 dark:bg-neutral-800 border-border">
                                  <SelectItem value="credits">學分</SelectItem>
                                  <SelectItem value="courses">
                                    課程數
                                  </SelectItem>
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
                                  className="bg-neutral-50 dark:bg-neutral-800 border-border"
                                >
                                  <SelectValue placeholder="選擇父類別" />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-50 dark:bg-neutral-800 border-border">
                                  <SelectItem value="planner-1">
                                    無 (根類別)
                                  </SelectItem>
                                  {folders
                                    .filter((f) => f.id !== watch("id"))
                                    .map((folder) => (
                                      <SelectItem
                                        key={folder.id}
                                        value={folder.id}
                                      >
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
                  </div>
                </>
              ) : isRootSelected ? (
                <div className="w-1/2 border border-border rounded-md overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-border flex justify-between items-center">
                    <h3 className="font-medium">根目錄</h3>
                    <Button size="sm" onClick={handleNewFolder}>
                      <Plus className="h-4 w-4 mr-2" />
                      新增根類別
                    </Button>
                  </div>
                  <div className="p-4 flex flex-col items-center justify-center h-full text-center">
                    <h4 className="mb-2 font-medium">根類別</h4>
                    <p className="text-gray-400 mb-4">
                      這是最頂層類別。您可以在此添加新的根類別，根類別將直接顯示在主畫面上。
                    </p>
                    <Button onClick={handleNewFolder}>
                      <Plus className="h-4 w-4 mr-2" />
                      新增根類別
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>選擇一個類別以查看詳情</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 gap-4 overflow-hidden">
              <div className="w-full border border-border rounded-md overflow-hidden flex flex-col">
                <div className="p-2 border-b border-border flex justify-between items-center">
                  <h3 className="font-medium">匯入預覽</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelImport}
                    >
                      <X className="h-4 w-4 mr-2" />
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setImportConfirmOpen(true)}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      確認匯入
                    </Button>
                  </div>
                </div>

                <div className="p-4">
                  <Alert className="mb-4 dark:bg-amber-900/20 dark:border-amber-700 bg-amber-100/20 border-amber-300">
                    <AlertDescription>
                      確認匯入將會覆蓋所有現有類別。請仔細檢查下方預覽的資料夾結構。
                    </AlertDescription>
                  </Alert>

                  <div className="mb-4">
                    <h3 className="font-medium mb-2">資料夾結構預覽</h3>
                    <div className="border border-border rounded-md p-2">
                      <ScrollArea className="h-[40vh]">
                        {getPreviewRootFolders().map((folder) =>
                          renderFolderPreviewItem(folder),
                        )}
                      </ScrollArea>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <p>總共 {importPreview.length} 個資料夾將被匯入</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-between sm:items-center pt-2">
            {!importMode ? (
              <>
                <div className="flex gap-2 items-center">
                  <a
                    href="https://imjustchew.notion.site/Graduation-Planner-Share-1cb17af8f2ad80808a3ec05cfd40e6a7?pvs=4"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    範本分享庫
                  </a>
                </div>

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    aria-label="file"
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    匯入範本
                  </Button>
                  <Button variant="outline" onClick={handleExportTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    匯出為範本
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    關閉
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex justify-end w-full">
                <Button variant="outline" onClick={onClose}>
                  關閉
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <AlertDialogContent className="">
          <AlertDialogHeader>
            <AlertDialogTitle>確認匯入範本</AlertDialogTitle>
            <AlertDialogDescription>
              此操作將刪除所有現有類別並替換為新的範本結構。此操作無法復原。
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
