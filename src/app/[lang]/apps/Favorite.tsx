'use client';

import { useSettings } from "@/hooks/contexts/settings";
import { IconButton } from "@mui/joy";
import { Star } from "react-feather";

const FavouriteApp = ({ appId }: { appId: string }) => {
    const { pinnedApps, toggleApp } = useSettings();

    const isPinned = pinnedApps.includes(appId);

    return  <IconButton onClick={() => toggleApp(appId)}>
        <Star className={isPinned? 'text-yellow-500':'text-gray-700 dark:text-neutral-400'}/>
    </IconButton>
}

export default FavouriteApp;