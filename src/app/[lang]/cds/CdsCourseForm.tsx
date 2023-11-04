'use client';
import Timetable from '@/components/Timetable/Timetable';
import { FC, Fragment, useState, useRef, useEffect, useMemo } from 'react';
import { scheduleTimeSlots } from '@/const/timetable';
import { CourseTimeslotData } from '@/types/timetable';
import { timetableColors } from '@/helpers/timetable';
import { Accordion, Button, ButtonGroup, CircularProgress, DialogContent, DialogTitle, Divider, Drawer, IconButton, ModalClose, Sheet, FormControl, FormLabel, AccordionDetails, AccordionSummary, Stack, Alert, Chip, Tooltip, Typography, Switch, Dropdown, MenuButton, Menu, MenuItem, Badge } from '@mui/joy';
import {
    EyeOff,
    Filter,
    Plus,
    Search,
    Trash,
    X,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    AlertTriangle,
    Save,
    Trash2,
    Copy,
    Settings,
    Send,
} from 'react-feather';
import { useForm } from 'react-hook-form';
import InputControl from '@/components/FormComponents/InputControl';
import MultiSelectControl from '@/components/FormComponents/MultiSelectControl';
import DepartmentControl from '@/components/FormComponents/DepartmentControl';
import TimeslotSelectorControl from '@/components/FormComponents/TimeslotSelectorControl';
import { arrayRange } from '@/helpers/array';
import { useDebouncedCallback } from 'use-debounce';
import { normalizeRoomName } from '@/const/venues';
import { useMediaQuery } from 'usehooks-ts';
import { useSettings } from '@/hooks/contexts/settings';
import supabase, { CdsCourseDefinition } from '@/config/supabase';
import { useSession } from 'next-auth/react';

const createTimetableFromCdsCourses = (data: CdsCourseDefinition[], theme = 'tsinghuarian') => {
    const newTimetableData: CourseTimeslotData[] = [];
    data!.forEach(course => {
        //get unique days first
        if (!course.times) {
            return;
        };
        course.times.forEach((time_str, index) => {
            const timeslots = time_str.match(/.{1,2}/g)?.map(day => ({ day: day[0], time: day[1] }));
            const days = timeslots!.map(time => time.day).filter((day, index, self) => self.indexOf(day) === index);
            days.forEach(day => {
                const times = timeslots!.filter(time => time.day == day).map(time => scheduleTimeSlots.map(m => m.time).indexOf(time.time));
                //get the start and end time
                const startTime = Math.min(...times);
                const endTime = Math.max(...times);
                //get the color, mod the index by the length of the color array so that it loops
                const color = timetableColors[theme][data!.indexOf(course) % timetableColors[theme].length];
                //push to scheduleData
                newTimetableData.push({
                    //TODO: properly type the timetable to enable for multiple course types
                    // @ts-ignore
                    course: course,
                    venue: course.venues![index]!,
                    dayOfWeek: 'MTWRFS'.indexOf(day),
                    startTime: startTime,
                    endTime: endTime,
                    color: color
                });
            });
        });

    });
    return newTimetableData;
}

type CdsCoursesFormFields = {
    textSearch: string;
    level: number[];
    language: string[];
    department: Department[];
    timeslots: string[];
}

const CdsCoursesForm: FC<{
    initialSubmission: { preferences: CdsCourseDefinition[] };
}> = ({ initialSubmission }) => {
    const [selectedCourses, setSelectedCourses] = useState<CdsCourseDefinition[]>(initialSubmission.preferences);
    const [open, setOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchCourses, setSearchCourses] = useState<CdsCourseDefinition[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [headIndex, setHeadIndex] = useState<number>(0);
    const [showTimetable, setShowTimetable] = useState(true);
    const { timetableTheme } = useSettings();
    const [displayToggles, setDisplayToggles] = useState<{ [key: string]: boolean }>({});
    const scrollRef = useRef<HTMLDivElement>(null);

    const session = useSession();
    console.log(session)

    const emptyFilters = {
        textSearch: "",
        level: [1, 2, 3, 4],
        language: [],
        department: [],
        timeslots: []
    }
    const { control, watch, setValue, reset, formState: { isDirty } } = useForm<CdsCoursesFormFields>({
        defaultValues: emptyFilters
    });

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

    const searchQuery = async (filters: CdsCoursesFormFields, index: number = 0) => {
        console.log("current filters", filters);
        scrollRef.current?.scrollTo(0, 0);
        setLoading(true);
        //Query for courses
        try {
            let temp = supabase.rpc('search_cds_courses', {
                keyword: filters.textSearch,
            }, { count: 'exact' })
                .eq('semester', '11120')
            if (filters.level.length)
                temp = temp
                    .or(filters.level.map(level => `and(course.gte.${level}000,course.lte.${level}999)`).join(','))
            if (filters.language.length)
                temp = temp
                    .or(filters.language.map(lang => `language.eq.${lang}`).join(','))
            if (filters.department.length)
                temp = temp
                    .in('department', filters.department.map(({ code }) => code))
            // if (filters.className)
            //     temp = temp
            //         .or(`compulsory_for.cs.{"${filters.className}"},elective_for.cs.{"${filters.className}"}`);
            // if (filters.others.includes('xclass'))
            //     temp = temp
            //         .contains('tags', ['X-Class'])
            // if (filters.others.includes('16_weeks')) 
            //     temp = temp
            //         .contains('tags', ['16周'])
            // if (filters.others.includes('extra_selection'))
            //     temp = temp
            //         .not('tags', 'cs', '{"不可加簽"}')
            // if (filters.firstSpecialization || filters.secondSpecialization) {
            //     temp = temp
            //         .or(`first_specialization.cs.{"${filters.firstSpecialization ?? ""}"},second_specialization.cs.{"${filters.secondSpecialization ?? ""}"}`)
            // }
            // if (filters.venues.length) {
            //     temp = temp
            //         .containedBy('venues', filters.venues)
            // }
            // if (filters.disciplines.length) {
            //     temp = temp
            //         .containedBy('cross_discipline', filters.disciplines)
            // }
            // if (filters.gecDimensions.length) {
            //     temp = temp
            //         .in('ge_type', filters.gecDimensions) //TODO: should consider changing name to gec_type
            // }
            // if (filters.geTarget.length) {
            //     temp = temp
            //         .in('ge_target', filters.geTarget)
            // }
            if (filters.timeslots.length) {
                console.log(filters.timeslots)
                temp = temp
                    .containedBy('cds_time_slots', filters.timeslots)
                // .overlaps('time_slots', filters.timeslots) //Overlap works if only one of their timeslots is selected
            }

            let { data: courses, error, count } = await temp.order('raw_id', { ascending: true }).range(index, index + 29)
            // move scroll to top
            setTotalCount(count ?? 0)
            if (error) {
                console.error(error);
                setSearchCourses([]);
                setHeadIndex(0);
            }
            else {
                console.log(courses)
                setSearchCourses(courses as CdsCourseDefinition[]);
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

    }, [JSON.stringify(filters)])

    const timetableData = useMemo(() => createTimetableFromCdsCourses(selectedCourses, timetableTheme), [selectedCourses]);

    //check if there are conflicting timeslots
    const hasConflictingTimeslots = useMemo(() => timetableData.filter((timeslot, index, self) => {
        const otherTimeslots = self.filter((ts, i) => i != index);
        return otherTimeslots.find(ts => ts.dayOfWeek == timeslot.dayOfWeek && ts.startTime <= timeslot.endTime && ts.endTime >= timeslot.startTime) != undefined;
    }), [timetableData]);

    //check if there is same dept same course but different class, return course codes
    const hasSameCourse = useMemo(() => {
        const sameCourse = selectedCourses.filter((course, index, self) => {
            const otherCourses = self.filter((c, i) => i != index);
            return otherCourses.find(c => c.department == course.department && c.course == course.course) != undefined;
        });
        return sameCourse.map(course => course.raw_id);
    }, [selectedCourses]);

    const totalCredits = useMemo(() => {
        return selectedCourses.reduce((acc, cur) => acc + (cur.credits || 0), 0);
    }, [selectedCourses]);

    const addCourse = async (course: CdsCourseDefinition) => {
        setSelectedCourses([...selectedCourses, course]);
    }

    const deleteCourse = async (course: CdsCourseDefinition) => {
        setSelectedCourses(selectedCourses.filter(c => c != course));
    }

    const hasCourse = (course: CdsCourseDefinition) => {
        return selectedCourses.find(c => c.raw_id == course.raw_id) != undefined;
    }

    const handleFilterPressed = () => {
        setShowFilters(!showFilters)
        scrollRef.current?.scrollTo(0, 0);
    }

    return <div className='w-full'>
        <div className='flex flex-col md:flex-row justify-between mb-4'>
            <h1 className='font-bold text-3xl mb-3'>選課意願調查 <Chip variant="outlined" color='primary'>112-2 學期</Chip></h1>
            <div>
                <div className='flex flex-row gap-2 justify-end'>
                    <Button color='neutral' variant='outlined' startDecorator={<Save />}>Save</Button>
                    <Button color='success' startDecorator={<Send />}>Submit</Button>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-sm">
            {showTimetable && <Timetable timetableData={timetableData} />}
            <div className="flex flex-col gap-4 px-4 -mt-28 md:-mt-0">
                <Alert color='danger' startDecorator={<AlertTriangle />}>
                    提供篩選的課程都是上學年 （111-2學期）的課程，除了課號&課名之外，其他資訊可能會有變動。
                </Alert>
                <ButtonGroup buttonFlex={1}>
                    <Button startDecorator={<Plus />} variant="outlined" onClick={e => setOpen(true)}>Add Course</Button>
                    <Dropdown>
                        <MenuButton
                            slots={{ root: IconButton }}
                            slotProps={{ root: { variant: 'outlined', color: 'neutral' } }}
                        >
                            <Settings className='w-4 h-4' />
                        </MenuButton>
                        <Menu>
                            <MenuItem>
                                <Typography component="label" endDecorator={<Switch sx={{ ml: 1 }} checked={showTimetable} onChange={(e) => setShowTimetable(e.target.checked)} />}>
                                    時間表
                                </Typography>
                            </MenuItem>
                        </Menu>
                    </Dropdown>
                </ButtonGroup>
                <div className='grid grid-cols-2 text-center'>
                    <div className='space-x-2'>
                        <span className='text-2xl'>{selectedCourses.length}</span>
                        <span className='text-gray-600'>課程</span>
                    </div>
                    <div className='space-x-2'>
                        <span className='text-2xl'>{totalCredits}</span>
                        <span className='text-gray-600'>總學分</span>
                    </div>
                </div>
                <Divider />
                {selectedCourses.map((course, index) => (
                    <div key={index} className="flex flex-row gap-4 items-center">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: timetableColors[timetableTheme][index % timetableColors[timetableTheme].length] }}></div>
                        <div className="flex flex-col flex-1">
                            <span className="text-sm">{course.name_zh}</span>
                            <span className="text-xs">{course.name_en}</span>
                            <div className="mt-1">
                                {course.venues?.map((venue, index) => {
                                    const time = course.times![index];
                                    return <div key={index} className="flex flex-row items-center space-x-2 font-mono text-gray-400">
                                        <span className="text-xs">{venue}</span>
                                        <span className="text-xs">{time}</span>
                                    </div>
                                }) || <span className="text-gray-400 text-xs">No Venue</span>}
                            </div>
                        </div>
                        <div className="flex flex-row space-x-2 items-center">
                            {hasConflictingTimeslots.find(ts => ts.course.raw_id == course.raw_id) && <Tooltip title="衝堂">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </Tooltip>}
                            {hasSameCourse.includes(course.raw_id) && <Tooltip title="重複">
                                <Copy className="w-6 h-6 text-yellow-500" />
                            </Tooltip>}

                            <ButtonGroup>
                                <IconButton onClick={() => deleteCourse(course)}>
                                    <Trash className="w-4 h-4" />
                                </IconButton>
                                <IconButton disabled>
                                    <EyeOff className="w-4 h-4" />
                                </IconButton>
                            </ButtonGroup>
                        </div>
                    </div>
                ))}
                {selectedCourses.length == 0 && (
                    <div className="flex flex-col items-center space-y-4">
                        <span className="text-lg font-semibold text-gray-400">{"No Courses Added (yet)"}</span>
                    </div>
                )}
            </div>
            <Drawer
                size="lg"
                variant="plain"
                open={open}
                onClose={() => setOpen(false)}
                anchor="right"
                slotProps={{
                    content: {
                        sx: {
                            width: 'min(35rem, 100%)',
                            bgcolor: 'transparent',
                            p: { md: 3, sm: 0 },
                            boxShadow: 'none',
                        },
                    },
                }}
            >
                <Sheet
                    sx={{
                        borderRadius: 'md',
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        height: '100%',
                        overflow: 'auto',
                    }}
                >
                    <DialogTitle>Courses</DialogTitle>
                    <ModalClose />
                    <Divider sx={{ mt: 'auto' }} />
                    <DialogContent sx={{ gap: 2, scrollBehavior: 'smooth' }} ref={scrollRef}>
                        <InputControl
                            control={control}
                            name="textSearch"
                            placeholder={'Seach for a course...'}
                            variant="soft"
                            size="lg"
                            sx={{ position: 'sticky', top: 0, zIndex: 10 }}
                            startDecorator={
                                loading ? <CircularProgress size="sm" /> : <Search />
                            }
                            endDecorator={
                                <Fragment>
                                    {filters.textSearch.length > 0 && <IconButton onClick={() => setValue('textSearch', "")}>
                                        <X className="text-gray-400 p-1" />
                                    </IconButton>}
                                    <Divider orientation="vertical" />
                                    <IconButton onClick={handleFilterPressed} aria-pressed={showFilters ? 'true' : 'false'}>
                                        <Badge invisible={!isDirty}>
                                            <Filter className="text-gray-400 p-1" />
                                        </Badge>
                                    </IconButton>
                                </Fragment>
                            }
                        />
                        <Accordion expanded={showFilters}>
                            <AccordionDetails>
                                <div className='flex flex-row flex-wrap'>
                                    <div className='flex flex-col flex-1 gap-4 mb-4'>
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
                                            ]}
                                            label={"修習年紀"}
                                        />
                                        <MultiSelectControl
                                            control={control}
                                            name="language"
                                            options={[
                                                { value: '英', label: 'English' },
                                                { value: '中', label: '國語' },
                                            ]}
                                            label="授課語言"
                                        />
                                        <FormControl>
                                            <FormLabel>開課院系</FormLabel>
                                            {/* @ts-ignore */}
                                            <DepartmentControl control={control} />
                                        </FormControl>
                                    </div>
                                    <Accordion sx={{ flex: 1, minWidth: '200px', marginBottom: '1rem' }} expanded={isMobile ? undefined : true}>
                                        <AccordionSummary slotProps={{
                                            button: {
                                                sx: { padding: '0.5rem' }
                                            }
                                        }}>時間</AccordionSummary>
                                        <AccordionDetails>
                                            {/* @ts-ignore */}
                                            <TimeslotSelectorControl control={control} />
                                        </AccordionDetails>
                                    </Accordion>
                                    {/* <Accordion>
                                        <AccordionSummary>Specialization</AccordionSummary>
                                        <AccordionDetails>
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
                                        </AccordionDetails>
                                    </Accordion> */}
                                    <Button
                                        variant="outlined"
                                        color="danger"
                                        startDecorator={<Trash2 />}
                                        disabled={!isDirty}
                                        onClick={handleClear}
                                    >Clear Filters</Button>
                                    <Divider />
                                </div>
                            </AccordionDetails>
                        </Accordion>
                        <div className="flex flex-row justify-between items-center">
                            <p>結果</p>
                            <p>{totalCount} 課</p>
                        </div>
                        <Divider />
                        <div className='flex flex-col space-y-6'>
                            {searchCourses.map((course, index) => (
                                <div className='flex flex-row' key={index}>
                                    <div className='flex-1 space-y-2'>
                                        <div className="mb-3 space-y-1">
                                            <h1 className="font-semibold text-lg text-fuchsia-800 dark:text-fuchsia-500">{course.department} {course.course}-{course.class} {course.name_zh} - {(course.teacher_zh ?? []).join(',')}</h1>
                                            <h3 className="text-sm text-gray-800 dark:text-gray-300 mt-0 break-words">{course.name_en}</h3>
                                        </div>
                                        <p className='text-sm'>{course.note}</p>
                                        <p>{course.credits} 學分</p>
                                        {course.venues ?
                                            course.venues.map((vn, i) => <p className='text-blue-600 dark:text-blue-400 font-mono'>{normalizeRoomName(vn)} <span className='text-black dark:text-white'>{course.times![i]}</span></p>) :
                                            <p>No Venues</p>
                                        }
                                        <div className='flex flex-row flex-wrap gap-1'>
                                            {(course.cross_discipline ?? []).map((discipline, index) => (
                                                <Chip variant="outlined">{discipline}</Chip>
                                            ))}
                                        </div>
                                    </div>
                                    {!hasCourse(course) ? <IconButton variant='soft' onClick={() => addCourse(course)}>
                                        <Plus className="w-4 h-4" />
                                    </IconButton> :
                                        <IconButton variant='soft' onClick={() => deleteCourse(course)}>
                                            <Trash className="w-4 h-4" />
                                        </IconButton>}
                                </div>
                            ))}
                            {searchCourses.length == 0 && (
                                <div className="flex flex-col items-center space-y-4">
                                    <span className="text-lg font-semibold text-gray-400">{"No Courses Found"}</span>
                                </div>
                            )}
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
                    </DialogContent>
                </Sheet>
            </Drawer>
        </div>
    </div>
}

export default CdsCoursesForm;