import { FolderSync } from 'lucide-react';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import useDictionary from '@/dictionaries/useDictionary';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useHeadlessAIS } from '@/hooks/contexts/useHeadlessAIS';
import { toast } from '../ui/use-toast';
import { event } from '@/lib/gtag';

const HeadlessSyncCourseButton = () => {
    const dict = useDictionary();
    const { ais, getACIXSTORE } = useHeadlessAIS();
    const { courses, addCourse, deleteCourse } = useUserTimetable();
    const [loading, setLoading] = useState(false);
    const [coursesToAdd, setCoursesToAdd] = useState<string[]>([]);

    if (!ais.enabled) return <></>;

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
        const res = await fetch('/api/ais_headless/courses/sync-latest?ACIXSTORE=' + ACIXSTORE).then(res => res.json()) as {
            semester: string;
            phase: string;
            studentid: string;
            courses: string[];
        };
        //remove courses that are not in the latest
        const courses_to_remove = (courses[res.semester] ?? []).filter(id => !res.courses.includes(id));
        deleteCourse(courses_to_remove);
        //add courses that are not in the current
        const courses_to_add = res.courses.filter(id => !(courses[res.semester] ?? []).includes(id));
        setCoursesToAdd(courses_to_add);
        setLoading(false);
    };
    return <Button variant="outline" onClick={handleSync} disabled={loading}>
        {!loading ?
            <><FolderSync className="w-4 h-4 mr-1" /> {dict.timetable.actions.sync_ccxp}</> :
            "Loading"}
    </Button>;
};

export default HeadlessSyncCourseButton;
