import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  getReactNodeText,
  shouldShowSettingsSearchItem,
  useSettingsSearch,
  useSettingsSearchSectionTitleMatch,
} from "./settingsSearch";

interface SettingItemProps {
  title: string | ReactNode;
  description?: ReactNode;
  control: ReactNode;
  className?: string;
  id?: string;
  searchText?: string;
  searchKeywords?: readonly string[];
}

export const SettingItem = ({
  title,
  description,
  control,
  className,
  id,
  searchText,
  searchKeywords,
}: SettingItemProps) => {
  const { query, isActive } = useSettingsSearch();
  const sectionTitleMatches = useSettingsSearchSectionTitleMatch();
  const isMatch = shouldShowSettingsSearchItem(query, sectionTitleMatches, {
    title: getReactNodeText(title),
    description: getReactNodeText(description),
    searchText,
    keywords: searchKeywords,
  });

  if (isActive && !isMatch) return null;

  return (
    <div
      id={id}
      data-settings-search-match={isActive ? "true" : undefined}
      className={cn(
        "flex flex-row items-center gap-4 py-4",
        id && "scroll-mt-[--header-height]",
        className,
      )}
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
