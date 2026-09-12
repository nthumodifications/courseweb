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
  PageHeader,
  PageShell,
  Section,
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
import { NavigationSection } from "./NavigationSection";
import { SettingsSidebar } from "./SettingsSidebar";
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
    <PageShell width="app">
      <PageHeader
        title={dict.navigation.settings}
        description={dict.settings.page_description}
      />
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar - Desktop only */}
        <aside className="hidden lg:block w-[180px] shrink-0">
          <div className="sticky top-[--header-height] pt-8">
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
          <div className="flex min-w-0 flex-col gap-6">
            {/* Appearance Settings */}
            <Section
              id="appearance"
              title={dict.settings.appearance.title}
              description={dict.settings.appearance.description}
              variant="card"
            >
              <ThemeSection />
            </Section>

            {/* Display Settings */}
            <Section
              id="display"
              title={dict.settings.display.title}
              description={dict.settings.display.description}
              variant="card"
            >
              <SettingItem
                title={dict.settings.display.dark_mode.title}
                description={dict.settings.display.dark_mode.description}
                control={
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                }
              />

              <SettingItem
                title={dict.settings.display.language.title}
                description={dict.settings.display.language.description}
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
                description={dict.settings.display.compact_header.description}
                control={
                  <Switch
                    checked={compactHeader}
                    onCheckedChange={toggleCompactHeader}
                  />
                }
              />

              <Section
                title={dict.settings.navigation.title}
                description={dict.settings.navigation.description}
              >
                <NavigationSection />
              </Section>
            </Section>

            {/* Calendar Settings */}
            <Section
              id="calendar"
              title={dict.settings.calendar.title}
              description={dict.settings.calendar.description}
              variant="card"
            >
              <SettingItem
                title={dict.settings.calendar.academic_calendar.title}
                description={
                  dict.settings.calendar.academic_calendar.description
                }
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
                description={
                  dict.settings.calendar.experimental_calendar.description
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

              {useWidgetDashboard && (
                <div>
                  <Section
                    title={dict.settings.calendar.widget_dashboard.customize}
                    description={
                      dict.settings.calendar.widget_dashboard
                        .customize_description
                    }
                  >
                    <WidgetSection />
                  </Section>
                </div>
              )}
            </Section>

            {/* Timetable Settings */}
            <Section
              id="timetable"
              title={dict.settings.timetable.title}
              description={dict.settings.timetable.description}
              variant="card"
            >
              <div className="flex flex-col gap-6">
                <div className="overflow-x-auto">
                  <TimetablePreview />
                </div>
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
                <SettingItem
                  title={dict.settings.timetable.theme.title}
                  description={dict.settings.timetable.theme.description}
                  control={<TimetableThemeList />}
                />
                <TimetablePreferences
                  settings={preferences}
                  onSettingsChange={setPreferences}
                />
              </div>
            </Section>

            {/* AI Settings */}
            <Section
              id="ai"
              title={dict.settings.ai.title}
              description={dict.settings.ai.description}
              variant="card"
            >
              <AIPreferencesPanel />
            </Section>

            {/* Privacy Settings */}
            <Section
              id="privacy"
              title={dict.settings.privacy.title}
              description={dict.settings.privacy.description}
              variant="card"
            >
              <SettingItem
                title={dict.settings.privacy.analytics.title}
                description={dict.settings.privacy.analytics.description}
                control={
                  <Switch checked={analytics} onCheckedChange={setAnalytics} />
                }
              />
            </Section>

            {/* Advanced Settings */}
            <Section
              id="advanced"
              title={dict.settings.advanced.title}
              description={dict.settings.advanced.description}
              variant="card"
            >
              <SettingItem
                title={dict.settings.advanced.custom_css.title}
                description={dict.settings.advanced.custom_css.description}
                control={
                  <textarea
                    value={customCSS}
                    onChange={(event) => setCustomCSS(event.target.value)}
                    placeholder={dict.settings.advanced.custom_css.placeholder}
                    className="h-40 w-full resize-y rounded-md border border-border bg-muted p-3 font-mono text-xs outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    spellCheck={false}
                  />
                }
              />
            </Section>

            <Footer />
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default SettingsPage;
