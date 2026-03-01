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
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    onSectionClick?.(id);
  };

  return (
    <nav
      className={cn("space-y-1", className)}
      role="navigation"
      aria-label="Settings navigation"
    >
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          onClick={(e) => handleClick(e, section.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            activeSection === section.id
              ? "bg-nthu-500 text-white"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <span className="h-5 w-5 shrink-0">{section.icon}</span>
          <span>{section.title}</span>
        </a>
      ))}
    </nav>
  );
};
