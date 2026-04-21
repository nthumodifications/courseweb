import { PropsWithChildren } from 'react'
import Fade from '@/components/Animation/Fade';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '設定 Settings',
    description: '設定 NTHUMods 的個人化偏好，包含語言、主題與通知。Customize your NTHUMods preferences including language, theme, and notifications.',
    robots: {
        index: false,
        follow: false,
    },
}

export default function ClientLayout({ children }: PropsWithChildren<{}>) {
    return <Fade>{children}</Fade>
}