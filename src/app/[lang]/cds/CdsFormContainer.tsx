import {CircularProgress} from '@mui/joy';
import useSWR from 'swr';
import CdsCoursesForm from './CdsCourseForm';
import supabase from '@/config/supabase';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

const getUserPreferences = async () => {
    const session = await getServerSession();
    if(session == null || !session.user) return redirect('/');
    const preferences: string[] = [];

    //get user preferences
    const { data: preferenceCourses = [], error } = await supabase.from('cds_courses').select('*').in('raw_id', preferences);
    if(error) throw error;
    
    return preferenceCourses ?? [];
}

const CdsFormContainer = async () => {
    const preferenceCourses = await getUserPreferences();

    return ( <div className='p-4'>
        <CdsCoursesForm initialSubmission={{ preferences: preferenceCourses }}/>
    </div>)
}

export default CdsFormContainer;