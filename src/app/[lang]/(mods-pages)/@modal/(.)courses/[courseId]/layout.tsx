import DialogHandler from "./DialogHandler"
import {LangProps} from '@/types/pages';
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PropsWithChildren } from "react";

type PageProps = {
    params: {
        courseId: string
    }
}

const CoursePageModalLayout = ({ params, children }: PropsWithChildren<PageProps & LangProps>) => {
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
        <ScrollArea className="h-[80vh]  ">
            {children}
        </ScrollArea>
    </DialogHandler>
}

export default CoursePageModalLayout