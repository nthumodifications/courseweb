import { useMemo, useState } from "react";
import { Input, Search } from "@courseweb/ui";
import {
  searchCampusBuildingIdentities,
  type CampusBuildingIdentity,
} from "@courseweb/shared";

type MapSearchProps = {
  availableIdentityIds: Set<string>;
  language: "en" | "zh";
  labels: {
    searchLabel: string;
    searchPlaceholder: string;
    noResults: string;
  };
  onSelect: (identityId: string) => void;
};

export default function MapSearch({
  availableIdentityIds,
  language,
  labels,
  onSelect,
}: MapSearchProps) {
  const [query, setQuery] = useState("");
  const [resultsOpen, setResultsOpen] = useState(false);
  const results = useMemo(
    () =>
      searchCampusBuildingIdentities(query).filter((identity) =>
        availableIdentityIds.has(identity.id),
      ),
    [availableIdentityIds, query],
  );
  const hasQuery = query.trim().length > 0;

  const selectIdentity = (identity: CampusBuildingIdentity) => {
    setResultsOpen(false);
    setQuery(
      language === "en"
        ? (identity.names.en ?? identity.names.zh)
        : identity.names.zh,
    );
    onSelect(identity.id);
  };

  return (
    <form
      className="pointer-events-auto w-full rounded-lg border border-border bg-background/95 p-2 shadow-lg backdrop-blur-md"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        if (results[0]) selectIdentity(results[0]);
      }}
    >
      <label htmlFor="campus-map-search" className="sr-only">
        {labels.searchLabel}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="campus-map-search"
          type="search"
          autoComplete="off"
          className="pl-8"
          value={query}
          placeholder={labels.searchPlaceholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setResultsOpen(true);
          }}
          onFocus={() => setResultsOpen(true)}
        />
      </div>

      {hasQuery && resultsOpen && (
        <div
          className="mt-2 max-h-56 overflow-y-auto rounded-md bg-muted"
          aria-live="polite"
        >
          {results.length > 0 ? (
            <ul>
              {results.map((identity) => (
                <li key={identity.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    onClick={() => selectIdentity(identity)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {language === "en"
                          ? (identity.names.en ?? identity.names.zh)
                          : identity.names.zh}
                      </span>
                      {language === "zh" && identity.names.en && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {identity.names.en}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {identity.venue.code}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {labels.noResults}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
