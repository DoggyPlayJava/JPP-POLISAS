import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

export function PwaUpdater() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Set up an event listener to check for updates when the app becomes visible again
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            r.update().catch((err) => {
              console.error('SW Update Error:', err);
            });
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
