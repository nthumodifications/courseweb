import { PropsWithChildren } from 'react'
import Fade from '@/components/Animation/Fade';

export const metadata = {
    title: '公告 數位學習平台'
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}