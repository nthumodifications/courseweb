import { format, isSameDay, set } from "date-fns";
import { FC, PropsWithChildren, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarEvent, DisplayCalendarEvent } from "./calendar.types";
import { Button } from "@/components/ui/button";
import { Delete, Edit, MapPin, Pin, Text, Trash, X } from "lucide-react";
import { PopoverClose } from "@radix-ui/react-popover";
import { UpdateType, useCalendar } from "./calendar_hook";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogClose, DialogDescription } from "@radix-ui/react-dialog";
import { AddEventButton } from "./AddEventButton";

const ConfirmDeleteEvent: FC<{ event: DisplayCalendarEvent }> = ({ event }) => {
  const { removeEvent } = useCalendar();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <Trash className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>確認刪除</DialogTitle>
          <DialogDescription>
            <p>確定要刪除這個事件嗎？</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">取消</Button>
          </DialogClose>
          <Button variant="destructive" onClick={(_) => removeEvent(event)}>
            刪除
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
          <DialogTitle>更新重複事件</DialogTitle>
          <DialogDescription>
            <p>您要更新所有重複事件還是只更新這個事件？</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">取消</Button>
          </DialogClose>
          <Button onClick={(_) => onClose(UpdateType.THIS)}>
            只更新這個事件
          </Button>
          <Button onClick={(_) => onClose(UpdateType.ALL)}>所有</Button>
          <Button onClick={(_) => onClose(UpdateType.FOLLOWING)}>
            這個和之後的事件
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
          <DialogTitle>刪除重複事件</DialogTitle>
          <DialogDescription>
            <p>您要刪除所有重複事件還是只刪除這個事件？</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">取消</Button>
          </DialogClose>
          <Button onClick={(_) => onClose(UpdateType.THIS)}>
            只刪除這個事件
          </Button>
          <Button onClick={(_) => onClose(UpdateType.ALL)}>所有</Button>
          <Button onClick={(_) => onClose(UpdateType.FOLLOWING)}>
            這個和之後的事件
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
      console.log("1", event, newEvent);
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
    console.log("2", waitingUpdateEvent);
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
