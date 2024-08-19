"use client";
import Timetable from "@/components/Timetable/Timetable";
import {
  FC,
  Fragment,
  useState,
  useRef,
  useEffect,
  useMemo,
  useTransition,
} from "react";
import {
  createTimetableFromCourses,
  colorMapFromCourses,
} from "@/helpers/timetable";
import {
  Plus,
  Trash,
  AlertTriangle,
  Save,
  Copy,
  Settings,
  Send,
  LogOut,
  Info,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { arrayRange } from "@/helpers/array";
import { useDebouncedCallback } from "use-debounce";
import { useMediaQuery } from "usehooks-ts";
import { useSettings } from "@/hooks/contexts/settings";
import supabase, {
  CourseDefinition,
  CourseSyllabusView,
  CdsTermDefinition,
} from "@/config/supabase";
import { signOut, useSession } from "next-auth/react";
import { saveUserSelections, submitUserSelections } from "@/lib/cds_actions";
import { Department, MinimalCourse } from "@/types/courses";
import { hasConflictingTimeslots, hasSameCourse } from "@/helpers/courses";
import { renderTimetableSlot } from "@/helpers/timetable_course";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ButtonSpinner from "@/components/Animation/ButtonSpinner";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

type CdsCoursesFormFields = {
  textSearch: string;
  level: number[];
  language: string[];
  department: Department[];
  timeslots: string[];
  // timeFilter: TimeFilterType;
};

const CdsCoursesForm: FC<{
  termObj: CdsTermDefinition;
  initialSubmission: { selection: CourseDefinition[] };
}> = ({ termObj, initialSubmission }) => {
  const [selectedCourses, setSelectedCourses] = useState<CourseDefinition[]>(
    initialSubmission.selection,
  );
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchCourses, setSearchCourses] = useState<CourseSyllabusView[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [headIndex, setHeadIndex] = useState<number>(0);
  const [showTimetable, setShowTimetable] = useState(true);
  const [displayToggles, setDisplayToggles] = useState<{
    [key: string]: boolean;
  }>({});
  const [semester, setSemester] = useState(termObj.ref_sem);
  const scrollRef = useRef<HTMLDivElement>(null);

  const session = useSession();
  const { language } = useSettings();
  const { currentColors } = useUserTimetable();

  // const { control, watch, setValue, reset, formState: { isDirty } } = useForm<CdsCoursesFormFields>({
  //     defaultValues: emptyFilters
  // });

  const isMobile = useMediaQuery("(max-width: 768px)");

  //Pagination
  const paginationRange = (current: number, total: number, max: number = 7) => {
    if (total <= max) return arrayRange(1, total);
    let start = Math.max(1, current - Math.floor(max / 2));
    let end = Math.min(total, start + max - 1);
    if (end - start + 1 < max) {
      start = Math.max(1, end - max + 1);
    }
    return arrayRange(start, end);
  };

  const currentPage = headIndex / 30 + 1;
  const totalPage = Math.ceil(totalCount / 30);

  const PAGNIATION_MAX = 7;

  // const filters = watch()

  // const renderPagination = () => {
  //     const range = paginationRange(currentPage, totalPage, PAGNIATION_MAX);

  //     return range.map((page, index) => {
  //         return (
  //             <Button
  //                 key={index}
  //                 variant={currentPage == page ? "outline": "ghost"}
  //                 onClick={() => searchQueryFunc(filters, (page - 1) * 30)}
  //             >
  //                 {page}
  //             </Button>)
  //     })
  // }

  const searchQuery = async (
    filters: CdsCoursesFormFields,
    index: number = 0,
  ) => {
    console.log("current filters", filters);
    // scrollRef.current?.scrollTo(0, 0);
    // setLoading(true);
    // //Query for courses
    // try {
    //     let temp = supabase.rpc('search_courses_with_syllabus', {
    //         keyword: filters.textSearch,
    //     }, { count: 'exact' })
    //         .eq('semester', semester)
    //     if (filters.level.length)
    //         temp = temp
    //             .or(filters.level.map(level => `and(course.gte.${level}000,course.lte.${level}999)`).join(','))
    //     if (filters.language.length)
    //         temp = temp
    //             .or(filters.language.map(lang => `language.eq.${lang}`).join(','))
    //     if (filters.department.length)
    //         temp = temp
    //             .in('department', filters.department.map(({ code }) => code))

    //     let { data: courses, error, count } = await temp.order('raw_id', { ascending: true }).range(index, index + 29)
    //     // move scroll to top
    //     setTotalCount(count ?? 0)
    //     if (error) {
    //         console.error(error);
    //         setSearchCourses([]);
    //         setHeadIndex(0);
    //     }
    //     else {
    //         setSearchCourses(courses as unknown as CourseSyllabusView[]);
    //         setHeadIndex(index);
    //     }
    // }
    // catch (e) {
    //     console.error(e);
    // }
    // setLoading(false);
  };

  const searchQueryFunc = useDebouncedCallback(searchQuery, 1000);

  const handleClear = () => {
    // reset(emptyFilters)
  };

  //Trigger Search When Filters Change
  // useEffect(() => {
  //     setLoading(true);
  //     searchQueryFunc(filters);

  // }, [JSON.stringify(filters), semester])

  const semesterSelectedCourses = selectedCourses.filter(
    (m) => m.semester == semester,
  );

  const colorMap = colorMapFromCourses(
    semesterSelectedCourses.map((c) => c.raw_id),
    currentColors,
  );
  const timetableData = useMemo(
    () =>
      createTimetableFromCourses(
        semesterSelectedCourses as MinimalCourse[],
        colorMap,
      ),
    [semesterSelectedCourses, colorMap],
  );

  const timeConflicts = useMemo(
    () => hasConflictingTimeslots(semesterSelectedCourses as MinimalCourse[]),
    [semesterSelectedCourses],
  );
  const duplicates = useMemo(
    () => hasSameCourse(semesterSelectedCourses as MinimalCourse[]),
    [semesterSelectedCourses],
  );
  const MAX_COURSES = 5;
  const exceedesMaxCourses = useMemo(
    () => semesterSelectedCourses.length > MAX_COURSES,
    [semesterSelectedCourses],
  );

  const hasErrors = useMemo(() => {
    const conflict1 = hasConflictingTimeslots(
      selectedCourses.filter(
        (m) => m.semester == termObj.ref_sem,
      ) as MinimalCourse[],
    );
    const conflict2 = hasConflictingTimeslots(
      selectedCourses.filter(
        (m) => m.semester == termObj.ref_sem_2,
      ) as MinimalCourse[],
    );
    const duplicates1 = hasSameCourse(
      selectedCourses.filter(
        (m) => m.semester == termObj.ref_sem,
      ) as MinimalCourse[],
    );
    const duplicates2 = hasSameCourse(
      selectedCourses.filter(
        (m) => m.semester == termObj.ref_sem_2,
      ) as MinimalCourse[],
    );
    const exceedesMaxCourses1 =
      selectedCourses.filter((m) => m.semester == termObj.ref_sem).length >
      MAX_COURSES;
    const exceedesMaxCourses2 =
      selectedCourses.filter((m) => m.semester == termObj.ref_sem_2).length >
      MAX_COURSES;
    return (
      conflict1.length > 0 ||
      conflict2.length > 0 ||
      duplicates1.length > 0 ||
      duplicates2.length > 0 ||
      exceedesMaxCourses1 ||
      exceedesMaxCourses2
    );
  }, [timeConflicts, duplicates, exceedesMaxCourses]);

  const totalCredits = useMemo(() => {
    return semesterSelectedCourses.reduce(
      (acc, cur) => acc + (cur.credits || 0),
      0,
    );
  }, [semesterSelectedCourses]);

  const [isSaving, startSaveTransition] = useTransition();

  const handleSaveSelection = async () => {
    startSaveTransition(() =>
      saveUserSelections(
        termObj.term,
        selectedCourses.map((course) => course.raw_id),
      ),
    );
  };
  const saveSelectionDebounced = useDebouncedCallback(
    handleSaveSelection,
    2000,
  );

  const [isSubmitting, startSubmitTransition] = useTransition();
  const addCourse = async (course: CourseDefinition) => {
    setSelectedCourses([...selectedCourses, course]);
    saveSelectionDebounced();
  };

  const deleteCourse = async (course: CourseDefinition) => {
    setSelectedCourses(
      selectedCourses.filter((c) => c.raw_id != course.raw_id),
    );
    saveSelectionDebounced();
  };

  const hasCourse = (course: CourseDefinition) => {
    return selectedCourses.find((c) => c.raw_id == course.raw_id) != undefined;
  };

  const handleFilterPressed = () => {
    setShowFilters(!showFilters);
    scrollRef.current?.scrollTo(0, 0);
  };

  // const renderDrawer = () => {
  //     return <Drawer
  //         size="lg"
  //         variant="plain"
  //         open={open}
  //         onClose={() => setOpen(false)}
  //         anchor="right"
  //         slotProps={{
  //             content: {
  //                 sx: {
  //                     width: 'min(35rem, 100%)',
  //                     bgcolor: 'transparent',
  //                     p: { md: 3, sm: 0 },
  //                     boxShadow: 'none',
  //                 },
  //             },
  //         }}
  //     >
  //         <Sheet
  //             sx={{
  //                 borderRadius: 'md',
  //                 p: 2,
  //                 display: 'flex',
  //                 flexDirection: 'column',
  //                 gap: 2,
  //                 height: '100%',
  //                 overflow: 'auto',
  //             }}
  //         >
  //             <DialogTitle>Courses</DialogTitle>
  //             <ModalClose />
  //             <Separator />
  //             <DialogContent sx={{ gap: 2, scrollBehavior: 'smooth' }} ref={scrollRef}>
  //                 <InputControl
  //                     control={control}
  //                     name="textSearch"
  //                     placeholder={'Seach for a course...'}
  //                     variant="soft"
  //                     size="lg"
  //                     sx={{ position: 'sticky', top: 0, zIndex: 10 }}
  //                     startDecorator={
  //                         loading ? <CircularProgress size="sm" /> : <Search />
  //                     }
  //                     endDecorator={
  //                         <Fragment>
  //                             {filters.textSearch.length > 0 && <Button size={'icon'} variant="ghost" onClick={() => setValue('textSearch', "")}>
  //                                 <X className="text-gray-400 p-1" />
  //                             </Button>}
  //                             <Separator orientation="vertical" />
  //                             <Button size="icon" variant="ghost" onClick={handleFilterPressed} aria-pressed={showFilters ? 'true' : 'false'}>
  //                                 <MUIBadge invisible={!isDirty}>
  //                                     <Filter className="text-gray-400 p-1" />
  //                                 </MUIBadge>
  //                             </Button>
  //                         </Fragment>
  //                     }
  //                 />
  //                 <Accordion expanded={showFilters}>
  //                     <AccordionDetails>
  //                         <div className='flex flex-row flex-wrap'>
  //                             <div className='flex flex-col flex-1 gap-4 mb-4'>
  //                                 <MultiSelectControl
  //                                     control={control}
  //                                     name="level"
  //                                     options={[
  //                                         { value: 1, label: '1xxx' },
  //                                         { value: 2, label: '2xxx' },
  //                                         { value: 3, label: '3xxx' },
  //                                         { value: 4, label: '4xxx' },
  //                                         { value: 5, label: '5xxx' },
  //                                         { value: 6, label: '6xxx' },
  //                                     ]}
  //                                     label={"修習年級"}
  //                                 />
  //                                 <MultiSelectControl
  //                                     control={control}
  //                                     name="language"
  //                                     options={[
  //                                         { value: '英', label: 'English' },
  //                                         { value: '中', label: '國語' },
  //                                     ]}
  //                                     label="授課語言"
  //                                 />
  //                                 <FormControl>
  //                                     <FormLabel>開課院系</FormLabel>
  //                                     {/* @ts-ignore */}
  //                                     <DepartmentControl control={control} />
  //                                 </FormControl>
  //                             </div>
  //                             <Accordion sx={{ flex: 1, minWidth: '200px', marginBottom: '1rem' }} expanded={isMobile ? undefined : true}>
  //                                 <AccordionSummary slotProps={{
  //                                     button: {
  //                                         sx: { padding: '0.5rem' }
  //                                     }
  //                                 }}>時間</AccordionSummary>
  //                                 <AccordionDetails>
  //                                     {/* @ts-ignore */}
  //                                     <TimeslotSelectorControl control={control} />
  //                                 </AccordionDetails>
  //                             </Accordion>
  //                             <Button
  //                                 variant="outline"
  //                                 disabled={!isDirty}
  //                                 onClick={handleClear}
  //                             ><Trash2 />Clear Filters</Button>
  //                             <Separator />
  //                         </div>
  //                     </AccordionDetails>
  //                 </Accordion>
  //                 <div className="flex flex-row justify-between items-center">
  //                     <p>結果</p>
  //                     <p>{totalCount} 課</p>
  //                 </div>
  //                 <Separator />
  //                 <div className='flex flex-col space-y-6'>
  //                     {searchCourses.map((course, index) => (
  //                         <div className='flex flex-row items-center' key={index}>
  //                             <div className='flex-1 space-y-2'>
  //                                 <div className="mb-3 space-y-1">
  //                                     <Link href={`/${language}/courses/${course.raw_id}`}>
  //                                         <h1 className="font-semibold text-lg text-[#AF7BE4]">{course.department} {course.course}-{course.class} {course.name_zh} - {(course.teacher_zh ?? []).join(',')}</h1>
  //                                     </Link>
  //                                     <h3 className="text-sm text-gray-800 dark:text-gray-300 mt-0 break-words">{course.name_en}</h3>
  //                                 </div>
  //                                 <p className='text-sm'>{course.brief}</p>
  //                                 <p className='text-sm'>{course.note}</p>
  //                                 <p>{course.credits} 學分</p>
  //                                 {course.venues ?
  //                                     course.venues.map((vn, i) => <p className='text-blue-600 dark:text-blue-400 font-mono'>{normalizeRoomName(vn)} <span className='text-black dark:text-white'>{course.times![i]}</span></p>) :
  //                                     <p>No Venues</p>
  //                                 }
  //                                 <div className='flex flex-row flex-wrap gap-1'>
  //                                     {(course.cross_discipline ?? []).map((discipline, index) => (
  //                                         <Button variant="outline">{discipline}</Button>
  //                                     ))}
  //                                 </div>
  //                             </div>
  //                             {!hasCourse(course) ? <Button size="icon" variant='ghost' className='h-full' onClick={() => addCourse(course)}>
  //                                 <Plus className="w-4 h-4" />
  //                             </Button> :
  //                                 <Button size="icon" variant='destructive' className='h-full' onClick={() => deleteCourse(course)}>
  //                                     <Trash className="w-4 h-4" />
  //                                 </Button>}
  //                         </div>
  //                     ))}
  //                     {searchCourses.length == 0 && (
  //                         <div className="flex flex-col items-center space-y-4">
  //                             <span className="text-lg font-semibold text-gray-400">{"No Courses Found"}</span>
  //                         </div>
  //                     )}
  //                 </div>
  //                 <Stack
  //                     direction="row"
  //                     justifyContent="center"
  //                 >
  //                     {currentPage != 1 && <Button size="icon" variant='ghost' onClick={() => searchQuery(filters, 0)}>
  //                         <ChevronsLeft />
  //                     </Button>}
  //                     {currentPage != 1 && <Button size="icon" variant='ghost' onClick={() => searchQuery(filters, headIndex - 30)}>
  //                         <ChevronLeft />
  //                     </Button>}
  //                     {renderPagination()}
  //                     {currentPage != totalPage && <Button size="icon" variant='ghost' onClick={() => searchQuery(filters, headIndex + 30)}>
  //                         <ChevronRight />
  //                     </Button>}
  //                     {currentPage != totalPage && <Button size="icon" variant='ghost' onClick={() => searchQuery(filters, (totalPage - 1) * 30)}>
  //                         <ChevronsRight />
  //                     </Button>}
  //                 </Stack>
  //             </DialogContent>
  //         </Sheet>
  //     </Drawer>
  // }

  return (
    <div className="w-full h-full">
      <div className="flex flex-col md:flex-row justify-between mb-4">
        <h1 className="font-bold text-3xl mb-3">
          選課規劃調查 <Badge variant="outline">{termObj.term}</Badge>
        </h1>
        <div>
          <div className="flex flex-row gap-2 justify-end items-center">
            {isSaving && (
              <span className="text-gray-400 dark:text-neutral-600 text-sm">
                Saving...
              </span>
            )}
            <Button variant="outline" onClick={handleSaveSelection}>
              {isSaving ? (
                <ButtonSpinner />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  暫存
                </>
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={hasErrors}
                >
                  {isSubmitting ? (
                    <ButtonSpinner />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      提交
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <AlertTriangle /> 提交確認
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    確定要提交選課意願嗎？提交後將無法再修改。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      variant="default"
                      className="bg-green-600"
                      onClick={() => {
                        startSubmitTransition(() =>
                          submitUserSelections(
                            termObj.term,
                            selectedCourses.map((course) => course.raw_id),
                          ),
                        );
                      }}
                    >
                      提交
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button size="icon" variant="destructive" onClick={() => signOut()}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      <Tabs
        defaultValue={termObj.ref_sem}
        value={semester}
        onValueChange={setSemester}
      >
        <TabsList>
          <TabsTrigger value={termObj.ref_sem}>上學期</TabsTrigger>
          <TabsTrigger value={termObj.ref_sem_2}>下學期</TabsTrigger>
        </TabsList>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-sm mt-3">
          {showTimetable && (
            <Timetable
              timetableData={timetableData}
              renderTimetableSlot={renderTimetableSlot}
            />
          )}
          <div className="flex flex-col gap-4 px-4">
            <Alert>
              <Info className="w-4 h-4 mr-2" />
              <AlertTitle>調查規則</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside">
                  <li>調查結果僅供參考，不代表實際開課情況。</li>
                  <li>提交時最多能提交 5門課。請把你最想選的課留下來交</li>
                  <li>
                    繳交後，您的姓名，學號，電郵將提交至系統内，並只會提供系辦人員參考
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
            <Alert className="text-amber-600 border-amber-600">
              <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" />
              <AlertDescription>
                提供篩選的課程都是上學年(112學期)的課程，除了課號&課名之外，其他資訊可能會有變動。
              </AlertDescription>
            </Alert>
            <div className="flex flex-row">
              <Button
                variant="outline"
                onClick={(e) => setOpen(true)}
                className="flex-1"
              >
                <Plus /> Add Course
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button size="icon" variant="outline">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>
                    時間表
                    <Switch
                      checked={showTimetable}
                      onCheckedChange={(v) => setShowTimetable(v)}
                    />
                  </DropdownMenuLabel>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid grid-cols-2 text-center">
              <div className="space-x-2">
                <span className="text-2xl">
                  {semesterSelectedCourses.length}
                </span>
                <span className="text-gray-600">課程</span>
              </div>
              <div className="space-x-2">
                <span className="text-2xl">{totalCredits}</span>
                <span className="text-gray-600">總學分</span>
              </div>
            </div>
            <Separator />
            {exceedesMaxCourses && (
              <Alert className="text-red-600 border-red-600 bg-red-100">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  最多只能選 {MAX_COURSES} 門課
                </AlertDescription>
              </Alert>
            )}
            {semesterSelectedCourses.map((course, index) => (
              <div key={index} className="flex flex-row gap-4 items-center">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: colorMap[course.raw_id] }}
                ></div>
                <div className="flex flex-col flex-1">
                  <span className="text-sm">
                    {course.department}
                    {course.course}-{course.class} {course.name_zh} -{" "}
                    {(course.teacher_zh ?? []).join(",")}
                  </span>
                  <span className="text-xs">{course.name_en}</span>
                  <div className="mt-1">
                    {course.venues?.map((venue, index) => {
                      const time = course.times![index];
                      return (
                        <div
                          key={index}
                          className="flex flex-row items-center space-x-2 font-mono text-gray-400"
                        >
                          <span className="text-xs">{venue}</span>
                          <span className="text-xs">{time}</span>
                        </div>
                      );
                    }) || (
                      <span className="text-gray-400 text-xs">No Venue</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-row space-x-2 items-center">
                  {timeConflicts.find(
                    (ts) => ts.course.raw_id == course.raw_id,
                  ) && (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                      </HoverCardTrigger>
                      <HoverCardContent>
                        <span>衝堂</span>
                      </HoverCardContent>
                    </HoverCard>
                  )}
                  {duplicates.includes(course.raw_id) && (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Copy className="w-6 h-6 text-yellow-500" />
                      </HoverCardTrigger>
                      <HoverCardContent>
                        <span>重複</span>
                      </HoverCardContent>
                    </HoverCard>
                  )}
                  {/* Credits */}
                  <div className="flex flex-row items-center space-x-1">
                    <span className="text-lg">{course.credits}</span>
                    <span className="text-xs text-gray-400">學分</span>
                  </div>
                  <div className="flex flex-row">
                    <Button
                      className="rounded-l-none"
                      variant="outline"
                      size="icon"
                      onClick={() => deleteCourse(course)}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {semesterSelectedCourses.length == 0 && (
              <div className="flex flex-col items-center space-y-4">
                <span className="text-lg font-semibold text-gray-400">
                  {"No Courses Added (yet)"}
                </span>
              </div>
            )}
          </div>
          {/* {renderDrawer()} */}
        </div>
      </Tabs>
    </div>
  );
};

export default CdsCoursesForm;
