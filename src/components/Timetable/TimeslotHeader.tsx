import { TimeSlot } from '@/types/timetable';
import {forwardRef} from 'react';


const TimeslotHeader = forwardRef<HTMLTableCellElement, TimeSlot & { firstRow: boolean }>(
    ({ start, end, time, firstRow }, ref) => {
        return (
            <tr>
                <td className='flex flex-col py-2'>
                    <span className='text-xs text-gray-700'>{start}</span>
                    <span className='text-sm font-semibold'>第{time}節</span>
                    <span className='text-xs text-gray-700'>{end}</span>
                </td>
                <td className='border border-gray-300' ref={firstRow ? ref: null}></td>
                <td className='border border-gray-300'></td>
                <td className='border border-gray-300'></td>
                <td className='border border-gray-300'></td>
                <td className='border border-gray-300'></td>
            </tr>
        )
    })

export default TimeslotHeader;