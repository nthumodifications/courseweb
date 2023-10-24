'use client';;
import CourseListItem from "@/components/Courses/CourseListItem";
import InputControl from "@/components/FormComponents/InputControl";
import supabase, { CourseDefinition } from "@/config/supabase";
import { Button, Divider, Drawer, IconButton, LinearProgress, Stack } from "@mui/joy";
import { NextPage } from "next";
import { useEffect, useState, Fragment, useRef, use, useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, X } from "react-feather";
import { useForm } from "react-hook-form";
import { useDebouncedCallback } from "use-debounce";
import { useMediaQuery } from 'usehooks-ts';
import { arrayRange } from '@/helpers/array';
import RefineControls, { RefineControlFormTypes } from '@/components/Courses/RefineControls';
import useDictionary from "@/dictionaries/useDictionary";
import { useRouter, useSearchParams } from "next/navigation";
import queryString from 'query-string';
import { GETargetCodes } from "@/const/ge_target";
import { departments } from "@/const/departments";

const emptyFilters: RefineControlFormTypes = {
    textSearch: '',
    level: [],
    others: [],
    language: [],
    department: [],
    venues: [],
    timeslots: [],
    disciplines: [],
    gecDimensions: [],
    geTarget: [],
    className: null,
    firstSpecialization: null,
    secondSpecialization: null,
}

const CoursePage: NextPage = () => {
    const dict = useDictionary();
    const [courses, setCourses] = useState<CourseDefinition[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [headIndex, setHeadIndex] = useState<number>(0);
    const [open, setOpen] = useState<boolean>(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    const { control, watch, setValue, reset } = useForm<RefineControlFormTypes>({
        defaultValues: useMemo(() => {
            if (searchParams.size > 0) { 
                //Since we have to handle department differently, special cases where have nested objects
                //change them back to object
                let params = queryString.parse(searchParams.toString(), { arrayFormat: 'index', parseNumbers: true })
                if (params.department && params.department instanceof Array) {
                    //@ts-ignore
                    params.department = params.department
                        .map(code => {
                            const department = departments.find(mod => mod.code == code)
                            return department ? { code: department?.code, name_zh: department?.name_zh, name_en: department?.name_en } : undefined
                        })
                        .filter(mod => !!mod) ?? []
                }
                return Object.assign({}, emptyFilters, params)
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

    const searchQuery = (filters: RefineControlFormTypes, index: number = 0) => {
        console.log("current filters", filters);
        scrollRef.current?.scrollTo(0, 0);
        (async () => {
            setLoading(true);
            //Query for courses
            try {
                let temp = supabase
                    .from('courses')
                    .select('*', { count: 'exact' })
                if (filters.textSearch) {
                    temp = temp
                        .textSearch('multilang_search', `'${filters.textSearch.split(' ').join("' & '")}'`)
                }
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
                        .textSearch(`備註`, `'X-Class'`)
                if (filters.firstSpecialization || filters.secondSpecialization) {
                    temp = temp
                        .or(`first_specialization.cs.{"${filters.firstSpecialization ?? ""}"},second_specialization.cs.{"${filters.secondSpecialization ?? ""}"}`)
                }
                let { data: courses, error, count } = await temp.order('raw_id', { ascending: true }).range(index, index + 29)
                // move scroll to top
                setTotalCount(count ?? 0)
                if (error) console.error(error);
                else {
                    console.log(courses)
                    setCourses(courses!);
                    setHeadIndex(index);
                }
            }
            catch (e) {
                console.error(e);
            }
            setLoading(false);
        })()
    }
    const searchQueryFunc = useDebouncedCallback(searchQuery, 1000);

    const handleClear = () => {
        reset(emptyFilters)
    }

    //Trigger Search When Filters Change
    useEffect(() => {
        searchQueryFunc(filters);
        //Save filters to URL
        //But we have to handle geTarget and department differently, special cases where have nested objects
        //change them to string
        router.replace('?' + queryString.stringify({
            ...filters,
            department: filters.department.map(mod => mod.code),
        }, { arrayFormat: 'index' }))

    }, [JSON.stringify(filters)])


    return (
        <div className="grid grid-cols-1 md:grid-cols-[auto_320px] w-full h-full overflow-hidden">
            <div className="flex flex-col w-full h-full overflow-hidden space-y-5 px-2 pt-2">
                <InputControl
                    control={control}
                    name="textSearch"
                    placeholder={dict.course.list.search_placeholder}
                    variant="soft"
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
                <div className="flex flex-col w-full h-full overflow-auto space-y-5 pb-8 scroll-smooth" ref={scrollRef}>
                    <div className="flex flex-row justify-between px-3 py-1 border-b">
                        <h6 className="text-gray-600">{dict.course.list.courses}</h6>
                        <h6 className="text-gray-600">{dict.course.list.found}: {totalCount} {dict.course.list.courses}</h6>
                    </div>
                    {loading && <div className="w-full"><LinearProgress /> </div>}
                    {courses.map((course, index) => (
                        <CourseListItem key={index} course={course} />
                    ))}
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
            {!isMobile && <RefineControls control={control} onClear={handleClear} />}
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
                <RefineControls control={control} onClear={handleClear}/>
            </Drawer>}
        </div>

    )
}

export default CoursePage;