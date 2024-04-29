'use client';
import {useQuery} from '@tanstack/react-query';
import {getAnnouncements} from '@/lib/elearning';
import {useHeadlessAIS} from '@/hooks/contexts/useHeadlessAIS';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Annoucement, ElearningCourse} from '@/types/elearning';
import useUserTimetable from '@/hooks/contexts/useUserTimetable';
import {Dialog, DialogContent, DialogTrigger} from '@/components/ui/dialog';
import AnnouncementDetailsDynamic from '../AnnouncementDetailsDynamic.dynamic';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CourseDefinition } from '@/config/supabase';

const AnnouncementItem = ({ data }: { data: Annoucement }) => {
    const { colorMap, currentColors } = useUserTimetable();
    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="py-2 px-3 flex flex-row gap-1">
                    <div className="flex-1">
                        <div className="font-medium mb-1">{data.title}</div>
                    </div>
                    <div className="flex flex-col justify-end items-end text-neutral-400 dark:text-neutral-600">
                        <div className="text-sm">{data.announcer}</div>
                        <div className="text-xs">{data.date}</div>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent>
                <AnnouncementDetailsDynamic announcement={data} />
            </DialogContent>
        </Dialog>
    )
}

export const ElearningCoursePage = ({ course, platform, id }: { course: CourseDefinition; platform: string; id: string; }) => {
    const { initializing, getOauthCookies, oauth, loading, error: aisError } = useHeadlessAIS();

    const { data: announcementDatas, isLoading: annLoading, error: annError } = useQuery({
        queryKey: ['elearning_course_ann', initializing, id],
        queryFn: async () => {
            if (initializing) return null;
            const token = await getOauthCookies(false);
            return await getAnnouncements(token?.eeclass!, id, 1);
        }
    });

    const announcements = announcementDatas?.announcements ?? [];

    return (
        <div className="flex flex-col gap-4">
            <div className='flex flex-row items-center'>
                <Button size='sm' variant='ghost' asChild>
                    <Link href="/student/elearning">Dashboard</Link>
                </Button>
                <span className="text-neutral-500 dark:text-neutral-400 text-lg">/</span>
                <div className="font-lg mx-2">{course.name_zh} {course.name_en}</div>
            </div>
            <div className="font-bold text-lg pl-2">公告</div>
            <ScrollArea className="border-border border rounded-md">
                <div className="flex flex-col divide-y divide-border">
                    {announcements.map((data) => <AnnouncementItem key={data.courseId} data={data} />)}
                </div>
            </ScrollArea>
        </div>
    );
};
