import { Button } from "@/components/ui/button";
import { lastSemester } from "@/const/semester";
import useDictionary from "@/dictionaries/useDictionary";
import { Undo } from "lucide-react";
import { useClearRefinements, useInstantSearch } from "react-instantsearch";

const ResetFiltersButton = () => {
  const { setIndexUiState } = useInstantSearch();
  const dict = useDictionary();

  const handleReset = () => {
    setIndexUiState((prev) => {
      return {
        menu: {
          semester: prev.menu?.semester ?? lastSemester.id,
        },
      };
    });
  };

  return (
    <Button onClick={handleReset} variant="ghost" size="icon">
      <Undo className="h-4 w-4" />
    </Button>
  );
};

export default ResetFiltersButton;
