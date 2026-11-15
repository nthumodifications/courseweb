import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  currentSemester,
  lastSemester,
  semesterInfo,
  toPrettySemester,
} from "@courseweb/shared";
import {
  Button,
  EmptyState,
  ErrorState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@courseweb/ui";
import client from "@/config/api";
import useDictionary from "@/dictionaries/useDictionary";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import { intlLocale } from "@/helpers/contentLanguage";
import { sanitizeCourseHtml } from "@/lib/sanitizeHtml";

const fetchCourseInsights = async (semester: string) => {
  const response = await client.course.insights.$get({
    query: { semester },
  });
  if (!response.ok) throw new Error("Failed to load course insights");
  return response.json();
};

type CourseInsightsResponse = Awaited<ReturnType<typeof fetchCourseInsights>>;

const dayLabelKeys = [
  "weekday_monday",
  "weekday_tuesday",
  "weekday_wednesday",
  "weekday_thursday",
  "weekday_friday",
  "weekday_saturday",
  "weekday_sunday",
] as const;

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-bold">{children}</h2>
);

const InsightsSkeleton = ({ label }: { label: string }) => (
  <div className="flex flex-col gap-6" aria-label={label}>
    <section className="flex flex-col gap-2">
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="flex flex-col gap-2 py-2" key={index}>
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </section>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[0, 1].map((section) => (
        <section className="flex flex-col gap-2" key={section}>
          <Skeleton className="h-4 w-36" />
          <div className="flex flex-col divide-y divide-border">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                className="flex items-center justify-between gap-4 py-3"
                key={index}
              >
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-4 w-1/5" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
    <section className="flex flex-col gap-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-48 w-full" />
    </section>
  </div>
);

const CourseInsightChart = ({
  title,
  values,
  formatValue,
}: {
  title: string;
  values: { semester: string; value: number | null }[];
  formatValue: (value: number) => string;
}) => {
  const points = values.filter(
    (point): point is { semester: string; value: number } =>
      point.value !== null,
  );

  return (
    <div className="min-w-0" role="img" aria-label={title}>
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="semester"
              tickFormatter={toPrettySemester}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              cursor={{ stroke: "hsl(var(--border))" }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as
                  | { semester: string; value: number }
                  | undefined;
                if (!active || !point) return null;
                return (
                  <div className="rounded-lg border border-border bg-background p-2 text-sm">
                    <div className="font-bold">
                      {toPrettySemester(point.semester)}
                    </div>
                    <div>{formatValue(point.value)}</div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const InsightsMetric = ({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) => (
  <div className="flex min-w-0 flex-col gap-1 border-b border-border py-2">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="font-bold tabular-nums">{value}</dd>
    <span className="text-xs text-muted-foreground tabular-nums">{change}</span>
  </div>
);

const ExpandableModuleList = ({
  modules,
  lang,
  title,
  empty,
  moreLabel,
  lessLabel,
  localizeZh,
  detail,
}: {
  modules: CourseInsightsResponse["newModules"];
  lang: string;
  title: string;
  empty: string;
  moreLabel: string;
  lessLabel: string;
  localizeZh: (value: string) => string;
  detail?: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? modules : modules.slice(0, 8);
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <SectionTitle>{title}</SectionTitle>
        {detail && (
          <span className="text-sm text-muted-foreground">{detail}</span>
        )}
      </div>
      {modules.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <>
          <div className="flex flex-col divide-y divide-border">
            {visible.map((module) => (
              <Link
                className="flex min-w-0 items-center justify-between gap-4 py-2 outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
                key={module.key}
                to={`/${lang}/courses/module/${encodeURIComponent(module.key)}`}
              >
                <span className="min-w-0">
                  <span className="block font-medium">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: sanitizeCourseHtml(
                          lang === "en"
                            ? module.nameEn || module.nameZh
                            : localizeZh(module.nameZh),
                        ),
                      }}
                    />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {module.department} {module.course}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-muted-foreground">
                  {module.key}
                </span>
              </Link>
            ))}
          </div>
          {modules.length > 8 && (
            <Button
              className="min-h-10 self-start px-2"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? lessLabel : moreLabel}
            </Button>
          )}
        </>
      )}
    </section>
  );
};

const CourseInsightsPage = () => {
  const dict = useDictionary();
  const labels = dict.course_insights;
  const { lang: routeLang = "zh" } = useParams<{ lang: string }>();
  const lang = routeLang === "en" || routeLang === "zh-cn" ? routeLang : "zh";
  const locale = intlLocale(lang);
  const localizeZh = useLocalizedZhData();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultSemester = currentSemester?.id ?? lastSemester.id;
  const requestedSemester = searchParams.get("semester");
  const semester = semesterInfo.some((item) => item.id === requestedSemester)
    ? requestedSemester!
    : defaultSemester;
  const semesters = useMemo(
    () =>
      [...semesterInfo].sort((left, right) => right.id.localeCompare(left.id)),
    [],
  );
  const numberFormat = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale],
  );
  const oneDecimalFormat = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [locale],
  );
  const percentageFormat = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 1,
      }),
    [locale],
  );
  const query = useQuery({
    queryKey: ["course-insights", semester],
    queryFn: () => fetchCourseInsights(semester),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });

  const selectSemester = (value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("semester", value);
        return next;
      },
      { replace: true },
    );
  };

  const formatCount = (value: number | null) =>
    value === null ? "—" : numberFormat.format(value);
  const formatPercent = (value: number | null) =>
    value === null ? "—" : percentageFormat.format(value);
  const formatChange = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return "—";
    const difference = current - previous;
    const sign = difference > 0 ? "+" : difference < 0 ? "−" : "";
    return `${sign}${numberFormat.format(Math.abs(difference))}`;
  };
  const formatShareChange = (
    current: number | null,
    previous: number | null,
  ) => {
    if (current === null || previous === null) return "—";
    const difference = (current - previous) * 100;
    const sign = difference > 0 ? "+" : difference < 0 ? "−" : "";
    return labels.percentage_points.replace(
      "{value}",
      `${sign}${oneDecimalFormat.format(Math.abs(difference))}`,
    );
  };

  return (
    <>
      <Helmet>
        <title>{`${labels.title} | NTHUMods`}</title>
      </Helmet>
      <div className="flex flex-col gap-6 px-4 md:px-6" data-course-insights>
        <div className="flex flex-col gap-3 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between">
          <label
            className="text-sm font-medium"
            htmlFor="course-insights-semester"
          >
            {labels.semester_label}
          </label>
          <Select value={semester} onValueChange={selectSemester}>
            <SelectTrigger
              className="w-full sm:w-[180px]"
              aria-label={labels.semester_label}
              id="course-insights-semester"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((item) => (
                <SelectItem value={item.id} key={item.id}>
                  {toPrettySemester(item.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {query.isLoading ? (
          <InsightsSkeleton label={dict.common.loading} />
        ) : query.error ? (
          <ErrorState
            title={dict.common.load_error}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
              >
                {dict.common.try_again}
              </Button>
            }
          />
        ) : query.data ? (
          query.data.snapshot.sections === 0 ? (
            <EmptyState title={labels.no_course_data} />
          ) : (
            <InsightsContent
              data={query.data}
              labels={labels}
              lang={lang}
              localizeZh={localizeZh}
              numberFormat={numberFormat}
              oneDecimalFormat={oneDecimalFormat}
              percentageFormat={percentageFormat}
              formatCount={formatCount}
              formatPercent={formatPercent}
              formatChange={formatChange}
              formatShareChange={formatShareChange}
            />
          )
        ) : null}
        <div className="h-6" />
      </div>
    </>
  );
};

const InsightsContent = ({
  data,
  labels,
  lang,
  localizeZh,
  numberFormat,
  oneDecimalFormat,
  percentageFormat,
  formatCount,
  formatPercent,
  formatChange,
  formatShareChange,
}: {
  data: CourseInsightsResponse;
  labels: ReturnType<typeof useDictionary>["course_insights"];
  lang: string;
  localizeZh: (value: string) => string;
  numberFormat: Intl.NumberFormat;
  oneDecimalFormat: Intl.NumberFormat;
  percentageFormat: Intl.NumberFormat;
  formatCount: (value: number | null) => string;
  formatPercent: (value: number | null) => string;
  formatChange: (current: number | null, previous: number | null) => string;
  formatShareChange: (
    current: number | null,
    previous: number | null,
  ) => string;
}) => {
  const [showAllDepartments, setShowAllDepartments] = useState(false);
  const previous = data.comparison;
  const departmentRows = showAllDepartments
    ? data.departments
    : data.departments.slice(0, 20);
  const metrics = [
    {
      label: labels.modules_sections,
      value: `${formatCount(data.snapshot.modules)} / ${formatCount(data.snapshot.sections)}`,
      change: previous
        ? `${formatChange(data.snapshot.modules, previous.modules)} / ${formatChange(data.snapshot.sections, previous.sections)}`
        : "—",
    },
    {
      label: labels.departments,
      value: formatCount(data.snapshot.departments),
      change: formatChange(
        data.snapshot.departments,
        previous?.departments ?? null,
      ),
    },
    {
      label: labels.seats,
      value: formatCount(data.snapshot.seats),
      change: formatChange(data.snapshot.seats, previous?.seats ?? null),
    },
    {
      label: labels.english_share,
      value: formatPercent(data.snapshot.englishShare),
      change: formatShareChange(
        data.snapshot.englishShare,
        previous?.englishShare ?? null,
      ),
    },
  ];
  const weekdayLabels = dayLabelKeys.map((key) => labels[key]);
  const maximumScheduleCount = Math.max(0, ...data.schedule.counts.flat());
  const hasSchedule = maximumScheduleCount > 0;
  const chartPoints = data.trends;
  const trendTableRows = chartPoints.map((trend) => ({
    semester: toPrettySemester(trend.semester),
    modules: formatCount(trend.modules),
    englishShare: formatPercent(trend.englishShare),
    averageClassSize:
      trend.averageClassSize === null
        ? "—"
        : oneDecimalFormat.format(trend.averageClassSize),
  }));

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <SectionTitle>{labels.at_a_glance}</SectionTitle>
          {data.comparisonSemester && previous && (
            <span className="text-sm text-muted-foreground">
              {toPrettySemester(data.comparisonSemester)} ·{" "}
              {labels.change_vs_last_year}
            </span>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {metrics.map((metric) => (
            <InsightsMetric key={metric.label} {...metric} />
          ))}
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-2">
          <SectionTitle>{labels.fullest_sections}</SectionTitle>
          {data.fullestCourses.length === 0 ? (
            <EmptyState title={labels.no_fullness_data} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="border-b border-border text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-2 font-medium" scope="col">
                      {labels.course}
                    </th>
                    <th
                      className="px-2 py-2 text-right font-medium"
                      scope="col"
                    >
                      {labels.section}
                    </th>
                    <th
                      className="px-2 py-2 text-right font-medium"
                      scope="col"
                    >
                      {labels.fill_rate}
                    </th>
                    <th
                      className="py-2 pl-2 text-right font-medium"
                      scope="col"
                    >
                      {labels.enrolled_capacity}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.fullestCourses.map((course) => (
                    <tr key={course.rawId}>
                      <td className="min-w-0 py-2 pr-2">
                        <Link
                          className="font-medium outline-none hover:underline focus-visible:underline"
                          to={`/${lang}/courses/${encodeURIComponent(course.rawId)}`}
                        >
                          <span
                            dangerouslySetInnerHTML={{
                              __html: sanitizeCourseHtml(
                                lang === "en"
                                  ? course.nameEn || course.nameZh
                                  : localizeZh(course.nameZh),
                              ),
                            }}
                          />
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {course.department} {course.course}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {course.class}
                      </td>
                      <td className="px-2 py-2 text-right font-medium tabular-nums">
                        {formatPercent(course.fillRate)}
                      </td>
                      <td className="py-2 pl-2 text-right whitespace-nowrap tabular-nums">
                        {numberFormat.format(course.enrolled)} /{" "}
                        {numberFormat.format(course.capacity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-2">
          <SectionTitle>{labels.department_demand}</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-2 font-medium" scope="col">
                    {labels.departments}
                  </th>
                  <th className="px-2 py-2 text-right font-medium" scope="col">
                    {labels.sections}
                  </th>
                  <th className="px-2 py-2 text-right font-medium" scope="col">
                    {labels.seats}
                  </th>
                  <th className="py-2 pl-2 text-right font-medium" scope="col">
                    {labels.fill_rate}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {departmentRows.map((department) => (
                  <tr key={department.department}>
                    <th className="py-2 pr-2 text-left font-medium" scope="row">
                      {department.department}
                    </th>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {numberFormat.format(department.sections)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {numberFormat.format(department.seats)}
                    </td>
                    <td className="py-2 pl-2 text-right tabular-nums">
                      {formatPercent(department.fillRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.departments.length > 20 && (
            <Button
              className="min-h-10 self-start px-2"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllDepartments((value) => !value)}
            >
              {showAllDepartments
                ? labels.show_fewer_departments
                : labels.show_all_departments.replace(
                    "{count}",
                    numberFormat.format(data.departments.length),
                  )}
            </Button>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-2">
          <SectionTitle>{labels.when_classes_meet}</SectionTitle>
          {!hasSchedule ? (
            <EmptyState title={labels.no_schedule_data} />
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full table-fixed border-collapse text-xs"
                aria-label={labels.schedule_table_label}
              >
                <thead>
                  <tr>
                    <th className="w-7 pb-1" scope="col" />
                    {data.schedule.periods.map((period) => (
                      <th
                        className="pb-1 font-medium text-muted-foreground"
                        key={period}
                        scope="col"
                      >
                        {period.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.schedule.days.map((day, dayIndex) => (
                    <tr key={day}>
                      <th
                        className="h-7 pr-1 text-left font-medium text-muted-foreground"
                        scope="row"
                      >
                        {weekdayLabels[dayIndex]}
                      </th>
                      {data.schedule.periods.map((period, periodIndex) => {
                        const count =
                          data.schedule.counts[dayIndex]?.[periodIndex] ?? 0;
                        const intensity =
                          maximumScheduleCount > 0
                            ? count / maximumScheduleCount
                            : 0;
                        const shade =
                          count === 0
                            ? "bg-muted/30 text-muted-foreground"
                            : intensity > 0.75
                              ? "bg-primary text-primary-foreground"
                              : intensity > 0.5
                                ? "bg-primary/70 text-primary-foreground"
                                : intensity > 0.25
                                  ? "bg-primary/40 text-foreground"
                                  : "bg-primary/20 text-foreground";
                        const accessibleLabel = labels.schedule_cell_label
                          .replace("{day}", weekdayLabels[dayIndex] ?? day)
                          .replace("{period}", period.toUpperCase())
                          .replace("{count}", numberFormat.format(count));
                        return (
                          <td
                            aria-label={accessibleLabel}
                            className={`h-7 border border-background tabular-nums ${shade}`}
                            key={`${day}-${period}`}
                            title={accessibleLabel}
                          >
                            {count > 0 ? count : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-2">
          <SectionTitle>{labels.busiest_buildings}</SectionTitle>
          {data.buildings.length === 0 ? (
            <EmptyState title={labels.no_building_data} />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {data.buildings.map((building) => (
                <div
                  className="flex items-center justify-between gap-4 py-2"
                  key={building.code}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {lang === "en"
                        ? building.nameEn
                        : localizeZh(building.nameZh)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {lang === "en"
                        ? building.code
                        : localizeZh(building.code)}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">
                    {numberFormat.format(building.sections)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ExpandableModuleList
          modules={data.newModules}
          lang={lang}
          title={labels.new_modules}
          empty={
            data.newLookback < 4
              ? labels.prior_history_unavailable
              : labels.no_new_modules
          }
          moreLabel={labels.show_more}
          lessLabel={labels.show_less}
          localizeZh={localizeZh}
          detail={
            data.newLookback === 4
              ? labels.new_lookback.replace("{count}", String(data.newLookback))
              : undefined
          }
        />

        {data.comparisonSemester && data.comparison && (
          <ExpandableModuleList
            modules={data.discontinuedModules}
            lang={lang}
            title={labels.discontinued_modules}
            empty={labels.no_discontinued_modules}
            moreLabel={labels.show_more}
            lessLabel={labels.show_less}
            localizeZh={localizeZh}
          />
        )}
      </div>

      <section className="flex flex-col gap-2">
        <SectionTitle>{labels.semester_trends}</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <CourseInsightChart
            title={labels.modules}
            values={chartPoints.map((trend) => ({
              semester: trend.semester,
              value: trend.modules,
            }))}
            formatValue={(value) => numberFormat.format(value)}
          />
          <CourseInsightChart
            title={labels.english_share}
            values={chartPoints.map((trend) => ({
              semester: trend.semester,
              value: trend.englishShare,
            }))}
            formatValue={(value) => percentageFormat.format(value)}
          />
          <CourseInsightChart
            title={labels.average_class_size}
            values={chartPoints.map((trend) => ({
              semester: trend.semester,
              value: trend.averageClassSize,
            }))}
            formatValue={(value) => oneDecimalFormat.format(value)}
          />
        </div>
        <table className="sr-only">
          <caption>{labels.semester_trends}</caption>
          <thead>
            <tr>
              <th scope="col">{labels.semester_label}</th>
              <th scope="col">{labels.modules}</th>
              <th scope="col">{labels.english_share}</th>
              <th scope="col">{labels.average_class_size}</th>
            </tr>
          </thead>
          <tbody>
            {trendTableRows.map((trend) => (
              <tr key={trend.semester}>
                <td>{trend.semester}</td>
                <td>{trend.modules}</td>
                <td>{trend.englishShare}</td>
                <td>{trend.averageClassSize}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default CourseInsightsPage;
