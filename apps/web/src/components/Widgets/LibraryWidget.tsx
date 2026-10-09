import { FC, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLocalStorage } from "usehooks-ts";
import { BookOpen } from "lucide-react";
import { WidgetShell } from "./WidgetShell";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import { useLibraryVacancy } from "@/hooks/useLibraryVacancy";
import {
  getBranchFromItem,
  getBranchOpenStatus,
  type LibraryBranch,
} from "@/lib/library";
import useDictionary from "@/dictionaries/useDictionary";

interface LibraryWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const branches: LibraryBranch[] = ["all", "main", "moonlight", "hss", "ctm"];

const LibraryWidget: FC<LibraryWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const now = useTime(60_000);
  const [storedBranch, setStoredBranch] = useLocalStorage<LibraryBranch>(
    "widget_library_branch",
    "all",
  );
  const branch = branches.includes(storedBranch) ? storedBranch : "all";
  const { data = [], isLoading, error } = useLibraryVacancy();

  const available = useMemo(
    () =>
      data
        .filter(
          (item) => branch === "all" || getBranchFromItem(item) === branch,
        )
        .reduce((total, item) => {
          const itemBranch = getBranchFromItem(item);
          return getBranchOpenStatus(itemBranch, now).status === "closed"
            ? total
            : total + item.count;
        }, 0),
    [branch, data, now],
  );

  const title =
    dict.settings.calendar.widget_dashboard.widget_options.library.title;
  const branchLabel = {
    all: dict.library.filter_branch_all,
    main: dict.library.filter_branch_main,
    moonlight: dict.library.filter_branch_moonlight,
    hss: dict.library.filter_branch_hss,
    ctm: dict.library.filter_branch_ctm,
  }[branch];

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="flex flex-col gap-3 p-4">
        <select
          value={branch}
          onChange={(event) =>
            setStoredBranch(event.target.value as LibraryBranch)
          }
          aria-label={dict.library.filter_branch_all}
          className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs"
        >
          {branches.map((value) => (
            <option key={value} value={value}>
              {
                {
                  all: dict.library.filter_branch_all,
                  main: dict.library.filter_branch_main,
                  moonlight: dict.library.filter_branch_moonlight,
                  hss: dict.library.filter_branch_hss,
                  ctm: dict.library.filter_branch_ctm,
                }[value]
              }
            </option>
          ))}
        </select>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : error && data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <BookOpen className="mb-2 h-8 w-8 opacity-40" />
            <span className="text-xs">{dict.common.load_error}</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <BookOpen className="mb-2 h-8 w-8 opacity-40" />
            <span className="text-xs">{dict.library.no_results}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold tabular-nums">{available}</div>
              <div className="text-xs text-muted-foreground">
                {dict.library.available}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {branchLabel}
            </div>
          </div>
        )}
        <Link
          to={`/${language}/library`}
          className="text-xs text-primary hover:underline"
        >
          {dict.settings.calendar.widget_dashboard.view_full_page}
        </Link>
      </div>
    </WidgetShell>
  );
};

export default LibraryWidget;
