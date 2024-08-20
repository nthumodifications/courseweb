import { FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export const AutocompleteShadcn = ({
  control,
  name,
  options,
  label,
  placeholder,
  loading,
}: {
  control: any;
  name: string;
  options: { value: string; label: string }[];
  label: string;
  placeholder: string;
  loading: boolean;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormItem>
            <Popover open={open} onOpenChange={setOpen}>
              <div
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "flex flex-row px-0",
                )}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    <span className="gap-1 flex flex-row">
                      {field.value ? field.value : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 -z-0" />
                  </Button>
                </PopoverTrigger>
                {field.value && (
                  <Button
                    onClick={() => field.onChange("")}
                    variant="ghost"
                    size="icon"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <PopoverContent className="w-full p-0" side="bottom">
                <Command className="max-h-60">
                  <CommandInput placeholder="Search classes   ..." />
                  <CommandList>
                    <CommandEmpty>No classes found.</CommandEmpty>
                    <CommandGroup>
                      {options.map((dept) => (
                        <CommandItem
                          key={dept.value}
                          value={dept.value}
                          onSelect={(currentValue: string) => {
                            field.onChange(
                              currentValue === field.value ? "" : currentValue,
                            );
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value == dept.value
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {dept.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormItem>
        </FormItem>
      )}
    />
  );
};
