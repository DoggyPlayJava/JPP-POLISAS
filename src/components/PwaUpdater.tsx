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

// ── Module-level guard: betul-betul kekal merentasi render cycles & route changes ──
// Ini lebih selamat dari useRef kerana ia tidak boleh di-reset oleh React
let _updateHasBeenTriggered = false;

export function PwaUpdater() {
  const location = useLocation();

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (!r) return;

      // ── Semak SERTA-MERTA bila app dibuka (cold start / reload) ────────────
      // Delay 1.5s supaya SW selesai register & activate dulu
      setTimeout(() => {
        r.update().catch((err) => console.warn('[PwaUpdater] Startup update check failed:', err));
      }, 1500);

      // ── Semakan berjadual setiap 5 MINIT ─────────────────────────────────
      const CHECK_INTERVAL = 5 * 60 * 1000;
      const intervalId = setInterval(() => {
        // Jangan semak kalau update dah dalam proses
        if (!_updateHasBeenTriggered) {
          r.update().catch((err) => console.warn('[PwaUpdater] Periodic update check failed:', err));
        }
      }, CHECK_INTERVAL);

      // ── Semak apabila pengguna fokus balik ke tab/PWA ─────────────────────
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && !_updateHasBeenTriggered) {
          r.update().catch((err) => console.warn('[PwaUpdater] Visibility update check failed:', err));
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // ── Semak apabila pengguna reconnect dari offline ─────────────────────
      const handleOnline = () => {
        if (!_updateHasBeenTriggered) {
          r.update().catch((err) => console.warn('[PwaUpdater] Online update check failed:', err));
        }
      };
      window.addEventListener('online', handleOnline);

      // Cleanup
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
  // DIPISAHKAN dari needRefresh effect — navigation TIDAK patut trigger update flow
  useEffect(() => {
    // Hanya semak kalau tiada update pending dan tiada update dalam proses
    if (!needRefresh && !_updateHasBeenTriggered) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => reg.update())
          .catch(() => {});
      }
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tindak balas apabila update tersedia (needRefresh = true) ────────────
  // PENTING: location.pathname TIDAK ADA dalam deps — navigasi tidak patut
  // re-trigger effect ini. Ini punca utama reload loop.
  useEffect(() => {
    if (!needRefresh) return;

    // Guard mutlak: kalau update dah dipanggil dalam sesi ini, BERHENTI
    if (_updateHasBeenTriggered) return;

    const currentPath = location.pathname;

    const triggerUpdate = () => {
      _updateHasBeenTriggered = true; // Set module-level flag — kekal sampai reload
      console.info('[PwaUpdater] Triggering SW update from path:', currentPath);
      updateServiceWorker(true); // Hantar SKIP_WAITING → SW activate → reload
    };

    // STRATEGI AGGRESIF: Auto-reload senyap di halaman selamat
    if (isSafeToAutoReload(currentPath)) {
      triggerUpdate();
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
                toast.dismiss(t.id);
                triggerUpdate();
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

  // ⚠️ SENGAJA: location.pathname TIDAK ada dalam deps.
  // Kemasukan pathname menyebabkan effect ini run semula setiap kali user navigate,
  // yang boleh trigger updateServiceWorker() berkali-kali → reload loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRefresh]);

  return null;
}
