'use client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from 'react';
import Courses from './courses';

const CourseDialog = () => {
  const [open, setOpen] = useState(true);
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        Open
      </DialogTrigger>
      <DialogContent className="h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] overflow-hidden">
        <Courses />
      </DialogContent>
    </Dialog>
  );
}

export default CourseDialog;