import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  useToast,
} from "@courseweb/ui";
import { ExternalLink, FileText } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  InlineSpinner,
  Mono,
  PageHeader,
  formatDateTime,
  relativeTime,
} from "../components";
import {
  useRecruitmentApplications,
  useRecruitmentResumeUrl,
  useSetRecruitmentStatus,
  type RecruitmentApplication,
  type RecruitmentStatus,
} from "../api";

/**
 * Recruitment review.
 *
 * Applications are personal data — a statement someone wrote about themselves,
 * their links, their CV — so this page shows one applicant at a time rather
 * than laying every statement out in a grid to be skimmed.
 */

const STATUSES: RecruitmentStatus[] = [
  "submitted",
  "reviewing",
  "accepted",
  "rejected",
];

const STATUS_STYLES: Record<RecruitmentStatus, string> = {
  submitted: "border-transparent bg-primary text-primary-foreground",
  reviewing: "border-transparent bg-secondary text-secondary-foreground",
  accepted: "border-transparent bg-emerald-600 text-white",
  rejected: "border-border text-muted-foreground",
};

const ROLES = [
  "maintainer",
  "administrator",
  "frontend",
  "backend",
  "community",
];

const ResumeButton = ({ id }: { id: string }) => {
  const { toast } = useToast();
  const resume = useRecruitmentResumeUrl();

  const open = async () => {
    try {
      const { url } = await resume.mutateAsync(id);
      // Opened rather than downloaded: the link expires in five minutes, and a
      // file left in Downloads outlives the reason it was fetched.
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Could not open the CV",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={open}
      disabled={resume.isPending}
    >
      {resume.isPending ? <InlineSpinner /> : <FileText className="h-4 w-4" />}
      View CV
    </Button>
  );
};

const ApplicationCard = ({
  application,
}: {
  application: RecruitmentApplication;
}) => {
  const { toast } = useToast();
  const setStatus = useSetRecruitmentStatus();

  const changeStatus = async (status: RecruitmentStatus) => {
    try {
      await setStatus.mutateAsync({ id: application.id, status });
      toast({ title: `Marked ${status}` });
    } catch (error) {
      toast({
        title: "Could not update the application",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const links = Object.entries(application.links ?? {}).filter(
    ([, value]) => typeof value === "string" && value,
  );

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium capitalize">{application.role}</span>
              <Badge
                variant="outline"
                className={STATUS_STYLES[application.status]}
              >
                {application.status}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              <Mono>{application.applicant_sub}</Mono> · applied{" "}
              {formatDateTime(application.created_at)} (
              {relativeTime(application.created_at)}) · prefers{" "}
              {application.contact_preference}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ResumeButton id={application.id} />
            <Select
              value={application.status}
              onValueChange={(value) =>
                changeStatus(value as RecruitmentStatus)
              }
              disabled={setStatus.isPending}
            >
              <SelectTrigger className="w-[140px]" aria-label="Set status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="whitespace-pre-wrap text-sm text-foreground">
          {application.statement}
        </p>

        {links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {links.map(([label, url]) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
              >
                {label}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminRecruitmentPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "all";
  const role = searchParams.get("role") ?? "all";

  const query = useRecruitmentApplications({
    status: status === "all" ? undefined : (status as RecruitmentStatus),
    role: role === "all" ? undefined : role,
  });

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const [expanded, setExpanded] = useState(false);
  const applications = query.data ?? [];
  const visible = expanded ? applications : applications.slice(0, 20);

  return (
    <>
      <PageHeader
        title="Recruitment"
        description="Applications to join the NTHUMods team."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(v) => updateParam("status", v)}>
          <SelectTrigger className="w-[170px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={role} onValueChange={(v) => updateParam("role", v)}>
          <SelectTrigger className="w-[170px]" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!query.isLoading && (
          <span className="text-sm text-muted-foreground">
            {applications.length} application
            {applications.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {query.isError && <ErrorState error={query.error} />}

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <EmptyState>No applications match those filters.</EmptyState>
      ) : (
        <div className="space-y-3">
          {visible.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
          {!expanded && applications.length > visible.length && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setExpanded(true)}
            >
              Show {applications.length - visible.length} more
            </Button>
          )}
        </div>
      )}
    </>
  );
};

export default AdminRecruitmentPage;
