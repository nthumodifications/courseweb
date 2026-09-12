import { timetableColors } from "@courseweb/shared";
import useDictionary from "@/dictionaries/useDictionary";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { TimetableThemePreview } from "./TimetableThemePreview";

export const TimetableThemeList = () => {
  const { timetableTheme, setTimetableTheme } = useUserTimetable();
  const dict = useDictionary();

  return (
    <div className="flex flex-row flex-wrap gap-2">
      {Object.keys(timetableColors).map((theme) => (
        <TimetableThemePreview
          key={theme}
          theme={theme}
          label={
            dict.settings.timetable.theme.options[
              theme as keyof typeof dict.settings.timetable.theme.options
            ]
          }
          onClick={() => setTimetableTheme(theme)}
          selected={timetableTheme === theme}
        />
      ))}
    </div>
  );
};
