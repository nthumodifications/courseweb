import NTHUMap from '@/components/Venue/NTHUMap'
import {createTimetableFromCourses} from '@/helpers/timetable';
import Timetable from '@/components/Timetable/Timetable';
import { Suspense } from 'react';
import getSupabaseServer from '@/config/supabase_server';
type Props = {
    params: {
        locationId: string;
    }
}

const getCoursesWithVenue = async (venueId: string) => {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.from('courses').select('*').containedBy('venues', [venueId]);
    if (error) throw error;
    else return data;
}

export const generateMetadata = ({
    params
}: Props) => {
    const venueId = decodeURI(params.locationId)
    return {
        title: `${venueId} | NTHUMods`
    }
}

const MapPage = async ({
    params
}: Props) => {
    const venueId = decodeURI(params.locationId)
    const courses = await getCoursesWithVenue(venueId);
    const timetable = createTimetableFromCourses(courses);

    console.log(courses)
    return (
        <div className='py-4 flex flex-col items-center space-y-2 px-6'>
            <h2 className='font-semibold text-xl'>{venueId}</h2>
            <Timetable timetableData={timetable} />
            <Suspense fallback={<h1>Map failed to load</h1>}>
                <NTHUMap marker={[24.791513, 120.994123]}/>
            </Suspense>
        </div>
    )
}

export default MapPage;