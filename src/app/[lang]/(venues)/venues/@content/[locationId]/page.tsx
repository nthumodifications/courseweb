import supabase from '@/config/supabase'
import NTHUMap from '@/components/Venue/NTHUMap'
import {createTimetableFromCourses} from '@/helpers/timetable';
import Timetable from '@/components/Timetable/Timetable';
import { Suspense } from 'react';
import {MinimalCourse} from '@/types/courses';
import {ResolvingMetadata} from 'next';
import { lastSemester } from '@/const/semester';
import { Button } from '@mui/joy';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { renderTimetableSlot } from '@/helpers/timetable_course';

type Props = {
    params: {
        locationId: string;
    }
}

const getCoursesWithVenue = async (venueId: string) => {
    const { data, error } = await supabase.from('courses').select('*').eq('semester', lastSemester.id).containedBy('venues', [venueId]);
    if (error) throw error;
    else return data;
}

export const generateMetadata = ({
    params
}: Props, parent: ResolvingMetadata) => {
    const venueId = decodeURI(params.locationId)
    return {
        ...parent,
        title: `${venueId}`
    }
}

const MapPage = async ({
    params
}: Props) => {
    const venueId = decodeURI(params.locationId)
    const courses = await getCoursesWithVenue(venueId);
    const timetable = createTimetableFromCourses(courses as MinimalCourse[]);

    return (
        <div className='flex flex-col w-full h-full'>
            <div className='pl-4 pt-2 md:hidden'>
                <Link href="./">
                    <Button variant='plain' startDecorator={<ArrowLeft/>}>Back</Button>
                </Link>
            </div>
            <div className='py-4 flex flex-col items-center space-y-2 px-2 md:px-6'>
                <h2 className='font-semibold text-xl'>{venueId}</h2>
                <Timetable timetableData={timetable} renderTimetableSlot={renderTimetableSlot}/>
                <Suspense fallback={<h1>Map failed to load</h1>}>
                    <NTHUMap marker={[24.791513, 120.994123]}/>
                </Suspense>
            </div>
        </div>
    )
}

export default MapPage;