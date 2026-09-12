import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { ArrowRight } from "lucide-react";
import { useSettings } from "@/hooks/contexts/settings";
import { Button, Section } from "@courseweb/ui";

export const NoClassPickedReminder = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <Section
      title={dict.today.noclass_reminder.reminder}
      variant="card"
      actions={
        <Link to={`/${language}/courses`} className="inline-block">
          <Button variant="outline" size="sm">
            {dict.today.noclass_reminder.courses}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      }
    />
  );
};
