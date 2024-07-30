import supabase from '@/config/supabase';
import useDictionary from '@/dictionaries/useDictionary';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FC, useCallback } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import TimeslotSelectorControl from '../FormComponents/TimeslotSelectorControl';
import { GECTypes, GETargetCodes } from '@/const/ge_target';
import { useSettings } from '@/hooks/contexts/settings';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { scheduleTimeSlots } from '@/const/timetable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { departments } from '@/const/departments';
import { ChevronsUpDown, Trash } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getFormattedClassCode } from '@/helpers/courses';
import { useQuery } from '@tanstack/react-query';
import { AutocompleteShadcn } from './AutocompleteShadcn';
import { MultiCheckboxControl } from './MultiCheckboxControl';
import MultiSelectFormField from '../ui/custom_multiselect';
import { TimeFilterType } from '@/components/FormComponents/TimeslotSelectorControl';
import { toPrettySemester } from '@/helpers/semester';

export type RefineControlFormTypes = {
    textSearch: string,
    level: string[],
    language: string[],
    others: string[],
    className: string | null,
    department: string[],
    firstSpecialization: string | null,
    secondSpecialization: string | null,
    timeslots: string[],
    timeFilter: TimeFilterType,
    semester: string,
    venues: string[],
    disciplines: string[],
    geTarget: string[],
    gecDimensions: string[],
}


export const emptyFilters: RefineControlFormTypes = {
    textSearch: '',
    level: [],
    others: [],
    language: [],
    department: [],
    venues: [],
    timeslots: [],
    timeFilter: TimeFilterType.Within,
    semester: '11310',
    disciplines: [],
    gecDimensions: [],
    geTarget: [],
    className: null,
    firstSpecialization: null,
    secondSpecialization: null,
}

const RefineControls: FC<{ form: UseFormReturn<RefineControlFormTypes> }> = ({ form }) => {
    const dict = useDictionary();
    const { language } = useSettings();
    const { data: firstSpecial = [], error: error1, isLoading: load1 } = useQuery({
        queryKey: ['distinct_first_specialization'],
        queryFn: async () => {
            const { data = [], error } = await supabase.from('distinct_first_specialization').select('unique_first_specialization');
            if (error) throw error;
            return data!.map(({ unique_first_specialization }) => unique_first_specialization!);
        }
    });
    const { data: secondSpecial = [], error: error2, isLoading: load2 } = useQuery({
        queryKey: ['distinct_second_specialization'],
        queryFn: async () => {
            const { data = [], error } = await supabase.from('distinct_second_specialization').select('unique_second_specialization');
            if (error) throw error;
            return data!.map(({ unique_second_specialization }) => unique_second_specialization!);
        }
    });
    const { data: classList = [], error: error3, isLoading: load3 } = useQuery({
        queryKey: ['distinct_classes'],
        queryFn: async () => {
            const { data = [], error } = await supabase.from('distinct_classes').select('class');
            if (error) throw error;
            return data!.map(({ class: className }) => className!);
        }
    });
    const { data: venues = [], error: error4, isLoading: load4 } = useQuery({
        queryKey: ['distinct_venues'],
        queryFn: async () => {
            const { data = [], error } = await supabase.from('distinct_venues').select('venue');
            if (error) throw error;
            return data!.map(({ venue }) => venue!);
        }
    });

    const { data: disciplines = [], error: error5, isLoading: load5 } = useQuery({
        queryKey: ['distinct_cross_discipline'],
        queryFn: async () => {
            const { data = [], error } = await supabase.from('distinct_cross_discipline').select('discipline');
            if (error) throw error;
            return data!.map(({ discipline }) => discipline!);
        }
    });

    const { data: semesters = [], error: error6, isLoading: load6 } = useQuery({
        queryKey: ['distinct_semesters'],
        queryFn: async () => {
            const { data = [], error } = await supabase.from('distinct_semesters').select('semester').order('semester', { ascending: false });
            if (error) throw error;
            return data!.map(({ semester }) => semester!);
        }
    });

    const { getSemesterCourses } = useUserTimetable();
    const semester = useWatch({ control: form.control, name: 'semester' });
    const handleFillTimes = useCallback(() => {
        const timeslots = getSemesterCourses(semester).map(course => course.times.map(time => time.match(/.{1,2}/g) ?? [] as unknown as string[]).flat()).flat();
        const timeslotSet = new Set(timeslots);
        const timeslotList = Array.from(timeslotSet);
        const days = ['M', 'T', 'W', 'R', 'F', 'S'];
        const selectDays: string[] = [];
        scheduleTimeSlots.forEach(timeSlot => {
            days.forEach(day => {
                if (!timeslotList.includes(day + timeSlot.time)) {
                    selectDays.push(day + timeSlot.time);
                }
            })
        })
        form.setValue('timeslots', selectDays);
    }, [getSemesterCourses, semester, form]);

    return <div className="p-4 flex flex-col overflow-auto bg-background">
        <span className="text-xs font-bold uppercase">{dict.course.refine.title}</span>
        <div className='flex flex-col gap-4 mt-4'>
            <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{dict.course.refine.semester}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={dict.course.refine.semester} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {semesters.map(semester => (<SelectItem key={semester} value={semester}>{toPrettySemester(semester)}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <MultiCheckboxControl control={form.control} name="level" options={[
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
            <MultiCheckboxControl control={form.control} name="language" options={[
                { value: '英', label: 'English' },
                { value: '中', label: '國語' },
            ]} label={dict.course.refine.language} />
            <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{dict.course.refine.department}</FormLabel>
                        <FormItem>
                            <FormControl>
                                <MultiSelectFormField
                                    placeholder={dict.course.refine.department}
                                    options={departments.map(dept => ({ value: dept.code, label: `${dept.code} - ${dept.name_zh}` }))}
                                    defaultValue={field.value}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>

                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="timeslots"
                render={() => (
                    <FormItem>
                        <Collapsible>
                            <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between space-x-4 px-4 outline outline-1 outline-primary rounded-lg cursor-pointer">
                                    <h4 className="text-sm font-semibold">
                                        {dict.course.refine.time}
                                    </h4>
                                    <Button variant="ghost" size="sm" className="w-9 p-0">
                                        <ChevronsUpDown className="h-4 w-4" />
                                        <span className="sr-only">Toggle</span>
                                    </Button>
                                </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <Button variant="outline" color="neutral" size="sm" onClick={handleFillTimes}>
                                    找沒課的時間
                                </Button>
                                <TimeslotSelectorControl control={form.control} />
                            </CollapsibleContent>
                        </Collapsible>
                    </FormItem>
                )}
            />
            <MultiCheckboxControl control={form.control} name="geTarget" options={GETargetCodes.map(code => ({ value: code.code, label: `${code.code} ${language == 'zh' ? code.short_zh : code.short_en}` }))} label={dict.course.refine.geTarget} />
            <MultiCheckboxControl control={form.control} name="gecDimensions" options={GECTypes.map(type => ({ value: type, label: type }))} label={dict.course.refine.gecDimensions} />
            <AutocompleteShadcn
                control={form.control}
                name="className"
                placeholder={dict.course.refine.class}
                loading={load3}
                options={classList.map(classname => ({ value: classname, label: getFormattedClassCode(classname, semester) }))}
                label={dict.course.refine.compulsory_elective}
            />
            <MultiCheckboxControl control={form.control} name="others" options={[
                { value: 'xclass', label: dict.course.refine['x-class'] },
                { value: '16_weeks', label: dict.course.refine['16_weeks'] },
                { value: 'extra_selection', label: dict.course.refine['extra_selection'] }
            ]} label={dict.course.refine.others} />
            <FormField
                control={form.control}
                name="venues"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{dict.course.refine.venues}</FormLabel>
                        <FormItem>
                            <FormControl>
                                <MultiSelectFormField
                                    placeholder={dict.course.refine.venues}
                                    options={venues.map(venue => ({ value: venue, label: venue }))}
                                    defaultValue={field.value}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    </FormItem>
                )}
            />
            <AutocompleteShadcn control={form.control} name="firstSpecialization" placeholder={dict.course.refine.firstSpecialization} loading={load1} options={firstSpecial.map(special => ({ value: special, label: special }))} label={dict.course.refine.specialization} />
            <AutocompleteShadcn control={form.control} name="secondSpecialization" placeholder={dict.course.refine.secondSpecialization} loading={load2} options={secondSpecial.map(special => ({ value: special, label: special }))} label={dict.course.refine.specialization} />
            <FormField
                control={form.control}
                name="disciplines"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{dict.course.refine.cross_discipline}</FormLabel>
                        <FormItem>
                            <FormControl>
                                <MultiSelectFormField
                                    placeholder={dict.course.refine.cross_discipline}
                                    options={disciplines.map(discipline => ({ value: discipline, label: discipline }))}
                                    defaultValue={field.value}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    </FormItem>
                )}
            />
            <Button
                variant={'destructive'}
                size={'sm'}
                onClick={() => form.reset(emptyFilters)}
            >
                <Trash className='h-4 w-4 mr-2' />
                {dict.course.refine.clear}
            </Button>
        </div>
    </div>
}

export default RefineControls;