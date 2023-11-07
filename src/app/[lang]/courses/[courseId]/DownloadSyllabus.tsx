'use client';
import supabase from "@/config/supabase";
import { RawCourseID } from "@/types/courses";
import { Button } from "@mui/joy";
import { DownloadCloud } from "react-feather";

const DownloadSyllabus = ({ courseId }: { courseId: RawCourseID }) => {
    const handleDownload = async () => {
        
        const fileURL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}storage/v1/object/public/syllabus/${encodeURIComponent(courseId)}.pdf`;
        const link = document.createElement('a')
        link.href = fileURL
        link.setAttribute('download', courseId+'.pdf')
        document.body.appendChild(link)
        link.click()
        link.remove()
    }

    return <Button variant="outlined" startDecorator={<DownloadCloud />} onClick={handleDownload}>Download PDF</Button>
}

export default DownloadSyllabus;