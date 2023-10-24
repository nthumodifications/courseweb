import {scheduleTimeSlots} from '@/const/timetable';
import {FC} from 'react';

const TimeslotSelector: FC<{ value: string[], onChange: (newvalue: string[]) => void }> = ({ value = [], onChange }) => {
    const days = ['M', 'T', 'W', 'R', 'F', 'S'];

    const isSelected = (timecode: string) => {
        return value.includes(timecode);
    }

    const handleChange = (timecode: string) => () => {
        if(isSelected(timecode)) {
            onChange(value.filter(tc => tc != timecode))
        } else {
            onChange([...value, timecode])
        }

    }

    return <div className='grid grid-cols-[repeat(7,24px)] grid-rows-[repeat(14,24px)] gap-1 text-center text-sm'>
        <div className='w-4 h-4'></div>
        {days.map(day => (<div className='' key={day}>{day}</div>))}
        {scheduleTimeSlots.map(timeSlot => [
            <div key={timeSlot.time}>{timeSlot.time}</div>,
            ...days.map(day => (
                <div 
                    key={day+timeSlot.time}
                    className={`${!isSelected(day+timeSlot.time)?"bg-gray-200 hover:bg-gray-100":"bg-gray-400 hover:bg-gray-300"} transition-colors cursor-pointer`}
                    onClick={handleChange(day+timeSlot.time)}
                >
                </div>)
            ).flat()
        ])}
    </div>
    
}


export default TimeslotSelector;