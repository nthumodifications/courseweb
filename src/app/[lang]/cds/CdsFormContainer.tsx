import CdsCoursesForm from './CdsCourseForm';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import supabase_server from '@/config/supabase_server';
import { getUserCdsSelections } from '@/lib/cds_actions';

const CdsFormContainer = async ({ term }: { term: string }) => {
    const selectedCourses = await getUserCdsSelections(term);

    return ( <div className='p-4'>
        <CdsCoursesForm term={term} initialSubmission={{ selection: selectedCourses }}/>
    </div>)
}

export default CdsFormContainer;