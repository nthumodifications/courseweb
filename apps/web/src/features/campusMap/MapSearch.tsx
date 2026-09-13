import { useMemo, useState } from "react";
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@courseweb/ui";
import { Search } from "lucide-react";
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
  const [searchOpen, setSearchOpen] = useState(false);
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
    setSearchOpen(false);
    setResultsOpen(false);
    setQuery(
      language === "en"
        ? (identity.names.en ?? identity.names.zh)
        : identity.names.zh,
    );
    onSelect(identity.id);
  };

  return (
    <Popover
      open={searchOpen}
      onOpenChange={(open) => {
        setSearchOpen(open);
        if (!open) setResultsOpen(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="pointer-events-auto shadow-lg"
          aria-label={labels.searchLabel}
          title={labels.searchLabel}
        >
          <Search className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="pointer-events-auto w-[min(24rem,calc(100vw-1.5rem))] p-2"
        role="dialog"
        aria-label={labels.searchLabel}
      >
        <form
          className="w-full"
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
              className="pl-9"
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
              className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-background"
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
                        <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
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
      </PopoverContent>
    </Popover>
  );
}
