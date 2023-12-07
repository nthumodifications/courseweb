import {
    Button,
    DialogContent,
    DialogTitle,
    IconButton,
    Input,
    ModalClose,
    ModalDialog,
} from '@mui/joy';
import { Calendar, Mail, Share } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import useDictionary from '@/dictionaries/useDictionary';

const ShareSyncTimetableDialog = ({ onClose, shareLink, webcalLink, onCopy }: { onClose: () => void, shareLink: string, webcalLink: string, onCopy: () => void }) => {
    
    const dict = useDictionary();
    
    return <ModalDialog>
        <ModalClose />
        <DialogTitle>{dict.dialogs.ShareSyncTimetableDialog.title}</DialogTitle>
        <DialogContent>
            <p>
                {dict.dialogs.ShareSyncTimetableDialog.description}
            </p>
            <Input
                size="lg"
                value={shareLink}
                endDecorator={
                    <IconButton variant="solid" onClick={onCopy}>
                        <Share className="w-5 h-5" />
                    </IconButton>
                } />
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                    <h3 className="text-lg font-semibold">{dict.dialogs.ShareSyncTimetableDialog['category:qr']}</h3>
                    <div className='p-2 bg-white rounded-md w-min'>
                        <QRCodeSVG value={shareLink} />
                    </div>
                </div>
                <div className="flex flex-col space-y-2">
                    <h3 className="text-lg font-semibold">{dict.dialogs.ShareSyncTimetableDialog['category:links']}</h3>
                    <Button
                        component="a"
                        // Subject: Here is My Timetable, Body: My Timetable can be found on NTHUMODS at {shareLink}
                        href={`mailto:?subject=Here is My Timetable&body=My Timetable can be found on NTHUMODS at ${shareLink}`}
                        target='_blank'
                        variant="outlined"
                        startDecorator={<Mail className="w-4 h-4" />}
                    >{dict.dialogs.ShareSyncTimetableDialog.links.email}</Button>
                    <Button
                        disabled={true}
                        target='_blank'
                        variant="outlined"
                        startDecorator={<Calendar className="w-4 h-4" />}
                    >Sync To Calendar</Button>
                </div>
            </div>
        </DialogContent>
    </ModalDialog>
}

export default ShareSyncTimetableDialog;