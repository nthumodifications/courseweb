import type {
  ParsedPrerequisites,
  PrerequisiteGraphCourse,
  PrerequisiteGraphRow,
} from "@courseweb/shared";
import type useDictionary from "@/dictionaries/useDictionary";
import PrerequisiteGraph from "./PrerequisiteGraph";

const PrerequisiteBlock = ({
  parsed,
  course,
  rows,
  lang,
  dict,
}: {
  parsed: ParsedPrerequisites;
  course: PrerequisiteGraphCourse;
  rows: readonly PrerequisiteGraphRow[];
  lang: "en" | "zh";
  dict: ReturnType<typeof useDictionary>;
}) => {
  const labels = dict.course.details;
  const audience =
    parsed.audience === "全校"
      ? labels.prerequisite_all_students
      : parsed.audience;

  return (
    <div className="flex flex-col gap-2 text-sm">
      {audience && (
        <p className="text-muted-foreground">
          {labels.prerequisite_applies_to}
          {audience}
        </p>
      )}
      <PrerequisiteGraph
        course={course}
        parsed={parsed}
        rows={rows}
        lang={lang}
        labels={labels}
      />
    </div>
  );
};

export default PrerequisiteBlock;
