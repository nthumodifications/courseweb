import { TimeSlot } from '@/types/timetable';
import {forwardRef} from 'react';


const TimeslotHeader = forwardRef<HTMLTableCellElement, TimeSlot & { firstRow: boolean, showSaturday?: boolean }>(
    ({ start, end, time, firstRow, showSaturday = false }, ref) => {
        return (
            <tr>
                <td className='flex flex-col py-2'>
                    <span className='text-xs text-gray-700 dark:text-gray-400'>{start}</span>
                    <span className='text-sm font-semibold'>第{time}節</span>
                    <span className='text-xs text-gray-700 dark:text-gray-400'>{end}</span>
                </td>
                <td className='border border-gray-300 dark:border-neutral-700' ref={firstRow ? ref: null}></td>
                <td className='border border-gray-300 dark:border-neutral-700'></td>
                <td className='border border-gray-300 dark:border-neutral-700'></td>
                <td className='border border-gray-300 dark:border-neutral-700'></td>
                <td className='border border-gray-300 dark:border-neutral-700'></td>
                {showSaturday && <td className='border border-gray-300 dark:border-neutral-700'></td>}
            </tr>
        )
    })

export default TimeslotHeader;