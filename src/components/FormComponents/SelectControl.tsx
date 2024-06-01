// @ts-nocheck
import {Input, InputProps, Option, Select, SelectProps} from '@mui/joy';
import {Controller, Path, Control, FieldValues} from 'react-hook-form';

const SelectControl = <T extends FieldValues, OptionValue extends {}>({ control, name, rules = {}, options, ...rest }: { control: Control<T>, rules?: any, name: Path<T>, options: { label: string, value: OptionValue }[] } & SelectProps<OptionValue>) => {

    return <Controller
        control={control}
        name={name}
        rules={rules}
        render={({field: { value, onChange}}) => (
            <Select
                value={value}
                defaultValue={options[0]?.value}
                onChange={(e,v) => onChange(v)}
                {...rest}
            >
                {options.map((option, i) => <Option key={i} value={option.value}>{option.label}</Option>)}
            </Select>
        )}
    />
}

export default SelectControl;