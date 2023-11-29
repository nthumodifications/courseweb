import CdsCoursesForm from './CdsCourseForm';
import { getUserCdsSelections } from '@/lib/cds_actions';
import { CdsTermDefinition } from '@/config/supabase';

const CdsFormContainer = async ({ termObj }: { termObj: CdsTermDefinition }) => {
    const selectedCourses = await getUserCdsSelections(termObj.term);

    return ( <div className='p-4'>
        <CdsCoursesForm termObj={termObj} initialSubmission={{ selection: selectedCourses }}/>
    </div>)
}

export default CdsFormContainer;