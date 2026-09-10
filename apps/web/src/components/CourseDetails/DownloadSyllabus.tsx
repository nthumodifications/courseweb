import { Button } from "@courseweb/ui";
import { RawCourseID } from "@/types/courses";
import { DownloadCloud } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
const DownloadSyllabus = ({ courseId }: { courseId: RawCourseID }) => {
  const dict = useDictionary();
  const fileURL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/syllabus/${encodeURIComponent(courseId)}.pdf`;

  return (
    <Button variant="outline" asChild>
      <a href={fileURL} target="_blank">
        <DownloadCloud className="h-4 w-4 mr-2" />
        {dict.course.details.download_pdf}
      </a>
    </Button>
  );
};

export default DownloadSyllabus;
