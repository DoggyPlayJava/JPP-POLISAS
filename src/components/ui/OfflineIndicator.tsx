import { useState, useEffect, useCallback } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showRecovered, setShowRecovered] = useState(false);

  // Fungsi probe sebenar — ping kecil untuk verify connectivity
  const checkConnectivity = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOffline(true);
      return;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      await fetch('/manifest.webmanifest', { 
        method: 'HEAD', 
        cache: 'no-store',
        signal: controller.signal 
      });
      clearTimeout(timeout);
      if (isOffline) {
        setShowRecovered(true);
        setTimeout(() => setShowRecovered(false), 3000);
      }
      setIsOffline(false);
    } catch {
      setIsOffline(true);
    }
  }, [isOffline]);

  useEffect(() => {
    const handleOnline = () => setTimeout(() => checkConnectivity(), 500);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      if (isOffline) checkConnectivity();
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOffline, checkConnectivity]);

  return (
    <AnimatePresence mode="wait">
      {isOffline && (
        <motion.div
          key="offline"
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-red-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl shadow-red-500/20 flex items-center gap-2 border border-white/20"
        >
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          Tiada Sambungan
        </motion.div>
      )}

      {showRecovered && !isOffline && (
        <motion.div
          key="recovered"
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl shadow-emerald-500/20 flex items-center gap-2 border border-white/20"
        >
          <Wifi className="w-3.5 h-3.5" />
          Sambungan Dipulihkan
        </motion.div>
      )}
    </AnimatePresence>
  );
}
