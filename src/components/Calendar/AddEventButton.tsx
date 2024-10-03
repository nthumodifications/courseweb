import { CalendarIcon, ChevronDown, Plus } from "lucide-react";
import {
  addDays,
  addMinutes,
  differenceInDays,
  endOfDay,
  format,
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

export const AddEventButton = ({
  children,
  defaultEvent,
  onEventAdded = () => {},
}: PropsWithChildren<{
  defaultEvent?: CalendarEvent;
  onEventAdded?: (data: CalendarEvent) => void;
}>) => {
  const [open, setOpen] = useState(false);
  const { currentColors } = useUserTimetable();
  const { labels } = useCalendar();

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

  const minuteStep = 15;
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

  useEffect(() => {
    form.trigger();
  }, [defaultEvent, form, open]);

  // if form is opened, and defaultEvent is not provided, reset form to default values
  useEffect(() => {
    if (open && !defaultEvent) {
      form.reset(generateEmptyEvent());
    }
  }, [defaultEvent, form, open, generateEmptyEvent]);

  const onSubmit = (data: z.infer<typeof eventFormSchema>) => {
    const eventDef: CalendarEvent = {
      ...data,
      repeat: data.repeat.type == null ? null : data.repeat,
    };
    console.log(eventDef);
    onEventAdded(eventDef);
    setOpen(false);
  };

  const repeat = form.watch("repeat.type");
  const repeatMode = form.watch("repeat.mode");

  // If repeat updates, set interval = 1 and default to count = 1, else set to undefined
  useEffect(() => {
    if (repeat) {
      form.setValue("repeat.interval", 1);
      form.setValue("repeat.value", 1);
      form.setValue("repeat.mode", "count");
    } else {
      form.setValue("repeat.interval", undefined!);
      form.setValue("repeat.value", undefined!);
      form.setValue("repeat.mode", undefined!);
    }
  }, [form, repeat]);

  // If repeatMode updates, clear the value
  useEffect(() => {
    if (repeatMode === "count") {
      form.setValue("repeat.value", 1);
    } else if (repeatMode === "date") {
      form.setValue("repeat.value", Date.now());
    }
  }, [form, repeatMode]);

  const allDay = useWatch({ control: form.control, name: "allDay" });

  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    if (delayed && !defaultEvent) {
      const nearestTime = getNearestTime(new Date(), minuteStep);
      const defaultDiff = 30;
      const defaultStart = set(new Date(), {
        ...nearestTime,
        seconds: 0,
        milliseconds: 0,
      });
      const defaultEnd = addMinutes(defaultStart, defaultDiff);
      form.setValue("start", defaultStart);
      form.setValue("end", defaultEnd);
      form.trigger(["start", "end"]);
      setDelayed(false);
    }
  }, [delayed, defaultEvent, form]);

  //if from normal to all day, set start and end to 00:00 and 23:59
  useEffect(() => {
    if (allDay) {
      form.setValue("start", startOfDay(form.getValues("start")));
      form.setValue("end", endOfDay(form.getValues("end")));
      form.trigger(["start", "end"]);
    } else {
      setDelayed(true);
    }
  }, [allDay, form]);

  const renderNormalDatePicker = () => {
    return (
      <>
        <div className="flex flex-col items-end sm:flex-row gap-4 overflow-x-auto">
          <FormField
            control={form.control}
            name="start"
            render={({ field }) => (
              <FormItem className="flex flex-row space-x-2 space-y-0">
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "justify-start text-left font-normal",
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
                          //dont modify hour and minute
                          const originalDate = field.value;
                          const newDate = set(d, {
                            hours: originalDate.getHours(),
                            minutes: originalDate.getMinutes(),
                          });
                          field.onChange(newDate);
                          // update end date as well
                          const diff =
                            form.getValues("end").getTime() -
                            originalDate.getTime();
                          form.setValue(
                            "end",
                            new Date(newDate.getTime() + diff),
                          );
                          form.trigger(["end"]);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </PopoverPortal>
                </Popover>
                <Input
                  type="time"
                  onChange={(e) => {
                    const timesplits = e.target.value.split(":");
                    // ensure completed input before setting
                    if (timesplits[0].length < 2 || timesplits[1].length < 2)
                      return;
                    const d = set(field.value, {
                      hours: parseInt(timesplits[0]),
                      minutes: parseInt(timesplits[1]),
                    });
                    const diff =
                      form.getValues("end").getTime() -
                      form.getValues("start").getTime();
                    field.onChange(d);
                    if (d.getTime() + diff > endOfDay(d).getTime()) {
                      form.setValue("end", endOfDay(d));
                      form.trigger(["end"]);
                    } else {
                      form.setValue("end", new Date(d.getTime() + diff));
                      form.trigger(["end"]);
                    }
                  }}
                  value={format(field.value, "HH:mm")}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end"
            render={({ field }) => (
              <FormItem>
                <Input
                  type="time"
                  onChange={(v) => {
                    const timesplits = v.target.value.split(":");
                    // ensure completed input before setting
                    if (timesplits[0].length < 2 || timesplits[1].length < 2)
                      return;
                    const d = set(field.value, {
                      hours: parseInt(timesplits[0]),
                      minutes: parseInt(timesplits[1]),
                    });
                    field.onChange(d);
                  }}
                  value={format(field.value, "HH:mm")}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </>
    );
  };

  const renderAllDayDatePicker = () => {
    return (
      <div className="flex flex-col sm:flex-row gap-4">
        <FormField
          control={form.control}
          name="start"
          render={({ field }) => (
            <FormItem className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "justify-start text-left font-normal w-full",
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
                      const diffInDays = differenceInDays(
                        form.getValues("end"),
                        form.getValues("start"),
                      );
                      const endDate = endOfDay(addDays(d, diffInDays));
                      field.onChange(startOfDay(d));
                      form.setValue("end", endDate);
                      form.trigger("end");
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="end"
          render={({ field }) => (
            <FormItem className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "justify-start text-left font-normal w-full",
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
                      if (d) field.onChange(endOfDay(d));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  };

  const renderRepeatEnd = () => {
    return (
      <div className="flex flex-col gap-2">
        <FormField
          control={form.control}
          name="repeat.mode"
          render={({ field: fieldMode }) => (
            <FormItem className="flex flex-row items-center space-y-0 gap-2">
              <FormControl>
                <RadioGroup
                  defaultValue="date"
                  value={fieldMode.value}
                  onValueChange={fieldMode.onChange}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="count" id="count" />
                    <Label htmlFor="count">
                      {fieldMode.value === "count" ? (
                        <FormField
                          control={form.control}
                          name="repeat.value"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Count"
                                  defaultValue=""
                                  {...field}
                                  // Convert string to number
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    field.onChange(isNaN(value) ? "" : value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <Input
                          placeholder="Count"
                          defaultValue=""
                          disabled={true}
                        />
                      )}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="date" id="date" />
                    <Label htmlFor="date">
                      {fieldMode.value === "date" ? (
                        <FormField
                          control={form.control}
                          name="repeat.value"
                          disabled={fieldMode.value !== "date"}
                          render={({ field }) => (
                            <FormItem>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "justify-start text-left font-normal",
                                        !field.value && "text-muted-foreground",
                                      )}
                                      disabled={fieldMode.value !== "date"}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {!field.value ? (
                                        <span>Pick a date</span>
                                      ) : (
                                        format(field.value, "PPP")
                                      )}
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  {fieldMode.value === "date" && (
                                    <ShadcnCalendar
                                      mode="single"
                                      selected={new Date(field.value)}
                                      onSelect={(v) =>
                                        field.onChange(
                                          v?.getTime() ?? Date.now(),
                                        )
                                      }
                                      initialFocus
                                    />
                                  )}
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <Button
                          variant={"outline"}
                          className={cn(
                            "justify-start text-left font-normal text-muted-foreground",
                          )}
                          disabled={true}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          <span>Pick a date</span>
                        </Button>
                      )}
                    </Label>
                  </div>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent className="p-0 flex">
        <div className="p-4 md:p-6 w-full gap-4 flex flex-col">
          <DialogHeader>
            <DialogTitle>新增行程</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col space-y-6"
            >
              <ScrollArea className="max-h-[80dvh]">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="新增標題" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="地點" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                        <FormLabel>全天</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {allDay ? renderAllDayDatePicker() : renderNormalDatePicker()}
                  <FormField
                    control={form.control}
                    name="repeat.type"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          defaultValue="null"
                          value={String(field.value)}
                          onValueChange={(v) =>
                            field.onChange(v == "null" ? null : v)
                          }
                        >
                          <SelectTrigger>
                            <FormControl>
                              <SelectValue placeholder="Repeat" />
                            </FormControl>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="null">不重複</SelectItem>
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
                  {repeat && (
                    <>
                      <FormField
                        control={form.control}
                        name="repeat.interval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Interval</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Interval"
                                defaultValue={1}
                                {...field}
                                // Convert string to number
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  field.onChange(isNaN(value) ? "" : value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex flex-row gap-4">
                        {renderRepeatEnd()}
                      </div>
                    </>
                  )}

                  <div className="flex flex-row gap-4">
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline">
                                  <div
                                    className="w-6 h-6 rounded-full"
                                    style={{ background: field.value }}
                                  ></div>
                                  <ChevronDown className="ml-2 w-4 h-4" />
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
                        <FormItem className="flex-1 w-full">
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
                  <FormField
                    control={form.control}
                    name="details"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>說明</FormLabel>
                        <FormControl>
                          <Textarea placeholder="新增說明" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ScrollArea>
              <Button type="submit" disabled={!form.formState.isValid}>
                Submit
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
