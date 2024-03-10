'use client';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import { CdsCountDefinition, CdsTermDefinition, CourseDefinition } from '@/config/supabase';
import { MinimalCourse } from '@/types/courses';
import {List, ListItem, ListItemButton, ListItemContent} from '@mui/joy';
import {ChevronRight} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {useState} from 'react';

const CoursePicker = ({ termObj, courses }: {
    termObj: CdsTermDefinition,
    courses: (CourseDefinition | { cds_counts: CdsCountDefinition[] })[]
}) => { 
    const [semester, setSemester] = useState(termObj.ref_sem);
    const { lang } = useParams();

    const getColor = (count: number, capacity: number) => {
        // capacity = 0 is gray
        // 0% is green
        // 70% or more is yellow
        // 90% or more is orange
        // 100% or more is red

        if (capacity === 0) {
            return 'gray';
        }

        const percentage = count / capacity;
        if (percentage >= 0) {
            return 'green';
        }
        if (percentage >= 0.7) {
            return 'yellow';
        }
        if (percentage >= 0.9) {
            return 'orange';
        }
        if (percentage >= 1) {
            return 'red';
        }
    }

    return <Tabs defaultValue={termObj.ref_sem} value={semester} onValueChange={setSemester}>
    <TabsList>
        <TabsTrigger value={termObj.ref_sem}>上學期</TabsTrigger>
        <TabsTrigger value={termObj.ref_sem_2}>下學期</TabsTrigger>
    </TabsList>
    <List>
        {courses.filter(m => m.semester == semester).map((course) => (
            <ListItem key={course.raw_id}>
                <Link href={`/${lang}/cds/admin/${termObj.term}/${course.raw_id}`} >
                    <ListItemButton>
                        <ListItemContent>
                            <h2 className="text-xl font-bold text-gray-700 dark:text-neutral-200">{course.department} {course.course}-{course.class} {course.name_zh}</h2>
                            <div className="flex items-center">
                                <div className="w-4 h-4 rounded-full mr-2" style={{ background: getColor((course.cds_counts as unknown as { count: number }).count, course.capacity || 0) }}></div>
                                <p className="text-gray-500 dark:text-neutral-500">{(course.cds_counts as unknown as { count: number }).count}/{course.capacity} 人</p>
                            </div>
                        </ListItemContent>
                        <ChevronRight />
                    </ListItemButton>
                </Link>
            </ListItem>
        ))}
    </List>
</Tabs>
}

export default CoursePicker;