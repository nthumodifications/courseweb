import DialogHandler from "./DialogHandler"
import {LangProps} from '@/types/pages';
import CourseDetailContainer from '@/components/CourseDetails/CourseDetailsContainer';

type PageProps = {
    params: {
        courseId: string
    }
}

const CoursePageModal = ({ params }: PageProps & LangProps) => {
    const courseId = decodeURI(params.courseId as string);
    
    return <DialogHandler>
        <CourseDetailContainer lang={params.lang} courseId={courseId}/>
    </DialogHandler>
}

export default CoursePageModal