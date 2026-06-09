import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SahaNav - Adres Filtreleme',
  description: 'TXT dosyasındaki adresleri ilçe ve mahalleye göre filtreleyin ve navigasyon oluşturun.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased min-h-screen bg-background">
        {children}
      </body>
    </html>
  );
}