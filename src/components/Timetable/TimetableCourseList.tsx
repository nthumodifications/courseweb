import { Button, ButtonGroup, DialogContent, DialogTitle, IconButton, Input, ModalClose, ModalDialog } from '@mui/joy';
import { Download, EyeOff, Mail, Search, Share, Trash } from 'react-feather';
import { QRCodeSVG } from 'qrcode.react';
import { useSettings } from '@/hooks/contexts/settings';
import useUserTimetable from '@/hooks/useUserTimetable';
import { useRouter } from 'next/navigation';
import { useModal } from '@/hooks/contexts/useModal';
import CourseSearchbar from './CourseSearchbar';
import { timetableColors } from '@/helpers/timetable';

const TimetableCourseList = () => {
    const { courses, setCourses } = useSettings();

    const { allCourseData, deleteCourse, addCourse } = useUserTimetable();

    const router = useRouter();

    const [openModal, closeModal] = useModal();
    const { language } = useSettings();


    const handleShowShareDialog = () => {
        const shareLink = `https://nthumods.imjustchew.com/timetable?courses=${courses.map(id => encodeURIComponent(id)).join(',')}`
        const handleCopy = () => {
            navigator.clipboard.writeText(shareLink);
        }

        openModal({
            children: <ModalDialog>
                <ModalClose />
                <DialogTitle>Share & Sync Your Timetable</DialogTitle>
                <DialogContent>
                    <p>
                        Send this link to your friends to share your timetable or to yourself to keep your timetable synced on all devices.
                    </p>
                    <Input
                        size="lg"
                        value={shareLink}
                        endDecorator={
                            <IconButton variant="solid" onClick={handleCopy}>
                                <Share className="w-5 h-5" />
                            </IconButton>
                        } />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <h3 className="text-lg font-semibold">QR Code</h3>
                            <QRCodeSVG value={shareLink} />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-lg font-semibold">Email</h3>
                            <Button
                                component="a"
                                // Subject: Here is My Timetable, Body: My Timetable can be found on NTHUMODS at {shareLink}
                                href={`mailto:?subject=Here is My Timetable&body=My Timetable can be found on NTHUMODS at ${shareLink}`}
                                variant="outlined"
                                startDecorator={<Mail className="w-4 h-4" />}
                            >Send Email</Button>
                        </div>
                    </div>
                </DialogContent>
            </ModalDialog>
        });
    }


    return <div className="flex flex-col gap-4 px-4">
        <CourseSearchbar onAddCourse={course => addCourse(course)} />
        {allCourseData.map((course, index) => (
            <div key={index} className="flex flex-row gap-4 items-center">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: timetableColors['tsinghuarian'][index] }}></div>
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
        <div className="grid grid-cols-2 grid-rows-2 gap-2">
            <Button variant="outlined" startDecorator={<Download className="w-4 h-4" />}>Download</Button>
            <Button variant="outlined" startDecorator={<Share className="w-4 h-4" />} onClick={handleShowShareDialog}>Share/Sync</Button>
        </div>
    </div>
}

export default TimetableCourseList;