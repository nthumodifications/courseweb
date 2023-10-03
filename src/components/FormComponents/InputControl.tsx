import { Input, InputProps } from '@mui/joy';
import {Controller, Path, Control, FieldValues} from 'react-hook-form';

const InputControl = <T extends FieldValues>({ control, name, ...rest }: { control: Control<T>, name: Path<T> } & InputProps) => {
    return <Controller
        control={control}
        name={name}
        render={({field: { value, onChange}}) => (
            <Input
                value={value}
                onChange={onChange}
                {...rest}
                />
        )}
    />
}

export default InputControl;