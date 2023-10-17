import { PropsWithChildren } from 'react'
import Fade from '@/components/Animation/Fade';

export const metadata = {
    title: '課表 Courses | NTHUMods'
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}