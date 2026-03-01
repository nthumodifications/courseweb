import { Monitor, Calendar, LayoutGrid, Sparkles, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface SettingsSidebarProps {
  sections: Section[];
  activeSection: string;
  className?: string;
}

export const SettingsSidebar = ({
  sections,
  activeSection,
  className,
}: SettingsSidebarProps) => {
  return (
    <nav className={cn("space-y-1", className)}>
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeSection === section.id
              ? "bg-nthu-500 text-white"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <span className="h-5 w-5">{section.icon}</span>
          <span>{section.label}</span>
        </a>
      ))}
    </nav>
  );
};

export const settingsSections: Section[] = [
  { id: "display", label: "Display", icon: <Monitor className="h-5 w-5" /> },
  { id: "calendar", label: "Calendar", icon: <Calendar className="h-5 w-5" /> },
  {
    id: "timetable",
    label: "Timetable",
    icon: <LayoutGrid className="h-5 w-5" />,
  },
  { id: "ai", label: "AI", icon: <Sparkles className="h-5 w-5" /> },
  { id: "privacy", label: "Privacy", icon: <Shield className="h-5 w-5" /> },
];
