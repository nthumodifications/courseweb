import { Monitor, Calendar, LayoutGrid, Sparkles, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
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
  return (
    <nav
      className={cn("space-y-1", className)}
      role="navigation"
      aria-label="Settings navigation"
    >
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSectionClick?.(section.id)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            activeSection === section.id
              ? "bg-nthu-500 text-white"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
          aria-current={activeSection === section.id ? "true" : undefined}
        >
          <span className="shrink-0">{section.icon}</span>
          <span>{section.title}</span>
        </button>
      ))}
    </nav>
  );
};
