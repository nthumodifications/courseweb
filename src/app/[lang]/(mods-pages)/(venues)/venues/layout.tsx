import { FC, PropsWithChildren, ReactNode } from 'react';
import Fade from '@/components/Animation/Fade';
import { getVenues } from '@/lib/venues';

type LocationLayoutProps = PropsWithChildren<{
    content: ReactNode,
    sidebar: ReactNode,
}>

import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '地點查詢 Venues',
    description: '查詢國立清華大學校園建築與教室位置，含課程使用時刻表。Find NTHU campus buildings and classroom locations with course timetables.',
    keywords: ['清大地點', 'NTHU venues', '清大教室', 'NTHU classroom', '清大建築', 'NTHU buildings', '清大地圖'],
    openGraph: {
        title: '地點查詢 | NTHUMods',
        description: '查詢國立清華大學校園建築與教室位置，含課程使用時刻表。',
        url: 'https://nthumods.com/zh/venues',
    },
    twitter: {
        card: 'summary',
        title: '地點查詢 | NTHUMods',
        description: '查詢國立清華大學校園建築與教室位置，含課程使用時刻表。',
    },
    alternates: {
        canonical: 'https://nthumods.com/zh/venues',
        languages: {
            en: 'https://nthumods.com/en/venues',
            zh: 'https://nthumods.com/zh/venues',
        },
    },
}

const LocationLayout: FC<LocationLayoutProps> = async ({ content, sidebar, children, ...anything }) => {
    return <div className="h-full grid grid-cols-1 md:grid-cols-[500px_auto] overflow-hidden">
        {sidebar}
        <div className='h-full overflow-y-auto overflow-x-hidden'>
        <Fade>
            {content}
        </Fade>
        </div>
    </div>
}

export default LocationLayout;