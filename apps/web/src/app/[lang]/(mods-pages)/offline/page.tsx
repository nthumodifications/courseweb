import { CloudOff } from "lucide-react";
import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";

const OfflinePage = () => {
  const dict = useDictionary();

  return (
    <div className="w-full h-[--content-height] flex flex-col gap-4 items-start px-4 pt-4">
      <CloudOff className="h-4 w-4 text-muted-foreground" />
      <p className="text-muted-foreground leading-relaxed">{dict.pages.offline}</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
        {dict.error.try_again}
      </Button>
    </div>
  );
};

export default OfflinePage;
