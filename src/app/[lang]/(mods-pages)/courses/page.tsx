'use client'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from 'react';
import Courses from './courses';
import { Separator } from "@/components/ui/separator";

const CourseDialog = () => {
  const [open, setOpen] = useState(true);
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        Open
      </DialogTrigger>
      <DialogContent className="p-0 h-screen max-w-screen w-screen gap-0">
        <Courses />
      </DialogContent>
    </Dialog>
  );
}

export default CourseDialog;