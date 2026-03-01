import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingItemProps {
  title: string | ReactNode;
  description?: string;
  control: ReactNode;
  className?: string;
  id?: string;
}

export const SettingItem = ({
  title,
  description,
  control,
  className,
  id,
}: SettingItemProps) => {
  return (
    <div
      id={id}
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
        className,
      )}
    >
      <div className="flex-1 space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center">{control}</div>
    </div>
  );
};
