import TimeslotHeader from '@/components/Timetable/TimeslotHeader';
import TimetableSlot from '@/components/Timetable/TimetableSlot';
import {CourseData} from '@/types/courses';
import {TimeSlot} from '@/types/timetable';
import {FC, useLayoutEffect, useRef, useState} from 'react';

const Timetable: FC<{ timetableData: CourseData[] }> = ({ timetableData = [] }) => {
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

    const scheduleTimeSlots: TimeSlot[] = [
        { time: '1', start: '08:00', end: '08:50' },
        { time: '2', start: '09:00', end: '09:50' },
        { time: '3', start: '10:10', end: '11:00' },
        { time: '4', start: '11:10', end: '12:00' },
        { time: 'n', start: '12:10', end: '13:00' },
        { time: '5', start: '13:20', end: '14:10' },
        { time: '6', start: '14:20', end: '15:10' },
        { time: '7', start: '15:30', end: '16:20' },
        { time: '8', start: '16:30', end: '17:20' },
        { time: '9', start: '17:30', end: '18:20' },
        { time: 'a', start: '18:30', end: '19:20' },
        { time: 'b', start: '19:30', end: '20:20' },
        { time: 'c', start: '20:30', end: '21:20' },
    ]

    return (
        <div className="mb-32 text-center lg:mb-0 w-full">
        {/* Timetable, Relative overlay */}
        <div className="relative w-full">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <td className="w-[40px] min-w-[40px]" ref={headerRow}></td>
                <td className='text-xs font-semibold w-28 py-2 border border-black'>MON</td>
                <td className='text-xs font-semibold w-28 py-2 border border-black'>TUE</td>
                <td className='text-xs font-semibold w-28 py-2 border border-black'>WED</td>
                <td className='text-xs font-semibold w-28 py-2 border border-black'>THU</td>
                <td className='text-xs font-semibold w-28 py-2 border border-black'>FRI</td>
              </tr>
            </thead>
            <tbody>
              {scheduleTimeSlots.map((time, index) => (
                <TimeslotHeader key={index} time={time.time} start={time.start} end={time.end} firstRow={index == 0} ref={timetableCell} />
              ))}
            </tbody>
          </table>
          <div className='absolute top-0 left-0 w-full h-full'>
            {/* <div 
              className="absolute rounded-md bg-purple-600 shadow-md shadow-purple-600 transform translate-y-0.5" 
              style={{ 
                left: tableDim.header.width, 
                top: tableDim.header.height, 
                width: tableDim.timetable.width-4, 
                height: tableDim.timetable.height 
              }}>
            </div> */}
            {timetableData.map((data, index) => (<TimetableSlot key={index} course={data} tableDim={tableDim}/>))}
          </div>
        </div>
      </div>
    );
};

export default Timetable;