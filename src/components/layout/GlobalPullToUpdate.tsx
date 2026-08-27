import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GlobalPullToUpdate() {
  const location = useLocation();
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Gunakan useRef untuk mengelakkan useEffect di-reset semasa pengguna sedang menarik skrin (touchmove)
  const isRefreshingRef = React.useRef(false);
  const pullProgressRef = React.useRef(0);

  // Pilihan 1: Tutup Pull-to-Refresh 100% di PolyMaps (Route Exclusion)
  const isPolyMaps = location.pathname.startsWith('/polymaps') || location.pathname.startsWith('/jpp/polymaps');

  useEffect(() => {
    if (isPolyMaps) return; // Batalkan pendaftaran pengesan sentuhan jika di PolyMaps

    let startY = 0;
    let isPulling = false;

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshingRef.current) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      // Only handle pull down when user is at the very top of the page
      if (deltaY > 0) {
        if (e.cancelable) e.preventDefault();

        // Max pull visual progress is 150px
        const progress = Math.min((deltaY / 150) * 100, 100);
        pullProgressRef.current = progress;
        setPullProgress(progress);
      }
    };

    const cleanupActivePull = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshingRef.current) return;
      isPulling = false;
      cleanupActivePull();

      // If user pulled down more than 80% of the threshold, trigger the update
      if (pullProgressRef.current > 80) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);

        try {
          // 1. Force Service Worker to Update (OTA Update)
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              await registration.update();
            }
          }
        } catch (err) {
          console.error("SW Update failed", err);
        }

        // 2. Set a flag so useDashboardData knows to force-refresh on next mount
        try {
          sessionStorage.setItem('jpp_force_refresh', '1');
        } catch (_) { /* sessionStorage mungkin tidak tersedia */ }

        // 3. Hard Reload — clear semua React state + in-memory cache
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        pullProgressRef.current = 0;
        setPullProgress(0);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;

      // Check if user is at the top of the viewport (fast 0.01ms check, no getComputedStyle)
      const isAtTop = window.scrollY <= 0 && (document.documentElement?.scrollTop ?? 0) <= 0;

      if (isAtTop && e.touches.length === 1) {
        startY = e.touches[0].clientY;
        isPulling = true;
        pullProgressRef.current = 0;

        // Dynamically attach touchmove ONLY during potential pull gesture
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.addEventListener('touchcancel', handleTouchEnd, { passive: true });
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      cleanupActivePull();
    };
  }, [isPolyMaps]); // React akan pasang balik listener jika keluar dari kawasan PolyMaps

  if (isPolyMaps) return null; // Sembunyikan terus komponen UI

  return (
    <AnimatePresence>
      {(pullProgress > 0 || isRefreshing) && (
        <motion.div
          initial={{ y: -50, opacity: 0, scale: 0.8 }}
          animate={{ 
            y: isRefreshing ? 30 : Math.min(pullProgress * 0.4, 40), 
            opacity: isRefreshing ? 1 : pullProgress / 100,
            scale: isRefreshing ? 1 : 0.8 + (pullProgress / 100) * 0.2
          }}
          exit={{ y: -50, opacity: 0, scale: 0.8 }}
          className="fixed top-[env(safe-area-inset-top)] left-1/2 -translate-x-1/2 z-[9999] pointer-events-none mt-4"
        >
          {/* Glassmorphic Container with Rotating Gradient Border */}
          <div className="relative p-[2px] rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)]">
            {isRefreshing && (
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0_340deg,hsl(var(--primary))_360deg)] animate-spin" style={{ animationDuration: '1s' }} />
            )}
            
            <div className={cn(
              "w-10 h-10 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 flex items-center justify-center relative z-10 transition-transform duration-300",
              isRefreshing ? "scale-95" : "scale-100"
            )}>
              <RefreshCw 
                strokeWidth={3}
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isRefreshing ? "text-primary animate-spin" : "text-slate-400 dark:text-slate-500"
                )} 
                style={{ 
                  transform: isRefreshing ? 'rotate(0deg)' : `rotate(${pullProgress * 3}deg)` 
                }} 
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
