import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import { TimetableThemeList } from "./TimetableThemeList";
import TimetablePreview from "./TimetablePreview";
import { Separator } from "@courseweb/ui";
import { Switch } from "@courseweb/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { Language } from "@/types/settings";
import Footer from "@/components/Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@courseweb/ui";
import TimetablePreferences from "./TimetablePreferences";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useLocalStorage } from "usehooks-ts";
import { Badge } from "@courseweb/ui";
import { event } from "@/lib/gtag";
import { AIPreferencesPanel } from "./AIPreferences";

const DisplaySettingsCard = () => {
  const { darkMode, setDarkMode, language, setLanguage } = useSettings();
  const dict = useDictionary();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.display.title}</CardTitle>
        <CardDescription>{dict.settings.display.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row gap-4 py-4 items-center" id="darkmode">
          <div className="flex flex-col flex-1 gap-1">
            <h2 className="font-semibold text-base">
              {dict.settings.display.dark_mode.title}
            </h2>
          </div>
          <div className="flex items-center">
            <Switch
              checked={darkMode}
              defaultChecked={darkMode}
              onCheckedChange={(e) => setDarkMode(e)}
            />
          </div>
        </div>
        <Separator orientation="horizontal" />
        <div className="flex flex-row gap-4 py-4 items-center" id="language">
          <div className="flex flex-col flex-1 gap-1">
            <h2 className="font-semibold text-base">
              {dict.settings.display.language.title}
            </h2>
          </div>
          <div className="flex items-center">
            <Select
              defaultValue={language}
              value={language}
              onValueChange={(v) => setLanguage(v as Language)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">繁體中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TimetableSettingsCard = () => {
  const { preferences, setPreferences } = useUserTimetable();
  const dict = useDictionary();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.timetable.title}</CardTitle>
        <CardDescription>{dict.settings.timetable.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 py-4" id="theme">
          <TimetablePreview />
          <TimetableThemeList />
          <TimetablePreferences
            settings={preferences}
            onSettingsChange={setPreferences}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const CalendarSettingsCard = () => {
  const [useNewCalendar, setUseNewCalendar] = useLocalStorage(
    "use_new_calendar",
    false,
  );
  const { showAcademicCalendar, setShowAcademicCalendar } = useSettings();
  const dict = useDictionary();

  const handleUseNewCalendar = (v: boolean) => {
    setUseNewCalendar(v);
    event({
      action: "use_new_calendar",
      category: "settings",
      label: "calendar_" + v ? "on" : "off",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.calendar.title}</CardTitle>
        <CardDescription>{dict.settings.calendar.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row gap-4 py-4" id="calendar">
          <div className="flex flex-col flex-1 gap-1">
            <h2 className="font-semibold text-base">
              {dict.settings.calendar.academic_calendar.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {dict.settings.calendar.academic_calendar.description}
            </p>
          </div>
          <div className="flex items-center">
            <Switch
              checked={showAcademicCalendar}
              onCheckedChange={setShowAcademicCalendar}
            />
          </div>
        </div>
        <div className="flex flex-row gap-4 py-4" id="calendar">
          <div className="flex flex-col flex-1 gap-1">
            <h2 className="font-semibold text-base">
              {dict.settings.calendar.experimental_calendar.title}{" "}
              <Badge variant="outline">
                {dict.settings.calendar.experimental_calendar.badge}
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              {dict.settings.calendar.experimental_calendar.description}
            </p>
          </div>
          <div className="flex items-center">
            <Switch
              checked={useNewCalendar}
              defaultChecked={useNewCalendar}
              onCheckedChange={handleUseNewCalendar}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PrivacySettingsCard = () => {
  const { analytics, setAnalytics } = useSettings();
  const dict = useDictionary();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.privacy.title}</CardTitle>
        <CardDescription>{dict.settings.privacy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row gap-4 py-4" id="privacy">
          <div className="flex flex-col flex-1 gap-1">
            <h2 className="font-semibold text-base">
              {dict.settings.privacy.analytics.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {dict.settings.privacy.analytics.description}
            </p>
          </div>
          <div className="flex flex-col justify-center items-center space-y-2">
            <Switch
              checked={analytics}
              defaultChecked={analytics}
              onCheckedChange={(e) => setAnalytics(e)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AISettingsCard = () => {
  const dict = useDictionary();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.ai.title}</CardTitle>
        <CardDescription>{dict.settings.ai.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <AIPreferencesPanel />
      </CardContent>
    </Card>
  );
};

const SettingsPage = () => {
  return (
    <div className="flex flex-col max-w-2xl px-4 gap-4">
      <DisplaySettingsCard />
      <CalendarSettingsCard />
      <TimetableSettingsCard />
      <AISettingsCard />
      <PrivacySettingsCard />
      <Footer />
    </div>
  );
};

export default SettingsPage;
