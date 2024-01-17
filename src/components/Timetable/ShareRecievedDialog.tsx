import { useSettings } from '@/hooks/contexts/settings';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import { Button, DialogActions, DialogContent, DialogTitle, ModalClose, ModalDialog } from '@mui/joy';
import { useRouter } from 'next/navigation';
import { use } from 'react';

const ShareRecievedDialog = ({ onClose, courseCodes }: { onClose: () => void, courseCodes: {[sem: string]: string[]} }) => {
    const { language } = useSettings();
    const { setCourses } = useUserTimetable();
    const router = useRouter();

    return (
        <ModalDialog>
            <ModalClose />
            <DialogTitle>You opened a share link!</DialogTitle>
            <DialogContent>
                What would you like to do with the imported courses?
                <span className="text-sm text-gray-400">*Importing courses will replace all your current courses!</span>
            </DialogContent>
            <DialogActions>
                <Button variant="plain" onClick={onClose} color="warning" >Cancel</Button>
                <Button variant="outlined" onClick={() => {
                    setCourses(courseCodes!);
                    onClose();
                }} color="danger">Import</Button>
                <Button variant="outlined" onClick={() => {
                    router.push('/'+language+'/timetable/view?' + Object.keys(courseCodes).map(sem => `semester_${sem}=${courseCodes[sem].map(id => encodeURI(id)).join(',')}`).join('&'));
                    onClose();
                }}>View</Button>
            </DialogActions>
        </ModalDialog>
    )
}

export default ShareRecievedDialog;