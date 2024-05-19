'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { MessageCircle } from 'lucide-react';
import { genericIssueFormAction } from './GenericIssueFormDialog.action';
import { DialogDescription } from '@radix-ui/react-dialog';
import { useFormStatus } from 'react-dom';
import { useState } from 'react';
import { toast } from '../ui/use-toast';

const placeholderIssueDescription = 
`   **Describe the issue**
A clear and concise description of what the issue is.

   **To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

   **Expected behavior**
A clear and concise description of what you expected to happen.
`

const GenericIssueForm = () => {
    const { pending } = useFormStatus();
    const [open, setOpen] = useState(false);

    const action = async (form: FormData) => {
        const res = await genericIssueFormAction(form);
        if(res && 'error' in res && res.error) {
            console.error(res.error.message);
            toast({
                title: 'Error Occured',
                description: res.error.message,
            })
            return;
        }
        setOpen(false);
        toast({
            title: 'Issue Submitted',
            description: 'Thank you for your feedback!',
        })
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <MessageCircle size="16" />
                    <span className="hidden md:inline-block">Feedback</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>What's the issue?</DialogTitle>
                    <DialogDescription>Don't worry~ It's somewhat anonymous</DialogDescription>
                </DialogHeader>
                <form action={action} className="flex flex-col max-w-2xl gap-4">
                    <div className='flex flex-col gap-2'>
                        <Label htmlFor='title'>{"標題 Title"}</Label>
                        <Input id="title" name="title" placeholder="Whats the feature/bug you're facing" disabled={pending}/>
                    </div>
                    <div className='flex flex-col gap-2'>
                        <Label htmlFor='description'>{"詳情 Describe your issue"}</Label>
                        <Textarea id="description" name="description" placeholder={placeholderIssueDescription} disabled={pending}/>
                        <p className="text-xs">{"Be as detailed as you can, and leave a contact if you'd like a follow up"}</p>
                        <p className="text-xs">{"Markdown GFM enabled!"}</p>
                    </div>
                    <div className='flex flex-row gap-2 justify-end'>
                        <Button type='submit' disabled={pending}>Submit</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default GenericIssueForm;