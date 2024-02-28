import supabase from '@/config/supabase';
import useDictionary from '@/dictionaries/useDictionary';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FC, useState } from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import TimeslotSelectorControl from '../FormComponents/TimeslotSelectorControl';
import useSWR from 'swr';
import { useMediaQuery } from 'usehooks-ts';
import { GECTypes, GETargetCodes } from '@/const/ge_target';
import { useSettings } from '@/hooks/contexts/settings';
import { RefineControlFormTypes } from '@/app/[lang]/(mods-pages)/courses/page';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import {scheduleTimeSlots} from '@/const/timetable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { departments } from '@/const/departments';
import { Check, ChevronsUpDown, Delete, Trash } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {getFormattedClassCode} from '@/helpers/courses';
import { MultiSelect } from '../ui/custom_multiselect';

const MultiCheckboxControl = ({ control, name, options, label }: { control: any, name: string, options: { value: string | number, label: string }[], label: string }) => {
    return (
        <FormField
            control={control}
            name={name}
            render={() => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    {options.map(option => (
                        <FormField
                            key={option.value}
                            control={control}
                            name={name}
                            render={({ field }) => {
                                return (
                                    <FormItem
                                        key={option.value}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(option.value)}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                        ? field.onChange([...field.value, option.value])
                                                        : field.onChange(
                                                            field.value?.filter(
                                                                (value: string) => value != option.value
                                                            )
                                                        )
                                                }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                            {option.label}
                                        </FormLabel>
                                    </FormItem>
                                )
                            }}
                        />
                    ))}
                </FormItem>
            )}
        />
    )
}

const AutocompleteShadcn = ({ control, name, options, label, placeholder, loading, multiple=false }: { control: any, name: string, options: {value: string, label: string}[], label: string, placeholder: string, loading: boolean, multiple?: boolean }) => {
    const [open, setOpen] = useState(false)
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormItem>
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between"
                                >
                                <span className='gap-1 flex flex-row'>
                                {multiple ? field.value.length > 0
                                    ? field.value.map((val: any) => <Badge onClick={() => field.onChange(field.value.filter((value: string) => value != val))} className="cursor-pointer" color="neutral">{val}</Badge>)
                                    : placeholder: 
                                    field.value
                                    ? field.value
                                    : placeholder
                                }
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" side='bottom'>
                                <Command className="max-h-60">
                                <CommandInput placeholder="Search classes   ..." />
                                <CommandEmpty>No classes found.</CommandEmpty>
                                <CommandGroup>
                                    {options.map((dept) => (
                                    <CommandItem
                                        key={dept.value}
                                        value={dept.value}
                                        onSelect={(currentValue) => {
                                            if(multiple) field.onChange(field.value.includes(currentValue) ? field.value.filter((value: string) => value != currentValue) : [...field.value, currentValue])
                                            else field.onChange(currentValue === field.value ? '' : currentValue)
                                            setOpen(false)
                                        }}
                                    >
                                        <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            multiple ? 
                                                field.value.includes((dept.value).toLowerCase()) ? "opacity-100" : "opacity-0":
                                                field.value == dept.value ? "opacity-100" : "opacity-0"
                                        )}
                                        />
                                        {dept.value}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                                </Command>
                            </PopoverContent>
                            </Popover>
                        </FormItem>
                </FormItem>
            )}
        />
    )
}


const RefineControls: FC<{ control: Control<RefineControlFormTypes>, setValue: UseFormSetValue<RefineControlFormTypes>, onClear: () => void }> = ({ control, setValue, onClear }) => {
    const dict = useDictionary();
    const { language } = useSettings();
    const { data: firstSpecial = [], error: error1, isLoading: load1 } = useSWR('distinct_first_specialization', async () => {
        const { data = [], error } = await supabase.from('distinct_first_specialization').select('unique_first_specialization');
        if (error) throw error;
        return data!.map(({ unique_first_specialization }) => unique_first_specialization!);
    }, {
        keepPreviousData: true,
    });
    const { data: secondSpecial = [], error: error2, isLoading: load2 } = useSWR('distinct_second_specialization', async () => {
        const { data = [], error } = await supabase.from('distinct_second_specialization').select('unique_second_specialization');
        if (error) throw error;
        return data!.map(({ unique_second_specialization }) => unique_second_specialization!);
    }, {
        keepPreviousData: true,
    });
    const { data: classList = [], error: error3, isLoading: load3 } = useSWR('distinct_classes', async () => {
        const { data = [], error } = await supabase.from('distinct_classes').select('class');
        if (error) throw error;
        return data!.map(({ class: className }) => className!);
    }, {
        keepPreviousData: true,
    });
    const { data: venues = [], error: error4, isLoading: load4 } = useSWR('venues', async () => {
        const { data = [], error } = await supabase.from('distinct_venues').select('venue');
        if (error) throw error;
        return data!.map(({ venue }) => venue!);
    }, {
        keepPreviousData: true,
    });
    
    const { data: disciplines = [], error: error5, isLoading: load5 } = useSWR('disciplines', async () => {
        const { data = [], error } = await supabase.from('distinct_cross_discipline').select('discipline');
        if (error) throw error;
        return data!.map(({ discipline }) => discipline!);
    }, {
        keepPreviousData: true,
    });

    const { data: semesters = [], error: error6, isLoading: load6 } = useSWR('semesters', async () => {
        const { data = [], error } = await supabase.from('distinct_semesters').select('semester');
        if (error) throw error;
        return data!.map(({ semester }) => semester!);
    }, {
        keepPreviousData: true,
    });

    const { displayCourseData } = useUserTimetable();
    const handleFillTimes = () => {
        const timeslots = displayCourseData.map(course => course.times.map(time => time.match(/.{1,2}/g) ?? [] as unknown as string[]).flat()).flat();
        const timeslotSet = new Set(timeslots);
        const timeslotList = Array.from(timeslotSet);
        const days = ['M', 'T', 'W', 'R', 'F', 'S'];
        const selectDays: string[] = [];
        scheduleTimeSlots.forEach(timeSlot => {
            days.forEach(day => {
                if(!timeslotList.includes(day+timeSlot.time)) {
                    selectDays.push(day+timeSlot.time);
                }
            })
        })
        setValue('timeslots', selectDays);
    }

    return <div className="p-4 flex flex-col overflow-auto bg-background">
        <span className="text-xs font-bold uppercase">{dict.course.refine.title}</span>
        <div className='flex flex-col gap-4 mt-4'>
            <FormField
                control={control}
                name="semester"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{dict.course.refine.semester}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={dict.course.refine.semester} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {semesters.map(semester => (<SelectItem value={semester}>{semester}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <MultiCheckboxControl control={control} name="level" options={[
                { value: 1, label: '1xxx' },
                { value: 2, label: '2xxx' },
                { value: 3, label: '3xxx' },
                { value: 4, label: '4xxx' },
                { value: 5, label: '5xxx' },
                { value: 6, label: '6xxx' },
                { value: 7, label: '7xxx' },
                { value: 8, label: '8xxx' },
                { value: 9, label: '9xxx' },
            ]} label={dict.course.refine.level} />
            <MultiCheckboxControl control={control} name="language" options={[
                { value: '英', label: 'English' },
                { value: '中', label: '國語' },
            ]} label={dict.course.refine.language} />
            <FormField
                control={control}
                name="department"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{dict.course.refine.department}</FormLabel>
                        <FormItem>
                            <FormControl>
                            <MultiSelect
                                label=""
                                placeholder={dict.course.refine.department}
                                data={departments.map(dept => ({ value: dept.code, label: `${dept.code} - ${dept.name_zh}` }))}
                                {...field}
                            />
                            </FormControl>
                        </FormItem>
                                
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="timeslots"
                render={() => (
                    <FormItem>
                        <FormLabel>{dict.course.refine.time}</FormLabel>
                        <Collapsible>
                            <div className="flex items-center justify-between space-x-4 px-4">
                                <h4 className="text-sm font-semibold">
                                {dict.course.refine.time}
                                </h4>
                                <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-9 p-0">
                                    <ChevronsUpDown className="h-4 w-4" />
                                    <span className="sr-only">Toggle</span>
                                </Button>
                                </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent>
                                <Button variant="outline" color="neutral" size="sm" onClick={handleFillTimes}>
                                    找沒課的時間
                                </Button>
                                <TimeslotSelectorControl control={control} />
                            </CollapsibleContent>
                        </Collapsible>
                    </FormItem>
                )}
            />
            <MultiCheckboxControl control={control} name="geTarget" options={GETargetCodes.map(code => ({ value: code.code, label: `${code.code} ${language == 'zh'? code.short_zh: code.short_en}`  }))} label={dict.course.refine.geTarget} />
            <MultiCheckboxControl control={control} name="gecDimensions" options={GECTypes.map(type => ({ value: type, label: type}))} label={dict.course.refine.gecDimensions} />
            <AutocompleteShadcn control={control} name="className" placeholder={dict.course.refine.class} loading={load3} options={classList.map(classname => ({ value: classname, label: getFormattedClassCode(classname) }))} label={dict.course.refine.compulsory_elective} />
            <MultiCheckboxControl control={control} name="others" options={[
                { value: 'xclass', label: dict.course.refine['x-class'] },
                { value: '16_weeks', label: dict.course.refine['16_weeks']},
                { value: 'extra_selection', label: dict.course.refine['extra_selection']}
            ]} label={dict.course.refine.others} />
            <AutocompleteShadcn control={control} name="venues" multiple placeholder={dict.course.refine.venues} loading={load4} options={venues.map(venue => ({ value: venue, label: venue }))} label={dict.course.refine.venues} />
            <AutocompleteShadcn control={control} name="firstSpecialization" placeholder={dict.course.refine.firstSpecialization} loading={load1} options={firstSpecial.map(special => ({ value: special, label: special }))} label={dict.course.refine.specialization} />
            <AutocompleteShadcn control={control} name="secondSpecialization" placeholder={dict.course.refine.secondSpecialization} loading={load2} options={secondSpecial.map(special => ({ value: special, label: special }))} label={dict.course.refine.specialization} />
            <AutocompleteShadcn control={control} name="disciplines" multiple placeholder={dict.course.refine.cross_discipline} loading={load5} options={disciplines.map(discipline => ({ value: discipline, label: discipline }))} label={dict.course.refine.cross_discipline} />
            <Button
                variant={'destructive'}
                size={'sm'}
                onClick={onClear}
            >
                <Trash className='h-4 w-4 mr-2' />
                {dict.course.refine.clear}
            </Button>
        </div>
    </div>
}

export default RefineControls;