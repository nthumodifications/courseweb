import {Toaster} from '@/components/ui/toaster';
import AppUrlListener from '@/components/AppUrlListener';
import {cookies} from 'next/headers';
import {Viewport, Metadata} from 'next';
import {Inter, Noto_Sans_TC} from 'next/font/google';
import '../[lang]/globals.css';

export const metadata: Metadata = {
  title: "NTHUMods OAuth Server",
  description: '國立清華大學課表、校車時間表、資料整合平臺，學生主導、學生自主開發。',
  applicationName: "NTHUMods",
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
}: {
  children: React.ReactNode
}) {
  const theme = cookies().get("theme");
  return (
    <html translate="no" className={`${theme?.value ?? ''} ${inter.variable} ${noto.variable}`} suppressHydrationWarning>
      <body>
        {children}
        <AppUrlListener/>
        <Toaster />
      </body>
    </html>
  )
}
