'use client';
import {ElearningObject} from "@/types/elearning";
import {AISLoading} from '@/components/Pages/AISLoading';
import {AISError} from '@/components/Pages/AISError';
import {useHeadlessAIS} from '@/hooks/contexts/useHeadlessAIS';
import {AISNotLoggedIn} from '@/components/Pages/AISNotLoggedIn';
import {useQuery} from '@tanstack/react-query';

const ElearningPage = () => {
    const {initializing, getOauthCookies, oauth, loading, error: aisError} = useHeadlessAIS();

    const {data: elearningDatas, isLoading, error} = useQuery<ElearningObject>({
        queryKey: ['eeclass', initializing],
        queryFn: async () => {
            if (initializing) return null;
            const token = await getOauthCookies(true);
            const res = await fetch(`/api/ais_headless/eeclass?cookie=${token?.eeclass}&annPage=1`);
            return await res.json();
        }
    });
    if (!oauth.enabled) return <AISNotLoggedIn/>
    if (error || aisError) return <AISError/>
    if (isLoading || !elearningDatas) return <AISLoading isAis={false}/>
    return <div>
        <div className="text-2xl font-bold">Announcements</div>
        <br/>
        {
            elearningDatas.announcements.map(ann =>
                <div className="rounded-lg border-6 border-white flex flex-col h-24">
                    <div className="flex text-lg">{ann.date} {ann.title} by {ann.announcer}</div>
                    <div className="flex text-md text-gray-400">id: {ann.courseId}, name: {ann.courseName}</div>
                    <a className="flex text-md text-gray-400" href={"https://eeclass.nthu.edu.tw"+ann.url}>url: {ann.url}</a>
                </div>
            )
        }
        <div dangerouslySetInnerHTML={{ __html: "<button>test</button>" }} />
    </div>
}

export default ElearningPage;