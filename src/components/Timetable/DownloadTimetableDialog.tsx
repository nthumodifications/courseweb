import useDictionary from '@/dictionaries/useDictionary';
import {Button, DialogContent, DialogTitle, ModalClose, ModalDialog} from '@mui/joy';
import {Download, Image} from 'react-feather';

const DownloadTimetableDialog = ({ onClose, icsfileLink, imageLink }: { onClose: () => void, icsfileLink: string, imageLink: string }) => {
    const dict = useDictionary();

    return <ModalDialog>
        <ModalClose />
        <DialogTitle>{dict.dialogs.DownloadTimetableDialog.title}</DialogTitle>
        <DialogContent>
            <p>{dict.dialogs.DownloadTimetableDialog.description}</p>
            <div className="grid grid-cols-2 gap-4 pt-4">
                <Button
                    component="a"
                    href={icsfileLink}
                    target='_blank'
                    variant="outlined"
                    startDecorator={<Download className="w-4 h-4" />}
                >{dict.dialogs.DownloadTimetableDialog.buttons.ICS}</Button>
                <Button
                    component="a"
                    href={imageLink}
                    target='_blank'
                    variant="outlined"
                    startDecorator={<Image className="w-4 h-4" />}
                >{dict.dialogs.DownloadTimetableDialog.buttons.image}</Button>
            </div>
        </DialogContent>
    </ModalDialog>
}

export default DownloadTimetableDialog;