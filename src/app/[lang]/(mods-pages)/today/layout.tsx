import Fade from '@/components/Animation/Fade'
import { Metadata } from 'next'
import { PropsWithChildren } from 'react'

export const metadata: Metadata = {
    title: '行事曆 Today',
    description: '查看今日課表與校園行事曆，掌握當天活動與課程安排。View your daily NTHU class schedule and campus calendar.',
    keywords: ['清大行事曆', 'NTHU today', '清大今日課表', 'NTHU daily schedule', '清大活動'],
    openGraph: {
        title: '行事曆 | NTHUMods',
        description: '查看今日課表與校園行事曆，掌握當天活動與課程安排。',
        url: 'https://nthumods.com/zh/today',
    },
    twitter: {
        card: 'summary',
        title: '行事曆 | NTHUMods',
        description: '查看今日課表與校園行事曆，掌握當天活動與課程安排。',
    },
    alternates: {
        canonical: 'https://nthumods.com/zh/today',
        languages: {
            en: 'https://nthumods.com/en/today',
            zh: 'https://nthumods.com/zh/today',
        },
    },
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}