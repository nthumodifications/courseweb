import { Button } from "@courseweb/ui";
import { useSettings } from "@/hooks/contexts/settings";
import { Star } from "lucide-react";

const FavouriteApp = ({ appId }: { appId: string }) => {
  const { pinnedApps, toggleApp } = useSettings();

  const isPinned = pinnedApps.includes(appId);

  return (
    <Button size="icon" variant="ghost" onClick={() => toggleApp(appId)}>
      <Star
        className={
          isPinned ? "fill-primary stroke-primary" : "text-muted-foreground"
        }
      />
    </Button>
  );
};

export default FavouriteApp;
