import { CalendarIcon, ChevronDown, Plus } from "lucide-react";
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
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { UseFormReturn, useForm, useWatch } from "react-hook-form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { v4 as uuidv4 } from "uuid";
import { TimeSelect, getNearestTime } from "@/components/ui/custom_timeselect";
import { PopoverPortal } from "@radix-ui/react-popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "../ui/label";
import { useCalendar } from "./calendar_hook";

const EventForm = ({
  form,
  onSubmit,
  defaultEvent,
}: {
  form: UseFormReturn<z.infer<typeof eventFormSchema>>;
  onSubmit: (data: z.infer<typeof eventFormSchema>) => void;
  defaultEvent?: CalendarEvent;
}) => {
  const { currentColors } = useUserTimetable();
  const { labels } = useCalendar();
  const minuteStep = 15;

  // Watch key form values
  const allDay = useWatch({ control: form.control, name: "allDay" });
  const repeatType = useWatch({ control: form.control, name: "repeat.type" });
  const repeatMode = useWatch({ control: form.control, name: "repeat.mode" });

  // Initialize time settings once when component mounts
  useEffect(() => {
    // Only initialize if no default event was provided and we need to set up a new event
    if (!defaultEvent) {
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
  }, [form, defaultEvent, minuteStep, allDay]);

  // Handle allDay toggle changes
  useEffect(() => {
    if (allDay) {
      // Convert to all day event - set to start of day and end of day
      form.setValue("start", startOfDay(form.getValues("start")));
      form.setValue("end", endOfDay(form.getValues("end")));
    } else {
      // Convert from all day to specific time
      const start = form.getValues("start");
      const currentTime = new Date();

      // Set reasonable default times (e.g., current time for start, +30 min for end)
      const defaultStart = set(start, {
        hours: currentTime.getHours(),
        minutes: Math.floor(currentTime.getMinutes() / minuteStep) * minuteStep,
        seconds: 0,
        milliseconds: 0,
      });

      form.setValue("start", defaultStart);

      // If editing an existing event, maintain day consistency
      if (defaultEvent) {
        form.setValue(
          "end",
          set(form.getValues("end"), {
            year: getYear(start),
            month: getMonth(start),
            date: getDate(start),
            hours: Math.min(23, defaultStart.getHours() + 1),
            minutes: defaultStart.getMinutes(),
            seconds: 0,
            milliseconds: 0,
          }),
        );
      } else {
        form.setValue("end", addMinutes(defaultStart, 30));
      }
    }

    form.trigger(["start", "end"]);
  }, [allDay, form, defaultEvent, minuteStep]);

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
  }, [form, repeatType, defaultEvent]);

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
  }, [form, repeatMode, defaultEvent]);

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
        onSubmit={form.handleSubmit(onSubmit)}
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

export const AddEventButton = ({
  children,
  defaultEvent,
  onEventAdded = () => {},
  openDialog,
  onOpenChange,
}: PropsWithChildren<{
  defaultEvent?: CalendarEvent;
  onEventAdded?: (data: CalendarEvent) => void;
  openDialog?: boolean;
  onOpenChange?: (open: boolean) => void;
}>) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const { currentColors } = useUserTimetable();
  const { labels } = useCalendar();

  // Use either controlled or uncontrolled state
  const open = openDialog !== undefined ? openDialog : internalOpen;
  const setOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  const generateEmptyEvent = useCallback(
    () => ({
      id: uuidv4(),
      title: undefined,
      details: undefined,
      allDay: true,
      start: startOfDay(new Date()),
      end: endOfDay(new Date()),
      repeat: {
        type: null,
      },
      color: currentColors[0],
      tag: labels[0],
    }),
    [currentColors, labels],
  );

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: useMemo(
      () =>
        defaultEvent
          ? {
              ...defaultEvent,
              repeat: defaultEvent.repeat ?? { type: null },
            }
          : generateEmptyEvent(),
      [defaultEvent, generateEmptyEvent],
    ),
    mode: "onChange",
  });

  // Reset form when defaultEvent changes
  useEffect(() => {
    if (defaultEvent) {
      form.reset({
        ...defaultEvent,
        repeat: defaultEvent.repeat ?? { type: null },
      });
    } else if (open) {
      form.reset(generateEmptyEvent());
    }
  }, [defaultEvent, form, generateEmptyEvent, open]);

  useEffect(() => {
    form.trigger();
  }, [form]);

  const onSubmit = (data: z.infer<typeof eventFormSchema>) => {
    const eventDef: CalendarEvent = {
      ...data,
      repeat: data.repeat.type == null ? null : data.repeat,
    };
    console.log(eventDef);
    onEventAdded(eventDef);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={true}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="p-0 flex max-h-[90vh] overflow-hidden">
        <div className="p-4 md:p-6 w-full gap-4 flex flex-col">
          <DialogHeader>
            <DialogTitle>新增行程</DialogTitle>
          </DialogHeader>
          <EventForm
            form={form}
            onSubmit={onSubmit}
            defaultEvent={defaultEvent}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
