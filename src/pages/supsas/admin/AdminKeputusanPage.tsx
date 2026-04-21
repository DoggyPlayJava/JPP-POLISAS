import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Medal, Plus, Save, X, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSupsas } from '@/contexts/SupsasContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

const MEDAL_OPTIONS = [
  { value: 'gold',   label: '🥇 Emas',   cls: 'bg-amber-500/20 border-amber-500/40 text-amber-400' },
  { value: 'silver', label: '🥈 Perak',  cls: 'bg-slate-500/20 border-slate-500/30 text-slate-300' },
  { value: 'bronze', label: '🥉 Gangsa', cls: 'bg-orange-700/20 border-orange-700/30 text-orange-400' },
  { value: null,     label: '— Tiada',   cls: 'bg-white/5 border-white/10 text-white/30' },
];

export function AdminKeputusanPage() {
  const { edition, sports, kontingen, refetch } = useSupsas();
  const activeKontingen = kontingen.filter(k => k.is_active); // K-1: admin page only assigns medals to active kontingen
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [results, setResults] = useState<Record<string, { medal: string | null; position: string; notes: string }>>({});
  const [saving, setSaving] = useState(false);

  const sport = sports.find(s => s.id === selectedSport);

  const handleMedalChange = (kontingenId: string, medal: string | null) => {
    setResults(prev => ({ ...prev, [kontingenId]: { ...prev[kontingenId] || { position: '', notes: '' }, medal } }));
  };

  const handleSave = async () => {
    if (!edition || !selectedSport) { toast.error('Sila pilih sukan'); return; }
    const entries = Object.entries(results).filter(([, v]) => v.medal !== undefined);
    if (entries.length === 0) { toast.error('Tiada keputusan untuk disimpan'); return; }

    // S-1: Validate medal uniqueness — only 1 of each medal type per sport
    const medalCounts: Record<string, number> = { gold: 0, silver: 0, bronze: 0 };
    entries.forEach(([, v]) => { if (v.medal && v.medal in medalCounts) medalCounts[v.medal]++; });
    if (medalCounts.gold > 1) { toast.error('Hanya satu pemenang 🥇 Emas dibenarkan'); return; }
    if (medalCounts.silver > 1) { toast.error('Hanya satu pemenang 🥈 Perak dibenarkan'); return; }
    if (medalCounts.bronze > 1) { toast.error('Hanya satu pemenang 🥉 Gangsa dibenarkan'); return; }

    const upsertData = entries.map(([kontingenId, vals]) => ({
      edition_id: edition.id,
      sport_id: selectedSport,
      kontingen_id: kontingenId,
      medal: vals.medal,
      notes: vals.notes || null,
      recorded_by: null, // will use auth.uid() via RLS
    }));

    setSaving(true);
    const { error } = await supabase
      .from('supsas_results')
      .upsert(upsertData, { onConflict: 'sport_id,kontingen_id' });

    setSaving(false);
    if (error) { toast.error('Gagal simpan: ' + error.message); return; }
    toast.success('Keputusan disimpan! Papan markah dikemas kini.');
    refetch();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Input Keputusan</h1>
        <p className="text-white/30 text-sm mt-1">Rekod pengagihan medal untuk setiap sukan</p>
      </div>

      {/* Sport selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Pilih Sukan</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sports.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelectedSport(s.id); setResults({}); }}
              className={cn(
                'px-4 py-3 rounded-2xl text-sm font-black border transition-all text-left',
                selectedSport === s.id
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                  : 'bg-white/[0.02] border-white/5 text-white/50 hover:text-white hover:bg-white/5 hover:border-white/10'
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Medal assignment */}
      {selectedSport && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">{sport?.name}</h2>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Pilih medal untuk setiap kontinjen</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all disabled:opacity-50"
            >
              {saving ? <span className="animate-spin text-base">⟳</span> : <Save className="w-4 h-4" />}
              Simpan
            </button>
          </div>

          {/* Info */}
          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/15 text-xs text-blue-300/60 font-medium">
            💡 Hanya satu kontinjen boleh menang setiap jenis medal. Boleh ada beberapa kontinjen dalam kedudukan "Tiada".
          </div>

          <div className="space-y-3">
            {activeKontingen.map((k, i) => (
              <motion.div
                key={k.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5"
              >
                {/* Kontingen info */}
                <div
                  className="w-10 h-10 rounded-xl border-2 flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{ borderColor: `${k.color}60`, backgroundColor: `${k.color}15`, color: k.color }}
                >
                  {k.short_code.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-sm truncate">{k.name}</p>
                  <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{k.short_code}</p>
                </div>

                {/* Medal buttons */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  {MEDAL_OPTIONS.map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => handleMedalChange(k.id, opt.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all whitespace-nowrap',
                        results[k.id]?.medal === opt.value
                          ? opt.cls + ' scale-105 shadow-[0_0_15px_rgba(0,0,0,0.3)]'
                          : 'bg-white/[0.02] border-white/5 text-white/20 hover:text-white/50 hover:bg-white/5'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {!selectedSport && (
        <div className="text-center py-16 text-white/20 text-sm font-black uppercase tracking-widest">
          <Medal className="w-10 h-10 mx-auto mb-3 opacity-30" />
          Pilih sukan di atas untuk mula input keputusan
        </div>
      )}
    </div>
  );
}
