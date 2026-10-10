import { FC, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { BookOpen } from "lucide-react";
import { WidgetShell } from "./WidgetShell";
import { useSettings } from "@/hooks/contexts/settings";
import useSyncedStorage from "@/hooks/useSyncedStorage";
import useDictionary from "@/dictionaries/useDictionary";
import {
  calculateCredits,
  calculateGpa,
  calculateProjectedCumulativeGpa,
  calculateSemesterCumulativeGpas,
  DEFAULT_GRADEBOOK,
  normalizeGradebook,
  mergeGradebooks,
  type Gradebook,
} from "@/app/[lang]/(mods-pages)/student/grades/calculator";

interface GradesWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const parseNumber = (value: string, maximum = 4.3) => {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= maximum
    ? number
    : null;
};

const formatGpa = (value: number | null) =>
  value === null ? "—" : value.toFixed(2);

const formatCredits = (value: number) =>
  Number.isInteger(value) ? value.toString() : value.toFixed(1);

const GradesWidget: FC<GradesWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const dict = useDictionary();
  const { language } = useSettings();
  const { isAuthenticated } = useAuth();
  const [storedGradebook, , syncReady, syncError] = useSyncedStorage<Gradebook>(
    "grades",
    DEFAULT_GRADEBOOK,
    mergeGradebooks,
  );
  const gradebook = useMemo(
    () => normalizeGradebook(storedGradebook),
    [storedGradebook],
  );
  const currentGpa = parseNumber(gradebook.baseline.currentGpa);
  const completedCredits = parseNumber(
    gradebook.baseline.completedCredits,
    Number.POSITIVE_INFINITY,
  );
  const termGpa = calculateGpa(gradebook.entries);
  const termCredits = calculateCredits(gradebook.entries);
  const semesterHistory = calculateSemesterCumulativeGpas({
    semesters: gradebook.semesters,
    currentGpa,
    completedCredits,
  });
  const cumulativeGpa = calculateProjectedCumulativeGpa({
    entries: gradebook.entries,
    semesters: gradebook.semesters,
    currentGpa,
    completedCredits,
  });
  const hasData =
    gradebook.entries.length > 0 ||
    semesterHistory.length > 0 ||
    (currentGpa !== null && completedCredits !== null && completedCredits > 0);
  const isLoading = isAuthenticated && !syncReady;
  const isError = Boolean(syncError && !hasData);
  const title =
    dict.settings.calendar.widget_dashboard.widget_options.grades.title;
  const fullPageLink = (
    <Link
      to={`/${language}/student/grades`}
      className="text-xs text-primary hover:underline"
    >
      {dict.settings.calendar.widget_dashboard.view_full_page}
    </Link>
  );

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <div className="flex flex-col gap-3 p-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <BookOpen className="mb-2 h-8 w-8 opacity-40" />
            <span className="text-xs">{dict.common.load_error}</span>
          </div>
        ) : !hasData ? (
          <div className="py-4 text-xs text-muted-foreground">
            {dict.grade.widget_empty} {fullPageLink}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold tabular-nums">
                {formatGpa(cumulativeGpa)}
              </div>
              <div className="text-xs text-muted-foreground">
                {dict.grade.projected_cumulative_gpa}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>
                {dict.grade.predicted_term_gpa}: {formatGpa(termGpa)}
              </div>
              <div>
                {formatCredits(termCredits)}{" "}
                {dict.grade.credits_counted.toLowerCase()}
              </div>
            </div>
          </div>
        )}
        {(isLoading || isError || hasData) && fullPageLink}
      </div>
    </WidgetShell>
  );
};

export default GradesWidget;
