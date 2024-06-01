import type { Metadata } from 'next'
import { LangProps } from '@/types/pages';

import { Viewport } from 'next'
import { Inter, Noto_Sans_TC } from 'next/font/google';
import { cookies } from 'next/headers'
import { SettingsProvider } from '@/hooks/contexts/settings';
import ModalProvider from '@/hooks/contexts/useModal';
import {UserTimetableProvider} from '@/hooks/contexts/useUserTimetable';
import {HeadlessAISProvider} from '@/hooks/contexts/useHeadlessAIS';

import { CssVarsProvider } from '@mui/joy';
import NextAuthProvider from '@/components/NextAuthProvider';
import { Toaster } from '@/components/ui/toaster';
import ReactQuery from '@/components/ReactQuery';

import './globals.css'
import AppUrlListener from '@/components/AppUrlListener';

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#171717' },
  ],
  userScalable: false,
  initialScale: 1.0,
  minimumScale: 1.0,
  maximumScale: 1.0,
  width: "device-width",
  viewportFit: "cover",
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
        <ReactQuery>
          <SettingsProvider>
            <HeadlessAISProvider>
              <UserTimetableProvider>
                <ModalProvider>
                  <html lang={params.lang} translate="no" className={`${theme?.value ?? ''} ${inter.variable} ${noto.variable}`} suppressHydrationWarning={true}>
                    <body suppressHydrationWarning={true}>
                      {children}
                      <AppUrlListener/>
                      <Toaster />
                    </body>
                  </html>
                </ModalProvider>
              </UserTimetableProvider>
            </HeadlessAISProvider>
          </SettingsProvider>
        </ReactQuery>
      </NextAuthProvider>
    </CssVarsProvider>
  )
}
