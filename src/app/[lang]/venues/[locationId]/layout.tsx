import { FC, PropsWithChildren, use } from 'react';
import VenueList from "@/components/Venue/VenueList";
import Fade from '@/components/Animation/Fade';
import { getVenues } from '@/lib/venues';

type LocationLayoutProps = PropsWithChildren<{
    params: {
        locationId: string;
    }
}>

const LocationLayout: FC<LocationLayoutProps> = async ({ children, params: { locationId }, ...anything }) => {
    const venues = await getVenues();

    return <div className="h-full grid grid-cols-1 md:grid-cols-[2fr_3fr]">
        <div className='w-full h-full hidden md:block'>
            <VenueList venues={venues} />
        </div>
        <Fade>
            <main className='overflow-y-auto overflow-x-hidden'>
                {children}
            </main>
        </Fade>
    </div>
}

export default LocationLayout;