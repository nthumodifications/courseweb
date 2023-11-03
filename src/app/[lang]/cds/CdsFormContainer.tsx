import useSupabaseClient from '@/config/supabase_client';
import {CircularProgress} from '@mui/joy';
import useSWR from 'swr';
import CdsCoursesForm from './CdsCourseForm';
import { useMemo } from 'react';

const CdsFormContainer = () => {
    const supabase = useSupabaseClient();
    const { data: courses, error, isLoading } = useSWR(['cds_courses'], async () => {
        const { data = [], error } = await supabase.from('cds_courses').select('*');
        if(error) throw error;
        return data;
    })
    
    //assuming preferences is a string of raw_id
    const preferences: string[] = [];
    const preferenceCourses = useMemo(() => courses?.filter(course => preferences.includes(course.raw_id!)) ?? [], [courses]);
    

    if(isLoading) return <CircularProgress/>
    return ( <div className='p-4'>
        <CdsCoursesForm initialSubmission={{ preferences: preferenceCourses }} cdsCoursesList={courses ?? []}/>
    </div>)
}

export default CdsFormContainer;