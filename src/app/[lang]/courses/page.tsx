'use client';;
import CourseListItem from "@/components/Courses/CourseListItem";
import InputControl from "@/components/FormComponents/InputControl";
import supabase, { CourseSyllabusView } from '@/config/supabase';
import { Button, CircularProgress, Divider, Drawer, IconButton, Stack } from "@mui/joy";
import { NextPage } from "next";
import { useEffect, useState, Fragment, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Search, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useDebouncedCallback } from "use-debounce";
import { useLocalStorage, useMediaQuery } from 'usehooks-ts';
import { arrayRange } from '@/helpers/array';
import RefineControls from '@/components/Courses/RefineControls';
import useDictionary from "@/dictionaries/useDictionary";
import { useRouter, useSearchParams } from "next/navigation";
import queryString from 'query-string';
import { departments } from "@/const/departments";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import {Department} from '@/types/courses';
import { TimeFilterType } from "@/components/FormComponents/TimeslotSelectorControl";
import { event } from "@/lib/gtag";
import {toPrettySemester} from '@/helpers/semester';
import Timetable from "@/components/Courses/Timetable";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"

export type RefineControlFormTypes = {
    textSearch: string,
    level: string[],
    language: string[],
    others: string[],
    className: string | null,
    department: Department[],
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

const emptyFilters: RefineControlFormTypes = {
    textSearch: '',
    level: [],
    others: [],
    language: [],
    department: [],
    venues: [],
    timeslots: [],
    timeFilter: TimeFilterType.Within,
    semester: '11220',
    disciplines: [],
    gecDimensions: [],
    geTarget: [],
    className: null,
    firstSpecialization: null,
    secondSpecialization: null,
}

const CoursePage: NextPage = () => {
    const dict = useDictionary();
    const [courses, setCourses] = useState<CourseSyllabusView[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [headIndex, setHeadIndex] = useState<number>(0);
    const [open, setOpen] = useState<boolean>(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [filtersState, setFiltersState] = useLocalStorage<RefineControlFormTypes>('course_filters', emptyFilters);

    const { control, watch, setValue, reset, formState: { isDirty } } = useForm<RefineControlFormTypes>({
        defaultValues: useMemo(() => {
            if (searchParams.size > 0) { 
                //Since we have to handle department differently, special cases where have nested objects
                //change them back to object
                let params = queryString.parse(searchParams.toString(), { arrayFormat: 'index', parseNumbers: true })
                //@ts-ignore
                params.semester = params.semester?.toString()
                if (params.department && params.department instanceof Array) {
                    //@ts-ignore
                    params.department = params.department
                        .map(code => {
                            const department = departments.find(mod => mod.code == code)
                            return department ? { code: department?.code, name_zh: department?.name_zh, name_en: department?.name_en } : undefined
                        })
                        .filter(mod => !!mod) ?? []
                }
                const final = Object.assign({}, emptyFilters, params)
                //if final is same as emptyFilters, then it means there is no filters, return filterstate, check if filtersState is same as emptyFilters, if not, reset to emptyFilters
                if(JSON.stringify(final) == JSON.stringify(emptyFilters)) {
                    if(JSON.stringify(filtersState) != JSON.stringify(emptyFilters)) {
                        return emptyFilters;
                    }
                    return filtersState;
                }
                else return final;
            }
            else return emptyFilters;
        }, [])
    })

    const isMobile = useMediaQuery('(max-width: 768px)');

    //Pagination
    const paginationRange = (current: number, total: number, max: number = 7) => {
        if (total <= max) return arrayRange(1, total);
        let start = Math.max(1, current - Math.floor(max / 2));
        let end = Math.min(total, start + max - 1);
        if (end - start + 1 < max) {
            start = Math.max(1, end - max + 1);
        }
        return arrayRange(start, end);
    }

    const currentPage = headIndex / 30 + 1;
    const totalPage = Math.ceil(totalCount / 30);

    const PAGNIATION_MAX = 7;

    const filters = watch()

    const renderPagination = () => {
        const range = paginationRange(currentPage, totalPage, PAGNIATION_MAX);

        return range.map((page, index) => {
            return (
                <Button
                    key={index}
                    variant="soft"
                    aria-pressed={currentPage == page}
                    sx={(theme) => ({
                        [`&[aria-pressed="true"]`]: {
                            ...theme.variants.outlinedActive.neutral,
                            borderColor: theme.vars.palette.neutral.outlinedHoverBorder,
                        },
                    })}
                    onClick={() => searchQueryFunc(filters, (page - 1) * 30)}
                >
                    {page}
                </Button>)
        })
    }

    const searchQuery = async (filters: RefineControlFormTypes, index: number = 0) => {
        console.log("current filters", filters);
        scrollRef.current?.scrollTo(0, 0);
        setLoading(true);
        //Query for courses
        event({
            action: "search_courses",
            category: "courses",
            label: "popular_filters",
            data: {
                filters: filters,
            }
        })
        try {
            let temp = supabase.rpc('search_courses_with_syllabus', {
                    keyword: filters.textSearch,
                }, { count: 'exact' })
                .eq('semester', filters.semester)
            if (filters.level.length)
                temp = temp
                    .or(filters.level.map(level => `and(course.gte.${level}000,course.lte.${level}999)`).join(','))
            if (filters.language.length)
                temp = temp
                    .or(filters.language.map(lang => `language.eq.${lang}`).join(','))
            if (filters.department.length)
                temp = temp
                    .in('department', filters.department.map(({ code }) => code))
            if (filters.className)
                temp = temp
                    .or(`compulsory_for.cs.{"${filters.className}"},elective_for.cs.{"${filters.className}"}`);
            if (filters.others.includes('xclass'))
                temp = temp
                    .contains('tags', ['X-Class'])
            if (filters.others.includes('16_weeks')) 
                temp = temp
                    .contains('tags', ['16周'])
            if (filters.others.includes('extra_selection'))
                temp = temp
                    .not('tags', 'cs', '{"不可加簽"}')
            if (filters.firstSpecialization || filters.secondSpecialization) {
                temp = temp
                    .or(`first_specialization.cs.{"${filters.firstSpecialization ?? ""}"},second_specialization.cs.{"${filters.secondSpecialization ?? ""}"}`)
            }
            if (filters.venues.length) {
                temp = temp
                    .containedBy('venues', filters.venues)
            }
            if (filters.disciplines.length) {
                temp = temp
                    .overlaps('cross_discipline', filters.disciplines)
            }
            if (filters.gecDimensions.length) {
                temp = temp
                    .in('ge_type', filters.gecDimensions) //TODO: should consider changing name to gec_type
            }
            if (filters.geTarget.length) {
                temp = temp
                    .in('ge_target', filters.geTarget)
            }
            if (filters.timeslots.length) {
                if(filters.timeFilter == TimeFilterType.Within)
                    temp = temp
                        .containedBy('time_slots', filters.timeslots)
                else if(filters.timeFilter == TimeFilterType.Includes)
                    temp = temp
                        .overlaps('time_slots', filters.timeslots) //Overlap works if only one of their timeslots is selected
                //don't include the timeslot filter if it is empty array
                temp = temp
                    .not('time_slots', 'eq', '{}')
            }

            let { data: courses, error, count } = await temp.order('raw_id', { ascending: true }).range(index, index + 29)
            // move scroll to top
            setTotalCount(count ?? 0)
            if (error) console.error(error);
            else {
                setCourses(courses as unknown as CourseSyllabusView[]);
                setHeadIndex(index);
            }
        }
        catch (e) {
            console.error(e);
        }
        setLoading(false);
    }
    
    const searchQueryFunc = useDebouncedCallback(searchQuery, 1000);

    const handleClear = () => {
        reset(emptyFilters)
    }

    //Trigger Search When Filters Change
    useEffect(() => {
        setLoading(true);
        searchQueryFunc(filters);
        //Save filters to URL
        //But we have to handle geTarget and department differently, special cases where have nested objects
        //change them to string
        router.replace('?' + queryString.stringify({
            ...filters,
            department: filters.department.map(mod => mod.code),
        }, { arrayFormat: 'index' }))
        setFiltersState(filters);

    }, [JSON.stringify(filters)])

    const { displayCourseData } = useUserTimetable();

    const renderExistingSelection = () => {
        return <></>
        //TODO: existing selection logic doesn't work well with semester switching, so turn it off for now
        // // if(isDirty) return <></>;
        // //check if current filters is same as emptyFilters, if not, return empty
        // if(JSON.stringify(filters) != JSON.stringify(emptyFilters)) return <></>;
        // return displayCourseData.map((course) => <CourseListItem key={course.raw_id} course={course}/>)
    }


    return (<>
        {/* <div className="grid grid-cols-1 md:grid-cols-[auto_320px] w-full h-full overflow-hidden"> */}
            <div className="flex flex-col w-full h-screen overflow-auto space-y-5 px-2 pt-2 md:pr-[320px] no-scrollbar scroll-smooth" ref={scrollRef}>
                <InputControl
                    control={control}
                    name="textSearch"
                    placeholder={dict.course.list.search_placeholder}
                    variant="soft"
                    size="lg"
                    sx={{ position: 'sticky', top: 0, zIndex: 10 }}
                    startDecorator={
                        loading? <CircularProgress size="sm"/>: <Search/>
                    }
                    endDecorator={
                        <Fragment>
                            {filters.textSearch.length > 0 && <IconButton onClick={() => setValue('textSearch', "")}>
                                <X className="text-gray-400 p-1" />
                            </IconButton>}
                            {
                                isMobile ? <>
                                    <Divider orientation="vertical" />
                                    <IconButton onClick={() => setOpen(true)}>
                                        <Filter className="text-gray-400 p-1" />
                                    </IconButton>
                                </> : <></>
                            }
                        </Fragment>
                    }
                />
                <div className="relative">
                    {/* loading covers all with white cover */}
                    {loading && <div className="absolute inset-0 bg-white/60 dark:bg-neutral-900/60 z-10"></div>}
                    <div className="flex flex-col w-full h-full space-y-4 pb-8">
                        <div className="flex flex-row justify-between px-3 py-1 border-b dark:border-neutral-800">
                            <h6 className="text-gray-600 dark:text-neutral-400">{toPrettySemester(filters.semester)} {dict.course.list.courses}</h6>
                            <h6 className="text-gray-600 dark:text-neutral-400">{dict.course.list.found}: {totalCount} {dict.course.list.courses}</h6>
                        </div>
                        <div className="flex flex-col w-full h-full space-y-5">
                            {renderExistingSelection()}
                            {courses.map((course, index) => (
                                <CourseListItem key={index} course={course} />
                            ))}
                        </div>
                        <Stack
                            direction="row"
                            justifyContent="center"
                        >
                            {currentPage != 1 && <IconButton onClick={() => searchQuery(filters, 0)}>
                                <ChevronsLeft />
                            </IconButton>}
                            {currentPage != 1 && <IconButton onClick={() => searchQuery(filters, headIndex - 30)}>
                                <ChevronLeft />
                            </IconButton>}
                            {renderPagination()}
                            {currentPage != totalPage && <IconButton onClick={() => searchQuery(filters, headIndex + 30)}>
                                <ChevronRight />
                            </IconButton>}
                            {currentPage != totalPage && <IconButton onClick={() => searchQuery(filters, (totalPage - 1) * 30)}>
                                <ChevronsRight />
                            </IconButton>}
                        </Stack>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-2 right-2 w-[300px] h-[90vh]">
                <ResizablePanelGroup direction="vertical" className="rounded-lg border">
                    <ResizablePanel defaultSize={25}>
                        <Timetable />
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={75}>
                        <div className="flex h-full items-center justify-center p-6">
                        <span className="font-semibold">Content</span>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {!isMobile && <RefineControls control={control} onClear={handleClear} setValue={setValue}/>}
            {isMobile && <Drawer
                size="md"
                variant="plain"
                open={open}
                onClose={() => setOpen(false)}
                slotProps={{
                    content: {
                        sx: {
                            bgcolor: 'transparent',
                            p: { md: 3, sm: 0 },
                            boxShadow: 'none',
                        },
                    },
                }}
            >
                <RefineControls control={control} onClear={handleClear} setValue={setValue}/>
            </Drawer>}
        {/* </div> */}
        </>

    )
}

export default CoursePage;