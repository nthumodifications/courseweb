import { PropsWithChildren } from 'react'
import Fade from '@/components/Animation/Fade';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '廠商 Shops',
    description: '查詢國立清華大學校園廠商與商店資訊。Find shops and vendors on the NTHU campus.',
    keywords: ['清大廠商', 'NTHU shops', '清大商店', 'NTHU campus stores', '清大餐廳'],
    openGraph: {
        title: '廠商 | NTHUMods',
        description: '查詢國立清華大學校園廠商與商店資訊。',
        url: 'https://nthumods.com/zh/shops',
    },
    twitter: {
        card: 'summary',
        title: '廠商 | NTHUMods',
        description: '查詢國立清華大學校園廠商與商店資訊。',
    },
    alternates: {
        canonical: 'https://nthumods.com/zh/shops',
        languages: {
            en: 'https://nthumods.com/en/shops',
            zh: 'https://nthumods.com/zh/shops',
        },
    },
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}