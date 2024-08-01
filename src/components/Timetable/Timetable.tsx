'use client';
import TimeslotHeader from '@/components/Timetable/TimeslotHeader';
import TimetableSlotVertical from '@/components/Timetable/TimetableSlotVertical';
import { scheduleTimeSlots } from '@/const/timetable';
import {CourseTimeslotData, CourseTimeslotDataWithFraction, TimeSlot, TimetableDim} from '@/types/timetable';
import {FC, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import TimetableSlotHorizontal from '@/components/Timetable/TimetableSlotHorizontal';
import Link from 'next/link';
import { useSettings } from '@/hooks/contexts/settings';
import { BlankTimeslotBody } from './BlankTimeslotBody';


const Timetable: FC<{ 
  timetableData: CourseTimeslotData[], 
  vertical?: boolean, 
  renderTimetableSlot?: (course: CourseTimeslotDataWithFraction, tableDim: TimetableDim, vertical?: boolean) => ReactNode 
}> = ({ timetableData = [], vertical = true, renderTimetableSlot }) => {
    const headerRow = useRef<HTMLTableCellElement>(null);
    const timetableCell = useRef<HTMLTableCellElement>(null);
    const [tableDim, setTableDim] = useState({ header: { width: 0, height: 0 }, timetable: { width: 0, height: 0 } });
    const containerRef = useRef<HTMLDivElement>(null);
  

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
    
    // Check if containerRef is is resized, then update the size
    useLayoutEffect(() => {
      if(typeof window  == "undefined" || !containerRef.current) return ;
      updateSize();
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(containerRef.current);
      return () => observer.disconnect();
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
        // const fractionIndex = acc.filter(course => timeSlots.some(slot => course.timeSlots.includes(slot))).length > 0 
        //   ? acc.filter(course => timeSlots.some(slot => course.timeSlots.includes(slot)))[0].fractionIndex + 1
        //   : 1;
        // the code above doesn't assign fractionIndex > 2 because it always checks the first course in the array, which is always 1
        // the code below checks if there is any course with the same fraction and fractionIndex > 1, if there is, then the fractionIndex will be the maximum of the fractionIndex + 1
        const fractionIndex = acc.filter(course => timeSlots.some(slot => course.timeSlots.includes(slot))).length > 0 
          ? Math.max(...acc.filter(course => timeSlots.some(slot => course.timeSlots.includes(slot))).map(course => course.fractionIndex)) + 1
          : 1;
        acc.push({ ...cur, fraction, fractionIndex, timeSlots });
        return acc;
      }, [] as CourseTimeslotDataWithFraction[]);

      return timetableDataWithFraction
    }, [timetableData]);    

    // console.log(timetableDataWithFraction)

    const showSaturday = timetableData.some(course => course.dayOfWeek == 5);

    const days = showSaturday ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']: ['MON', 'TUE', 'WED', 'THU', 'FRI'];

    const _renderTimetableSlot = (course: CourseTimeslotDataWithFraction, tableDim: TimetableDim, vertical: boolean) => {
      return vertical ? 
        <TimetableSlotVertical 
          key={course.dayOfWeek+course.startTime+course.endTime+course.course.raw_id}
          course={course} 
          tableDim={tableDim} 
          fraction={course.fraction} 
          fractionIndex={course.fractionIndex} />
        :
        <TimetableSlotHorizontal 
          key={course.dayOfWeek+course.startTime+course.endTime+course.course.raw_id}
          course={course} 
          tableDim={tableDim} 
          fraction={course.fraction} 
          fractionIndex={course.fractionIndex} />
    }

    if(!vertical) return (
      <div className="text-center lg:mb-0 w-full overflow-x-auto overflow-y-hidden">
        {/* Timetable, Relative overlay */}
        <div className="relative w-full">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <td className="min-w-[60px]" ref={headerRow}>
                </td>
              {scheduleTimeSlots.map((time, index) => (
                <td className="min-w-[120px] px-2" key={index}>
                  <div className='flex flex-row justify-between items-baseline  text-gray-400'>
                    <span className='text-xs'>{time.start}</span>
                    <span className='text-sm font-bold'>{time.time}</span>
                    <span className='text-xs'>{time.end}</span>
                  </div>
                </td>
              ))}
              </tr>
            </thead>
            <tbody>
              {days.map((dayStr, index) => <tr key={index} className='h-0.5'>
                
                <td className='sticky left-0 z-10 w-28 p-0.5 h-[inherit]'>
                  <div className='w-full text-xs font-semibold bg-gray-100 dark:bg-neutral-800 rounded-md h-20 flex flex-col justify-center'>
                    {dayStr}
                  </div>
                </td>
                {scheduleTimeSlots.map((time, slot) => (
                  <td key={time.time} className='w-28 p-0.5 h-[inherit]' ref={timetableCell}>
                    <BlankTimeslotBody/>
                  </td>
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
        <div className="text-center lg:mb-0 w-full overflow-hidden" ref={containerRef}>
        {/* Timetable, Relative overlay */}
        <div className="relative w-full">
          <table className="table-fixed w-full">
            <thead>
              <tr className='h-1'>
                <td className="w-[40px] min-w-[40px]" ref={headerRow}></td>
                <td className='p-0.5 h-[inherit]'>
                  <div className='h-full w-full text-xs font-semibold bg-gray-100 dark:bg-neutral-800 rounded-md py-2'>MON</div>
                </td>
                <td className='p-0.5 h-[inherit]'>
                  <div className='h-full w-full text-xs font-semibold bg-gray-100 dark:bg-neutral-800 rounded-md py-2'>TUE</div>
                </td>
                <td className='p-0.5 h-[inherit]'>
                  <div className='h-full w-full text-xs font-semibold bg-gray-100 dark:bg-neutral-800 rounded-md py-2'>WED</div>
                </td>
                <td className='p-0.5 h-[inherit]'>
                  <div className='h-full w-full text-xs font-semibold bg-gray-100 dark:bg-neutral-800 rounded-md py-2'>THU</div>
                </td>
                <td className='p-0.5 h-[inherit]'>
                  <div className='h-full w-full text-xs font-semibold bg-gray-100 dark:bg-neutral-800 rounded-md py-2'>FRI</div>
                </td>

                {showSaturday && <td className='p-0.5 h-[inherit]'>
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