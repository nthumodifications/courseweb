import { Input, InputProps } from "@mui/joy";
import { Controller, Path, Control, FieldValues } from "react-hook-form";

const InputControl = <T extends FieldValues>({
  control,
  name,
  rules = {},
  ...rest
}: { control: Control<T>; rules?: any; name: Path<T> } & InputProps) => {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field: { value, onChange } }) => (
        <Input value={value} onChange={onChange} {...rest} />
      )}
    />
  );
};

export default InputControl;
