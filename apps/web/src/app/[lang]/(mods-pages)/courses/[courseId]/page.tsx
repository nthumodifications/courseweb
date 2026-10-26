import { useParams } from "react-router-dom";
import CourseDetailContainer from "@/components/CourseDetails/CourseDetailsContainer";
import { Button } from "@courseweb/ui";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Language } from "@/types/settings";
import { useEffect } from "react";
import { courseEvents } from "@/lib/trackingEvents";
import useDictionary from "@/dictionaries/useDictionary";
import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import {
  filterCourseChanges,
  formatCourseChanges,
  getCourseChangeDepartment,
  parseCourseChanges,
  type CourseChangeLabels,
  type FormattedCourseChange,
} from "./courseChanges";

const CourseChanges = ({
  changes,
  department,
  lang,
}: {
  changes: readonly FormattedCourseChange[];
  department: string;
  lang: string;
}) => {
  const dict = useDictionary();
  if (changes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-bold text-base" id="changes">
          {dict.course.details.changes.title}
        </h3>
        {department && (
          <Link
            className="text-sm text-muted-foreground underline underline-offset-2"
            to={`/${lang}/courses/changes?department=${encodeURIComponent(department)}`}
          >
            {dict.course.details.changes.feed_link}
          </Link>
        )}
      </div>
      <div className="flex flex-col divide-y divide-border">
        {changes.map((change) => (
          <article key={change.id} className="flex flex-col gap-2 py-4">
            <div className="flex flex-wrap items-baseline gap-2 text-sm">
              <time className="text-muted-foreground">{change.dateLabel}</time>
              <span className="font-medium">{change.fieldLabel}</span>
            </div>
            {change.statusLabel ? (
              <p className="text-sm">{change.statusLabel}</p>
            ) : (
              <p className="flex flex-wrap gap-2 text-sm whitespace-pre-line">
                <span className="text-muted-foreground">{change.oldValue}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-foreground">{change.newValue}</span>
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};

const CourseDetailPage = () => {
  const { lang, courseId: rawCourseId } = useParams<{
    lang: string;
    courseId: string;
  }>();
  const courseId = decodeURI(rawCourseId ?? "");
  const dict = useDictionary();
  const {
    data: changes = [],
    isLoading: changesLoading,
    isFetching: changesFetching,
    error: changesError,
  } = useQuery({
    queryKey: ["course", courseId, "changes"],
    queryFn: async () => {
      const response = await client.course[":courseId"].changes.$get({
        param: { courseId },
      });
      if (!response.ok) throw new Error("Failed to load course changes");
      return parseCourseChanges(await response.json());
    },
    enabled: courseId.length > 0,
    retry: false,
  });
  const changeLabels: CourseChangeLabels = {
    fields: dict.course.details.changes.fields,
    removed: dict.course.details.changes.removed,
    reappeared: dict.course.details.changes.reappeared,
    empty: dict.course.details.changes.empty,
    trueValue: dict.course.details.changes.true_value,
    falseValue: dict.course.details.changes.false_value,
    valueSeparator: dict.course.details.changes.value_separator,
    teacherField: lang === "en" ? "teacher_en" : "teacher_zh",
  };
  const formattedChanges =
    changesLoading || changesFetching || changesError
      ? []
      : formatCourseChanges(filterCourseChanges(changes), changeLabels);
  const hasCourseChanges = formattedChanges.length > 0;

  // Track course detail view
  useEffect(() => {
    if (courseId) {
      courseEvents.viewDetail(courseId, courseId);
    }
  }, [courseId]);

  return (
    <div className="flex flex-col gap-2 px-2">
      <div className="">
        <Button variant="ghost" asChild size="sm">
          <Link to={`/${lang}/courses`}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            {dict.common.back}
          </Link>
        </Button>
      </div>
      <CourseDetailContainer
        lang={(lang as Language) ?? "zh"}
        courseId={courseId}
        bottomAware
        courseChanges={
          hasCourseChanges ? (
            <CourseChanges
              changes={formattedChanges}
              department={getCourseChangeDepartment(courseId)}
              lang={lang ?? "zh"}
            />
          ) : null
        }
        hasCourseChanges={hasCourseChanges}
      />
    </div>
  );
};

export default CourseDetailPage;
