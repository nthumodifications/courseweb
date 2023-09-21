import Header from '@/components/Header'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import SideNav from '@/components/SideNav'
import Footer from '@/components/Footer'
import {SettingsProvider} from '@/hooks/contexts/settings';

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
    <SettingsProvider>
      <html lang="en">
        <body className={`${inter.className} grid grid-cols-[12rem_auto] grid-rows-[64px_calc(100vh-64px)_16rem]`}>
          <Header/>
          <SideNav/>
          <main className='overflow-auto'>
            {children}
          </main>
          <Footer/>
        </body>
      </html>
    </SettingsProvider>
  )
}
