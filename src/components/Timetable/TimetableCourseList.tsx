import {Button, ButtonGroup, IconButton, Divider} from '@mui/joy';
import { Download, EyeOff, Search, Share, Trash } from 'react-feather';
import { useSettings } from '@/hooks/contexts/settings';
import useUserTimetable from '@/hooks/useUserTimetable';
import { useRouter } from 'next/navigation';
import { useModal } from '@/hooks/contexts/useModal';
import CourseSearchbar from './CourseSearchbar';
import { timetableColors } from '@/helpers/timetable';
import ThemeChangableAlert from '../Alerts/ThemeChangableAlert';
import useDictionary from '@/dictionaries/useDictionary';
import ShareSyncTimetableDialog from './ShareSyncTimetableDialog';
import DownloadTimetableDialog from './DownloadTimetableDialog';
import { useMemo } from 'react';

const TimetableCourseList = () => {
    const { courses, setCourses } = useSettings();
    const dict = useDictionary();

    const { allCourseData, deleteCourse, addCourse } = useUserTimetable();

    const router = useRouter();

    const [openModal, closeModal] = useModal();
    const { language, timetableTheme } = useSettings();


    const handleShowShareDialog = () => {
        const shareLink = `https://nthumods.com/timetable?semester_1121=${courses.map(id => encodeURI(id)).join(',')}`
        const webcalLink = `webcal://nthumods.com/timetable/calendar.ics?semester_1121=${courses.map(id => encodeURI(id)).join(',')}`
        const handleCopy = () => {
            navigator.clipboard.writeText(shareLink);
        }

        openModal({
            children: <ShareSyncTimetableDialog onClose={closeModal} shareLink={shareLink} webcalLink={webcalLink} onCopy={handleCopy} />
        });
    }

    const handleDownloadDialog = () => {
        const icsfileLink = `https://nthumods.com/timetable/calendar.ics?semester_1121=${courses.map(id => encodeURI(id)).join(',')}`
        openModal({
            children: <DownloadTimetableDialog onClose={closeModal} icsfileLink={icsfileLink} />
        });
    }

    const totalCredits = useMemo(() => {
        return allCourseData.reduce((acc, cur) => acc + (cur?.credits ?? 0), 0);
    }, [allCourseData]);


    return <div className="flex flex-col gap-4 px-4">
        <CourseSearchbar onAddCourse={course => addCourse(course)} />
        <div className='grid grid-cols-2 text-center'>
            <div className='space-x-2'>
                <span className='text-2xl'>{allCourseData.length}</span>
                <span className='text-gray-600'>課程</span>
            </div>
            <div className='space-x-2'>
                <span className='text-2xl'>{totalCredits}</span>
                <span className='text-gray-600'>總學分</span>
            </div>
        </div>
        <Divider />
        {allCourseData.map((course, index) => (
            <div key={index} className="flex flex-row gap-4 items-center">
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
                <ButtonGroup>
                    <IconButton onClick={() => deleteCourse(course)}>
                        <Trash className="w-4 h-4" />
                    </IconButton>
                    <IconButton>
                        <EyeOff className="w-4 h-4" />
                    </IconButton>
                </ButtonGroup>
            </div>
        ))}
        {allCourseData.length == 0 && (
            <div className="flex flex-col items-center space-y-4">
                <span className="text-lg font-semibold text-gray-400">{"No Courses Added (yet)"}</span>
                <div className="flex flex-row gap-2">
                    {/* <Button variant="plain" startDecorator={<UploadCloud className="w-4 h-4"/>}>Import from File</Button> */}
                    <Button variant="soft" startDecorator={<Search className="w-4 h-4" />} onClick={() => router.push(`/${language}/courses`)}>All Courses</Button>
                </div>
            </div>
        )}
        <ThemeChangableAlert />
        <div className="grid grid-cols-2 grid-rows-2 gap-2">
            <Button variant="outlined" startDecorator={<Download className="w-4 h-4" />} onClick={handleDownloadDialog}>{dict.timetable.actions.download}</Button>
            <Button variant="outlined" startDecorator={<Share className="w-4 h-4" />} onClick={handleShowShareDialog}>{dict.timetable.actions.share}</Button>
        </div>
    </div>
}

export default TimetableCourseList;