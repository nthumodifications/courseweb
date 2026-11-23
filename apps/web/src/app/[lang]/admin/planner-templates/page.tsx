import { useState } from "react";
import { Badge, Button, Input } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  useAdminPlannerTemplates,
  useResolvePlannerTemplateReport,
  useSetPlannerTemplateOfficial,
  useSetPlannerTemplateStatus,
  type AdminPlannerTemplate,
} from "../api";
import { ErrorState, formatDateTime, InlineSpinner } from "../components";

const PlannerTemplateRow = ({
  template,
}: {
  template: AdminPlannerTemplate;
}) => {
  const text = useDictionary().planner.templates;
  const labels = text.admin;
  const [reason, setReason] = useState("");
  const [failed, setFailed] = useState(false);
  const setStatus = useSetPlannerTemplateStatus();
  const setOfficial = useSetPlannerTemplateOfficial();
  const resolveReport = useResolvePlannerTemplateReport();
  const trimmedReason = reason.trim();
  const metadata = labels.rowMetadata
    .replace("{department}", template.department)
    .replace("{year}", template.entranceYear)
    .replace("{credits}", String(template.requiredCredits))
    .replace("{folders}", String(template.folderCount))
    .replace("{courses}", String(template.courseCount))
    .replace("{uses}", String(template.useCount))
    .replace("{author}", template.authorId);

  const updateStatus = async () => {
    setFailed(false);
    try {
      await setStatus.mutateAsync({
        id: template.id,
        status: template.status === "hidden" ? "VISIBLE" : "HIDDEN",
        reason: trimmedReason,
      });
    } catch {
      setFailed(true);
    }
  };
  const updateOfficial = async () => {
    setFailed(false);
    try {
      await setOfficial.mutateAsync({
        id: template.id,
        official: !template.official,
        reason: trimmedReason,
      });
    } catch {
      setFailed(true);
    }
  };
  const resolve = async (reportId: string) => {
    setFailed(false);
    try {
      await resolveReport.mutateAsync(reportId);
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-b border-border py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <span>{template.title}</span>
            <Badge variant="outline">
              {template.status === "hidden" ? labels.hidden : labels.visible}
            </Badge>
            {template.official && (
              <Badge variant="secondary">{labels.official}</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{metadata}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {labels.openReports}: {template.openReportCount}
        </span>
      </div>

      {template.reports.length > 0 && (
        <div className="divide-y divide-border border-y border-border">
          {template.reports.map((report) => (
            <div
              key={report.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
            >
              <div className="min-w-0">
                <span className="font-medium">
                  {text.reportReasons[
                    report.reason as keyof typeof text.reportReasons
                  ] ?? text.reportReasons.other}
                </span>
                {report.note && (
                  <span className="ml-2 text-muted-foreground">
                    {report.note}
                  </span>
                )}
                <p className="mt-1 text-muted-foreground">
                  {report.reporterId} · {formatDateTime(report.createdAt)}
                  {report.resolvedAt &&
                    ` · ${formatDateTime(report.resolvedAt)}`}
                </p>
              </div>
              {!report.resolvedAt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void resolve(report.id)}
                  disabled={resolveReport.isPending}
                >
                  {resolveReport.isPending ? <InlineSpinner /> : null}
                  {labels.resolve}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          placeholder={labels.reason}
          aria-label={labels.reason}
          className="min-w-[220px] flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => void updateStatus()}
          disabled={!trimmedReason || setStatus.isPending}
        >
          {setStatus.isPending ? <InlineSpinner /> : null}
          {template.status === "hidden" ? labels.unhide : labels.hide}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void updateOfficial()}
          disabled={!trimmedReason || setOfficial.isPending}
        >
          {setOfficial.isPending ? <InlineSpinner /> : null}
          {template.official ? labels.removeOfficial : labels.markOfficial}
        </Button>
      </div>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {labels.actionFailed}
        </p>
      )}
    </div>
  );
};

const PlannerTemplatesAdminPage = () => {
  const labels = useDictionary().planner.templates.admin;
  const query = useAdminPlannerTemplates();
  const templates = query.data?.templates ?? [];

  return (
    <div className="flex flex-col px-4">
      {query.isError && <ErrorState error={query.error} />}
      {query.isLoading ? (
        <div className="py-6 text-sm text-muted-foreground">
          <InlineSpinner />
        </div>
      ) : templates.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {templates.map((template) => (
            <PlannerTemplateRow key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlannerTemplatesAdminPage;
