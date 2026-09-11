import { FC, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@courseweb/ui";
import { toPrettySemester } from "@/helpers/semester";
import { TimetableSyncRequest } from "./calendar.types";
import useDictionary from "@/dictionaries/useDictionary";

const CalendarTimetableSyncDialog: FC<{
  request: TimetableSyncRequest;
  deletionCount: number;
  onSyncAccept: (request: TimetableSyncRequest, accept: boolean) => void;
}> = ({ request, deletionCount, onSyncAccept }) => {
  const [open, setOpen] = useState(true);
  const handledRef = useRef(false);
  const dict = useDictionary();

  useEffect(() => {
    setOpen(true);
    handledRef.current = false;
  }, [request]);

  const handleClose = (accept: boolean) => {
    if (handledRef.current) return;
    handledRef.current = true;
    setOpen(false);
    onSyncAccept(request, accept);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dict.calendar.sync.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dict.calendar.sync.description
              .replace(
                "{reason}",
                request.reason == "new"
                  ? dict.calendar.sync.new_reason
                  : dict.calendar.sync.modified_reason,
              )
              .replace("{semester}", toPrettySemester(request.semester))}
          </AlertDialogDescription>
          {deletionCount > 0 && (
            <AlertDialogDescription>
              {dict.calendar.sync.deletion_warning.replace(
                "{count}",
                String(deletionCount),
              )}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleClose(false)}>
            {dict.calendar.sync.cancel}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => handleClose(true)}>
            {dict.calendar.sync.sync}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CalendarTimetableSyncDialog;
