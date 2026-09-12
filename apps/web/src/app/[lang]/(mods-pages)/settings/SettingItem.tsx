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
        "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex-1 space-y-1">
        {typeof title === "string" ? (
          <h3 className="text-sm font-medium">{title}</h3>
        ) : (
          <div className="text-sm font-medium" role="heading" aria-level={3}>
            {title}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex w-full min-w-0 items-center sm:w-auto sm:shrink-0">
        {control}
      </div>
    </div>
  );
};
