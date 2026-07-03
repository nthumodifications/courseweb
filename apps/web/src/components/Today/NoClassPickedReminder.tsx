import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { CalendarPlus, ArrowRight } from "lucide-react";
import { useSettings } from "@/hooks/contexts/settings";
import { Button } from "@courseweb/ui";

export const NoClassPickedReminder = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/50 p-4">
      <div className="flex flex-row flex-1 items-center gap-4 justify-between">
        <h3 className="font-medium text-foreground">
          {dict.today.noclass_reminder.reminder}
        </h3>
        <Link to={`/${language}/courses`} className="inline-block">
          <Button variant="outline" size="sm" className="h-7">
            {dict.today.noclass_reminder.courses}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
};
