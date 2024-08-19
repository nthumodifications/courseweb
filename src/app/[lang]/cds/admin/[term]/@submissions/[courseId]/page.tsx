import { getSubmissionDetails, getCDSTerm } from "@/lib/cds_actions";
import { getCourse } from "@/lib/course";
import DownloadSubmissions from "../../DownloadSubmissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CourseSubmissions = async ({
  params: { courseId, term },
}: {
  params: { courseId: string; term: string };
}) => {
  const termObj = await getCDSTerm(decodeURI(term));
  const submissions = await getSubmissionDetails(decodeURI(courseId), termObj);
  const course = await getCourse(decodeURI(courseId));

  return (
    <div className="w-full h-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-3 sticky top-0">
        選擇 {course?.department} {course?.course}-{course?.class}{" "}
        {course?.name_zh} 名單 ({submissions.length} 人)
      </h1>
      <DownloadSubmissions
        submissions={submissions}
        filename={`${course?.department} ${course?.course}-${course?.class} ${course?.name_zh}`}
      />
      <div className="w-full h-full overflow-y-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>學號</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell>{submission.user_id}</TableCell>
                <TableCell>{submission.name_zh}</TableCell>
                <TableCell>{submission.email}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CourseSubmissions;
