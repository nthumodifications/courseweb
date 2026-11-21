import { useState, useSyncExternalStore } from "react";
import { useInstantSearch } from "react-instantsearch";
import { Alert, AlertDescription, Button, X, Info } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import type { ResilientSearchClient } from "@/lib/search-client";

const SearchDegradationBanner = ({
  searchClient,
  inline = false,
}: {
  searchClient: ResilientSearchClient;
  /** One line of muted text for a results info row, instead of an Alert. */
  inline?: boolean;
}) => {
  const dict = useDictionary();
  const [dismissed, setDismissed] = useState(false);
  const backend = useSyncExternalStore(
    searchClient.subscribe,
    searchClient.getStatus,
    () => "fallback" as const,
  );
  const hasError = useSyncExternalStore(
    searchClient.subscribe,
    searchClient.hasError,
    () => false,
  );
  const { refresh } = useInstantSearch();
  if (backend !== "fallback" || dismissed) return null;

  if (inline) {
    return (
      <span className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {hasError ? dict.common.load_error : dict.course.search.limited_mode}
        </span>
        {hasError ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-8 shrink-0 px-2 text-primary"
            onClick={refresh}
          >
            {dict.common.try_again}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={dict.course.search.dismiss_limited_mode}
            title={dict.course.search.dismiss_limited_mode}
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </span>
    );
  }

  return (
    <Alert className="flex items-center gap-2 p-2 text-sm">
      <Info className="h-4 w-4" />
      <AlertDescription className="flex flex-1 items-center justify-between gap-2">
        <span>
          {hasError ? dict.common.load_error : dict.course.search.limited_mode}
        </span>
        {hasError ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={refresh}
          >
            {dict.common.try_again}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            aria-label={dict.course.search.dismiss_limited_mode}
            title={dict.course.search.dismiss_limited_mode}
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default SearchDegradationBanner;
