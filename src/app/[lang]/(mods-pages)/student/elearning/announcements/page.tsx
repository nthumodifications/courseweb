'use client';
import {ElearningAnnouncementObject} from "@/types/elearning";
import {AISLoading} from '@/components/Pages/AISLoading';
import {AISError} from '@/components/Pages/AISError';
import {useHeadlessAIS} from '@/hooks/contexts/useHeadlessAIS';
import {AISNotLoggedIn} from '@/components/Pages/AISNotLoggedIn';
import {useQuery} from '@tanstack/react-query';
import Link from "next/link";
import {Divider, List, ListItem, ListItemButton, ListItemContent} from "@mui/joy";
import {useSearchParams} from "next/navigation";
import {useState} from "react";

const ElearningPage = () => {
    const {initializing, getOauthCookies, oauth, loading, error: aisError} = useHeadlessAIS()
    const [requestPage, setRequestPage] = useState(1)

    const {data: elearningDatas, isLoading, error} = useQuery<ElearningAnnouncementObject>({
        queryKey: ['elearning_announcement', initializing, requestPage],
        queryFn: async () => {
            if (initializing) return null;
            const token = await getOauthCookies(true);
            const res = await fetch(`/api/ais_headless/eeclass/announcements?cookie=${token?.eeclass}&page=${requestPage}`);
            return await res.json()
        }
    });
    if (!oauth.enabled) return <AISNotLoggedIn/>
    if (error || aisError) return <AISError/>
    if (isLoading || !elearningDatas || !elearningDatas.announcements) return <AISLoading isAis={false}/>

    return <div className="mx-8 md:mx-3">
        <div className="text-2xl font-bold">Announcements</div>
        <div className="w-32 h-16 bg-blue-300 rounded-xl" onClick={() => {
            console.log(elearningDatas.pageCount)
            setRequestPage((requestPage == elearningDatas.pageCount) ? 1 : requestPage + 1)
        }}>Page {requestPage}</div>
        <br/>
        <List>
            {
                elearningDatas.announcements?.map(ann =>
                    <ListItemContent>
                        <div className="text-lg font-bold">{ann.date} {ann.title} by {ann.announcer}</div>
                        <div className="flex text-md text-gray-400">id: {ann.courseId}, name: {ann.courseName}</div>
                        <div className="ml-3 mr-32 my-5">
                            <div className="text-gray-400" dangerouslySetInnerHTML={{ __html: ann.details ? ann.details.content : "" }}></div>
                            <div className="text-blue-300" dangerouslySetInnerHTML={{ __html: ann.details ? ann.details.attachments : "" }}></div>
                        </div>
                    </ListItemContent>
                )
            }
        </List>
    </div>
}

export default ElearningPage;