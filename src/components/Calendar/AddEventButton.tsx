import { PropsWithChildren, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarEvent } from "./calendar.types";
import { EventForm } from "./EventForm";
import useDictionary from "@/dictionaries/useDictionary";

export const AddEventButton = ({
  children,
  defaultEvent,
  onEventAdded = () => {},
  openDialog,
  onOpenChange,
}: PropsWithChildren<{
  defaultEvent?: Partial<CalendarEvent>;
  onEventAdded?: (data: CalendarEvent) => void;
  openDialog?: boolean;
  onOpenChange?: (open: boolean) => void;
}>) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const dict = useDictionary();

  // Use either controlled or uncontrolled state
  const open = openDialog !== undefined ? openDialog : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  // Handle form submission from EventForm
  const handleSubmit = (eventData: CalendarEvent) => {
    onEventAdded(eventData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={true}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="p-0 flex max-h-[90vh] overflow-hidden">
        <div className="p-4 md:p-6 w-full gap-4 flex flex-col">
          <DialogHeader>
            <DialogTitle>{dict.calendar.add_event}</DialogTitle>
          </DialogHeader>
          <EventForm
            defaultEvent={defaultEvent}
            onSubmit={handleSubmit}
            open={open}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
