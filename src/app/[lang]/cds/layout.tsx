import Fade from '@/components/Animation/Fade'
import { PropsWithChildren } from 'react'


//next auth needs nodejs
export const runtime = "nodejs"

export const metadata = {
    title: '選課規劃調查 Course Demand Survey',
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}
