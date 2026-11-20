import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import useCustomMenu from "@/app/[lang]/(mods-pages)/courses/useCustomMenu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { toPrettySemester } from "@/helpers/semester";
import { semesterInfo } from "@courseweb/shared";
import useDictionary from "@/dictionaries/useDictionary";
import { shouldDefaultSemester } from "./semesterDefault";
import { useDefaultSemesterId } from "@/hooks/useSemesters";

const SemesterSelector = () => {
  const dict = useDictionary();
  const [searchParams] = useSearchParams();
  const hasUserSelectedSemester = useRef(false);
  const lastDefaultedSemester = useRef<string>();
  // refine semester for semester selector
  const { items, refine, canRefine } = useCustomMenu({
    attribute: "semester",
  });
  const selectedSemester = items.find((item) => item.isRefined)?.value;
  const defaultSemester = useDefaultSemesterId();

  useEffect(() => {
    if (
      selectedSemester &&
      !lastDefaultedSemester.current &&
      searchParams.get("nthu_courses[menu][semester]") === null &&
      !hasUserSelectedSemester.current
    ) {
      lastDefaultedSemester.current = selectedSemester;
    }
    if (
      shouldDefaultSemester({
        canRefine,
        hasRefinedItem: Boolean(selectedSemester),
        refinedSemester: selectedSemester,
        hasExplicitSemester:
          searchParams.get("nthu_courses[menu][semester]") !== null,
        hasUserSelectedSemester: hasUserSelectedSemester.current,
        lastDefaultedSemester: lastDefaultedSemester.current,
        defaultSemester,
      })
    ) {
      if (selectedSemester !== defaultSemester) refine(defaultSemester);
      lastDefaultedSemester.current = defaultSemester;
    }
  }, [canRefine, defaultSemester, refine, searchParams, selectedSemester]);

  const handleSelect = (v: string) => {
    hasUserSelectedSemester.current = true;
    refine(v);
  };

  const selected = useMemo(
    () => items.find((item) => item.isRefined)?.value,
    [items],
  );

  return (
    <Select value={selected} onValueChange={handleSelect}>
      <SelectTrigger className="w-36">
        <SelectValue placeholder={dict.course.refine.semester} />
      </SelectTrigger>
      <SelectContent>
        {[...semesterInfo]
          .sort((a, b) => Number.parseInt(b.id) - Number.parseInt(a.id))
          .map((item) => (
            <SelectItem value={item.id} key={item.id}>
              {toPrettySemester(item.id)} {dict.course.refine.semester}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
};

export default SemesterSelector;
