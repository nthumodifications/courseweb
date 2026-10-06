import { ChevronDown, ChevronUp } from "lucide-react";
import { useRef, useState } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import {
  aggregateHourlyValues,
  deriveUsageWindows,
  formatUsageWindow,
  getUsageForecastState,
  getUsageVerdict,
  isUsageSnapshotFresh,
  pickUsageSentence,
  toBusyness,
  toBusynessNextPoint,
  toBusynessSlot,
  trimHoursInUse,
  type HourValue,
  type UsageKind,
  type UsageSeries,
  type UsageVerdict,
} from "@/lib/usage-forecast";

interface UsageForecastProps {
  series: UsageSeries;
  kind: UsageKind;
  /** A page may know a better capacity estimate than the observed API ceiling. */
  capacity?: number | null;
  now?: Date;
  /** The page's live value, in the API's raw units. */
  liveValue?: number | null;
  /** Snapshot timestamp used to decide whether observed/next data is trusted. */
  generatedAt?: string | null;
  /** Sports uses its existing opening-hours sheet; library leaves this unset. */
  onOpenDetails?: () => void;
  /** Render only the detail surface when it is placed in the sports sheet. */
  variant?: "row" | "detail";
}

interface HourBar {
  hour: number;
  expected: number | null;
  actual: number | null;
  next: number | null;
}

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (
    (Number.isFinite(hours) ? hours : 0) * 60 +
    (Number.isFinite(minutes) ? minutes : 0)
  );
}

function timeToSlotIndex(value: string): number {
  return Math.floor(timeToMinutes(value) / 30);
}

function currentTaipeiHour(now: Date): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    hourCycle: "h23",
  });
  return Number(formatter.format(now));
}

function currentTaipeiTime(now: Date): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return formatter.format(now);
}

function verdictLabel(
  dict: ReturnType<typeof useDictionary>,
  verdict: UsageVerdict,
): string {
  switch (verdict) {
    case "quieter":
      return dict.usage_forecast.verdict_quieter;
    case "busier":
      return dict.usage_forecast.verdict_busier;
    case "unexpected_closed":
      return dict.usage_forecast.verdict_unexpected_closed;
    case "stale":
      return dict.usage_forecast.verdict_stale;
    case "usual":
      return dict.usage_forecast.verdict_usual;
  }
}

function verdictClass(verdict: UsageVerdict): string {
  if (verdict === "stale" || verdict === "unexpected_closed") {
    return "bg-muted text-muted-foreground";
  }
  if (verdict === "busier") {
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  if (verdict === "quieter") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  return "bg-muted text-foreground";
}

function withWindow(template: string, window: string | undefined): string {
  return template.replace("{window}", window ?? "");
}

function withTime(template: string, time: string | undefined): string {
  return template.replace("{time}", time ?? "");
}

function withValueAndUnit(
  template: string,
  value: string,
  unit: string,
): string {
  return template.replace("{value}", value).replace("{unit}", unit);
}

function makeHours(
  expected: readonly (number | null)[],
  actual: readonly (number | null)[] = [],
  next: readonly (number | null)[] = [],
): HourBar[] {
  const expectedHours = aggregateHourlyValues(expected);
  const actualHours = aggregateHourlyValues(actual);
  const nextHours = aggregateHourlyValues(next);
  const inUse = trimHoursInUse(
    expectedHours.map((value, hour): HourValue => ({ hour, value })),
  );
  return inUse.map(({ hour }) => ({
    hour,
    expected: expectedHours[hour] ?? null,
    actual: actualHours[hour] ?? null,
    next: nextHours[hour] ?? null,
  }));
}

function makeTodayHours(
  series: UsageSeries,
  kind: UsageKind,
  capacity: number | null,
): HourBar[] {
  const converted = series.today.map((slot) =>
    slot.level === null ? null : toBusynessSlot(slot, kind, capacity),
  );
  const nextValues = Array.from<number | null>({ length: 48 }).fill(null);
  for (const point of series.next) {
    const convertedPoint = toBusynessNextPoint(point, kind, capacity);
    const index = timeToSlotIndex(convertedPoint.t);
    if (index >= 0 && index < nextValues.length) {
      nextValues[index] = convertedPoint.expected;
    }
  }
  return makeHours(
    converted.map((slot) => slot?.expected ?? null),
    converted.map((slot) => slot?.actual ?? null),
    nextValues,
  );
}

function makeWeekHours(
  week: readonly (number | null)[],
  kind: UsageKind,
  capacity: number | null,
): HourBar[] {
  return makeHours(week.map((value) => toBusyness(value, kind, capacity)));
}

function barHeight(value: number | null, maximum: number): string {
  if (value === null || value <= 0 || maximum <= 0) return "0%";
  return `${Math.max(4, Math.min(100, (Math.max(0, value) / maximum) * 100))}%`;
}

function hourLabel(hour: number): string {
  return String(hour).padStart(2, "0");
}

function ChartSummary({
  hours,
  currentHour,
  dict,
}: {
  hours: HourBar[];
  currentHour: number;
  dict: ReturnType<typeof useDictionary>;
}) {
  if (hours.length === 0) return null;
  const template =
    currentHour >= 0
      ? dict.usage_forecast.chart_summary
      : dict.usage_forecast.chart_summary_day;
  return (
    <span className="sr-only">
      {template
        .replace("{start}", `${hourLabel(hours[0].hour)}:00`)
        .replace("{end}", `${hourLabel(hours[hours.length - 1].hour + 1)}:00`)
        .replace("{current}", `${hourLabel(Math.max(currentHour, 0))}:00`)}
    </span>
  );
}

function PopularTimesStrip({
  hours,
  currentHour,
  currentValue,
  dict,
}: {
  hours: HourBar[];
  currentHour: number;
  currentValue: number | null;
  dict: ReturnType<typeof useDictionary>;
}) {
  if (hours.length === 0) return null;
  const values = hours
    .map((hour) => hour.expected)
    .filter((value): value is number => value !== null);
  const maximum = Math.max(...values, currentValue ?? 0, 1);

  return (
    <div className="min-w-0">
      <div
        aria-hidden="true"
        className="grid h-7 items-end gap-px"
        style={{
          gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))`,
        }}
      >
        {hours.map((hour) => {
          const isCurrent = hour.hour === currentHour;
          const actual = isCurrent ? currentValue : null;
          return (
            <div className="relative h-full" key={hour.hour}>
              <div
                className={`absolute inset-x-0 bottom-0 rounded-t-sm ${isCurrent ? "bg-primary" : "bg-primary/25 dark:bg-primary/35"}`}
                style={{ height: barHeight(hour.expected, maximum) }}
              />
              {actual !== null && (
                <div
                  className="absolute bottom-0 left-1/2 h-1 w-3/4 -translate-x-1/2 rounded-full bg-foreground"
                  style={{ bottom: barHeight(actual, maximum) }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className="mt-1 grid text-[10px] leading-none text-muted-foreground"
        style={{
          gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))`,
        }}
      >
        {hours.map((hour) => (
          <span className="text-center" key={hour.hour}>
            {hour.hour % 3 === 0 ? hour.hour : ""}
          </span>
        ))}
      </div>
      <ChartSummary hours={hours} currentHour={currentHour} dict={dict} />
    </div>
  );
}

function DetailBars({
  hours,
  currentHour,
  fresh,
  isToday,
  dict,
}: {
  hours: HourBar[];
  currentHour: number;
  fresh: boolean;
  isToday: boolean;
  dict: ReturnType<typeof useDictionary>;
}) {
  if (hours.length === 0) return null;
  const values = hours.flatMap((hour) =>
    [
      hour.expected,
      isToday && fresh && hour.hour <= currentHour ? hour.actual : null,
      isToday && fresh && hour.hour > currentHour ? hour.next : null,
    ].filter((value): value is number => value !== null),
  );
  const maximum = Math.max(...values, 1);
  const currentIndex = hours.findIndex((hour) => hour.hour === currentHour);
  const markerIndex = currentIndex < 0 ? null : currentIndex;

  return (
    <>
      <div className="h-32 overflow-hidden rounded-md bg-muted/30 px-1 pt-2">
        <div
          aria-hidden="true"
          className="grid h-full items-end gap-px"
          style={{
            gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))`,
          }}
        >
          {hours.map((hour) => {
            const showObserved =
              isToday &&
              fresh &&
              hour.hour <= currentHour &&
              hour.actual !== null;
            const showPredicted =
              isToday && fresh && hour.hour > currentHour && hour.next !== null;
            return (
              <div className="relative h-full" key={hour.hour}>
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t-sm bg-primary/20 dark:bg-primary/35"
                  style={{ height: barHeight(hour.expected, maximum) }}
                />
                {showObserved && (
                  <div
                    className="absolute bottom-0 left-1/2 w-[55%] -translate-x-1/2 rounded-t-sm bg-primary"
                    style={{ height: barHeight(hour.actual, maximum) }}
                  />
                )}
                {showPredicted && (
                  <div
                    className="absolute bottom-0 left-1/2 w-[55%] -translate-x-1/2 rounded-t-sm border border-dashed border-primary bg-primary/5"
                    style={{ height: barHeight(hour.next, maximum) }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="relative mt-1 h-6">
        <div
          aria-hidden="true"
          className="grid text-[10px] leading-none text-muted-foreground"
          style={{
            gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))`,
          }}
        >
          {hours.map((hour) => (
            <span className="text-center" key={hour.hour}>
              {hour.hour === currentHour
                ? ""
                : hour.hour % 3 === 0
                  ? hour.hour
                  : ""}
            </span>
          ))}
        </div>
        {markerIndex !== null && isToday && (
          <div
            aria-hidden="true"
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center text-[10px] font-medium leading-none text-primary"
            style={{ left: `${((markerIndex + 0.5) / hours.length) * 100}%` }}
          >
            <span className="h-1 w-px bg-primary" />
            {dict.usage_forecast.now}
          </div>
        )}
      </div>
      <ChartSummary hours={hours} currentHour={currentHour} dict={dict} />
    </>
  );
}

function ForecastLegend({
  dict,
  showObserved,
  showPredicted,
}: {
  dict: ReturnType<typeof useDictionary>;
  showObserved: boolean;
  showPredicted: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-sm bg-primary/20 dark:bg-primary/35" />
        {dict.usage_forecast.typical}
      </span>
      {showObserved && (
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-1.5 rounded-sm bg-primary" />
          {dict.usage_forecast.observed}
        </span>
      )}
      {showPredicted && (
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-1.5 rounded-sm border border-dashed border-primary bg-primary/5" />
          {dict.usage_forecast.predicted}
        </span>
      )}
    </div>
  );
}

function taipeiWeekday(now: Date): number {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    weekday: "short",
  }).format(now);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(value);
}

function DetailView({
  series,
  kind,
  capacity,
  now,
  generatedAt,
  dict,
}: {
  series: UsageSeries;
  kind: UsageKind;
  capacity: number | null;
  now: Date;
  generatedAt: string | null | undefined;
  dict: ReturnType<typeof useDictionary>;
}) {
  const today = currentTaipeiHour(now);
  const todayIndex = Math.max(0, taipeiWeekday(now));
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasWeek = series.week.length >= 7;
  const isToday = selectedDay === todayIndex;
  const snapshotFresh =
    generatedAt !== null &&
    generatedAt !== undefined &&
    isUsageSnapshotFresh(generatedAt, now);
  const hours = isToday
    ? makeTodayHours(series, kind, capacity)
    : makeWeekHours(series.week[selectedDay] ?? [], kind, capacity);
  const dayValues = series.week[selectedDay]?.map((value) =>
    toBusyness(value, kind, capacity),
  );
  const derived = !isToday && dayValues ? deriveUsageWindows(dayValues) : null;
  const peaks = isToday ? series.peaks : (derived?.peaks ?? []);
  const bestTime = isToday ? series.bestTime : (derived?.bestTime ?? null);
  const expectedMaximum = Math.max(
    ...hours
      .map((hour) => hour.expected)
      .filter((value): value is number => value !== null),
    0,
  );
  const unit =
    kind === "occupancy"
      ? dict.usage_forecast.people_unit
      : dict.usage_forecast.space_unit;
  const quality = series.quality
    ? withValueAndUnit(
        dict.usage_forecast.accuracy,
        String(Math.round(series.quality.mae * 10) / 10),
        unit,
      )
    : null;
  const hasObserved =
    isToday &&
    snapshotFresh &&
    hours.some((hour) => hour.hour <= today && hour.actual !== null);
  const hasPredicted =
    isToday &&
    snapshotFresh &&
    hours.some((hour) => hour.hour > today && hour.next !== null);
  const tabPanelId = `usage-forecast-panel-${series.id}`;

  const moveDay = (day: number) => {
    setSelectedDay(day);
    tabRefs.current[day]?.focus();
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
      {hasWeek && (
        <div
          aria-label={dict.usage_forecast.day_picker}
          className="grid grid-cols-7 gap-1"
          role="tablist"
        >
          {DAY_KEYS.map((key, day) => (
            <button
              aria-selected={selectedDay === day}
              aria-controls={tabPanelId}
              className={`min-h-10 rounded-md px-1 text-xs font-medium transition-colors ${selectedDay === day ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              id={`${tabPanelId}-tab-${day}`}
              key={key}
              onClick={() => setSelectedDay(day)}
              onKeyDown={(event) => {
                let nextDay: number | null = null;
                if (event.key === "ArrowLeft") {
                  nextDay = (day + DAY_KEYS.length - 1) % DAY_KEYS.length;
                } else if (event.key === "ArrowRight") {
                  nextDay = (day + 1) % DAY_KEYS.length;
                } else if (event.key === "Home") {
                  nextDay = 0;
                } else if (event.key === "End") {
                  nextDay = DAY_KEYS.length - 1;
                }
                if (nextDay !== null) {
                  event.preventDefault();
                  moveDay(nextDay);
                }
              }}
              ref={(element) => {
                tabRefs.current[day] = element;
              }}
              role="tab"
              tabIndex={selectedDay === day ? 0 : -1}
              type="button"
            >
              {dict.sports.days[key]}
              {day === todayIndex && (
                <span className="sr-only"> ({dict.usage_forecast.today})</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div
        aria-labelledby={
          hasWeek ? `${tabPanelId}-tab-${selectedDay}` : undefined
        }
        id={hasWeek ? tabPanelId : undefined}
        role={hasWeek ? "tabpanel" : undefined}
        tabIndex={hasWeek ? 0 : undefined}
      >
        {hours.length > 0 ? (
          <>
            <div>
              <DetailBars
                fresh={snapshotFresh}
                hours={hours}
                currentHour={isToday ? today : -1}
                isToday={isToday}
                dict={dict}
              />
              {isToday && (
                <ForecastLegend
                  dict={dict}
                  showObserved={hasObserved}
                  showPredicted={hasPredicted}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {(kind === "vacancy"
                ? dict.usage_forecast.peak_reference_vacancy
                : dict.usage_forecast.peak_reference_people
              ).replace("{value}", String(Math.round(expectedMaximum)))}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {dict.usage_forecast.no_pattern}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        {peaks.length > 0 && (
          <p>
            <span className="font-medium text-foreground">
              {dict.usage_forecast.busiest_label}
            </span>{" "}
            {peaks.map(formatUsageWindow).filter(Boolean).join(", ")}
          </p>
        )}
        {bestTime && (
          <p>
            <span className="font-medium text-foreground">
              {dict.usage_forecast.quietest_label}
            </span>{" "}
            {formatUsageWindow(bestTime)}
          </p>
        )}
        {quality && <p>{quality}</p>}
      </div>
    </div>
  );
}

export function UsageForecast({
  series,
  kind,
  capacity,
  now = new Date(),
  liveValue,
  generatedAt,
  onOpenDetails,
  variant = "row",
}: UsageForecastProps) {
  const dict = useDictionary();
  const [detailOpen, setDetailOpen] = useState(false);
  const state = getUsageForecastState(series);

  if (state !== "ready") return null;

  const effectiveCapacity = capacity ?? series.capacity;
  if (variant === "detail") {
    return (
      <DetailView
        capacity={effectiveCapacity}
        dict={dict}
        kind={kind}
        now={now}
        generatedAt={generatedAt}
        series={series}
      />
    );
  }

  const currentRawValue = liveValue === undefined ? series.current : liveValue;
  const currentBusyness = toBusyness(currentRawValue, kind, effectiveCapacity);
  const hours = makeTodayHours(series, kind, effectiveCapacity);
  const currentHour = currentTaipeiHour(now);
  const snapshotFresh =
    generatedAt !== null &&
    generatedAt !== undefined &&
    isUsageSnapshotFresh(generatedAt, now);
  const verdict = snapshotFresh
    ? getUsageVerdict(
        series,
        kind,
        effectiveCapacity,
        currentTaipeiTime(now),
        currentRawValue,
      )
    : null;
  const next = series.next
    .map((point) =>
      kind === "vacancy"
        ? { t: point.t, expected: Math.max(0, point.expected) }
        : toBusynessNextPoint(point, kind, effectiveCapacity),
    )
    .filter(
      (point): point is { t: string; expected: number } =>
        point.expected !== null,
    );
  const sentence = pickUsageSentence({
    currentTime: currentTaipeiTime(now),
    verdict,
    kind,
    next,
    peaks: series.peaks,
    bestTime: series.bestTime,
  });
  const detailId = `usage-forecast-detail-${series.id}`;
  const sentenceText = sentence
    ? sentence.key === "busy_until"
      ? withTime(dict.usage_forecast.sentence_busy_until, sentence.time)
      : sentence.key === "gets_busy_around"
        ? withTime(dict.usage_forecast.sentence_gets_busy_around, sentence.time)
        : sentence.key === "usually_quietest"
          ? withWindow(
              dict.usage_forecast.sentence_usually_quietest,
              sentence.window,
            )
          : withValueAndUnit(
              dict.usage_forecast.sentence_forecast,
              String(sentence.value ?? 0),
              sentence.unit === "free_seats"
                ? dict.usage_forecast.free_seats_unit
                : dict.usage_forecast.people_unit,
            )
    : null;

  return (
    <div className="min-w-0 pt-1">
      <div className="flex min-w-0 items-center gap-2">
        {verdict && (
          <span
            className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${verdictClass(verdict)}`}
          >
            {verdictLabel(dict, verdict)}
          </span>
        )}
        {sentenceText && (
          <p
            className="min-w-0 flex-1 truncate whitespace-nowrap text-xs leading-5 text-muted-foreground"
            title={sentenceText}
          >
            {sentenceText}
          </p>
        )}
        {!onOpenDetails && (
          <button
            aria-controls={detailId}
            aria-expanded={detailOpen}
            aria-label={dict.usage_forecast.details}
            className="-my-2 inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setDetailOpen((open) => !open)}
            title={dict.usage_forecast.details}
            type="button"
          >
            {detailOpen ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <PopularTimesStrip
        currentHour={currentHour}
        currentValue={currentBusyness}
        dict={dict}
        hours={hours}
      />

      {detailOpen && !onOpenDetails && (
        <div className="mt-3" id={detailId}>
          <DetailView
            capacity={effectiveCapacity}
            dict={dict}
            kind={kind}
            now={now}
            generatedAt={generatedAt}
            series={series}
          />
        </div>
      )}
    </div>
  );
}

export default UsageForecast;
