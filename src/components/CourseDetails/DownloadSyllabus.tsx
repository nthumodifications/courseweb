import { Button } from "@/components/ui/button";
import { RawCourseID } from "@/types/courses";
import { DownloadCloud } from "lucide-react";
import Link from "next/link";

const DownloadSyllabus = ({ courseId }: { courseId: RawCourseID }) => {
    const fileURL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/syllabus/${encodeURIComponent(courseId)}.pdf`;

    return <Link href={fileURL} target="_blank">
        <Button variant="outline" ><DownloadCloud className="h-4 w-4 mr-2"/> 下載 PDF</Button>
    </Link>
}

export default DownloadSyllabus;