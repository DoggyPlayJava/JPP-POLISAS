import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useKarnival } from '@/contexts/KarnivalContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import {
  Calendar, Save, Loader2, ToggleLeft, ToggleRight,
  Eye, EyeOff, Zap, ZapOff, Plus, AlertTriangle,
} from 'lucide-react';

export function KarnivalAdminEdition() {
  const { edition, refetch } = useKarnival();
  const [saving, setSaving] = useState(false);

  // Form state — sync with edition
  const [form, setForm] = useState({
    name:         edition?.name ?? '',
    tagline:      edition?.tagline ?? '',
    edition_year: edition?.edition_year ?? new Date().getFullYear(),
    start_date:   edition?.start_date ?? '',
    end_date:     edition?.end_date ?? '',
  });

  const update = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // Sync bila edition berubah
  React.useEffect(() => {
    if (edition) {
      setForm({
        name:         edition.name,
        tagline:      edition.tagline ?? '',
        edition_year: edition.edition_year,
        start_date:   edition.start_date ?? '',
        end_date:     edition.end_date ?? '',
      });
    }
  }, [edition?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create new edition ──────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Nama edisi diperlukan'); return; }
    setSaving(true);
    const { error } = await supabase.from('karnival_editions').insert({
      name:         form.name.trim(),
      tagline:      form.tagline.trim() || null,
      edition_year: form.edition_year,
      start_date:   form.start_date || null,
      end_date:     form.end_date || null,
    });
    if (error) toast.error(error.message);
    else { toast.success('Edisi berjaya dicipta!'); refetch(); }
    setSaving(false);
  };

  // ── Update existing edition ─────────────────────────────────
  const handleUpdate = async () => {
    if (!edition) return;
    if (!form.name.trim()) { toast.error('Nama edisi diperlukan'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('karnival_editions')
      .update({
        name:         form.name.trim(),
        tagline:      form.tagline.trim() || null,
        edition_year: form.edition_year,
        start_date:   form.start_date || null,
        end_date:     form.end_date || null,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', edition.id);
    if (error) toast.error(error.message);
    else { toast.success('Edisi dikemas kini!'); refetch(); }
    setSaving(false);
  };

  // ── Toggle helpers ──────────────────────────────────────────
  const toggle = async (field: 'is_active' | 'voting_enabled' | 'results_published', currentVal: boolean) => {
    if (!edition) return;
    const { error } = await supabase
      .from('karnival_editions')
      .update({ [field]: !currentVal, updated_at: new Date().toISOString() })
      .eq('id', edition.id);
    if (error) toast.error(error.message);
    else refetch();
  };

  // ── Input classes ────────────────────────────────────────────
  const inputCls = 'w-full px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.18] text-sm font-medium text-white placeholder-white/40 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all';

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Form ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.18] bg-white/[0.06] p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-violet-400" />
          <p className="text-sm font-black text-white">
            {edition ? 'Kemaskini Edisi' : 'Cipta Edisi Baru'}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">
              Nama Karnival *
            </label>
            <input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Hari Karnival JPP POLISAS 2025"
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">Tagline</label>
            <input
              value={form.tagline}
              onChange={e => update('tagline', e.target.value)}
              placeholder="Bersama Lebih Berjaya"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">Tahun</label>
              <input
                type="number"
                value={form.edition_year}
                onChange={e => update('edition_year', parseInt(e.target.value))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">Tarikh Mula</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => update('start_date', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5 block">Tarikh Tamat</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => update('end_date', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <button
          onClick={edition ? handleUpdate : handleCreate}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : edition ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {edition ? 'Simpan Perubahan' : 'Cipta Edisi'}
        </button>
      </div>

      {/* ── Toggles (hanya bila edisi wujud) ─────────────────── */}
      {edition && (
        <div className="rounded-2xl border border-white/[0.18] bg-white/[0.06] p-6 space-y-4">
          <p className="text-sm font-black text-white mb-2">Kawalan Status</p>

          {/* is_active */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.06] border border-white/[0.14]">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${edition.is_active ? 'bg-violet-600/20' : 'bg-white/5'}`}>
                {edition.is_active ? <Zap className="w-4 h-4 text-violet-400" /> : <ZapOff className="w-4 h-4 text-white/30" />}
              </div>
              <div>
                <p className="text-sm font-black text-white">Aktifkan Karnival</p>
                <p className="text-xs text-white/60">PortalPage akan tunjuk tema purple + confetti</p>
              </div>
            </div>
            <button onClick={() => toggle('is_active', edition.is_active)} className="flex-shrink-0">
              {edition.is_active
                ? <ToggleRight className="w-9 h-9 text-violet-400" />
                : <ToggleLeft  className="w-9 h-9 text-white/20" />}
            </button>
          </div>

          {/* voting_enabled */}
          <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            edition.is_active
              ? 'bg-white/[0.06] border-white/[0.14]'
              : 'bg-white/[0.01] border-white/[0.04] opacity-50 pointer-events-none'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${edition.voting_enabled ? 'bg-emerald-600/20' : 'bg-white/5'}`}>
                {edition.voting_enabled ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-white/30" />}
              </div>
              <div>
                <p className="text-sm font-black text-white">Buka Pengundian</p>
                <p className="text-xs text-white/60">QR code booth akan mula berfungsi</p>
              </div>
            </div>
            <button onClick={() => toggle('voting_enabled', edition.voting_enabled)} className="flex-shrink-0">
              {edition.voting_enabled
                ? <ToggleRight className="w-9 h-9 text-emerald-400" />
                : <ToggleLeft  className="w-9 h-9 text-white/20" />}
            </button>
          </div>

          {/* results_published */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.06] border border-white/[0.14]">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${edition.results_published ? 'bg-amber-600/20' : 'bg-white/5'}`}>
                <AlertTriangle className={`w-4 h-4 ${edition.results_published ? 'text-amber-400' : 'text-white/30'}`} />
              </div>
              <div>
                <p className="text-sm font-black text-white">Umumkan Keputusan</p>
                <p className="text-xs text-white/60">Pelajar boleh lihat keputusan akhir</p>
              </div>
            </div>
            <button onClick={() => toggle('results_published', edition.results_published)} className="flex-shrink-0">
              {edition.results_published
                ? <ToggleRight className="w-9 h-9 text-amber-400" />
                : <ToggleLeft  className="w-9 h-9 text-white/20" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
