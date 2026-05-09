import { useState, useEffect, useCallback, useRef } from 'react';
import { WifiOff, Wifi, ServerCrash, MessageCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type ConnectionStatus = 'online' | 'offline' | 'server-down';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const JPP_WHATSAPP = 'https://wa.me/601139413699?text=Salam%20JPP%2C%20sistem%20portal%20sedang%20mengalami%20gangguan.%20Mohon%20semak.';

export function OfflineIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [showRecovered, setShowRecovered] = useState(false);
  const failCountRef = useRef(0);
  const prevStatusRef = useRef<ConnectionStatus>('online');

  const checkConnectivity = useCallback(async () => {
    // 1. Internet mati sepenuhnya
    if (!navigator.onLine) {
      failCountRef.current = 0;
      setStatus('offline');
      return;
    }

    // 2. Internet hidup — check server health
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      // Ping Supabase REST endpoint (lightest possible check)
      const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
        headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string },
      });
      clearTimeout(timeout);

      if (res.ok || res.status === 400) {
        // Server is reachable (400 = no table specified, but server responded)
        failCountRef.current = 0;

        if (prevStatusRef.current !== 'online') {
          setShowRecovered(true);
          setTimeout(() => setShowRecovered(false), 3000);
        }
        setStatus('online');
      } else if (res.status >= 500) {
        // Server error (502, 503, 504)
        failCountRef.current += 1;
        if (failCountRef.current >= 2) setStatus('server-down');
      }
    } catch {
      // Network error / timeout / server unreachable
      failCountRef.current += 1;
      if (failCountRef.current >= 2) {
        // Internet is on but server can't be reached = server down
        setStatus('server-down');
      }
    }
  }, []);

  // Track previous status for recovery detection
  useEffect(() => {
    prevStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    const handleOnline = () => setTimeout(() => checkConnectivity(), 1000);
    const handleOffline = () => {
      failCountRef.current = 0;
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkConnectivity();

    // Periodic health check — setiap 30s jika bermasalah, 60s jika ok
    const interval = setInterval(() => {
      checkConnectivity();
    }, status !== 'online' ? 15000 : 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [status, checkConnectivity]);

  const pillBase = 'fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl flex items-center gap-2 border border-white/20';

  return (
    <AnimatePresence mode="wait">
      {/* Tiada Internet */}
      {status === 'offline' && (
        <motion.div
          key="offline"
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className={`${pillBase} bg-red-500/90 shadow-red-500/20`}
        >
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          Tiada Sambungan
        </motion.div>
      )}

      {/* Server/Database Down */}
      {status === 'server-down' && (
        <motion.div
          key="server-down"
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className={`${pillBase} bg-amber-500/90 shadow-amber-500/20`}
        >
          <ServerCrash className="w-3.5 h-3.5 animate-pulse" />
          <span>Pelayan Gangguan</span>
          <span className="w-px h-3 bg-white/30" />
          <motion.button
            onClick={(e) => { e.stopPropagation(); window.open(JPP_WHATSAPP, '_blank'); }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 px-2.5 py-0.5 rounded-full normal-case tracking-normal text-[9px] font-bold transition-colors shadow-lg shadow-emerald-500/30 relative"
          >
            <span className="absolute inset-0 rounded-full bg-emerald-400/50 animate-ping" />
            <MessageCircle className="w-3 h-3 relative z-10" />
            <span className="relative z-10">Hubungi JPP</span>
          </motion.button>
        </motion.div>
      )}

      {/* Connection Recovered */}
      {showRecovered && status === 'online' && (
        <motion.div
          key="recovered"
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className={`${pillBase} bg-emerald-500/90 shadow-emerald-500/20`}
        >
          <Wifi className="w-3.5 h-3.5" />
          Sambungan Dipulihkan
        </motion.div>
      )}
    </AnimatePresence>
  );
}
