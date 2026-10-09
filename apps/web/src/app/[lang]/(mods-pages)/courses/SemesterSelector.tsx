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
import { lastSemester, semesterInfo } from "@courseweb/shared";
import useDictionary from "@/dictionaries/useDictionary";
import { shouldDefaultSemester } from "./semesterDefault";

const SemesterSelector = () => {
  const dict = useDictionary();
  const [searchParams] = useSearchParams();
  const hasUserSelectedSemester = useRef(false);
  const hasDefaultedSemester = useRef(false);
  // refine semester for semester selector
  const { items, refine, canRefine } = useCustomMenu({
    attribute: "semester",
  });

  useEffect(() => {
    if (
      shouldDefaultSemester({
        canRefine,
        hasRefinedItem: items.some((item) => item.isRefined),
        hasExplicitSemester:
          searchParams.get("nthu_courses[menu][semester]") !== null,
        hasUserSelectedSemester: hasUserSelectedSemester.current,
        hasDefaultedSemester: hasDefaultedSemester.current,
      })
    ) {
      // default to the latest semester
      hasDefaultedSemester.current = true;
      refine(lastSemester.id);
    }
  }, [canRefine, items, refine, searchParams]);

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
      <SelectTrigger className="w-[200px] ">
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
