'use server';;
import { FC, PropsWithChildren } from 'react';
import VenueList from "@/components/Venue/VenueList";

export const generateMetadata = () => ({
    title: '地點 Venues | NTHUMods'
})

const LocationLayout: FC<PropsWithChildren> = async ({ children }) => {
    return <div className="h-full grid grid-cols-[2fr_3fr]">
        <VenueList/>
        <main className='overflow-auto'>
            {children}
        </main>
    </div>
}

export default LocationLayout;