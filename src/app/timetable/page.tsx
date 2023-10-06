'use client';;
import Timetable from "@/components/Timetable/Timetable";
import { useSettings } from "@/hooks/contexts/settings";
import { NextPage } from "next";
import { Button, ButtonGroup, DialogActions, DialogContent, DialogTitle, IconButton, Input, ModalClose, ModalDialog, Sheet, Typography } from "@mui/joy";
import { Download, EyeOff, Mail, Search, Share, Trash } from "react-feather";
import { timetableColors } from '@/helpers/timetable';
import useUserTimetable from "@/hooks/useUserTimetable";
import { useRouter } from "next/navigation";
import { useSearchParams } from 'next/navigation'
import { useEffect } from "react";
import { useModal } from "@/hooks/contexts/useModal";
import {QRCodeSVG} from 'qrcode.react';

const TimetablePage: NextPage = () => {
    const { courses, setCourses } = useSettings();

    const { timetableData, allCourseData, deleteCourse } = useUserTimetable();

    const router = useRouter();
    const searchParams = useSearchParams();

    const [openModal, closeModal] = useModal();

    //Check if URL has course code array, display share dialog.
    useEffect(() => {
        if(searchParams.has('courses')) {
            const courseCodes = searchParams.get('courses')?.split(',');
            console.log(courseCodes);
            openModal({
                children: <ModalDialog>
                    <ModalClose/>
                    <DialogTitle>You opened a share link!</DialogTitle>
                    <DialogContent>
                        What would you like to do with the imported courses?
                        <span className="text-sm text-gray-400">*Importing courses will replace all your current courses!</span>
                    </DialogContent>
                    <DialogActions>
                        <Button variant="plain" onClick={closeModal} color="warning" >Cancel</Button>
                        <Button variant="outlined" onClick={() => {
                            setCourses(courseCodes!);
                            closeModal();
                        }} color="danger">Import</Button>
                        <Button variant="outlined" onClick={() => {
                            closeModal();
                        }}>View</Button>
                    </DialogActions>
                </ModalDialog>
            });
            router.push('/timetable');
        }
    }, []);

    const handleShowShareDialog = () => {
        const shareLink = `https://nthumods.imjustchew.com/timetable?courses=${courses.map(id => encodeURIComponent(id)).join(',')}`
        const handleCopy = () => {
            navigator.clipboard.writeText(shareLink);
        }

        openModal({
            children: <ModalDialog>
                <ModalClose/>
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
                                <Share className="w-5 h-5"/>
                            </IconButton>
                        }/>
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
                                startDecorator={<Mail className="w-4 h-4"/>}
                            >Send Email</Button>
                        </div>
                    </div>
                </DialogContent>
            </ModalDialog>
        });
    }
    
    return (
        <div className="grid grid-cols-1 grid-rows-2 md:grid-rows-1 md:grid-cols-[3fr_2fr] px-1 py-4 md:p-4">
            <Timetable timetableData={timetableData} />
            <div className="flex flex-col gap-4 px-4">
                <Input placeholder="Add course to Timetable" />
                {allCourseData.map((course, index) => (
                    <div key={index} className="flex flex-row gap-4 items-center">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: timetableColors['tsinghuarian'][index] }}></div>
                        <div className="flex flex-col flex-1">
                            <span className="text-sm">{course.name_zh}</span>
                            <span className="text-xs">{course.name_en}</span>
                        </div>
                        <ButtonGroup>
                            <IconButton onClick={() => deleteCourse(course)}>
                                <Trash className="w-4 h-4"/>
                            </IconButton>
                            <IconButton>
                                <EyeOff className="w-4 h-4"/>
                            </IconButton>
                        </ButtonGroup>
                    </div>
                ))}
                {allCourseData.length == 0 && (
                    <div className="flex flex-col items-center space-y-4">
                        <span className="text-lg font-semibold text-gray-400">{"No Courses Added (yet)"}</span>
                        <div className="flex flex-row gap-2">
                            {/* <Button variant="plain" startDecorator={<UploadCloud className="w-4 h-4"/>}>Import from File</Button> */}
                            <Button variant="soft" startDecorator={<Search className="w-4 h-4"/>} onClick={() => router.push('/courses')}>All Courses</Button>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-2 grid-rows-2 gap-2">
                    <Button variant="outlined" startDecorator={<Download className="w-4 h-4"/>}>Download</Button>
                    <Button variant="outlined" startDecorator={<Share className="w-4 h-4"/>} onClick={handleShowShareDialog}>Share/Sync</Button>
                </div>
            </div>
        </div>
    )
}

export default TimetablePage;