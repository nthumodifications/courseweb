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
import { AccountSection } from "./AccountSection";
import {
  SettingsSearchBar,
  SettingsSearchEmptyState,
  SettingsSearchableBlock,
  SettingsSearchProvider,
} from "./settingsSearch";
import {
  Monitor,
  Calendar,
  LayoutGrid,
  Sparkles,
  Shield,
  Palette,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const dict = useDictionary();
  const pendingSectionRef = useRef<string | null>(null);

  const sectionIds = useMemo(
    () => [
      "appearance",
      "display",
      "calendar",
      "timetable",
      "ai",
      "account",
      "privacy",
      "advanced",
    ],
    [],
  );
  const settingIds = useMemo(
    () => [
      "setting-dark-mode",
      "setting-language",
      "setting-compact-header",
      "setting-academic-calendar",
      "setting-experimental-calendar",
      "setting-widget-dashboard",
      "setting-default-view",
      "setting-ai-department",
      "setting-ai-entrance-year",
      "setting-ai-api-key",
      "setting-ai-api-key-value",
      "setting-account",
      "setting-sync-status",
      "setting-restore-backup",
      "setting-analytics",
      "setting-custom-css",
    ],
    [],
  );
  const { activeSection, scrollToSection } = useScrollTracking(
    sectionIds,
    settingIds,
    searchQuery,
  );

  const handleSectionClick = useCallback(
    (id: string) => {
      if (searchQuery.trim()) {
        pendingSectionRef.current = id;
        setSearchQuery("");
        return;
      }

      scrollToSection(id);
    },
    [searchQuery, scrollToSection],
  );

  useEffect(() => {
    const pendingSection = pendingSectionRef.current;
    if (!searchQuery.trim() && pendingSection) {
      pendingSectionRef.current = null;
      scrollToSection(pendingSection);
    }
  }, [searchQuery, scrollToSection]);

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
        id: "account",
        title: dict.settings.account.title,
        icon: <UserRound className="h-5 w-5" />,
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

  const appearanceSearchKeywords = [
    dict.settings.appearance.preset.title,
    ...Object.values(dict.settings.appearance.preset.themes),
    dict.settings.appearance.font.title,
    dict.settings.appearance.font.chinese,
    dict.settings.appearance.font.latin,
    ...Object.values(dict.settings.appearance.font.options),
    dict.settings.appearance.radius.title,
    ...Object.values(dict.settings.appearance.radius.options),
    dict.settings.appearance.font_scale.title,
    dict.settings.appearance.font_scale.small,
    dict.settings.appearance.font_scale.large,
    dict.settings.appearance.density.title,
    dict.settings.appearance.density.compact,
    dict.settings.appearance.density.comfortable,
    dict.settings.appearance.density.spacious,
    dict.settings.appearance.background.title,
    dict.settings.appearance.background.from,
    dict.settings.appearance.background.to,
    dict.settings.appearance.background.solid,
    dict.settings.appearance.background.gradient,
    dict.settings.appearance.background.dots,
    dict.settings.appearance.background.lines,
    dict.settings.appearance.background.noise,
    dict.settings.appearance.accent.title,
    dict.settings.appearance.accent.description,
    dict.settings.appearance.accent.pick,
    dict.settings.appearance.share_theme,
    dict.settings.appearance.reset,
  ];
  const navigationSearchKeywords = [
    dict.settings.display.bottom_nav.title,
    dict.settings.display.sidebar_nav.title,
    dict.navigation.today,
    dict.navigation.timetable,
    dict.navigation.bus,
    dict.navigation.apps,
    dict.navigation.settings,
  ];
  const widgetSearchKeywords = [
    dict.settings.calendar.widget_dashboard.columns,
    dict.settings.calendar.widget_dashboard.widgets,
    ...Object.values(
      dict.settings.calendar.widget_dashboard.widget_options,
    ).map((widget) => widget.title),
  ];
  const timetablePreferencesSearchKeywords = [
    dict.settings.timetable.language,
    ...Object.values(dict.settings.timetable.language_options),
    dict.settings.timetable.font_size,
    ...Object.values(dict.settings.timetable.font_size_options),
    dict.settings.timetable.font_family,
    ...Object.values(dict.settings.timetable.font_family_options),
    dict.settings.timetable.alignment,
    ...Object.values(dict.settings.timetable.align),
    dict.settings.timetable.fields_order,
    dict.settings.timetable.slot_title,
    dict.settings.timetable.slot_code,
    dict.settings.timetable.slot_time,
    dict.settings.timetable.slot_venue,
    dict.settings.timetable.slot_teacher,
    dict.settings.timetable.slot_credits,
    dict.settings.timetable.move_up,
    dict.settings.timetable.move_down,
  ];
  const aiSearchKeywords = [
    dict.settings.ai.profile.title,
    dict.settings.ai.profile.description,
    dict.settings.ai.profile.department.label,
    dict.settings.ai.profile.department.placeholder,
    dict.settings.ai.profile.entrance_year.label,
    dict.settings.ai.profile.entrance_year.placeholder,
    dict.settings.ai.api_key.title,
    dict.settings.ai.api_key.description,
    dict.settings.ai.api_key.label,
    dict.settings.ai.api_key.placeholder,
    dict.settings.ai.api_key.get_key,
    dict.settings.ai.api_key.free_tier,
    dict.settings.ai.api_key.test,
    dict.settings.ai.api_key.testing,
    dict.settings.ai.save,
  ];

  return (
    <SettingsSearchProvider query={searchQuery}>
      <div className="flex flex-col px-4 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Sidebar - Desktop only */}
          <aside className="hidden lg:block w-[180px] shrink-0">
            <div className="sticky top-[--header-height] pt-4">
              <SettingsSidebar
                sections={sections}
                activeSection={activeSection}
                onSectionClick={handleSectionClick}
              />
            </div>
          </aside>

          {/* Mobile Quick Nav */}
          <div className="lg:hidden">
            <MobileQuickNav
              sections={sections}
              activeSection={activeSection}
              onSectionClick={handleSectionClick}
            />
          </div>

          {/* Main Content */}
          <div className="min-w-0 flex-1">
            <SettingsSearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
            />
            <div className="settings-search-results flex min-w-0 flex-col gap-4">
              {/* Appearance Settings */}
              <SettingsSection
                id="appearance"
                title={dict.settings.appearance.title}
              >
                <SettingsSearchableBlock keywords={appearanceSearchKeywords}>
                  <ThemeSection />
                </SettingsSearchableBlock>
              </SettingsSection>

              {/* Display Settings */}
              <SettingsSection id="display" title={dict.settings.display.title}>
                <SettingItem
                  id="setting-dark-mode"
                  title={dict.settings.display.dark_mode.title}
                  searchKeywords={[
                    dict.settings.appearance.title,
                    dict.settings.appearance.preset.title,
                  ]}
                  control={
                    <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  }
                />

                <SettingItem
                  id="setting-language"
                  title={dict.settings.display.language.title}
                  searchKeywords={Object.values(
                    dict.settings.display.language_options,
                  )}
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
                          {dict.settings.display.language_options.zh}
                        </SelectItem>
                        <SelectItem value="en">
                          {dict.settings.display.language_options.en}
                        </SelectItem>
                        <SelectItem value="zh-cn">
                          {dict.settings.display.language_options.zh_cn}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  }
                />

                <SettingItem
                  id="setting-compact-header"
                  title={dict.settings.display.compact_header.title}
                  control={
                    <Switch
                      checked={compactHeader}
                      onCheckedChange={toggleCompactHeader}
                    />
                  }
                />

                <SettingsSearchableBlock keywords={navigationSearchKeywords}>
                  <div className="py-4">
                    <h3 className="mb-2 text-sm font-bold">
                      {dict.settings.display.bottom_nav.title}
                    </h3>
                    <BottomNavSection />
                  </div>
                </SettingsSearchableBlock>

                <SettingsSearchableBlock keywords={navigationSearchKeywords}>
                  <div className="py-4">
                    <h3 className="mb-2 text-sm font-bold">
                      {dict.settings.display.sidebar_nav.title}
                    </h3>
                    <SidebarNavSection />
                  </div>
                </SettingsSearchableBlock>
              </SettingsSection>

              {/* Calendar Settings */}
              <SettingsSection
                id="calendar"
                title={dict.settings.calendar.title}
              >
                <SettingItem
                  id="setting-academic-calendar"
                  title={dict.settings.calendar.academic_calendar.title}
                  control={
                    <Switch
                      checked={showAcademicCalendar}
                      onCheckedChange={setShowAcademicCalendar}
                    />
                  }
                />

                <SettingItem
                  id="setting-experimental-calendar"
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
                  id="setting-widget-dashboard"
                  title={dict.settings.calendar.widget_dashboard.title}
                  description={
                    dict.settings.calendar.widget_dashboard.description
                  }
                  searchKeywords={Object.values(
                    dict.settings.calendar.widget_dashboard.widget_options,
                  ).map((widget) => widget.title)}
                  control={
                    <Switch
                      checked={useWidgetDashboard}
                      onCheckedChange={setUseWidgetDashboard}
                    />
                  }
                />

                {useWidgetDashboard && (
                  <SettingsSearchableBlock keywords={widgetSearchKeywords}>
                    <WidgetSection />
                  </SettingsSearchableBlock>
                )}
              </SettingsSection>

              {/* Timetable Settings */}
              <SettingsSection
                id="timetable"
                title={dict.settings.timetable.title}
              >
                <SettingsSearchableBlock
                  keywords={[dict.settings.timetable.vertical_preview]}
                >
                  <TimetablePreview />
                </SettingsSearchableBlock>
                <SettingItem
                  id="setting-default-view"
                  title={dict.settings.timetable.default_view.title}
                  description={dict.settings.timetable.default_view.description}
                  control={
                    <Switch
                      checked={timetableVertical}
                      onCheckedChange={setTimetableVertical}
                    />
                  }
                />
                <SettingsSearchableBlock
                  keywords={Object.values(
                    dict.settings.timetable.theme.options,
                  ).concat(dict.settings.timetable.theme.title)}
                >
                  <TimetableThemeList />
                </SettingsSearchableBlock>
                <SettingsSearchableBlock
                  keywords={timetablePreferencesSearchKeywords}
                >
                  <TimetablePreferences
                    settings={preferences}
                    onSettingsChange={setPreferences}
                  />
                </SettingsSearchableBlock>
              </SettingsSection>

              {/* AI Settings */}
              <SettingsSection id="ai" title={dict.settings.ai.title}>
                <SettingsSearchableBlock keywords={aiSearchKeywords}>
                  <AIPreferencesPanel />
                </SettingsSearchableBlock>
              </SettingsSection>

              {/* Account Settings */}
              <AccountSection />

              {/* Privacy Settings */}
              <SettingsSection id="privacy" title={dict.settings.privacy.title}>
                <SettingItem
                  id="setting-analytics"
                  title={dict.settings.privacy.analytics.title}
                  description={dict.settings.privacy.analytics.description}
                  control={
                    <Switch
                      checked={analytics}
                      onCheckedChange={setAnalytics}
                    />
                  }
                />
              </SettingsSection>

              {/* Advanced Settings */}
              <SettingsSection
                id="advanced"
                title={dict.settings.advanced.title}
              >
                <SettingItem
                  id="setting-custom-css"
                  title={dict.settings.advanced.custom_css.title}
                  description={dict.settings.advanced.custom_css.description}
                  control={
                    <textarea
                      value={customCSS}
                      onChange={(e) => setCustomCSS(e.target.value)}
                      placeholder={
                        dict.settings.advanced.custom_css.placeholder
                      }
                      className="h-40 w-[min(60vw,480px)] resize-y rounded-md border border-border bg-muted p-4 font-mono text-xs outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      spellCheck={false}
                    />
                  }
                />
              </SettingsSection>

              <SettingsSearchEmptyState />
              <div className="h-6" />
              <Footer />
            </div>
          </div>
        </div>
      </div>
    </SettingsSearchProvider>
  );
};

export default SettingsPage;
