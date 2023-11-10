import Fade from '@/components/Animation/Fade'
import { PropsWithChildren } from 'react'


//next auth needs nodejs
export const runtime = "nodejs"

export const metadata = {
    title: '選課意願調查 Course Demand Survey | NTHUMods',
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}
