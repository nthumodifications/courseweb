import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useDictionary from "@/dictionaries/useDictionary";
import { toPrettySemester } from "@/helpers/semester";
import {
  getModuleBrief,
  getModuleScores,
  type ModuleVariant,
} from "@/lib/modules";
import {
  getCommonTimes,
  getDemandSeries,
  getInstructorInsights,
  getLanguages,
  getRecentFill,
  summariseScores,
  type ScoreSummary,
} from "@/lib/module-insights";
import { ModuleDemandChart } from "./ModuleDemandChart";
import { InstructorLink } from "./InstructorLink";

const STALE_TIME = 24 * 60 * 60 * 1000;

// Grades are a bonus: the page reads the same without them.
const useModuleScores = (variant: ModuleVariant) => {
  const rawIds = useMemo(
    () => variant.offerings.map((offering) => offering.raw_id),
    [variant],
  );
  const { data = [] } = useQuery({
    queryKey: ["module-scores", rawIds],
    queryFn: () => getModuleScores(rawIds),
    staleTime: STALE_TIME,
    retry: false,
  });
  return data;
};

const useScoreLabel = () => {
  const dict = useDictionary();
  return (score: ScoreSummary) =>
    `${score.average.toFixed(score.type === "gpa" ? 2 : 1)} ${
      score.type === "gpa"
        ? dict.course.module.stats.gpa_scale
        : dict.course.module.stats.percent_scale
    }`;
};

export type ModuleStatProps = {
  value: string;
  label: string;
  hint?: string;
  compact?: boolean;
};

export const ModuleStat = ({
  value,
  label,
  hint,
  compact = false,
}: ModuleStatProps) => (
  <div className="flex min-w-0 flex-col">
    <dd
      className={`break-all font-bold ${compact ? "text-lg leading-6" : value.length > 8 ? "text-lg leading-8" : "text-2xl"}`}
    >
      {value}
    </dd>
    <dt className="text-sm text-muted-foreground">{label}</dt>
    {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
  </div>
);

/** The numbers a student wants first: how full, how graded, when, in what language. */
export const ModuleStats = ({ variant }: { variant: ModuleVariant }) => {
  const dict = useDictionary();
  const labels = dict.course.module.stats;
  const scores = useModuleScores(variant);
  const scoreLabel = useScoreLabel();

  const recentFill = getRecentFill(getDemandSeries(variant.offerings));
  const score = summariseScores(scores)[0];
  const time = getCommonTimes(variant.offerings)[0];
  const languages = getLanguages(variant.offerings)
    .slice(0, 2)
    .map((entry) => entry.value)
    .join(" / ");

  if (recentFill === null && !score && !time && !languages) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
      {recentFill !== null && (
        <ModuleStat
          value={`${Math.round(recentFill * 100)}%`}
          label={labels.recent_fill}
          hint={labels.recent_fill_hint}
        />
      )}
      {score && (
        <ModuleStat
          value={scoreLabel(score).split(" ")[0]}
          label={labels.average_score}
          hint={`${
            score.type === "gpa" ? labels.gpa_scale : labels.percent_scale
          } · ${score.count} ${labels.classes}`}
        />
      )}
      {time && <ModuleStat value={time.value} label={labels.usual_time} />}
      {languages && <ModuleStat value={languages} label={labels.language} />}
    </dl>
  );
};

/** Who has taught it, how often, and their published class averages. */
export const ModuleInstructors = ({
  variant,
  lang,
  selected,
  onSelect,
}: {
  variant: ModuleVariant;
  lang: string;
  selected: string | null;
  onSelect: (key: string | null) => void;
}) => {
  const dict = useDictionary();
  const [expanded, setExpanded] = useState(false);
  const scores = useModuleScores(variant);
  const scoreLabel = useScoreLabel();
  const instructors = getInstructorInsights(variant.offerings, scores);
  const visible = expanded ? instructors : instructors.slice(0, 6);

  if (instructors.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-bold">{dict.course.module.instructors}</h3>
      <ul className="flex flex-col divide-y divide-border">
        {visible.map((instructor) => {
          const active = selected === instructor.key;
          const score = instructor.scores[0];
          return (
            <li key={instructor.key}>
              <div className="flex w-full flex-row items-baseline gap-2 py-2 text-left text-sm">
                <InstructorLink
                  lang={lang}
                  name={instructor.key}
                  className={active ? "font-bold text-nthu-600" : "font-medium"}
                >
                  {lang === "en"
                    ? instructor.nameEn || instructor.nameZh
                    : instructor.nameZh}
                </InstructorLink>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(active ? null : instructor.key)}
                  className="flex min-w-0 flex-1 flex-row items-baseline gap-2 text-left"
                >
                  <span className="text-muted-foreground">
                    {instructor.semesters.length}{" "}
                    {dict.course.module.semesters_count} ·{" "}
                    {toPrettySemester(instructor.latestSemester)}
                  </span>
                  {score && (
                    <span className="ml-auto whitespace-nowrap text-muted-foreground">
                      {dict.course.module.average_short} {scoreLabel(score)}
                    </span>
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {instructors.length > 6 && (
        <button
          type="button"
          className="w-fit text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded
            ? dict.course.module.show_fewer
            : `+${instructors.length - 6}`}
        </button>
      )}
    </section>
  );
};

/** The description from the most recent syllabus that has one. */
export const ModuleBrief = ({ variant }: { variant: ModuleVariant }) => {
  const dict = useDictionary();
  const [open, setOpen] = useState(false);
  const latest = variant.offerings.at(-1);
  const { data: brief } = useQuery({
    queryKey: ["module-brief", latest?.raw_id],
    queryFn: () => getModuleBrief(latest!.raw_id),
    enabled: Boolean(latest),
    staleTime: STALE_TIME,
    retry: false,
  });

  if (!brief || !latest) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-bold">{dict.course.module.brief}</h3>
      <p className={`text-sm ${open ? "" : "line-clamp-4"}`}>
        {brief.replace(/\s*\r?\n\s*/g, " ")}
      </p>
      <div className="flex flex-row items-center gap-2 text-xs text-muted-foreground">
        <span>
          {dict.course.module.brief_from.replace(
            "{semester}",
            toPrettySemester(latest.semester),
          )}
        </span>
        <button
          type="button"
          className="underline-offset-4 hover:underline"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? dict.course.module.show_fewer : dict.course.module.show_all}
        </button>
      </div>
    </section>
  );
};

/** Seats filled per semester. Needs at least two semesters to be a trend. */
export const ModuleDemand = ({ variant }: { variant: ModuleVariant }) => {
  const dict = useDictionary();
  const series = getDemandSeries(variant.offerings);
  if (series.length < 2) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-bold">{dict.course.module.demand.title}</h3>
      <p className="text-sm text-muted-foreground">
        {dict.course.module.demand.caption}
      </p>
      <ModuleDemandChart series={series} />
    </section>
  );
};
