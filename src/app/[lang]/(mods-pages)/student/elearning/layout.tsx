import { PropsWithChildren } from 'react'
import Fade from '@/components/Animation/Fade';

export const metadata = {
    title: '課程學習平台 E-Learning'
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}