import MultiSelectControl from '@/components/FormComponents/MultiSelectControl';
import supabase from '@/config/supabase';
import useDictionary from '@/dictionaries/useDictionary';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    FormControl,
    FormLabel,
    List,
    ListItem,
    Sheet,
    Typography,
} from '@mui/joy';
import { FC } from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import TimeslotSelectorControl from '../FormComponents/TimeslotSelectorControl';
import useSWR from 'swr';
import AutocompleteControl from '../FormComponents/AutocompleteControl';
import DepartmentControl from '../FormComponents/DepartmentControl';
import { useMediaQuery } from 'usehooks-ts';
import { GECTypes, GETargetCodes } from '@/const/ge_target';
import { useSettings } from '@/hooks/contexts/settings';
import { Department } from '@/types/courses';
import { RefineControlFormTypes } from '@/app/[lang]/courses/page';
import SelectControl from '../FormComponents/SelectControl';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import {scheduleTimeSlots} from '@/const/timetable';

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

    const isMobile = useMediaQuery('(max-width: 768px)');

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


    return <Sheet 
        variant="outlined" 
        sx={{ 
            p: isMobile?3:2, 
            borderRadius: 'sm', 
            width: isMobile?`min(35rem, 100%)`:300, 
            height: '100%', 
            maxHeight:isMobile?'100vh':'90vh', 
            overflowY: 'auto', 
            overflowX: 'hidden', 
            position: isMobile?'':'absolute', 
            bottom: '8px', 
            right: '8px' 
        }}>
        <Typography
            id="filter-status"
            sx={{
                textTransform: 'uppercase',
                fontSize: 'xs',
                letterSpacing: 'lg',
                fontWeight: 'lg',
                color: 'text.secondary',
            }}
        >
            {dict.course.refine.title}
        </Typography>
        <Button
            variant="outlined"
            color="neutral"
            size="sm"
            onClick={onClear}
            sx={{ px: 1.5, mt: 1 }}
        >
            {dict.course.refine.clear}
        </Button>
        <div role="group" aria-labelledby="filter-status">
            <List>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <FormControl>
                        <FormLabel>{dict.course.refine.semester}</FormLabel>
                        <SelectControl
                            control={control}
                            sx={{ width: '250px' }}
                            name="semester"
                            options={semesters.map(semester => ({ value: semester, label: semester }))}
                            placeholder={dict.course.refine.semester}
                        />
                    </FormControl>
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <MultiSelectControl
                        control={control}
                        name="level"
                        options={[
                            { value: 1, label: '1xxx' },
                            { value: 2, label: '2xxx' },
                            { value: 3, label: '3xxx' },
                            { value: 4, label: '4xxx' },
                            { value: 5, label: '5xxx' },
                            { value: 6, label: '6xxx' },
                            { value: 7, label: '7xxx' },
                            { value: 8, label: '8xxx' },
                            { value: 9, label: '9xxx' },
                        ]}
                        label={dict.course.refine.level}
                    />
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <MultiSelectControl
                        control={control}
                        name="language"
                        options={[
                            { value: '英', label: 'English' },
                            { value: '中', label: '國語' },
                        ]}
                        label={dict.course.refine.language}
                    />
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <FormControl>
                        <FormLabel>{dict.course.refine.department}</FormLabel>
                        <DepartmentControl control={control} />
                    </FormControl>
                </ListItem>
                <Accordion>
                    <AccordionSummary>{dict.course.refine.time}</AccordionSummary>
                    <AccordionDetails>
                        <Button variant="outlined" color="neutral" size="sm" onClick={handleFillTimes}>
                            找沒課的時間
                        </Button>
                        <TimeslotSelectorControl control={control} />
                    </AccordionDetails>
                </Accordion>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <MultiSelectControl
                        control={control}
                        name="geTarget"
                        options={GETargetCodes.map(code => ({ value: code.code, label: `${code.code} ${language == 'zh'? code.short_zh: code.short_en}`  }))}
                        label={dict.course.refine.geTarget}
                    />
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <MultiSelectControl
                        control={control}
                        name="gecDimensions"
                        options={GECTypes.map(type => ({ value: type, label: type}))}
                        label={dict.course.refine.gecDimensions}
                    />
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <FormControl>
                        <FormLabel>{dict.course.refine.compulsory_elective}</FormLabel>
                        <AutocompleteControl
                            control={control}
                            name="className"
                            placeholder={dict.course.refine.class}
                            loading={load3}
                            options={classList}
                        />
                    </FormControl>
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <MultiSelectControl
                        control={control}
                        name="others"
                        options={[
                            { value: 'xclass', label: dict.course.refine['x-class'] },
                            { value: '16_weeks', label: dict.course.refine['16_weeks']},
                            { value: 'extra_selection', label: dict.course.refine['extra_selection']}
                        ]}
                        label={dict.course.refine.others}
                    />
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <FormControl>
                        <FormLabel>{dict.course.refine.venues}</FormLabel>
                        <AutocompleteControl
                            control={control}
                            name="venues"
                            multiple
                            placeholder={dict.course.refine.venues}
                            loading={load4}
                            options={venues}
                        />
                    </FormControl>
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <FormControl>
                        <FormLabel>{dict.course.refine.specialization}</FormLabel>
                        <AutocompleteControl
                            control={control}
                            name="firstSpecialization"
                            placeholder={dict.course.refine.firstSpecialization}
                            loading={load1}
                            options={firstSpecial}
                        />
                        <AutocompleteControl
                            control={control}
                            name="secondSpecialization"
                            placeholder={dict.course.refine.secondSpecialization}
                            loading={load2}
                            options={secondSpecial}
                        />

                    </FormControl>
                </ListItem>
                
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <FormControl>
                        <FormLabel>{dict.course.refine.cross_discipline}</FormLabel>
                        <AutocompleteControl
                            control={control}
                            name="disciplines"
                            multiple
                            placeholder={dict.course.refine.cross_discipline}
                            loading={load5}
                            options={disciplines}
                        />
                    </FormControl>
                </ListItem>
            </List>
        </div>
        <Button
            variant="outlined"
            color="neutral"
            size="sm"
            onClick={onClear}
            sx={{ px: 1.5, mt: 1 }}
        >
            {dict.course.refine.clear}
        </Button>
    </Sheet>
}

export default RefineControls;