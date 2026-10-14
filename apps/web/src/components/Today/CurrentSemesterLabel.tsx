import { currentSemester } from "@courseweb/shared";
import { useMemo } from "react";
import type useDictionary from "@/dictionaries/useDictionary";

type Dictionary = ReturnType<typeof useDictionary>;

const CurrentSemesterLabel = ({
  language,
  dictionary,
}: {
  language: "en" | "zh";
  dictionary: Dictionary;
}) => {
  const dict = dictionary;
  let semesterYear: number | null = null;
  if (currentSemester) {
    semesterYear =
      language === "en" ? currentSemester.year : currentSemester.year - 1911;
  }
  const currentWeek = useMemo(
    () =>
      currentSemester
        ? Math.floor(
            (Date.now() - currentSemester.begins.getTime()) /
              (1000 * 60 * 60 * 24 * 7),
          ) + 1
        : null,
    [],
  );

  return (
    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
      {currentSemester
        ? dict.today.current_semester.in_semester
            .replace("{year}", String(semesterYear))
            .replace("{semester}", String(currentSemester.semester))
            .replace("{week}", String(currentWeek))
        : dict.today.current_semester.holiday}
    </p>
  );
};

export default CurrentSemesterLabel;
