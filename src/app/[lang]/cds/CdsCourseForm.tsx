'use client';;
import Timetable from '@/components/Timetable/Timetable';
import { FC, Fragment, useState, useRef, useEffect, useMemo, useTransition } from 'react';
import {createTimetableFromCourses, colorMapFromCourses} from '@/helpers/timetable';
import { timetableColors } from "@/const/timetableColors";
import { Accordion, Button, ButtonGroup, CircularProgress, DialogContent, DialogTitle, Divider, Drawer, IconButton, ModalClose, Sheet, FormControl, FormLabel, AccordionDetails, AccordionSummary, Stack, Alert, Chip, Tooltip, Typography, Switch, Dropdown, MenuButton, Menu, MenuItem, Badge, ModalDialog, DialogActions } from '@mui/joy';
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
    LogOut,
    Info,
} from 'lucide-react';
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
import supabase, { CourseDefinition, CourseSyllabusView, CdsTermDefinition } from '@/config/supabase';
import { signOut, useSession } from 'next-auth/react';
import { saveUserSelections, submitUserSelections } from '@/lib/cds_actions';
import { Department, MinimalCourse } from '@/types/courses';
import { hasConflictingTimeslots, hasSameCourse } from '@/helpers/courses';
import { useModal } from '@/hooks/contexts/useModal';
import {TimeFilterType} from '@/components/FormComponents/TimeslotSelectorControl';
import Link from 'next/link';
import {renderTimetableSlot} from '@/helpers/timetable_course';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';

type CdsCoursesFormFields = {
    textSearch: string;
    level: number[];
    language: string[];
    department: Department[];
    timeslots: string[];
    timeFilter: TimeFilterType;
}

const CdsCoursesForm: FC<{
    termObj: CdsTermDefinition;
    initialSubmission: { selection: CourseDefinition[] };
}> = ({ termObj, initialSubmission }) => {
    const [selectedCourses, setSelectedCourses] = useState<CourseDefinition[]>(initialSubmission.selection);
    const [open, setOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchCourses, setSearchCourses] = useState<CourseSyllabusView[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [headIndex, setHeadIndex] = useState<number>(0);
    const [showTimetable, setShowTimetable] = useState(true);
    const [displayToggles, setDisplayToggles] = useState<{ [key: string]: boolean }>({});
    const scrollRef = useRef<HTMLDivElement>(null);

    const session = useSession();
    const { language } = useSettings();
    const { currentColors } = useUserTimetable();

    const emptyFilters: CdsCoursesFormFields = {
        textSearch: "",
        level: [1, 2, 3, 4],
        language: [],
        department: [
            { code: 'EECS', name_en: 'Interdisplinary Program of College of Electrical Engineering and Computer Science', name_zh: '電機資訊學院學士班' },
            { code: 'CS' , name_en: 'Department of Computer Science', name_zh: '資訊工程學系' },
            { code: 'EE', name_en: 'Department of Electrical Engineering', name_zh: '電機工程學系'}
        ],
        timeslots: [],
        timeFilter: TimeFilterType.Within
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
            let temp = supabase.rpc('search_courses_with_syllabus', {
                keyword: filters.textSearch,
            }, { count: 'exact' })
                .eq('semester', termObj.ref_sem)
            if (filters.level.length)
                temp = temp
                    .or(filters.level.map(level => `and(course.gte.${level}000,course.lte.${level}999)`).join(','))
            if (filters.language.length)
                temp = temp
                    .or(filters.language.map(lang => `language.eq.${lang}`).join(','))
            if (filters.department.length)
                temp = temp
                    .in('department', filters.department.map(({ code }) => code))
            if (filters.timeslots.length) {
                if(filters.timeFilter == TimeFilterType.Within)
                    temp = temp
                        .containedBy('time_slots', filters.timeslots)
                else if(filters.timeFilter == TimeFilterType.Includes)
                    temp = temp
                        .overlaps('time_slots', filters.timeslots)
                temp = temp
                    .not('time_slots', 'eq', '{}')
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
                setSearchCourses(courses as unknown as CourseSyllabusView[]);
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

    const colorMap = colorMapFromCourses(selectedCourses.map(c => c.raw_id), currentColors);
    const timetableData = useMemo(() => createTimetableFromCourses(selectedCourses as MinimalCourse[], colorMap), [selectedCourses, colorMap]);

    const timeConflicts = useMemo(() => hasConflictingTimeslots(selectedCourses as MinimalCourse[]), [selectedCourses]);
    const duplicates = useMemo(() => hasSameCourse(selectedCourses as MinimalCourse[]), [selectedCourses]);
    const MAX_COURSES = 5;
    const exceedesMaxCourses = useMemo(() => selectedCourses.length > MAX_COURSES, [selectedCourses]);
    
    const hasErrors = useMemo(() => {
        return timeConflicts.length > 0 || duplicates.length > 0 || exceedesMaxCourses;
    }
    , [timeConflicts, duplicates, exceedesMaxCourses]);

    const totalCredits = useMemo(() => {
        return selectedCourses.reduce((acc, cur) => acc + (cur.credits || 0), 0);
    }, [selectedCourses]);

    const [openModal, closeModal] = useModal();

    const [isSaving, startSaveTransition] = useTransition();

    const handleSaveSelection = async () => {
        startSaveTransition(() => saveUserSelections(termObj.term, selectedCourses.map(course => course.raw_id)));
    }
    const saveSelectionDebounced = useDebouncedCallback(handleSaveSelection, 2000);
    
    const [isSubmitting, startSubmitTransition] = useTransition();
    const handleUserSubmit = async () => {
        openModal({
            children: <ModalDialog variant="outlined" role="alertdialog">
            <DialogTitle>
              <AlertTriangle />
              提交確認
            </DialogTitle>
            <Divider />
            <DialogContent>
              確定要提交選課意願嗎？提交後將無法再修改。
            </DialogContent>
            <DialogActions>
              <Button variant="solid" color="success" onClick={() => {
                    startSubmitTransition(() => submitUserSelections(termObj.term, selectedCourses.map(course => course.raw_id)));
                    closeModal();
              }}>
                提交
              </Button>
              <Button variant="plain" color="neutral" onClick={closeModal}>
                取消
              </Button>
            </DialogActions>
          </ModalDialog>
        })
    }

    const addCourse = async (course: CourseDefinition) => {
        setSelectedCourses([...selectedCourses, course]);
        saveSelectionDebounced();
    }

    const deleteCourse = async (course: CourseDefinition) => {
        setSelectedCourses(selectedCourses.filter(c => c.raw_id != course.raw_id));
        saveSelectionDebounced();
    }

    const hasCourse = (course: CourseDefinition) => {
        return selectedCourses.find(c => c.raw_id == course.raw_id) != undefined;
    }

    const handleFilterPressed = () => {
        setShowFilters(!showFilters)
        scrollRef.current?.scrollTo(0, 0);
    }

    const renderDrawer = () => {
        return <Drawer
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
                                        label={"修習年級"}
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
                                        <Link href={`/${language}/courses/${course.raw_id}`}>
                                            <h1 className="font-semibold text-lg text-[#AF7BE4]">{course.department} {course.course}-{course.class} {course.name_zh} - {(course.teacher_zh ?? []).join(',')}</h1>
                                        </Link>
                                        <h3 className="text-sm text-gray-800 dark:text-gray-300 mt-0 break-words">{course.name_en}</h3>
                                    </div>
                                    <p className='text-sm'>{course.brief}</p>
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
    }

    return <div className='w-full'>
        <div className='flex flex-col md:flex-row justify-between mb-4'>
            <h1 className='font-bold text-3xl mb-3'>選課規劃調查 <Chip variant="outlined" color='primary'>{termObj.term} 學期</Chip></h1>
            <div>
                <div className='flex flex-row gap-2 justify-end items-center'>
                    {isSaving && <span className='text-gray-400 dark:text-neutral-600 text-sm'>Saving...</span>}
                    <Button 
                        color='neutral' 
                        variant='outlined' 
                        startDecorator={<Save />} 
                        onClick={handleSaveSelection} 
                        loading={isSaving}
                    >暫存</Button>
                    <Button 
                        color='success' 
                        variant='outlined' 
                        startDecorator={<Send />} 
                        disabled={hasErrors} 
                        onClick={handleUserSubmit} 
                        loading={isSubmitting}
                    >提交</Button>
                    <IconButton color='danger' onClick={() => signOut()} >
                        <LogOut/>
                    </IconButton>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-sm">
            {showTimetable && <Timetable timetableData={timetableData} renderTimetableSlot={renderTimetableSlot} />}
            <div className="flex flex-col gap-4 px-4">
                <Alert color='success' startDecorator={<Info />}>
                    <div className='flex flex-col'>
                        <h3 className='text-xl font-bold'>調查規則</h3>
                        <ul className='list-disc list-inside'>
                            <li>調查結果僅供參考，不代表實際開課情況。</li>
                            <li>提交時最多能提交 5門課。請把你最想選的課留下來交</li>
                            <li>繳交後，您的姓名，學號，電郵將提交至系統内，並只會提供系辦人員參考</li>
                        </ul>
                    </div>
                </Alert>
                <Alert color='warning' startDecorator={<AlertTriangle />}>
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
                {exceedesMaxCourses && <Alert color='danger' startDecorator={<AlertTriangle />}>
                    最多只能選 {MAX_COURSES} 門課
                </Alert>}
                {selectedCourses.map((course, index) => (
                    <div key={index} className="flex flex-row gap-4 items-center">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorMap[course.raw_id] }}></div>
                        <div className="flex flex-col flex-1">
                            <span className="text-sm">{course.department}{course.course}-{course.class} {course.name_zh} - {(course.teacher_zh ?? []).join(',')}</span>
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
                            {timeConflicts.find(ts => ts.course.raw_id == course.raw_id) && <Tooltip title="衝堂">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </Tooltip>}
                            {duplicates.includes(course.raw_id) && <Tooltip title="重複">
                                <Copy className="w-6 h-6 text-yellow-500" />
                            </Tooltip>}
                            {/* Credits */}
                            <div className="flex flex-row items-center space-x-1">
                                <span className="text-lg">{course.credits}</span>
                                <span className="text-xs text-gray-400">學分</span>
                            </div>
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
            {renderDrawer()}
        </div>
    </div>
}

export default CdsCoursesForm;