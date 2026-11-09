import { useState } from "react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { EmptyState, ErrorState, PageHeader } from "../components";
import {
  useAdminSpaceOrganisations,
  useSetSpaceOrganisationStatus,
} from "../api";

type StatusFilter = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED" | "ALL";

const OrganisationVerificationPage = () => {
  const dict = useDictionary();
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const query = useAdminSpaceOrganisations(status);
  const update = useSetSpaceOrganisationStatus();
  const statusLabels: Record<StatusFilter, string> = {
    PENDING: dict.spaces.pending,
    VERIFIED: dict.spaces.verified,
    REJECTED: dict.spaces.rejectedStatus,
    SUSPENDED: dict.spaces.suspended,
    ALL: dict.spaces.organisationStatus,
  };

  const decide = async (
    id: string,
    next: "VERIFIED" | "REJECTED" | "SUSPENDED",
  ) => {
    const reason = reasonById[id]?.trim();
    if (!reason) {
      setError(dict.spaces.reason);
      return;
    }
    setError("");
    try {
      await update.mutateAsync({ id, status: next, reason });
    } catch {
      setError(dict.spaces.saveFailed);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={dict.spaces.verificationQueue} />
      <div className="flex flex-row items-center gap-3">
        <label className="text-sm" htmlFor="organisation-status">
          {dict.spaces.organisationStatus}
        </label>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as StatusFilter)}
        >
          <SelectTrigger id="organisation-status" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">{dict.spaces.loading}</p>
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (query.data?.organisations.length ?? 0) === 0 ? (
        <EmptyState>{dict.spaces.noRequests}</EmptyState>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {query.data!.organisations.map((organisation) => (
            <section key={organisation.id} className="flex flex-col gap-3 py-4">
              <div className="flex flex-row flex-wrap items-baseline gap-3">
                <h2 className="font-bold">{organisation.name}</h2>
                <span className="text-sm text-muted-foreground">
                  /{organisation.slug}
                </span>
                <span className="flex-1" />
                <span className="whitespace-nowrap text-sm font-medium">
                  {statusLabels[organisation.status]}
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                {organisation.description || "—"}
              </p>
              <div className="flex flex-row flex-wrap gap-2 text-sm text-muted-foreground">
                <span>
                  {organisation.creator.name} · {organisation.creator.userId}
                </span>
                <span>{organisation.contact}</span>
                <span>
                  {organisation.spaces.length} {dict.spaces.spaces}
                </span>
              </div>
              {organisation.spaces.length > 0 && (
                <div className="flex flex-col divide-y divide-border border-l border-border pl-3">
                  {organisation.spaces.map((space) => (
                    <div
                      key={space.id}
                      className="flex flex-row gap-3 py-2 text-sm"
                    >
                      <span className="flex-1">{space.name}</span>
                      <span className="text-muted-foreground">
                        /{space.slug}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-row flex-wrap items-center gap-2">
                <Input
                  value={reasonById[organisation.id] ?? ""}
                  onChange={(event) =>
                    setReasonById((current) => ({
                      ...current,
                      [organisation.id]: event.target.value,
                    }))
                  }
                  placeholder={dict.spaces.reason}
                  aria-label={`${dict.spaces.reason}: ${organisation.name}`}
                  maxLength={1000}
                  className="min-w-48 flex-1"
                />
                {organisation.status === "PENDING" && (
                  <Button
                    size="sm"
                    onClick={() => void decide(organisation.id, "VERIFIED")}
                    disabled={update.isPending}
                  >
                    {dict.spaces.verify}
                  </Button>
                )}
                {organisation.status !== "REJECTED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void decide(organisation.id, "REJECTED")}
                    disabled={update.isPending}
                  >
                    {dict.spaces.reject}
                  </Button>
                )}
                {organisation.status !== "SUSPENDED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void decide(organisation.id, "SUSPENDED")}
                    disabled={update.isPending}
                  >
                    {dict.spaces.suspend}
                  </Button>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrganisationVerificationPage;
