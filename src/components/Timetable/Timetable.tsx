'use client';
import TimeslotHeader from '@/components/Timetable/TimeslotHeader';
import TimetableSlot from '@/components/Timetable/TimetableSlot';
import { scheduleTimeSlots } from '@/const/timetable';
import {CourseTimeslotData, TimeSlot} from '@/types/timetable';
import {FC, useLayoutEffect, useRef, useState} from 'react';

const Timetable: FC<{ timetableData: CourseTimeslotData[] }> = ({ timetableData = [] }) => {
    const headerRow = useRef<HTMLTableCellElement>(null);
    const timetableCell = useRef<HTMLTableCellElement>(null);
    const [tableDim, setTableDim] = useState({ header: { width: 0, height: 0 }, timetable: { width: 0, height: 0 } });
  

    const updateSize = () => {
      setTableDim({
        header: {
          width: headerRow.current?.offsetWidth || 0,
          height: headerRow.current?.offsetHeight || 0
        },
        timetable: {
          width: timetableCell.current?.offsetWidth || 0,
          height: timetableCell.current?.offsetHeight || 0
        }
      })
    }
  
    useLayoutEffect(() => {
      updateSize();
      window.addEventListener("resize", updateSize);
      return () => 
        window.removeEventListener("resize", updateSize);
    }, []);



    return (
        <div className="mb-32 text-center lg:mb-0 w-full">
        {/* Timetable, Relative overlay */}
        <div className="relative w-full">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <td className="w-[40px] min-w-[40px]" ref={headerRow}></td>
                <td className='text-xs font-semibold w-28 py-2 border border-gray-300 dark:border-neutral-700'>MON</td>
                <td className='text-xs font-semibold w-28 py-2 border border-gray-300 dark:border-neutral-700'>TUE</td>
                <td className='text-xs font-semibold w-28 py-2 border border-gray-300 dark:border-neutral-700'>WED</td>
                <td className='text-xs font-semibold w-28 py-2 border border-gray-300 dark:border-neutral-700'>THU</td>
                <td className='text-xs font-semibold w-28 py-2 border border-gray-300 dark:border-neutral-700'>FRI</td>
              </tr>
            </thead>
            <tbody>
              {scheduleTimeSlots.map((time, index) => (
                <TimeslotHeader key={index} time={time.time} start={time.start} end={time.end} firstRow={index == 0} ref={timetableCell} />
              ))}
            </tbody>
          </table>
          <div className='absolute top-0 left-0 w-full h-full'>
            {timetableData.map((data, index) => (<TimetableSlot key={index} course={data} tableDim={tableDim}/>))}
          </div>
        </div>
      </div>
    );
};

export default Timetable;