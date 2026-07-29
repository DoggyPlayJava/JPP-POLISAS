import React, { useEffect, useState, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import {
  Sparkles,
  Trophy,
  X,
  RotateCw,
  Award,
  Users,
  UserCheck,
  History,
  Trash2,
  Gift,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { EmsVisitor, EmsParticipant } from '@/types';

export interface LuckyDrawCandidate {
  id: string;
  name: string;
  matrixNo?: string | null;
  email?: string | null;
  phone?: string | null;
  sourceType: 'VISITOR' | 'PARTICIPANT';
  subText?: string;
}

export interface EmsLuckyDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
  eventTitle?: string;
}

export function EmsLuckyDrawModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
}: EmsLuckyDrawModalProps) {
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'VISITORS' | 'PARTICIPANTS'>('ALL');
  const [candidates, setCandidates] = useState<LuckyDrawCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Spinning / Reel animation states
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayedCandidate, setDisplayedCandidate] = useState<LuckyDrawCandidate | null>(null);
  const [currentWinner, setCurrentWinner] = useState<LuckyDrawCandidate | null>(null);
  const [winnerHistory, setWinnerHistory] = useState<LuckyDrawCandidate[]>([]);

  const spinTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Candidates from Supabase using Promise.all
  const loadCandidates = useCallback(async () => {
    try {
      setLoadingCandidates(true);

      let visitorQuery = supabase.from('ems_visitors').select('*');
      let participantQuery = supabase.from('ems_participants').select('*');

      if (eventId) {
        visitorQuery = visitorQuery.eq('event_id', eventId);
        participantQuery = participantQuery.eq('event_id', eventId);
      }

      const [visitorsRes, participantsRes] = await Promise.all([
        visitorQuery,
        participantQuery,
      ]);

      if (visitorsRes.error) {
        console.warn('[LuckyDraw] Error fetching visitors:', visitorsRes.error.message);
      }
      if (participantsRes.error) {
        console.warn('[LuckyDraw] Error fetching participants:', participantsRes.error.message);
      }

      const visitors: EmsVisitor[] = visitorsRes.data || [];
      const participants: EmsParticipant[] = participantsRes.data || [];

      const visitorCandidates: LuckyDrawCandidate[] = visitors.map((v) => ({
        id: `v-${v.id}`,
        name: v.name,
        matrixNo: v.matrix_no,
        email: v.email,
        phone: v.phone,
        sourceType: 'VISITOR',
        subText: v.matrix_no ? `Pengunjung (${v.matrix_no})` : 'Pengunjung Awam',
      }));

      const participantCandidates: LuckyDrawCandidate[] = participants.map((p) => ({
        id: `p-${p.id}`,
        name: p.team_name || p.leader_name,
        matrixNo: p.matrix_no,
        email: p.email,
        phone: p.phone,
        sourceType: 'PARTICIPANT',
        subText: p.leader_name ? `Peserta (Ketua: ${p.leader_name})` : 'Peserta Acara',
      }));

      let combined: LuckyDrawCandidate[] = [];
      if (sourceFilter === 'ALL') {
        combined = [...visitorCandidates, ...participantCandidates];
      } else if (sourceFilter === 'VISITORS') {
        combined = visitorCandidates;
      } else if (sourceFilter === 'PARTICIPANTS') {
        combined = participantCandidates;
      }

      // Deduplicate by name + matrixNo/email
      const uniqueCandidates = combined.filter(
        (c, idx, self) =>
          idx === self.findIndex((t) => t.name.toLowerCase() === c.name.toLowerCase())
      );

      setCandidates(uniqueCandidates);
    } catch (err: any) {
      console.error('[LuckyDraw] Failed to load candidates:', err);
      toast.error('Gagal memuatkan senarai calon cabutan bertuah');
    } finally {
      setLoadingCandidates(false);
    }
  }, [eventId, sourceFilter]);

  useEffect(() => {
    if (isOpen) {
      loadCandidates();
    }
  }, [isOpen, loadCandidates]);

  // Clean up spin animation timer on unmount
  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearInterval(spinTimerRef.current);
    };
  }, []);

  const triggerWinnerConfetti = () => {
    const end = Date.now() + 3.5 * 1000;
    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#fbbf24'];

    (function frame() {
      confetti({
        particleCount: 8,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.6 },
        colors,
      });
      confetti({
        particleCount: 8,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.6 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  const handleStartSpin = () => {
    // Filter out already drawn winners
    const historyIds = new Set(winnerHistory.map((w) => w.id));
    const eligible = candidates.filter((c) => !historyIds.has(c.id));

    if (eligible.length === 0) {
      toast.error('Tiada lagi calon baru yang belum dipilih!');
      return;
    }

    setIsSpinning(true);
    setCurrentWinner(null);

    let speed = 50; // Initial rapid speed in ms
    let iterations = 0;
    const maxFastIterations = 35;

    const runReel = () => {
      const randomIdx = Math.floor(Math.random() * eligible.length);
      setDisplayedCandidate(eligible[randomIdx]);
      iterations++;

      if (iterations < maxFastIterations) {
        spinTimerRef.current = setTimeout(runReel, speed);
      } else if (iterations < maxFastIterations + 15) {
        // Decelerate reel
        speed += 25;
        spinTimerRef.current = setTimeout(runReel, speed);
      } else {
        // Final winner pick
        const finalWinner = eligible[Math.floor(Math.random() * eligible.length)];
        setDisplayedCandidate(finalWinner);
        setCurrentWinner(finalWinner);
        setWinnerHistory((prev) => [finalWinner, ...prev]);
        setIsSpinning(false);
        triggerWinnerConfetti();
        toast.success(`🎉 Tahniah kepada ${finalWinner.name}!`);
      }
    };

    runReel();
  };

  const removeWinnerFromHistory = (winnerId: string) => {
    setWinnerHistory((prev) => prev.filter((w) => w.id !== winnerId));
    toast.success('Pemenang dikeluarkan daripada sejarah.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-[0_0_80px_rgba(245,158,11,0.15)] my-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSpinning}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5 border-b border-slate-800 pb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
            <Gift className="w-4 h-4" /> Roda Cabutan Bertuah Interactive
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-400">
            Roda Cabutan Bertuah EMS
          </h2>
          {eventTitle && (
            <p className="text-xs font-semibold text-slate-400">Acara: {eventTitle}</p>
          )}
        </div>

        {/* Filter Toolbar & Candidate Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-amber-400 shrink-0 mr-1" />
            <button
              onClick={() => setSourceFilter('ALL')}
              disabled={isSpinning}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                sourceFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Semua Calon
            </button>
            <button
              onClick={() => setSourceFilter('VISITORS')}
              disabled={isSpinning}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                sourceFilter === 'VISITORS'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Pengunjung Sahaja
            </button>
            <button
              onClick={() => setSourceFilter('PARTICIPANTS')}
              disabled={isSpinning}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                sourceFilter === 'PARTICIPANTS'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Peserta Sahaja
            </button>
          </div>

          <div className="text-right text-slate-400 font-semibold shrink-0">
            {loadingCandidates ? (
              <span className="animate-pulse">Memuatkan...</span>
            ) : (
              <span>
                Jumlah Calon: <strong className="text-amber-400">{candidates.length}</strong>
              </span>
            )}
          </div>
        </div>

        {/* SPINNING DISPLAY REEL / WHEEL CONTAINER */}
        <div className="relative bg-slate-950 border-2 border-amber-500/40 rounded-3xl p-8 text-center shadow-inner overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
          {/* Animated Glow Backlight */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {currentWinner ? (
            /* Winner Reveal Celebration Card */
            <div className="relative z-10 space-y-4 animate-scaleUp">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-b from-amber-400/30 to-amber-500/10 border-2 border-amber-400 text-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.4)] animate-bounce">
                <Trophy className="w-10 h-10" />
              </div>
              <div>
                <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-widest border border-amber-400/40 inline-block mb-2">
                  🏆 PEMENANG CABUTAN BERTUAH!
                </span>
                <h3 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-yellow-400 leading-tight">
                  {currentWinner.name}
                </h3>
                <p className="text-xs text-slate-300 font-semibold mt-1">
                  {currentWinner.subText}
                </p>
              </div>
            </div>
          ) : displayedCandidate ? (
            /* Active Spinning Reel Slot */
            <div className="relative z-10 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400/80 animate-pulse">
                {isSpinning ? 'MEMUTAR RODA CABUTAN...' : 'SEDANG MEMILIH PEMENANG'}
              </span>
              <h3 className={`text-2xl sm:text-3xl font-black text-white ${isSpinning ? 'opacity-90 scale-95 transition-all' : ''}`}>
                {displayedCandidate.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {displayedCandidate.subText}
              </p>
            </div>
          ) : (
            /* Idle Screen */
            <div className="relative z-10 space-y-3">
              <Sparkles className="w-12 h-12 text-amber-400/50 mx-auto animate-pulse" />
              <h3 className="text-lg font-bold text-white">Tekan Butang Untuk Memulakan Cabutan</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Sistem akan memutar senarai calon dan memilih pemenang secara bertuah dan rawak.
              </p>
            </div>
          )}
        </div>

        {/* Action Button: Putar Roda Cabutan */}
        <button
          onClick={handleStartSpin}
          disabled={isSpinning || candidates.length === 0}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(245,158,11,0.3)] flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
        >
          <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
          <span>{isSpinning ? 'Memutar Roda Cabutan...' : 'Putar Roda Cabutan Bertuah 🎰'}</span>
        </button>

        {/* Winner History Section */}
        {winnerHistory.length > 0 && (
          <div className="border-t border-slate-800 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Sejarah Pemenang Cabutan Sesi Ini ({winnerHistory.length})
              </h4>
              <button
                onClick={() => setWinnerHistory([])}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Bersihkan Sejarah
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {winnerHistory.map((winner, idx) => (
                <div
                  key={`${winner.id}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black text-[10px] flex items-center justify-center border border-amber-500/30">
                      #{winnerHistory.length - idx}
                    </span>
                    <div>
                      <h5 className="font-bold text-white">{winner.name}</h5>
                      <p className="text-[10px] text-slate-400">{winner.subText}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeWinnerFromHistory(winner.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition"
                    title="Padam pemenang"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
