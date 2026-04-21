import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Calendar, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSupsas } from '@/contexts/SupsasContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface EditionForm {
  name: string;
  tagline: string;
  edition_year: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const DEFAULT_FORM: EditionForm = {
  name: `SUPSAS ${new Date().getFullYear()}`,
  tagline: 'Bersatu, Berjuang, Berjaya',
  edition_year: new Date().getFullYear(),
  start_date: '',
  end_date: '',
  is_active: false,
};

export function AdminTetapanPage() {
  const { edition, refetch } = useSupsas();
  const [form, setForm] = useState<EditionForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (edition) {
      setForm({
        name: edition.name,
        tagline: edition.tagline ?? '',
        edition_year: edition.edition_year,
        start_date: edition.start_date ?? '',
        end_date: edition.end_date ?? '',
        is_active: edition.is_active,
      });
    }
  }, [edition]);

  const inputCls = 'w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder-white/20 focus:outline-none focus:border-amber-500/40 focus:bg-white/8 transition-all';

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Sila isi nama edisi'); return; }
    setSaving(true);
    const payload = { ...form, edition_year: Number(form.edition_year) };
    const { error } = edition
      ? await supabase.from('supsas_editions').update(payload).eq('id', edition.id)
      : await supabase.from('supsas_editions').insert(payload);
    setSaving(false);
    if (error) { toast.error('Gagal simpan: ' + error.message); return; }
    toast.success('Tetapan edisi disimpan!');
    refetch();
  };

  const handleActivate = async () => {
    if (!edition) return;
    if (!confirm('Aktifkan edisi ini? Hanya satu edisi boleh aktif pada satu masa.')) return;
    const { error } = await supabase.from('supsas_editions').update({ is_active: true }).eq('id', edition.id);
    if (error) { toast.error('Gagal aktifkan: ' + error.message); return; }
    toast.success('Edisi diaktifkan! SUPSAS sekarang aktif.');
    refetch();
  };

  const handleDeactivate = async () => {
    if (!edition) return;
    if (!confirm('Nyahaktifkan edisi ini? Scoreboard akan show "tiada edisi aktif".')) return;
    const { error } = await supabase.from('supsas_editions').update({ is_active: false }).eq('id', edition.id);
    if (error) { toast.error('Gagal nyahaktifkan'); return; }
    toast.success('Edisi dinyahaktifkan');
    refetch();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Tetapan Edisi</h1>
        <p className="text-white/30 text-sm mt-1">Urus edisi SUPSAS yang aktif</p>
      </div>

      {/* Active status */}
      {edition && (
        <div className={cn(
          'flex items-center justify-between p-5 rounded-3xl border',
          edition.is_active
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-amber-500/5 border-amber-500/15'
        )}>
          <div className="flex items-center gap-3">
            {edition.is_active
              ? <CheckCircle className="w-5 h-5 text-emerald-400" />
              : <AlertTriangle className="w-5 h-5 text-amber-400" />
            }
            <div>
              <p className={cn('font-black text-sm', edition.is_active ? 'text-emerald-400' : 'text-amber-400')}>
                {edition.is_active ? 'Edisi Sedang Aktif' : 'Edisi Tidak Aktif'}
              </p>
              <p className="text-white/30 text-xs">
                {edition.is_active
                  ? 'Papan markah public sedang live. Scoreboard boleh diakses tanpa log masuk.'
                  : 'Aktifkan edisi ini supaya scoreboard public boleh dipapar.'
                }
              </p>
            </div>
          </div>
          <button
            onClick={edition.is_active ? handleDeactivate : handleActivate}
            className={cn(
              'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
              edition.is_active
                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
            )}
          >
            {edition.is_active ? 'Nyahaktifkan' : 'Aktifkan'}
          </button>
        </div>
      )}

      {/* Form */}
      <div className="space-y-5 p-6 rounded-3xl bg-white/[0.02] border border-white/5">
        <h2 className="text-sm font-black uppercase tracking-widest text-white/50">
          {edition ? 'Kemaskini Edisi Semasa' : 'Cipta Edisi Baharu'}
        </h2>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Nama Edisi</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="cth: SUPSAS 2025" className={inputCls} />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Tagline</label>
          <input value={form.tagline} onChange={e => setForm(p => ({ ...p, tagline: e.target.value }))}
            placeholder="cth: Bersatu, Berjuang, Berjaya" className={inputCls} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Tahun</label>
            <input type="number" value={form.edition_year} onChange={e => setForm(p => ({ ...p, edition_year: +e.target.value }))} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Tarikh Mula</label>
            <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Tarikh Tamat</label>
            <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className={inputCls} />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {edition ? 'Simpan Perubahan' : 'Cipta Edisi'}
        </button>
      </div>
    </div>
  );
}
