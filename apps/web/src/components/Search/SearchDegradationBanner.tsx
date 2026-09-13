import { useState, useSyncExternalStore } from "react";
import { Alert, AlertDescription, Button, X, Info } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import type { ResilientSearchClient } from "@/lib/search-client";

const SearchDegradationBanner = ({
  searchClient,
}: {
  searchClient: ResilientSearchClient;
}) => {
  const dict = useDictionary();
  const [dismissed, setDismissed] = useState(false);
  const backend = useSyncExternalStore(
    searchClient.subscribe,
    searchClient.getStatus,
    () => "primary" as const,
  );
  if (backend === "local-loading") {
    return (
      <Alert className="flex items-center gap-2 p-2 text-sm">
        <Info className="h-4 w-4 shrink-0" />
        <AlertDescription className="flex flex-1 items-center">
          {dict.course.search.preparing_local_mode}
        </AlertDescription>
      </Alert>
    );
  }

  if (backend !== "fallback" || dismissed) return null;

  return (
    <Alert className="flex items-center gap-2 p-2 text-sm">
      <Info className="h-4 w-4" />
      <AlertDescription className="flex flex-1 items-center justify-between gap-2">
        <span>{dict.course.search.limited_mode}</span>
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
      </AlertDescription>
    </Alert>
  );
};

export default SearchDegradationBanner;
