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
    <div className="mb-4 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 p-4">
      <div className="flex flex-row flex-1 items-center gap-4 justify-between">
        <h3 className="font-medium text-purple-800 dark:text-purple-300">
          {dict.today.noclass_reminder.reminder}
        </h3>
        <Link to={`/${language}/courses`} className="inline-block">
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-800 dark:hover:text-purple-200"
          >
            {dict.today.noclass_reminder.courses}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
};
