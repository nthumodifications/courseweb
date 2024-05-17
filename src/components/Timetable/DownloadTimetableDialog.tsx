import useDictionary from '@/dictionaries/useDictionary';
import {Button, DialogContent, DialogTitle, ModalClose, ModalDialog} from '@mui/joy';
import {Download, Image} from 'lucide-react';
import Timetable from './Timetable';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { toPng } from 'html-to-image';
import { useCallback, useRef, useState } from 'react';
import { createTimetableFromCourses } from '@/helpers/timetable';
import { MinimalCourse } from '@/types/courses';

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
            variant="outlined"
            startDecorator={<Image className="w-4 h-4" />}
            loading={loading}
        >{dict.dialogs.DownloadTimetableDialog.buttons.image}</Button>
        <div className='relative overflow-hidden'>
            <div className='absolute h-[915px] w-[539px] px-2 pt-4 pb-8 grid place-items-center bg-white dark:bg-background' ref={ref}>
                <div className='h-[915px] w-[414px]'>
                    <Timetable timetableData={timetableData} vertical/>
                </div>
            </div>
        </div>
    </>
}

const DownloadTimetableDialog = ({ onClose, icsfileLink }: { onClose: () => void, icsfileLink: string }) => {
    const dict = useDictionary();

    const handleDownloadCalendar = async () => {
        const filename = `${new Date().toISOString()}_timetable.ics`;
        const link = document.createElement('a');
        link.download = filename
        link.href = icsfileLink;
        link.target = '_blank';
        link.click();
    }

    return <ModalDialog>
        <ModalClose />
        <DialogTitle>{dict.dialogs.DownloadTimetableDialog.title}</DialogTitle>
        <DialogContent>
            <p>{dict.dialogs.DownloadTimetableDialog.description}</p>
            <div className="grid grid-cols-2 gap-4 pt-4">
                <Button
                    onClick={handleDownloadCalendar}
                    variant="outlined"
                    startDecorator={<Download className="w-4 h-4" />}
                >{dict.dialogs.DownloadTimetableDialog.buttons.ICS}</Button>
                <DownloadTimetableComponent/>
            </div>
        </DialogContent>
    </ModalDialog>
}

export default DownloadTimetableDialog;