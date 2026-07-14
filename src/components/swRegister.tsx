'use client';

import { useEffect } from 'react';

export default function SWRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleRegister = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          console.log('[PWA] Service Worker registered with scope:', reg.scope);

          // Check for service worker updates periodically
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New content available; please refresh.');
                }
              });
            }
          });
        } catch (error) {
          console.error('[PWA] Service Worker registration failed:', error);
        }
      };

      if (document.readyState === 'complete') {
        handleRegister();
      } else {
        window.addEventListener('load', handleRegister);
        return () => window.removeEventListener('load', handleRegister);
      }
    }
  }, []);

  return null;
}

