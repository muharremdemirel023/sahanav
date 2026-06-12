
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SahaNav - Saha Operasyon Yönetimi',
    short_name: 'SahaNav',
    description: 'Adres filtreleme ve navigasyon yönetim uygulaması.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F2F2F7',
    theme_color: '#007AFF',
    icons: [
      {
        src: 'https://picsum.photos/seed/sahanav/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'https://picsum.photos/seed/sahanav/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
