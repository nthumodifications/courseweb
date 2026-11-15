import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  useAdminClassPageReports,
  useModerateClassPageReport,
  type AdminClassPageReport,
  type ClassPageModerationAction,
  type ClassPageReportStatus,
} from "../api";
import { EmptyState, PageHeader, formatDateTime } from "../components";

const STATUSES: ClassPageReportStatus[] = ["reported", "resolved", "all"];

const ReportRow = ({ report }: { report: AdminClassPageReport }) => {
  const dict = useDictionary().admin.class_pages;
  const [reason, setReason] = useState("");
  const moderate = useModerateClassPageReport();
  const actions: ClassPageModerationAction[] = [
    "resolve",
    ...(report.targetType === "link" ? ["hide_link" as const] : []),
    ...(report.target.userId || report.target.authorId
      ? ["ban_user" as const]
      : []),
  ];
  const act = (action: ClassPageModerationAction) => {
    if (reason.trim())
      moderate.mutate({ reportId: report.id, action, reason: reason.trim() });
  };
  const targetName =
    report.targetType === "member"
      ? (report.target.displayName ?? dict.member)
      : (report.target.label ?? dict.link);
  const targetUserId = report.target.userId ?? report.target.authorId;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{dict[report.targetType]}</Badge>
              <span className="font-medium">{targetName}</span>
              {report.resolvedAt && (
                <Badge variant="secondary">{dict.resolved}</Badge>
              )}
            </div>
            {report.targetType === "link" && report.target.url && (
              <a
                className="text-sm underline underline-offset-2"
                href={report.target.url}
                target="_blank"
                rel="noreferrer"
              >
                {report.target.label ?? dict.link}
              </a>
            )}
            <div className="text-sm text-muted-foreground">
              {dict.course}: {report.target.semester ?? "—"} /{" "}
              {report.target.courseId ?? "—"}
              {" · "}
              {dict.submitted}: {formatDateTime(report.createdAt)}
            </div>
            <div className="text-sm text-muted-foreground">
              {dict.reporter}: {report.reporterId}
              {targetUserId && <> · {targetUserId}</>}
            </div>
          </div>
          <Badge variant="outline">{dict[report.reason]}</Badge>
        </div>
        {report.note && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {report.note}
          </p>
        )}
        {!report.resolvedAt && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={dict.moderation_reason}
              maxLength={500}
              className="min-w-[240px] flex-1"
            />
            {actions.map((action) => (
              <Button
                key={action}
                variant={action === "ban_user" ? "destructive" : "outline"}
                disabled={moderate.isPending || !reason.trim()}
                onClick={() => act(action)}
              >
                {dict[action]}
              </Button>
            ))}
          </div>
        )}
        {moderate.error && (
          <p className="text-sm text-destructive">{dict.error}</p>
        )}
      </CardContent>
    </Card>
  );
};

const AdminClassPagesPage = () => {
  const dict = useDictionary().admin.class_pages;
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStatus = searchParams.get(
    "status",
  ) as ClassPageReportStatus | null;
  const status =
    requestedStatus && STATUSES.includes(requestedStatus)
      ? requestedStatus
      : "reported";
  const query = useAdminClassPageReports(status);
  const reports = query.data?.reports ?? [];

  return (
    <>
      <PageHeader title={dict.title} description={dict.description} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams);
            if (value === "reported") next.delete("status");
            else next.set("status", value);
            setSearchParams(next, { replace: true });
          }}
        >
          <SelectTrigger className="w-[180px]" aria-label={dict.title}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {dict[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!query.isLoading && (
          <span className="text-sm text-muted-foreground">
            {reports.length}
          </span>
        )}
      </div>
      {query.error && (
        <p className="mb-4 text-sm text-destructive">{dict.error}</p>
      )}
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">{dict.loading}</p>
      ) : reports.length === 0 ? (
        <EmptyState>{dict.empty}</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => (
            <ReportRow key={report.id} report={report} />
          ))}
        </div>
      )}
    </>
  );
};

export default AdminClassPagesPage;
