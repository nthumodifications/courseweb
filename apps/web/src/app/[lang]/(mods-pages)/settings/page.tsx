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
        title: "Advanced",
        icon: <LayoutGrid className="h-5 w-5" />,
      },
    ],
    [dict],
  );

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-6 px-4 sm:px-6">
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
        <div className="flex-1 min-w-0 pb-8">
          <div className="flex flex-col gap-6 min-w-0">
            {/* Appearance Settings */}
            <SettingsSection
              id="appearance"
              title={dict.settings.appearance.title}
              description={dict.settings.appearance.description}
            >
              <ThemeSection />
            </SettingsSection>

            {/* Display Settings */}
            <SettingsSection
              id="display"
              title={dict.settings.display.title}
              description={dict.settings.display.description}
            >
              <SettingItem
                title={dict.settings.display.dark_mode.title}
                description=""
                control={
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                }
              />

              <SettingItem
                title={dict.settings.display.language.title}
                description=""
                control={
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
                }
              />

              <SettingItem
                title="Compact Header / 精簡標頭"
                description="Reduce the height of the top header bar"
                control={
                  <Switch
                    checked={compactHeader}
                    onCheckedChange={toggleCompactHeader}
                  />
                }
              />

              <div>
                <label className="text-sm font-medium block mb-2">
                  Bottom Navigation / 底部導航
                </label>
                <BottomNavSection />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">
                  Sidebar Navigation / 側邊導航
                </label>
                <SidebarNavSection />
              </div>
            </SettingsSection>

            {/* Calendar Settings */}
            <SettingsSection
              id="calendar"
              title={dict.settings.calendar.title}
              description={dict.settings.calendar.description}
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
                      className="bg-nthu-500/10 text-nthu-600 border-nthu-500/20"
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
                title="Widget Dashboard"
                description="Replace Today page with a customizable widget grid"
                control={
                  <Switch
                    checked={useWidgetDashboard}
                    onCheckedChange={setUseWidgetDashboard}
                  />
                }
              />

              {useWidgetDashboard && (
                <div>
                  <p className="text-sm font-medium mb-3 mt-2 text-muted-foreground">
                    Customize widgets:
                  </p>
                  <WidgetSection />
                </div>
              )}
            </SettingsSection>

            {/* Timetable Settings */}
            <SettingsSection
              id="timetable"
              title={dict.settings.timetable.title}
              description={dict.settings.timetable.description}
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
                control={
                  <Switch checked={analytics} onCheckedChange={setAnalytics} />
                }
              />
            </SettingsSection>

            {/* Advanced Settings */}
            <SettingsSection
              id="advanced"
              title="Advanced"
              description="Custom CSS, Developer Options"
            >
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Custom CSS</label>
                <p className="text-xs text-muted-foreground">
                  Inject custom CSS into the page. Applied globally after all
                  other styles.
                </p>
                <textarea
                  value={customCSS}
                  onChange={(e) => setCustomCSS(e.target.value)}
                  placeholder={
                    "/* Your custom CSS here */\n.example { color: red; }"
                  }
                  className="w-full h-40 p-3 text-xs font-mono bg-muted rounded-lg border border-border outline-none resize-y focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  spellCheck={false}
                />
              </div>
            </SettingsSection>

            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
