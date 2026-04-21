import Fade from '@/components/Animation/Fade'
import { Metadata } from 'next'
import { PropsWithChildren } from 'react'

export const metadata: Metadata = {
    title: '時間表 Timetable',
    description: '規劃並管理您的國立清華大學課程時間表。Plan and manage your NTHU personal course timetable.',
    keywords: ['清大課表', 'NTHU timetable', '清大時間表', 'NTHU schedule', '選課規劃', 'course planner'],
    openGraph: {
        title: '時間表 | NTHUMods',
        description: '規劃並管理您的國立清華大學課程時間表。',
        url: 'https://nthumods.com/zh/timetable',
    },
    twitter: {
        card: 'summary',
        title: '時間表 | NTHUMods',
        description: '規劃並管理您的國立清華大學課程時間表。',
    },
    alternates: {
        canonical: 'https://nthumods.com/zh/timetable',
        languages: {
            en: 'https://nthumods.com/en/timetable',
            zh: 'https://nthumods.com/zh/timetable',
        },
    },
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}