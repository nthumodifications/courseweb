import DialogHandler from "./DialogHandler"
import {LangProps} from '@/types/pages';
import CourseDetailContainer from '@/components/CourseDetails/CourseDetailsContainer';
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

type PageProps = {
    params: {
        courseId: string
    }
}

const CoursePageModal = ({ params }: PageProps & LangProps) => {
    const courseId = decodeURI(params.courseId as string);

    return <DialogHandler>
        <div className="flex flex-row justify-end px-8 py-2">
            <Button variant='ghost' asChild>
                <a href={`/${params.lang}/courses/${courseId}`} className="mr-2">
                    <ExternalLink className="mr-2 w-4 h-4" />
                    在新分頁開啟
                </a>
            </Button>
        </div>
        <Separator />
        <div className="flex-1 h-full">
            <ScrollArea>
                <div className="px-4 py-2">
                    <CourseDetailContainer lang={params.lang} courseId={courseId}/>
                </div>
            </ScrollArea>
        </div>
    </DialogHandler>
}

export default CoursePageModal