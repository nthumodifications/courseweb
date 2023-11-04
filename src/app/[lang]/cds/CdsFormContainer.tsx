import CdsCoursesForm from './CdsCourseForm';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import supabase_server from '@/config/supabase_server';
import { getUserCdsSelections } from '@/lib/cds_actions';

//TODO: change according to actual term
const term = '112-2';

const CdsFormContainer = async () => {
    const selectedCourses = await getUserCdsSelections(term);

    return ( <div className='p-4'>
        <CdsCoursesForm term={term} initialSubmission={{ selection: selectedCourses }}/>
    </div>)
}

export default CdsFormContainer;