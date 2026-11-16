import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  useAdminCourseShortNames,
  useLockCourseShortName,
  useRevertCourseShortName,
  type AdminCourseShortName,
} from "../api";
import { ErrorState, InlineSpinner, formatDateTime } from "../components";

const CourseShortNameRow = ({
  entry,
  lang,
}: {
  entry: AdminCourseShortName;
  lang: string;
}) => {
  const dict = useDictionary();
  const labels = dict.admin_short_names;
  const identityLabel =
    entry.identityType === "module"
      ? labels.identity_module
      : labels.identity_course_code;
  const lock = useLockCourseShortName();
  const revert = useRevertCourseShortName();
  const previous = entry.revisions.filter(
    (revision) => revision.shortName !== entry.shortName,
  );
  const [revisionId, setRevisionId] = useState(previous[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [actionFailed, setActionFailed] = useState(false);
  const trimmedReason = reason.trim();

  const setLocked = async () => {
    setActionFailed(false);
    try {
      await lock.mutateAsync({
        id: entry.id,
        locked: !entry.locked,
        reason: trimmedReason,
      });
    } catch {
      setActionFailed(true);
    }
  };
  const revertName = async () => {
    if (!revisionId) return;
    setActionFailed(false);
    try {
      await revert.mutateAsync({
        id: entry.id,
        revisionId,
        reason: trimmedReason,
      });
    } catch {
      setActionFailed(true);
    }
  };

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            <span>{entry.identityKey}</span>
            <Badge variant="outline">
              {entry.language === "zh"
                ? labels.language_zh
                : labels.language_en}
            </Badge>
            {entry.locked && <Badge variant="secondary">{labels.locked}</Badge>}
          </div>
          <div className="mt-1 text-sm">{entry.shortName}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {labels.updated} {formatDateTime(entry.updatedAt)} · {labels.editor}{" "}
            <Link
              className="underline underline-offset-2"
              to={`/${lang}/admin/users/${entry.updatedById}`}
            >
              {entry.updatedById}
            </Link>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{identityLabel}</span>
      </div>

      {previous.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium">{labels.revision}</div>
          <Select value={revisionId} onValueChange={setRevisionId}>
            <SelectTrigger aria-label={labels.revision}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {previous.map((revision) => (
                <SelectItem key={revision.id} value={revision.id}>
                  {revision.shortName} ·{" "}
                  {revision.action === "revert"
                    ? labels.revert_action
                    : labels.edit_action}{" "}
                  · {formatDateTime(revision.createdAt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          placeholder={labels.reason}
          aria-label={labels.reason}
          className="min-w-[200px] flex-1"
        />
        {previous.length > 0 && (
          <Button
            variant="outline"
            onClick={() => void revertName()}
            disabled={!trimmedReason || !revisionId || revert.isPending}
          >
            {revert.isPending ? <InlineSpinner /> : null}
            {labels.revert}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => void setLocked()}
          disabled={!trimmedReason || lock.isPending}
        >
          {lock.isPending ? <InlineSpinner /> : null}
          {entry.locked ? labels.unlock : labels.lock}
        </Button>
      </div>
      {actionFailed && (
        <p role="alert" className="text-sm text-destructive">
          {labels.action_failed}
        </p>
      )}
      {entry.revisions.length > 0 && (
        <div className="flex flex-col divide-y divide-border">
          {entry.revisions.map((revision) => (
            <div
              key={revision.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs text-muted-foreground"
            >
              <span>
                {revision.shortName} ·{" "}
                {revision.action === "revert"
                  ? labels.revert_action
                  : labels.edit_action}{" "}
                · {formatDateTime(revision.createdAt)}
              </span>
              <Link
                className="underline underline-offset-2"
                to={`/${lang}/admin/users/${revision.editorId}`}
              >
                {revision.editorId}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CourseShortNamesPage = () => {
  const dict = useDictionary();
  const { lang = "en" } = useParams<{ lang: string }>();
  const query = useAdminCourseShortNames();
  const entries = useMemo(
    () => query.data?.entries ?? [],
    [query.data?.entries],
  );

  return (
    <div className="flex flex-col px-4">
      {query.isError && <ErrorState error={query.error} />}
      {query.isLoading ? (
        <div className="py-6 text-sm text-muted-foreground">
          <InlineSpinner />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          {dict.admin_short_names.empty}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {entries.map((entry) => (
            <CourseShortNameRow key={entry.id} entry={entry} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseShortNamesPage;
