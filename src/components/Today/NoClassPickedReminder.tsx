'use client';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const NoClassPickedReminder = () => {
    return <Alert>
        <AlertTitle>還沒選到課嗎？</AlertTitle>
        <AlertDescription>
            <ul className='list-decimal list-inside'>
                <li className='text-base'>先到 <Link className='text-[#AF7BE4] font-medium' href='/zh/courses'>課表</Link> 選擇課程</li>
                <li className='text-base'>後到 <Link className='text-[#AF7BE4] font-medium' href='/zh/timetable'>時間表</Link> 查看時間表</li>
            </ul>
        </AlertDescription>
    </Alert>;
};
