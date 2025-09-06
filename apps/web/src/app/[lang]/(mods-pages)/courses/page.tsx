import CourseSearchContainer from "./CourseSearchContainer";

export const dynamic = "force-dynamic";

const CourseDialog = () => {
  return (
    <div className="max-h-[calc(var(--content-height)-36px)]">
      <CourseSearchContainer />
    </div>
  );
};

export default CourseDialog;
