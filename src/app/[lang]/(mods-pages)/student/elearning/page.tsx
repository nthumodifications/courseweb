'use client';;
import { Annoucement, ElearningCourse } from "@/types/elearning";
import { AISLoading } from '@/components/Pages/AISLoading';
import { AISError } from '@/components/Pages/AISError';
import { useHeadlessAIS } from '@/hooks/contexts/useHeadlessAIS';
import { AISNotLoggedIn } from '@/components/Pages/AISNotLoggedIn';
import { useQuery } from '@tanstack/react-query';
import { useState } from "react";
import { getAnnouncements, getCourses } from "@/lib/elearning";
import { ScrollArea } from "@/components/ui/scroll-area";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import dynamic from "next/dynamic";
import AnnouncementDetailsDynamic from "./AnnouncementDetailsDynamic.dynamic";
import { useRouter } from "next/navigation";
import { useSettings } from "@/hooks/contexts/settings";
  
const getCourseColor = (raw_id: string, colorMap: Record<string, string>, currentColors: string[]) => {
    const color = colorMap[raw_id];
    if (color) return color;
    // get a hash of the raw_id
    const hash = raw_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return currentColors[hash % currentColors.length];
}


const AnnouncementItem = ({ data, course }: { data: Annoucement, course: ElearningCourse }) => {
    const { colorMap, currentColors } = useUserTimetable();
    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="py-2 px-3 flex flex-row gap-1">
                    <div className="flex-1">
                        <div className="font-medium mb-1">{data.title}</div>
                        <div className="flex flex-row gap-2 items-center">
                            <div className="h-3 w-3 rounded-full" style={{ background: getCourseColor(course.raw_id, colorMap, currentColors) }}></div>
                            <div className="text-sm line-clamp-1 flex-1 text-neutral-700 dark:text-neutral-300">{data.courseName}</div>
                        </div>
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

const AnnouncementsContainer = () => {
    const { initializing, getOauthCookies, oauth, loading, error: aisError } = useHeadlessAIS();
    const [page, setPage] = useState(1);

    const { data: announcementDatas, isLoading: annLoading, error: annError } = useQuery({
        queryKey: ['elearning_announcements', initializing],
        queryFn: async () => {
            if (initializing) return null;
            const token = await getOauthCookies(false);
            console.log(token);
            return await getAnnouncements(token?.eeclass!, 'all', page);
        }
    });
    
    const { data: elearningDatas, isLoading, error } = useQuery({
        queryKey: ['elearning', initializing],
        queryFn: async () => {
            if (initializing) return null;
            const token = await getOauthCookies(false);
            return await getCourses(token?.eeclass!);
        }
    });

    const announcements = announcementDatas?.announcements ?? [];

    return (
        <div className="flex flex-col gap-4">
            <div className="font-bold text-lg pl-2">公告</div>
            <ScrollArea className="border-border border rounded-md">
                <div className="flex flex-col divide-y divide-border">
                    {elearningDatas && announcements.map((data) => <AnnouncementItem key={data.courseId} data={data} course={elearningDatas?.find(d => d.courseId == data.courseId)!}/>)}
                </div>
            </ScrollArea>
        </div>
    );
}

const CoursesContainer = () => {
    const { initializing, getOauthCookies, oauth, loading, error: aisError } = useHeadlessAIS();
    const { language } = useSettings();
    const { colorMap, currentColors } = useUserTimetable();

    const { data: elearningDatas = [], isLoading, error } = useQuery({
        queryKey: ['elearning', initializing],
        queryFn: async () => {
            if (initializing) return null;
            const token = await getOauthCookies(false);
            return await getCourses(token?.eeclass!);
        }
    });

    const router = useRouter();

    return (
        <div className="flex flex-col gap-4">
            <div className="font-bold text-lg pl-2">課程列表</div>
            <ScrollArea className="border-border border rounded-md">
                <div className="flex flex-col">
                    {elearningDatas && elearningDatas.map((data, index) => (
                        <div key={data.courseId} className="py-2 px-3 flex flex-row gap-2 items-center cursor-pointer" onClick={() => router.push(`/${language}/student/elearning/${data.raw_id}`)}>
                            <div className="w-4 h-4 rounded-md flex items-center justify-center text-white" style={{ background: getCourseColor(data.raw_id, colorMap, currentColors) }}></div>
                            <div className="flex-1">
                                <div className="font-medium">{data.courseName}</div>
                                <div className="flex flex-row justify-between text-neutral-400 dark:text-neutral-600">
                                    <div className="text-sm">{data.raw_id}</div>
                                    <div className="text-sm line-clamp-1">{data.instructor}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );

}

const ElearningPage = () => {
    const { oauth, loading, error: aisError } = useHeadlessAIS();

    if (!oauth.enabled) return <AISNotLoggedIn />
    if (aisError) return <AISError />
    if (loading) return <AISLoading isAis={false} />

    return (
        <div className="mx-2 md:mx-2 h-full">
            <div className="flex flex-col gap-4 h-full md:flex-row">
                <AnnouncementsContainer />
                <CoursesContainer />
            </div>
        </div>
    )
}

export default ElearningPage;