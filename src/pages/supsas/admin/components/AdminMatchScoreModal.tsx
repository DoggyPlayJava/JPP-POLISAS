/**
 * AdminMatchScoreModal — Modal ringkas untuk update skor perlawanan
 * Digunakan untuk match kumpulan DAN match KO (SF/Final)
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SupsasFixture, SupsasKontingen } from '@/contexts/SupsasContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Props {
  fixture: SupsasFixture;
  kontingenMap: Record<string, SupsasKontingen>;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS = [
  { value: 'upcoming',  label: 'Akan Datang', cls: 'text-white/60' },
  { value: 'live',      label: '🔴 Sedang Live', cls: 'text-red-400' },
  { value: 'completed', label: '✅ Selesai',   cls: 'text-emerald-400' },
  { value: 'postponed', label: '⏸ Ditangguh', cls: 'text-amber-400' },
];

export function AdminMatchScoreModal({ fixture, kontingenMap, onClose, onSaved }: Props) {
  const a = fixture.kontingen_a_id ? kontingenMap[fixture.kontingen_a_id] : null;
  const b = fixture.kontingen_b_id ? kontingenMap[fixture.kontingen_b_id] : null;

  const [scoreA, setScoreA] = useState(fixture.score_a ?? '');
  const [scoreB, setScoreB] = useState(fixture.score_b ?? '');
  const [status, setStatus] = useState<string>(fixture.status);
  const [notes, setNotes]   = useState(fixture.notes ?? '');
  const [saving, setSaving] = useState(false);

  // Auto-determine winner based on score
  const numA = parseInt(scoreA);
  const numB = parseInt(scoreB);
  const autoWinnerId =
    !isNaN(numA) && !isNaN(numB)
      ? numA > numB ? fixture.kontingen_a_id
      : numB > numA ? fixture.kontingen_b_id
      : null // draw
      : fixture.winner_id;

  const handleSave = async () => {
    setSaving(true);

    const payload: Partial<SupsasFixture> = {
      score_a: scoreA !== '' ? scoreA : null,
      score_b: scoreB !== '' ? scoreB : null,
      status: status as SupsasFixture['status'],
      winner_id: status === 'completed' ? autoWinnerId : fixture.winner_id,
      notes: notes || null,
    };

    const { error } = await supabase
      .from('supsas_fixtures')
      .update(payload)
      .eq('id', fixture.id);

    setSaving(false);

    if (error) {
      toast.error('Gagal simpan skor: ' + error.message);
      return;
    }

    toast.success('Skor dikemas kini!');
    onSaved();
    onClose();
  };

  const matchLabel = fixture.group_name
    ? `Kumpulan ${fixture.group_name} — Match #${fixture.match_number}`
    : fixture.bracket_round === 2 ? `Separuh Akhir ${fixture.bracket_position}`
    : fixture.bracket_round === 1 ? '🏆 Akhir'
    : `Round ${fixture.round}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 24 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="relative w-full max-w-sm bg-[#0A1628] border border-white/10 rounded-[2rem] shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden z-10"
      >
        {/* Top accent */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400/60 mb-0.5">
                Kemaskini Skor
              </p>
              <h2 className="text-base font-black text-white">{matchLabel}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Teams & Score inputs */}
          <div className="flex items-center gap-3">
            {/* Team A */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-2xl border-2 flex items-center justify-center font-black text-sm"
                style={{
                  borderColor: (a?.color ?? '#fff') + '60',
                  backgroundColor: (a?.color ?? '#fff') + '15',
                  color: a?.color ?? '#fff',
                }}
              >
                {a?.short_code?.charAt(0) ?? '?'}
              </div>
              <p className="text-xs font-black text-white text-center truncate max-w-[70px]">
                {a?.short_code ?? 'TBD'}
              </p>
              <input
                type="number"
                min={0}
                value={scoreA}
                onChange={e => setScoreA(e.target.value)}
                placeholder="0"
                className="w-full text-center px-3 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-2xl font-black focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>

            {/* VS / dash */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-8">
              <span className="text-white/20 font-black text-sm">VS</span>
              {!isNaN(numA) && !isNaN(numB) && (
                <span className="text-[9px] font-black text-white/20 uppercase">
                  {numA > numB ? (a?.short_code ?? 'A') + ' menang'
                  : numB > numA ? (b?.short_code ?? 'B') + ' menang'
                  : 'Seri'}
                </span>
              )}
            </div>

            {/* Team B */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-2xl border-2 flex items-center justify-center font-black text-sm"
                style={{
                  borderColor: (b?.color ?? '#fff') + '60',
                  backgroundColor: (b?.color ?? '#fff') + '15',
                  color: b?.color ?? '#fff',
                }}
              >
                {b?.short_code?.charAt(0) ?? '?'}
              </div>
              <p className="text-xs font-black text-white text-center truncate max-w-[70px]">
                {b?.short_code ?? 'TBD'}
              </p>
              <input
                type="number"
                min={0}
                value={scoreB}
                onChange={e => setScoreB(e.target.value)}
                placeholder="0"
                className="w-full text-center px-3 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-2xl font-black focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
          </div>

          {/* Status selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Status Perlawanan</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-[10px] font-black border transition-all text-left',
                    status === opt.value
                      ? 'bg-white/10 border-white/20 ' + opt.cls
                      : 'bg-white/[0.02] border-white/5 text-white/30 hover:border-white/15'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Nota (Opsional)</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="cth: Masa tambahan, penalti..."
              className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder-white/20 focus:outline-none focus:border-amber-500/40 transition-all"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Skor
          </button>
        </div>
      </motion.div>
    </div>
  );
}
