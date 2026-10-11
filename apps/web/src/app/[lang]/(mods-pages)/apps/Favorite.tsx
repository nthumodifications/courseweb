import { Button } from "@courseweb/ui";
import { useSettings } from "@/hooks/contexts/settings";
import { Star } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

const FavouriteApp = ({ appId }: { appId: string }) => {
  const { pinnedApps, toggleApp } = useSettings();
  const dict = useDictionary();

  const isPinned = pinnedApps.includes(appId);

  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={isPinned ? dict.a11y.unfavorite : dict.a11y.favorite}
      onClick={() => toggleApp(appId)}
    >
      <Star
        className={
          isPinned ? "fill-primary stroke-primary" : "text-muted-foreground"
        }
      />
    </Button>
  );
};

export default FavouriteApp;
