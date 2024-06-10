import supabase from '@/config/supabase'
import {MinimalCourse} from '@/types/courses';
import {ResolvingMetadata} from 'next';
import { lastSemester } from '@/const/semester';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { toPrettySemester } from '@/helpers/semester';

const VenueTimetableDynamic = dynamic(() => import('@/app/[lang]/(mods-pages)/(venues)/venues/@content/[locationId]/VenueTimetable'), { ssr: false });

type Props = {
    params: {
        locationId: string;
    }
}

const getCoursesWithVenue = async (venueId: string) => {
    const { data, error } = await supabase.from('courses').select('*').eq('semester', lastSemester.id).contains('venues', [venueId]);
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

    return (
        <div className='flex flex-col w-full h-full'>
            <div className='pl-4 pt-2 md:hidden'>
                <Link href="./">
                    <Button variant='ghost'><ArrowLeft className='w-4 h-4 mr-2'/> Back</Button>
                </Link>
            </div>
            <div className='py-4 flex flex-col items-center space-y-2 px-2 md:px-6'>
                <h2 className='font-semibold text-xl'>{venueId} - {toPrettySemester(lastSemester.id)}學期</h2>
                <VenueTimetableDynamic courses={courses as MinimalCourse[]}/>
                {/* <Suspense fallback={<h1>Map failed to load</h1>}>
                    <NTHUMap marker={[24.791513, 120.994123]}/>
                </Suspense> */}
            </div>
        </div>
    )
}

export default MapPage;