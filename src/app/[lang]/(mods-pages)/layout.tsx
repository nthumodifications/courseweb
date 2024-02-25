import { Analytics } from '@vercel/analytics/react';
import Header from '@/components/Header';
import SideNav from '@/components/SideNav';
import Footer from '@/components/Footer';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import ConsoleLogger from '@/components/ConsoleLogger';
import { LangProps } from '@/types/pages';

const NTHUModsLayout = ({
    children,
    params
}: {
    children: React.ReactNode
} & LangProps) => {
    return <div className={`grid grid-cols-1 grid-rows-[56px_50px_calc(100vh-106px)] md:grid-cols-[12rem_auto] md:grid-rows-[56px_calc(100vh-56px)_12rem]`}>
        <GoogleAnalytics />
        <ConsoleLogger />
        <Header />
        <SideNav />
        <main className='overflow-y-auto overflow-x-hidden h-full w-full scroll-smooth [&>div]:h-full'>
            {children}
            <Suspense fallback={null}>
                <Analytics />
            </Suspense>
        </main>
        <Footer />
    </div>
}

export default NTHUModsLayout;