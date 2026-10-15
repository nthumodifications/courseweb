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
  Skeleton,
  useToast,
} from "@courseweb/ui";
import {
  EmptyState,
  ErrorState,
  InlineSpinner,
  Mono,
  PageHeader,
  formatDateTime,
} from "../components";
import {
  useAdminReviews,
  useDismissReviewReport,
  useModerateReview,
  type AdminCourseReview,
  type ReviewModerationAction,
  type ReviewModerationStatus,
} from "../api";

const STATUSES: ReviewModerationStatus[] = [
  "reported",
  "hidden",
  "removed",
  "all",
];

const STATUS_STYLES: Record<AdminCourseReview["status"], string> = {
  visible: "border-transparent bg-emerald-600 text-white",
  hidden: "border-transparent bg-secondary text-secondary-foreground",
  removed: "border-border text-muted-foreground",
};

const ReviewCard = ({ review }: { review: AdminCourseReview }) => {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const moderate = useModerateReview();
  const dismiss = useDismissReviewReport();

  const act = async (action: ReviewModerationAction) => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast({
        title: "Moderation reason required",
        description: "Record why this review is being changed.",
        variant: "destructive",
      });
      return;
    }
    try {
      await moderate.mutateAsync({ id: review.id, action, reason: trimmed });
      toast({
        title: `Review ${action === "restore" ? "restored" : `${action}d`}`,
      });
    } catch (error) {
      toast({
        title: "Could not moderate review",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  const dismissReport = async (reportId: string) => {
    try {
      await dismiss.mutateAsync(reportId);
      toast({ title: "Report dismissed" });
    } catch (error) {
      toast({
        title: "Could not dismiss report",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {review.moduleKey} · {review.instructor}
              </span>
              <Badge variant="outline" className={STATUS_STYLES[review.status]}>
                {review.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {review.source === "ptt" ? (
                <>
                  PTT · <Mono>{review.sourceAuthor ?? "unknown author"}</Mono>
                  {review.sourceUrl && (
                    <>
                      {" · "}
                      <a
                        href={review.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        source post
                      </a>
                    </>
                  )}
                </>
              ) : (
                <>
                  native · <Mono>{review.authorId}</Mono>
                </>
              )}
              {" · "}semester {review.semester ?? "—"} · submitted{" "}
              {formatDateTime(review.sourcePostedAt ?? review.createdAt)}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>
              Chill {review.coolness ?? "—"} · sweetness{" "}
              {review.sweetness ?? "—"} · learned {review.learning ?? "—"}
            </div>
            <div>
              {review.attendance ?? "—"} · {review.examStyle.join(", ") || "—"}
            </div>
          </div>
        </div>

        <p className="whitespace-pre-wrap text-sm text-foreground">
          {review.body}
        </p>

        <div className="space-y-2 rounded-md border bg-muted/20 p-3">
          <div className="text-sm font-medium">
            Reports ({review.reports.length})
          </div>
          {review.reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports.</p>
          ) : (
            <div className="space-y-2">
              {review.reports.map((report) => (
                <div
                  key={report.id}
                  className="flex flex-wrap items-start justify-between gap-2 text-sm"
                >
                  <div>
                    <Badge variant="outline">{report.reason}</Badge>
                    {report.note && (
                      <span className="ml-2 text-muted-foreground">
                        {report.note}
                      </span>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(report.createdAt)}
                    </div>
                  </div>
                  {report.resolvedAt ? (
                    <span className="text-xs text-muted-foreground">
                      resolved {formatDateTime(report.resolvedAt)}
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void dismissReport(report.id)}
                      disabled={dismiss.isPending}
                    >
                      {dismiss.isPending ? <InlineSpinner /> : null}
                      Dismiss
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Moderation reason (required)"
            maxLength={500}
            className="min-w-[240px] flex-1"
          />
          <Button
            variant="outline"
            onClick={() => void act("restore")}
            disabled={moderate.isPending}
          >
            Restore
          </Button>
          <Button
            variant="outline"
            onClick={() => void act("hide")}
            disabled={moderate.isPending}
          >
            Hide
          </Button>
          <Button
            variant="destructive"
            onClick={() => void act("remove")}
            disabled={moderate.isPending}
          >
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminReviewsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get("status") ??
    "reported") as ReviewModerationStatus;
  const query = useAdminReviews(
    STATUSES.includes(status) ? status : "reported",
  );
  const reviews = query.data?.reviews ?? [];

  return (
    <>
      <PageHeader
        title="Course Reviews"
        description="Review reports and moderate native and imported PTT course reviews."
      />

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
          <SelectTrigger className="w-[170px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!query.isLoading && (
          <span className="text-sm text-muted-foreground">
            {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {query.isError && <ErrorState error={query.error} />}
      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState>No reviews match this queue filter.</EmptyState>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </>
  );
};

export default AdminReviewsPage;
