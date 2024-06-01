import {Edit2} from 'lucide-react';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ShortNameContributeForm = () => {
    return <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">Contribute Short Name</h1>
            <p className="text-sm text-muted-foreground">Make everyone's life easier by contributing a short name for this course</p>
        </div>
        <Alert>
            <Edit2 className="h-4 w-4" />
            <AlertTitle>Don't abuse the system!</AlertTitle>
            <AlertDescription>
                <p>Enter only accurate and relevant information!</p>
                <p>Your submission will contain your Student ID, and will be publicly visible.</p>
            </AlertDescription>
        </Alert>
        <Input placeholder="Short Name" />
        <div className='flex flex-row gap-2 justify-end'>
            <Button variant='outline'>Cancel</Button>
            <Button>Submit</Button>
        </div>
    </div>
}

export default ShortNameContributeForm;