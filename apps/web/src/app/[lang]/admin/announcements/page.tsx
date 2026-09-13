import { useState, type FormEvent } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  cn,
  useToast,
} from "@courseweb/ui";
import { AlertTriangle, Info, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  InlineSpinner,
  Mono,
  PageHeader,
  formatDateTime,
} from "../components";
import {
  useAdminAnnouncements,
  useDeleteAnnouncement,
  useSaveAnnouncement,
  type AdminAnnouncement,
  type AdminAnnouncementInput,
  type AnnouncementSeverity,
} from "../api";

type AnnouncementForm = {
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  link_url: string;
  link_label: string;
  link_label_en: string;
  severity: AnnouncementSeverity;
  start_date: string;
  end_date: string;
  active: boolean;
  dismissible: boolean;
  priority: number | "";
};

type AnnouncementStatus = "Live now" | "Scheduled" | "Expired" | "Draft";

const TAIPEI_TIME_ZONE = "Asia/Taipei";
const TAIPEI_OFFSET = "+08:00";

const taipeiDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TAIPEI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// datetime-local has no timezone, so explicitly attach Taipei's +08:00 offset;
// relying on the browser timezone would make a banner go live eight hours late.
const toTaipeiInput = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = taipeiDateFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
};

const toApiDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const withSeconds = `${value}:00${TAIPEI_OFFSET}`;
  const date = new Date(withSeconds);
  return Number.isNaN(date.getTime()) ? null : withSeconds;
};

const emptyForm = (): AnnouncementForm => {
  const start = new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    title_en: "",
    description: "",
    description_en: "",
    link_url: "",
    link_label: "",
    link_label_en: "",
    severity: "info",
    start_date: toTaipeiInput(start),
    end_date: toTaipeiInput(end),
    active: true,
    dismissible: true,
    priority: 0,
  };
};

/**
 * Live rows predate the three-value severity the API now enforces — the 2023
 * typhoon notice is stored as `danger`, which the server's schema rejects.
 * Reading one has to keep working, so an unrecognised value is mapped to the
 * closest supported one rather than seeding the form with something that only
 * fails on save, or indexing the style maps below with a key they do not have.
 */
const KNOWN_SEVERITIES: AnnouncementSeverity[] = ["info", "warning", "error"];

const normalizeSeverity = (severity: string): AnnouncementSeverity => {
  if ((KNOWN_SEVERITIES as string[]).includes(severity)) {
    return severity as AnnouncementSeverity;
  }
  return severity === "danger" ? "error" : "info";
};

const announcementToForm = (
  announcement: AdminAnnouncement,
): AnnouncementForm => ({
  title: announcement.title,
  title_en: announcement.title_en ?? "",
  description: announcement.description ?? "",
  description_en: announcement.description_en ?? "",
  link_url: announcement.link_url ?? "",
  link_label: announcement.link_label ?? "",
  link_label_en: announcement.link_label_en ?? "",
  severity: normalizeSeverity(announcement.severity),
  start_date: toTaipeiInput(announcement.start_date),
  end_date: toTaipeiInput(announcement.end_date),
  active: announcement.active,
  dismissible: announcement.dismissible,
  priority: announcement.priority,
});

const isAllowedLink = (link: string) => {
  if (!link) return true;
  if (link.startsWith("/")) return true;
  try {
    const url = new URL(link);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const optionalText = (value: string) => value.trim() || null;

const validateForm = (form: AnnouncementForm) => {
  const title = form.title.trim();
  if (!title) return "Title is required.";
  if (title.length > 200) return "Title must be 200 characters or fewer.";
  if (form.title_en.trim().length > 200) {
    return "English title must be 200 characters or fewer.";
  }
  if (form.description.trim().length > 1000) {
    return "Description must be 1,000 characters or fewer.";
  }
  if (form.description_en.trim().length > 1000) {
    return "English description must be 1,000 characters or fewer.";
  }
  if (form.link_url.trim().length > 500) {
    return "Link URL must be 500 characters or fewer.";
  }
  if (form.link_label.trim().length > 100) {
    return "Link label must be 100 characters or fewer.";
  }
  if (form.link_label_en.trim().length > 100) {
    return "English link label must be 100 characters or fewer.";
  }

  const startDate = toApiDate(form.start_date);
  const endDate = toApiDate(form.end_date);
  if (!startDate || !endDate) return "Start and end dates are required.";
  if (new Date(startDate).getTime() >= new Date(endDate).getTime()) {
    return "End date must be after the start date.";
  }

  const link = form.link_url.trim();
  if (!isAllowedLink(link)) return "Enter a valid in-app or web link.";

  if (
    form.priority === "" ||
    !Number.isInteger(form.priority) ||
    form.priority < 0 ||
    form.priority > 100
  ) {
    return "Priority must be a whole number from 0 to 100.";
  }

  return null;
};

const formToInput = (form: AnnouncementForm): AdminAnnouncementInput => ({
  title: form.title.trim(),
  title_en: optionalText(form.title_en),
  description: optionalText(form.description),
  description_en: optionalText(form.description_en),
  link_url: optionalText(form.link_url),
  link_label: optionalText(form.link_label),
  link_label_en: optionalText(form.link_label_en),
  severity: form.severity,
  start_date: toApiDate(form.start_date)!,
  end_date: toApiDate(form.end_date)!,
  active: form.active,
  dismissible: form.dismissible,
  priority: form.priority as number,
});

const getStatus = (
  announcement: AdminAnnouncement,
  now = Date.now(),
): AnnouncementStatus => {
  if (!announcement.active) return "Draft";

  const start = new Date(announcement.start_date).getTime();
  const end = new Date(announcement.end_date).getTime();
  if (now < start) return "Scheduled";
  if (now > end) return "Expired";
  return "Live now";
};

const severityStyles: Record<
  AnnouncementSeverity,
  { className: string; Icon: typeof Info }
> = {
  info: {
    className: "border-border bg-muted text-foreground",
    Icon: Info,
  },
  warning: {
    className: "border-border bg-accent text-accent-foreground",
    Icon: AlertTriangle,
  },
  error: {
    className:
      "border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive",
    Icon: AlertTriangle,
  },
};

const severityBadgeClasses: Record<AnnouncementSeverity, string> = {
  info: "border-border bg-muted text-foreground",
  warning: "border-border bg-accent text-accent-foreground",
  error: "border-destructive/50 bg-destructive/10 text-destructive",
};

const statusBadgeClasses: Record<AnnouncementStatus, string> = {
  "Live now": "border-transparent bg-primary text-primary-foreground",
  Scheduled: "border-transparent bg-secondary text-secondary-foreground",
  Expired: "border-border text-muted-foreground",
  Draft: "border-transparent bg-secondary text-secondary-foreground",
};

const PreviewBanner = ({ form }: { form: AnnouncementForm }) => {
  const style = severityStyles[normalizeSeverity(form.severity)];
  const Icon = style.Icon;
  const title = form.title.trim() || "Announcement title";
  const description = form.description.trim();
  const link = form.link_url.trim();
  const linkLabel = form.link_label.trim() || form.link_label_en.trim();

  return (
    <div>
      <div className="mb-2 text-sm font-medium">Live preview</div>
      <div
        role="status"
        className={cn(
          "flex min-h-9 w-full items-center gap-2 border px-3 py-1 text-sm",
          style.className,
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          <span className="min-w-0 font-medium line-clamp-2">{title}</span>
          {description && (
            <span className="hidden min-w-0 truncate text-current/80 sm:inline">
              — {description}
            </span>
          )}
        </div>
        {link && linkLabel && (
          <a
            href={link}
            onClick={(event) => event.preventDefault()}
            className="shrink-0 underline underline-offset-2"
          >
            {linkLabel}
          </a>
        )}
        {form.dismissible && (
          <button
            type="button"
            aria-label="Dismiss preview"
            className="shrink-0 rounded-sm p-1 hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Preview uses the Chinese title and description shown to zh visitors.
      </p>
    </div>
  );
};

const AnnouncementFormDialog = ({
  open,
  editingId,
  form,
  formError,
  isSaving,
  saveError,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean;
  editingId: number | undefined;
  form: AnnouncementForm;
  formError: string | null;
  isSaving: boolean;
  saveError: unknown;
  onOpenChange: (open: boolean) => void;
  onChange: <K extends keyof AnnouncementForm>(
    field: K,
    value: AnnouncementForm[K],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>
          {editingId === undefined
            ? "Create announcement"
            : "Edit announcement"}
        </DialogTitle>
        <DialogDescription>
          This banner is visible to every visitor while it is active and within
          its date window.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="announcement-title">Title (Chinese)</Label>
            <Input
              id="announcement-title"
              value={form.title}
              onChange={(event) => onChange("title", event.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-title-en">Title (English)</Label>
            <Input
              id="announcement-title-en"
              value={form.title_en}
              onChange={(event) => onChange("title_en", event.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-description">
              Description (Chinese)
            </Label>
            <Textarea
              id="announcement-description"
              value={form.description}
              onChange={(event) => onChange("description", event.target.value)}
              maxLength={1000}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-description-en">
              Description (English)
            </Label>
            <Textarea
              id="announcement-description-en"
              value={form.description_en}
              onChange={(event) =>
                onChange("description_en", event.target.value)
              }
              maxLength={1000}
              rows={3}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="announcement-link-url">Link URL</Label>
            <Input
              id="announcement-link-url"
              value={form.link_url}
              onChange={(event) => onChange("link_url", event.target.value)}
              maxLength={500}
              placeholder="/recruit or https://example.com"
              inputMode="url"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-priority">Priority</Label>
            <Input
              id="announcement-priority"
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.priority}
              onChange={(event) =>
                onChange(
                  "priority",
                  event.target.value === "" ? "" : Number(event.target.value),
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-link-label">
              Link label (Chinese)
            </Label>
            <Input
              id="announcement-link-label"
              value={form.link_label}
              onChange={(event) => onChange("link_label", event.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-link-label-en">
              Link label (English)
            </Label>
            <Input
              id="announcement-link-label-en"
              value={form.link_label_en}
              onChange={(event) =>
                onChange("link_label_en", event.target.value)
              }
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-severity">Severity</Label>
            <Select
              value={form.severity}
              onValueChange={(value) =>
                onChange("severity", value as AnnouncementSeverity)
              }
            >
              <SelectTrigger id="announcement-severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="announcement-start-date">Start date</Label>
            <Input
              id="announcement-start-date"
              type="datetime-local"
              value={form.start_date}
              onChange={(event) => onChange("start_date", event.target.value)}
              step={60}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-end-date">End date</Label>
            <Input
              id="announcement-end-date"
              type="datetime-local"
              value={form.end_date}
              onChange={(event) => onChange("end_date", event.target.value)}
              step={60}
              required
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.active}
              onCheckedChange={(checked) => onChange("active", checked)}
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.dismissible}
              onCheckedChange={(checked) => onChange("dismissible", checked)}
            />
            Dismissible
          </label>
        </div>

        <PreviewBanner form={form} />

        {formError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {formError}
          </div>
        )}
        {saveError != null ? <ErrorState error={saveError} /> : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <InlineSpinner />}
            {editingId === undefined ? "Create announcement" : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

const AdminAnnouncementsPage = () => {
  const announcements = useAdminAnnouncements();
  const saveAnnouncement = useSaveAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [form, setForm] = useState<AnnouncementForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminAnnouncement | null>(
    null,
  );

  const openCreate = () => {
    saveAnnouncement.reset();
    setEditingId(undefined);
    setForm(emptyForm());
    setFormError(null);
    setEditorOpen(true);
  };

  const openEdit = (announcement: AdminAnnouncement) => {
    saveAnnouncement.reset();
    setEditingId(announcement.id);
    setForm(announcementToForm(announcement));
    setFormError(null);
    setEditorOpen(true);
  };

  const updateForm = <K extends keyof AnnouncementForm>(
    field: K,
    value: AnnouncementForm[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateForm(form);
    if (error) {
      setFormError(error);
      return;
    }

    saveAnnouncement.mutate(
      { id: editingId, values: formToInput(form) },
      {
        onSuccess: () => {
          setEditorOpen(false);
          toast({
            title:
              editingId === undefined
                ? "Announcement created"
                : "Announcement saved",
          });
        },
        onError: (error) => {
          toast({
            title: "Could not save announcement",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteAnnouncement.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        toast({ title: "Announcement deleted" });
      },
      onError: (error) => {
        toast({
          title: "Could not delete announcement",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Manage the site-wide banner shown to every visitor."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus aria-hidden="true" />
            New announcement
          </Button>
        }
      />

      {announcements.isError && <ErrorState error={announcements.error} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All announcements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Titles</TableHead>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="min-w-[210px]">Window</TableHead>
                  <TableHead className="w-[90px]">Priority</TableHead>
                  <TableHead className="w-[110px]">Options</TableHead>
                  <TableHead className="w-[150px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.isLoading &&
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}

                {announcements.data?.map((announcement) => {
                  const status = getStatus(announcement);
                  return (
                    <TableRow key={announcement.id}>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate font-medium">
                          {announcement.title}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {announcement.title_en || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            severityBadgeClasses[
                              normalizeSeverity(announcement.severity)
                            ]
                          }
                        >
                          {announcement.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusBadgeClasses[status]}
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="whitespace-nowrap text-xs">
                          <Mono>{formatDateTime(announcement.start_date)}</Mono>
                          <span className="px-1 text-muted-foreground">→</span>
                          <Mono>{formatDateTime(announcement.end_date)}</Mono>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Mono>P{announcement.priority}</Mono>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {announcement.dismissible ? "Dismissible" : "Sticky"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(announcement)}
                          >
                            <Pencil aria-hidden="true" />
                            <span className="sr-only sm:not-sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(announcement)}
                          >
                            <Trash2 aria-hidden="true" />
                            <span className="sr-only sm:not-sr-only">
                              Delete
                            </span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {!announcements.isLoading && announcements.data?.length === 0 && (
            <EmptyState>No announcements have been created.</EmptyState>
          )}
        </CardContent>
      </Card>

      <AnnouncementFormDialog
        open={editorOpen}
        editingId={editingId}
        form={form}
        formError={formError}
        isSaving={saveAnnouncement.isPending}
        saveError={saveAnnouncement.isError ? saveAnnouncement.error : null}
        onOpenChange={setEditorOpen}
        onChange={updateForm}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteAnnouncement.isPending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{deleteTarget?.title}” from the banner
              list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAnnouncement.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAnnouncement.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              {deleteAnnouncement.isPending && <InlineSpinner />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminAnnouncementsPage;
