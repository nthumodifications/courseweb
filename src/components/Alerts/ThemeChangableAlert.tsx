import useDictionary from "@/dictionaries/useDictionary";
import { Alert, Button, IconButton } from "@mui/joy"
import Link from "next/link";
import React from "react";
import { Info, X } from "lucide-react"
import { useLocalStorage } from "usehooks-ts"

const ThemeChangableAlert = () => {
    const [open, setOpen] = useLocalStorage('theme_changable_alert', true);
    const dict = useDictionary();

    if(!open) return <></>;

    return <Alert 
        variant="outlined" 
        color="success" 
        startDecorator={
            <Info/>
        }
        endDecorator={
            <React.Fragment>
                <Link href="/settings">
                    <Button variant="plain" color="success" sx={{ mr: 1 }} onClick={() => setOpen(false)}>
                        {dict.alerts.TimetableCourseList.action}
                    </Button>
                </Link>
                <IconButton variant="soft" color="success" onClick={() => setOpen(false)}>
                    <X />
                </IconButton>
            </React.Fragment>
        }
    >
        {dict.alerts.TimetableCourseList.text}
    </Alert>
}

export default ThemeChangableAlert