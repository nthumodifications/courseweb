import { Autocomplete, AutocompleteProps } from "@mui/joy"
import { Control, Controller, FieldValues, Path } from "react-hook-form"

const AutocompleteControl = <T extends FieldValues, Options, Multiple extends boolean | undefined, DisableClearable extends boolean | undefined, FreeSolo extends boolean | undefined>
    (props: {
        control: Control<T>,
        name: Path<T>,
        rules?: any,
    } & AutocompleteProps<Options, Multiple, DisableClearable, FreeSolo>) => {

    return <Controller
        control={props.control}
        name={props.name}
        rules={props.rules}
        render={({ field: { value, onChange } }) => (
            <Autocomplete
                {...props}
                sx={{ width: 250 }}
                value={value}
                onChange={(e, v) => onChange(v)}
            />
    )} />
}

export default AutocompleteControl;