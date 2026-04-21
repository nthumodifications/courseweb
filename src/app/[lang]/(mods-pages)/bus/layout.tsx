import Fade from '@/components/Animation/Fade'
import { Metadata } from 'next'
import { PropsWithChildren } from 'react'

export const metadata: Metadata = {
    title: '校園公車 Bus Schedule',
    description: '國立清華大學校園公車時間表，含即時到站資訊與路線查詢。NTHU campus bus schedule with real-time arrival info and route search.',
    keywords: ['清大校車', 'NTHU Bus', 'NTHU campus bus', '清大公車時刻表', 'NTHU bus schedule', '清大交通'],
    openGraph: {
        title: '校園公車 | NTHUMods',
        description: '國立清華大學校園公車時間表，含即時到站資訊與路線查詢。',
        url: 'https://nthumods.com/zh/bus',
    },
    twitter: {
        card: 'summary',
        title: '校園公車 | NTHUMods',
        description: '國立清華大學校園公車時間表，含即時到站資訊與路線查詢。',
    },
    alternates: {
        canonical: 'https://nthumods.com/zh/bus',
        languages: {
            en: 'https://nthumods.com/en/bus',
            zh: 'https://nthumods.com/zh/bus',
        },
    },
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}