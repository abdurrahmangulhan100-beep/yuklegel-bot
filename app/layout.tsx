import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import { StoreProvider } from '@/lib/store' // StoreProvider eklendi
import { AuthModal } from '@/components/auth/auth-modal'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nakliye Cepte | Yük ve Araç İlan Platformu',
  description:
    'Nakliyeciler için canlı yük & araç ilan pazarı, pratik sefer maliyet ve kâr hesaplayıcı, yakıt hesaplama aracı ve şoför not defteri.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon2.png',
    shortcut: '/icon2.png',
    apple: '/icon2.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nakliye Cepte',
  },
  openGraph: {
    title: 'Nakliye Cepte | Canlı Yük & Araç İlan Platformu',
    description: 'Anlık güncellenen yük ve araç ilanları, sefer maliyet hesaplayıcı.',
    type: 'website',
    locale: 'tr_TR',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#2f6fd6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className="bg-background">
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <AuthProvider>
          <StoreProvider>
            {children}
            <AuthModal />
          </StoreProvider>
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
