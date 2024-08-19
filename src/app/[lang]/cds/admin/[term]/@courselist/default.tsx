import { getCDSCourseSubmissions, getCDSTerm } from "@/lib/cds_actions";
import CoursePicker from "./CoursePicker";

const CDSAdmin = async ({
  params: { lang, term },
}: {
  params: { lang: string; term: string };
}) => {
  const termObj = await getCDSTerm(decodeURI(term));
  const courses = await getCDSCourseSubmissions(termObj);

  return <CoursePicker termObj={termObj} courses={courses} />;
};

export default CDSAdmin;
