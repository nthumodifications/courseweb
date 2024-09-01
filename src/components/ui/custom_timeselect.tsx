"use client";
import * as React from "react";

import clsx from "clsx";
import { CommandList, Command as CommandPrimitive } from "cmdk";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { set } from "date-fns";
import { Popover, PopoverContent } from "./popover";
import { PopoverAnchor, PopoverPortal } from "@radix-ui/react-popover";

export const getNearestTime = (date: Date, minuteStep: number) => {
  const minutes = date.getMinutes();
  const rounded = Math.round(minutes / minuteStep) * minuteStep;
  const time = {
    hours: date.getHours(),
    minutes: rounded,
  };
  if (rounded >= 60) {
    time.hours += 1;
    time.minutes = 0;
  }
  if (time.hours >= 24) {
    time.hours = 0;
  }
  //return as { hours: HH, minutes: MM }
  return time;
};

export const getHourMinute = (date: Date) => {
  return { hours: date.getHours(), minutes: date.getMinutes() };
};

export const getTimeLabel = (time: { hours: number; minutes: number }) =>
  `${String(time.hours).padStart(2, "0")}:${String(time.minutes).padStart(2, "0")}`;

export function TimeSelect({
  label = "Select time",
  placeholder = "Select time",
  parentClassName,
  date,
  onDateChange,
  minuteStep = 15,
}: {
  label?: string;
  placeholder?: string;
  parentClassName?: string;
  date: Date;
  onDateChange: (date: Date) => void;
  minuteStep?: number;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);

  const [selected_time, setSelected] = React.useState<{
    hours: number;
    minutes: number;
  }>(getHourMinute(date));
  const [inputValue, setInputValue] = React.useState(
    getTimeLabel(selected_time),
  );

  React.useEffect(() => {
    onDateChange?.(
      set(date, { ...selected_time, seconds: 0, milliseconds: 0 }),
    );
  }, [selected_time]);

  React.useEffect(() => {
    //check if selected_time is not same as date
    const time = getHourMinute(date);
    if (
      selected_time.hours === time.hours &&
      selected_time.minutes === time.minutes
    )
      return;
    setSelected(time);
    setInputValue(getTimeLabel(time));
  }, [date]);

  // const selectables = data.filter((item) => !selected_state.includes(item));
  const selectables = React.useMemo(() => {
    //generate times from 00:00 to 23:59, with minuteStep interval, return { label: "HH:MM", value: { hours: HH, minutes: MM } }
    const times = [];
    for (let i = 0; i < 24 * 60; i += minuteStep) {
      const hours = Math.floor(i / 60);
      const minutes = i % 60;
      times.push({
        label: getTimeLabel({ hours, minutes }),
        value: { hours, minutes },
      });
    }
    return times;
  }, [minuteStep]);

  const handleInputBlur = React.useCallback(() => {
    setOpen(false);
    // check if inputvalue is not same as selected
    const selected = selectables.find((item) => item.label === inputValue);
    if (selected) return;
    // since is new value, try to parse it, accept HH:MM, HHMM, HH MM or HH MM AM/PM
    const match = inputValue.match(/(\d{1,2})[ :]?(\d{2})? ?(am|pm)?/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]) || 0;
      const ampm = match[3];
      //adjust hours to 24-hour format
      if (ampm) {
        if (hours === 12) {
          hours = 0;
        }
        if (ampm.toLowerCase() === "pm") {
          hours += 12;
        }
      }
      //check if is valid time
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        setSelected({ hours, minutes });
        setInputValue(getTimeLabel({ hours, minutes }));
      } else {
        setInputValue(getTimeLabel(selected_time));
      }
    } else {
      setInputValue(getTimeLabel(selected_time));
    }
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    //check if is enter key
    if (e.key === "Enter") {
      handleInputBlur();
    } else setOpen(true);
  };

  return (
    <div
      className={clsx(label && "gap-1.5", parentClassName, "grid items-center")}
    >
      <Popover open={open} modal={true}>
        <Command className="overflow-visible bg-transparent w-28">
          <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <div className="gap-1 flex-wrap">
              {/* Avoid having the "Search" Icon */}
              <CommandPrimitive.Input
                ref={inputRef}
                value={inputValue}
                onValueChange={setInputValue}
                onKeyDown={handleKeyDown}
                onBlur={handleInputBlur}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
                className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1 overflow-hidden w-full"
              />
            </div>
          </div>
          <PopoverAnchor />
          <CommandList>
            <PopoverPortal>
              <PopoverContent
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="p-0 w-28 h-0 border-none"
              >
                <div className="relative mt-2">
                  {open && selectables.length > 0 ? (
                    <div className="absolute w-full top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in z-40">
                      <CommandGroup className="h-full overflow-auto">
                        {selectables.map((framework) => {
                          return (
                            <CommandItem
                              autoFocus={false}
                              key={framework.label}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onSelect={(value) => {
                                setInputValue(framework.label);
                                setSelected(framework.value);
                                setOpen(false);
                              }}
                            >
                              {framework.label}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </div>
                  ) : null}
                </div>
              </PopoverContent>
            </PopoverPortal>
          </CommandList>
        </Command>
      </Popover>
    </div>
  );
}
