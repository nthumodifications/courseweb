import {SettingsProvider} from '@/hooks/contexts/settings';
import { Inter } from 'next/font/google'
import './globals.css'

import Header from '@/components/Header'
import SideNav from '@/components/SideNav'
import Footer from '@/components/Footer'

import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import ModalProvider from '@/hooks/contexts/useModal';
import { LangProps } from '@/types/pages';
import { CssVarsProvider } from '@mui/joy';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NTHUMods',
  description: 'NTHUMods is a course selection system for National Tsing Hua University, Made with ❤️ by Students',
  themeColor: "#7e1083",
  applicationName: "NTHUMods",
  appleWebApp: {
    title: "NTHUMods",
    statusBarStyle: "black-translucent",
  },
  manifest: '/manifest.json'
}

export default function RootLayout({
  children,
  params
}: {
  children: React.ReactNode
} & LangProps) {

  const theme = cookies().get("theme");

  return (
    <html lang={params.lang} className={`${theme?.value ?? ''} overflow-x-hidden`}>
      <CssVarsProvider defaultMode={(theme?.value as any) ?? 'light'}>
        <ModalProvider>
          <SettingsProvider>
              <body className={`${inter.className} grid grid-cols-1 grid-rows-[64px_40px_calc(100vh-108px)] md:grid-cols-[12rem_auto] md:grid-rows-[64px_calc(100vh-64px)_10rem] bg-white dark:bg-neutral-900 dark:text-white`}>
                <Header/>
                <SideNav/>
                <main className='overflow-auto'>
                  {children}
                </main>
                <Footer/>
              </body>
          </SettingsProvider>
        </ModalProvider>
      </CssVarsProvider>
    </html>
  )
}
