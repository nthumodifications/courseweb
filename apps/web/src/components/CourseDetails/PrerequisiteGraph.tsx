import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  buildPrerequisiteGraph,
  type ParsedPrerequisites,
  type PrerequisiteGraph,
  type PrerequisiteGraphCourse,
  type PrerequisiteGraphNode,
  type PrerequisiteGraphRow,
} from "@courseweb/shared";
import type useDictionary from "@/dictionaries/useDictionary";
import { createModuleKey } from "@/lib/modules";

type DetailsDictionary = ReturnType<typeof useDictionary>["course"]["details"];

type EdgeDefinition = {
  from: string;
  to: string;
  dashed?: boolean;
};

type EdgeLayout = {
  width: number;
  height: number;
  paths: { d: string; dashed: boolean }[];
};

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const nodeText = (
  node: PrerequisiteGraphNode,
  labels: DetailsDictionary,
  department?: string,
) => (
  <>
    {department && <span className="opacity-60">{department} </span>}
    {node.mustNotHaveTaken && (
      <span className="opacity-60">{labels.prerequisite_not_taken_prefix}</span>
    )}
    <span className="break-words">{node.name}</span>
    {node.minimumGrade && (
      <span className="opacity-60">
        {node.minimumGrade} {labels.prerequisite_grade_above}
      </span>
    )}
  </>
);

const nodeClass = (node: PrerequisiteGraphNode, anchor = false) =>
  [
    "flex w-fit min-w-0 max-w-full flex-row items-center gap-2 rounded-md px-2 py-0.5 text-sm leading-5 select-none",
    anchor
      ? "bg-nthu-500 font-medium text-white"
      : node.mustNotHaveTaken
        ? "border border-dashed border-border bg-transparent text-foreground"
        : "bg-muted text-foreground",
  ].join(" ");

const formatAriaNode = (
  node: PrerequisiteGraphNode,
  labels: DetailsDictionary,
) => {
  const prefix = node.mustNotHaveTaken
    ? labels.prerequisite_aria_not_taken
    : "";
  const grade = node.minimumGrade
    ? ` (${node.minimumGrade} ${labels.prerequisite_grade_above})`
    : "";
  return `${prefix ? `${prefix} ` : ""}${node.name}${grade}`;
};

const formatAriaLabel = (
  graph: PrerequisiteGraph,
  labels: DetailsDictionary,
) => {
  const requirements = graph.requirements.map((group) => {
    const items = group.items
      .map((node) => formatAriaNode(node, labels))
      .join(labels.prerequisite_aria_separator);
    if (group.items.every((node) => node.mustNotHaveTaken)) {
      return `${labels.prerequisite_aria_not_taken} ${group.items
        .map((node) =>
          formatAriaNode({ ...node, mustNotHaveTaken: false }, labels),
        )
        .join(labels.prerequisite_aria_separator)}`;
    }
    return `${group.mode === "any" ? labels.prerequisite_aria_any : labels.prerequisite_aria_all} ${items}`;
  });
  const requires = `${labels.prerequisite_requires}${labels.prerequisite_aria_requires_separator}${requirements.join(
    labels.prerequisite_aria_group_separator,
  )}${labels.prerequisite_aria_sentence_end}`;
  if (graph.unlocks.length === 0) return requires;
  return `${requires}${labels.prerequisite_aria_unlock_separator}${labels.prerequisite_unlocks}${labels.prerequisite_aria_requires_separator}${graph.unlocks
    .map((node) => formatAriaNode(node, labels))
    .join(
      labels.prerequisite_aria_separator,
    )}${labels.prerequisite_aria_sentence_end}`;
};

const getEdgePath = (
  from: HTMLElement,
  to: HTMLElement,
  container: DOMRect,
  wide: boolean,
) => {
  const fromRect = from.getBoundingClientRect();
  const toRect = to.getBoundingClientRect();

  if (wide) {
    const startX = fromRect.right - container.left;
    const startY = fromRect.top + fromRect.height / 2 - container.top;
    const endX = toRect.left - container.left;
    const endY = toRect.top + toRect.height / 2 - container.top;
    const control = Math.max(24, Math.abs(endX - startX) / 2);
    return `M ${startX} ${startY} C ${startX + control} ${startY}, ${endX - control} ${endY}, ${endX} ${endY}`;
  }

  const startX = fromRect.left + fromRect.width / 2 - container.left;
  const startY = fromRect.bottom - container.top;
  const endX = toRect.left + toRect.width / 2 - container.left;
  const endY = toRect.top - container.top;
  const control = Math.max(24, Math.abs(endY - startY) / 2);
  return `M ${startX} ${startY} C ${startX} ${startY + control}, ${endX} ${endY - control}, ${endX} ${endY}`;
};

const PrerequisiteGraph = ({
  course,
  parsed,
  rows,
  lang,
  labels,
}: {
  course: PrerequisiteGraphCourse;
  parsed: ParsedPrerequisites;
  rows: readonly PrerequisiteGraphRow[];
  lang: "en" | "zh";
  labels: DetailsDictionary;
}) => {
  const graph = useMemo(
    () => buildPrerequisiteGraph(course, parsed, rows),
    [course, parsed, rows],
  );
  const [wide, setWide] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [edgeLayout, setEdgeLayout] = useState<EdgeLayout>({
    width: 0,
    height: 0,
    paths: [],
  });
  const [narrowAnchorCenter, setNarrowAnchorCenter] = useState<number | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const markerId = `prerequisite-graph-arrow-${useId().replaceAll(":", "")}`;

  const visibleUnlocks = useMemo(
    () => (expanded ? graph.unlocks : graph.unlocks.slice(0, 6)),
    [expanded, graph.unlocks],
  );
  const remainingUnlocks = graph.unlocks.length - visibleUnlocks.length;
  const unlockNodes = useMemo(
    () =>
      remainingUnlocks
        ? [
            ...visibleUnlocks,
            { name: `+${remainingUnlocks}`, courseRawId: undefined },
          ]
        : visibleUnlocks,
    [remainingUnlocks, visibleUnlocks],
  );
  const unlockNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    graph.unlocks.forEach((node) => {
      counts.set(node.name, (counts.get(node.name) ?? 0) + 1);
    });
    return counts;
  }, [graph.unlocks]);
  const overflowKey = "unlock-more";

  const edgeDefinitions = useMemo<EdgeDefinition[]>(
    () => [
      ...graph.requirements.map((group, groupIndex) => ({
        from: `requirement-group-${groupIndex}`,
        to: "prerequisite-anchor",
        ...(group.items.every((node) => node.mustNotHaveTaken)
          ? { dashed: true }
          : {}),
      })),
      ...(graph.unlocks.length > 0
        ? [{ from: "prerequisite-anchor", to: "unlock-group" }]
        : []),
    ],
    [graph],
  );

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const bounds = container.getBoundingClientRect();
      const nextWide = bounds.width >= 560;
      if (nextWide !== wide) {
        setWide(nextWide);
        return;
      }
      if (!nextWide) {
        const anchor = nodeRefs.current.get("prerequisite-anchor");
        setNarrowAnchorCenter(
          anchor
            ? anchor.getBoundingClientRect().left +
                anchor.getBoundingClientRect().width / 2 -
                bounds.left
            : null,
        );
        setEdgeLayout({ width: 0, height: 0, paths: [] });
        return;
      }
      const paths = edgeDefinitions.flatMap((edge) => {
        const from = nodeRefs.current.get(edge.from);
        const to = nodeRefs.current.get(edge.to);
        if (!from || !to) return [];
        return [
          {
            d: getEdgePath(from, to, bounds, wide),
            dashed: !!edge.dashed,
          },
        ];
      });
      setEdgeLayout({ width: bounds.width, height: bounds.height, paths });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [edgeDefinitions, wide]);

  useIsomorphicLayoutEffect(() => {
    setExpanded(false);
  }, [graph.unlocks]);

  const registerNode = (key: string) => (element: HTMLElement | null) => {
    if (element) nodeRefs.current.set(key, element);
    else nodeRefs.current.delete(key);
  };

  const renderNode = (
    node: PrerequisiteGraphNode,
    key: string,
    anchor = false,
    department?: string,
  ) => {
    const className = nodeClass(node, anchor);
    const content = nodeText(node, labels, department);
    const href =
      node.moduleDepartment && node.moduleCourse
        ? `/${lang}/courses/module/${encodeURIComponent(createModuleKey(node.moduleDepartment, node.moduleCourse))}`
        : node.courseSearchQuery
          ? `/${lang}/courses/modules?q=${encodeURIComponent(node.courseSearchQuery)}`
          : undefined;
    if (href && !anchor) {
      return (
        <Link
          key={key}
          ref={registerNode(key)}
          to={href}
          className={`${className} cursor-pointer hover:bg-nthu-100 dark:hover:bg-nthu-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
        >
          {content}
        </Link>
      );
    }
    return (
      <div key={key} ref={registerNode(key)} className={className}>
        {content}
      </div>
    );
  };

  const renderRequirementGroup = (
    group: PrerequisiteGraph["requirements"][number],
    groupIndex: number,
  ) => {
    const groupKey = `requirement-group-${groupIndex}`;
    const isContainer = group.mode === "any" || group.items.length > 1;
    const mustNotHaveTaken = group.items.every((node) => node.mustNotHaveTaken);

    if (!isContainer) {
      return renderNode(group.items[0], groupKey);
    }

    return (
      <div
        key={groupKey}
        ref={registerNode(groupKey)}
        className={`relative w-fit max-w-full rounded-lg border border-border px-2 pt-2.5 pb-1.5 ${mustNotHaveTaken ? "border-dashed" : ""}`}
      >
        <span className="pointer-events-none absolute -top-2 left-2 bg-background px-1 text-xs text-muted-foreground">
          {mustNotHaveTaken
            ? labels.prerequisite_group_not_taken
            : group.mode === "any"
              ? labels.prerequisite_group_any
              : labels.prerequisite_group_all}
        </span>
        <div className="flex min-w-0 max-w-full flex-wrap gap-1.5">
          {group.items.map((node, itemIndex) =>
            renderNode(node, `${groupKey}-${itemIndex}`),
          )}
        </div>
      </div>
    );
  };

  const renderNarrowConnector = (key: string) => (
    <div key={key} className="relative h-6 w-full" aria-hidden="true">
      <svg
        className="absolute top-1/2 h-5 w-[6px] -translate-x-1/2 -translate-y-1/2 text-border"
        style={{ left: narrowAnchorCenter ?? "50%" }}
        viewBox="0 0 6 20"
      >
        <path
          d="M 3 0 V 17 M 0 14 L 3 17 L 6 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={formatAriaLabel(graph, labels)}
      className="relative min-w-0"
    >
      {wide && (
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible text-border"
          viewBox={`0 0 ${edgeLayout.width} ${edgeLayout.height}`}
          aria-hidden="true"
        >
          <defs>
            <marker
              id={markerId}
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 0 L 6 3 L 0 6 z" fill="currentColor" />
            </marker>
          </defs>
          {edgeLayout.paths.map((edge, index) => (
            <path
              key={index}
              d={edge.d}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray={edge.dashed ? "4 4" : undefined}
              markerEnd={`url(#${markerId})`}
            />
          ))}
        </svg>
      )}

      <div
        className={
          wide
            ? "relative z-10 grid min-w-0 grid-cols-[minmax(0,35%)_auto_minmax(0,1fr)] items-center gap-x-12"
            : "relative z-10 flex min-w-0 flex-col items-stretch"
        }
      >
        <div className="min-w-0 max-w-full">
          <div className="flex min-w-0 flex-col gap-3">
            {graph.requirements.map((group, index) => (
              <Fragment key={`requirement-${index}`}>
                {index > 0 && !wide && (
                  <span className="text-sm text-muted-foreground">
                    {labels.prerequisite_and}
                  </span>
                )}
                {renderRequirementGroup(group, index)}
              </Fragment>
            ))}
          </div>
        </div>

        {!wide &&
          graph.requirements.length > 0 &&
          renderNarrowConnector("requirements-to-anchor")}

        <div className="min-w-0 justify-self-center">
          {renderNode({ name: course.name_zh }, "prerequisite-anchor", true)}
        </div>

        {!wide &&
          graph.unlocks.length > 0 &&
          renderNarrowConnector("anchor-to-unlocks")}

        {graph.unlocks.length > 0 && (
          <div className="min-w-0 max-w-full justify-self-start">
            <div
              ref={registerNode("unlock-group")}
              className="relative w-fit max-w-full rounded-lg border border-border px-2 pt-2.5 pb-1.5"
            >
              <span className="pointer-events-none absolute -top-2 left-2 bg-background px-1 text-xs text-muted-foreground">
                {labels.prerequisite_unlocks}
              </span>
              <div className="flex min-w-0 max-w-full flex-wrap gap-1.5">
                {unlockNodes.map((node, index) => {
                  if (!node.courseRawId) {
                    return (
                      <button
                        key={overflowKey}
                        type="button"
                        className="w-fit rounded-md bg-muted px-2 py-0.5 text-sm leading-5 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label={labels.prerequisite_show_more.replace(
                          "{count}",
                          String(remainingUnlocks),
                        )}
                        onClick={() => setExpanded(true)}
                      >
                        {node.name}
                      </button>
                    );
                  }
                  const department =
                    unlockNameCounts.get(node.name)! > 1 &&
                    node.moduleDepartment !== course.department
                      ? node.moduleDepartment
                      : undefined;
                  return renderNode(node, `unlock-${index}`, false, department);
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrerequisiteGraph;
