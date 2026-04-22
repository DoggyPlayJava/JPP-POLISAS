/**
 * AdminBracketPanel — Admin control untuk jana Group Stage + Knockout bracket.
 *
 * DYNAMIC FORMAT:
 *   N ≤ 8 entries → 2 kumpulan → SF → Final
 *   N > 8 entries → 4 kumpulan → Suku Akhir → SF → Final
 *
 * Berfungsi tanpa WebSocket. Broadcast ke pelajar hanya sebagai bonus.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Shuffle, CheckCircle, Loader, AlertTriangle, Wifi, Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DrawEntry } from '@/hooks/useLiveDraw';
import { useBracket, BracketGroups, GROUP_LABELS, GROUP_COLORS } from '@/hooks/useBracket';
import { useSupsas, SupsasSport } from '@/contexts/SupsasContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface AdminBracketPanelProps {
  sport: SupsasSport;
  editionId: string;
  onClose: () => void;
  onConfirmed: () => void;
}

// ─── Single slot card ─────────────────────────────────────────
function SlotCard({ entry, revealed, color }: {
  entry: DrawEntry | null;
  revealed: boolean;
  color: string;
}) {
  return (
    <motion.div
      initial={false}
      animate={revealed ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0.22, y: 3, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors duration-300',
        revealed ? '' : 'bg-white/[0.02] border-white/5',
      )}
      style={revealed ? {
        backgroundColor: `${entry?.color ?? color}12`,
        borderColor: `${entry?.color ?? color}35`,
      } : {}}
    >
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: revealed ? (entry?.color ?? color) : '#ffffff15' }}
      />
      <span className={cn('text-[11px] font-black flex-1 truncate', revealed ? 'text-white' : 'text-white/15')}>
        {revealed ? (entry?.shortCode ?? '—') : '???'}
      </span>
      {revealed && entry?.name && (
        <span className="text-[8px] text-white/30 font-medium truncate max-w-[70px]">{entry.name}</span>
      )}
    </motion.div>
  );
}

// ─── Group column ─────────────────────────────────────────────
function GroupColumn({ label, color, entries, revealedCount }: {
  label: string;
  color: string;
  entries: DrawEntry[];
  revealedCount: number;
}) {
  return (
    <div className="flex-1 space-y-1.5 min-w-0">
      <div
        className="text-center py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest"
        style={{ backgroundColor: `${color}12`, color, border: `1px solid ${color}28` }}
      >
        Kumpulan {label}
      </div>
      <div className="space-y-1">
        {entries.map((entry, i) => (
          <SlotCard key={entry.id} entry={entry} revealed={i < revealedCount} color={color} />
        ))}
        {entries.length === 0 && [0, 1, 2].map(i => (
          <div key={i} className="h-8 rounded-xl bg-white/[0.02] border border-white/5" />
        ))}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────
export function AdminBracketPanel({ sport, editionId, onClose, onConfirmed }: AdminBracketPanelProps) {
  const { kontingen, teams: allTeams, refetch } = useSupsas();
  const { saving, errorMsg, generateGroups, saveFixtures } = useBracket();

  const [phase, setPhase] = useState<'idle' | 'revealing' | 'done'>('idle');
  const [bracketGroups, setBracketGroups] = useState<BracketGroups | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]); // per group: count revealed
  const [hasExisting, setHasExisting] = useState<boolean | null>(null);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Build draw entries ──────────────────────────────────────
  const isMultiGroup = (sport.max_groups_per_kontingen ?? 1) > 1;

  const drawEntries: DrawEntry[] = isMultiGroup
    ? allTeams
        .filter(t => t.sport_id === sport.id)
        .map(t => {
          const k = kontingen.find(k => k.id === t.kontingen_id);
          return {
            id: t.id, name: t.name,
            shortCode: `${k?.short_code ?? '?'} #${t.group_number}`,
            color: k?.color ?? '#F59E0B',
            kontingenId: t.kontingen_id, teamId: t.id,
          };
        })
    : kontingen
        .filter(k => k.is_active)
        .map(k => ({
          id: k.id, name: k.name, shortCode: k.short_code, color: k.color,
          kontingenId: k.id, teamId: null,
        }));

  const canDraw = drawEntries.length >= 4;
  const willUse4Groups = drawEntries.length > 8;

  // ── Check existing ──────────────────────────────────────────
  useEffect(() => {
    supabase.from('supsas_fixtures').select('*', { count: 'exact', head: true })
      .eq('sport_id', sport.id)
      .then(({ count }) => setHasExisting((count ?? 0) > 0));
  }, [sport.id]);

  // ── Optional: realtime broadcast channel ───────────────────
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelReady = useRef(false);
  useEffect(() => {
    const ch = supabase.channel(`supsas-draw-${editionId}`, { config: { broadcast: { self: false } } });
    ch.subscribe(status => { channelReady.current = status === 'SUBSCRIBED'; });
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; channelReady.current = false; };
  }, [editionId]);

  useEffect(() => () => timerRefs.current.forEach(clearTimeout), []);

  // Adaptive delay: total animation ≤ 18 000 ms — suspenseful reveal
  const calcDelay = useCallback((numSlots: number) => {
    return Math.min(2000, Math.max(800, Math.floor(18000 / (numSlots || 1))));
  }, []);

  // ── Broadcast to students (optional) ───────────────────────
  // Uses SAME adaptive delay as local animation — stays in sync
  const broadcastDraw = useCallback((bg: BracketGroups) => {
    const ch = channelRef.current;
    if (!ch || !channelReady.current) return;
    const totalSlots = bg.groups.reduce((s, g) => s + g.length, 0);
    const DELAY = calcDelay(totalSlots); // adaptive, same as local
    let seq = 0;
    ch.send({ type: 'broadcast', event: 'draw', payload: { type: 'DRAW_START', sportId: sport.id, sportName: sport.name, totalTeams: drawEntries.length, slotDelay: DELAY } });
    const maxLen = Math.max(...bg.groups.map(g => g.length));
    for (let i = 0; i < maxLen; i++) {
      for (let g = 0; g < bg.numGroups; g++) {
        const entry = bg.groups[g][i];
        if (!entry) continue;
        const t = setTimeout(() => ch.send({
          type: 'broadcast', event: 'draw',
          payload: { type: 'GROUP_REVEAL', group: GROUP_LABELS[g], slot: i + 1, entryId: entry.id, kontingenId: entry.kontingenId, teamId: entry.teamId, name: entry.name, shortCode: entry.shortCode, color: entry.color },
        }), DELAY * seq++);
        timerRefs.current.push(t);
      }
    }
    const done = setTimeout(() => ch.send({ type: 'broadcast', event: 'draw', payload: { type: 'DRAW_COMPLETE', groupA: bg.groups[0]?.map(e => e.id) ?? [], groupB: bg.groups[1]?.map(e => e.id) ?? [] } }), DELAY * (seq + 1));
    timerRefs.current.push(done);
  }, [sport, drawEntries, calcDelay]);

  // ── Start draw ─────────────────────────────────────────────
  const handleStartDraw = useCallback(() => {
    if (!canDraw) {
      toast.error('Perlukan sekurang-kurangnya 4 entri untuk format Kumpulan+KO.');
      return;
    }
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    const bg = generateGroups(drawEntries);
    setBracketGroups(bg);
    setRevealed(new Array(bg.numGroups).fill(0));
    setPhase('revealing');

    // Adaptive local reveal animation
    const totalSlots = bg.groups.reduce((s, g) => s + g.length, 0);
    const DELAY = calcDelay(totalSlots);
    let seq = 0;
    const maxLen = Math.max(...bg.groups.map(g => g.length));
    for (let i = 0; i < maxLen; i++) {
      for (let g = 0; g < bg.numGroups; g++) {
        if (!bg.groups[g][i]) continue;
        const gIdx = g;
        const revealTo = i + 1;
        const t = setTimeout(() => setRevealed(prev => {
          const next = [...prev];
          next[gIdx] = revealTo;
          return next;
        }), DELAY * seq++);
        timerRefs.current.push(t);
      }
    }

    const doneT = setTimeout(() => setPhase('done'), DELAY * seq + 200);
    timerRefs.current.push(doneT);

    broadcastDraw(bg);
  }, [canDraw, drawEntries, generateGroups, calcDelay, broadcastDraw]);

  // ── Re-draw ─────────────────────────────────────────────────
  const handleReDraw = useCallback(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
    setPhase('idle');
    setBracketGroups(null);
    setRevealed([]);
    channelRef.current?.send({ type: 'broadcast', event: 'draw', payload: { type: 'DRAW_CANCELLED' } });
  }, []);

  // ── Confirm: save ───────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!bracketGroups) return;
    const ok = await saveFixtures(editionId, sport, bracketGroups);
    if (ok) {
      const totalGroupMatches = bracketGroups.groups.reduce((sum, g) => sum + g.length * (g.length - 1) / 2, 0);
      const koMatches = bracketGroups.numGroups === 4 ? 7 : 3;
      toast.success(`Bracket ${sport.name} berjaya! ${totalGroupMatches} match kumpulan + ${koMatches} match KO.`);
      // Broadcast finalized so student views get instant notification
      channelRef.current?.send({
        type: 'broadcast', event: 'draw',
        payload: { type: 'DRAW_FINALIZED', sportId: sport.id, sportName: sport.name },
      });
      refetch();
      onConfirmed();
      onClose();
    } else {
      toast.error('Gagal simpan bracket: ' + (errorMsg ?? 'Ralat tidak diketahui'));
    }
  }, [bracketGroups, editionId, sport, saveFixtures, errorMsg, refetch, onConfirmed, onClose]);

  const isRevealing = phase === 'revealing';
  const isDone = phase === 'done';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        className="relative w-full max-w-[560px] max-h-[90vh] bg-[#070F1E] border border-white/10 rounded-[2rem] shadow-[0_40px_120px_rgba(0,0,0,0.8)] overflow-y-auto z-10"
      >
        <div className="p-6 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">🎰 Undian Kumpulan</h2>
              <p className="text-amber-400 text-xs font-bold mt-0.5">{sport.name}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Format preview */}
          <div className="grid gap-2 text-center" style={{ gridTemplateColumns: `repeat(${willUse4Groups ? 4 : 3}, 1fr)` }}>
            {(willUse4Groups
              ? [
                  { label: `${drawEntries.length} Pasukan`, sub: `${willUse4Groups ? 4 : 2} Kumpulan` },
                  { label: '4 Match', sub: 'Suku Akhir' },
                  { label: '2 Match', sub: 'Separuh Akhir' },
                  { label: '1 Match', sub: 'Akhir' },
                ]
              : [
                  { label: `${drawEntries.length} Pasukan`, sub: '2 Kumpulan' },
                  { label: '2 Match', sub: 'Separuh Akhir' },
                  { label: '1 Match', sub: 'Akhir' },
                ]
            ).map(item => (
              <div key={item.sub} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-amber-400 font-black text-sm">{item.label}</p>
                <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
              Pelajar dapat menonton undian secara langsung
            </span>
          </div>

          {/* Entries — compact scrollable grid */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-white/30" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                {drawEntries.length} {isMultiGroup ? 'Kumpulan Berdaftar' : 'Kontinjen Aktif'}
                {drawEntries.length > 0 && (
                  <span className="ml-2 text-white/20">
                    → {willUse4Groups ? '4' : '2'} kumpulan · Suku Akhir {willUse4Groups ? '✓' : '✗'}
                  </span>
                )}
              </p>
              {!canDraw && (
                <span className="ml-auto text-[9px] font-black text-red-400/70 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-0.5">
                  Min. 4 entri
                </span>
              )}
            </div>
            {/* Grid layout: easier to scan than wrapping badges */}
            <div
              className="grid gap-1 max-h-36 overflow-y-auto pr-1 scrollbar-thin"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}
            >
              {drawEntries.map(e => (
                <span key={e.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black border truncate"
                  style={{ backgroundColor: `${e.color}15`, borderColor: `${e.color}30`, color: e.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                  <span className="truncate">{e.shortCode}</span>
                </span>
              ))}
              {drawEntries.length === 0 && (
                <p className="col-span-full text-[10px] text-white/20">
                  {isMultiGroup ? 'Tiada kumpulan didaftarkan.' : 'Tiada kontingen aktif.'}
                </p>
              )}
            </div>
          </div>

          {/* Existing warning */}
          {hasExisting && phase === 'idle' && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80 font-medium">
                Fixture sedia ada akan <strong>dipadam</strong> dan diganti dengan bracket baru.
              </p>
            </div>
          )}

          {/* Group preview — dynamic columns */}
          <AnimatePresence>
            {(isRevealing || isDone) && bracketGroups && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn('grid gap-2', bracketGroups.numGroups === 4 ? 'grid-cols-4' : 'grid-cols-2')}
              >
                {bracketGroups.groups.map((entries, g) => (
                  <GroupColumn
                    key={g}
                    label={GROUP_LABELS[g]}
                    color={GROUP_COLORS[g]}
                    entries={entries}
                    revealedCount={revealed[g] ?? 0}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {phase === 'idle' && (
              <button onClick={handleStartDraw} disabled={!canDraw}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2">
                <Shuffle className="w-4 h-4" />
                Mulakan Undian Langsung
              </button>
            )}
            {isRevealing && (
              <div className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/30 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Shuffle className="w-4 h-4" />
                </motion.div>
                Undian Sedang Berjalan...
              </div>
            )}
            {isDone && (
              <>
                <button onClick={handleConfirm} disabled={saving}
                  className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2">
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {saving ? 'Menyimpan Bracket...' : 'Sahkan & Jana Bracket'}
                </button>
                <button onClick={handleReDraw} disabled={saving}
                  className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                  <Shuffle className="w-4 h-4" />
                  Ulang Undian
                </button>
              </>
            )}
          </div>

          <p className="text-[10px] text-white/20 text-center">
            Pembahagian kumpulan adalah rawak sepenuhnya untuk memastikan ketelusan.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
