import { PropsWithChildren, RefObject, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@courseweb/ui";
import { CalendarEvent } from "./calendar.types";
import { EventForm } from "./EventForm";
import useDictionary from "@/dictionaries/useDictionary";

export const AddEventButton = ({
  children,
  defaultEvent,
  onEventAdded = () => {},
  openDialog,
  onOpenChange,
  returnFocusRef,
}: PropsWithChildren<{
  defaultEvent?: Partial<CalendarEvent>;
  onEventAdded?: (data: CalendarEvent) => void;
  openDialog?: boolean;
  onOpenChange?: (open: boolean) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}>) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const fallbackFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const dict = useDictionary();

  // Use either controlled or uncontrolled state
  const open = openDialog !== undefined ? openDialog : internalOpen;

  useEffect(() => {
    if (open && !wasOpenRef.current && !returnFocusRef?.current) {
      const activeElement = document.activeElement;
      fallbackFocusRef.current =
        activeElement instanceof HTMLElement ? activeElement : null;
    }
    wasOpenRef.current = open;
  }, [open, returnFocusRef]);

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
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent
        className="p-0 flex max-h-[90vh] overflow-hidden"
        onCloseAutoFocus={(event) => {
          if (children) return;
          const focusTarget =
            returnFocusRef?.current ?? fallbackFocusRef.current;
          if (focusTarget) {
            event.preventDefault();
            focusTarget.focus();
          }
        }}
      >
        <div className="p-4 md:p-6 w-full gap-4 flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {defaultEvent?.id
                ? dict.calendar.event.edit
                : dict.calendar.add_event}
            </DialogTitle>
            <DialogDescription>
              {dict.calendar.event.form_description}
            </DialogDescription>
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
