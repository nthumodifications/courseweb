import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@courseweb/ui";
import { useState } from "react";
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

export const EventLabelPicker = ({
  value,
  setValue,
}: {
  value: string | undefined;
  setValue: (str: string) => void;
}) => {
  const [open, setOpen] = useState(false);

  const { labels } = useCalendar();
  const dict = useDictionary();
  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {labels.find((framework) => framework === value) ?? dict.calendar.form.label}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === op ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {op}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
