'use client';
import {ElearningCourseObject} from "@/types/elearning";
import {AISLoading} from '@/components/Pages/AISLoading';
import {AISError} from '@/components/Pages/AISError';
import {useHeadlessAIS} from '@/hooks/contexts/useHeadlessAIS';
import {AISNotLoggedIn} from '@/components/Pages/AISNotLoggedIn';
import {useQuery} from '@tanstack/react-query';
import Link from "next/link";
import {List, ListItemButton, ListItemContent} from "@mui/joy";
import LoadingPage from "@/components/Pages/LoadingPage";

const ElearningPage = () => {
    const {initializing, getOauthCookies, oauth, loading, error: aisError} = useHeadlessAIS();

    const {data: elearningDatas, isLoading, error} = useQuery<ElearningCourseObject[]>({
        queryKey: ['elearning', initializing],
        queryFn: async () => {
            if (initializing) return null;
            const token = await getOauthCookies(false);
            const res = await fetch(`/api/ais_headless/eeclass/courses?cookie=${token?.eeclass}`);
            return await res.json()
        }
    });
    if (!oauth.enabled) return <AISNotLoggedIn/>
    if (error || aisError) return <AISError/>
    if (loading)  return <AISLoading isAis={false}/>
    if (isLoading || !elearningDatas || elearningDatas.length <= 0) return <LoadingPage />

    return <div className="mx-8 md:mx-3">
        <div className="text-2xl font-bold">Courses</div>
        <br/>
        <List>
            {
                elearningDatas.map((course) => {
                    return <ListItemContent>
                        <Link href={`elearning/announcements?courseId=${course.courseId}`}>
                            <ListItemButton>
                                <div className="text-lg font-bold">{course.grade} {course.courseName}</div>
                            </ListItemButton>
                        </Link>
                        <div className="flex text-md text-gray-400">Instructor: {course.instructor}</div>
                    </ListItemContent>
                })
            }
        </List>
    </div>
}

export default ElearningPage;