import React, { useEffect, useState } from 'react';
import { Trophy, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchEmsLeaderboard, resolveTieWinner, EmsLeaderboardItem } from '@/lib/ems';
import type { EmsEvent } from '@/types';

export interface EmsTieBreakerModalProps {
  event: EmsEvent | null;
  onClose: () => void;
  onTieResolved?: () => void;
}

export function EmsTieBreakerModal({ event, onClose, onTieResolved }: EmsTieBreakerModalProps) {
  const [leaderboard, setLeaderboard] = useState<EmsLeaderboardItem[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
  const [isResolvingTie, setIsResolvingTie] = useState(false);

  useEffect(() => {
    if (!event) return;

    const loadData = async () => {
      setSelectedWinnerId('');
      try {
        setLoadingLeaderboard(true);
        const data = await fetchEmsLeaderboard(event.id);
        setLeaderboard(data);
        const tiedWinner = data.find((d) => d.is_tie_winner);
        if (tiedWinner) {
          setSelectedWinnerId(tiedWinner.participant.id);
        }
      } catch (err: any) {
        toast.error('Gagal memuatkan papan kedudukan');
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    loadData();
  }, [event]);

  if (!event) return null;

  const handleResolveTie = async () => {
    if (!selectedWinnerId) {
      toast.error('Sila pilih pasukan/peserta pemenang.');
      return;
    }
    try {
      setIsResolvingTie(true);
      await resolveTieWinner(event.id, selectedWinnerId);
      toast.success('Keputusan tie-breaker berjaya dikemaskini!');
      onTieResolved?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menetapkan pemenang seret');
    } finally {
      setIsResolvingTie(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 dark:bg-slate-950/80 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl relative text-slate-900 dark:text-white animate-in fade-in-50 zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
          aria-label="Tutup Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
            <Trophy className="w-5 h-5" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Penentuan Pemenang (Tie-Breaker)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pilih pemenang manual bagi pasukan/peserta yang mempunyai keputusan markah terikat.
          </p>
        </div>

        {loadingLeaderboard ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 animate-pulse">
            Memuatkan kedudukan keputusan...
          </div>
        ) : leaderboard.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            Tiada peserta berdaftar ditemui untuk acara ini.
          </p>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {leaderboard.map((item) => {
              const isSelected = selectedWinnerId === item.participant.id;
              return (
                <div
                  key={item.participant.id}
                  onClick={() => setSelectedWinnerId(item.participant.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500 text-slate-900 dark:text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">
                        {item.participant.team_name || item.participant.leader_name}
                      </span>
                      {item.is_tied && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                          Terikat (Tie)
                        </span>
                      )}
                      {item.is_tie_winner && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          Pemenang Disahkan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ketua: {item.participant.leader_name} | Markah Purata: {item.average_score}
                    </p>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500 text-slate-950'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleResolveTie}
            disabled={isResolvingTie || !selectedWinnerId}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 active:scale-98"
          >
            {isResolvingTie ? 'Menyimpan...' : 'Sahkan Pemenang'}
          </button>
        </div>
      </div>
    </div>
  );
}
