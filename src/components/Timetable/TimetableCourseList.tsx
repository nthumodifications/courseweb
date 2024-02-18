import { IconButton, Divider, Tooltip } from '@mui/joy';
import { Download, EyeOff, Search, Share, Trash, AlertTriangle, Copy, Columns, Repeat, ExternalLink, GripVertical, FolderSync } from 'lucide-react';
import { useSettings } from '@/hooks/contexts/settings';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { useRouter } from 'next/navigation';
import { useModal } from '@/hooks/contexts/useModal';
import CourseSearchbar from './CourseSearchbar';
import { timetableColors } from "@/const/timetableColors";
import ThemeChangableAlert from '../Alerts/ThemeChangableAlert';
import useDictionary from '@/dictionaries/useDictionary';
import { useEffect, useMemo, useState } from 'react';
import { hasConflictingTimeslots, hasSameCourse, hasTimes } from '@/helpers/courses';
import { MinimalCourse, RawCourseID } from '@/types/courses';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"

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
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Compact from '@uiw/react-color-compact';
import { useHeadlessAIS } from '@/hooks/contexts/useHeadlessAIS';
import { toast } from '../ui/use-toast';
import {event} from '@/lib/gtag';
const DownloadTimetableDialogDynamic = dynamic(() => import('./DownloadTimetableDialog'), { ssr: false })
const ShareSyncTimetableDialogDynamic = dynamic(() => import('./ShareSyncTimetableDialog'), { ssr: false })



const TimetableCourseListItem = ({ course, hasConflict, isDuplicate }: { course: MinimalCourse, hasConflict: boolean, isDuplicate: boolean, }) => {
    const { language } = useSettings();

    const handleCopyClipboard = (id: RawCourseID) => {
        navigator.clipboard.writeText(id);
    }
    const {
        deleteCourse,
        colorMap,
        setColor
    } = useUserTimetable();

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: course.raw_id});


    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    return <div className="flex flex-row gap-4 items-center max-w-3xl" ref={setNodeRef} style={style} >
        <GripVertical className="w-4 h-4 text-gray-400" {...attributes} {...listeners} />
        <Popover>
            <PopoverTrigger>
                <div className='px-3 py-2 rounded-md hover:outline outline-1 outline-slate-400'>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorMap[course.raw_id] }}></div>
                    
                </div>
            </PopoverTrigger>
            <PopoverContent>
                <Compact
                    color={colorMap[course.raw_id]}
                    onChange={(color) => {
                        setColor(course.raw_id, color.hex);
                    }}                
                />
            </PopoverContent>
        </Popover>
        <div className="flex flex-col flex-1">
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
        <div className="flex flex-row space-x-2 items-center">
            {hasConflict && <Tooltip title="衝堂">
                <AlertTriangle className="w-6 h-6 text-red-500" />
            </Tooltip>}
            {isDuplicate && <Tooltip title="重複">
                <Copy className="w-6 h-6 text-yellow-500" />
            </Tooltip>}
            {/* Credits */}
            <div className="flex flex-row items-center space-x-1">
                <span className="text-lg">{course.credits}</span>
                <span className="text-xs text-gray-400">學分</span>
            </div>
            <div className='flex flex-row'>
                <Button className='rounded-r-none ' variant="outline" size="icon" onClick={() => handleCopyClipboard(course.raw_id)}>
                    <Copy className="w-4 h-4" />
                </Button>
                <Button className='rounded-none border-x-0' asChild variant="outline" size="icon" onClick={() => handleCopyClipboard(course.raw_id)}>
                    <Link href={`/${language}/courses/${course.raw_id}`}>
                        <ExternalLink className="w-4 h-4" />
                    </Link>
                </Button>
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

const HeadlessSyncCourseButton = () => {
    const dict = useDictionary();
    const { ais, getACIXSTORE } = useHeadlessAIS();
    const { courses, addCourse, deleteCourse } = useUserTimetable();
    const [loading, setLoading] = useState(false);
    const [coursesToAdd, setCoursesToAdd] = useState<string[]>([]);

    if(!ais.enabled) return <></>;

    useEffect(() => {
        if(coursesToAdd.length > 0) {
            addCourse(coursesToAdd);
            setCoursesToAdd([]);
            toast({
                title: 'Sync Succesful!',
                description: 'Courses are added to your timetable.',
            })
            event({
                action: "sync_ccxp_courses",
                category: "ccxp",
                label: "sync_ccxp_courses",
            });
        }
    }, [courses, coursesToAdd]);


    const handleSync = async () => {
        setLoading(true);
        console.log('sync')
        const ACIXSTORE = await getACIXSTORE();
        const res = await fetch('/api/ais_headless/courses/sync-latest?ACIXSTORE='+ACIXSTORE).then(res => res.json()) as {
            semester: string,
            phase: string,
            studentid: string,
            courses: string[]
        };
        //remove courses that are not in the latest
        const courses_to_remove = (courses[res.semester] ?? []).filter(id => !res.courses.includes(id));
        deleteCourse(courses_to_remove);
        //add courses that are not in the current
        const courses_to_add = res.courses.filter(id => !(courses[res.semester] ?? []).includes(id));
        setCoursesToAdd(courses_to_add);
        setLoading(false);
    }
    return <Button variant="outline" onClick={handleSync} disabled={loading}>
        {!loading?
            <><FolderSync className="w-4 h-4 mr-1" /> {dict.timetable.actions.sync_ccxp}</>:
            "Loading"
        }
    </Button>
}

const TimetableCourseList = ({ vertical, setVertical }: { vertical: boolean, setVertical: (v: boolean) => void }) => {
    const { language } = useSettings();
    const dict = useDictionary();

    const {
        semester,
        displayCourseData,
        courses,
        deleteCourse,
        addCourse,
        colorMap,
        setCourses
    } = useUserTimetable();

    const router = useRouter();

    const [openModal, closeModal] = useModal();


    const handleShowShareDialog = () => {
        const shareLink = `https://nthumods.com/timetable?${Object.keys(courses).map(sem => `semester_${sem}=${courses[sem].map(id => encodeURI(id)).join(',')}`).join('&')}`
        const webcalLink = ``
        const handleCopy = () => {
            navigator.clipboard.writeText(shareLink);
        }

        openModal({
            children: <ShareSyncTimetableDialogDynamic onClose={closeModal} shareLink={shareLink} webcalLink={webcalLink} onCopy={handleCopy} />
        });
    }

    const handleDownloadDialog = () => {
        const icsfileLink = `https://nthumods.com/timetable/calendar.ics?semester=${semester}&${Object.keys(courses).map(sem => `semester_${sem}=${courses[sem].map(id => encodeURI(id)).join(',')}`).join('&')}`
        openModal({
            children: <DownloadTimetableDialogDynamic onClose={closeModal} icsfileLink={icsfileLink} />
        });
    }

    const totalCredits = useMemo(() => {
        return displayCourseData.reduce((acc, cur) => acc + (cur?.credits ?? 0), 0);
    }, [displayCourseData]);

    const duplicates = useMemo(() => hasSameCourse(displayCourseData as MinimalCourse[]), [displayCourseData]);

    const timeConflicts = useMemo(() => hasConflictingTimeslots(displayCourseData as MinimalCourse[]), [displayCourseData]);

    const renderButtons = () => {
        return <div className="grid grid-cols-2 grid-rows-2 gap-2">
            <Button variant="outline" onClick={() => setVertical(!vertical)}><Repeat className="w-4 h-4 mr-1" /> {vertical ? dict.timetable.actions.horizontal_view : dict.timetable.actions.vertical_view}</Button>
            <Button variant="outline" onClick={handleDownloadDialog}><Download className="w-4 h-4 mr-1" /> {dict.timetable.actions.download}</Button>
            <Button variant="outline" onClick={handleShowShareDialog}><Share className="w-4 h-4 mr-1" /> {dict.timetable.actions.share}</Button>
            <HeadlessSyncCourseButton />
        </div>
    }

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if(!over) return;
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
            setCourses({...courses, [semester]: newCourseCopy})
        }
    }

return <div className="flex flex-col gap-4 px-4">
        {renderButtons()}
        <CourseSearchbar onAddCourse={course => addCourse(course.raw_id)} semester={semester} />
        <div className={`${!vertical ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ' : 'flex flex-col'} gap-4 px-4 flex-wrap`}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[vertical? restrictToVerticalAxis: restrictToWindowEdges]}
            >
                <SortableContext
                    items={displayCourseData.map(course => course.raw_id)}
                    strategy={vertical? verticalListSortingStrategy: rectSwappingStrategy}
                >
                    {displayCourseData.map((course, index) => (
                        <TimetableCourseListItem
                            key={index}
                            course={course as MinimalCourse}
                            hasConflict={!!timeConflicts.find(ts => ts.course.raw_id == course.raw_id)}
                            isDuplicate={duplicates.includes(course.raw_id)}
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
        <Divider />
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
        <ThemeChangableAlert />
    </div>
}

export default TimetableCourseList;