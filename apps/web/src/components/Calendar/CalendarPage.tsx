import { useState } from "react";
import Calendar from "@/components/Calendar/Calendar";
import UpcomingEvents from "./UpcomingEvents";
import OthersTimetablePanel, {
  type OverlayEntry,
} from "./OthersTimetablePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@courseweb/ui";
import { useSavedTimetables } from "@/hooks/useSavedTimetables";
import { Badge } from "@courseweb/ui";

const CalendarPage = () => {
  const [activeOverlays, setActiveOverlays] = useState<OverlayEntry[]>([]);
  const { totalUnread } = useSavedTimetables();

  return (
    <div className="md:pr-8 w-full">
      <div className="flex flex-row-reverse gap-6 h-full">
        <Calendar overlays={activeOverlays} />
        <div className="hidden xl:flex xl:flex-col xl:w-72 xl:shrink-0">
          <Tabs defaultValue="upcoming" className="flex flex-col h-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="upcoming" className="flex-1">
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="others" className="flex-1">
                Others
                {totalUnread > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-4 text-xs px-1"
                  >
                    {totalUnread}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="flex-1 overflow-hidden">
              <UpcomingEvents />
            </TabsContent>
            <TabsContent value="others" className="flex-1 overflow-auto">
              <OthersTimetablePanel
                activeOverlays={activeOverlays}
                onOverlayChange={setActiveOverlays}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
