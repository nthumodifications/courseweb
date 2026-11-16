import { Button } from "@courseweb/ui";
import { Undo } from "lucide-react";
import { useInstantSearch } from "react-instantsearch";
import type { IndexUiState } from "instantsearch.js";
import useDictionary from "@/dictionaries/useDictionary";
import { useDefaultSemesterId } from "@/hooks/useSemesters";

const ResetFiltersButton = ({
  resetToIndexUiState,
}: {
  resetToIndexUiState?: IndexUiState;
}) => {
  const { setIndexUiState } = useInstantSearch();
  const dict = useDictionary();
  const defaultSemester = useDefaultSemesterId();

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
      size="icon"
      aria-label={dict.a11y.clear}
    >
      <Undo className="h-4 w-4" />
    </Button>
  );
};

export default ResetFiltersButton;
