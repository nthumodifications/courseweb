'use client';;
import CourseListItem from "@/components/Courses/CourseListItem";
import supabase, { CourseSyllabusView } from '@/config/supabase';
import { NextPage } from "next";
import { useEffect, useState, Fragment, useRef, useMemo } from "react";
import { CalendarDays, Filter, Loader2Icon, LoaderIcon, Search, X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { useDebouncedCallback } from "use-debounce";
import { useLocalStorage, useMediaQuery } from 'usehooks-ts';
import { arrayRange } from '@/helpers/array';
import RefineControls, { RefineControlFormTypes, emptyFilters } from '@/components/Courses/RefineControls';
import useDictionary from "@/dictionaries/useDictionary";
import { useRouter, useSearchParams } from "next/navigation";
import queryString from 'query-string';
import { TimeFilterType } from "@/components/FormComponents/TimeslotSelectorControl";
import { event } from "@/lib/gtag";
import { toPrettySemester } from '@/helpers/semester';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { FormField, Form } from '@/components/ui/form';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import MiniTimetable from "@/components/Courses/MiniTimetable";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Drawer, DrawerContent } from "@/components/ui/drawer";

const CoursePage: NextPage = () => {
    const dict = useDictionary();
    const [courses, setCourses] = useState<CourseSyllabusView[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [headIndex, setHeadIndex] = useState<number>(0);
    const [open, setOpen] = useState<boolean>(false);
    const [timetableOpen, setTimetableOpen] = useState<boolean>(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [filtersState, setFiltersState] = useLocalStorage<RefineControlFormTypes>('course_filters', emptyFilters);


    const form = useForm<RefineControlFormTypes>({
        defaultValues: useMemo(() => {
            if (searchParams.size > 0) {
                //Since we have to handle department differently, special cases where have nested objects
                //change them back to object
                let params = queryString.parse(searchParams.toString(), { arrayFormat: 'index', parseNumbers: true })
                //@ts-ignore
                params.semester = params.semester?.toString()
                const final = Object.assign({}, emptyFilters, params)
                //if final is same as emptyFilters, then it means there is no filters, return filterstate, check if filtersState is same as emptyFilters, if not, reset to emptyFilters
                if (JSON.stringify(final) == JSON.stringify(emptyFilters)) {
                    if (JSON.stringify(filtersState) != JSON.stringify(emptyFilters)) {
                        return emptyFilters;
                    }
                    return filtersState;
                }
                else return final;
            }
            else return emptyFilters;
        }, [])
    })

    const { control, watch, setValue, reset, formState: { isDirty } } = form;

    const semester = useWatch({ control, name: 'semester' });

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

    const PAGNIATION_MAX = 6;

    const filters = watch()
    // const filters = emptyFilters;

    const renderPagination = () => {
        const range = paginationRange(currentPage, totalPage, PAGNIATION_MAX);
        return <Pagination>
            <PaginationContent>
                {currentPage != 1 && <PaginationItem>
                    <PaginationPrevious onClick={() => searchQuery(filters, headIndex - 30)} />
                </PaginationItem>}
                {currentPage > 4 && <PaginationItem>
                    <PaginationEllipsis />
                </PaginationItem>}
                <PaginationItem>
                    {range.map((page, index) => {
                        return (
                            <PaginationLink
                                key={index}
                                aria-pressed={currentPage == page}
                                isActive={currentPage == page}
                                onClick={() => searchQueryFunc(filters, (page - 1) * 30)}
                            >
                                {page}
                            </PaginationLink>)
                    })}
                </PaginationItem>
                {currentPage < totalPage - 3 && <PaginationItem>
                    <PaginationEllipsis />
                </PaginationItem>}
                {currentPage != totalPage && <PaginationItem>
                    <PaginationNext href="#" onClick={() => searchQuery(filters, headIndex + 30)} />
                </PaginationItem>}
            </PaginationContent>
        </Pagination>
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
                    .in('department', filters.department)
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
                if (filters.timeFilter == TimeFilterType.Within)
                    temp = temp
                        .containedBy('time_slots', filters.timeslots)
                else if (filters.timeFilter == TimeFilterType.Includes)
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
        }, { arrayFormat: 'index' }))
        setFiltersState(filters);

    }, [JSON.stringify(filters)])

    return (<>
        <div className="grid grid-cols-1 md:grid-cols-[auto_320px]">
            <Form {...form}>
                <div className="flex flex-col w-full space-y-5 px-2 no-scrollbar scroll-smooth" ref={scrollRef}>
                    <FormField
                        control={control}
                        name="textSearch"
                        render={({ field }) => (
                            <div className="flex flex-row min-h-[44px] items-center rounded-md shadow-md bg-secondary text-secondary-foreground sticky top-0 z-10">
                                <div className="px-3">
                                    {loading ? <Loader2Icon className="animate-spin" /> :
                                        <HoverCard>
                                            <HoverCardTrigger><Search /></HoverCardTrigger>
                                            <HoverCardContent className="whitespace-pre-wrap">
                                                You can search by <br />
                                                - Course Name <br />
                                                - Teacher Name <br />
                                                - Course ID
                                            </HoverCardContent>
                                        </HoverCard>
                                    }
                                </div>
                                <input className="bg-transparent outline-none flex-1 text-secondary-foreground" placeholder={dict.course.list.search_placeholder} {...field} />
                                <Fragment>
                                    {filters.textSearch.length > 0 && <Button size='icon' variant={"ghost"} onClick={() => setValue('textSearch', "")}>
                                        <X className="text-gray-400 p-1" />
                                    </Button>}
                                    {
                                        isMobile ? <>
                                            <Separator orientation="vertical" />
                                            <Button size='icon' variant={"ghost"} onClick={() => setOpen(true)}>
                                                <Filter className="text-gray-400 p-1" />
                                            </Button>
                                            <Separator orientation="vertical" />
                                            <Button size='icon' variant={"ghost"} onClick={() => setTimetableOpen(true)}>
                                                <CalendarDays className="text-gray-400 p-1" />
                                            </Button>
                                        </> : <></>
                                    }
                                </Fragment>
                            </div>
                        )}
                    />
                    <div className="relative">
                        {/* loading covers all with white cover */}
                        {loading && <div className="absolute inset-0 bg-white/60 dark:bg-background/60 z-10"></div>}
                        <div className="flex flex-col w-full h-full space-y-4 pb-14">
                            <div className="flex flex-row justify-between px-3 py-1 border-b dark:border-neutral-800">
                                <h6 className="text-gray-600 dark:text-neutral-400">{toPrettySemester(filters.semester)} {dict.course.list.courses}</h6>
                                <h6 className="text-gray-600 dark:text-neutral-400">{dict.course.list.found}: {totalCount} {dict.course.list.courses}</h6>
                            </div>
                            <div className="flex flex-col w-full h-full space-y-5">
                                {courses.map((course, index) => (
                                    <CourseListItem key={index} course={course} />
                                ))}
                            </div>
                            <div className="flex flex-row justify-center pb-4">
                                {renderPagination()}
                            </div>
                        </div>
                    </div>
                </div>

                {!isMobile && <div className="absolute bottom-2 right-2 w-[300px] h-[90vh]">
                    <ResizablePanelGroup direction="vertical" className="rounded-md border">
                        <ResizablePanel defaultSize={25} minSize={6} className="!overflow-y-scroll">
                            <MiniTimetable semester={semester} />
                        </ResizablePanel>
                        <ResizableHandle />
                        <ResizablePanel defaultSize={75} minSize={6} className="!overflow-y-scroll">
                            <RefineControls form={form} />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>}
                {isMobile && <Drawer open={open} onClose={() => setOpen(false)}>
                    <DrawerContent>
                        <div className="max-h-[70vh] overflow-auto">
                            <RefineControls form={form} />
                        </div>
                    </DrawerContent>
                </Drawer>}
                {isMobile && <Drawer open={timetableOpen} onClose={() => setTimetableOpen(false)}>
                    <DrawerContent>
                        <div className="max-h-[70vh] overflow-auto">
                            <MiniTimetable semester={semester} />
                        </div>
                    </DrawerContent>
                </Drawer>}

            </Form>
        </div>
    </>

    )
}

export default CoursePage;