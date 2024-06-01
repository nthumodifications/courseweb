import { FolderSync } from 'lucide-react';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import useDictionary from '@/dictionaries/useDictionary';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useHeadlessAIS } from '@/hooks/contexts/useHeadlessAIS';
import { toast } from '../ui/use-toast';
import { event } from '@/lib/gtag';
import {getStudentCourses} from '@/lib/headless_ais/courses';

const HeadlessSyncCourseButton = () => {
    const dict = useDictionary();
    const { ais, getACIXSTORE } = useHeadlessAIS();
    const { courses, addCourse, deleteCourse } = useUserTimetable();
    const [loading, setLoading] = useState(false);
    const [coursesToAdd, setCoursesToAdd] = useState<string[]>([]);


    useEffect(() => {
        if (coursesToAdd.length > 0) {
            addCourse(coursesToAdd);
            setCoursesToAdd([]);
            toast({
                title: 'Sync Succesful!',
                description: 'Courses are added to your timetable.',
            });
            event({
                action: "sync_ccxp_courses",
                category: "ccxp",
                label: "sync_ccxp_courses",
            });
        }
    }, [courses, coursesToAdd]);


    const handleSync = async () => {
        setLoading(true);
        console.log('sync');
        const ACIXSTORE = await getACIXSTORE();
        const res = await getStudentCourses(ACIXSTORE!);
        if (!res) {
            setLoading(false);
            toast({
                title: 'Sync Failed!',
                description: 'Please try again later.',
            });
            return;
        }
        console.log(res.courses);
        //remove courses that are not in the latest
        const courses_to_remove = Object.values(courses).flat().filter(id => !res.courses.includes(id));
        deleteCourse(courses_to_remove);
        //add courses that are not in the current
        const courses_to_add = res.courses.filter(id => !Object.values(courses).flat().includes(id));
        setCoursesToAdd(courses_to_add);
        console.log('add', courses_to_add, 'remove', courses_to_remove);
        setLoading(false);
    };
    
    if (!ais.enabled) return <></>;
    
    return <Button variant="outline" onClick={handleSync} disabled={loading}>
        {!loading ?
            <><FolderSync className="w-4 h-4 mr-1" /> {dict.timetable.actions.sync_ccxp}</> :
            "Loading"}
    </Button>;
};

export default HeadlessSyncCourseButton;
