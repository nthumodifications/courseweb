import { IconButton } from "@mui/joy";
import { Map, MapPin, Star } from "react-feather";

const apps = [
    {
        title_zh: '地點',
        title_en: 'Venues',
        href: '/venues',
        icon: <Map size={16}/>,
    },
    {
        title_zh: '公車',
        title_en: 'Bus',
        href: '/bus',
        icon: <MapPin size={16}/>,
    }
]

const AppList = () => {
    return (
        <div className="h-full w-full">
            <h1>App List</h1>
            <div className="flex flex-col">
                {apps.map(app => (<div className="flex flex-row items-center space-x-2 py-2 px-4 hover:bg-gray-100 dark:hover:bg-neutral-800">
                    <div className="p-3 rounded-full bg-indigo-100 text-indigo-800 grid place-items-center">
                        {app.icon}
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                        <h2 className="text-lg font-medium">{app.title_zh}</h2>
                    </div>
                    <div className="items-center px-3">
                        <IconButton>
                            <Star/>
                        </IconButton>
                    </div>
                </div>))}
            </div>
        </div>
    );
}

export default AppList;