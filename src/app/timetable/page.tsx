'use client';;
import Timetable from "@/components/Timetable/Timetable";
import { useSettings } from "@/hooks/contexts/settings";
import { NextPage } from "next";
import { Autocomplete, AutocompleteOption, Button, ButtonGroup, CircularProgress, DialogActions, DialogContent, DialogTitle, IconButton, Input, ListItemContent, ModalClose, ModalDialog, Sheet, Typography } from "@mui/joy";
import { Download, EyeOff, Mail, Search, Share, Trash } from "react-feather";
import { timetableColors } from '@/helpers/timetable';
import useUserTimetable from "@/hooks/useUserTimetable";
import { useRouter } from "next/navigation";
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from "react";
import { useModal } from "@/hooks/contexts/useModal";
import {QRCodeSVG} from 'qrcode.react';
import { useDebouncedCallback } from "use-debounce";
import supabase, { CourseDefinition } from '@/config/supabase';

const CourseSearchbar = ({ onAddCourse }: { onAddCourse: (course: CourseDefinition) => void }) => {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<CourseDefinition[]>([]);
    const [loading, setLoading] = useState(false);
    const [textSearch, setTextSearch] = useState('');
    const [refreshKey, setRefreshKey] = useState<string>("init");


    const search = useDebouncedCallback(async (text: string) => {
        console.log(text)
        try {
            setLoading(true);
            let temp = supabase
                .from('courses')
                .select('*')
            if(text.length > 0) temp = temp.textSearch('multilang_search', `'${text.split(' ').join("' & '")}'`)
            const { data = [], error } = await temp
                .order('raw_id', { ascending: true })
                .limit(10);
            if(error) console.error(error);
            else setOptions(data ?? []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }, 500);

    useEffect(() => {
        if(open) search("");
    },[open]);

    return <Autocomplete
        key={refreshKey} 
        placeholder="Search for a course..."
        open={open}
        onOpen={() => {
            setLoading(true);
            setOpen(true);
        }}
        onClose={() => {
            setOpen(false);
        }}
        inputValue={textSearch}
        onInputChange={(event, newInputValue) => {
            setLoading(true);
            setTextSearch(newInputValue);
            search(newInputValue);
        }}
        defaultValue={null}
        value={null}
        onChange={(event, newValue) => {
            setRefreshKey(newValue!.raw_id! ?? Date.now());
            if(newValue) onAddCourse(newValue!);
        }}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        getOptionLabel={(option) => `${option.department} ${option.course}-${option.class} ${option.name_zh} ${option.name_en} ${option.raw_teacher_zh} ${option.raw_teacher_en}`}
        renderOption={(props, option) => (
            <AutocompleteOption {...props}>
                <ListItemContent sx={{ fontSize: 'sm' }}>
                    <p className="font-semibold">{option.department} {option.course}-{option.class} {option.name_zh}</p>
                    <p className="text-xs">{option.name_en}</p>
                    <p className="text-xs text-gray-400">{option.raw_teacher_zh} {option.raw_teacher_en} </p>
                    {option.venues?.map((venue, index) => {
                        const time = option.times![index];
                        return <div key={index} className="flex flex-row items-center space-x-2 text-gray-400">
                            <span className="text-xs">{venue}</span>
                            <span className="text-xs">{time}</span>
                        </div>
                    }) || <span className="text-gray-400 text-xs">No Venue</span>}
                </ListItemContent>
            </AutocompleteOption>
        )}
        options={options}
        loading={loading}
        endDecorator={
        loading ? (
            <CircularProgress size="sm" sx={{ bgcolor: 'background.surface' }} />
        ) : null
        }
    />
}

const TimetablePage: NextPage = () => {
    const { courses, setCourses } = useSettings();

    const { timetableData, allCourseData, deleteCourse, addCourse } = useUserTimetable();

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