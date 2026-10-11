import { Button } from "@courseweb/ui";
import { lastSemester } from "@courseweb/shared";
import { Undo } from "lucide-react";
import { useInstantSearch } from "react-instantsearch";
import useDictionary from "@/dictionaries/useDictionary";

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
