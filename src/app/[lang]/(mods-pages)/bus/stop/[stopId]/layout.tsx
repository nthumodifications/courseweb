import { PropsWithChildren } from 'react'
import { Metadata, ResolvingMetadata } from 'next'
import { stops } from '@/const/bus'

type Props = {
    params: { stopId: string; lang: string }
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
    const stopId = params.stopId
    const stopCode = stopId.replace(/[UD]$/, '')
    const stop = stops.find(s => s.code === stopCode)
    const direction = stopId.endsWith('U') ? '上山' : stopId.endsWith('D') ? '下山' : ''
    const directionEn = stopId.endsWith('U') ? 'Uphill' : stopId.endsWith('D') ? 'Downhill' : ''

    const nameZh = stop ? `${stop.name_zh}${direction ? ` ${direction}` : ''}` : stopId
    const nameEn = stop ? `${stop.name_en}${directionEn ? ` ${directionEn}` : ''}` : stopId
    const stopUrl = `https://nthumods.com/${params.lang}/bus/stop/${stopId}`

    return {
        title: `${nameZh} ${nameEn} 公車站`,
        description: `查看 ${nameZh} 公車站的即時到站資訊與時刻表。View real-time bus arrival info and schedule for ${nameEn} stop at NTHU.`,
        keywords: [`清大公車 ${nameZh}`, `NTHU bus ${nameEn}`, '清大校車', 'NTHU campus bus'],
        openGraph: {
            title: `${nameZh} | 校園公車 | NTHUMods`,
            description: `查看 ${nameZh} 公車站的即時到站資訊與時刻表。`,
            url: stopUrl,
        },
        twitter: {
            card: 'summary',
            title: `${nameZh} | 校園公車 | NTHUMods`,
            description: `查看 ${nameZh} 公車站的即時到站資訊與時刻表。`,
        },
        alternates: {
            canonical: stopUrl,
            languages: {
                en: `https://nthumods.com/en/bus/stop/${stopId}`,
                zh: `https://nthumods.com/zh/bus/stop/${stopId}`,
            },
        },
    }
}

export default function BusStopLayout({ children }: PropsWithChildren) {
    return <>{children}</>
}
