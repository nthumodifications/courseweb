import Header from '@/components/Header';
import SideNav from '@/components/SideNav';
import Footer from '@/components/Footer';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import ConsoleLogger from '@/components/ConsoleLogger';
import { LangProps } from '@/types/pages';
import Link from 'next/link';

const NTHUModsLayout = ({
    children,
    params
}: {
    children: React.ReactNode
} & LangProps) => {
    return <div className={`bg-[url('https://www.ccxp.nthu.edu.tw/img/back_3.jpg')] grid grid-cols-1 grid-rows-[auto_var(--header-height)_var(--content-height)] md:grid-cols-[12rem_auto]`}>
        <div className="w-full h-10 md:col-span-2">
            <div className="bg-nthu-400 h-full flex flex-row items-center justify-center">
                <p className="text-black text-sm mr-4">🎉愚人節快樂~ April Fools! 🎉</p>
                <Link href="https://nthumods.com" className="text-black text-sm flex flex-row gap-2 underline">
                    回到正常頁面 →
                </Link>
            </div>
        </div>
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
        <div className="bg-white p-1 border-solid border-2 border-red-500 w-64 h-32 absolute bottom-0 right-0">
            <div className="bg-[url('https://www.ccxp.nthu.edu.tw/img/back_3.jpg')] border-solid border-2 w-full h-full border-red-500">
                ALOT OF BUGS!!! WILL FIX IT LATER 問題很多！！！ 之後再修
            </div>
        </div>
    </div>
}

export default NTHUModsLayout;