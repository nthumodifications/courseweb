import { PropsWithChildren } from 'react'
import Fade from '@/components/Animation/Fade';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '課程查詢 Course Search',
    description: '搜尋國立清華大學所有課程，包含課程資訊、教師、時段與大綱。Search all NTHU courses by name, instructor, department, or time slot.',
    keywords: ['清大課程查詢', 'NTHU course search', '清大選課', 'NTHU courses', '清華大學課程', 'NTHU course catalog'],
    openGraph: {
        title: '課程查詢 | NTHUMods',
        description: '搜尋國立清華大學所有課程，包含課程資訊、教師、時段與大綱。',
        url: 'https://nthumods.com/zh/courses',
    },
    twitter: {
        card: 'summary',
        title: '課程查詢 | NTHUMods',
        description: '搜尋國立清華大學所有課程，包含課程資訊、教師、時段與大綱。',
    },
    alternates: {
        canonical: 'https://nthumods.com/zh/courses',
        languages: {
            en: 'https://nthumods.com/en/courses',
            zh: 'https://nthumods.com/zh/courses',
        },
    },
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}