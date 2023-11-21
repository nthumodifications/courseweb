'use client';
import TimeslotHeader from '@/components/Timetable/TimeslotHeader';
import TimetableSlot from '@/components/Timetable/TimetableSlot';
import { scheduleTimeSlots } from '@/const/timetable';
import {CourseTimeslotData, CourseTimeslotDataWithFraction, TimeSlot, TimetableDim} from '@/types/timetable';
import {FC, ReactNode, useLayoutEffect, useMemo, useRef, useState} from 'react';
import TimetableSlotVertical from '@/components/Timetable/TimetableSlotVertical';
import Link from 'next/link';
import { useSettings } from '@/hooks/contexts/settings';


const Timetable: FC<{ 
  timetableData: CourseTimeslotData[], 
  vertical?: boolean, 
  renderTimetableSlot?: (course: CourseTimeslotDataWithFraction, tableDim: TimetableDim, vertical?: boolean) => ReactNode 
}> = ({ timetableData = [], vertical = false, renderTimetableSlot }) => {
    const headerRow = useRef<HTMLTableCellElement>(null);
    const timetableCell = useRef<HTMLTableCellElement>(null);
    const [tableDim, setTableDim] = useState({ header: { width: 0, height: 0 }, timetable: { width: 0, height: 0 } });
    const { language } = useSettings();
  

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
    }, [vertical, timetableData]);
    
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

    const _renderTimetableSlot = (course: CourseTimeslotDataWithFraction, tableDim: TimetableDim, vertical: boolean) => {
      return <Link href={`/${language}/courses/${course.course.raw_id}`}>
      {vertical ? 
        <TimetableSlotVertical 
          course={course} 
          tableDim={tableDim} 
          fraction={course.fraction} 
          fractionIndex={course.fractionIndex} />
        :
        <TimetableSlot 
          course={course} 
          tableDim={tableDim} 
          fraction={course.fraction} 
          fractionIndex={course.fractionIndex} />
      }
      </Link>
    }

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
            {timetableDataWithFraction.map((data, index) => renderTimetableSlot ? 
              renderTimetableSlot(data, tableDim, vertical): 
              _renderTimetableSlot(data, tableDim, vertical)
            )}
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
              <tr>
                <td className="w-[40px] min-w-[40px]" ref={headerRow}></td>
                <td className='text-xs font-semibold w-28 py-2 border border-gray-300 dark:border-neutral-700'>MON</td>
                <td className='text-xs font-semibold w-28 py-2 border border-gray-300 dark:border-neutral-700'>TUE</td>
                <td className='text-xs font-semibold w-28 py-2 border border-gray-300 dark:border-neutral-700'>WED</td>
                <td className='text-xs font-semibold w-28 py-2 border border-gray-300 dark:border-neutral-700'>THU</td>
                <td className='text-xs font-semibold w-28 py-2 border border-gray-300 dark:border-neutral-700'>FRI</td>
                {showSaturday && <td className='text-xs font-semibold w-28 py-2 border border-gray-300 dark:border-neutral-700'>SAT</td>}
              </tr>
            </thead>
            <tbody>
              {scheduleTimeSlots.map((time, index) => (
                <TimeslotHeader key={index} time={time.time} start={time.start} end={time.end} firstRow={index == 0} ref={timetableCell} showSaturday={showSaturday} />
              ))}
            </tbody>
          </table>
          <div className='absolute top-0 left-0 w-full h-full'>
          {timetableDataWithFraction.map((data, index) => renderTimetableSlot ? 
              renderTimetableSlot(data, tableDim, vertical): 
              _renderTimetableSlot(data, tableDim, vertical)
            )}
          </div>
        </div>
      </div>
    );
};

export default Timetable;