import useDictionary from "@/dictionaries/useDictionary";

export type SearchResultCountProps = {
  status: string;
  nbHits: number;
  processingTimeMS: number;
  showProcessingTime?: boolean;
};

/** The count stays visible while a cached or remote search is being refreshed. */
export const SearchResultCount = ({
  status,
  nbHits,
  processingTimeMS,
  showProcessingTime = true,
}: SearchResultCountProps) => {
  const dict = useDictionary();

  return (
    <span className="text-sm mr-auto">
      {(status === "loading" || status === "stalled") && nbHits === 0
        ? dict.common.loading
        : `${nbHits} ${dict.course.refine.results}${
            showProcessingTime ? ` (${processingTimeMS}ms)` : ""
          }`}
    </span>
  );
};
