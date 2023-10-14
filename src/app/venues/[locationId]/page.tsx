import supabase from '@/config/supabase'
import NTHUMap from '@/components/Venue/NTHUMap'
import {createTimetableFromCourses} from '@/helpers/timetable';
import Timetable from '@/components/Timetable/Timetable';
type Props = {
    params: {
        locationId: string;
    }
}

const getCoursesWithVenue = async (venueId: string) => {
    const { data, error } = await supabase.from('courses').select('*').containedBy('venues', [venueId]);
    if (error) throw error;
    else return data;
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
            <NTHUMap marker={[24.791513, 120.994123]}/>
        </div>
    )
}

export default MapPage;