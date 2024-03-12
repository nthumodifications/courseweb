import { CalendarIcon, ChevronDown, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from 'react-hook-form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as ShadcnCalendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CirclePicker } from 'react-color';
import { Textarea } from '@/components/ui/textarea';
import { HourMinuteInput } from '@/components/ui/hour-minute-picker';
import { CalendarEvent } from './calendar.types';
import { eventFormSchema } from './eventFormSchema';
import { EventLabelPicker } from './EventLabelPicker';

export const AddEventButton = ({ defaultEvent, onEventAdded = () => { } }: { defaultEvent?: CalendarEvent; onEventAdded?: (data: CalendarEvent) => void; }) => {
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof eventFormSchema>>({
        resolver: zodResolver(eventFormSchema),
        defaultValues: defaultEvent ? {
            ...defaultEvent,
            repeat: defaultEvent.repeat ?? { type: null },
        } : {
            title: '',
            details: '',
            allDay: false,
            start: new Date(),
            end: new Date(),
            repeat: {
                type: null,
            },
            color: '#f44336',
            tag: 'none'
        },
    });

    const onSubmit = (data: z.infer<typeof eventFormSchema>) => {
        const eventDef: CalendarEvent = {
            ...data,
            repeat: data.repeat.type == null ? null : data.repeat,
        }
        console.log(eventDef);
        onEventAdded(eventDef);
        setOpen(false);
    };

    const repeat = form.watch('repeat.type');
    const allDay = form.watch('allDay');

    const renderNormalDatePicker = () => {
        return <>
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
                                                format(field.value, "yyyy-LL-dd(EE) hh:mm a ")
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
                                        initialFocus />
                                    <div className="p-3 border-t border-border">
                                        <HourMinuteInput setDate={field.onChange} date={field.value} />
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </FormItem>
                    )} />
            </div>
            <div className='flex flex-row gap-4'>
                <FormField
                    control={form.control}
                    name="end"
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
                                                format(field.value, "yyyy-LL-dd(EE) hh:mm a ")
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
                                        initialFocus />
                                    <div className="p-3 border-t border-border">
                                        <HourMinuteInput setDate={field.onChange} date={field.value} />
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </FormItem>
                    )} />
            </div>
        </>;
    };

    const renderAllDayDatePicker = () => {
        return <>
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
                                                format(field.value, "yyyy-LL-dd(EE)")
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
                                        initialFocus />
                                </PopoverContent>
                            </Popover>
                        </FormItem>
                    )} />
            </div>
            <div className='flex flex-row gap-4'>
                <FormField
                    control={form.control}
                    name="end"
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
                                                format(field.value, "yyyy-LL-dd(EE)")
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
                                        initialFocus />
                                </PopoverContent>
                            </Popover>
                        </FormItem>
                    )} />
            </div>
        </>;
    };

    return <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger>
            <>
                <Button className="hidden md:inline-flex"><Plus className="mr-2" /> 新增行程</Button>
                <Button className="md:hidden fixed bottom-8 right-8 z-50 rounded-lg shadow-lg" size='icon'><Plus /></Button>
            </>
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
                            )} />
                        <FormField
                            control={form.control}
                            name="allDay"
                            render={({ field }) => (
                                <FormItem className='flex flex-row items-center space-y-0 gap-2'>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <FormLabel>全天</FormLabel>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        {allDay ? renderAllDayDatePicker() : renderNormalDatePicker()}
                        <FormField
                            control={form.control}
                            name="repeat.type"
                            render={({ field }) => (
                                <FormItem>
                                    <Select defaultValue='null' value={String(field.value)} onValueChange={v => field.onChange(v == 'null' ? null : v)}>
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
                            )} />
                        {repeat && (<>
                            <FormField
                                control={form.control}
                                name="repeat.interval"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Interval</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="Interval" defaultValue={1} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            <div className='flex flex-col gap-4'>
                                {/* TODO: Repeat is still not working */}
                                <FormField
                                    control={form.control}
                                    name='repeat.count'
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input type="number" placeholder="Count" defaultValue="" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
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
                                                        onSelect={field.onChange}
                                                        initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                            </div>
                        </>)}

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
                                )} />
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
                                )} />
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
                            )} />
                    </div>
                    <Button type="submit">Submit</Button>
                </form>
            </Form>
        </DialogContent>
    </Dialog>;
};
