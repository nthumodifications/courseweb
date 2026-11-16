import { useEffect, useMemo, useRef } from "react";
import useCustomMenu from "@/app/[lang]/(mods-pages)/courses/useCustomMenu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { toPrettySemester } from "@/helpers/semester";
import useDictionary from "@/dictionaries/useDictionary";
import { useDefaultSemesterId, useSemesters } from "@/hooks/useSemesters";
import { shouldDefaultSemester } from "@/app/[lang]/(mods-pages)/courses/semesterDefault";

const SemesterSelector = () => {
  const dict = useDictionary();
  const semesters = useSemesters();
  const defaultSemester = useDefaultSemesterId();
  const hasUserSelectedSemester = useRef(false);
  const lastDefaultedSemester = useRef<string>();
  const { items, refine, canRefine } = useCustomMenu({
    attribute: "semester",
  });

  // Find the currently selected semester
  const selected = useMemo(
    () => items.find((item) => item.isRefined)?.value ?? defaultSemester,
    [defaultSemester, items],
  );

  useEffect(() => {
    if (
      selected &&
      !lastDefaultedSemester.current &&
      !hasUserSelectedSemester.current
    ) {
      lastDefaultedSemester.current = selected;
    }
    if (
      shouldDefaultSemester({
        canRefine,
        hasRefinedItem: items.some((item) => item.isRefined),
        refinedSemester: selected,
        hasExplicitSemester: false,
        hasUserSelectedSemester: hasUserSelectedSemester.current,
        lastDefaultedSemester: lastDefaultedSemester.current,
        defaultSemester,
      })
    ) {
      if (selected !== defaultSemester) refine(defaultSemester);
      lastDefaultedSemester.current = defaultSemester;
    }
  }, [canRefine, defaultSemester, items, refine, selected]);

  const handleSelect = (v: string) => {
    hasUserSelectedSemester.current = true;
    if (v !== selected) {
      refine(v);
    }
  };

  return (
    <Select value={selected} onValueChange={handleSelect}>
      <SelectTrigger
        className="bg-background min-h-11"
        aria-label={dict.planner.coursePicker.selectSemester}
      >
        <SelectValue placeholder={dict.planner.coursePicker.selectSemester}>
          {selected
            ? toPrettySemester(selected) + " " + dict.course.refine.semester
            : dict.planner.coursePicker.selectSemester}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {[...semesters]
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
