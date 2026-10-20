import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { OfflineNotice } from '@/components/OfflineNotice'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { PremiumProvider } from '@/components/PremiumProvider'
import './globals.css'

// Türkçe karakterler (ğ, ş, ı, İ...) için latin-ext alt kümesi gerekli
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nakliye Cepte | Yük ve İlan Platformu',
  description: 'Türkiye’nin güncel ve güvenilir yük, taşıma ve Nakliye ilanları platformu.',
  manifest: '/manifest.json', // PWABuilder için zorunlu olan Web App Manifest bağlantısı
  applicationName: 'Nakliye Cepte',
  appleWebApp: {
    capable: true,
    title: 'Nakliye Cepte',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // çentik / alt çubuk güvenli alanları için
  interactiveWidget: 'resizes-content', // Android'de klavye açılınca arama/form alanları ekrandan taşmasın
  colorScheme: 'light',
  themeColor: '#122c4a', // PWA tema rengi uygulamanın ana rengiyle eşleştirildi
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className={`light ${inter.variable}`}>
      <body className="antialiased">
        {/* İnternet bağlantısı koptuğunda otomatik beliren çevrimdışı uyarı ekranı */}
        <OfflineNotice />
        <ServiceWorkerRegister />
        
        <PremiumProvider>{children}</PremiumProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
