
'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';

export function PWAListener() {
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  toast({
                    title: 'Yeni Sürüm Mevcut',
                    description: 'Uygulama güncellendi. Yenilemek ister misiniz?',
                    action: (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => window.location.reload()}
                        className="gap-2"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Yenile
                      </Button>
                    ),
                  });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker kaydı başarısız:', error);
        });
    }
  }, [toast]);

  return null;
}
