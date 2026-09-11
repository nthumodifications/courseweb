import { type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Badge, Card, CardContent, Skeleton, cn } from "@courseweb/ui";
import type { AdminRole } from "./api";

/** Small shared pieces used across the admin center's pages. */

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export const StatCard = ({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: number | string | null | undefined;
  hint?: string;
  loading?: boolean;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <div className="mt-1 text-2xl font-semibold tabular-nums">
          {/* A null count means the source database could not be reached, which
              is a different thing from a count of zero and has to read that way. */}
          {value === null || value === undefined
            ? "—"
            : typeof value === "number"
              ? value.toLocaleString()
              : value}
        </div>
      )}
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </CardContent>
  </Card>
);

export const RoleBadge = ({ role }: { role: AdminRole }) => {
  if (role === "SUPERUSER") return <Badge>Superuser</Badge>;
  if (role === "ADMIN") return <Badge variant="secondary">Admin</Badge>;
  return <span className="text-xs text-muted-foreground">User</span>;
};

export const ErrorState = ({ error }: { error: unknown }) => (
  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
    <span>{error instanceof Error ? error.message : "Something failed."}</span>
  </div>
);

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="py-12 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

export const InlineSpinner = ({ className }: { className?: string }) => (
  <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-hidden />
);

/** Dates are shown in Taipei time — the only timezone the team operates in. */
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatDateTime = (value: string | null | undefined) =>
  value ? formatter.format(new Date(value)) : "—";

export const relativeTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export const Mono = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-xs">{children}</span>
);
