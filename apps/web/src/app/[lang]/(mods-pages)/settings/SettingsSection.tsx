import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  matchesSettingsSearch,
  SettingsSearchSectionProvider,
  useSettingsSearch,
} from "./settingsSearch";

interface SettingsSectionProps {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}

export const SettingsSection = ({
  id,
  title,
  children,
  className,
}: SettingsSectionProps) => {
  const { query, isActive } = useSettingsSearch();
  const titleMatches = isActive && matchesSettingsSearch(query, { title });

  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-[--header-height]",
        isActive && "settings-search-section",
        className,
      )}
    >
      <div className="sticky top-[--header-height] z-10 border-b border-border bg-background/95 px-2 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      <SettingsSearchSectionProvider titleMatches={titleMatches}>
        <div className="divide-y divide-border">{children}</div>
      </SettingsSearchSectionProvider>
    </section>
  );
};
