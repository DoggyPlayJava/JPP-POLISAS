import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, Save, X, Edit2, Trash2, Loader, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSupsas, SupsasFixture } from '@/contexts/SupsasContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { AdminMatchScoreModal } from './components/AdminMatchScoreModal';

interface FixtureForm {
  sport_id: string;
  round: string;
  match_number: string;
  kontingen_a_id: string;
  kontingen_b_id: string;
  match_date: string;
  match_time: string;
  venue: string;
  status: string;
  score_a: string;
  score_b: string;
  winner_id: string;
  notes: string;
}

const DEFAULT_FORM: FixtureForm = {
  sport_id: '', round: '', match_number: '', kontingen_a_id: '', kontingen_b_id: '',
  match_date: '', match_time: '', venue: '', status: 'upcoming',
  score_a: '', score_b: '', winner_id: '', notes: '',
};

const STATUS_OPTIONS = [
  { value: 'upcoming',  label: 'Akan Datang' },
  { value: 'live',      label: '🔴 Live' },
  { value: 'completed', label: 'Selesai' },
  { value: 'postponed', label: 'Ditangguh' },
];

const STATUS_CLS: Record<string, string> = {
  upcoming:  'bg-white/5 border-white/10 text-white/40',
  live:      'bg-red-500/20 border-red-500/30 text-red-400',
  completed: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  postponed: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
};

function inputCls() {
  return 'w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder-white/20 focus:outline-none focus:border-amber-500/40 transition-all';
}

export function AdminJadualPage() {
  const { fixtures, sports, kontingen, edition, refetch } = useSupsas();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<SupsasFixture | null>(null);
  const [scoreTarget, setScoreTarget] = useState<SupsasFixture | null>(null);
  const [form, setForm] = useState<FixtureForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [filterSport, setFilterSport] = useState<string>('all');

  const sportMap = Object.fromEntries(sports.map(s => [s.id, s.name]));
  const kontingenMap = Object.fromEntries(kontingen.map(k => [k.id, { name: k.name, short_code: k.short_code, color: k.color }]));

  const openNew = () => { setForm(DEFAULT_FORM); setEditTarget(null); setShowForm(true); };
  const openEdit = (f: SupsasFixture) => {
    setForm({
      sport_id: f.sport_id,
      round: f.round ?? '',
      match_number: f.match_number?.toString() ?? '',
      kontingen_a_id: f.kontingen_a_id ?? '',
      kontingen_b_id: f.kontingen_b_id ?? '',
      match_date: f.match_date ?? '',
      match_time: f.match_time ?? '',
      venue: f.venue ?? '',
      status: f.status,
      score_a: f.score_a ?? '',
      score_b: f.score_b ?? '',
      winner_id: f.winner_id ?? '',
      notes: f.notes ?? '',
    });
    setEditTarget(f);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!edition || !form.sport_id) { toast.error('Sila pilih sukan'); return; }
    setSaving(true);
    const payload = {
      edition_id: edition.id,
      sport_id: form.sport_id,
      round: form.round || null,
      match_number: form.match_number ? +form.match_number : null,
      kontingen_a_id: form.kontingen_a_id || null,
      kontingen_b_id: form.kontingen_b_id || null,
      match_date: form.match_date || null,
      match_time: form.match_time || null,
      venue: form.venue || null,
      status: form.status,
      score_a: form.score_a || null,
      score_b: form.score_b || null,
      winner_id: form.winner_id || null,
      notes: form.notes || null,
    };
    const { error } = editTarget
      ? await supabase.from('supsas_fixtures').update(payload).eq('id', editTarget.id)
      : await supabase.from('supsas_fixtures').insert(payload);
    setSaving(false);
    if (error) { toast.error('Gagal simpan: ' + error.message); return; }
    toast.success(editTarget ? 'Perlawanan dikemas kini!' : 'Perlawanan ditambah!');
    setShowForm(false);
    refetch();
  };

  const handleDelete = async (f: SupsasFixture) => {
    if (!confirm('Padam perlawanan ini?')) return;
    const { error } = await supabase.from('supsas_fixtures').delete().eq('id', f.id);
    if (error) { toast.error('Gagal padam'); return; }
    toast.success('Perlawanan dipadam');
    refetch();
  };

  const filtered = filterSport === 'all' ? fixtures : fixtures.filter(f => f.sport_id === filterSport);

  // Group by date
  const grouped: Record<string, SupsasFixture[]> = {};
  filtered.forEach(f => {
    const key = f.match_date ?? 'Tanpa Tarikh';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Jadual Pertandingan</h1>
          <p className="text-white/30 text-sm mt-1">{fixtures.length} perlawanan dijadualkan</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Perlawanan
        </button>
      </div>

      {/* Sport filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterSport('all')}
          className={cn('px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border',
            filterSport === 'all' ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
          )}
        >
          Semua Sukan
        </button>
        {sports.map(s => (
          <button
            key={s.id}
            onClick={() => setFilterSport(s.id)}
            className={cn('px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border',
              filterSport === s.id ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Fixtures grouped by date */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/20 text-sm font-black uppercase tracking-widest">Belum ada perlawanan dijadualkan</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, dayFixtures]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 px-3">
                  {date === 'Tanpa Tarikh' ? date : new Date(date).toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              <div className="space-y-2">
                {dayFixtures.map((f, i) => {
                  const a = f.kontingen_a_id ? kontingenMap[f.kontingen_a_id] : null;
                  const b = f.kontingen_b_id ? kontingenMap[f.kontingen_b_id] : null;
                  return (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
                    >
                      {/* Sport + round */}
                      <div className="w-28 flex-shrink-0">
                        <p className="text-xs font-black text-white/60 truncate">{sportMap[f.sport_id] ?? '—'}</p>
                        {f.round && <p className="text-[9px] text-amber-400/60 font-black uppercase tracking-widest truncate">{f.round}</p>}
                      </div>

                      {/* VS */}
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <span className="font-black text-sm text-white truncate">{a?.short_code ?? 'TBD'}</span>
                        <span className="text-white/20 font-black text-xs flex-shrink-0">VS</span>
                        <span className="font-black text-sm text-white truncate">{b?.short_code ?? 'TBD'}</span>
                        {f.status === 'completed' && (
                          <span className="text-xs font-black text-white/40 flex-shrink-0">
                            ({f.score_a ?? '?'} — {f.score_b ?? '?'})
                          </span>
                        )}
                      </div>

                      {/* Time + venue */}
                      <div className="hidden sm:flex flex-col items-end text-right flex-shrink-0 w-24">
                        {f.match_time && <span className="text-xs text-white/40 font-bold">{f.match_time.slice(0, 5)}</span>}
                        {f.venue && <span className="text-[9px] text-white/20 font-medium truncate max-w-[96px]">{f.venue}</span>}
                      </div>

                      {/* Status */}
                      <span className={cn('px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border flex-shrink-0', STATUS_CLS[f.status] ?? STATUS_CLS.upcoming)}>
                        {STATUS_OPTIONS.find(s => s.value === f.status)?.label ?? f.status}
                      </span>

                      {/* Actions */}
                      <div className="flex gap-1.5 flex-shrink-0">
                        {/* Quick Score button */}
                        <button
                          onClick={() => setScoreTarget(f)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                          title="Kemaskini Skor"
                        >
                          <Pencil className="w-3 h-3" />
                          Skor
                        </button>
                        <button onClick={() => openEdit(f)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(f)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/20 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Score Quick Update Modal */}
      <AnimatePresence>
        {scoreTarget && (
          <AdminMatchScoreModal
            fixture={scoreTarget}
            kontingenMap={Object.fromEntries(kontingen.map(k => [k.id, k]))}
            onClose={() => setScoreTarget(null)}
            onSaved={() => { setScoreTarget(null); refetch(); }}
          />
        )}
      </AnimatePresence>

      {/* Full Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="relative w-full max-w-[560px] max-h-[90vh] bg-[#0A1628] border border-white/10 rounded-[2rem] shadow-[0_20px_80px_rgba(0,0,0,0.7)] overflow-y-auto z-10"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-white">{editTarget ? 'Edit Perlawanan' : 'Tambah Perlawanan'}</h2>
                  <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sport */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Sukan</label>
                  <select value={form.sport_id} onChange={e => setForm(p => ({ ...p, sport_id: e.target.value }))} className={inputCls()}>
                    <option value="">— Pilih Sukan —</option>
                    {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Pusingan</label>
                    <input value={form.round} onChange={e => setForm(p => ({ ...p, round: e.target.value }))} placeholder="cth: Separuh Akhir" className={inputCls()} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">No. Perlawanan</label>
                    <input type="number" value={form.match_number} onChange={e => setForm(p => ({ ...p, match_number: e.target.value }))} placeholder="1" className={inputCls()} />
                  </div>
                </div>

                {/* Teams */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Pasukan A</label>
                    <select value={form.kontingen_a_id} onChange={e => setForm(p => ({ ...p, kontingen_a_id: e.target.value }))} className={inputCls()}>
                      <option value="">— TBD —</option>
                      {kontingen.map(k => <option key={k.id} value={k.id}>{k.short_code} — {k.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Pasukan B</label>
                    <select value={form.kontingen_b_id} onChange={e => setForm(p => ({ ...p, kontingen_b_id: e.target.value }))} className={inputCls()}>
                      <option value="">— TBD —</option>
                      {kontingen.map(k => <option key={k.id} value={k.id}>{k.short_code} — {k.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Date + Time */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Tarikh</label>
                    <input type="date" value={form.match_date} onChange={e => setForm(p => ({ ...p, match_date: e.target.value }))} className={inputCls()} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Masa</label>
                    <input type="time" value={form.match_time} onChange={e => setForm(p => ({ ...p, match_time: e.target.value }))} className={inputCls()} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Venue / Tempat</label>
                    <input value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} placeholder="cth: Padang A" className={inputCls()} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Status</label>
                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inputCls()}>
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Score fields — only if completed or live */}
                {(form.status === 'completed' || form.status === 'live') && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Skor A</label>
                      <input value={form.score_a} onChange={e => setForm(p => ({ ...p, score_a: e.target.value }))} placeholder="3" className={inputCls()} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Skor B</label>
                      <input value={form.score_b} onChange={e => setForm(p => ({ ...p, score_b: e.target.value }))} placeholder="1" className={inputCls()} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Pemenang</label>
                      <select value={form.winner_id} onChange={e => setForm(p => ({ ...p, winner_id: e.target.value }))} className={inputCls()}>
                        <option value="">— Tiada —</option>
                        {kontingen.map(k => <option key={k.id} value={k.id}>{k.short_code}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Nota (Pilihan)</label>
                  <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="cth: Ditangguh sebab hujan" className={inputCls()} />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editTarget ? 'Simpan Perubahan' : 'Tambah Perlawanan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
