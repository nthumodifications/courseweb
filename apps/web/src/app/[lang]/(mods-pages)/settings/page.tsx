"use client";

import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import { TimetableThemeList } from "./TimetableThemeList";
import TimetablePreview from "./TimetablePreview";
import {
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from "@courseweb/ui";
import { Language } from "@/types/settings";
import Footer from "@/components/Footer";
import TimetablePreferences from "./TimetablePreferences";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useLocalStorage } from "usehooks-ts";
import { event } from "@/lib/gtag";
import { AIPreferencesPanel } from "./AIPreferences";
import { SettingsSidebar } from "./SettingsSidebar";
import { SettingsSection } from "./SettingsSection";
import { SettingItem } from "./SettingItem";
import { MobileQuickNav } from "./MobileQuickNav";
import { useScrollTracking } from "./useScrollTracking";

const SettingsPage = () => {
  const {
    darkMode,
    setDarkMode,
    language,
    setLanguage,
    showAcademicCalendar,
    setShowAcademicCalendar,
    analytics,
    setAnalytics,
  } = useSettings();
  const { preferences, setPreferences } = useUserTimetable();
  const [useNewCalendar, setUseNewCalendar] = useLocalStorage(
    "use_new_calendar",
    false,
  );
  const dict = useDictionary();

  const sectionIds = ["display", "calendar", "timetable", "ai", "privacy"];
  const { activeSection, scrollToSection } = useScrollTracking(sectionIds);

  const handleUseNewCalendar = (v: boolean) => {
    setUseNewCalendar(v);
    event({
      action: "use_new_calendar",
      category: "settings",
      label: "calendar_" + (v ? "on" : "off"),
    });
  };

  const sections = [
    {
      id: "display",
      title: dict.settings.display.title,
      icon: "Display",
    },
    {
      id: "calendar",
      title: dict.settings.calendar.title,
      icon: "Calendar",
    },
    {
      id: "timetable",
      title: dict.settings.timetable.title,
      icon: "Table",
    },
    {
      id: "ai",
      title: dict.settings.ai.title,
      icon: "Sparkles",
    },
    {
      id: "privacy",
      title: dict.settings.privacy.title,
      icon: "Shield",
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto px-4">
      {/* Sidebar - Desktop only */}
      <div className="hidden lg:block w-[200px] shrink-0">
        <SettingsSidebar
          sections={sections}
          activeSection={activeSection}
          onSectionClick={scrollToSection}
        />
      </div>

      {/* Mobile Quick Nav */}
      <div className="lg:hidden">
        <MobileQuickNav
          sections={sections}
          activeSection={activeSection}
          onSectionClick={scrollToSection}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-8 pb-8">
        {/* Display Settings */}
        <SettingsSection
          id="display"
          title={dict.settings.display.title}
          description={dict.settings.display.description}
        >
          <SettingItem
            title={dict.settings.display.dark_mode.title}
            description=""
          >
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </SettingItem>

          <SettingItem
            title={dict.settings.display.language.title}
            description=""
          >
            <Select
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
          </SettingItem>
        </SettingsSection>

        {/* Calendar Settings */}
        <SettingsSection
          id="calendar"
          title={dict.settings.calendar.title}
          description={dict.settings.calendar.description}
        >
          <SettingItem
            title={dict.settings.calendar.academic_calendar.title}
            description={dict.settings.calendar.academic_calendar.description}
          >
            <Switch
              checked={showAcademicCalendar}
              onCheckedChange={setShowAcademicCalendar}
            />
          </SettingItem>

          <SettingItem
            title={
              <div className="flex items-center gap-2">
                {dict.settings.calendar.experimental_calendar.title}
                <Badge
                  variant="outline"
                  className="bg-nthu-purple/10 text-nthu-purple border-nthu-purple/20"
                >
                  {dict.settings.calendar.experimental_calendar.badge}
                </Badge>
              </div>
            }
            description={
              dict.settings.calendar.experimental_calendar.description
            }
          >
            <Switch
              checked={useNewCalendar}
              onCheckedChange={handleUseNewCalendar}
            />
          </SettingItem>
        </SettingsSection>

        {/* Timetable Settings */}
        <SettingsSection
          id="timetable"
          title={dict.settings.timetable.title}
          description={dict.settings.timetable.description}
        >
          <div className="flex flex-col gap-6">
            <TimetablePreview />
            <TimetableThemeList />
            <TimetablePreferences
              settings={preferences}
              onSettingsChange={setPreferences}
            />
          </div>
        </SettingsSection>

        {/* AI Settings */}
        <SettingsSection
          id="ai"
          title={dict.settings.ai.title}
          description={dict.settings.ai.description}
        >
          <AIPreferencesPanel />
        </SettingsSection>

        {/* Privacy Settings */}
        <SettingsSection
          id="privacy"
          title={dict.settings.privacy.title}
          description={dict.settings.privacy.description}
        >
          <SettingItem
            title={dict.settings.privacy.analytics.title}
            description={dict.settings.privacy.analytics.description}
          >
            <Switch checked={analytics} onCheckedChange={setAnalytics} />
          </SettingItem>
        </SettingsSection>

        <Footer />
      </div>
    </div>
  );
};

export default SettingsPage;
