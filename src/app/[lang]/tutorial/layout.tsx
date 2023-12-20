import Fade from '@/components/Animation/Fade'
import { PropsWithChildren } from 'react'

export const metadata = {
    title: '教學 Tutorial'
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}