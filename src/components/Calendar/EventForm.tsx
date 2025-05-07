import {
  addDays,
  addMinutes,
  differenceInDays,
  endOfDay,
  format,
  getDate,
  getMonth,
  getYear,
  set,
  startOfDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { UseFormReturn, useForm, useWatch } from "react-hook-form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CirclePicker } from "react-color";
import { Textarea } from "@/components/ui/textarea";
import { CalendarEvent } from "./calendar.types";
import { eventFormSchema } from "./eventFormSchema";
import { EventLabelPicker } from "./EventLabelPicker";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { getNearestTime } from "@/components/ui/custom_timeselect";
import { PopoverPortal } from "@radix-ui/react-popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "../ui/label";
import { useCalendar } from "./calendar_hook";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { zodResolver } from "@hookform/resolvers/zod";

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
      start: startOfDay(new Date()),
      end: endOfDay(new Date()),
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
        (currentStart.getHours() === 0 &&
          currentStart.getMinutes() === 0 &&
          currentEnd.getHours() === 23 &&
          currentEnd.getMinutes() === 59)
      ) {
        const nearestTime = getNearestTime(new Date(), minuteStep);
        const defaultStart = set(new Date(), {
          ...nearestTime,
          seconds: 0,
          milliseconds: 0,
        });
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
        form.setValue("start", startOfDay(currentStart));
        form.setValue("end", endOfDay(currentEnd));
      } else {
        // Convert from all day to specific time
        const currentTime = new Date();

        // If we have defaultEvent with specific times, prioritize those times
        if (defaultEvent?.start && defaultEvent?.end && !defaultEvent.allDay) {
          // Use the time portion from defaultEvent but keep current date
          form.setValue(
            "start",
            set(currentStart, {
              hours: defaultEvent.start.getHours(),
              minutes: defaultEvent.start.getMinutes(),
              seconds: 0,
              milliseconds: 0,
            }),
          );

          form.setValue(
            "end",
            set(currentEnd, {
              hours: defaultEvent.end.getHours(),
              minutes: defaultEvent.end.getMinutes(),
              seconds: 0,
              milliseconds: 0,
            }),
          );
        } else {
          // Otherwise, use current time
          const defaultStart = set(currentStart, {
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
      // If we're setting up a repeat for a new event
      if (!defaultEvent || !defaultEvent.repeat) {
        form.setValue("repeat.interval", 1);
        form.setValue("repeat.mode", "count");
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
          : Date.now() + 7 * 24 * 60 * 60 * 1000; // Default to one week in the future
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
            <FormLabel>Start</FormLabel>
            <div className="flex flex-row space-x-2">
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "yyyy-LL-dd (EE)")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverPortal>
                  <PopoverContent className="w-auto p-0">
                    <ShadcnCalendar
                      mode="single"
                      selected={field.value}
                      onSelect={(d) => {
                        if (!d) return;
                        // Preserve time when changing date
                        const newDate = set(d, {
                          hours: field.value.getHours(),
                          minutes: field.value.getMinutes(),
                        });

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
                      defaultMonth={field.value}
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
                    const newTime = set(field.value, { hours, minutes });

                    // Maintain event duration
                    const duration =
                      form.getValues("end").getTime() - field.value.getTime();
                    const newEndTime = new Date(newTime.getTime() + duration);

                    // Update form values
                    field.onChange(newTime);

                    // Make sure end time doesn't exceed day boundary
                    if (newEndTime.getTime() > endOfDay(newTime).getTime()) {
                      form.setValue("end", endOfDay(newTime));
                    } else {
                      form.setValue("end", newEndTime);
                    }

                    form.trigger("end");
                  }}
                  value={format(field.value, "HH:mm")}
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
            <FormLabel>End</FormLabel>
            <div className="flex flex-row space-x-2">
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "yyyy-LL-dd (EE)")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverPortal>
                  <PopoverContent className="w-auto p-0">
                    <ShadcnCalendar
                      mode="single"
                      selected={field.value}
                      onSelect={(d) => {
                        if (!d) return;
                        // Preserve time when changing date
                        const newDate = set(d, {
                          hours: field.value.getHours(),
                          minutes: field.value.getMinutes(),
                        });
                        field.onChange(newDate);
                      }}
                      initialFocus
                      defaultMonth={field.value}
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
                    const newTime = set(field.value, { hours, minutes });
                    field.onChange(newTime);
                  }}
                  value={format(field.value, "HH:mm")}
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
            <FormLabel>Start Date</FormLabel>
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? (
                      format(field.value, "yyyy-LL-dd (EE)")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <ShadcnCalendar
                  mode="single"
                  selected={field.value}
                  onSelect={(d) => {
                    if (!d) return;

                    // Calculate current event duration in days
                    const diffInDays = differenceInDays(
                      form.getValues("end"),
                      form.getValues("start"),
                    );

                    // Update start and end dates while maintaining duration
                    const startDate = startOfDay(d);
                    const endDate = endOfDay(addDays(d, diffInDays));

                    field.onChange(startDate);
                    form.setValue("end", endDate);
                    form.trigger("end");
                  }}
                  defaultMonth={field.value}
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
            <FormLabel>End Date</FormLabel>
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? (
                      format(field.value, "yyyy-LL-dd (EE)")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <ShadcnCalendar
                  mode="single"
                  selected={field.value}
                  onSelect={(d) => {
                    if (!d) return;

                    // Ensure end date is not before start date
                    const startDate = form.getValues("start");
                    if (d < startDate) {
                      form.setError("end", {
                        message: "End date cannot be before start date",
                      });
                      return;
                    }

                    field.onChange(endOfDay(d));
                  }}
                  initialFocus
                  defaultMonth={field.value}
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
              <FormLabel>Interval</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="Interval"
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
              <FormLabel>End Repeat</FormLabel>
              <div className="space-y-2">
                <RadioGroup
                  value={field.value || "count"}
                  onValueChange={field.onChange}
                  className="flex flex-col space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="count" id="repeat-count" />
                    <div className="flex-1">
                      <Label htmlFor="repeat-count" className="block mb-1">
                        After
                      </Label>
                      <FormField
                        control={form.control}
                        name="repeat.value"
                        render={({ field: valueField }) => (
                          <Input
                            type="number"
                            min="1"
                            placeholder="Number of occurrences"
                            disabled={repeatMode !== "count"}
                            {...valueField}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              valueField.onChange(
                                isNaN(value) || value < 1 ? 1 : value,
                              );
                            }}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="date" id="repeat-date" />
                    <div className="flex-1">
                      <Label htmlFor="repeat-date" className="block mb-1">
                        On date
                      </Label>
                      <FormField
                        control={form.control}
                        name="repeat.value"
                        render={({ field: valueField }) => (
                          <Popover modal={true}>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className="w-full justify-start text-left"
                                disabled={repeatMode !== "date"}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {repeatMode === "date" &&
                                typeof valueField.value === "number" ? (
                                  format(new Date(valueField.value), "PPP")
                                ) : (
                                  <span>Pick end date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              {repeatMode === "date" && (
                                <ShadcnCalendar
                                  mode="single"
                                  selected={new Date(valueField.value)}
                                  onSelect={(v) =>
                                    valueField.onChange(
                                      v?.getTime() ?? Date.now(),
                                    )
                                  }
                                  initialFocus
                                  defaultMonth={new Date(valueField.value)}
                                />
                              )}
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                    </div>
                  </div>
                </RadioGroup>
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
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Event title" {...field} />
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
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Location" {...field} />
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
                  <FormLabel className="cursor-pointer">All Day</FormLabel>
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
                  <FormLabel>Repeat</FormLabel>
                  <Select
                    value={String(field.value || "null")}
                    onValueChange={(v) =>
                      field.onChange(v === "null" ? null : v)
                    }
                  >
                    <SelectTrigger>
                      <FormControl>
                        <SelectValue placeholder="Select repeat frequency" />
                      </FormControl>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">No Repeat</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
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
                    <FormLabel>Color</FormLabel>
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full">
                            <div
                              className="w-6 h-6 rounded-full mr-2"
                              style={{ background: field.value }}
                            />
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent>
                        <CirclePicker
                          color={field.value}
                          onChangeComplete={(color) =>
                            field.onChange(color.hex)
                          }
                          colors={currentColors}
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
                    <FormLabel>Label</FormLabel>
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
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add details"
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
          Save Event
        </Button>
      </form>
    </Form>
  );
};
