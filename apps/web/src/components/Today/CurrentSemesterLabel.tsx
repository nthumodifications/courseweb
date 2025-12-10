import { useSettings } from "@/hooks/contexts/settings";
import { currentSemester } from "@courseweb/shared";
import { useMemo } from "react";

const CurrentSemesterLabel = ({ language }: { language: "en" | "zh" }) => {
  const currentWeek = useMemo(
    () =>
      currentSemester
        ? Math.floor(
            (new Date().getTime() - currentSemester.begins.getTime()) /
              (1000 * 60 * 60 * 24 * 7),
          ) + 1
        : null,
    [],
  );

  return (
    <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
      {language == "en" &&
        (currentSemester
          ? `AC${currentSemester.year} Sem ${currentSemester.semester}, Week ${currentWeek}`
          : `Holiday`)}
      {language == "zh" &&
        (currentSemester
          ? `${currentSemester.year - 1911}-${currentSemester.semester} 學期, 第${currentWeek}週`
          : `假期`)}
    </p>
  );
};

export default CurrentSemesterLabel;
