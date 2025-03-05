import { apps } from "@/const/apps";
import useDictionary from "@/dictionaries/useDictionary";
import { useSettings } from "@/hooks/contexts/settings";
import { cn } from "@/lib/utils";
import useLaunchApp from "@/hooks/useLaunchApp";

const AppItem = ({
  app,
  mini = false,
}: {
  app: (typeof apps)[number];
  mini?: boolean;
}) => {
  const { language } = useSettings();
  const dict = useDictionary();

  const [onItemClicked] = useLaunchApp(app);

  return (
    <div
      className={cn(
        !mini
          ? "flex flex-row items-center space-x-2 flex-1"
          : "flex flex-col items-center space-y-1",
        "cursor-pointer",
      )}
      onClick={onItemClicked}
    >
      <div className="p-2 rounded-lg bg-nthu-100 text-nthu-800 grid place-items-center">
        <app.Icon size={24} />
      </div>
      <div className="flex flex-col">
        <h2
          className={cn(!mini ? "font-medium" : "text-xs max-w-20 text-center")}
        >
          {language == "zh" ? app.title_zh : app.title_en}
        </h2>
      </div>
    </div>
  );
};

export default AppItem;
