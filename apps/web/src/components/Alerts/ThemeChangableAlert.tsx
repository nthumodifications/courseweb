import useDictionary from "@/dictionaries/useDictionary";
import { Link, useParams } from "react-router-dom";
import React from "react";
import { Info, X } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import { Alert, AlertDescription, AlertTitle } from "@courseweb/ui";
import { Button } from "@courseweb/ui";

const ThemeChangableAlert = () => {
  const [open, setOpen] = useLocalStorage("theme_changable_alert", true);
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();

  if (!open) return <></>;
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>{dict.alerts.TimetableCourseList.text}</AlertTitle>
      <AlertDescription>
        <Link to={`/${lang}/settings`}>
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
