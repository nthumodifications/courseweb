import useDictionary from '@/dictionaries/useDictionary';
import {Download, Image, Loader2} from 'lucide-react';
import Timetable from './Timetable';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { toPng } from 'html-to-image';
import { useCallback, useRef, useState } from 'react';
import { createTimetableFromCourses } from '@/helpers/timetable';
import { MinimalCourse } from '@/types/courses';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { DialogTrigger } from '@radix-ui/react-dialog';
import { Button } from '../ui/button';

const DownloadTimetableComponent = () => {
    const dict = useDictionary();
    const { getSemesterCourses, semester, colorMap, currentColors } = useUserTimetable();
    const ref = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);

    const timetableData = createTimetableFromCourses(getSemesterCourses(semester) as MinimalCourse[], colorMap);

    const handleConvert = useCallback(() => {
        if (ref.current === null) {
          return
        }
        setLoading(true);
        toPng(ref.current!, { cacheBust: true, pixelRatio: 3, filter: (node: HTMLElement) => node.id !== 'time_slot'})
        .then(async (dataUrl) => {
            const filename = new Date().toISOString() + '_timetable.png';
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            link.target = '_blank';
            link.click();
        })
        .catch((err) => {
            console.error('oops, something went wrong!', err);
        })
        .finally(() => {
            setLoading(false);
        });
        
    }, [ref])
    
    return <>
        <Button
            onClick={handleConvert}
            variant="outline"
            disabled={loading}
        >{loading? 
            <Loader2 className="w-4 h-4 animate-spin"/>
            :<><Image className="w-4 h-4 mr-2" /> {dict.dialogs.DownloadTimetableDialog.buttons.image}</>}
        </Button>
        <div className='relative overflow-hidden'>
            <div className='absolute h-[915px] w-[539px] px-2 pt-4 pb-8 grid place-items-center bg-white dark:bg-background' ref={ref}>
                <div className='h-[915px] w-[414px]'>
                    <Timetable timetableData={timetableData} vertical/>
                </div>
            </div>
        </div>
    </>
}

const DownloadTimetableDialog = ({ icsfileLink }: { icsfileLink: string }) => {
    const dict = useDictionary();

    const handleDownloadCalendar = async () => {
        const filename = `${new Date().toISOString()}_timetable.ics`;
        const link = document.createElement('a');
        link.download = filename
        link.href = icsfileLink;
        link.target = '_blank';
        link.click();
    }

    return <Dialog>
        <DialogTrigger asChild>
            <Button variant="outline"><Download className="w-4 h-4 mr-1" /> {dict.timetable.actions.download}</Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{dict.dialogs.DownloadTimetableDialog.title}</DialogTitle>
                <DialogDescription>{dict.dialogs.DownloadTimetableDialog.description}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-4">
                <Button
                    onClick={handleDownloadCalendar}
                    variant="outline"
                ><Download className="w-4 h-4 mr-2" />{dict.dialogs.DownloadTimetableDialog.buttons.ICS}</Button>
                <DownloadTimetableComponent/>
            </div>
        </DialogContent>
    </Dialog>
}

export default DownloadTimetableDialog;