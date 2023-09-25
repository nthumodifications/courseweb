import { useSettings } from "@/hooks/contexts/settings";
import { NextPage } from "next";

const LocationsPage: NextPage = () => {
    // const { language } = useSettings();
    return (
        <div className="h-full w-full grid place-content-center">
            <h1 className="text-xl font-semibold text-gray-400">Select a Location from the list</h1>
        </div>
    )
}

export default LocationsPage;