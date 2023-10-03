'use client';
import InputControl from "@/components/FormComponents/InputControl";
import MultiSelectControl from "@/components/FormComponents/MultiSelectControl";
import supabase, { CourseDefinition } from "@/config/supabase";
import { departments } from "@/const/departments";
import { useSettings } from "@/hooks/contexts/settings";
import { Database } from "@/types/supabase";
import { Autocomplete, AutocompleteOption, Button, Checkbox, Chip, FormControl, FormHelperText, FormLabel, Input, List, ListItem, ListItemContent, ListItemDecorator, Sheet, Typography } from "@mui/joy";
import { NextPage } from "next";

import { useEffect, useState, FC } from "react";
import { Users } from "react-feather";
import { useForm, Controller, Path } from "react-hook-form";
import type { Control, FieldValues } from "react-hook-form";
import { useDebouncedCallback } from "use-debounce";

const CourseListItem: FC<{ course: CourseDefinition }> = ({ course }) => {
    return <div className="text-gray-600 px-4">
        <div className="flex flex-row justify-between">
            <div className="mb-3">
                <h1 className="font-semibold text-lg">{course.department} {course.course}-{course.class} {course.name_zh} - {course.raw_teacher_zh}</h1>
                <h3 className="text-base text-gray-800 mt-0">{course.name_en} - {course.raw_teacher_en}</h3>
            </div>
            <div className="flex flex-row space-x-1 mb-2">
                <Users/>
                <span className="">{course.capacity} / {course.reserve}R</span>
            </div>
        </div>
        <div className="flex flex-row justify-between">
            <div className="space-y-1">
                <p>{course.venue || "No Venue"} • {course.credits} Credits</p>
                <p>{course.課程限制說明}</p>
            </div>
            <div className="space-x-2 justify-end">
                {course.備註?.includes('X-Class') && <Chip
                    color="danger"
                    disabled={false}
                    size="md"
                    variant="outlined"
                >X-Class</Chip>}
                {course.language == '英' ? <Chip
                    color="primary"
                    disabled={false}
                    size="md"
                    variant="outlined"
                >English</Chip>:
                <Chip
                    color="success"
                    disabled={false}
                    size="md"
                    variant="outlined"
                >國語</Chip>}
            </div>
        </div>
    </div>
}

type FormTypes = {
    textSearch: string,
    level: string[],
    language: string[],
    others: string[],
    department: { code: string; name_zh: string; name_en: string; }[]
}

const CoursePage: NextPage = () => {
    // const { language } = useSettings();

    const [courses, setCourses] = useState<CourseDefinition[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const { control, watch,  } = useForm<FormTypes>({
        defaultValues: {
            textSearch: '',
            level: [],
            others: [],
            language: [],
            department: []
        }
    })

    //codes should be 4 char, so we need to pad it at the end
    const padEnd = (str: string) =>  str + ' '.repeat(4 - str.length)

    const searchQueryFunc = useDebouncedCallback((filters: FormTypes) => {
        console.log(filters);
        (async () => {
            let temp = supabase
            .from('courses')
            .select('*', { count: 'exact' })
            if(filters.textSearch) temp = temp.textSearch('name_en', `'${filters.textSearch.split(' ').join("' & '")}'`)
            if(filters.level.length) temp = temp.or(filters.level.map(level => `and(course.gte.${level}000,course.lte.${level}999)`).join(','))
            if(filters.language.length) temp = temp.or(filters.language.map(lang => `language.eq.${lang}`).join(','))
            if(filters.department.length) temp = temp.in('department', filters.department.map(({code}) => padEnd(code)))
            let { data: courses, error, count } = await temp.limit(300)
            console.log('filter courses',courses)
            setTotalCount(count ?? 0)
            if(error) console.log(error);
            else setCourses(courses!);
        })()
    }, 1000);

    //filters
    const filters = watch()
    useEffect(() => {
        // console.log(filters);
        searchQueryFunc(filters);
    }, [filters.textSearch, filters.level, filters.department, filters.language])


    return (
        <div className="grid grid-cols-[auto_320px] w-full h-full">
            <div className="flex flex-col w-full h-full overflow-auto space-y-5">
                <InputControl
                    control={control}
                    name="textSearch"
                    placeholder="Search for your course (Name, Class, Anything)"
                    variant="soft"
                />
                <div className="flex flex-row justify-between px-3 py-1 border-b">
                    <h6 className="text-gray-600">Courses</h6>
                    <h6 className="text-gray-600">Found: {totalCount} Courses</h6>
                </div>
                
                {courses.map((course, index) => (
                    <CourseListItem key={index} course={course}/>
                ))}
            </div>
            <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'sm', width: 300 }}>
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
                    Refine
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
                                label="Level"
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
                                label="Instruction Language"
                            />
                        </ListItem>
                        <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                            <FormControl>
                                <FormLabel>Departments</FormLabel>
                                <Controller
                                    control={control}
                                    name="department"
                                    render={({ field: {value, onChange} }) => (
                                    <Autocomplete
                                        placeholder="Departments"
                                        value={value}
                                        onChange={(e, v) => onChange(v)}
                                        multiple={true}
                                        getOptionLabel={(option) => `${option.code} ${option.name_zh}`}
                                        isOptionEqualToValue={(option, value) => option.code === value.code}
                                        renderTags={(value, getTagProps) => 
                                            value.map((option, index) => 
                                                <Chip 
                                                    variant="soft"
                                                    {...getTagProps({ index })}
                                                >
                                                    {`${option.code}`} 
                                                </Chip>
                                            )
                                        }
                                        renderOption={(props, option) => (
                                            <AutocompleteOption {...props}>
                                                <ListItemDecorator>
                                                    <span className="text-sm font-semibold">{option.code}</span>
                                                </ListItemDecorator>
                                                <ListItemContent sx={{ fontSize: 'sm' }}>
                                                    <Typography level="body-xs">
                                                    {option.name_zh} {option.name_en}
                                                    </Typography>
                                                </ListItemContent>
                                            </AutocompleteOption>
                                        )}
                                        options={departments}
                                        sx={{ width: 250 }}
                                    />
                                )}/>
                            </FormControl>
                        </ListItem>
                        <ListItem variant="plain" sx={{ borderRadius: 'sm' }}>
                            <MultiSelectControl 
                                control={control} 
                                name="others" 
                                options={[
                                    { value: 'xclass', label: 'X-Class' },
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
                    onClick={() => {}
                    }
                    sx={{ px: 1.5, mt: 1 }}
                >
                    Clear All
                </Button>
            </Sheet>
        </div>
        
    )
}

export default CoursePage;