import { Button } from "@/components/ui/button";
import { RawCourseID } from "@/types/courses";
import { DownloadCloud } from "lucide-react";
import Link from "next/link";

const DownloadSyllabus = ({ courseId }: { courseId: RawCourseID }) => {
  const fileURL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/syllabus/${encodeURIComponent(courseId)}.pdf`;

  return (
    <Button variant="outline" asChild>
      <Link href={fileURL} target="_blank">
        <DownloadCloud className="h-4 w-4 mr-2" /> 下載 PDF
      </Link>
    </Button>
  );
};

export default DownloadSyllabus;
