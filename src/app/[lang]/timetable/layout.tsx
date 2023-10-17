import Fade from '@/components/Animation/Fade'
import { PropsWithChildren } from 'react'

export const metadata = {
    title: '時間表 Timetable | NTHUMods'
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}