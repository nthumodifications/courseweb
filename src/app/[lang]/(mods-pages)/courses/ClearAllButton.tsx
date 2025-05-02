import { Button } from "@/components/ui/button";
import useDictionary from "@/dictionaries/useDictionary";
import { Undo } from "lucide-react";
import { useClearRefinements } from "react-instantsearch";

const ClearAllButton = () => {
  const { refine } = useClearRefinements();
  const dict = useDictionary();

  return (
    <Button onClick={refine} variant="ghost" size="icon">
      <Undo className="h-4 w-4" />
    </Button>
  );
};

export default ClearAllButton;
