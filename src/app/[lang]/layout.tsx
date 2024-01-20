import { Analytics } from '@vercel/analytics/react';
import { SettingsProvider } from '@/hooks/contexts/settings';
import './globals.css'

import Header from '@/components/Header'
import SideNav from '@/components/SideNav'
import Footer from '@/components/Footer'

import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import ModalProvider from '@/hooks/contexts/useModal';
import { LangProps } from '@/types/pages';
import { CssVarsProvider } from '@mui/joy';
import NextAuthProvider from '@/components/NextAuthProvider';
import { Viewport } from 'next'
import GoogleAnalytics from '@/components/GoogleAnalytics';
import {UserTimetableProvider} from '@/hooks/contexts/useUserTimetable';
import { Inter, Noto_Sans_TC } from 'next/font/google';
import { Suspense } from 'react';
import {HeadlessAISProvider} from '@/hooks/contexts/useHeadlessAIS';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: {
    template: '%s | NTHUMods',
    default: 'NTHUMods',
  },
  description: '國立清華大學課表、校車時間表、資料整合平臺，學生主導、學生自主開發。',
  applicationName: "NTHUMods",
  metadataBase: new URL("https://nthumods.com"),
  appleWebApp: {
    title: "NTHUMods",
    statusBarStyle: "black-translucent",
  },
  robots: "index, follow",
  publisher: "@nthumodifications",
  alternates:  {
    canonical: "https://nthumods.com", 
    languages: { 
      "en": "https://nthumods.com/en",
      "zh": "https://nthumods.com/zh"
    }
  },
  category: "education, reference, courses, timetable, nthu, nthumods, nthumodifications, bus timetable",
  keywords: [
    "國立清華大學",
    "國立清華大學課程查詢",
    "國立清華大學課程",
    "國立清華大學課表",
    "國立清華大學校車",
    "清大課程查詢",
    "清大課程",
    "清大課表",
    "清大校車",
    "清大",
    "NTHU",
    "NTHUMods",
    "NTHUModifications",
    "NTHU Course",
    "NTHU Mods",
    "NTHU Modifications",
    "NTHU Course Search",
    "NTHU Course Timetable",
    "NTHU Bus Timetable",
    "NTHU Bus",
    "NTHU Bus Schedule",
    "NTHU Bus Timetable",
    "NTHU Student Developers"
  ],
  authors: { name: '@nthumodifications', url: 'https://github.com/nthumodifications' },
  creator: '@nthumodifications Team',
  openGraph: {
    type: 'website',
    title: 'NTHUMods',
    description: '清大課表、校車時間表、資料整合平臺，學生主導、學生自主開發。',
    url: 'https://nthumods.com',
    siteName: 'NTHUMods',
    countryName: 'Taiwan',
    locale: 'en, zh'
  }
}

export const viewport: Viewport = {
  themeColor: "#7e1083",
  userScalable: false,
}

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
})

const noto = Noto_Sans_TC({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-noto',
})

export default function RootLayout({
  children,
  params
}: {
  children: React.ReactNode
} & LangProps) {

  const theme = cookies().get("theme");

  return (
    <CssVarsProvider defaultMode={(theme?.value as any) ?? 'light'}>
      <NextAuthProvider>
        <SettingsProvider>
          <HeadlessAISProvider>
            <UserTimetableProvider>
              <ModalProvider>
                <html lang={params.lang} className={`${theme?.value ?? ''} ${inter.variable} ${noto.variable}`} suppressHydrationWarning>
                  <GoogleAnalytics/>
                  <body className={`grid grid-cols-1 grid-rows-[56px_50px_calc(100vh-106px)] md:grid-cols-[12rem_auto] md:grid-rows-[56px_calc(100vh-56px)_12rem]`}>
                    <Header />
                    <SideNav />
                    <main className='overflow-y-auto overflow-x-hidden h-full w-full scroll-smooth [&>div]:h-full'>
                      {children}
                      <Suspense fallback={null}>
                        <Analytics />
                      </Suspense>
                    </main>
                    <Footer />
                    <Toaster />
                  </body>
                </html>
              </ModalProvider>
            </UserTimetableProvider>
          </HeadlessAISProvider>
        </SettingsProvider>
      </NextAuthProvider>
    </CssVarsProvider>
  )
}
