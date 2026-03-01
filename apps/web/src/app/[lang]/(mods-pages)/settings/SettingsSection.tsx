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
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-6 py-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </section>
  );
};
