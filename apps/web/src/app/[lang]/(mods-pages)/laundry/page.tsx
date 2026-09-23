import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, WashingMachine, Wind } from "lucide-react";
import { Button, cn, ErrorState, Skeleton } from "@courseweb/ui";
import { Helmet } from "react-helmet-async";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import useTime from "@/hooks/useTime";
import { useLaundryStatus } from "@/hooks/useLaundryStatus";
import {
  LAUNDRY_AREAS,
  LAUNDRY_DORMS,
  LAUNDRY_MACHINES,
  type LaundryArea,
  type LaundryDorm,
  type LaundryGender,
  type LaundryMachine,
  type LaundryMachineType,
} from "@/const/laundry-machines";
import {
  remainingSeconds,
  type LaundryMachineStatus,
  type LaundryState,
} from "@/lib/laundry-status";
import {
  selectAreaMachines,
  selectAreaSummary,
  type FastestReady,
  type LaundrySummary,
} from "@/lib/laundry-selectors";

type MachineFilter = "all" | LaundryMachineType;
type GenderFilter = "all" | Exclude<LaundryGender, "mixed">;

const filterValues: MachineFilter[] = ["all", "washer", "dryer"];
const genderValues: GenderFilter[] = ["all", "male", "female"];

function replaceTemplate(
  value: string,
  replacements: Record<string, string | number>,
): string {
  return Object.entries(replacements).reduce(
    (result, [key, replacement]) =>
      result.replace(`{${key}}`, String(replacement)),
    value,
  );
}

function formatCountdown(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const remaining = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function formatReadyTime(seconds: number): string {
  return `${Math.max(1, Math.ceil(seconds / 60))}m`;
}

function machineTypeLabel(
  type: LaundryMachineType,
  dict: ReturnType<typeof useDictionary>,
): string {
  return type === "washer" ? dict.laundry.washer : dict.laundry.dryer;
}

function stateLabel(
  state: LaundryState,
  dict: ReturnType<typeof useDictionary>,
): string {
  if (state === "available") return dict.laundry.available;
  if (state === "paying") return dict.laundry.paying;
  if (state === "running") return dict.laundry.running;
  if (state === "paused") return dict.laundry.paused;
  if (state === "pickup") return dict.laundry.pickup;
  if (state === "awaiting-start") return dict.laundry.awaiting_start;
  if (state === "error") return dict.laundry.error;
  if (state === "no-data") return dict.laundry.no_data;
  if (state === "unknown") return dict.laundry.unknown;
  return dict.laundry.offline;
}

function stateClass(state: LaundryState): string {
  if (state === "available") return "text-emerald-700";
  if (state === "running") return "text-primary";
  if (state === "pickup") return "text-amber-700";
  if (state === "paying" || state === "awaiting-start" || state === "paused")
    return "text-amber-700/80";
  if (
    state === "error" ||
    state === "offline" ||
    state === "no-data" ||
    state === "unknown"
  ) {
    return "text-muted-foreground opacity-60";
  }
  return "text-foreground";
}

function genderLabel(
  gender: LaundryGender,
  dict: ReturnType<typeof useDictionary>,
): string | null {
  if (gender === "male") return dict.laundry.gender_male;
  if (gender === "female") return dict.laundry.gender_female;
  return null;
}

function areaGender(
  machines: readonly LaundryMachine[],
  area: LaundryArea,
): LaundryGender {
  const genders = new Set(
    machines
      .filter((machine) => machine.area === area)
      .map((machine) => machine.gender),
  );
  if (genders.size === 1) return [...genders][0];
  return "mixed";
}

function fastestText(
  fastest: FastestReady,
  dict: ReturnType<typeof useDictionary>,
): string {
  if (!fastest) return dict.laundry.no_ready;
  if (fastest.state === "available") return dict.laundry.ready_now;
  return replaceTemplate(dict.laundry.ready_in, {
    time: formatReadyTime(fastest.remainingSeconds),
  });
}

function isVisibleForGender(
  area: LaundryGender,
  filter: GenderFilter,
): boolean {
  return filter === "all" || area === "mixed" || area === filter;
}

function defaultExpandedAreas(dorm: LaundryDorm | ""): Set<LaundryArea> {
  return new Set(
    dorm
      ? (Object.keys(LAUNDRY_AREAS) as LaundryArea[]).filter(
          (area) => LAUNDRY_AREAS[area].dorm === dorm,
        )
      : [],
  );
}

function hasNoLiveData(
  machines: readonly LaundryMachine[],
  statuses: Readonly<Record<string, LaundryMachineStatus | undefined>>,
  area: LaundryArea,
): boolean {
  const areaMachines = machines.filter((machine) => machine.area === area);
  return (
    areaMachines.length > 0 &&
    areaMachines.every((machine) => {
      const state = statuses[machine.mac]?.state;
      return (
        state === undefined ||
        state === "offline" ||
        state === "no-data" ||
        state === "unknown"
      );
    })
  );
}

const ConnectionIndicator = ({
  state,
  dict,
}: {
  state: ReturnType<typeof useLaundryStatus>["connectionState"];
  dict: ReturnType<typeof useDictionary>;
}) => {
  const label =
    state === "live"
      ? dict.laundry.connection_live
      : state === "connecting"
        ? dict.laundry.connection_connecting
        : state === "reconnecting"
          ? dict.laundry.connection_reconnecting
          : dict.laundry.connection_error;
  const dotClass =
    state === "live"
      ? "bg-emerald-600"
      : state === "error"
        ? "bg-destructive"
        : "bg-muted-foreground";
  return (
    <span
      className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground"
      role="status"
    >
      <span aria-hidden className={cn("h-2 w-2 rounded-full", dotClass)} />
      {label}
    </span>
  );
};

const Summary = ({
  type,
  summary,
  fastest,
  dict,
}: {
  type: LaundryMachineType;
  summary: LaundrySummary;
  fastest: FastestReady;
  dict: ReturnType<typeof useDictionary>;
}) => (
  <div className="flex min-w-0 flex-col gap-1">
    <div className="flex items-center gap-2">
      {type === "washer" ? (
        <WashingMachine className="h-4 w-4 text-muted-foreground" aria-hidden />
      ) : (
        <Wind className="h-4 w-4 text-muted-foreground" aria-hidden />
      )}
      <span className="text-sm font-medium text-foreground">
        {machineTypeLabel(type, dict)}
      </span>
    </div>
    <div className="flex flex-wrap items-baseline gap-1">
      <span className="whitespace-nowrap font-bold text-foreground">
        {replaceTemplate(dict.laundry.free, {
          available: summary.available,
          total: summary.total,
        })}
      </span>
      {summary.unavailable > 0 && (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          ·{" "}
          {replaceTemplate(dict.laundry.unavailable_count, {
            count: summary.unavailable,
          })}
        </span>
      )}
    </div>
    <span
      className={cn(
        "whitespace-nowrap text-sm",
        fastest?.state === "available"
          ? "text-emerald-700"
          : "text-muted-foreground",
      )}
    >
      {fastestText(fastest, dict)}
    </span>
  </div>
);

const MachineTile = ({
  machine,
  status,
  nowMs,
  dict,
}: {
  machine: LaundryMachine;
  status: LaundryMachineStatus | undefined;
  nowMs: number;
  dict: ReturnType<typeof useDictionary>;
}) => {
  const state = status?.state ?? "no-data";
  const remaining = status ? remainingSeconds(status, nowMs) : null;
  const label = stateLabel(state, dict);
  const displayState =
    state === "running" && remaining !== null
      ? `${label} ${formatCountdown(remaining)}`
      : label;
  const doorOpen = Boolean(
    status?.flags.doorOpen && (state === "available" || state === "pickup"),
  );
  const title = replaceTemplate(dict.laundry.machine_number, {
    type: machineTypeLabel(machine.type, dict),
    number: machine.number,
  });
  const progress =
    status?.totalTime && remaining !== null
      ? Math.min(
          100,
          Math.max(
            0,
            ((status.totalTime - remaining) / status.totalTime) * 100,
          ),
        )
      : null;

  return (
    <a
      href={`https://wipepay.com.tw/v2/machine/${machine.mac}/`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-2 transition-colors hover:bg-accent",
        ["offline", "error", "no-data", "unknown"].includes(state) &&
          "opacity-60",
      )}
      aria-label={`${title}: ${displayState}`}
    >
      <div className="flex items-start gap-2">
        <span className="flex-1 text-base font-bold leading-none text-foreground">
          {machine.number}
        </span>
        <ExternalLink
          className="h-3 w-3 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </div>
      <span
        className={cn("text-xs font-medium leading-tight", stateClass(state))}
      >
        {displayState}
      </span>
      {doorOpen && (
        <span className="text-xs text-muted-foreground">
          {dict.laundry.door_open}
        </span>
      )}
      {progress !== null && (
        <span
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
          aria-label={dict.laundry.progress}
        >
          <span
            className="block h-full rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </span>
      )}
    </a>
  );
};

const LaundrySkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    {Array.from({ length: 4 }).map((_, index) => (
      <section
        className="flex flex-col gap-3 rounded-lg border border-border p-3"
        key={index}
      >
        <div className="flex items-start gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-14" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </section>
    ))}
  </div>
);

const LaundryPage = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const now = useTime(1000);
  const { statuses, connectionState, lastMessageAt, retry } =
    useLaundryStatus();
  const [myDorm, setMyDorm] = useState<LaundryDorm | "">(() => {
    if (typeof localStorage === "undefined") return "";
    try {
      const stored = localStorage.getItem("laundry_my_dorm");
      return stored && stored in LAUNDRY_DORMS ? (stored as LaundryDorm) : "";
    } catch {
      return "";
    }
  });
  const [machineFilter, setMachineFilter] = useState<MachineFilter>("all");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [expandedAreas, setExpandedAreas] = useState<Set<LaundryArea>>(() =>
    defaultExpandedAreas(myDorm),
  );

  const updateMyDorm = (value: string) => {
    const next = value as LaundryDorm | "";
    setMyDorm(next);
    if (next) {
      setExpandedAreas((current) => {
        const updated = new Set(current);
        for (const area of defaultExpandedAreas(next)) updated.add(area);
        return updated;
      });
    }
    try {
      if (next) localStorage.setItem("laundry_my_dorm", next);
      else localStorage.removeItem("laundry_my_dorm");
    } catch {
      // Private browsing and blocked storage should not prevent live status updates.
    }
  };

  const toggleArea = (area: LaundryArea) => {
    setExpandedAreas((current) => {
      const updated = new Set(current);
      if (updated.has(area)) updated.delete(area);
      else updated.add(area);
      return updated;
    });
  };

  const visibleAreas = useMemo(() => {
    return (Object.keys(LAUNDRY_AREAS) as LaundryArea[])
      .filter((area) =>
        isVisibleForGender(areaGender(LAUNDRY_MACHINES, area), genderFilter),
      )
      .filter(
        (area) =>
          machineFilter === "all" ||
          LAUNDRY_MACHINES.some(
            (machine) =>
              machine.area === area && machine.type === machineFilter,
          ),
      )
      .sort((a, b) => {
        if (!myDorm) return 0;
        return (
          Number(LAUNDRY_AREAS[b].dorm === myDorm) -
          Number(LAUNDRY_AREAS[a].dorm === myDorm)
        );
      });
  }, [genderFilter, machineFilter, myDorm]);

  const title = dict.laundry.title;
  const lastUpdated = lastMessageAt
    ? replaceTemplate(dict.laundry.last_updated, {
        time: new Date(lastMessageAt).toLocaleTimeString(
          language === "en" ? "en-US" : "zh-TW",
        ),
      })
    : null;

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${title} | NTHUMods`,
    url: `https://nthumods.com/${language}/laundry`,
    inLanguage: language === "en" ? "en-US" : "zh-TW",
    isPartOf: { "@type": "WebSite", url: "https://nthumods.com" },
  };

  if (connectionState === "error" && Object.keys(statuses).length === 0) {
    return (
      <>
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(pageJsonLd)}
          </script>
        </Helmet>
        <div className="flex flex-col px-4">
          <ErrorState
            title={dict.laundry.load_error}
            action={
              <Button variant="outline" size="sm" onClick={retry}>
                {dict.laundry.retry}
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(pageJsonLd)}</script>
      </Helmet>
      <div className="flex flex-col px-4">
        <div className="flex flex-col gap-2 border-b border-border py-2">
          <div className="no-scrollbar flex min-w-0 max-w-full items-center gap-2 overflow-x-auto whitespace-nowrap">
            <ConnectionIndicator state={connectionState} dict={dict} />
            {lastUpdated && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {lastUpdated}
              </span>
            )}
            {connectionState === "error" &&
              Object.keys(statuses).length > 0 && (
                <Button variant="outline" size="sm" onClick={retry}>
                  {dict.laundry.retry}
                </Button>
              )}
          </div>
          <div className="no-scrollbar flex min-w-0 max-w-full items-center gap-2 overflow-x-auto whitespace-nowrap">
            <select
              aria-label={dict.laundry.my_dorm}
              id="laundry-dorm"
              value={myDorm}
              onChange={(event) => updateMyDorm(event.target.value)}
              className="h-9 min-w-0 flex-1 rounded-md sm:flex-none border border-input bg-background px-2 py-1 text-sm text-foreground"
            >
              <option value="">{dict.laundry.all_dorms}</option>
              {(Object.keys(LAUNDRY_DORMS) as LaundryDorm[]).map((dorm) => (
                <option value={dorm} key={dorm}>
                  {language === "en"
                    ? LAUNDRY_DORMS[dorm].en
                    : LAUNDRY_DORMS[dorm].zh}
                </option>
              ))}
            </select>
            <div
              className="flex shrink-0 gap-1"
              role="group"
              aria-label={dict.laundry.filter}
            >
              {filterValues.map((filter) => {
                const label =
                  filter === "all"
                    ? dict.laundry.all
                    : filter === "washer"
                      ? dict.laundry.washers
                      : dict.laundry.dryers;
                // Icon-only on phones so the whole row fits on one line.
                const Icon =
                  filter === "washer"
                    ? WashingMachine
                    : filter === "dryer"
                      ? Wind
                      : null;
                return (
                  <button
                    type="button"
                    key={filter}
                    aria-pressed={machineFilter === filter}
                    onClick={() => setMachineFilter(filter)}
                    className={cn(
                      "inline-flex h-9 items-center justify-center rounded-md border px-2 py-1 text-sm font-medium transition-colors",
                      machineFilter === filter
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {Icon ? (
                      <>
                        <Icon className="h-4 w-4 sm:hidden" aria-hidden />
                        <span className="sr-only sm:not-sr-only">{label}</span>
                      </>
                    ) : (
                      label
                    )}
                  </button>
                );
              })}
            </div>
            <select
              aria-label={dict.laundry.gender}
              id="laundry-gender"
              value={genderFilter}
              onChange={(event) =>
                setGenderFilter(event.target.value as GenderFilter)
              }
              className="h-9 shrink-0 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
            >
              {genderValues.map((gender) => (
                <option value={gender} key={gender}>
                  {gender === "all"
                    ? dict.laundry.gender_all
                    : genderLabel(gender, dict)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {Object.keys(statuses).length === 0 && connectionState !== "live" ? (
          <div className="py-4">
            <LaundrySkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
            {visibleAreas.map((area, areaIndex) => {
              const areaMeta = LAUNDRY_AREAS[area];
              const machines = selectAreaMachines(
                LAUNDRY_MACHINES,
                area,
                machineFilter === "all" ? undefined : machineFilter,
              );
              const summary = selectAreaSummary(
                LAUNDRY_MACHINES,
                statuses,
                area,
                now.getTime(),
              );
              const isExpanded = expandedAreas.has(area);
              const noLiveData = hasNoLiveData(
                LAUNDRY_MACHINES,
                statuses,
                area,
              );
              const headingId = `laundry-area-heading-${areaIndex}`;
              const contentId = `laundry-area-content-${areaIndex}`;
              const groups = (["washer", "dryer"] as const)
                .map((type) => ({
                  type,
                  machines: machines.filter((machine) => machine.type === type),
                }))
                .filter(
                  ({ machines: groupMachines }) => groupMachines.length > 0,
                );
              return (
                <section
                  className="flex flex-col rounded-lg border border-border p-3"
                  key={area}
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={contentId}
                    onClick={() => toggleArea(area)}
                    className="w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <h2
                            id={headingId}
                            className="font-bold text-foreground"
                          >
                            {language === "en" ? areaMeta.en : areaMeta.zh}
                          </h2>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                              isExpanded && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </div>
                      </div>
                    </div>
                    {noLiveData ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {dict.laundry.no_live_data}
                      </p>
                    ) : (
                      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
                        <Summary
                          type="washer"
                          summary={summary.washer}
                          fastest={summary.fastestWasher}
                          dict={dict}
                        />
                        <Summary
                          type="dryer"
                          summary={summary.dryer}
                          fastest={summary.fastestDryer}
                          dict={dict}
                        />
                      </div>
                    )}
                  </button>
                  {isExpanded && (
                    <div
                      id={contentId}
                      role="region"
                      aria-labelledby={headingId}
                      className="mt-3 flex flex-col gap-3 border-t border-border pt-3"
                    >
                      {groups.map(({ type, machines: groupMachines }) => (
                        <div key={type}>
                          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                            {type === "washer" ? (
                              <WashingMachine
                                className="h-4 w-4 text-muted-foreground"
                                aria-hidden
                              />
                            ) : (
                              <Wind
                                className="h-4 w-4 text-muted-foreground"
                                aria-hidden
                              />
                            )}
                            {machineTypeLabel(type, dict)}
                          </h3>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                            {groupMachines.map((machine) => (
                              <MachineTile
                                key={machine.mac}
                                machine={machine}
                                status={statuses[machine.mac]}
                                nowMs={now.getTime()}
                                dict={dict}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <div className="h-6" />
        <footer className="flex flex-col gap-1 pb-4 text-xs text-muted-foreground">
          <span>{dict.laundry.data_source}</span>
          <span>{dict.laundry.price_note}</span>
        </footer>
      </div>
    </>
  );
};

export default LaundryPage;
