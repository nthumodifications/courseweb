import {CircularProgress} from '@mui/joy';
import useSWR from 'swr';
import CdsCoursesForm from './CdsCourseForm';
import supabase from '@/config/supabase';

const CdsFormContainer = () => {
    //assuming preferences is a string of raw_id
    const preferences: string[] = [];

    const { data: preferenceCourses = [], error, isLoading } = useSWR(['cds_courses'], async () => {
        const { data = [], error } = await supabase.from('cds_courses').select('*').in('raw_id', preferences);
        if(error) throw error;
        return data ?? [];
    })
    

    if(isLoading) return <CircularProgress/>
    return ( <div className='p-4'>
        <CdsCoursesForm initialSubmission={{ preferences: preferenceCourses }}/>
    </div>)
}

export default CdsFormContainer;