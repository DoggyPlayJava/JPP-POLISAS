import React from 'react';
import { Award } from 'lucide-react';
import type { EmsEvent } from '@/types';

interface EmsCompleteConfirmModalProps {
  event: EmsEvent | null;
  onClose: () => void;
  onConfirm: (eventId: string) => void;
}

export const EmsCompleteConfirmModal: React.FC<EmsCompleteConfirmModalProps> = ({
  event,
  onClose,
  onConfirm,
}) => {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
          <Award className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Sahkan Penyelesaian Acara?
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Acara <strong className="text-slate-900 dark:text-white">&quot;{event.title}&quot;</strong> akan ditandakan sebagai <strong>SELESAI</strong>. Sistem akan menjana e-sijil secara automatik untuk semua peserta dan markah juri akan dikunci daripada sebarang pindaan lanjut.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              const id = event.id;
              onClose();
              onConfirm(id);
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md shadow-amber-500/20 active:scale-[0.98]"
          >
            Sahkan &amp; Selesaikan
          </button>
        </div>
      </div>
    </div>
  );
};
