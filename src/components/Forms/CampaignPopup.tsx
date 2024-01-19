'use client'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const CampaignPopup = () => {
    return (
        <AlertDialog open>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Idea Survey #1</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you satisfied with the current timetable?
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogAction>Yes</AlertDialogAction>
                <AlertDialogAction>Yes</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    )
}

export default CampaignPopup;