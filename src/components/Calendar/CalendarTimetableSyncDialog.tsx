import { FC, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toPrettySemester } from "@/helpers/semester";
import { TimetableSyncRequest } from "./calendar.types";

const CalendarTimetableSyncDialog: FC<{
  request: TimetableSyncRequest;
  onSyncAccept: (request: TimetableSyncRequest, accept: boolean) => void;
}> = ({ request, onSyncAccept }) => {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    setOpen(true);
  }, [request]);

  const handleUserClose = () => {
    if (open) {
      setOpen(false);
      onSyncAccept(request, false);
    }
  };

  const handleUserSync = () => {
    setOpen(false);
    onSyncAccept(request, true);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
          <AlertDialogCancel onClick={handleUserClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleUserSync}>Sync</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CalendarTimetableSyncDialog;
