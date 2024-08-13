import useDictionary from "@/dictionaries/useDictionary";
import Link from "next/link";
import React from "react";
import { Info, X } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "../ui/button";

const ThemeChangableAlert = () => {
  const [open, setOpen] = useLocalStorage("theme_changable_alert", true);
  const dict = useDictionary();

  if (!open) return <></>;
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>{dict.alerts.TimetableCourseList.text}</AlertTitle>
      <AlertDescription>
        <Link href="/settings">
          <Button
            variant="ghost"
            color="success"
            onClick={() => setOpen(false)}
          >
            {dict.alerts.TimetableCourseList.action}
          </Button>
        </Link>
        <Button variant="ghost" color="success" onClick={() => setOpen(false)}>
          <X />
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default ThemeChangableAlert;
