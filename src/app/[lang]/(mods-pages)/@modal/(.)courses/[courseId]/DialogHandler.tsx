'use client';
import {Dialog, DialogContent} from '@/components/ui/dialog';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect, useState } from 'react';

const DialogHandler = ({ children }: PropsWithChildren) => {
    const [open, setOpen] = useState(true);
    const [lastPathname, setLastPathname] = useState<string | null>(null);

    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        // Close the dialog when the route changes
        if (lastPathname && pathname !== lastPathname) {
            setOpen(false);
        }
        setLastPathname(pathname);
    }, [pathname]);

    // If the dialog is closed, navigate back
    useEffect(() => {
        if (!open) {
            router.back();
        }
    }, [open]);

    return <Dialog open={open} onOpenChange={() => setOpen(false)}>
        <DialogContent className='max-h-[90vh] max-w-6xl p-0 gap-0'>
            {children}
        </DialogContent>
    </Dialog>
}

export default DialogHandler;