import { useParams } from "react-router-dom";
import CourseDetailContainer from "@/components/CourseDetails/CourseDetailsContainer";
import { Button } from "@courseweb/ui";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Language } from "@/types/settings";

const CourseDetailPage = () => {
  const { lang, courseId: rawCourseId } = useParams<{
    lang: string;
    courseId: string;
  }>();
  const courseId = decodeURI(rawCourseId ?? "");

  return (
    <div className="flex flex-col gap-2 px-2">
      <div className="">
        <Button variant="ghost" asChild size="sm">
          <Link to={`/${lang}/courses`}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            回到課程列表
          </Link>
        </Button>
      </div>
      <CourseDetailContainer
        lang={(lang as Language) ?? "zh"}
        courseId={courseId}
        bottomAware
      />
    </div>
  );
};

export default CourseDetailPage;
