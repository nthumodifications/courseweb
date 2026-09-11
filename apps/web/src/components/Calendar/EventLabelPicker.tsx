import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@courseweb/ui";
import { forwardRef, useState, type ButtonHTMLAttributes } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@courseweb/ui";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import { useCalendar } from "./calendar_hook";
import useDictionary from "@/dictionaries/useDictionary";

type EventLabelPickerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string | undefined;
  setValue: (str: string) => void;
};

export const EventLabelPicker = forwardRef<
  HTMLButtonElement,
  EventLabelPickerProps
>(({ value, setValue, ...buttonProps }, ref) => {
  const [open, setOpen] = useState(false);

  const { labels } = useCalendar();
  const dict = useDictionary();
  const localizedLabels = [
    dict.calendar.labels.event,
    dict.calendar.labels.course,
    dict.calendar.labels.meeting,
    dict.calendar.labels.assignment,
    dict.calendar.labels.exam,
    dict.calendar.labels.holiday,
    dict.calendar.labels.birthday,
    dict.calendar.labels.anniversary,
  ];
  const getLabelText = (label: string) => {
    const index = labels.indexOf(label);
    return localizedLabels[index] ?? label;
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          {...buttonProps}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className="w-full justify-between"
        >
          {value ? getLabelText(value) : dict.calendar.form.label}
          <ChevronsUpDown
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command defaultValue={labels[0]}>
          <CommandInput placeholder={dict.calendar.form.label} />
          <CommandList>
            <CommandEmpty>{dict.calendar.form.no_label}</CommandEmpty>
            <CommandGroup>
              {labels.map((op) => (
                <CommandItem
                  key={op}
                  value={op}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    aria-hidden="true"
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === op ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {getLabelText(op)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

EventLabelPicker.displayName = "EventLabelPicker";
