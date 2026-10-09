import useDictionary from "@/dictionaries/useDictionary";
import { ModuleDemandChart } from "@/components/Courses/ModuleDemandChart";
import { ModuleStat } from "@/components/Courses/ModuleInsights";
import { ModuleTermAvailability } from "@/components/Courses/ModuleTermAvailability";
import {
  COURSE_MODULE_PREVIEW_DEMAND,
  COURSE_MODULE_PREVIEW_SEMESTERS,
  COURSE_MODULE_PREVIEW_STATS,
} from "./sampleData";

const CourseModulePreview = () => {
  const dict = useDictionary();
  const labels = dict.course.module.stats;

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-3">
      <ModuleTermAvailability
        semesters={COURSE_MODULE_PREVIEW_SEMESTERS}
        size="sm"
        className="shrink-0"
      />
      <dl className="grid shrink-0 grid-cols-2 gap-3">
        <ModuleStat
          value={COURSE_MODULE_PREVIEW_STATS[0].value}
          label={labels.recent_fill}
          hint={labels.recent_fill_hint}
          compact
        />
        <ModuleStat
          value={COURSE_MODULE_PREVIEW_STATS[1].value}
          label={labels.average_score}
          hint={`${labels.percent_scale} · 12 ${labels.classes}`}
          compact
        />
      </dl>
      <div className="min-h-0 flex-1">
        <ModuleDemandChart series={COURSE_MODULE_PREVIEW_DEMAND} size="sm" />
      </div>
    </div>
  );
};

export default CourseModulePreview;
