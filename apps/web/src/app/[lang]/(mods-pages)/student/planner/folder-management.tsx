import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
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
import { cn } from "@/lib/utils";
import useDictionary from "@/dictionaries/useDictionary";
import { ResponsiveDialog } from "./components/responsive-dialog";
import { useConfirm } from "./lib/use-confirm";

interface FolderManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onFoldersUpdated: () => void;
}

type FolderFormValues = Omit<
  FolderDocType,
  "toJSON" | "toMutableJSON" | "deleted$"
>;

// Recursively collects the ids of every descendant of `parentId`. Pulled out
// to module scope (rather than redefined inline inside `handleDelete`) so it
// can also be used up-front to compute the affected-folder/course counts
// shown in the delete confirmation dialog before anything is deleted.
const getAllChildFolderIds = (
  parentId: string,
  allFolders: FolderDocType[],
): string[] => {
  const directChildren = allFolders
    .filter((f) => f.parent === parentId)
    .map((f) => f.id);
  const allChildren = [...directChildren];

  for (const childId of directChildren) {
    allChildren.push(...getAllChildFolderIds(childId, allFolders));
  }

  return allChildren;
};

export function FolderManagement({
  isOpen,
  onClose,
  onFoldersUpdated,
}: FolderManagementProps) {
  const dict = useDictionary();
  const fm = dict.planner.folderManagement as Record<string, string>;
  const common = dict.planner.common;
  const { confirm, ConfirmDialog } = useConfirm();

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
  // Drives the single-column mobile layout: the folder tree and the
  // details/edit pane are shown one at a time on narrow screens.
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
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

  // Reset to the tree pane every time the dialog is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setMobileView("list");
    }
  }, [isOpen]);

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
    setSelectedFolder(folder);
    setEditMode(false);
    setNewFolder(false);
    setIsRootSelected(false);
    setMobileView("detail");
  };

  // Handle root selection
  const handleSelectRoot = () => {
    setSelectedFolder(null);
    setEditMode(false);
    setNewFolder(false);
    setIsRootSelected(true);
    setMobileView("detail");
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
      setMobileView("detail");
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
      title: fm.newFolderDefaultTitle ?? "新類別",
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
    setMobileView("detail");
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

    const itemsCol = folderCol?.database.collections.items;
    if (!folderCol || !itemsCol) return;

    // Compute the actual scope of the deletion up-front so the confirmation
    // dialog can tell the user exactly how many subfolders and courses will
    // be affected, instead of deleting first and only reporting afterwards.
    const childFolderIds = getAllChildFolderIds(selectedFolder.id, folders);
    const folderIdsToDelete = [selectedFolder.id, ...childFolderIds];

    const affectedItems = await itemsCol
      .find()
      .where("parent")
      .in(folderIdsToDelete)
      .exec();

    const description = (
      fm.deleteConfirmDescription ??
      "此操作無法復原。將刪除此類別及其 {folderCount} 個子類別，其中 {itemCount} 門課程將被移至「未分類」。"
    )
      .replace("{folderCount}", String(childFolderIds.length))
      .replace("{itemCount}", String(affectedItems.length));

    const ok = await confirm({
      title: fm.deleteConfirmTitle ?? "刪除類別？",
      description,
      confirmLabel: common.delete,
      cancelLabel: common.cancel,
      destructive: true,
    });
    if (!ok) return;

    try {
      // Move all items from these folders to _unsorted
      for (const item of affectedItems) {
        await item.patch({ parent: "_unsorted" });
      }

      // Delete all child folders first (bottom-up to avoid referential issues)
      for (const folderId of [...childFolderIds].reverse()) {
        await deleteFolder(folderCol, folderId);
      }

      // Delete the selected folder
      await deleteFolder(folderCol, selectedFolder.id);

      // Refresh folders
      const updatedFolders = await getFolders(folderCol);
      setFolders(updatedFolders);

      // Reset state
      setSelectedFolder(null);
      setEditMode(false);
      setNewFolder(false);
      setMobileView("list");
      reset();

      // Notify parent
      onFoldersUpdated();

      toast({
        title: fm.deleteSuccessTitle ?? "類別已刪除",
        description:
          affectedItems.length > 0
            ? (fm.deleteSuccessWithItems ??
              "類別及其子類別已被刪除，相關課程已移至「未分類」。")
            : (fm.deleteSuccessNoItems ?? "類別及其子類別已被刪除。"),
      });
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast({
        title: fm.deleteFailTitle ?? "刪除失敗",
        description: fm.deleteFailDescription ?? "無法刪除類別，請再試一次。",
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
      // Swap order with previous sibling in a single batched write so the
      // two sibling documents can never end up with colliding/duplicate
      // `order` values from an interleaved or partially-failed update.
      const prevSibling = siblings[index - 1];
      await reorderFolders(folderCol!, [
        { id: selectedFolder.id, order: prevSibling.order },
        { id: prevSibling.id, order: selectedFolder.order },
      ]);

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
      // Swap order with next sibling, batched (see handleMoveUp comment).
      const nextSibling = siblings[index + 1];
      await reorderFolders(folderCol!, [
        { id: selectedFolder.id, order: nextSibling.order },
        { id: nextSibling.id, order: selectedFolder.order },
      ]);

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
        title: fm.exportSuccessTitle ?? "範本匯出成功",
        description:
          fm.exportSuccessDescription ??
          "範本已下載，您可以將檔案分享給其他人。",
      });
    } catch (error) {
      console.error("Error exporting template:", error);
      toast({
        title: fm.exportFailTitle ?? "匯出失敗",
        description: fm.exportFailDescription ?? "無法匯出範本，請再試一次。",
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
          throw new Error("Invalid template file format");
        }

        setImportPreview(importedData);
        setImportMode(true);
      } catch (error) {
        console.error("Error parsing template:", error);
        toast({
          title: fm.importFailTitle ?? "匯入失敗",
          description:
            fm.importParseFailDescription ??
            "無法解析範本檔案，請確保它是有效的 JSON 格式。",
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
        title: fm.importSuccessTitle ?? "範本匯入成功",
        description:
          fm.importSuccessDescription ??
          "資料夾結構已更新，未匹配的項目已移至「未分類」。",
      });

      // Notify parent
      onFoldersUpdated();
    } catch (error) {
      console.error("Error importing template:", error);
      toast({
        title: fm.importFailTitle ?? "匯入失敗",
        description:
          fm.importGenericFailDescription ?? "無法匯入範本，請再試一次。",
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
          className={`flex items-center p-2 rounded-md ${selectedFolder?.id === folder.id ? "bg-muted " : "hover:bg-accent "} cursor-pointer ${isUnsorted ? "opacity-70" : ""}`}
          onClick={() => handleSelectFolder(folder)}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          <div className="mr-2 flex-shrink-0">
            {hasChildren ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <div className="w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">
              {folder.title}
              {isUnsorted && (fm.systemSuffix ?? " (系統)")}
            </div>
            <div className="text-xs text-muted-foreground">
              {folder.min} - {folder.max === 0 ? "∞" : folder.max}{" "}
              {folder.metric === "credits"
                ? (fm.creditsUnit ?? "學分")
                : (fm.coursesUnit ?? "課程")}
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
          className={`flex items-center p-2 rounded-md hover:bg-accent `}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          <div className="mr-2 flex-shrink-0">
            {hasChildren ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <div className="w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{folder.title}</div>
            <div className="text-xs text-muted-foreground">
              {folder.min} - {folder.max === 0 ? "∞" : folder.max}{" "}
              {folder.metric === "credits"
                ? (fm.creditsUnit ?? "學分")
                : (fm.coursesUnit ?? "課程")}
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
            className={`flex items-center p-2 rounded-md ${isRootSelected ? "bg-muted " : "hover:bg-accent "} cursor-pointer`}
            onClick={handleSelectRoot}
          >
            <div className="mr-2 flex-shrink-0">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{fm.rootTitle ?? "根目錄"}</div>
              <div className="text-xs text-muted-foreground">
                {fm.rootDescription ?? "所有類別的最上層"}
              </div>
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

  const showBackButton = (
    <Button
      size="sm"
      variant="ghost"
      className="md:hidden"
      onClick={() => setMobileView("list")}
      aria-label={common.back}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );

  return (
    <>
      {ConfirmDialog}
      <ResponsiveDialog
        open={isOpen}
        onOpenChange={onClose}
        title={fm.title ?? "類別管理"}
        description={fm.description ?? "管理畢業要求類別和結構"}
        contentClassName="sm:max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        footer={
          !importMode ? (
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end sm:items-center w-full">
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
                  {fm.importTemplate ?? "匯入範本"}
                </Button>
                <Button variant="outline" onClick={handleExportTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  {fm.exportTemplate ?? "匯出為範本"}
                </Button>
                <Button variant="outline" onClick={onClose}>
                  {common.close}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end w-full">
              <Button variant="outline" onClick={onClose}>
                {common.close}
              </Button>
            </div>
          )
        }
      >
        {!importMode ? (
          <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
            {/* Folder tree */}
            <div
              className={cn(
                mobileView === "detail" ? "hidden" : "flex",
                "md:flex flex-col w-full md:w-1/2 border border-border rounded-md overflow-hidden",
              )}
            >
              <div className="p-2 border-b border-border flex justify-between items-center">
                <h3 className="font-medium">
                  {fm.structureTitle ?? "類別結構"}
                </h3>
                <Button size="sm" onClick={handleNewFolder}>
                  <Plus className="h-4 w-4 mr-2" />
                  {fm.addCategory ?? "新增類別"}
                </Button>
              </div>

              <ScrollArea className="flex-1 h-[45vh] md:h-auto">
                {renderFolderTree()}
              </ScrollArea>
            </div>

            {/* Folder details/edit */}
            <div
              className={cn(
                mobileView === "list" ? "hidden" : "flex",
                "md:flex flex-col w-full md:w-1/2 border border-border rounded-md overflow-hidden",
              )}
            >
              {selectedFolder && !editMode ? (
                <>
                  <div className="p-2 border-b border-border flex justify-between items-center gap-1">
                    {showBackButton}
                    <h3 className="font-medium flex-1 truncate">
                      {fm.detailsTitle ?? "類別詳情"}
                    </h3>
                    <div className="flex gap-1">
                      {selectedFolder.id !== "_unsorted" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleEditMode}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {fm.edit ?? "編輯"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleDelete}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {common.delete}
                          </Button>
                        </>
                      )}
                      {selectedFolder.id === "_unsorted" && (
                        <div className="text-xs text-muted-foreground italic">
                          {fm.systemCategoryNotice ?? "系統類別，不可編輯"}
                        </div>
                      )}
                    </div>
                  </div>

                  <ScrollArea className="flex-1 h-[45vh] md:h-auto">
                    <div className="p-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {fm.nameLabel ?? "類別名稱"}
                        </h4>
                        <p className="mt-1">{selectedFolder.title}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {fm.requirementLabel ?? "要求"}
                        </h4>
                        <p className="mt-1">
                          {selectedFolder.min} -{" "}
                          {selectedFolder.max === 0
                            ? (fm.noLimit ?? "無上限")
                            : selectedFolder.max}{" "}
                          {selectedFolder.metric === "credits"
                            ? (fm.creditsUnit ?? "學分")
                            : (fm.coursesUnit ?? "課程")}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {fm.parentLabel ?? "父類別"}
                        </h4>
                        <p className="mt-1">
                          {selectedFolder.parent === "planner-1"
                            ? (fm.noneRoot ?? "無 (根類別)")
                            : folders.find(
                                (f) => f.id === selectedFolder.parent,
                              )?.title ||
                              (fm.none ?? "無")}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {fm.orderLabel ?? "排序"}
                        </h4>
                        <div className="mt-1 flex items-center gap-2">
                          <p>{selectedFolder.order}</p>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleMoveUp}
                              aria-label={fm.moveUp ?? "上移"}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleMoveDown}
                              aria-label={fm.moveDown ?? "下移"}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {fm.requireChildValidationLabel ?? "需要子類別驗證"}
                        </h4>
                        <p className="mt-1">
                          {selectedFolder.requireChildValidation
                            ? (fm.yes ?? "是")
                            : (fm.no ?? "否")}
                        </p>
                      </div>
                    </div>
                  </ScrollArea>
                </>
              ) : editMode ? (
                <>
                  <div className="p-2 border-b border-border flex justify-between items-center gap-1">
                    {showBackButton}
                    <h3 className="font-medium flex-1 truncate">
                      {newFolder
                        ? (fm.newCategoryTitle ?? "新增類別")
                        : (fm.editCategoryTitle ?? "編輯類別")}
                    </h3>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditMode(false);
                          setNewFolder(false);
                          reset();
                          setMobileView(selectedFolder ? "detail" : "list");
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {common.cancel}
                      </Button>
                      <Button size="sm" onClick={handleSubmit(onSubmit)}>
                        <Save className="h-4 w-4 mr-2" />
                        {common.save}
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 h-[45vh] md:h-auto">
                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      className="p-4 space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="folder-title">
                          {fm.nameLabel ?? "類別名稱"}
                        </Label>
                        <Input
                          id="folder-title"
                          {...register("title", { required: true })}
                          className="bg-muted  border-border"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="folder-min">
                            {fm.minLabel ?? "最低要求"}
                          </Label>
                          <Input
                            id="folder-min"
                            type="number"
                            {...register("min", { valueAsNumber: true })}
                            className="bg-muted  border-border"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="folder-max">
                            {fm.maxLabel ?? "最高要求"}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="folder-max"
                              type="number"
                              {...register("max", { valueAsNumber: true })}
                              className="bg-muted  border-border"
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
                                {fm.noLimit ?? "無上限"}
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="folder-metric">
                          {fm.metricLabel ?? "計算單位"}
                        </Label>
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
                                className="bg-muted  border-border"
                              >
                                <SelectValue
                                  placeholder={
                                    fm.metricPlaceholder ?? "選擇計算單位"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent className="bg-muted  border-border">
                                <SelectItem value="credits">
                                  {fm.creditsUnit ?? "學分"}
                                </SelectItem>
                                <SelectItem value="courses">
                                  {fm.coursesUnit ?? "課程數"}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="folder-parent">
                          {fm.parentLabel ?? "父類別"}
                        </Label>
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
                                className="bg-muted  border-border"
                              >
                                <SelectValue
                                  placeholder={
                                    fm.parentPlaceholder ?? "選擇父類別"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent className="bg-muted  border-border">
                                <SelectItem value="planner-1">
                                  {fm.noneRoot ?? "無 (根類別)"}
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
                          {fm.requireChildValidationLabel ?? "需要子類別驗證"}
                        </Label>
                      </div>

                      <input type="hidden" {...register("id")} />
                      <input type="hidden" {...register("order")} />
                      <input type="hidden" {...register("titlePlacement")} />
                    </form>
                  </ScrollArea>
                </>
              ) : isRootSelected ? (
                <div className="flex flex-col h-full">
                  <div className="p-2 border-b border-border flex justify-between items-center gap-1">
                    {showBackButton}
                    <h3 className="font-medium flex-1 truncate">
                      {fm.rootTitle ?? "根目錄"}
                    </h3>
                    <Button size="sm" onClick={handleNewFolder}>
                      <Plus className="h-4 w-4 mr-2" />
                      {fm.addRootCategory ?? "新增根類別"}
                    </Button>
                  </div>
                  <div className="p-4 flex flex-col items-center justify-center flex-1 text-center">
                    <h4 className="mb-2 font-medium">
                      {fm.rootTitle ?? "根類別"}
                    </h4>
                    <p className="text-muted-foreground mb-4">
                      {fm.rootInfoDescription ??
                        "這是最頂層類別。您可以在此添加新的根類別，根類別將直接顯示在主畫面上。"}
                    </p>
                    <Button onClick={handleNewFolder}>
                      <Plus className="h-4 w-4 mr-2" />
                      {fm.addRootCategory ?? "新增根類別"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>{fm.selectPrompt ?? "選擇一個類別以查看詳情"}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 gap-4 overflow-hidden">
            <div className="w-full border border-border rounded-md overflow-hidden flex flex-col">
              <div className="p-2 border-b border-border flex justify-between items-center">
                <h3 className="font-medium">
                  {fm.importPreviewTitle ?? "匯入預覽"}
                </h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelImport}
                  >
                    <X className="h-4 w-4 mr-2" />
                    {common.cancel}
                  </Button>
                  <Button size="sm" onClick={() => setImportConfirmOpen(true)}>
                    <Save className="h-4 w-4 mr-2" />
                    {fm.confirmImport ?? "確認匯入"}
                  </Button>
                </div>
              </div>

              <div className="p-4">
                <Alert className="mb-4   bg-warning/20 border-warning">
                  <AlertDescription>
                    {fm.importWarning ??
                      "確認匯入將會覆蓋所有現有類別。請仔細檢查下方預覽的資料夾結構。"}
                  </AlertDescription>
                </Alert>

                <div className="mb-4">
                  <h3 className="font-medium mb-2">
                    {fm.structurePreviewTitle ?? "資料夾結構預覽"}
                  </h3>
                  <div className="border border-border rounded-md p-2">
                    <ScrollArea className="h-[40vh]">
                      {getPreviewRootFolders().map((folder) =>
                        renderFolderPreviewItem(folder),
                      )}
                    </ScrollArea>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <p>
                    {(
                      fm.totalFoldersToImport ?? "總共 {count} 個資料夾將被匯入"
                    ).replace("{count}", String(importPreview.length))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <AlertDialogContent className="">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {fm.confirmImportDialogTitle ?? "確認匯入範本"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {fm.confirmImportDialogDescription ??
                "此操作將刪除所有現有類別並替換為新的範本結構。此操作無法復原。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleImportConfirm}
            >
              {fm.confirmImport ?? "確認匯入"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
