import {Checkbox, FormControl, FormLabel, List, ListItem} from '@mui/joy';
import {Controller, Path, Control, FieldValues} from 'react-hook-form';

const MultiSelectControl = <T extends FieldValues>({ control, name, options, label }: { control: Control<T>, name: Path<T>, options: { value: any, label: string }[], label: string }) => {
    return <Controller
        control={control}
        name={name}
        render={({ field: {value, onChange} }) => (
            <FormControl>
                <FormLabel>{label}</FormLabel>
                <List size="sm">
                    {options.map(op => <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <Checkbox
                        label={op.label}
                        color="neutral"
                        size="sm"
                        overlay
                        checked={value.includes(op.value)}
                        onChange={(event) => {
                            onChange(event.target.checked? [...value, op.value] : value.filter((v: any) => v !== op.value))
                        }}
                    />
                    </ListItem>)}
                </List>
            </FormControl>
        )}
    />
}


export default MultiSelectControl;