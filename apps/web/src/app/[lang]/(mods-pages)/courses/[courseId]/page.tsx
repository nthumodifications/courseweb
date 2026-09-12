import { useParams } from "react-router-dom";
import CourseDetailContainer from "@/components/CourseDetails/CourseDetailsContainer";
import { PageShell } from "@courseweb/ui";
import { Language } from "@/types/settings";
import { useEffect } from "react";
import { courseEvents } from "@/lib/trackingEvents";

const CourseDetailPage = () => {
  const { lang, courseId: rawCourseId } = useParams<{
    lang: string;
    courseId: string;
  }>();
  const courseId = decodeURI(rawCourseId ?? "");
  // Track course detail view
  useEffect(() => {
    if (courseId) {
      courseEvents.viewDetail(courseId, courseId);
    }
  }, [courseId]);

  return (
    <PageShell width="app">
      <CourseDetailContainer
        lang={(lang as Language) ?? "zh"}
        courseId={courseId}
        bottomAware
      />
    </PageShell>
  );
};

export default CourseDetailPage;
