import type {
  PrerequisiteGraph,
  PrerequisiteGraphNode,
  ParsedPrerequisites,
} from "@courseweb/shared";
import type useDictionary from "@/dictionaries/useDictionary";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import { createModuleKey } from "@/lib/modules";
import { CourseDialogLink } from "./CourseDialog";

type Dictionary = ReturnType<typeof useDictionary>;

const ModulePrerequisiteNode = ({
  node,
  lang,
  dict,
  localizeData,
}: {
  node: PrerequisiteGraphNode;
  lang: "en" | "zh";
  dict: Dictionary;
  localizeData: (value: string) => string;
}) => {
  const labels = dict.course.details;
  const href =
    node.moduleDepartment && node.moduleCourse
      ? `/${lang}/courses/module/${encodeURIComponent(createModuleKey(node.moduleDepartment, node.moduleCourse))}`
      : node.courseSearchQuery
        ? `/${lang}/courses/modules?q=${encodeURIComponent(node.courseSearchQuery)}`
        : undefined;
  const name = localizeData(node.name);
  const courseName = href ? (
    <CourseDialogLink
      to={href}
      className="underline decoration-muted-foreground/50 underline-offset-4 hover:text-primary"
    >
      {name}
    </CourseDialogLink>
  ) : (
    <span>{name}</span>
  );

  return (
    <span>
      {node.mustNotHaveTaken && (
        <span className="text-muted-foreground">
          {labels.prerequisite_not_taken_prefix}{" "}
        </span>
      )}
      {courseName}
      {node.minimumGrade && (
        <span className="text-muted-foreground">
          {" "}
          ({node.minimumGrade} {labels.prerequisite_grade_above})
        </span>
      )}
    </span>
  );
};

const ModulePrerequisiteList = ({
  parsed,
  graph,
  lang,
  dict,
}: {
  parsed: ParsedPrerequisites;
  graph: PrerequisiteGraph;
  lang: "en" | "zh";
  dict: Dictionary;
}) => {
  const localizeData = useLocalizedZhData();
  const labels = dict.course.details;
  const audience =
    parsed.audience === "全校"
      ? labels.prerequisite_all_students
      : parsed.audience
        ? localizeData(parsed.audience)
        : undefined;
  const requirements = graph.requirements.map((group, index) => {
    const onlyNotTaken =
      group.mode === "all" &&
      group.items.length > 0 &&
      group.items.every((node) => node.mustNotHaveTaken);

    return (
      <li key={`requirement-${index}`} className="py-2">
        <span className="font-medium">
          {onlyNotTaken
            ? labels.prerequisite_not_taken_sentence
            : `${group.mode === "any" ? labels.prerequisite_group_any : labels.prerequisite_requires}${lang === "en" ? ": " : "："}`}
        </span>
        <span>
          {group.items.map((node, nodeIndex) => (
            <span key={`${node.name}-${nodeIndex}`}>
              {nodeIndex > 0 && (lang === "en" ? ", " : "、")}
              <ModulePrerequisiteNode
                node={
                  onlyNotTaken ? { ...node, mustNotHaveTaken: false } : node
                }
                lang={lang}
                dict={dict}
                localizeData={localizeData}
              />
            </span>
          ))}
        </span>
      </li>
    );
  });
  const unlocks = graph.unlocks.length > 0 && (
    <li className="border-t border-border py-2">
      <span className="font-medium">{labels.prerequisite_unlocks}: </span>
      <span>
        {graph.unlocks.map((node, index) => (
          <span key={`${node.moduleDepartment}-${node.moduleCourse}`}>
            {index > 0 && (lang === "en" ? ", " : "、")}
            <ModulePrerequisiteNode
              node={node}
              lang={lang}
              dict={dict}
              localizeData={localizeData}
            />
          </span>
        ))}
      </span>
    </li>
  );

  return (
    <div className="flex flex-col text-sm leading-relaxed">
      {audience && (
        <p className="mb-2 text-muted-foreground">
          {labels.prerequisite_applies_to}
          {audience}
        </p>
      )}
      <ul className="divide-y divide-border">
        {requirements}
        {unlocks}
      </ul>
    </div>
  );
};

export default ModulePrerequisiteList;
