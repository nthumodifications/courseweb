'use client';
import TimeslotHeader from '@/components/Timetable/TimeslotHeader';
import TimetableSlot from '@/components/Timetable/TimetableSlot';
import { scheduleTimeSlots } from '@/const/timetable';
import {CourseTimeslotData, TimeSlot} from '@/types/timetable';
import {FC, useLayoutEffect, useMemo, useRef, useState} from 'react';
import TimetableSlotVertical from '@/components/Timetable/TimetableSlotVertical';

type CourseTimeslotDataWithFraction = CourseTimeslotData & { fraction: number, fractionIndex: number, timeSlots: string[] };

const Timetable: FC<{ timetableData: CourseTimeslotData[], vertical?: boolean }> = ({ timetableData = [], vertical = false }) => {
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
      if(typeof window  == "undefined") return ;
      updateSize();
      window.addEventListener("resize", updateSize);
      return () => 
        window.removeEventListener("resize", updateSize);
    }, [vertical]);
    
    const timetableDataWithFraction = useMemo(() => {
      const slotSums = timetableData.reduce((acc, cur) => {
        // get the array of [${dayofWeek}${starttime}, ${dayofWeek}${starttime+1}, ...${dayofWeek}${endtime}]
        const timeSlots = Array.from({ length: cur.endTime - cur.startTime + 1 }, (_, i) => `${'MTWRFS'[cur.dayOfWeek]}${cur.startTime + i}`);
        // add the array to the accumulator
        acc.push(...timeSlots);
        return acc;
      }, [] as string[]);

      // calculate slots that are overlapped
      const slotCounts = slotSums.reduce((acc, cur) => {
        acc[cur] = (acc[cur] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // reduce through the courses, get the maximum of the sum of overlapped slots, which is their fraction.
      // if this is the first course with this fraction, set the fractionIndex to 1
      // else if there is a previous course that has at least one of timeslots overlapping, set the fractionIndex to the previous course's fractionIndex + 1
      // else set the fractionIndex to 1
      const timetableDataWithFraction = timetableData.reduce((acc, cur) => {
        const timeSlots = Array.from({ length: cur.endTime - cur.startTime + 1 }, (_, i) => `${'MTWRFS'[cur.dayOfWeek]}${cur.startTime + i}`);
        const fraction = Math.max(...timeSlots.map(slot => slotCounts[slot]));
        const fractionIndex = acc.filter(course => timeSlots.some(slot => course.timeSlots.includes(slot))).length > 0 
          ? acc.filter(course => timeSlots.some(slot => course.timeSlots.includes(slot)))[0].fractionIndex + 1
          : 1;
        acc.push({ ...cur, fraction, fractionIndex, timeSlots });
        return acc;
      }, [] as CourseTimeslotDataWithFraction[]);

      return timetableDataWithFraction
    }, [timetableData]);    

    const showSaturday = timetableData.some(course => course.dayOfWeek == 5);

    const days = showSaturday ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']: ['MON', 'TUE', 'WED', 'THU', 'FRI'];

    if(vertical) return (
      <div className="text-center lg:mb-0 w-full">
        {/* Timetable, Relative overlay */}
        <div className="relative w-full">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <td className="min-w-[60px]" ref={headerRow}>
                </td>
              {scheduleTimeSlots.map((time, index) => (
                <td className="min-w-[120px] px-2">
                  <div className='flex flex-row justify-between items-baseline'>
                    <span className='text-xs font-bold text-gray-400'>{time.start}</span>
                    <span className='text-sm font-bold text-gray-400'>{time.time}</span>
                    <span className='text-xs font-bold text-gray-400'>{time.end}</span>
                  </div>
                </td>
              ))}
              </tr>
            </thead>
            <tbody>
              {days.map((dayStr, index) => <tr key={index}>
                <td className='sticky left-0 z-10 bg-white dark:bg-neutral-900 text-xs font-semibold py-2 border border-gray-300 dark:border-neutral-700 h-20'>{dayStr}</td>
                {scheduleTimeSlots.map((time, slot) => (
                  <td key={time.time} className='text-xs font-semibold w-28 py-2 border border-gray-300 dark:border-neutral-700' ref={timetableCell}></td>
                ))}
              </tr>)}
            </tbody>
          </table>
          <div className='absolute top-0 left-0 w-full h-full'>
            {timetableDataWithFraction.map((data, index) => (
              <TimetableSlotVertical 
                key={index} 
                course={data} 
                tableDim={tableDim} 
                fraction={data.fraction} 
                fractionIndex={data.fractionIndex} 
              />
            ))}
          </div>
        </div>
      </div>
      
    )

    return (
        <div className="text-center lg:mb-0 w-full">
        {/* Timetable, Relative overlay */}
        <div className="relative w-full">
          <table className="table-auto w-full">
            <thead>
              <tr className='h-1'>
                <td className="w-[40px] min-w-[40px]" ref={headerRow}></td>
                <td className='w-28 p-0.5 h-[inherit]'>
                  <div className='h-full w-full text-xs font-semibold bg-gray-100 dark:bg-neutral-800 rounded-md py-2'>MON</div>
                </td>
                <td className='w-28 p-0.5 h-[inherit]'>
                  <div className='h-full w-full text-xs font-semibold bg-gray-100 dark:bg-neutral-800 rounded-md py-2'>TUE</div>
                </td>
                <td className='w-28 p-0.5 h-[inherit]'>
                  <div className='h-full w-full text-xs font-semibold bg-gray-100 dark:bg-neutral-800 rounded-md py-2'>WED</div>
                </td>
                <td className='w-28 p-0.5 h-[inherit]'>
                  <div className='h-full w-full text-xs font-semibold bg-gray-100 dark:bg-neutral-800 rounded-md py-2'>THU</div>
                </td>
                <td className='w-28 p-0.5 h-[inherit]'>
                  <div className='h-full w-full text-xs font-semibold bg-gray-100 dark:bg-neutral-800 rounded-md py-2'>FRI</div>
                </td>

                {showSaturday && <td className='w-28 p-0.5 h-[inherit]'>
                  <div className='h-full w-full text-xs font-semibold bg-gray-100 dark:bg-neutral-800 rounded-md py-2'>SAT</div>
                </td>}
              </tr>
            </thead>
            <tbody>
              {scheduleTimeSlots.map((time, index) => (
                <TimeslotHeader key={index} time={time.time} start={time.start} end={time.end} firstRow={index == 0} ref={timetableCell} showSaturday={showSaturday} />
              ))}
            </tbody>
          </table>
          <div className='absolute top-0 left-0 w-full h-full'>
            {timetableDataWithFraction.map((data, index) => (
              <TimetableSlot 
                key={index} 
                course={data} 
                tableDim={tableDim} 
                fraction={data.fraction} 
                fractionIndex={data.fractionIndex} 
              />
            ))}
          </div>
        </div>
      </div>
    );
};

export default Timetable;