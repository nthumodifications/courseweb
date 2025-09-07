import { LangProps } from "@/types/pages";
import CourseDetailContainer from "@/components/CourseDetails/CourseDetailsContainer";

type PageProps = {
  params: {
    courseId: string;
  };
};

const CoursePageModalContent = ({ params }: PageProps & LangProps) => {
  const courseId = decodeURI(params.courseId as string);

  return (
    <div className="px-4 py-2 lg:px-8 lg:py-4">
      <CourseDetailContainer
        lang={params.lang}
        courseId={courseId}
        modal={true}
      />
    </div>
  );
};

export default CoursePageModalContent;
