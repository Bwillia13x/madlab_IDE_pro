'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function ServiceWorkerRegistration() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setIsUpdateAvailable(true);
                toast.info('New version available! Click to update.', {
                  action: {
                    label: 'Update',
                    onClick: () => updateServiceWorker(registration),
                  },
                });
              }
            });
          }
        });

        // Handle service worker updates
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

        console.log('Service Worker registered successfully:', registration);
      } catch (error) {
        console.error('ServiceWorker registration failed:', error);
      }
    }
  }, []);

  useEffect(() => {
    registerServiceWorker();
  }, [registerServiceWorker]);

  const updateServiceWorker = async (registration: ServiceWorkerRegistration) => {
    if (registration.waiting) {
      setIsInstalling(true);
      
      // Send message to waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait a bit for the update to complete
      setTimeout(() => {
        setIsInstalling(false);
        setIsUpdateAvailable(false);
        window.location.reload();
      }, 1000);
    }
  };



  // Don't render anything if service workers are not supported
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  return (
    <>
      {/* Update notification */}
      {isUpdateAvailable && (
        <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Update Available</h4>
              <p className="text-xs text-blue-100 mt-1">
                A new version of MAD LAB Workbench is available
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                  updateServiceWorker(registration);
                }
              }}
              disabled={isInstalling}
              className="ml-3 bg-white text-blue-600 hover:bg-blue-50"
            >
              {isInstalling ? 'Updating...' : 'Update Now'}
            </Button>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      <OfflineIndicator />
    </>
  );
}

function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-4 left-4 z-50 bg-red-600 text-white px-3 py-2 rounded-md shadow-lg text-sm">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>You're offline</span>
      </div>
    </div>
  );
}
