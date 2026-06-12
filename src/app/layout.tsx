
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWAListener } from '@/components/PWAListener';

export const metadata: Metadata = {
  title: 'SahaNav - Adres Filtreleme',
  description: 'TXT dosyasındaki adresleri ilçe ve mahalleye göre filtreleyin ve navigasyon oluşturun.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SahaNav',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#007AFF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased min-h-screen bg-background">
        <PWAListener />
        {children}
      </body>
    </html>
  );
}
