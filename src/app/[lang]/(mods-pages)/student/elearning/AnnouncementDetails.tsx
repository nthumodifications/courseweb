'use client';
import { Annoucement } from "@/types/elearning";
import { useHeadlessAIS } from '@/hooks/contexts/useHeadlessAIS';
import { useQuery } from '@tanstack/react-query';
import LoadingPage from "@/components/Pages/LoadingPage";
import { getAnnouncementDetails } from "@/lib/elearning";
import DownloadLink from "./DownloadLink";
import { Loader2 } from "lucide-react";

const AnnouncementDetails = ({ announcement }: { announcement: Annoucement; }) => {
    const { initializing, getOauthCookies, error: aisError } = useHeadlessAIS();

    const { data, isLoading, error } = useQuery({
        queryKey: ['elearning_announcement_details', initializing, announcement.detailsURL],
        queryFn: async () => {
            if (initializing) return null;
            const token = await getOauthCookies(false);
            return await getAnnouncementDetails((token?.eeclass)!, announcement.detailsURL);
        }
    });

    if (isLoading || !data) return <Loader2 className="animate-spin"/>;

    return (
        <div className="p-4">
            <div className="font-bold text-lg">{announcement.title}</div>
            <div className="mt-2 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: data.content }}></div>
            {data.attachments.length > 0 && (
                <div className="mt-2">
                    <div className="font-bold">附件</div>
                    <div className="mt-2">
                        {data.attachments.map((attachment, index) => (
                            <DownloadLink key={index} text={attachment.text} url={attachment.url} filename={attachment.filename} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnouncementDetails;