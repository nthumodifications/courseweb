import { Autocomplete, AutocompleteOption, CircularProgress, ListItemContent, createFilterOptions } from '@mui/joy';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import supabase from '@/config/supabase';
import { CourseDefinition } from '@/config/supabase';
import {lastSemester} from '@/const/semester';
import { Semester } from '@/types/courses';

const CourseSearchbar = ({ onAddCourse, semester = lastSemester.id}: { onAddCourse: (course: CourseDefinition) => void, semester?: Semester }) => {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<CourseDefinition[]>([]);
    const [loading, setLoading] = useState(false);
    const [textSearch, setTextSearch] = useState('');
    const [refreshKey, setRefreshKey] = useState<string>("init");


    const search = useDebouncedCallback(async (text: string) => {
        try {
            setLoading(true);
            let temp = supabase.rpc('search_courses', {
                keyword: text
            });
            const { data = [], error } = await temp
                .eq('semester', semester)
                .order('raw_id', { ascending: true })
                .limit(10);
            if (error) console.error(error);
            else setOptions(data as CourseDefinition[] ?? []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }, 500);

    useEffect(() => {
        if (open) search("");
    }, [open]);

    const filterOptions = createFilterOptions({
        matchFrom: 'any',
        stringify: (option: CourseDefinition) => `${option.name_zh} ${option.name_en} ${option.teacher_zh.join(' ')} ${option.teacher_en?.join(' ')} ${option.raw_id}`
    });

    return <Autocomplete
        key={refreshKey}
        placeholder="尋找你要的課..."
        open={open}
        onOpen={() => {
            setLoading(true);
            setOpen(true);
        }}
        onClose={() => {
            setOpen(false);
        }}
        inputValue={textSearch}
        onInputChange={(event, newInputValue) => {
            setLoading(true);
            setTextSearch(newInputValue);
            search(newInputValue);
        }}
        defaultValue={null}
        value={null}
        onChange={(event, newValue) => {
            setRefreshKey(newValue!.raw_id! ?? Date.now());
            if (newValue) onAddCourse(newValue!);
        }}
        isOptionEqualToValue={(option, value) => option.raw_id === value.raw_id}
        
        getOptionLabel={(option) => `${option.department} ${option.course}-${option.class} ${option.name_zh} ${option.name_en}`}
        renderOption={(props, option) => (
            <AutocompleteOption {...props}>
                <ListItemContent sx={{ fontSize: 'sm' }}>
                    <p className="font-semibold">{option.department} {option.course}-{option.class} {option.name_zh}</p>
                    <p className="text-xs">{option.name_en}</p>
                    <p className="text-xs text-gray-400">{option.teacher_zh.join(',')} {option.teacher_en?.join(',')} </p>
                    {option.venues?.map((venue, index) => {
                        const time = option.times![index];
                        return <div key={index} className="flex flex-row items-center space-x-2 text-gray-400">
                            <span className="text-xs">{venue}</span>
                            <span className="text-xs">{time}</span>
                        </div>
                    }) || <span className="text-gray-400 text-xs">No Venue</span>}
                </ListItemContent>
            </AutocompleteOption>
        )}
        options={options}
        loading={loading}
        filterOptions={filterOptions}
        endDecorator={
            loading ? (
                <CircularProgress size="sm" sx={{ bgcolor: 'background.surface' }} />
            ) : null
        }
    />
}

export default CourseSearchbar;