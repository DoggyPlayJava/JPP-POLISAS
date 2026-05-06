import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function PwaUpdater() {
  const location = useLocation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Hanya lakukan semakan manual di persekitaran Production 
      // untuk elakkan masalah notifikasi berulang di persekitaran Dev.
      if (r && import.meta.env.PROD) {
        // 1. Semak setiap 1 jam jika app dibiarkan terbuka lama
        setInterval(() => {
          r.update().catch((err) => console.error('SW Update Error:', err));
        }, 60 * 60 * 1000);

        // 2. Semak segera apabila pengguna buka semula app dari latar belakang
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            r.update().catch((err) => console.error('SW Update Error:', err));
          }
        });
      }
    },
    onRegisterError(error) {
      console.error('SW Registration Error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      // Paksa auto-update jika pengguna berada di muka depan (/)
      // Supaya isu cache Service Worker lama boleh diselesaikan tanpa interaksi pelajar.
      if (location.pathname === '/') {
        updateServiceWorker(true);
        return;
      }

      toast(
        (t) => (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-full text-blue-600 dark:text-blue-400">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">Versi Baharu Tersedia</span>
                <span className="text-xs opacity-80 normal-case tracking-normal">Sistem telah dikemas kini. Muat semula untuk menggunakan fungsi terbaharu.</span>
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
          duration: Infinity, // Keep open until user interacts
          id: 'pwa-update-prompt',
          className: 'min-w-[320px] !p-4',
        }
      );
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
