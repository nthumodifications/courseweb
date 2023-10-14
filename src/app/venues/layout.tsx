'use server';;
import { FC, PropsWithChildren } from 'react';
import VenueList from "@/components/Venue/VenueList";

export const generateMetadata = () => ({
    title: '地點 Venues | NTHUMods'
})

const LocationLayout: FC<PropsWithChildren> = async ({ children }) => {
    return <div className="h-full grid grid-cols-[auto_820px] grid-rows-1">
        <VenueList/>
        <main className='overflow-auto'>
            {children}
        </main>
    </div>
}

export default LocationLayout;