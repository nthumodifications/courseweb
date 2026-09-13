import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useDebounceValue } from "usehooks-ts";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@courseweb/ui";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  Mono,
  PageHeader,
  formatDateTime,
  relativeTime,
} from "../components";
import { useAdminAudit } from "../api";

const PAGE_SIZE = 25;
const ACTION_PREFIXES = [
  "user.",
  "announcement.",
  "client.",
  "recruitment.",
] as const;

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const jsonText = (value: unknown) =>
  JSON.stringify(value, null, 2) ?? String(value);

const MetadataDisclosure = ({ value }: { value: unknown }) => (
  <details className="max-w-[280px]">
    <summary className="cursor-pointer text-xs text-muted-foreground">
      View metadata
    </summary>
    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-muted/50 p-2 text-[0.7rem] leading-4">
      {jsonText(value)}
    </pre>
  </details>
);

const Metadata = ({ action, value }: { action: string; value: unknown }) => {
  if (!isJsonObject(value)) {
    return value == null ? (
      <span>—</span>
    ) : (
      <MetadataDisclosure value={value} />
    );
  }

  const from = value.from;
  const to = value.to;
  if (
    action === "user.role.update" &&
    typeof from === "string" &&
    typeof to === "string"
  ) {
    return (
      <Mono>
        {from} -&gt; {to}
      </Mono>
    );
  }

  if (action === "user.ban") {
    return (
      <span>
        Reason:{" "}
        {typeof value.reason === "string" ? value.reason : "Not provided"}
      </span>
    );
  }

  if (action === "user.unban" && typeof value.reason === "string") {
    return <span>Reason: {value.reason}</span>;
  }

  if (
    action === "user.sessions.revoke" &&
    typeof value.sessions === "number" &&
    typeof value.tokens === "number"
  ) {
    return (
      <span>
        {value.sessions} session{value.sessions === 1 ? "" : "s"} ·{" "}
        {value.tokens} token
        {value.tokens === 1 ? "" : "s"}
      </span>
    );
  }

  if (
    Array.isArray(value.fields) &&
    value.fields.every((field) => typeof field === "string")
  ) {
    return <span>Fields: {value.fields.join(", ") || "none"}</span>;
  }

  if (typeof value.title === "string") {
    return (
      <span>
        Title: {value.title}
        {typeof value.active === "boolean" && (
          <span className="text-muted-foreground">
            {value.active ? " · active" : " · inactive"}
          </span>
        )}
      </span>
    );
  }

  if (typeof value.name === "string") return <span>Name: {value.name}</span>;

  if (
    typeof value.firstParty === "boolean" ||
    typeof value.confidential === "boolean"
  ) {
    return (
      <span>
        {value.firstParty === true ? "First-party" : "Third-party"}
        {typeof value.confidential === "boolean" &&
          (value.confidential ? " · confidential" : " · public")}
      </span>
    );
  }

  if (Object.keys(value).length === 0) return <span>—</span>;
  return <MetadataDisclosure value={value} />;
};

const actionPrefix = (action: string) =>
  ACTION_PREFIXES.find((prefix) => action.startsWith(prefix)) ?? "all";

const isDestructiveAction = (action: string) =>
  action.endsWith(".ban") ||
  action.endsWith(".delete") ||
  action.endsWith(".rotate_secret");

/**
 * The audit trail is intentionally dense: staff need to scan who changed what
 * without opening a second view for every event.
 */
const AdminAuditPage = () => {
  const { lang } = useParams<{ lang: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const action = searchParams.get("action") ?? "";
  const actorId = searchParams.get("actorId") ?? "";

  const [actionInput, setActionInput] = useState(action);
  const [actorInput, setActorInput] = useState(actorId);
  // Action searches are commonly typed one character at a time; debouncing
  // keeps that from turning one filter change into a request per keystroke.
  const [debouncedAction] = useDebounceValue(actionInput, 300);

  const query = useAdminAudit({
    action: debouncedAction.trim() || undefined,
    actorId: actorId.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all" || value === "") next.delete(key);
    else next.set(key, value);
    // A changed filter can make the current page empty, so start it over.
    if (key !== "page") next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="A read-only record of changes made in the admin center."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="pl-8"
            placeholder="Action, e.g. role.update"
            value={actionInput}
            onChange={(event) => {
              setActionInput(event.target.value);
              updateParam("action", event.target.value);
            }}
            aria-label="Filter by action"
          />
        </div>

        <Input
          className="min-w-[180px] flex-1 sm:max-w-[220px]"
          placeholder="Actor user ID"
          value={actorInput}
          onChange={(event) => {
            setActorInput(event.target.value);
            updateParam("actorId", event.target.value);
          }}
          aria-label="Filter by actor user ID"
        />

        <Select
          value={actionPrefix(action)}
          onValueChange={(value) => {
            const nextValue = value === "all" ? "" : value;
            setActionInput(nextValue);
            updateParam("action", nextValue);
          }}
        >
          <SelectTrigger
            className="w-[180px]"
            aria-label="Filter by action prefix"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All action groups</SelectItem>
            {ACTION_PREFIXES.map((prefix) => (
              <SelectItem key={prefix} value={prefix}>
                {prefix}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isError && <ErrorState error={query.error} />}

      <div className="overflow-x-auto rounded-md border bg-background">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">When</TableHead>
              <TableHead className="w-[170px]">Who</TableHead>
              <TableHead className="w-[170px]">Action</TableHead>
              <TableHead className="w-[170px]">Target</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading &&
              Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {query.data?.entries.map((entry) => {
              const actorName =
                entry.actor?.name || entry.actor?.nameEn || "Unknown actor";
              const target = entry.targetId ? (
                entry.targetType === "user" ? (
                  <Link
                    to={`/${lang}/admin/users/${entry.targetId}`}
                    className="font-mono text-xs underline-offset-2 hover:underline"
                  >
                    {entry.targetId}
                  </Link>
                ) : (
                  <Mono>{entry.targetId}</Mono>
                )
              ) : (
                <span>—</span>
              );

              return (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Mono>{formatDateTime(entry.createdAt)}</Mono>
                    <div className="text-xs text-muted-foreground">
                      {relativeTime(entry.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="truncate">{actorName}</div>
                    <Link
                      to={`/${lang}/admin/users/${entry.actorId}`}
                      className="font-mono text-xs underline-offset-2 hover:underline"
                    >
                      {entry.actorId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        isDestructiveAction(entry.action)
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      {entry.targetType ?? "—"}
                    </div>
                    {target}
                  </TableCell>
                  <TableCell>
                    <Metadata action={entry.action} value={entry.metadata} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {!query.isLoading && query.data?.entries.length === 0 && (
          <EmptyState>No audit entries match those filters.</EmptyState>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {total.toLocaleString()} entr{total === 1 ? "y" : "ies"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateParam("page", String(page - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </Button>
          <span className="tabular-nums">
            {page} / {lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= lastPage}
            onClick={() => updateParam("page", String(page + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </>
  );
};

export default AdminAuditPage;
