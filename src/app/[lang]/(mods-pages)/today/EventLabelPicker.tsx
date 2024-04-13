import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';

export const EventLabelPicker = ({ value, setValue }: { value: string | undefined; setValue: (str: string) => void; }) => {
    const [open, setOpen] = useState(false);

    //TODO: user defined labels, should have ability to add new labels
    const options = ['Event', 'Course', 'Meeting', 'Assignment', 'Exam', 'Holiday', 'Birthday', 'Anniversary'];
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {options.find((framework) => framework === value ?? options[0]) ?? "標籤"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
                <Command defaultValue={options[0]}>
                    <CommandInput placeholder="標籤" />
                    <CommandList>
                        <CommandEmpty>No label found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((op) => (
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
                                            value === op ? "opacity-100" : "opacity-0"
                                        )} />
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
