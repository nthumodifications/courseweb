'use client';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from 'react';
import CourseSearchContainer from './CourseSearchContainer';
import { useRouter } from "next/navigation";

const CourseDialog = () => {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  //first load open dialog
  useEffect(() => {
    setOpen(true);
  }, [])

  //if closed, navigate to timetable page
  useEffect(() => {
    if (!open) {
      router.push('/timetable')
    }
  }, [open])
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        Open
      </DialogTrigger>
      <DialogContent className="p-0 h-screen max-w-screen w-screen gap-0">
        <CourseSearchContainer />
      </DialogContent>
    </Dialog>
  );
}

export default CourseDialog;
