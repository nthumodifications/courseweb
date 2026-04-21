import { PropsWithChildren } from 'react'
import Fade from '@/components/Animation/Fade';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '個人成績 Grades',
    description: '查詢個人學業成績記錄。View your personal academic grade records.',
    robots: {
        index: false,
        follow: false,
    },
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}