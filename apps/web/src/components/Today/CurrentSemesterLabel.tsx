import { currentSemester } from "@courseweb/shared";
import { useMemo } from "react";
import en from "@/dictionaries/en.json";
import zh from "@/dictionaries/zh.json";

const CurrentSemesterLabel = ({ language }: { language: "en" | "zh" }) => {
  const dict = language === "en" ? en : zh;
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
            .replace(
              "{year}",
              String(
                language === "en"
                  ? currentSemester.year
                  : currentSemester.year - 1911,
              ),
            )
            .replace("{semester}", String(currentSemester.semester))
            .replace("{week}", String(currentWeek))
        : dict.today.current_semester.holiday}
    </p>
  );
};

export default CurrentSemesterLabel;
