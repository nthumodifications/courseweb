import { CalendarIcon, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Plus } from 'lucide-react';
import { addDays, addWeeks, differenceInDays, differenceInWeeks, eachDayOfInterval, eachHourOfInterval, endOfWeek, format, isSameDay, isSameMonth, isToday, set, startOfWeek, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import useTime from '@/hooks/useTime';
import { CourseTimeslotData } from '@/types/timetable';
import { semesterInfo } from '@/const/semester';
import { parseSlotTime, scheduleTimeSlots } from '@/const/timetable';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { useState } from 'react';
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from 'react-hook-form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

import { Separator } from '@/components/ui/separator';
import { CirclePicker } from 'react-color';
import { Textarea } from '@/components/ui/textarea';
interface RepeatDefinition {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
}

interface RepeatByCount extends RepeatDefinition {
    count: number;
}

interface RepeatByDate extends RepeatDefinition {
    date: Date;
}

type Repeat = RepeatByCount | RepeatByDate | RepeatDefinition;

interface CalendarEvent {
    title: string;
    details?: string;
    allDay: boolean;
    start: Date;
    end: Date;
    repeat: null | Repeat;
    color: string;
    tag: string | 'none';
}
const HOUR_HEIGHT = 48;

const CurrentTimePointer = () => {
    const date = useTime();

    return <div className="absolute -left-2 flex flex-row z-50 w-full items-center" style={{
        top: -8 + (date.getHours() * HOUR_HEIGHT) + (date.getMinutes() * HOUR_HEIGHT / 60),
    }}>
        <span className="-left-10 absolute text-nthu-600 font-semibold shadow-sm">{format(date, 'HH:mm')}</span>
        <div className="w-4 h-4 bg-nthu-600 rounded-full shadow-md"></div>
        <div className="flex-1 h-0 outline outline-1 outline-nthu-600 shadow-md"></div>
    </div>
}

const getWeek = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const end = endOfWeek(date, { weekStartsOn: 0 });
    return eachDayOfInterval({
        start: start,
        end: end
    });
}

const WeekSelector = ({ date, setDate }: { date: Date, setDate: (d: Date) => void }) => {
    const [open, setOpen] = useState(false);

    const handleDateSelect = (d: Date | undefined) => {
        setDate(d!);
        setOpen(false);
    }

    return <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
            <h2 className="text-slate-900 text-2xl font-semibold w-max">March 2024</h2>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
            <ShadcnCalendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
            />
        </PopoverContent>
    </Popover>

}

const eventFormSchema = z.object({
    title: z.string(),
    details: z.string().optional(),
    allDay: z.boolean(),
    start: z.date(),
    end: z.date(),
    repeat: z.union([
        z.object({
            type: z.literal('daily'),
            interval: z.number().optional(),
            count: z.number().optional(),
        }),
        z.object({
            type: z.literal('weekly'),
            interval: z.number().optional(),
            count: z.number().optional(),
        }),
        z.object({
            type: z.literal('monthly'),
            interval: z.number().optional(),
            count: z.number().optional(),
        }),
        z.object({
            type: z.literal('yearly'),
            interval: z.number().optional(),
            count: z.number().optional(),
        }),
        z.object({
            type: z.literal('daily'),
            interval: z.number().optional(),
            date: z.date().optional(),
        }),
        z.object({
            type: z.literal('weekly'),
            interval: z.number().optional(),
            date: z.date().optional(),
        }),
        z.object({
            type: z.literal('monthly'),
            interval: z.number().optional(),
            date: z.date(),
        }),
        z.object({
            type: z.literal('yearly'),
            interval: z.number().optional(),
            date: z.date(),
        }),
    ]).nullable(),
    color: z.string(),
    tag: z.string(),
})

const EventLabelPicker = ({ value, setValue }: { value: string | 'none', setValue: (str: string) => void }) => {
    const [open, setOpen] = useState(false)

    //TODO: user defined labels, should have ability to add new labels
    const options = ['none', 'Event', 'Meeting', 'Assignment', 'Exam', 'Holiday', 'Birthday', 'Anniversary'];
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value !== "none"
                        ? options.find((framework) => framework === value)
                        : "標籤"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
                <Command>
                    <CommandInput placeholder="標籤" />
                    <CommandList>
                        <CommandEmpty>No label found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((op) => (
                                <CommandItem
                                    key={op}
                                    value={op}
                                    onSelect={(currentValue) => {
                                        setValue(currentValue === value ? "" : currentValue)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === op ? "opacity-100" : "opacity-0"
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
    )

}
const AddEventButton = ({ defaultEvent, onEventAdded=() => {} }: { defaultEvent?: CalendarEvent, onEventAdded? : (data: CalendarEvent) => void}) => {
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof eventFormSchema>>({
        resolver: zodResolver(eventFormSchema),
        defaultValues: defaultEvent ?? {
            title: '',
            details: '',
            allDay: false,
            start: new Date(),
            end: new Date(),
            repeat: null,
            color: '#555555',
            tag: 'none'
        },
    })

    const onSubmit = (data: z.infer<typeof eventFormSchema>) => {
        console.log(data);
        onEventAdded(data);
        setOpen(false);
    }

    const repeat = form.watch('repeat');
    const allDay = form.watch('allDay');
    return <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger>
            <Button className="hidden md:inline-flex"><Plus className="mr-2" /> 新增行程</Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>新增行程</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col space-y-6'>
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
                            name="allDay"
                            render={({ field }) => (
                                <FormItem className='flex flex-row items-center space-y-0 gap-2'>
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
                        <div className='flex flex-row gap-4'>
                            <FormField
                                control={form.control}
                                name="start"
                                render={({ field }) => (
                                    <FormItem>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-[280px] justify-start text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value ? (
                                                            format(field.value, "PPP")
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
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                        date > new Date() || date < new Date("1900-01-01")
                                                    }
                                                    initialFocus

                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="repeat"
                            render={({ field }) => (
                                <FormItem>
                                    <Select defaultValue='null' value={String(field.value)} onValueChange={v => field.onChange(v == 'null'? null: v)}>
                                        <SelectTrigger>
                                            <FormControl>
                                                <SelectValue placeholder="Repeat" />
                                            </FormControl>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value='null'>不重複</SelectItem>
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
                            <div className='flex flex-row gap-4'>
                                <FormField
                                    control={form.control}
                                    name="repeat.interval"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input type="number" placeholder="Interval" defaultValue={1} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='repeat.count'
                                    render={({ field, formState }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input type="number" placeholder="Count" {...field} onClick={v => form.setValue('repeat.date', undefined)} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name='repeat.date'
                                    render={({ field }) => (
                                        <FormItem>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "justify-start text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <ShadcnCalendar
                                                         mode="single"
                                                         selected={field.value}
                                                         onSelect={v => {
                                                            form.setValue('repeat.count', undefined)
                                                            field.onChange(v)
                                                         }}
                                                         disabled={(date) =>
                                                             date > new Date() || date < new Date("1900-01-01")
                                                         }
                                                         initialFocus
                                                    />
                                                </PopoverContent>
                                                </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <div className='flex flex-row gap-4'>
                            <FormField
                                control={form.control}
                                name="color"
                                render={({ field }) => (
                                    <FormItem>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant='outline'>
                                                        <div className="w-6 h-6 rounded-full" style={{ background: field.value }}></div>
                                                        <ChevronDown className='ml-2 w-4 h-4' />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent>
                                                <CirclePicker color={field.value} onChangeComplete={(color) => field.onChange(color.hex)} />
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
                                    <FormItem className='flex-1 w-full'>
                                        <FormControl>
                                            <EventLabelPicker value={field.value} setValue={field.onChange} />
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
                    <Button type="submit">Submit</Button>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
}

const Calendar = () => {
    const { timetableData } = useUserTimetable();
    const [displayWeek, setDisplayWeek] = useState<Date[]>(getWeek(new Date()));

    const hours = eachHourOfInterval({
        start: new Date(2024, 2, 3, 0),
        end: new Date(2024, 2, 3, 23)
    });

    //week movers
    const moveBackward = () => {
        setDisplayWeek(displayWeek.map(d => subWeeks(d, 1)))
    }

    const moveForward = () => {
        setDisplayWeek(displayWeek.map(d => addWeeks(d, 1)))
    }

    const backToToday = () => {
        setDisplayWeek(getWeek(new Date()));
    }

    const timetableToCalendarEvent = (timetable: CourseTimeslotData[]): CalendarEvent[] => {
        return timetable.map(t => {
            const semester = semesterInfo.find(s => s.id == t.course.semester)!;
            const startTime = parseSlotTime(scheduleTimeSlots[t.startTime].start);
            const endTime = parseSlotTime(scheduleTimeSlots[t.endTime].end);
            const startDate = set(addDays(semester.begins, t.dayOfWeek), { hours: startTime[0], minutes: startTime[1] });
            const endDate = set(addDays(semester.begins, t.dayOfWeek), { hours: endTime[0], minutes: endTime[1] });

            return {
                title: t.course.name_zh,
                allDay: false,
                start: startDate,
                end: endDate,
                repeat: {
                    type: 'weekly',
                    interval: 1,
                    date: semester.ends
                },
                color: t.color,
                tag: 'course'
            }
        })
    }

    const events: CalendarEvent[] = [
        {
            title: 'NTHUMods Meeting',
            allDay: false,
            start: new Date(2024, 2, 13, 9, 0),
            end: new Date(2024, 2, 13, 10, 30),
            repeat: null,
            color: '#F3ECFB',
            tag: 'meeting'
        },
        ...timetableToCalendarEvent(timetableData)
    ]


    const renderEventsInDay = (day: Date) => {
        const dayEvents = events.filter(e => {
            //check if event is in the day
            if (isSameDay(e.start, day)) return true;
            //check if event is a repeating event
            if (e.repeat) {
                //check if day is past the start date
                if (day < e.start) return false;
                if (e.repeat.type == 'weekly') {
                    //check if is the same day of the week
                    if (e.start.getDay() != day.getDay()) return false;

                    //get difference in weeks between the start of the event and the day
                    const weeks = differenceInWeeks(day, e.start);
                    //check if the difference is a multiple of the interval
                    if (weeks % (e.repeat.interval ?? 1) == 0) {
                        //check if the day is before the end date
                        if ('date' in e.repeat && e.repeat.date >= day) return true;
                        if ('count' in e.repeat && weeks / (e.repeat.interval ?? 1) <= e.repeat.count) return true;
                    }
                }
                if (e.repeat.type == 'daily') {
                    //check if is multiple of interval
                    const days = differenceInDays(day, e.start);
                    if (days % (e.repeat.interval ?? 1) == 0) {
                        if ('date' in e.repeat && e.repeat.date >= day) return true;
                        if ('count' in e.repeat && days / (e.repeat.interval ?? 1) <= e.repeat.count) return true;
                    }
                }
            }
            return false;
        });
        return dayEvents.map((event, index) => (
            <div
                key={index}
                className="absolute left-0 w-full pr-1 "
                style={{
                    top: (event.start.getHours() * HOUR_HEIGHT) + (event.start.getMinutes() * HOUR_HEIGHT / 60),
                    height: (event.end.getHours() - event.start.getHours()) * HOUR_HEIGHT + (event.end.getMinutes() - event.start.getMinutes()) * HOUR_HEIGHT / 60,
                }}>
                <div className="bg-nthu-500 text-black rounded-md h-full p-2 flex flex-col gap-1 hover:shadow-md cursor-pointer transition-shadow" style={{ background: event.color }}>
                    <div className="text-sm leading-none">{event.title}</div>
                    <div className="text-xs font-normal leading-none">{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</div>
                </div>
            </div>
        ))
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-2 justify-evenly">
                <div className="flex-1 w-full">
                    <WeekSelector date={displayWeek[0]} setDate={d => setDisplayWeek(getWeek(d))} />
                </div>
                <div className="flex flex-row items-center gap-2">
                    <Select>
                        <SelectTrigger>
                            <SelectValue placeholder="Display" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="week">Week</SelectItem>
                            <SelectItem value="month">Month</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={backToToday}>Today</Button>
                    <Button variant="outline" onClick={moveBackward}><ChevronLeft /></Button>
                    <Button variant="outline" onClick={moveForward}><ChevronRight /></Button>
                    <AddEventButton />
                </div>
            </div>
            <div className="overflow-x-auto">
                <div className="flex flex-col min-w-[580px] md:min-w-0">
                    <div className="flex flex-row justify-evenly h-16">
                        <div className="w-12"></div>
                        {displayWeek.map((day, index) => (
                            <div key={day.getTime()} className="flex flex-col flex-1 items-center justify-center h-full">
                                <div className="text-slate-900 text-lg font-semibold">{format(day, 'E')}</div>
                                <div className={cn("text-slate-500 text-sm text-center align-baseline", isToday(day) ? "w-6 h-6 rounded-full bg-nthu-500 text-white" : "")}>{format(day, isSameMonth(day, new Date()) ? 'd' : 'MMM d')}</div>
                            </div>)
                        )}
                    </div>
                    <Separator orientation="horizontal" />
                    <div className="h-[70vh] w-full flex flex-row overflow-y-auto scrollbar-none">
                        <div className="flex flex-row w-full h-max">
                            <div className="flex flex-col w-12" style={{ paddingTop: 20 / 2 }}>
                                {[...hours].splice(1).map((hour, index) => (
                                    <div key={hour.getTime()} style={{ paddingTop: HOUR_HEIGHT - 20 }}>
                                        <div className="text-slate-500 text-sm">{format(hour, 'HH:mm')}</div>
                                    </div>
                                ))}
                            </div>
                            <Separator orientation="vertical" />
                            <div className="flex-1 relative h-full">
                                <div className="flex flex-row">
                                    {displayWeek.map((day, index) => (
                                        <div key={day.getTime()} className="relative flex-1">
                                            <div className="flex flex-col border-r border-slate-200 flex-1">
                                                {hours.map((hour, index) => (
                                                    <div key={hour.getTime()} className="border-b border-slate-200" style={{ height: HOUR_HEIGHT }}></div>
                                                ))}
                                            </div>
                                            {renderEventsInDay(day)}
                                        </div>
                                    ))}
                                </div>
                                <CurrentTimePointer />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Calendar;