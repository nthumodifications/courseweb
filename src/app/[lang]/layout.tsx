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
    default: 'NTHUMods - 國立清華大學課程資訊平臺',
  },
  description: '國立清華大學課程查詢、課表規劃、校車時間表、地點查詢資料整合平臺。NTHU course search, timetable planner, and campus bus schedule — student-built.',
  applicationName: "NTHUMods",
  metadataBase: new URL("https://nthumods.com"),
  appleWebApp: {
    title: "NTHUMods",
    statusBarStyle: "black-translucent",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  publisher: "@nthumodifications",
  alternates: {
    canonical: "https://nthumods.com",
    languages: {
      "en": "https://nthumods.com/en",
      "zh": "https://nthumods.com/zh"
    }
  },
  category: "education",
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
    "NTHU Student Developers",
    "清華大學選課",
    "清大選課系統",
  ],
  authors: { name: '@nthumodifications', url: 'https://github.com/nthumodifications' },
  creator: '@nthumodifications Team',
  openGraph: {
    type: 'website',
    title: 'NTHUMods - 國立清華大學課程資訊平臺',
    description: '清大課程查詢、課表規劃、校車時間表。NTHU course search, timetable planner, and campus bus schedule.',
    url: 'https://nthumods.com',
    siteName: 'NTHUMods',
    countryName: 'Taiwan',
    locale: 'zh_TW',
    alternateLocale: 'en_US',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NTHUMods - 國立清華大學課程資訊平臺',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NTHUMods - 國立清華大學課程資訊平臺',
    description: '清大課程查詢、課表規劃、校車時間表。NTHU course search, timetable planner, and campus bus schedule.',
    images: ['/images/og-image.png'],
    creator: '@nthumodifications',
    site: '@nthumodifications',
  },
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'NTHUMods',
    url: 'https://nthumods.com',
    description: '國立清華大學課程查詢、課表規劃、校車時間表資料整合平臺。',
    applicationCategory: 'EducationApplication',
    operatingSystem: 'Any',
    inLanguage: ['zh-TW', 'en'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'TWD',
    },
    author: {
      '@type': 'Organization',
      name: 'NTHUModifications',
      url: 'https://github.com/nthumodifications',
    },
    provider: {
      '@type': 'CollegeOrUniversity',
      name: '國立清華大學',
      alternateName: 'National Tsing Hua University',
      url: 'https://www.nthu.edu.tw',
      sameAs: 'https://en.wikipedia.org/wiki/National_Tsing_Hua_University',
    },
  }

  return (
    <CssVarsProvider defaultMode={(theme?.value as any) ?? 'light'}>
      <NextAuthProvider>
        <ReactQuery>
          <SettingsProvider>
            <HeadlessAISProvider>
              <UserTimetableProvider>
                <ModalProvider>
                  <html lang={params.lang} translate="no" className={`${theme?.value ?? ''} ${inter.variable} ${noto.variable}`} suppressHydrationWarning>
                    <head>
                      <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                      />
                    </head>
                    <body>
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
