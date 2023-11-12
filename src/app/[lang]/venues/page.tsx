import { getDictionary } from "@/dictionaries/dictionaries";
import { LangProps } from '@/types/pages';
import VenueList from '@/components/Venue/VenueList';
import Fade from '@/components/Animation/Fade';
import { getVenues } from '@/lib/venues';

export const metadata = ({
    title: '地點 Venues | NTHUMods'
})

const VenuesPage = async ({
    params: {
        lang
    }
}: LangProps) => {
    const dict = await getDictionary(lang)
    const venues = await getVenues();
    // const { language } = useSettings();
    return (<Fade>
        <div className="h-full w-full grid grid-cols-1 md:grid-cols-[2fr_3fr] overflow-hidden">
            <div className="w-full h-full hidden md:block overflow-auto">
                <VenueList venues={venues} />
            </div>
            <main className='h-full w-full'>
                <div className="h-full w-full grid place-content-center">
                    <h1 className="text-xl font-semibold text-gray-400">{dict.venues.placeholder}</h1>
                </div>
            </main>
        </div>
    </Fade>
    )
}

export default VenuesPage;