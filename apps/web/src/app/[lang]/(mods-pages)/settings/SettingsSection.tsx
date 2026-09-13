import { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
  return (
    <section id={id} className={cn("scroll-mt-[--header-height]", className)}>
      <div className="sticky top-[--header-height] z-10 border-b border-border bg-background/95 px-2 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
};
