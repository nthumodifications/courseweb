import { useEffect, useMemo, useState } from "react";
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

const SemesterSelector = () => {
  const [initialized, setInitialized] = useState(false);
  const { items, refine, canRefine } = useCustomMenu({
    attribute: "semester",
  });

  // Find the currently selected semester
  const selected = useMemo(() => {
    const refined = items.find((item) => item.isRefined);
    return refined ? refined.value : lastSemester.id;
  }, [items]);

  // Set default semester only once on initial load
  useEffect(() => {
    if (canRefine && !initialized) {
      if (!items.some((item) => item.isRefined)) {
        refine(lastSemester.id);
      }
      setInitialized(true);
    }
  }, [canRefine, items, refine, initialized]);

  const handleSelect = (v: string) => {
    if (v !== selected) {
      refine(v);
    }
  };

  return (
    <Select value={selected} onValueChange={handleSelect}>
      <SelectTrigger className="bg-background">
        <SelectValue placeholder="Select semester">
          {selected ? toPrettySemester(selected) + " 學期" : "Select semester"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {[...semesterInfo]
          .sort((a, b) => parseInt(b.id) - parseInt(a.id))
          .map((item) => (
            <SelectItem value={item.id} key={item.id}>
              {toPrettySemester(item.id)} 學期
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
};

export default SemesterSelector;
