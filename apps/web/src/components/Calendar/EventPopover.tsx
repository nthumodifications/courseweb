import { format, isSameDay, set } from "date-fns";
import { FC, PropsWithChildren, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@courseweb/ui";
import { CalendarEvent, DisplayCalendarEvent } from "./calendar.types";
import { Button } from "@courseweb/ui";
import {
  Delete,
  Edit,
  MapPin,
  Pin,
  Text,
  Trash,
  X,
  CalendarPlus,
} from "lucide-react";
import { PopoverClose } from "@radix-ui/react-popover";
import { UpdateType, useCalendar } from "./calendar_hook";
import DateContributeForm from "@/components/CourseDetails/DateContributeForm";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@courseweb/ui";
import { DialogClose, DialogDescription } from "@radix-ui/react-dialog";
import { AddEventButton } from "./AddEventButton";
import useDictionary from "@/dictionaries/useDictionary";

const ConfirmDeleteEvent: FC<{ event: DisplayCalendarEvent }> = ({ event }) => {
  const { removeEvent } = useCalendar();
  const dict = useDictionary();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <Trash className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dict.calendar.event.confirm_delete_title}</DialogTitle>
          <DialogDescription>
            {dict.calendar.event.confirm_delete_description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{dict.calendar.event.cancel}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={(_) => removeEvent(event)}>
            {dict.calendar.event.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UpdateRepeatedEventDialog: FC<{
  open: boolean;
  onClose: (type?: UpdateType) => void;
}> = ({ open, onClose }) => {
  const dict = useDictionary();
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogTrigger asChild></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dict.calendar.event.update_repeat_title}</DialogTitle>
          <DialogDescription>
            {dict.calendar.event.update_repeat_description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{dict.calendar.event.cancel}</Button>
          </DialogClose>
          <Button onClick={(_) => onClose(UpdateType.THIS)}>
            {dict.calendar.event.update_this}
          </Button>
          <Button onClick={(_) => onClose(UpdateType.ALL)}>
            {dict.calendar.event.all}
          </Button>
          <Button onClick={(_) => onClose(UpdateType.FOLLOWING)}>
            {dict.calendar.event.update_following}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeleteRepeatedEventDialog: FC<{
  open: boolean;
  onClose: (type?: UpdateType) => void;
}> = ({ open, onClose }) => {
  const dict = useDictionary();
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogTrigger asChild></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dict.calendar.event.delete_repeat_title}</DialogTitle>
          <DialogDescription>
            {dict.calendar.event.delete_repeat_description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{dict.calendar.event.cancel}</Button>
          </DialogClose>
          <Button onClick={(_) => onClose(UpdateType.THIS)}>
            {dict.calendar.event.delete_this}
          </Button>
          <Button onClick={(_) => onClose(UpdateType.ALL)}>
            {dict.calendar.event.all}
          </Button>
          <Button onClick={(_) => onClose(UpdateType.FOLLOWING)}>
            {dict.calendar.event.update_following}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const EventPopover: FC<
  PropsWithChildren<{ event: DisplayCalendarEvent }>
> = ({ children, event }) => {
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [waitingUpdateEvent, setWaitingUpdateEvent] =
    useState<CalendarEvent | null>(null);
  const { updateEvent, removeEvent } = useCalendar();

  const handleEventAdded = (newEvent: CalendarEvent) => {
    if (!event.repeat) updateEvent(newEvent, event);
    else {
      setUpdateDialogOpen(true);
      setWaitingUpdateEvent(newEvent);
    }
  };

  const handleConfirmedRepeatedDelete = (type?: UpdateType) => {
    setDeleteDialogOpen(false);
    if (!type) return;
    removeEvent(event, type);
  };

  const handleRepeatedEventUpdate = (type?: UpdateType) => {
    if (!type) return;
    if (waitingUpdateEvent) updateEvent(waitingUpdateEvent, event, type);
    setWaitingUpdateEvent(null);
    setUpdateDialogOpen(false);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="p-1">
        <UpdateRepeatedEventDialog
          open={updateDialogOpen}
          onClose={handleRepeatedEventUpdate}
        />
        <DeleteRepeatedEventDialog
          open={deleteDialogOpen}
          onClose={handleConfirmedRepeatedDelete}
        />
        <div className="flex flex-col">
          <div className="flex flex-row justify-end">
            {event.courseId && (
              <DateContributeForm courseId={event.courseId}>
                <Button size="icon" variant="ghost">
                  <CalendarPlus className="w-4 h-4" />
                </Button>
              </DateContributeForm>
            )}
            {!event.readonly && (
              <AddEventButton
                defaultEvent={{
                  ...event,
                  start: event.displayStart,
                  end: event.displayEnd,
                }}
                onEventAdded={handleEventAdded}
              >
                <Button size="icon" variant="ghost">
                  <Edit className="w-4 h-4" />
                </Button>
              </AddEventButton>
            )}
            {event.repeat ? (
              <Button
                size="icon"
                variant="ghost"
                onClick={(_) => setDeleteDialogOpen(true)}
              >
                <Trash className="w-4 h-4" />
              </Button>
            ) : (
              <ConfirmDeleteEvent event={event} />
            )}
            <PopoverClose asChild>
              <Button size="icon" variant="ghost">
                <X className="w-4 h-4" />
              </Button>
            </PopoverClose>
          </div>
          <div className="flex flex-row gap-1 px-2 pb-4">
            <div className="w-6 py-1">
              <div
                className="w-4 h-4 rounded-full"
                style={{ background: event.color }}
              ></div>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <h1 className="text-xl font-semibold">{event.title}</h1>
              {event.allDay ? (
                <p className="text-sm text-slate-500">
                  {format(event.displayStart, "yyyy-M-d")} -{" "}
                  {format(event.displayEnd, "yyyy-M-d")}
                </p>
              ) : isSameDay(event.start, event.end) ? (
                <p className="text-sm text-slate-500">
                  {format(event.displayStart, "yyyy-M-d")} ⋅{" "}
                  {format(event.displayStart, "HH:mm")} -{" "}
                  {format(event.displayEnd, "HH:mm")}
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  {format(event.displayStart, "yyyy-M-d HH:mm")} -{" "}
                  {format(event.displayEnd, "yyyy-LL-dd HH:mm")}
                </p>
              )}
              {event.location && (
                <p className="text-sm text-slate-500">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {event.location}
                </p>
              )}
              {event.details && (
                <p className="text-sm text-slate-500">
                  <Text className="w-4 h-4 inline mr-1" />
                  {event.details}
                </p>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
