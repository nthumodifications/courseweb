import { addMinutes } from "date-fns";
import { cn } from "@courseweb/ui";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { z } from "zod";
import { UseFormReturn, useForm, useWatch } from "react-hook-form";
import { Popover, PopoverContent, PopoverTrigger } from "@courseweb/ui";
import { Calendar as ShadcnCalendar } from "@courseweb/ui";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "@courseweb/ui";
import { Switch } from "@courseweb/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import { Textarea } from "@courseweb/ui";
import { CalendarEvent } from "./calendar.types";
import { eventFormSchema } from "./eventFormSchema";
import { EventLabelPicker } from "./EventLabelPicker";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { getNearestTime } from "@courseweb/ui";
import { PopoverPortal } from "@radix-ui/react-popover";
import { ScrollArea } from "@courseweb/ui";
import { RadioGroup, RadioGroupItem } from "@courseweb/ui";
import { Label } from "@courseweb/ui";
import { useCalendar } from "./calendar_hook";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { zodResolver } from "@hookform/resolvers/zod";
import { getLocale } from "@/helpers/dateLocale";
import {
  addTaipeiDays,
  differenceInTaipeiCalendarDays,
  endOfTaipeiDay,
  formatTaipei,
  fromTaipeiCalendarDate,
  getTaipeiDateKey,
  setTaipeiWallClock,
  startOfTaipeiDay,
  toTaipeiWallClock,
} from "@/helpers/dates";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";

const AccessibleColorPicker = ({
  color,
  colors,
  colorLabel,
  onChange,
}: {
  color: string;
  colors: string[];
  colorLabel: (color: string) => string;
  onChange: (color: string) => void;
}) => {
  const swatchRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(colors.indexOf(color), 0);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    swatchRefs.current[activeIndex]?.focus();
  }, []);

  const handleKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const columnCount = 5;
    let nextIndex = index;

    if (event.key === "ArrowRight") nextIndex = (index + 1) % colors.length;
    if (event.key === "ArrowLeft")
      nextIndex = (index - 1 + colors.length) % colors.length;
    if (event.key === "ArrowDown")
      nextIndex = Math.min(index + columnCount, colors.length - 1);
    if (event.key === "ArrowUp") nextIndex = Math.max(index - columnCount, 0);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = colors.length - 1;

    if (nextIndex !== index) {
      event.preventDefault();
      setActiveIndex(nextIndex);
      onChange(colors[nextIndex]);
      swatchRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange(colors[index]);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={colorLabel(color)}
      className="flex max-w-[220px] flex-wrap gap-2"
    >
      {colors.map((swatchColor, index) => (
        <button
          key={swatchColor}
          ref={(element) => {
            swatchRefs.current[index] = element;
          }}
          type="button"
          role="radio"
          aria-checked={swatchColor === color}
          aria-label={colorLabel(swatchColor)}
          tabIndex={index === activeIndex ? 0 : -1}
          className="h-7 w-7 rounded-full border-2 border-background outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ backgroundColor: swatchColor }}
          onClick={() => {
            setActiveIndex(index);
            onChange(swatchColor);
          }}
          onKeyDown={(event) => handleKeyDown(event, index)}
        />
      ))}
    </div>
  );
};

export const EventForm = ({
  defaultEvent,
  onSubmit,
  open,
}: {
  defaultEvent?: Partial<CalendarEvent>;
  onSubmit: (data: CalendarEvent) => void;
  open: boolean;
}) => {
  const { currentColors } = useUserTimetable();
  const { labels } = useCalendar();
  const { language } = useSettings();
  const dict = useDictionary();
  const minuteStep = 15;
  // Track initialization state outside of the form
  const [hasInitialized, setHasInitialized] = useState(false);

  // Event generation logic moved from AddEventButton
  const generateEmptyEvent = useCallback(
    () => ({
      id: uuidv4(),
      title: undefined,
      details: undefined,
      allDay: true,
      start: startOfTaipeiDay(new Date()),
      end: endOfTaipeiDay(new Date()),
      repeat: null,
      color: currentColors[0],
      tag: labels[0],
    }),
    [currentColors, labels],
  );

  // Merge default event with generated empty event when id is missing
  const mergedDefaultEvent = useMemo(() => {
    if (!defaultEvent) return undefined;

    // If default event has an ID, use it as is
    if (defaultEvent.id) return defaultEvent;

    // Otherwise, merge with an empty event
    return {
      ...generateEmptyEvent(),
      ...defaultEvent,
    };
  }, [defaultEvent, generateEmptyEvent]);

  // Form setup moved from AddEventButton
  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: useMemo(() => {
      if (mergedDefaultEvent) {
        return {
          ...mergedDefaultEvent,
          repeat:
            mergedDefaultEvent.repeat === null
              ? { type: null }
              : mergedDefaultEvent.repeat,
        };
      }
      return {
        ...generateEmptyEvent(),
        repeat: { type: null },
      };
    }, [mergedDefaultEvent, generateEmptyEvent]),
    mode: "onChange",
  });

  // Reset form only when the dialog is opened or when defaultEvent intentionally changes
  useEffect(() => {
    if (open) {
      const initialValues = mergedDefaultEvent
        ? {
            ...mergedDefaultEvent,
            repeat:
              mergedDefaultEvent.repeat === null
                ? { type: null }
                : mergedDefaultEvent.repeat,
          }
        : {
            ...generateEmptyEvent(),
            repeat: { type: null },
          };

      form.reset(initialValues);
      // Explicitly set hasInitialized to true if we have a defaultEvent with start/end
      if (mergedDefaultEvent?.start && mergedDefaultEvent?.end) {
        setHasInitialized(true);
      }
    }
  }, [open, mergedDefaultEvent, generateEmptyEvent]); // Include entire mergedDefaultEvent to catch any changes

  // Form submission handler
  const handleSubmit = (data: z.infer<typeof eventFormSchema>) => {
    const eventDef: CalendarEvent = {
      ...data,
      repeat: data.repeat.type == null ? null : data.repeat,
    };
    onSubmit(eventDef);
  };

  // Watch key form values
  const allDay = useWatch({ control: form.control, name: "allDay" });
  const repeatType = useWatch({ control: form.control, name: "repeat.type" });
  const repeatMode = useWatch({ control: form.control, name: "repeat.mode" });

  // Initialize time settings once when component mounts and only for new events
  useEffect(() => {
    // Only run this once on first opening if no default event was provided
    // And only if we haven't initialized before
    if (!defaultEvent && open && !hasInitialized) {
      // Check if defaultEvent has start/end times before setting defaults
      // This is critical to prevent overwrites
      const currentStart = form.getValues("start");
      const currentEnd = form.getValues("end");

      // Only initialize if we don't have valid times already
      if (
        !currentStart ||
        !currentEnd ||
        (toTaipeiWallClock(currentStart).getHours() === 0 &&
          toTaipeiWallClock(currentStart).getMinutes() === 0 &&
          toTaipeiWallClock(currentEnd).getHours() === 23 &&
          toTaipeiWallClock(currentEnd).getMinutes() === 59)
      ) {
        const nearestTime = getNearestTime(
          toTaipeiWallClock(new Date()),
          minuteStep,
        );
        const defaultStart = setTaipeiWallClock(new Date(), nearestTime);
        const defaultEnd = addMinutes(defaultStart, 30);

        if (!allDay) {
          form.setValue("start", defaultStart);
          form.setValue("end", defaultEnd);
          form.trigger(["start", "end"]);
        }
      }

      // Mark as initialized regardless to prevent future attempts
      setHasInitialized(true);
    }
  }, [open, defaultEvent, hasInitialized, form, allDay, minuteStep]);

  // Reset initialized state when dialog closes
  useEffect(() => {
    if (!open) {
      setHasInitialized(false);
    }
  }, [open]);

  // Handle allDay toggle changes
  useEffect(() => {
    // Only run this when allDay changes and after initialization
    if (form.getValues("start") && form.getValues("end") && hasInitialized) {
      // Store the current values to preserve when toggling
      const currentStart = form.getValues("start");
      const currentEnd = form.getValues("end");

      if (allDay) {
        // Convert to all day event - set to start of day and end of day
        // but preserve the date
        form.setValue("start", startOfTaipeiDay(currentStart));
        form.setValue("end", endOfTaipeiDay(currentEnd));
      } else {
        // Convert from all day to specific time
        const currentTime = toTaipeiWallClock(new Date());

        // If we have defaultEvent with specific times, prioritize those times
        if (defaultEvent?.start && defaultEvent?.end && !defaultEvent.allDay) {
          // Use the time portion from defaultEvent but keep current date
          form.setValue(
            "start",
            setTaipeiWallClock(currentStart, {
              hours: toTaipeiWallClock(defaultEvent.start).getHours(),
              minutes: toTaipeiWallClock(defaultEvent.start).getMinutes(),
            }),
          );

          form.setValue(
            "end",
            setTaipeiWallClock(currentEnd, {
              hours: toTaipeiWallClock(defaultEvent.end).getHours(),
              minutes: toTaipeiWallClock(defaultEvent.end).getMinutes(),
            }),
          );
        } else {
          // Otherwise, use current time
          const defaultStart = setTaipeiWallClock(currentStart, {
            hours: currentTime.getHours(),
            minutes:
              Math.floor(currentTime.getMinutes() / minuteStep) * minuteStep,
            seconds: 0,
            milliseconds: 0,
          });

          form.setValue("start", defaultStart);
          form.setValue("end", addMinutes(defaultStart, 30));
        }
      }

      form.trigger(["start", "end"]);
    }
  }, [allDay, hasInitialized, defaultEvent]); // Add dependencies on hasInitialized and defaultEvent

  // Handle repeat type changes
  useEffect(() => {
    if (repeatType) {
      // Switching back from "No repeat" clears these fields. Restore every
      // missing part whenever a repeat type is selected, including edits of
      // events that originally had a different repeat configuration.
      if (form.getValues("repeat.interval") == null) {
        form.setValue("repeat.interval", 1);
      }
      if (form.getValues("repeat.mode") == null) {
        form.setValue("repeat.mode", "count");
      }
      if (form.getValues("repeat.value") == null) {
        form.setValue("repeat.value", 1);
      }
    } else {
      // Clear repeat values if repeat is turned off
      form.setValue("repeat.interval", undefined!);
      form.setValue("repeat.value", undefined!);
      form.setValue("repeat.mode", undefined!);
    }
  }, [repeatType]); // Only dependency is repeatType

  // Handle repeat mode changes
  useEffect(() => {
    if (!repeatMode) return;

    if (repeatMode === "count") {
      // Set appropriate count value
      const countValue =
        defaultEvent?.repeat?.mode === "count" ? defaultEvent.repeat.value : 1;
      form.setValue("repeat.value", countValue);
    } else if (repeatMode === "date") {
      // Set appropriate date value
      const dateValue =
        defaultEvent?.repeat?.mode === "date"
          ? defaultEvent.repeat.value
          : addTaipeiDays(new Date(), 7).getTime(); // Default to one week in the future
      form.setValue("repeat.value", dateValue);
    }
  }, [repeatMode]); // Only dependency is repeatMode

  // Date/time pickers for non-all-day events
  const renderTimeDatePicker = () => (
    <div className="grid grid-cols-1 gap-4">
      <FormField
        control={form.control}
        name="start"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{dict.calendar.form.start}</FormLabel>
            <div className="flex flex-row space-x-2">
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant={"outline"}
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        formatTaipei(field.value, "yyyy-LL-dd (EE)", {
                          locale: getLocale(language),
                        })
                      ) : (
                        <span>{dict.calendar.form.pick_date}</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverPortal>
                  <PopoverContent className="w-auto p-0">
                    <ShadcnCalendar
                      mode="single"
                      selected={toTaipeiWallClock(field.value)}
                      onSelect={(d) => {
                        if (!d) return;
                        // Preserve time when changing date
                        const currentTime = toTaipeiWallClock(field.value);
                        const newDate = setTaipeiWallClock(
                          fromTaipeiCalendarDate(d),
                          {
                            hours: currentTime.getHours(),
                            minutes: currentTime.getMinutes(),
                          },
                        );

                        // Calculate difference to maintain duration
                        const diff =
                          form.getValues("end").getTime() -
                          field.value.getTime();

                        field.onChange(newDate);
                        form.setValue(
                          "end",
                          new Date(newDate.getTime() + diff),
                        );
                        form.trigger("end");
                      }}
                      initialFocus
                      defaultMonth={toTaipeiWallClock(field.value)}
                    />
                  </PopoverContent>
                </PopoverPortal>
              </Popover>

              <FormControl>
                <Input
                  type="time"
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value
                      .split(":")
                      .map(Number);
                    if (isNaN(hours) || isNaN(minutes)) return;

                    // Create new date with updated time
                    const newTime = setTaipeiWallClock(field.value, {
                      hours,
                      minutes,
                    });

                    // Maintain event duration
                    const duration =
                      form.getValues("end").getTime() - field.value.getTime();
                    const newEndTime = new Date(newTime.getTime() + duration);

                    // Update form values
                    field.onChange(newTime);

                    // Make sure end time doesn't exceed day boundary
                    if (
                      newEndTime.getTime() > endOfTaipeiDay(newTime).getTime()
                    ) {
                      form.setValue("end", endOfTaipeiDay(newTime));
                    } else {
                      form.setValue("end", newEndTime);
                    }

                    form.trigger("end");
                  }}
                  value={formatTaipei(field.value, "HH:mm")}
                />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="end"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{dict.calendar.form.end}</FormLabel>
            <div className="flex flex-row space-x-2">
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant={"outline"}
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        formatTaipei(field.value, "yyyy-LL-dd (EE)", {
                          locale: getLocale(language),
                        })
                      ) : (
                        <span>{dict.calendar.form.pick_date}</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverPortal>
                  <PopoverContent className="w-auto p-0">
                    <ShadcnCalendar
                      mode="single"
                      selected={toTaipeiWallClock(field.value)}
                      onSelect={(d) => {
                        if (!d) return;
                        // Preserve time when changing date
                        const currentTime = toTaipeiWallClock(field.value);
                        const newDate = setTaipeiWallClock(
                          fromTaipeiCalendarDate(d),
                          {
                            hours: currentTime.getHours(),
                            minutes: currentTime.getMinutes(),
                          },
                        );
                        field.onChange(newDate);
                      }}
                      initialFocus
                      defaultMonth={toTaipeiWallClock(field.value)}
                    />
                  </PopoverContent>
                </PopoverPortal>
              </Popover>

              <FormControl>
                <Input
                  type="time"
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value
                      .split(":")
                      .map(Number);
                    if (isNaN(hours) || isNaN(minutes)) return;

                    // Create new date with updated time
                    const newTime = setTaipeiWallClock(field.value, {
                      hours,
                      minutes,
                    });
                    field.onChange(newTime);
                  }}
                  value={formatTaipei(field.value, "HH:mm")}
                />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  // Date pickers for all-day events
  const renderAllDayDatePicker = () => (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="start"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{dict.calendar.form.start_date}</FormLabel>
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? (
                      formatTaipei(field.value, "yyyy-LL-dd (EE)", {
                        locale: getLocale(language),
                      })
                    ) : (
                      <span>{dict.calendar.form.pick_date}</span>
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <ShadcnCalendar
                  mode="single"
                  selected={toTaipeiWallClock(field.value)}
                  onSelect={(d) => {
                    if (!d) return;

                    // Calculate current event duration in days
                    const diffInDays = differenceInTaipeiCalendarDays(
                      form.getValues("end"),
                      form.getValues("start"),
                    );

                    // Update start and end dates while maintaining duration
                    const startDate = fromTaipeiCalendarDate(d);
                    const endDate = endOfTaipeiDay(
                      addTaipeiDays(startDate, diffInDays),
                    );

                    field.onChange(startDate);
                    form.setValue("end", endDate);
                    form.trigger("end");
                  }}
                  defaultMonth={toTaipeiWallClock(field.value)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="end"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{dict.calendar.form.end_date}</FormLabel>
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? (
                      formatTaipei(field.value, "yyyy-LL-dd (EE)", {
                        locale: getLocale(language),
                      })
                    ) : (
                      <span>{dict.calendar.form.pick_date}</span>
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <ShadcnCalendar
                  mode="single"
                  selected={toTaipeiWallClock(field.value)}
                  onSelect={(d) => {
                    if (!d) return;

                    // Ensure end date is not before start date
                    const startDate = form.getValues("start");
                    const endDate = fromTaipeiCalendarDate(d);
                    if (
                      getTaipeiDateKey(endDate) < getTaipeiDateKey(startDate)
                    ) {
                      form.setError("end", {
                        type: "manual",
                        message: dict.calendar.form.end_before_start,
                      });
                      return;
                    }

                    field.onChange(endOfTaipeiDay(endDate));
                  }}
                  initialFocus
                  defaultMonth={toTaipeiWallClock(field.value)}
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  // Repeat settings UI
  const renderRepeatSection = () => {
    if (!repeatType) return null;

    return (
      <>
        {/* Interval setting */}
        <FormField
          control={form.control}
          name="repeat.interval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.calendar.form.interval}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder={dict.calendar.form.interval}
                  {...field}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    field.onChange(isNaN(value) || value < 1 ? 1 : value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* End of repeat options */}
        <FormField
          control={form.control}
          name="repeat.mode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.calendar.form.end_repeat}</FormLabel>
              <div className="space-y-2">
                <FormControl>
                  <RadioGroup
                    value={field.value || "count"}
                    onValueChange={field.onChange}
                    aria-label={dict.calendar.form.end_repeat}
                    className="flex flex-col space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="count"
                        id="repeat-count"
                        aria-label={dict.calendar.form.after}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor="repeat-count-value"
                          className="block mb-1"
                        >
                          {dict.calendar.form.after}
                        </Label>
                        <FormField
                          control={form.control}
                          name="repeat.value"
                          render={({ field: valueField }) => (
                            <>
                              <FormControl>
                                <Input
                                  id="repeat-count-value"
                                  type="number"
                                  min="1"
                                  aria-label={
                                    dict.calendar.form.number_occurrences
                                  }
                                  placeholder={
                                    dict.calendar.form.number_occurrences
                                  }
                                  disabled={repeatMode !== "count"}
                                  {...valueField}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    valueField.onChange(
                                      isNaN(value) || value < 1 ? 1 : value,
                                    );
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="date"
                        id="repeat-date"
                        aria-label={dict.calendar.form.on_date}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor="repeat-date-value"
                          className="block mb-1"
                        >
                          {dict.calendar.form.on_date}
                        </Label>
                        <FormField
                          control={form.control}
                          name="repeat.value"
                          render={({ field: valueField }) => (
                            <>
                              <Popover modal={true}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      id="repeat-date-value"
                                      type="button"
                                      variant={"outline"}
                                      className="w-full justify-start text-left"
                                      aria-label={dict.calendar.form.on_date}
                                      disabled={repeatMode !== "date"}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {repeatMode === "date" &&
                                      typeof valueField.value === "number" ? (
                                        formatTaipei(
                                          new Date(valueField.value),
                                          "PPP",
                                          {
                                            locale: getLocale(language),
                                          },
                                        )
                                      ) : (
                                        <span>
                                          {dict.calendar.form.pick_end_date}
                                        </span>
                                      )}
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  {repeatMode === "date" && (
                                    <ShadcnCalendar
                                      mode="single"
                                      selected={toTaipeiWallClock(
                                        new Date(valueField.value),
                                      )}
                                      onSelect={(v) =>
                                        valueField.onChange(
                                          v
                                            ? fromTaipeiCalendarDate(
                                                v,
                                              ).getTime()
                                            : Date.now(),
                                        )
                                      }
                                      initialFocus
                                      defaultMonth={toTaipeiWallClock(
                                        new Date(valueField.value),
                                      )}
                                    />
                                  )}
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </>
                          )}
                        />
                      </div>
                    </div>
                  </RadioGroup>
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </>
    );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col space-y-6"
      >
        <ScrollArea className="max-h-[80dvh]">
          <div className="space-y-4 p-1">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.calendar.form.title}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={dict.calendar.form.event_title}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.calendar.form.location}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={dict.calendar.form.location}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* All Day Toggle */}
            <FormField
              control={form.control}
              name="allDay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-y-0 gap-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">
                    {dict.calendar.form.all_day}
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date/Time Selection - different UI based on all day setting */}
            {allDay ? renderAllDayDatePicker() : renderTimeDatePicker()}

            {/* Repeat Settings */}
            <FormField
              control={form.control}
              name="repeat.type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.calendar.form.repeat}</FormLabel>
                  <Select
                    value={String(field.value || "null")}
                    onValueChange={(v) =>
                      field.onChange(v === "null" ? null : v)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={dict.calendar.form.select_repeat}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="null">
                        {dict.calendar.form.no_repeat}
                      </SelectItem>
                      <SelectItem value="daily">
                        {dict.calendar.form.daily}
                      </SelectItem>
                      <SelectItem value="weekly">
                        {dict.calendar.form.weekly}
                      </SelectItem>
                      <SelectItem value="monthly">
                        {dict.calendar.form.monthly}
                      </SelectItem>
                      <SelectItem value="yearly">
                        {dict.calendar.form.yearly}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional rendering of repeat settings */}
            {renderRepeatSection()}

            {/* Color and Tag */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.calendar.form.color}</FormLabel>
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            aria-label={dict.calendar.form.choose_color}
                            aria-haspopup="dialog"
                          >
                            <div
                              className="w-6 h-6 rounded-full mr-2"
                              style={{ background: field.value }}
                            />
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent>
                        <AccessibleColorPicker
                          color={field.value}
                          colors={currentColors}
                          colorLabel={(color) =>
                            dict.calendar.form.color_option.replace(
                              "{color}",
                              color,
                            )
                          }
                          onChange={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tag"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{dict.calendar.form.label}</FormLabel>
                    <FormControl>
                      <EventLabelPicker
                        value={field.value}
                        setValue={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Details */}
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.calendar.form.details}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={dict.calendar.form.add_details}
                      {...field}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </ScrollArea>

        <Button type="submit" disabled={!form.formState.isValid}>
          {dict.calendar.form.save_event}
        </Button>
      </form>
    </Form>
  );
};
