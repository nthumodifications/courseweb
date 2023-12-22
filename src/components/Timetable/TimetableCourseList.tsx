import { Button, ButtonGroup, IconButton, Divider, Tooltip } from '@mui/joy';
import { Download, EyeOff, Search, Share, Trash, AlertTriangle, Copy, Columns, Repeat, ExternalLink } from 'lucide-react';
import { useSettings } from '@/hooks/contexts/settings';
import useUserTimetable from '@/hooks/useUserTimetable';
import { useRouter } from 'next/navigation';
import { useModal } from '@/hooks/contexts/useModal';
import CourseSearchbar from './CourseSearchbar';
import { timetableColors } from "@/const/timetableColors";
import ThemeChangableAlert from '../Alerts/ThemeChangableAlert';
import useDictionary from '@/dictionaries/useDictionary';
import ShareSyncTimetableDialog from './ShareSyncTimetableDialog';
import DownloadTimetableDialog from './DownloadTimetableDialog';
import { useMemo } from 'react';
import { hasConflictingTimeslots, hasSameCourse } from '@/helpers/courses';
import { MinimalCourse, RawCourseID } from '@/types/courses';

const TimetableCourseList = ({ vertical, setVertical }: { vertical: boolean, setVertical: (v: boolean) => void }) => {
    const { language, timetableTheme } = useSettings();
    const dict = useDictionary();

    const {
        semester, 
        displayCourseData, 
        courses, 
        deleteCourse, 
        addCourse 
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
            children: <ShareSyncTimetableDialog onClose={closeModal} shareLink={shareLink} webcalLink={webcalLink} onCopy={handleCopy} />
        });
    }

    const handleDownloadDialog = () => {
        const icsfileLink = `https://nthumods.com/timetable/calendar.ics?semester=${semester}&${Object.keys(courses).map(sem => `semester_${sem}=${courses[sem].map(id => encodeURI(id)).join(',')}`).join('&')}`
        const imageLink = `https://nthumods.com/timetable/image?semester=${semester}&theme=${timetableTheme}&${Object.keys(courses).map(sem => `semester_${sem}=${courses[sem].map(id => encodeURI(id)).join(',')}`).join('&')}`
        openModal({
            children: <DownloadTimetableDialog onClose={closeModal} icsfileLink={icsfileLink} imageLink={imageLink} />
        });
    }

    const totalCredits = useMemo(() => {
        return displayCourseData.reduce((acc, cur) => acc + (cur?.credits ?? 0), 0);
    }, [displayCourseData]);

    const duplicates = useMemo(() => hasSameCourse(displayCourseData as MinimalCourse[]), [displayCourseData]);

    const timeConflicts = useMemo(() => hasConflictingTimeslots(displayCourseData as MinimalCourse[]), [displayCourseData]);

    const renderButtons = () => {
        return <div className="grid grid-cols-2 grid-rows-2 gap-2">
            <Button variant="outlined" color="neutral" startDecorator={<Repeat className="w-4 h-4" />} onClick={() => setVertical(!vertical)}>{vertical ? 'Horizontal View' : 'Vertical View'}</Button>
            <Button variant="outlined" color="neutral" startDecorator={<Download className="w-4 h-4" />} onClick={handleDownloadDialog}>{dict.timetable.actions.download}</Button>
            <Button variant="outlined" color="neutral" startDecorator={<Share className="w-4 h-4" />} onClick={handleShowShareDialog}>{dict.timetable.actions.share}</Button>
        </div>
    }

    const handleCopyClipboard = (id: RawCourseID) => {
        navigator.clipboard.writeText(id);
    }

    return <div className="flex flex-col gap-4 px-4">
        {renderButtons()}
        <CourseSearchbar onAddCourse={course => addCourse(course.raw_id)} semester={semester} />
        <div className={`${vertical ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ' : 'flex flex-col'} gap-4 px-4 flex-wrap`}>
            {displayCourseData.map((course, index) => (
                <div key={index} className="flex flex-row gap-4 items-center max-w-3xl">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: timetableColors[timetableTheme][index] }}></div>
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
                            <IconButton onClick={() => handleCopyClipboard(course.raw_id)}>
                                <Copy className="w-4 h-4" />
                            </IconButton>
                            <IconButton onClick={() => router.push(`/${language}/courses/${course.raw_id}`)}>
                                <ExternalLink className="w-4 h-4" />
                            </IconButton>
                            <IconButton color="danger" onClick={() => deleteCourse(course.raw_id)}>
                                <Trash className="w-4 h-4" />
                            </IconButton>
                            {/* TOOD: Has no plans to implement now */}
                            {/* <IconButton>
                                <EyeOff className="w-4 h-4" />
                            </IconButton> */}
                        </ButtonGroup>
                    </div>
                </div>
            ))}
            {displayCourseData.length == 0 && (
                <div className="flex flex-col items-center space-y-4">
                    <span className="text-lg font-semibold text-gray-400">{"No Courses Added (yet)"}</span>
                    <div className="flex flex-row gap-2">
                        {/* <Button variant="plain" startDecorator={<UploadCloud className="w-4 h-4"/>}>Import from File</Button> */}
                        <Button variant="soft" startDecorator={<Search className="w-4 h-4" />} onClick={() => router.push(`/${language}/courses`)}>All Courses</Button>
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