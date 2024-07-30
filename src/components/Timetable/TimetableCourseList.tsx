import { Search, Trash, AlertTriangle, Copy, GripVertical, Loader2 } from 'lucide-react';
import { useSettings } from '@/hooks/contexts/settings';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { useRouter } from 'next/navigation';
import CourseSearchbar from './CourseSearchbar';
import useDictionary from '@/dictionaries/useDictionary';
import { useMemo } from 'react';
import { hasConflictingTimeslots, hasSameCourse, hasTimes } from '@/helpers/courses';
import { MinimalCourse, RawCourseID } from '@/types/courses';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    rectSwappingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
    restrictToVerticalAxis,
    restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Compact from '@uiw/react-color-compact';
import { Separator } from '../ui/separator';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { TimetableItemDrawer } from './TimetableItemDrawer';

export const DownloadTimetableDialogDynamic = dynamic(() => import('./DownloadTimetableDialog'), { ssr: false, loading: () => <Button variant='outline' disabled><Loader2 className='w-4 h-4 animate-spin'/></Button>  })
export const ShareSyncTimetableDialogDynamic = dynamic(() => import('./ShareSyncTimetableDialog'), { ssr: false, loading: () => <Button variant='outline' disabled><Loader2 className='w-4 h-4 animate-spin'/></Button> })
export const HeadlessSyncCourseButtonDynamic = dynamic(() => import('./HeadlessSyncCourseButton'), { ssr: false, loading: () => <Button variant='outline' disabled><Loader2 className='w-4 h-4 animate-spin'/></Button>  })
export const CourseSearchContainerDynamic = dynamic(() => import('@/app/[lang]/(mods-pages)/courses/CourseSearchContainer'), { ssr: false, loading: () => <Loader2 className='w-4 h-4 animate-spin'/>  })

const TimetableCourseListItem = ({ 
    course, 
    hasConflict, 
    isDuplicate,
    priority
}: { 
    course: MinimalCourse, 
    hasConflict: boolean, 
    isDuplicate: boolean,
    priority: number
}) => {
    const { language } = useSettings();

    const handleCopyClipboard = (id: RawCourseID) => {
        navigator.clipboard.writeText(id);
    }
    const {
        deleteCourse,
        colorMap,
        setColor,
        currentColors
    } = useUserTimetable();

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: course.raw_id });


    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    return <div className="flex flex-row gap-2 items-center max-w-3xl" ref={setNodeRef} style={style} >
        <GripVertical className="w-4 h-4 text-gray-400" {...attributes} {...listeners} />
        <Popover>
            <PopoverTrigger asChild>
                <div className='p-1 rounded-md hover:outline outline-1 outline-slate-400 mr-2'>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorMap[course.raw_id] }}></div>
                </div>
            </PopoverTrigger>
            <PopoverContent className='p-0'>
                <Compact
                    color={colorMap[course.raw_id]}
                    onChange={(color) => {
                        setColor(course.raw_id, color.hex);
                    }}
                    colors={currentColors}
                />
            </PopoverContent>
        </Popover>
        <TimetableItemDrawer course={course}>
            <div className="flex flex-col flex-1">
                <p className='mb-1'>{priority != 0 && <span className='px-2 py-0.5 dark:bg-white dark:text-black bg-neutral-700 text-white mr-1 rounded-md text-xs'>{priority} 志願</span>}</p>
                <span className="text-sm">{course.department} {course.course}-{course.class} {course.name_zh} - {course.teacher_zh.join(',')}</span>
                <span className="text-xs">{course.name_en}</span>
                <div className="mt-1">
                    {course.venues?.map((venue, index) => {
                        const time = course.times![index];
                        return <div key={index} className="flex flex-row items-center space-x-2 font-mono text-gray-400">
                            <span className="text-xs">{venue}</span>
                            {hasTimes(course as MinimalCourse) ? <span className="text-xs">{time}</span> : <span className="text-xs text-red-500">缺時間</span>}
                        </div>
                    }) || <span className="text-gray-400 text-xs">No Venue</span>}
                </div>
            </div>
        </TimetableItemDrawer>
        <div className="flex flex-row space-x-2 items-center">
            {hasConflict && <HoverCard>
                <HoverCardTrigger asChild>
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                </HoverCardTrigger>
                <HoverCardContent>
                    <span>衝堂</span>
                </HoverCardContent>
            </HoverCard>}
            {isDuplicate && <HoverCard>
                <HoverCardTrigger asChild>
                    <Copy className="w-6 h-6 text-yellow-500" />
                </HoverCardTrigger>
                <HoverCardContent>
                    <span>重複</span>
                </HoverCardContent>
            </HoverCard>}
            {/* Credits */}

            <div className="flex flex-row items-center space-x-1">
                <span className="text-lg">{course.credits}</span>
                <span className="text-xs text-gray-400">學分</span>
            </div>
            <div className='flex flex-row'>
                <Button className='rounded-l-none' variant="outline" size="icon" onClick={() => deleteCourse(course.raw_id)}>
                    <Trash className="w-4 h-4" />
                </Button>
                {/* TOOD: Has no plans to implement now */}
                {/* <IconButton>
                    <EyeOff className="w-4 h-4" />
                </IconButton> */}
            </div>
        </div>
    </div>
}

export const TimetableCourseList = ({
    semester,
    vertical = true
}: {
    semester: string,
    vertical?: boolean
}) => {
    const { language } = useSettings();
    const dict = useDictionary();
    const router = useRouter();

    const {
        getSemesterCourses,
        courses,
        addCourse,
        colorMap,
        setCourses
    } = useUserTimetable();

    const displayCourseData = useMemo(() => getSemesterCourses(semester), [getSemesterCourses, semester]);

    const totalCredits = useMemo(() => {
        return displayCourseData.reduce((acc, cur) => acc + (cur?.credits ?? 0), 0);
    }, [displayCourseData]);

    const duplicates = useMemo(() => hasSameCourse(displayCourseData as MinimalCourse[]), [displayCourseData]);

    const timeConflicts = useMemo(() => hasConflictingTimeslots(displayCourseData as MinimalCourse[]), [displayCourseData]);    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const peAndGeAllocation = useMemo(() => {
        //filter by pe and ge: include PE (exclude PE 1110) and courses with ge_target
        const peAndGe = displayCourseData.filter(course => {
            if (course.department == 'PE' && course.course != 'PE 1110') {
                return true;
            }
            if (course.ge_target && course.ge_target != " ") {
                return true;
            }
            return false;
        });
        console.log(peAndGe)
        
        return peAndGe.map(course => course.raw_id);
    }, [displayCourseData]);

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over) return;
        if (active.id !== over.id) {
            // setItems((items) => {
            //     const oldIndex = items.indexOf(active.id);
            //     const newIndex = items.indexOf(over.id);

            //     return arrayMove(items, oldIndex, newIndex);
            // });
            const courseCopy = [...courses[semester]];
            const oldIndex = courseCopy.indexOf(active.id as string);
            const newIndex = courseCopy.indexOf(over.id as string);
            const newCourseCopy = arrayMove(courseCopy, oldIndex, newIndex);
            setCourses({ ...courses, [semester]: newCourseCopy })
        }
    }

    return <div className='flex flex-col gap-2'>
        <div className={`${!vertical ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ' : 'flex flex-col'} gap-4 px-4 flex-wrap`}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[vertical ? restrictToVerticalAxis : restrictToWindowEdges]}
            >
                <SortableContext
                    items={displayCourseData.map(course => course.raw_id)}
                    strategy={vertical ? verticalListSortingStrategy : rectSwappingStrategy}
                >
                    {displayCourseData.map((course, index) => (
                        <TimetableCourseListItem
                            key={index}
                            course={course as MinimalCourse}
                            hasConflict={!!timeConflicts.find(ts => ts.course.raw_id == course.raw_id)}
                            isDuplicate={duplicates.includes(course.raw_id)}
                            priority={peAndGeAllocation.indexOf(course.raw_id) + 1}
                        />
                    ))}
                </SortableContext>
            </DndContext>
            {displayCourseData.length == 0 && (
                <div className="flex flex-col items-center space-y-4">
                    <span className="text-lg font-semibold text-gray-400">{"No Courses Added (yet)"}</span>
                    <div className="flex flex-row gap-2">
                        {/* <Button variant="plain" startDecorator={<UploadCloud className="w-4 h-4"/>}>Import from File</Button> */}
                        <Button variant="outline" onClick={() => router.push(`/${language}/courses`)}><Search className="w-4 h-4" /> All Courses</Button>
                    </div>
                </div>
            )}
        </div>
        <Separator orientation='horizontal' />
        <div className='flex flex-row gap-4 justify-end'>
            <div className='space-x-2'>
                <span className='font-bold'>{displayCourseData.length}</span>
                <span className='text-gray-600'>課</span>
            </div>
            <div className='space-x-2'>
                <span className='font-bold'>{totalCredits}</span>
                <span className='text-gray-600'>總學分</span>
            </div>
        </div>
    </div>
}
export default TimetableCourseList;