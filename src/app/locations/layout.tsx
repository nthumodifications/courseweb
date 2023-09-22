import { Input } from "@mui/joy";
import { FC, PropsWithChildren } from "react";

const LocationLayout: FC<PropsWithChildren> = ({ children }) => {
    return <div className="grid grid-cols-[320px_auto] grid-rows-1">
        <div className="h-full w-full px-8 py-4">
            <Input placeholder="Search..." />
        </div>
        <main className='overflow-auto'>
            {children}
        </main>
    </div>
}

export default LocationLayout;