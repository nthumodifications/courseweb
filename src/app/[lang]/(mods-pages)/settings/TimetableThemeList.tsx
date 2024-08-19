"use client";
import { timetableColors } from "@/const/timetableColors";
import { useSettings } from "@/hooks/contexts/settings";
import { TimetableThemePreview } from "./TimetableThemePreview";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";

export const TimetableThemeList = () => {
  const { timetableTheme, setTimetableTheme } = useUserTimetable();
  return (
    <div className="flex flex-row flex-wrap gap-2">
      {Object.keys(timetableColors).map((theme, index) => (
        <TimetableThemePreview
          key={index}
          theme={theme}
          onClick={() => setTimetableTheme(theme)}
          selected={timetableTheme == theme}
        />
      ))}
    </div>
  );
};
