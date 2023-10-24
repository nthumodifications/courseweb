import MultiSelectControl from '@/components/FormComponents/MultiSelectControl';
import supabase from '@/config/supabase';
import { departments } from '@/const/departments';
import { scheduleTimeSlots } from '@/const/timetable';
import useDictionary from '@/dictionaries/useDictionary';
import { Accordion, AccordionDetails, AccordionSummary, Autocomplete, AutocompleteOption, Button, Chip, FormControl, FormLabel, List, ListItem, ListItemContent, ListItemDecorator, Sheet, Typography } from '@mui/joy';
import { useEffect, useState, FC, use } from 'react';
import { Controller, Control } from 'react-hook-form';
import TimeslotSelectorControl from '../FormComponents/TimeslotSelectorControl';
import useSWR from 'swr';
import AutocompleteControl from '../FormComponents/AutocompleteControl';
import DepartmentControl from '../FormComponents/DepartmentControl';
import { useMediaQuery } from 'usehooks-ts';

export type RefineControlFormTypes = {
    textSearch: string,
    level: string[],
    language: string[],
    others: string[],
    className: string | null,
    department: { code: string; name_zh: string; name_en: string; }[],
    firstSpecialization: string | null,
    secondSpecialization: string | null,
    timeslots: string[],
    venues: string[],
    disciplines: string[],
}

const RefineControls: FC<{ control: Control<RefineControlFormTypes> }> = ({ control }) => {
    const dict = useDictionary();
    const { data: firstSpecial = [], error: error1, isLoading: load1 } = useSWR('distinct_first_specialization', async () => {
        const { data = [], error } = await supabase.from('distinct_first_specialization').select('unique_first_specialization');
        if (error) throw error;
        return data!.map(({ unique_first_specialization }) => unique_first_specialization!);
    });
    const { data: secondSpecial = [], error: error2, isLoading: load2 } = useSWR('distinct_second_specialization', async () => {
        const { data = [], error } = await supabase.from('distinct_second_specialization').select('unique_second_specialization');
        if (error) throw error;
        return data!.map(({ unique_second_specialization }) => unique_second_specialization!);
    });
    const { data: classList = [], error: error3, isLoading: load3 } = useSWR('distinct_classes', async () => {
        const { data = [], error } = await supabase.from('distinct_classes').select('class');
        if (error) throw error;
        return data!.map(({ class: className }) => className!);
    });
    const { data: venues = [], error: error4, isLoading: load4 } = useSWR('venues', async () => {
        const { data = [], error } = await supabase.from('distinct_venues').select('venue');
        if (error) throw error;
        return data!.map(({ venue }) => venue!);
    });
    
    const { data: disciplines = [], error: error5, isLoading: load5 } = useSWR('disciplines', async () => {
        const { data = [], error } = await supabase.from('distinct_cross_discipline').select('discipline');
        if (error) throw error;
        return data!.map(({ discipline }) => discipline!);
    });

    const isMobile = useMediaQuery('(max-width: 768px)');

    return <Sheet variant="outlined" sx={{ p: isMobile?3:2, borderRadius: 'sm', width: isMobile?400:300, height: '100%', maxHeight:isMobile?'100vh':'90vh', overflow: 'auto', position: isMobile?'':'absolute', bottom: '8px', right: '8px' }}>
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
        <div role="group" aria-labelledby="filter-status">
            <List>
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
                    <AccordionSummary>Time</AccordionSummary>
                    <AccordionDetails>
                        <TimeslotSelectorControl control={control} />
                    </AccordionDetails>
                </Accordion>
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
                    <FormControl>
                        <FormLabel>{"Venues"}</FormLabel>
                        <AutocompleteControl
                            control={control}
                            name="venues"
                            multiple
                            placeholder={"Venues"}
                            loading={load4}
                            options={venues}
                        />
                    </FormControl>
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <FormControl>
                        <FormLabel>{"Cross Discipline"}</FormLabel>
                        <AutocompleteControl
                            control={control}
                            name="disciplines"
                            multiple
                            placeholder={"Cross Discipline"}
                            loading={load5}
                            options={disciplines}
                        />
                    </FormControl>
                </ListItem>
                <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                    <MultiSelectControl
                        control={control}
                        name="others"
                        options={[
                            { value: 'xclass', label: dict.course.refine['x-class'] },
                            { value: 'extra_selection', label: 'Allows Extra Selection'}
                        ]}
                        label="Others"
                    />
                </ListItem>
            </List>
        </div>
        <Button
            variant="outlined"
            color="neutral"
            size="sm"
            onClick={() => { }
            }
            sx={{ px: 1.5, mt: 1 }}
        >
            {dict.course.refine.clear}
        </Button>
    </Sheet>
}

export default RefineControls;