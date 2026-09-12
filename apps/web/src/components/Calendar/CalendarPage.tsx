import { useState } from "react";
import Calendar from "@/components/Calendar/Calendar";
import UpcomingEvents from "./UpcomingEvents";
import OthersTimetablePanel, {
  type OverlayEntry,
} from "./OthersTimetablePanel";
import {
  PageHeader,
  PageShell,
  Section,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@courseweb/ui";
import { useSavedTimetables } from "@/hooks/useSavedTimetables";
import { Users } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import useUpcomingEvents from "@/hooks/useUpcomingEvents";
import { NextUpLine } from "@/components/Widgets/CountdownWidget";
import UpcomingEventList from "@/components/Calendar/UpcomingEventList";

const MobileCalendarUpcoming = () => {
  const dict = useDictionary();
  const { events, nextEvent } = useUpcomingEvents();

  return (
    <div className="space-y-6 xl:hidden">
      <Section title={dict.today.upcoming.next_up} variant="card">
        <NextUpLine
          event={nextEvent}
          showLabel={false}
          className="border-0 bg-transparent p-0"
        />
      </Section>
      <Section title={dict.calendar.upcoming_events} variant="card">
        <UpcomingEventList
          events={events}
          compact
          maxEvents={6}
          emptyStateSize="sm"
        />
      </Section>
    </div>
  );
};

const CalendarPage = () => {
  const [activeOverlays, setActiveOverlays] = useState<OverlayEntry[]>([]);
  const { totalUnread } = useSavedTimetables();
  const dict = useDictionary();

  return (
    <PageShell width="full">
      <PageHeader title={dict.calendar.page_title} />
      <div className="flex min-w-0 flex-row-reverse gap-6 h-full">
        <Calendar overlays={activeOverlays} />
        <div className="hidden xl:flex xl:w-72 xl:shrink-0 xl:flex-col">
          <Tabs defaultValue="upcoming" className="flex flex-col h-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="upcoming" className="flex-1">
                {dict.calendar.tabs.upcoming}
              </TabsTrigger>
              <TabsTrigger value="others" className="flex-1">
                {dict.calendar.tabs.others}
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
        <div className="fixed bottom-20 right-4 z-10 xl:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                {dict.calendar.tabs.others}
                {totalUnread > 0 && (
                  <Badge variant="destructive" className="h-4 text-xs px-1">
                    {totalUnread}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0 flex flex-col">
              <SheetHeader className="p-4 pb-0">
                <SheetTitle>{dict.calendar.tabs.others_timetables}</SheetTitle>
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
      <MobileCalendarUpcoming />
    </PageShell>
  );
};

export default CalendarPage;
