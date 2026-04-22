/**
 * LiveDrawOverlay — Full-screen overlay shown to ALL viewers during an active live draw.
 * Menunjukkan pembahagian pasukan ke Kumpulan A/B/C/D secara real-time.
 *
 * FIX:
 *   - Support 2-4 groups (A/B/C/D)
 *   - DRAW_FINALIZED event: immediately reveal all slots, no lag
 *   - Shorter spin animation (300ms instead of 900ms)
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLiveDraw, type GroupDrawSlot } from '@/hooks/useLiveDraw';
import { useSupsas } from '@/contexts/SupsasContext';
import { cn } from '@/lib/utils';

const SPIN_NAMES = ['JTM', 'JBM', 'JKE', 'JPA', 'JHE', 'JIF', 'JET', 'JKA'];

const GROUP_COLORS: Record<string, string> = {
  A: '#F59E0B',
  B: '#8B5CF6',
  C: '#10B981',
  D: '#EF4444',
};

function GroupSlotCard({ slot, instantReveal }: { slot: GroupDrawSlot; instantReveal: boolean }) {
  const [spinning, setSpinning] = useState(false);
  const [displayName, setDisplayName] = useState('???');

  useEffect(() => {
    if (!slot.revealed) return;

    // If instant reveal (DRAW_FINALIZED), skip spin animation
    if (instantReveal) {
      setDisplayName(slot.shortCode ?? slot.name ?? '???');
      return;
    }

    setSpinning(true);
    let tick = 0;
    const interval = setInterval(() => {
      setDisplayName(SPIN_NAMES[tick % SPIN_NAMES.length]);
      tick++;
    }, 60);

    const spinDone = setTimeout(() => {
      clearInterval(interval);
      setSpinning(false);
      setDisplayName(slot.shortCode ?? slot.name ?? '???');
    }, 1500);

    return () => { clearInterval(interval); clearTimeout(spinDone); };
  }, [slot.revealed, slot.shortCode, slot.name, instantReveal]);

  const isRevealed = slot.revealed && !spinning;
  const groupColor = GROUP_COLORS[slot.group] ?? '#F59E0B';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 rounded-2xl border p-3 transition-all duration-300',
        isRevealed ? 'border-opacity-50' : 'bg-white/[0.03] border-white/10'
      )}
      style={isRevealed ? {
        backgroundColor: `${slot.color ?? groupColor}15`,
        borderColor: `${slot.color ?? groupColor}40`,
      } : {}}
    >
      <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30">
        Slot {slot.slot}
      </span>

      <div className={cn(
        'text-xl font-black transition-all duration-150',
        spinning ? 'text-white/50 blur-[1px]' : isRevealed ? 'text-white' : 'text-white/15'
      )}>
        {spinning ? displayName : isRevealed ? (slot.shortCode ?? '—') : '???'}
      </div>

      {isRevealed && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[8px] text-white/40 font-medium text-center truncate max-w-full"
        >
          {slot.name}
        </motion.span>
      )}

      {isRevealed && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ boxShadow: `0 0 16px -6px ${slot.color ?? groupColor}50` }}
          />
          <div
            className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full opacity-50"
            style={{ backgroundColor: slot.color ?? groupColor }}
          />
        </>
      )}
    </motion.div>
  );
}

function GroupColumn({ label, color, slots, instantReveal }: {
  label: string;
  color: string;
  slots: GroupDrawSlot[];
  instantReveal: boolean;
}) {
  return (
    <div className="flex-1 space-y-2 min-w-0">
      <div
        className="text-center py-1.5 rounded-xl font-black text-xs uppercase tracking-[0.15em]"
        style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}30` }}
      >
        KUMPULAN {label}
      </div>
      <div className="flex flex-col gap-1.5">
        {slots.map(slot => (
          <GroupSlotCard key={`${slot.group}-${slot.slot}`} slot={slot} instantReveal={instantReveal} />
        ))}
        {slots.length === 0 && [1, 2, 3].map(i => (
          <div key={i} className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/5 bg-white/[0.02] p-3 min-h-[64px]">
            <span className="text-white/15 text-xl font-black">???</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LiveDrawOverlayProps {
  editionId: string | null | undefined;
}

export function LiveDrawOverlay({ editionId }: LiveDrawOverlayProps) {
  const { drawState } = useLiveDraw(editionId, false);
  const { sports } = useSupsas();
  const navigate = useNavigate();

  const isVisible = drawState.status === 'drawing' || drawState.status === 'complete';
  const sport = sports.find(s => s.id === drawState.sportId);

  // instantReveal = true when DRAW_FINALIZED received (skip animations)
  const instantReveal = drawState.status === 'finalized';

  // All groups dynamically (A/B for 2-group, A/B/C/D for 4-group)
  const groupEntries = Object.entries(drawState.groups ?? {});
  const numGroups = groupEntries.length;

  return (
    <AnimatePresence>
      {(isVisible || instantReveal) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(4, 9, 18, 0.98)', backdropFilter: 'blur(24px)' }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 40 }}
            transition={{ type: 'spring', damping: 22, stiffness: 200 }}
            className="w-full max-w-2xl py-8"
          >
            {/* Live badge */}
            <div className="text-center mb-5">
              <motion.div
                animate={{ opacity: drawState.status === 'drawing' ? [0.5, 1, 0.5] : 1 }}
                transition={{ duration: 1.2, repeat: drawState.status === 'drawing' ? Infinity : 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 mb-3"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400">
                  {drawState.status === 'complete' || instantReveal ? 'Undian Selesai' : 'Undian Langsung'}
                </span>
              </motion.div>

              <h2 className="text-2xl font-black text-white mb-1">🎰 UNDIAN KUMPULAN</h2>
              <p className="text-amber-400 font-black uppercase tracking-widest text-sm">
                {drawState.sportName ?? '—'}
              </p>
              <p className="text-white/30 text-xs mt-1">
                {drawState.totalTeams} Pasukan → {numGroups || 2} Kumpulan
              </p>
            </div>

            {/* Dynamic group columns */}
            <div
              className="gap-3 mb-5"
              style={{ display: 'grid', gridTemplateColumns: `repeat(${numGroups || 2}, 1fr)` }}
            >
              {groupEntries.map(([label, slots]) => (
                <GroupColumn
                  key={label}
                  label={label}
                  color={GROUP_COLORS[label] ?? '#F59E0B'}
                  slots={slots}
                  instantReveal={instantReveal}
                />
              ))}
              {/* Fallback: show A/B if no groups yet */}
              {groupEntries.length === 0 && (
                <>
                  <GroupColumn label="A" color="#F59E0B" slots={drawState.groupA} instantReveal={false} />
                  <GroupColumn label="B" color="#8B5CF6" slots={drawState.groupB} instantReveal={false} />
                </>
              )}
            </div>

            {/* Format reminder */}
            <div className="text-center mb-5">
              <p className="text-white/20 text-[10px] font-medium leading-relaxed">
                Setiap pasukan dalam kumpulan akan berlawan sesama sendiri<br />
                Dua terbaik dari setiap kumpulan maju ke fasa seterusnya
              </p>
            </div>

            {/* Post-draw CTA */}
            <AnimatePresence>
              {(drawState.status === 'complete' || instantReveal) && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <p className="text-center text-white/40 text-xs font-medium">
                    Pembahagian kumpulan telah ditetapkan! Lihat bracket penuh.
                  </p>

                  {sport && (
                    <button
                      onClick={() => navigate(`/supsas/bracket/${sport.id}`)}
                      className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Lihat Bracket {drawState.sportName}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
