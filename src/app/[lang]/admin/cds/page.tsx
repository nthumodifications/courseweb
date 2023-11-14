import supabase_server from "@/config/supabase_server";
import {MinimalCourse, selectMinimalStr} from '@/types/courses';
const getCDSSubmissions = async (term: string) => {

    //get all courses where count exists and > 0
    const { data: courses, error: coursesError } = await supabase_server
        .from('courses')
        .select(`${selectMinimalStr}, cds_counts (count)`)
        .eq('term', term)
        .gt('cds_counts.count', 0)

    if (coursesError) {
        console.log(coursesError);
    }
    
    //get all submissions
    const { data, error } = await supabase_server
        .from('cds_submissions')
        .select('*')
    
}


const CDSAdmin = () => {
    return (
        <div>
            <h1>Admin CDS</h1>
        </div>
    )
}

export default CDSAdmin;