"use client";
import Link from "next/link";
import useDictionary from "@/dictionaries/useDictionary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const NoClassPickedReminder = () => {
  const dict = useDictionary();
  return (
    <Alert>
      <AlertTitle>{dict.today.noclass_reminder.reminder}</AlertTitle>
      <AlertDescription>
        <ul className="list-decimal list-inside">
          <li className="text-base">
            {dict.today.noclass_reminder.first + " "}
            <Link className="text-[#AF7BE4] font-medium" href="/zh/courses">
              {dict.today.noclass_reminder.courses}
            </Link>{" "}
            {dict.today.noclass_reminder.choose_courses}
          </li>
          <li className="text-base">
            {dict.today.noclass_reminder.then + " "}
            <Link className="text-[#AF7BE4] font-medium" href="/zh/timetable">
              {dict.today.noclass_reminder.timetable}
            </Link>{" "}
            {dict.today.noclass_reminder.check_schedule}
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
};
