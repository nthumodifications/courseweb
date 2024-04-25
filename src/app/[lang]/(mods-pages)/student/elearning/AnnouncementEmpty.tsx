import { Info } from "lucide-react";

const AnnouncementEmpty = () => {
    return <div className='w-full grid place-items-center h-[--content-height]'>
        <div className='flex flex-col space-y-4 items-center'>
            <Info className='h-14 w-14 text-gray-900 dark:text-gray-100' />
            <p className='text-gray-700 dark:text-gray-500'>無公告資訊</p>
        </div>
    </div>
}

export default AnnouncementEmpty;