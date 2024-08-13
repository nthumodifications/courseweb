"use client";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/contexts/settings";
import { Star } from "lucide-react";

const FavouriteApp = ({ appId }: { appId: string }) => {
  const { pinnedApps, toggleApp } = useSettings();

  const isPinned = pinnedApps.includes(appId);

  return (
    <Button size="icon" variant="ghost" onClick={() => toggleApp(appId)}>
      <Star
        className={
          isPinned ? "text-yellow-500" : "text-gray-700 dark:text-neutral-400"
        }
      />
    </Button>
  );
};

export default FavouriteApp;
