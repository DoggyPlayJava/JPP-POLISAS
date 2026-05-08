import React, { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';

// Halaman yang SELAMAT untuk auto-reload tanpa tanya (tiada borang kritikal)
const SAFE_AUTO_RELOAD_PATHS = [
  '/',
  '/portal',
  '/jpp',
  '/polymart',
  '/kebajikan',
  '/takwim',
  '/akademik',
  '/keusahawanan',
  '/login',
];

// Semak sama ada path semasa selamat untuk auto-reload
function isSafeToAutoReload(pathname: string): boolean {
  return SAFE_AUTO_RELOAD_PATHS.some(
    (safe) => pathname === safe || pathname.startsWith(safe + '/')
  );
}

export function PwaUpdater() {
  const location = useLocation();
  const updateCalledRef = useRef(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (!r) return;

      // ── Semak SERTA-MERTA bila app dibuka (cold start / reload) ────────────
      // Ini menutup "blind spot" di mana user boleh guna versi lama selama
      // 5 minit penuh sebelum cek pertama berlaku. Delay 1s supaya SW
      // selesai register dulu sebelum kita minta ia semak versi baru.
      setTimeout(() => {
        r.update().catch((err) => console.warn('[PwaUpdater] Startup update check failed:', err));
      }, 1000);

      // ── Semakan berjadual setiap 5 MINIT ─────────────────────────────────
      // Untuk app yang dibiarkan buka lama (cth: pelajar tinggal tab portal)
      const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minit
      const intervalId = setInterval(() => {
        r.update().catch((err) => console.warn('[PwaUpdater] Periodic update check failed:', err));
      }, CHECK_INTERVAL);

      // ── Semak segera apabila pengguna fokus balik ke tab/PWA ─────────────
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          r.update().catch((err) => console.warn('[PwaUpdater] Visibility update check failed:', err));
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // ── Semak apabila pengguna reconnect dari offline ─────────────────────
      const handleOnline = () => {
        r.update().catch((err) => console.warn('[PwaUpdater] Online update check failed:', err));
      };
      window.addEventListener('online', handleOnline);

      // Cleanup — tapi dalam useEffect ini tak ada cleanup hook,
      // jadi guna window event supaya tidak leak memori bila komponen unmount
      // (PwaUpdater adalah singleton yang hidup sepanjang hayat app)
      return () => {
        clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnline);
      };
    },
    onRegisterError(error) {
      console.error('[PwaUpdater] SW Registration Error:', error);
    },
  });

  // ── Semak update apabila user navigate ke halaman lain ───────────────────
  // Ini ensures setiap page transition turut trigger semakan versi
  useEffect(() => {
    // Triggered setiap kali route bertukar
    // Tapi jangan semak kalau dah ada update yang belum diproses
    if (!needRefresh) {
      // Hantar mesej ke SW untuk semak update (jika SW dah register)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => reg.update())
          .catch(() => {}); // Senyap je kalau gagal
      }
    }
  }, [location.pathname]);

  // ── Tindak balas apabila update tersedia ─────────────────────────────────
  useEffect(() => {
    if (!needRefresh || updateCalledRef.current) return;

    const currentPath = location.pathname;

    // STRATEGI AGGRESIF: Auto-reload di semua halaman yang selamat
    // tanpa perlu tanya user — UX lebih lancar untuk pelajar
    if (isSafeToAutoReload(currentPath)) {
      updateCalledRef.current = true;
      console.info('[PwaUpdater] Auto-updating SW on safe page:', currentPath);
      updateServiceWorker(true);
      return;
    }

    // Di halaman yang ada borang/transaksi aktif — tanya user dahulu
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-full text-blue-600 dark:text-blue-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm">Versi Baharu Tersedia</span>
              <span className="text-xs opacity-80 normal-case tracking-normal">
                Sistem telah dikemas kini. Muat semula untuk fungsi terbaharu.
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={() => {
                setNeedRefresh(false);
                toast.dismiss(t.id);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Nanti
            </button>
            <button
              onClick={() => {
                updateCalledRef.current = true;
                toast.dismiss(t.id);
                updateServiceWorker(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Muat Semula Sekarang
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        id: 'pwa-update-prompt',
        className: 'min-w-[320px] !p-4',
      }
    );
  }, [needRefresh, location.pathname]);

  return null;
}
