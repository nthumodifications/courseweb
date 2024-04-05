'use client';
import {ElearningAnnouncementObject, ElearningCourseObject} from "@/types/elearning";
import {AISLoading} from '@/components/Pages/AISLoading';
import {AISError} from '@/components/Pages/AISError';
import {useHeadlessAIS} from '@/hooks/contexts/useHeadlessAIS';
import {AISNotLoggedIn} from '@/components/Pages/AISNotLoggedIn';
import {useQuery} from '@tanstack/react-query';
import {IconButton, List, Stack} from "@mui/joy";
import LoadingPage from "@/components/Pages/LoadingPage";
import {useEffect, useState} from "react";
import CourseSwitcher from "@/app/[lang]/(mods-pages)/student/elearning/CourseSwitcher";
import AnnouncementEmpty from "@/app/[lang]/(mods-pages)/student/elearning/AnnouncementEmpty";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight} from "lucide-react";
import {useCookies} from "react-cookie";
import DownloadLink from "@/app/[lang]/(mods-pages)/student/elearning/DownloadLink";

const ElearningPage = () => {
    const {initializing, getOauthCookies, oauth, loading, error: aisError} = useHeadlessAIS();
    const [selectedCourse, setSelectedCourse] = useState("every");
    const [announcementPage, setAnnouncementPage] = useState(1);

    useEffect(() => {
        setAnnouncementPage(1)
    }, [selectedCourse]);

    const {data: elearningDatas, isLoading, error} = useQuery<ElearningCourseObject[]>({
        queryKey: ['elearning', initializing],
        queryFn: async () => {
            if (initializing) return null;
            const token = await getOauthCookies(false);
            const res = await fetch(`/api/ais_headless/eeclass/courses?cookie=${token?.eeclass}`);
            return await res.json()
        }
    });

    const {data: announcementDatas, isLoading: annLoading, error: annError} = useQuery<ElearningAnnouncementObject>({
        queryKey: ['elearning_announcements', initializing, elearningDatas, selectedCourse, announcementPage],
        queryFn: async () => {
            if (initializing) return null;
            const token = await getOauthCookies(false);
            const res = await fetch(`/api/ais_headless/eeclass/announcements?cookie=${token?.eeclass}&course=${selectedCourse}&page=${announcementPage}`);
            return await res.json()

        }
    });

    const getAttachment = async (url: string, text: string) => {
        if (!oauth.enabled) return
        const res = await fetch(`/api/ais_headless/eeclass/download?cookie=${encodeURIComponent(oauth.eeclassCookie!)}&url=${encodeURIComponent(url)}`);
        if (!res.ok) return
        const blob = await res.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = text.replace(".", "-");
        link.click();
        link.remove();
    }

    if (!oauth.enabled) return <AISNotLoggedIn/>
    if (error || aisError) return <AISError/>
    if (loading) return <AISLoading isAis={false}/>
    if (isLoading || !elearningDatas || elearningDatas.length <= 0) return <LoadingPage/>

    return (
        <div className="mx-8 md:mx-3">
            <CourseSwitcher selectedCourse={selectedCourse}
                            setSelectedCourse={setSelectedCourse}
                            courses={elearningDatas}/>
            {(annLoading || !announcementDatas) ? <LoadingPage/> : <div><List>
                {
                    announcementDatas.pageCount == 0 ?
                        <AnnouncementEmpty/> : announcementDatas.announcements?.map((ann, index) =>
                            <Accordion type="multiple" className="px-10">
                                <AccordionItem value={`announcement${index}`}>
                                    <AccordionTrigger>
                                        <div className="flex flex-col items-start">
                                            <span className="text-semibold text-lg text-start">{ann.title}</span>
                                            <span className="text-sm">{`by ${ann.announcer}, ${ann.date}`}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="text-gray-400"
                                             dangerouslySetInnerHTML={{__html: ann.details ? ann.details.content : ""}}></div>
                                        {
                                            ann.details ? ann.details.attachments.map((link) =>
                                                <DownloadLink text={`${link.text} ${link.filesize}`} onLinkClick={async () => await getAttachment(link.url, link.filename)}/>
                                            ) : "無附加檔案 No attachments"
                                        }

                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        )
                }
            </List>
                <Stack
                    direction="row"
                    justifyContent="center"
                >
                    <IconButton disabled={announcementPage == 1} color="primary" onClick={() => setAnnouncementPage(1)}>
                        <ChevronsLeft/>
                    </IconButton>
                    <IconButton disabled={announcementPage == 1} color="primary"
                                onClick={() => setAnnouncementPage(announcementPage - 1)}>
                        <ChevronLeft/>
                    </IconButton>
                    <IconButton disabled={true} className="text-white">{announcementPage}</IconButton>
                    <IconButton disabled={announcementPage == announcementDatas.pageCount} color="primary"
                                onClick={() => setAnnouncementPage(announcementPage + 1)}>
                        <ChevronRight/>
                    </IconButton>
                    <IconButton disabled={announcementPage == announcementDatas.pageCount} color="primary"
                                onClick={() => setAnnouncementPage(announcementDatas.pageCount)}>
                        <ChevronsRight/>
                    </IconButton>
                </Stack>
            </div>
            }
        </div>
    )
}

export default ElearningPage;