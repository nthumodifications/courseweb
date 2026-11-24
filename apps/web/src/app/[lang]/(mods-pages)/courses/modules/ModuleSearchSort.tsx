import { useEffect } from "react";
import { useSearchBox, useSortBy } from "react-instantsearch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { MODULE_SEARCH_INDEX_NAMES } from "@/lib/module-search-client";

const ModuleSearchSort = () => {
  const dict = useDictionary();
  const { query } = useSearchBox();
  const hasQuery = Boolean(query.trim());
  const relevance = MODULE_SEARCH_INDEX_NAMES.relevance;
  const courseCode = MODULE_SEARCH_INDEX_NAMES.courseCode;
  const { currentRefinement, refine } = useSortBy({
    items: [
      {
        label: dict.course.module.sort.relevance,
        value: MODULE_SEARCH_INDEX_NAMES.relevance,
      },
      {
        label: dict.course.module.sort.courseCode,
        value: MODULE_SEARCH_INDEX_NAMES.courseCode,
      },
      {
        label: dict.course.module.sort.mostRecent,
        value: MODULE_SEARCH_INDEX_NAMES.recent,
      },
      {
        label: dict.course.module.sort.timesOffered,
        value: MODULE_SEARCH_INDEX_NAMES.timesOffered,
      },
      {
        label: dict.course.module.sort.fillRate,
        value: MODULE_SEARCH_INDEX_NAMES.fillRate,
      },
    ],
  });
  const selectedSort =
    !hasQuery && currentRefinement === relevance
      ? courseCode
      : currentRefinement;

  useEffect(() => {
    if (!hasQuery && currentRefinement === relevance) refine(courseCode);
  }, [courseCode, currentRefinement, hasQuery, refine, relevance]);

  return (
    <Select value={selectedSort} onValueChange={refine}>
      <SelectTrigger
        className="w-32 shrink-0 sm:w-44"
        aria-label={dict.course.module.sort.label}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {hasQuery && (
          <SelectItem value={relevance}>
            {dict.course.module.sort.relevance}
          </SelectItem>
        )}
        <SelectItem value={MODULE_SEARCH_INDEX_NAMES.courseCode}>
          {dict.course.module.sort.courseCode}
        </SelectItem>
        <SelectItem value={MODULE_SEARCH_INDEX_NAMES.recent}>
          {dict.course.module.sort.mostRecent}
        </SelectItem>
        <SelectItem value={MODULE_SEARCH_INDEX_NAMES.timesOffered}>
          {dict.course.module.sort.timesOffered}
        </SelectItem>
        <SelectItem value={MODULE_SEARCH_INDEX_NAMES.fillRate}>
          {dict.course.module.sort.fillRate}
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default ModuleSearchSort;
