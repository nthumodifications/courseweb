import CourseSearchContainer from "./CourseSearchContainer";
import { PageShell } from "@courseweb/ui";

const CourseDialog = () => {
  return (
    <PageShell width="full" gap={false} className="min-h-0">
      <CourseSearchContainer />
    </PageShell>
  );
};

export default CourseDialog;
