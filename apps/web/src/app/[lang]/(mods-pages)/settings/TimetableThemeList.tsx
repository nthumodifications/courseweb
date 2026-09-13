import { timetableColors } from "@courseweb/shared";
import { TimetableThemePreview } from "./TimetableThemePreview";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import useDictionary from "@/dictionaries/useDictionary";

export const TimetableThemeList = () => {
  const { timetableTheme, setTimetableTheme } = useUserTimetable();
  const dict = useDictionary();
  return (
    <div className="py-4">
      <h3 className="mb-2 text-sm font-bold">
        {dict.settings.timetable.theme.title}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
    </div>
  );
};
