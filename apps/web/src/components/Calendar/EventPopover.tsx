import { format, isSameDay } from "date-fns";
import {
  cloneElement,
  FC,
  isValidElement,
  PropsWithChildren,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  type ReactElement,
} from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@courseweb/ui";
import { CalendarEvent, DisplayCalendarEvent } from "./calendar.types";
import { Button } from "@courseweb/ui";
import {
  Edit,
  MapPin,
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
  DialogClose,
  DialogDescription,
} from "@courseweb/ui";
import { AddEventButton } from "./AddEventButton";
import useDictionary from "@/dictionaries/useDictionary";
import { getLocale } from "@/helpers/dateLocale";
import { useSettings } from "@/hooks/contexts/settings";

const ConfirmDeleteEvent: FC<{
  event: DisplayCalendarEvent;
  onDeleted: () => void;
}> = ({ event, onDeleted }) => {
  const { removeEvent } = useCalendar();
  const dict = useDictionary();
  const deletedRef = useRef(false);

  const deleteEvent = () => {
    deletedRef.current = true;
    removeEvent(event);
    onDeleted();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={dict.calendar.event.delete}
        >
          <Trash className="w-4 h-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent
        onCloseAutoFocus={(focusEvent) => {
          if (deletedRef.current) {
            focusEvent.preventDefault();
            onDeleted();
          }
        }}
      >
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
          <DialogClose asChild>
            <Button variant="destructive" onClick={deleteEvent}>
              {dict.calendar.event.delete}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UpdateRepeatedEventDialog: FC<{
  open: boolean;
  onClose: (type?: UpdateType) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}> = ({ open, onClose, returnFocusRef }) => {
  const dict = useDictionary();
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        onCloseAutoFocus={(focusEvent) => {
          focusEvent.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
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
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}> = ({ open, onClose, returnFocusRef }) => {
  const dict = useDictionary();
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        onCloseAutoFocus={(focusEvent) => {
          focusEvent.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
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
  const eventTriggerRef = useRef<HTMLElement>(null);
  const updateTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const { language } = useSettings();
  const dict = useDictionary();
  const eventDate = format(event.displayStart, "PPP", {
    locale: getLocale(language),
  });
  const eventTriggerLabel = dict.calendar.event.open_event
    .replace("{title}", event.title)
    .replace("{date}", eventDate);
  const { updateEvent, removeEvent } = useCalendar();

  const focusAfterDelete = () => {
    const calendarRoot = document.querySelector<HTMLElement>(
      "[data-calendar-root]",
    );
    const fallbackTarget = calendarRoot ?? eventTriggerRef.current?.parentElement;
    if (!fallbackTarget) return;

    if (!calendarRoot) {
      fallbackTarget.tabIndex = -1;
      fallbackTarget.setAttribute(
        "aria-label",
        dict.calendar.event.delete_focus_target,
      );
    }

    requestAnimationFrame(() => {
      fallbackTarget.focus({ preventScroll: true });
    });
  };

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
    focusAfterDelete();
  };

  const handleRepeatedEventUpdate = (type?: UpdateType) => {
    if (!type) {
      setWaitingUpdateEvent(null);
      setUpdateDialogOpen(false);
      return;
    }
    if (waitingUpdateEvent) updateEvent(waitingUpdateEvent, event, type);
    setWaitingUpdateEvent(null);
    setUpdateDialogOpen(false);
  };

  const trigger = isValidElement(children)
    ? (() => {
        const child = children as ReactElement<any>;
        const isNativeInteractive =
          typeof child.type === "string" &&
          (child.type === "button" || child.type === "a");

        return cloneElement(child, {
          ref: eventTriggerRef,
          className: [
            child.props.className,
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          ]
            .filter(Boolean)
            .join(" "),
          "aria-label": eventTriggerLabel,
          ...(isNativeInteractive
            ? {}
            : {
                role: "button",
                tabIndex: 0,
                onKeyDown: (keyboardEvent: ReactKeyboardEvent<HTMLElement>) => {
                  if (
                    keyboardEvent.key === "Enter" ||
                    keyboardEvent.key === " "
                  ) {
                    keyboardEvent.preventDefault();
                    keyboardEvent.currentTarget.click();
                  }
                },
              }),
        });
      })()
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="p-1">
        <UpdateRepeatedEventDialog
          open={updateDialogOpen}
          onClose={handleRepeatedEventUpdate}
          returnFocusRef={updateTriggerRef}
        />
        <DeleteRepeatedEventDialog
          open={deleteDialogOpen}
          onClose={handleConfirmedRepeatedDelete}
          returnFocusRef={deleteTriggerRef}
        />
        <div className="flex flex-col">
          <div className="flex flex-row justify-end">
            {event.courseId && (
              <DateContributeForm courseId={event.courseId}>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={dict.calendar.event.contribute_date}
                >
                  <CalendarPlus className="w-4 h-4" aria-hidden="true" />
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
                <Button
                  ref={updateTriggerRef}
                  size="icon"
                  variant="ghost"
                  aria-label={dict.calendar.event.edit}
                >
                  <Edit className="w-4 h-4" aria-hidden="true" />
                </Button>
              </AddEventButton>
            )}
            {event.repeat ? (
              <Button
                ref={deleteTriggerRef}
                size="icon"
                variant="ghost"
                aria-label={dict.calendar.event.delete}
                onClick={(_) => setDeleteDialogOpen(true)}
              >
                <Trash className="w-4 h-4" aria-hidden="true" />
              </Button>
            ) : (
              <ConfirmDeleteEvent
                event={event}
                onDeleted={focusAfterDelete}
              />
            )}
            <PopoverClose asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label={dict.calendar.event.close}
              >
                <X className="w-4 h-4" aria-hidden="true" />
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
                <p className="text-sm tabular-nums text-muted-foreground">
                  {format(event.displayStart, "yyyy-M-d", {
                    locale: getLocale(language),
                  })}{" "}-{" "}
                  {format(event.displayEnd, "yyyy-M-d", {
                    locale: getLocale(language),
                  })}
                </p>
              ) : isSameDay(event.start, event.end) ? (
                <p className="text-sm tabular-nums text-muted-foreground">
                  {format(event.displayStart, "yyyy-M-d", {
                    locale: getLocale(language),
                  })}{" "}⋅{" "}
                  {format(event.displayStart, "HH:mm")} -{" "}
                  {format(event.displayEnd, "HH:mm")}
                </p>
              ) : (
                <p className="text-sm tabular-nums text-muted-foreground">
                  {format(event.displayStart, "yyyy-M-d HH:mm", {
                    locale: getLocale(language),
                  })}{" "}-{" "}
                  {format(event.displayEnd, "yyyy-LL-dd HH:mm", {
                    locale: getLocale(language),
                  })}
                </p>
              )}
              {event.location && (
                <p className="text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {event.location}
                </p>
              )}
              {event.details && (
                <p className="text-sm text-muted-foreground">
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
