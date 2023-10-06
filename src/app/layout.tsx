import {SettingsProvider} from '@/hooks/contexts/settings';
import { Inter } from 'next/font/google'
import './globals.css'

import Header from '@/components/Header'
import SideNav from '@/components/SideNav'
import Footer from '@/components/Footer'

import type { Metadata } from 'next'
import ModalProvider from '@/hooks/contexts/useModal';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tsinghua Course Web',
  description: 'A student-made course web for Tsinghua University.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ModalProvider>
      <SettingsProvider>
        <html lang="en">
          <body className={`${inter.className} grid grid-cols-1 grid-rows-[64px_40px_calc(100vh-108px)] md:grid-cols-[12rem_auto] md:grid-rows-[64px_calc(100vh-64px)_16rem] `}>
            <Header/>
            <SideNav/>
            <main className='overflow-auto'>
              {children}
            </main>
            <Footer/>
          </body>
        </html>
      </SettingsProvider>
    </ModalProvider>
  )
}
