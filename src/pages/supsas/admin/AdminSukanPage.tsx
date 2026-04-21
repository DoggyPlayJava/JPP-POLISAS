import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSupsas, SupsasSport } from '@/contexts/SupsasContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

const SPORT_ICONS = ['Trophy', 'Volleyball', 'Dumbbell', 'Bike', 'Waves', 'Target', 'Footprints', 'Sword', 'Shield', 'Zap', 'Activity', 'Flame'];
const FORMATS = [{ value: 'knockout', label: 'Sistem Gugur (KO)' }, { value: 'round_robin', label: 'Liga (Round Robin)' }, { value: 'group_knockout', label: 'Kumpulan + Gugur' }];
const GENDERS = [{ value: 'male', label: 'Lelaki' }, { value: 'female', label: 'Wanita' }, { value: 'mixed', label: 'Campur' }];
const CATEGORIES = [{ value: 'team', label: 'Berpasukan' }, { value: 'individual', label: 'Individu' }];

interface SportForm { name: string; category: string; gender: string; format: string; icon: string; venue: string; max_per_team: number; sort_order: number; }
const DEFAULT_FORM: SportForm = { name: '', category: 'team', gender: 'mixed', format: 'knockout', icon: 'Trophy', venue: '', max_per_team: 11, sort_order: 0 };

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SPORT_ICONS.map((icon) => {
        const Ic = (LucideIcons as any)[icon] || LucideIcons.Trophy;
        return (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            className={cn(
              'w-10 h-10 rounded-xl border flex items-center justify-center transition-all',
              value === icon
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-white/5 border-white/10 text-white/30 hover:text-white hover:border-white/20'
            )}
          >
            <Ic className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{label}</label>
      {children}
    </div>
  );
}

function inputCls() {
  return 'w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder-white/20 focus:outline-none focus:border-amber-500/40 focus:bg-white/8 transition-all';
}

export function AdminSukanPage() {
  const { sports, edition, refetch } = useSupsas();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<SupsasSport | null>(null);
  const [form, setForm] = useState<SportForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm(DEFAULT_FORM); setEditTarget(null); setShowForm(true); };
  const openEdit = (s: SupsasSport) => { setForm({ name: s.name, category: s.category, gender: s.gender, format: s.format, icon: s.icon, venue: s.venue ?? '', max_per_team: s.max_per_team, sort_order: s.sort_order }); setEditTarget(s); setShowForm(true); };

  const handleSave = async () => {
    if (!edition) { toast.error('Tiada edisi ditemui. Cipta edisi dahulu dalam Tetapan.'); return; }
    if (!form.name.trim()) { toast.error('Sila isi nama sukan'); return; }
    setSaving(true);
    const payload = { ...form, edition_id: edition.id };
    const { error } = editTarget
      ? await supabase.from('supsas_sports').update(payload).eq('id', editTarget.id)
      : await supabase.from('supsas_sports').insert(payload);
    setSaving(false);
    if (error) { toast.error('Gagal simpan: ' + error.message); return; }
    toast.success(editTarget ? 'Sukan dikemas kini!' : 'Sukan ditambah!');
    setShowForm(false);
    refetch();
  };


  const handleToggle = async (sport: SupsasSport) => {
    const { error } = await supabase.from('supsas_sports').update({ is_active: !sport.is_active }).eq('id', sport.id);
    if (error) { toast.error('Gagal kemaskini'); return; }
    toast.success(sport.is_active ? 'Sukan dinonaktifkan' : 'Sukan diaktifkan');
    refetch();
  };

  const handleDelete = async (sport: SupsasSport) => {
    if (!confirm(`Padam sukan "${sport.name}"? Tindakan ini tidak boleh diundur.`)) return;
    const { error } = await supabase.from('supsas_sports').delete().eq('id', sport.id);
    if (error) { toast.error('Gagal padam'); return; }
    toast.success('Sukan dipadam');
    refetch();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Urus Sukan</h1>
          <p className="text-white/30 text-sm mt-1">{sports.length} sukan dalam edisi ini</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Sukan
        </button>
      </div>

      {/* Edition status warnings */}
      {!edition && (
        <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 text-center text-red-400/70 text-sm space-y-2">
          <p className="font-black">Tiada edisi ditemui</p>
          <p className="text-xs text-red-400/50">Pergi ke <strong>Tetapan Edisi</strong> untuk mencipta edisi SUPSAS baharu.</p>
        </div>
      )}
      {edition && !edition.is_active && (
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
          <span className="text-amber-400 text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-amber-400 text-xs font-black">Edisi <strong>{edition.name}</strong> belum diaktifkan</p>
            <p className="text-amber-400/50 text-[10px] mt-0.5">Sukan boleh ditambah sekarang. Aktifkan edisi dalam <strong>Tetapan</strong> supaya scoreboard public hidup.</p>
          </div>
        </div>
      )}


      {/* Sports list */}
      <div className="space-y-3">
        {sports.map((sport, i) => {
          const Ic = (LucideIcons as any)[sport.icon] || LucideIcons.Trophy;
          return (
            <motion.div
              key={sport.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'flex items-center gap-4 p-4 rounded-2xl border transition-all',
                sport.is_active ? 'bg-white/[0.02] border-white/5' : 'bg-white/[0.01] border-white/[0.03] opacity-60'
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Ic className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm">{sport.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{sport.format.replace('_', ' ')}</span>
                  <span className="text-white/10">·</span>
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{sport.gender}</span>
                  <span className="text-white/10">·</span>
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{sport.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn('px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border',
                  sport.is_active ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-white/20 bg-white/5 border-white/10'
                )}>
                  {sport.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <button onClick={() => openEdit(sport)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleToggle(sport)} className={cn('w-8 h-8 flex items-center justify-center rounded-xl border transition-all', sport.is_active ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20')}>
                  {sport.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button onClick={() => handleDelete(sport)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/20 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
        {sports.length === 0 && !edition && null}
        {sports.length === 0 && edition && (
          <div className="text-center py-12 text-white/20 text-sm font-black uppercase tracking-widest">
            Belum ada sukan. Tambah sukan pertama!
          </div>
        )}
      </div>

      {/* Modal / Drawer */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed inset-x-4 bottom-4 top-16 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[540px] z-50 bg-[#0A1628] border border-white/10 rounded-[2rem] shadow-[0_20px_80px_rgba(0,0,0,0.7)] overflow-y-auto"
            >
              <div className="p-6 space-y-5">
                {/* Modal Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-white">{editTarget ? 'Edit Sukan' : 'Tambah Sukan Baharu'}</h2>
                  <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <FormField label="Nama Sukan">
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="cth: Bola Sepak" className={inputCls()} />
                </FormField>

                <FormField label="Ikon">
                  <IconPicker value={form.icon} onChange={v => setForm(p => ({ ...p, icon: v }))} />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Kategori">
                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputCls()}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Jantina">
                    <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} className={inputCls()}>
                      {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </FormField>
                </div>

                <FormField label="Format Pertandingan">
                  <select value={form.format} onChange={e => setForm(p => ({ ...p, format: e.target.value }))} className={inputCls()}>
                    {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Gelanggang / Venue">
                    <input value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} placeholder="cth: Padang A" className={inputCls()} />
                  </FormField>
                  <FormField label="Max Pemain / Pasukan">
                    <input type="number" value={form.max_per_team} onChange={e => setForm(p => ({ ...p, max_per_team: +e.target.value }))} className={inputCls()} />
                  </FormField>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <span className="animate-spin">⟳</span> : <Save className="w-4 h-4" />}
                  {editTarget ? 'Simpan Perubahan' : 'Tambah Sukan'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
