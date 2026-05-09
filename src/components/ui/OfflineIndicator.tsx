import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-red-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl shadow-red-500/20 flex items-center gap-2 border border-white/20"
        >
          <WifiOff className="w-3.5 h-3.5" />
          Tiada Sambungan
        </motion.div>
      )}
    </AnimatePresence>
  );
}
