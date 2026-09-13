"use client";

import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import { useTheme } from "@/hooks/contexts/theme";
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
import { ThemeSection } from "./ThemeSection";
import { WidgetSection } from "./WidgetSection";
import { BottomNavSection } from "./BottomNavSection";
import { SidebarNavSection } from "./SidebarNavSection";
import { SettingsSidebar } from "./SettingsSidebar";
import { SettingsSection } from "./SettingsSection";
import { SettingItem } from "./SettingItem";
import { MobileQuickNav } from "./MobileQuickNav";
import { useScrollTracking } from "./useScrollTracking";
import {
  Monitor,
  Calendar,
  LayoutGrid,
  Sparkles,
  Shield,
  Palette,
} from "lucide-react";
import { useMemo } from "react";

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
  const { compactHeader, toggleCompactHeader } = useTheme();
  const { preferences, setPreferences } = useUserTimetable();
  const [useNewCalendar, setUseNewCalendar] = useLocalStorage(
    "use_new_calendar",
    false,
  );
  const [useWidgetDashboard, setUseWidgetDashboard] = useLocalStorage(
    "use_widget_dashboard",
    false,
  );
  const [customCSS, setCustomCSS] = useLocalStorage("custom_css", "");
  const [timetableVertical, setTimetableVertical] = useLocalStorage(
    "timetable_vertical",
    true,
  );
  const dict = useDictionary();

  const sectionIds = useMemo(
    () => [
      "appearance",
      "display",
      "calendar",
      "timetable",
      "ai",
      "privacy",
      "advanced",
    ],
    [],
  );
  const { activeSection, scrollToSection } = useScrollTracking(sectionIds);

  const handleUseNewCalendar = (v: boolean) => {
    setUseNewCalendar(v);
    event({
      action: "use_new_calendar",
      category: "settings",
      label: "calendar_" + (v ? "on" : "off"),
    });
  };

  const sections = useMemo(
    () => [
      {
        id: "appearance",
        title: dict.settings.appearance.title,
        icon: <Palette className="h-5 w-5" />,
      },
      {
        id: "display",
        title: dict.settings.display.title,
        icon: <Monitor className="h-5 w-5" />,
      },
      {
        id: "calendar",
        title: dict.settings.calendar.title,
        icon: <Calendar className="h-5 w-5" />,
      },
      {
        id: "timetable",
        title: dict.settings.timetable.title,
        icon: <LayoutGrid className="h-5 w-5" />,
      },
      {
        id: "ai",
        title: dict.settings.ai.title,
        icon: <Sparkles className="h-5 w-5" />,
      },
      {
        id: "privacy",
        title: dict.settings.privacy.title,
        icon: <Shield className="h-5 w-5" />,
      },
      {
        id: "advanced",
        title: dict.settings.advanced.title,
        icon: <LayoutGrid className="h-5 w-5" />,
      },
    ],
    [dict],
  );

  return (
    <div className="flex flex-col px-4 md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Sidebar - Desktop only */}
        <aside className="hidden lg:block w-[180px] shrink-0">
          <div className="sticky top-[--header-height] pt-4">
            <SettingsSidebar
              sections={sections}
              activeSection={activeSection}
              onSectionClick={scrollToSection}
            />
          </div>
        </aside>

        {/* Mobile Quick Nav */}
        <div className="lg:hidden">
          <MobileQuickNav
            sections={sections}
            activeSection={activeSection}
            onSectionClick={scrollToSection}
          />
        </div>

        {/* Main Content */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col gap-4">
            {/* Appearance Settings */}
            <SettingsSection
              id="appearance"
              title={dict.settings.appearance.title}
            >
              <ThemeSection />
            </SettingsSection>

            {/* Display Settings */}
            <SettingsSection id="display" title={dict.settings.display.title}>
              <SettingItem
                title={dict.settings.display.dark_mode.title}
                control={
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                }
              />

              <SettingItem
                title={dict.settings.display.language.title}
                control={
                  <Select
                    value={language}
                    onValueChange={(v) => setLanguage(v as Language)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue
                        placeholder={dict.settings.display.language.title}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">
                        {dict.settings.timetable.language_options.zh}
                      </SelectItem>
                      <SelectItem value="en">
                        {dict.settings.timetable.language_options.en}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                }
              />

              <SettingItem
                title={dict.settings.display.compact_header.title}
                control={
                  <Switch
                    checked={compactHeader}
                    onCheckedChange={toggleCompactHeader}
                  />
                }
              />

              <div className="py-4">
                <h3 className="mb-2 text-sm font-bold">
                  {dict.settings.display.bottom_nav.title}
                </h3>
                <BottomNavSection />
              </div>

              <div className="py-4">
                <h3 className="mb-2 text-sm font-bold">
                  {dict.settings.display.sidebar_nav.title}
                </h3>
                <SidebarNavSection />
              </div>
            </SettingsSection>

            {/* Calendar Settings */}
            <SettingsSection id="calendar" title={dict.settings.calendar.title}>
              <SettingItem
                title={dict.settings.calendar.academic_calendar.title}
                control={
                  <Switch
                    checked={showAcademicCalendar}
                    onCheckedChange={setShowAcademicCalendar}
                  />
                }
              />

              <SettingItem
                title={
                  <div className="flex items-center gap-2">
                    {dict.settings.calendar.experimental_calendar.title}
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/20"
                    >
                      {dict.settings.calendar.experimental_calendar.badge}
                    </Badge>
                  </div>
                }
                control={
                  <Switch
                    checked={useNewCalendar}
                    onCheckedChange={handleUseNewCalendar}
                  />
                }
              />

              <SettingItem
                title={dict.settings.calendar.widget_dashboard.title}
                description={
                  dict.settings.calendar.widget_dashboard.description
                }
                control={
                  <Switch
                    checked={useWidgetDashboard}
                    onCheckedChange={setUseWidgetDashboard}
                  />
                }
              />

              {useWidgetDashboard && <WidgetSection />}
            </SettingsSection>

            {/* Timetable Settings */}
            <SettingsSection
              id="timetable"
              title={dict.settings.timetable.title}
            >
              <TimetablePreview />
              <SettingItem
                title={dict.settings.timetable.default_view.title}
                description={dict.settings.timetable.default_view.description}
                control={
                  <Switch
                    checked={timetableVertical}
                    onCheckedChange={setTimetableVertical}
                  />
                }
              />
              <TimetableThemeList />
              <TimetablePreferences
                settings={preferences}
                onSettingsChange={setPreferences}
              />
            </SettingsSection>

            {/* AI Settings */}
            <SettingsSection id="ai" title={dict.settings.ai.title}>
              <AIPreferencesPanel />
            </SettingsSection>

            {/* Privacy Settings */}
            <SettingsSection id="privacy" title={dict.settings.privacy.title}>
              <SettingItem
                title={dict.settings.privacy.analytics.title}
                description={dict.settings.privacy.analytics.description}
                control={
                  <Switch checked={analytics} onCheckedChange={setAnalytics} />
                }
              />
            </SettingsSection>

            {/* Advanced Settings */}
            <SettingsSection id="advanced" title={dict.settings.advanced.title}>
              <SettingItem
                title={dict.settings.advanced.custom_css.title}
                description={dict.settings.advanced.custom_css.description}
                control={
                  <textarea
                    value={customCSS}
                    onChange={(e) => setCustomCSS(e.target.value)}
                    placeholder={dict.settings.advanced.custom_css.placeholder}
                    className="h-40 w-[min(60vw,480px)] resize-y rounded-md border border-border bg-muted p-4 font-mono text-xs outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    spellCheck={false}
                  />
                }
              />
            </SettingsSection>

            <div className="h-6" />
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
