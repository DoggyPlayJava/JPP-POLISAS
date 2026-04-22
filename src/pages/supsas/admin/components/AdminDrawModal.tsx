/**
 * AdminDrawModal — Admin controls for Group Stage + Knockout draw.
 * Shows group division with slot-machine reveal, allows re-draw, then saves 9 fixtures to DB.
 */
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shuffle, CheckCircle, Loader, AlertTriangle, Wifi, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLiveDraw, generateGroupKnockoutFixtures, DrawEntry } from '@/hooks/useLiveDraw';
import { useSupsas, SupsasSport, SupsasKontingen } from '@/contexts/SupsasContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface AdminDrawModalProps {
  sport: SupsasSport;
  editionId: string;
  onClose: () => void;
  onConfirmed: () => void;
}

function GroupPreview({ label, color, slots }: {
  label: string;
  color: string;
  slots: Array<{ shortCode: string | null; name: string | null; color: string | null; revealed: boolean }>;
}) {
  return (
    <div className="flex-1 space-y-2">
      <div
        className="text-center py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
        style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
      >
        KUMPULAN {label}
      </div>
      <div className="space-y-1.5">
        {slots.map((slot, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-500',
              slot.revealed
                ? 'border-opacity-50'
                : 'bg-white/[0.02] border-white/5'
            )}
            style={slot.revealed ? {
              backgroundColor: `${slot.color ?? color}10`,
              borderColor: `${slot.color ?? color}30`,
            } : {}}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: slot.revealed ? (slot.color ?? color) : '#ffffff20' }}
            />
            <span className={cn(
              'text-xs font-black flex-1',
              slot.revealed ? 'text-white' : 'text-white/20'
            )}>
              {slot.revealed ? slot.shortCode : '???'}
            </span>
            {slot.revealed && (
              <span className="text-[9px] text-white/30 font-medium truncate max-w-[80px]">
                {slot.name}
              </span>
            )}
          </div>
        ))}
        {/* placeholder if no slots yet */}
        {slots.length === 0 && [0, 1, 2].map(i => (
          <div key={i} className="h-9 rounded-xl bg-white/[0.02] border border-white/5" />
        ))}
      </div>
    </div>
  );
}

export function AdminDrawModal({ sport, editionId, onClose, onConfirmed }: AdminDrawModalProps) {
  const { kontingen, teams: allTeams, refetch } = useSupsas();
  const { drawState, startDraw, cancelDraw, resetDraw } = useLiveDraw(editionId, true);
  const [confirming, setConfirming] = useState(false);
  const [hasExisting, setHasExisting] = useState<boolean | null>(null);
  const savedGroupsRef = useRef<{ groupA: DrawEntry[]; groupB: DrawEntry[] } | null>(null);

  const isMultiGroup = (sport.max_groups_per_kontingen ?? 1) > 1;

  // Build draw entries:
  // - Multi-group: 1 entry per team (nama = team.name, dari kontingen mana-mana)
  // - Single-group (lama): 1 entry per kontingen aktif
  const drawEntries: DrawEntry[] = isMultiGroup
    ? allTeams
        .filter(t => t.sport_id === sport.id)
        .map(t => {
          const k = kontingen.find(k => k.id === t.kontingen_id);
          return {
            id: t.id,
            name: t.name,
            shortCode: `${k?.short_code ?? '?'} #${t.group_number}`,
            color: k?.color ?? '#F59E0B',
            kontingenId: t.kontingen_id,
            teamId: t.id,
          };
        })
    : kontingen
        .filter(k => k.is_active)
        .map(k => ({
          id: k.id,
          name: k.name,
          shortCode: k.short_code,
          color: k.color,
          kontingenId: k.id,
          teamId: null,
        }));

  React.useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from('supsas_fixtures')
        .select('*', { count: 'exact', head: true })
        .eq('sport_id', sport.id);
      setHasExisting((count ?? 0) > 0);
    })();
  }, [sport.id]);

  // ── Start draw ─────────────────────────────────────────────
  const handleStartDraw = async () => {
    if (drawEntries.length < 4) {
      toast.error('Perlukan sekurang-kurangnya 4 entri untuk format Kumpulan+KO.');
      return;
    }

    if (hasExisting) {
      const { error } = await supabase
        .from('supsas_fixtures')
        .delete()
        .eq('sport_id', sport.id);
      if (error) { toast.error('Gagal padam fixture lama: ' + error.message); return; }
    }

    const result = await startDraw(sport, drawEntries);
    if (result) savedGroupsRef.current = result;
  };

  // ── Re-draw ────────────────────────────────────────────────
  const handleReDraw = async () => {
    await cancelDraw();
    await new Promise(r => setTimeout(r, 400));
    const result = await startDraw(sport, drawEntries);
    if (result) savedGroupsRef.current = result;
  };

  // ── Confirm: save 9 fixtures ───────────────────────────────
  const handleConfirm = async () => {
    if (drawState.status !== 'complete' || !savedGroupsRef.current) {
      toast.error('Sila tunggu undian selesai dahulu.');
      return;
    }
    setConfirming(true);

    const { groupA, groupB } = savedGroupsRef.current;
    const fixtures = generateGroupKnockoutFixtures(editionId, sport.id, groupA, groupB);

    const { data: inserted, error } = await supabase
      .from('supsas_fixtures')
      .insert(fixtures)
      .select('id, bracket_round, bracket_position');

    if (error || !inserted) {
      toast.error('Gagal simpan bracket: ' + (error?.message ?? 'ralat tidak diketahui'));
      setConfirming(false);
      return;
    }

    // Link next_match_id: Semi → Final
    const semiMatches = (inserted as any[])
      .filter(f => f.bracket_round === 2)
      .sort((a, b) => a.bracket_position - b.bracket_position);
    const finalMatch = (inserted as any[]).find(f => f.bracket_round === 1);

    if (finalMatch) {
      for (const semi of semiMatches) {
        await supabase
          .from('supsas_fixtures')
          .update({ next_match_id: finalMatch.id })
          .eq('id', semi.id);
      }
    }

    const groupCount = fixtures.filter(f => f.group_name).length;
    const koCount = fixtures.filter(f => !f.group_name).length;
    toast.success(
      `Bracket ${sport.name} berjaya! ${groupCount} match kumpulan + ${koCount} match KO.`
    );

    setConfirming(false);
    resetDraw();
    refetch();
    onConfirmed();
    onClose();
  };

  const isDrawing = drawState.status === 'drawing';
  const isComplete = drawState.status === 'complete';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        className="relative w-full max-w-[500px] max-h-[90vh] bg-[#070F1E] border border-white/10 rounded-[2rem] shadow-[0_40px_120px_rgba(0,0,0,0.8)] overflow-y-auto z-10"
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

          {/* Format info */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: '6 Match', sub: 'Kumpulan' },
              { label: '2 Match', sub: 'Separuh Akhir' },
              { label: '1 Match', sub: 'Akhir' },
            ].map(item => (
              <div key={item.label} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
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

          {/* Active entries */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-white/30" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
                {drawEntries.length} {isMultiGroup ? 'Kumpulan Berdaftar' : 'Kontinjen Aktif'}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {drawEntries.map(e => (
                <span
                  key={e.id}
                  className="px-2 py-0.5 rounded-lg text-xs font-black border"
                  style={{ backgroundColor: `${e.color}15`, borderColor: `${e.color}30`, color: e.color }}
                >
                  {e.shortCode}
                </span>
              ))}
            </div>
          </div>

          {/* Warning: existing fixtures */}
          {hasExisting && drawState.status === 'idle' && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80 font-medium">
                Fixture sedia ada untuk sukan ini akan <strong>dipadam</strong> dan diganti dengan bracket baru.
              </p>
            </div>
          )}

          {/* Group preview (shown during and after draw) */}
          <AnimatePresence>
            {(isDrawing || isComplete) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-3"
              >
                <GroupPreview
                  label="A"
                  color="#F59E0B"
                  slots={drawState.groupA}
                />
                <GroupPreview
                  label="B"
                  color="#8B5CF6"
                  slots={drawState.groupB}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {drawState.status === 'idle' && (
              <button
                onClick={handleStartDraw}
                disabled={drawEntries.length < 4}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2"
              >
                <Shuffle className="w-4 h-4" />
                Mulakan Undian Langsung
              </button>
            )}

            {isDrawing && (
              <div className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/30 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Shuffle className="w-4 h-4" />
                </motion.div>
                Undian Sedang Berjalan...
              </div>
            )}

            {isComplete && (
              <>
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2"
                >
                  {confirming ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {confirming ? 'Menyimpan 9 Perlawanan...' : 'Sahkan & Jana Bracket'}
                </button>
                <button
                  onClick={handleReDraw}
                  className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2"
                >
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
