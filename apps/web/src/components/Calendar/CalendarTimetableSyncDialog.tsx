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

const CalendarTimetableSyncDialog: FC<{
  request: TimetableSyncRequest;
  onSyncAccept: (request: TimetableSyncRequest, accept: boolean) => void;
}> = ({ request, onSyncAccept }) => {
  const [open, setOpen] = useState(true);
  const handledRef = useRef(false);

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
          <AlertDialogTitle>Timetable Update Found!</AlertDialogTitle>
          <AlertDialogDescription>
            {request.reason == "new" ? "New" : "Modified"} courses found in
            Semester {toPrettySemester(request.semester)}&apos;s Timetable. Do
            you want to sync the changes?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleClose(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => handleClose(true)}>
            Sync
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CalendarTimetableSyncDialog;
