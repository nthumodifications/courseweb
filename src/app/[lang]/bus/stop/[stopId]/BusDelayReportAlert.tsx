import {Button, Alert} from '@mui/joy';
import {useState, useEffect} from 'react';
import {Check, X} from 'react-feather';
import {useModal} from '@/hooks/contexts/useModal';
import BusDelayReportDialog from './BusDelayReportDialog';


const BusDelayReportAlert = () => {
    const [show, setShow] = useState(false);
    const [openModal, closeModal] = useModal();
    // Wait for 30 seconds before showing the alert
    useEffect(() => {
        const WAIT_TIME = 30 * 1000;
        // const WAIT_TIME = 1 * 1000;
        const timeout = setTimeout(() => setShow(true), WAIT_TIME);
        return () => clearTimeout(timeout);
    }, []);

    const handleNoDelay = () => {
        setShow(false);
    }

    const handleDelay = () => {
        openModal({
            children: <BusDelayReportDialog onClose={() => {
                closeModal();
                setShow(false);
            }}/>
        })
    }

    if(!show) return <></>;
    
    return <div className='absolute bottom-0 p-3 w-full bg-gradient-to-t from-gray-500/50 dark:from-neutral-900/50 to-transparent flex flex-row'>
        <Alert variant='outlined' color='neutral' sx={{ width: '100%', maxWidth: '28rem' }}>
            <div className='flex flex-col w-full'>
                <h3 className='font-bold text-lg'>誤點嗎？</h3>
                <p className='text-sm'>如果有看到嚴重的誤點，系統會自動提醒其他同學哦</p>
                <div className='flex flex-row justify-end'>
                    <Button variant='plain' color='warning' startDecorator={<Check/>} onClick={handleDelay}>有</Button>
                    <Button variant='plain' color='success' startDecorator={<X/>} onClick={handleNoDelay}>沒有</Button>
                </div>
            </div>
        </Alert>
    </div>
}

export default BusDelayReportAlert;