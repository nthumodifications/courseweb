import {FC} from 'react';
import {Controller, Control} from 'react-hook-form';
import TimeslotSelector from '@/components/Courses/TimeslotSelector';
import SelectControl from './SelectControl';
import { RefineControlFormTypes } from '../Courses/RefineControls';

export enum TimeFilterType {
    Within,
    Includes,
}

const TimeslotSelectorControl: FC<{ control: Control<RefineControlFormTypes> }> = ({ control }) => {
    return <>
        <Controller
            control={control}
            name="timeslots"
            render={({ field: { value, onChange } }) => (
                <TimeslotSelector
                    value={value}
                    onChange={onChange}
                />
            )}
        />
        <SelectControl
            control={control}
            name="timeFilter"
            options={[
                { value: TimeFilterType.Within, label: 'Within' },
                { value: TimeFilterType.Includes, label: 'Includes' },
            ]}
        />
    </>
}

export default TimeslotSelectorControl;