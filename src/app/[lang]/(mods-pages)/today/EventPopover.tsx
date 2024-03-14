import { format, isSameDay } from 'date-fns';
import { FC, PropsWithChildren } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarEvent } from './calendar.types';
import { Button } from '@/components/ui/button';
import { Delete, Trash, X } from 'lucide-react';
import { PopoverClose } from '@radix-ui/react-popover';
import { useCalendar } from './calendar_hook';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DialogClose } from '@radix-ui/react-dialog';

const ConfirmDeleteEvent:FC<{ event: CalendarEvent }> = ({ event }) => {
    const { removeEvent } = useCalendar();

    return <Dialog>
        <DialogTrigger asChild>
            <Button size="icon" variant='ghost'>
                <Trash />
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>確認刪除</DialogTitle>
            </DialogHeader>
            <DialogContent>
                <p>確定要刪除這個事件嗎？</p>
            </DialogContent>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">取消</Button>
                </DialogClose>
                <Button variant="destructive" onClick={_ => removeEvent(event)}>刪除</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}

export const EventPopover: FC<PropsWithChildren<{ event: CalendarEvent; }>> = ({ children, event }) => {
    return <Popover>
        <PopoverTrigger asChild>
            {children}
        </PopoverTrigger>
        <PopoverContent>
            <div className='flex flex-col gap-4'>
                <div className='flex flex-row justify-end'>
                    <ConfirmDeleteEvent event={event}/>
                    <PopoverClose asChild>
                        <Button size="icon" variant='ghost'>
                            <X />
                        </Button>
                    </PopoverClose>
                </div>
                <div className='flex flex-row gap-1'>
                    <div className='w-6 py-1'>
                        <div className='w-4 h-4 rounded-full' style={{ background: event.color }}></div>
                    </div>
                    <div className='flex flex-col gap-1 flex-1'>
                        <h1 className='text-xl font-semibold'>{event.title}</h1>
                        {event.allDay ? <p className='text-sm text-slate-500'>{format(event.start, 'yyyy-M-d')} - {format(event.end, 'yyyy-M-d')}</p> :
                            isSameDay(event.start, event.end) ?
                                <p className='text-sm text-slate-500'>{format(event.start, 'yyyy-M-d')} ⋅ {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</p> :
                                <p className='text-sm text-slate-500'>{format(event.start, 'yyyy-M-d HH:mm')} - {format(event.end, 'yyyy-LL-dd HH:mm')}</p>}
                        <p className='text-sm text-slate-500'>{event.details}</p>
                    </div>
                </div>
            </div>
        </PopoverContent>
    </Popover>;
};
