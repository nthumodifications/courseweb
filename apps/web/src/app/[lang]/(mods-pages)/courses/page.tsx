import CourseSearchContainer from "./CourseSearchContainer";
import { useFillViewportHeight } from "@/hooks/useFillViewportHeight";

const CourseDialog = () => {
  const { ref, height } = useFillViewportHeight<HTMLDivElement>();

  return (
    <div
      ref={ref}
      data-course-search-viewport
      className="min-w-0 md:min-h-0 md:overflow-hidden md:pb-4"
      style={height == null ? undefined : { height }}
    >
      <CourseSearchContainer />
    </div>
  );
};

export default CourseDialog;
