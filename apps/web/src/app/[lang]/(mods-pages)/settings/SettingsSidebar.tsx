import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import useDictionary from "@/dictionaries/useDictionary";

interface Section {
  id: string;
  title: string;
  icon: ReactNode;
}

interface SettingsSidebarProps {
  sections: Section[];
  activeSection: string;
  onSectionClick?: (id: string) => void;
  className?: string;
}

export const SettingsSidebar = ({
  sections,
  activeSection,
  onSectionClick,
  className,
}: SettingsSidebarProps) => {
  const dict = useDictionary();

  return (
    <nav
      className={cn("space-y-3", className)}
      role="navigation"
      aria-label={dict.settings.navigation_aria}
    >
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSectionClick?.(section.id)}
          className={cn(
            "flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            activeSection === section.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
          aria-current={activeSection === section.id ? "true" : undefined}
        >
          <span className="shrink-0">{section.icon}</span>
          <span className="text-left truncate">{section.title}</span>
        </button>
      ))}
    </nav>
  );
};
