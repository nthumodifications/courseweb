import { getDictionary } from "@/dictionaries/dictionaries";
import {LangProps} from '@/types/pages';

const VenuesPage = async ({
    params: {
        lang
    }
}: LangProps) => {
    const dict = await getDictionary(lang)
    // const { language } = useSettings();
    return (
        <div className="h-full w-full grid place-content-center">
            <h1 className="text-xl font-semibold text-gray-400">{dict.venues.placeholder}</h1>
        </div>
    )
}

export default VenuesPage;