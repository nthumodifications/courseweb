import {FC} from 'react';
import {Controller, Control} from 'react-hook-form';
import {RefineControlFormTypes} from '@/components/Courses/RefineControls';
import TimeslotSelector from '@/components/Courses/TimeslotSelector';

const TimeslotSelectorControl: FC<{ control: Control<RefineControlFormTypes> }> = ({ control }) => {
    return <Controller
        control={control}
        name="timeslots"
        render={({ field: { value, onChange } }) => (
            <TimeslotSelector
                value={value}
                onChange={onChange}
            />
        )}
        
    />
}

export default TimeslotSelectorControl;