import type { ParsedPrerequisites, PrerequisiteNode } from "@courseweb/shared";
import type useDictionary from "@/dictionaries/useDictionary";

type Leaf = Extract<PrerequisiteNode, { type: "course" | "unparsed" }>;
type Group = { mode: "all" | "any"; items: Leaf[] };

// "A or B, and C or D" arrives as a tree; a student reads it as a short list
// of groups, so flatten it to that.
const toGroups = (nodes: PrerequisiteNode[], mode: Group["mode"]): Group[] => {
  const groups: Group[] = [];
  const leaves: Leaf[] = [];
  for (const node of nodes) {
    if (node.type === "course" || node.type === "unparsed") leaves.push(node);
    else {
      groups.push(
        ...toGroups(node.children, node.type === "anyOf" ? "any" : "all"),
      );
    }
  }
  return leaves.length > 0 ? [{ mode, items: leaves }, ...groups] : groups;
};

const PrerequisiteBlock = ({
  parsed,
  dict,
}: {
  parsed: ParsedPrerequisites;
  dict: ReturnType<typeof useDictionary>;
}) => {
  const labels = dict.course.details;
  const groups = toGroups(parsed.nodes, "all");
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
      {groups.map((group, index) => (
        <div key={index} className="flex flex-col gap-1">
          <p className="text-muted-foreground">
            {index > 0 && `${labels.prerequisite_and} `}
            {group.items.length > 1 &&
              (group.mode === "any"
                ? labels.prerequisite_any_of
                : labels.prerequisite_all_of)}
          </p>
          <div className="flex flex-row flex-wrap gap-2">
            {group.items.map((item, itemIndex) => (
              // Same chip as the programme tags in the page header.
              <div
                key={itemIndex}
                className="flex flex-row items-center gap-2 rounded-md bg-muted px-2 py-2 text-sm text-foreground select-none"
              >
                {item.type === "course" ? (
                  <>
                    {item.mustNotHaveTaken && (
                      <span className="opacity-60">
                        {labels.prerequisite_not_taken_prefix}
                      </span>
                    )}
                    <span>{item.name}</span>
                    {item.minimumGrade && (
                      <span className="opacity-60">
                        {item.minimumGrade} {labels.prerequisite_grade_above}
                      </span>
                    )}
                  </>
                ) : (
                  <span>{item.rawText}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PrerequisiteBlock;
