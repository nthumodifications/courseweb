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
    <Alert className="border-info/40 bg-info/10 text-info [&>svg]:text-info">
      <Info className="h-4 w-4" />
      <AlertTitle>{dict.alerts.TimetableCourseList.text}</AlertTitle>
      <AlertDescription>
        <Button
          asChild
          variant="ghost"
          className="text-info hover:bg-info/10 hover:text-info"
        >
          <Link to={`/${lang}/settings`} onClick={() => setOpen(false)}>
            {dict.alerts.TimetableCourseList.action}
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="text-info hover:bg-info/10 hover:text-info"
          onClick={() => setOpen(false)}
          aria-label={dict.alerts.dismiss}
        >
          <X aria-hidden="true" />
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default ThemeChangableAlert;
