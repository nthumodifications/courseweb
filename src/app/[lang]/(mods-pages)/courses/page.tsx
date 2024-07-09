'use client';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from 'react';
import CourseSearchContainer from './CourseSearchContainer';
import { useRouter } from "next/navigation";

const CourseDialog = () => {
  
  return (<div className="max-h-[calc(var(--content-height)-36px)]">
    <CourseSearchContainer />
  </div>
  );
}

export default CourseDialog;
