import { Button } from "@courseweb/ui";
import { Undo } from "lucide-react";
import { useInstantSearch } from "react-instantsearch";
import type { IndexUiState } from "instantsearch.js";
import useDictionary from "@/dictionaries/useDictionary";
import { useDefaultSemesterId } from "@/hooks/useSemesters";
import { hasCourseSearchRefinements } from "./courseSearchView";

const ResetFiltersButton = ({
  resetToIndexUiState,
  showLabel = false,
  className,
}: {
  resetToIndexUiState?: IndexUiState;
  showLabel?: boolean;
  className?: string;
}) => {
  const { indexUiState, setIndexUiState } = useInstantSearch();
  const dict = useDictionary();
  const defaultSemester = useDefaultSemesterId();
  const canReset = hasCourseSearchRefinements(
    resetToIndexUiState ?? indexUiState,
  );

  const handleReset = () => {
    setIndexUiState((prev) => {
      if (resetToIndexUiState) return resetToIndexUiState;
      return {
        menu: {
          semester: prev.menu?.semester ?? defaultSemester,
        },
      };
    });
  };

  return (
    <Button
      onClick={handleReset}
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      disabled={!canReset}
      className={className}
      aria-label={showLabel ? undefined : dict.a11y.clear}
    >
      {showLabel ? dict.course.refine.clear : <Undo className="h-4 w-4" />}
    </Button>
  );
};

export default ResetFiltersButton;
