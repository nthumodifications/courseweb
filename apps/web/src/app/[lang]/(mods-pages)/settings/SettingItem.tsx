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
      className={cn("flex flex-row items-center gap-4 py-4", className)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {typeof title === "string" ? (
          <h3 className="text-sm font-bold">{title}</h3>
        ) : (
          <div className="text-sm font-bold" role="heading" aria-level={3}>
            {title}
          </div>
        )}
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center shrink-0">{control}</div>
    </div>
  );
};
