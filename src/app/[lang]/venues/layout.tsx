'use client';
import { FC, PropsWithChildren, use } from 'react';
import VenueList from "@/components/Venue/VenueList";
import Fade from '@/components/Animation/Fade';
import { useMediaQuery } from 'usehooks-ts';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@mui/joy';
import { ArrowLeft } from 'react-feather';

const LocationLayout: FC<PropsWithChildren> = ({ children,...anything }) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { locationId } = useParams();
    const router = useRouter();
    const showVenueList = !isMobile || !locationId;
    // console.log(locationId);
    return <Fade>
        <div className="h-full grid grid-cols-1 md:grid-cols-[2fr_3fr]">
            {showVenueList && <VenueList/>}
            <main className='overflow-y-auto overflow-x-hidden'>
                <div className='pl-4 pt-2'>
                    {showVenueList && <Button variant='plain' onClick={() => router.back()} startDecorator={<ArrowLeft/>}>Back</Button>}
                </div>
                {children}
            </main>
        </div>
    </Fade>
}

export default LocationLayout;