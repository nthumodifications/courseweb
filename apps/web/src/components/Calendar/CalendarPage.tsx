import { useState } from "react";
import Calendar from "@/components/Calendar/Calendar";
import UpcomingEvents from "./UpcomingEvents";
import OthersTimetablePanel, {
  type OverlayEntry,
} from "./OthersTimetablePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@courseweb/ui";
import { useSavedTimetables } from "@/hooks/useSavedTimetables";
import { Badge } from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import { Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@courseweb/ui";

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
        <div className="fixed bottom-4 right-4 xl:hidden z-10">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="shadow-md gap-1.5">
                <Users className="h-4 w-4" />
                Others
                {totalUnread > 0 && (
                  <Badge variant="destructive" className="h-4 text-xs px-1">
                    {totalUnread}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0 flex flex-col">
              <SheetHeader className="p-4 pb-0">
                <SheetTitle>Others&apos; Timetables</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-auto p-4 pt-2">
                <OthersTimetablePanel
                  activeOverlays={activeOverlays}
                  onOverlayChange={setActiveOverlays}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
