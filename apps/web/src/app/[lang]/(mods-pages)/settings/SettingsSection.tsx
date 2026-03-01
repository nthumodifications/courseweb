import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export const SettingsSection = ({
  id,
  title,
  description,
  children,
  className,
}: SettingsSectionProps) => {
  return (
    <section id={id} className={cn("scroll-mt-20", className)}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  );
};
