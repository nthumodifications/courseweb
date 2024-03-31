import Header from '@/components/Header';
import SideNav from '@/components/SideNav';
import Footer from '@/components/Footer';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import ConsoleLogger from '@/components/ConsoleLogger';
import { LangProps } from '@/types/pages';
import AprilFoolsBanner from '@/components/AprilFoolsBanner';

const NTHUModsLayout = ({
    children,
    params
}: {
    children: React.ReactNode
} & LangProps) => {
    return <div className={`grid grid-cols-1 grid-rows-[auto_var(--header-height)_var(--content-height)] md:grid-cols-[12rem_auto]`}>
        <AprilFoolsBanner/>
        <GoogleAnalytics />
        <ConsoleLogger />
        <Header />
        <div className='hidden md:flex h-screen px-2 pt-8 pl-8'>
            <SideNav />
        </div>
        <main className='overflow-y-auto overflow-x-hidden h-full w-full scroll-smooth [&>div]:h-full pt-8 md:pl-8'>
            {children}
        </main>
        <Footer />
    </div>
}

export default NTHUModsLayout;