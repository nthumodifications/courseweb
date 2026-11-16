import { useLocalStorage } from "usehooks-ts";
import { Info, X } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";
import { toPrettySemester } from "@/helpers/semester";
import { useDefaultSemesterId, useSemesters } from "@/hooks/useSemesters";

const NewSemesterBar = () => {
  const dict = useDictionary();
  const semesters = useSemesters();
  const currentSemester = useDefaultSemesterId();
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const [dismissedSemesters, setDismissedSemesters] = useLocalStorage<
    Record<string, boolean>
  >("dismissed_new_semester_notices", {});
  const semester = semesters.find(
    (item) =>
      item.id > currentSemester &&
      item.hasCourses &&
      !dismissedSemesters[item.id],
  );

  if (!semester) return null;

  const routeLang = lang === "en" || lang === "zh-cn" ? lang : "zh";
  const localePath = `/${routeLang}`;
  const isCourseSearch = location.pathname === `${localePath}/courses`;
  const targetPath = isCourseSearch
    ? location.pathname
    : `${localePath}/timetable`;
  const searchParams = new URLSearchParams(location.search);
  searchParams.set(
    isCourseSearch ? "nthu_courses[menu][semester]" : "semester",
    semester.id,
  );
  const href = `${targetPath}?${searchParams.toString()}`;

  return (
    <div
      role="status"
      className="flex w-full items-center gap-2 border-b border-border bg-muted px-4 py-1 text-sm text-foreground"
    >
      <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="font-medium">
          {dict.alerts.new_semester.title.replace(
            "{semester}",
            toPrettySemester(semester.id),
          )}
        </span>
      </div>
      <Link to={href} className="shrink-0 underline underline-offset-2">
        {dict.alerts.new_semester.link}
      </Link>
      <button
        type="button"
        aria-label={dict.alerts.dismiss}
        className="shrink-0 rounded-sm p-1 hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() =>
          setDismissedSemesters((dismissed) => ({
            ...dismissed,
            [semester.id]: true,
          }))
        }
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default NewSemesterBar;
