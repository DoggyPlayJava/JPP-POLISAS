import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Edit2, Trash2, Copy, RefreshCw, Save, X, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSupsas, SupsasKontingen } from '@/contexts/SupsasContext';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

const DEPT_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#06B6D4','#84CC16'];

interface KontigenForm { name: string; short_code: string; color: string; }
const DEFAULT_FORM: KontigenForm = { name: '', short_code: '', color: '#3B82F6' };

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const array = new Uint32Array(8);
  window.crypto.getRandomValues(array);
  const code = Array.from(array, num => chars[num % chars.length]).join('');
  return code.slice(0, 4) + '-' + code.slice(4);
}

export function AdminKontigenPage() {
  const { kontingen, edition, refetch } = useSupsas();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<SupsasKontingen | null>(null);
  const [form, setForm] = useState<KontigenForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openNew = () => { setForm(DEFAULT_FORM); setEditTarget(null); setShowForm(true); };
  const openEdit = (k: SupsasKontingen) => {
    setForm({ name: k.name, short_code: k.short_code, color: k.color });
    setEditTarget(k);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!edition || !form.name.trim() || !form.short_code.trim()) { toast.error('Sila isi semua maklumat'); return; }
    setSaving(true);
    const payload = { ...form, edition_id: edition.id };
    const { error } = editTarget
      ? await supabase.from('supsas_kontingen').update(payload).eq('id', editTarget.id)
      : await supabase.from('supsas_kontingen').insert({ ...payload, invite_code: generateCode() });
    setSaving(false);
    if (error) { toast.error('Gagal simpan: ' + error.message); return; }
    toast.success(editTarget ? 'Kontinjen dikemas kini!' : 'Kontinjen ditambah dengan kod jemputan!');
    setShowForm(false);
    refetch();
  };

  const handleRegen = async (k: SupsasKontingen) => {
    if (!confirm(`Jana semula kod jemputan untuk ${k.name}? Kod lama akan tidak sah.`)) return;
    const newCode = generateCode();
    const { error } = await supabase.from('supsas_kontingen')
      .update({ invite_code: newCode, invite_used: false, leader_id: null })
      .eq('id', k.id);
    if (error) { toast.error('Gagal jana kod'); return; }
    toast.success('Kod baru dijana!');
    refetch();
  };

  const handleRevoke = async (k: SupsasKontingen) => {
    if (!confirm(`Batalkan ketua semasa untuk ${k.name}?`)) return;
    setRevoking(k.id);
    const { error } = await supabase.rpc('supsas_revoke_leader', { p_kontingen_id: k.id });
    setRevoking(null);
    if (error) { toast.error('Gagal batalkan'); return; }
    toast.success('Ketua dibatalkan');
    refetch();
  };

  const handleDelete = async (k: SupsasKontingen) => {
    if (!confirm(`Padam kontinjen "${k.name}"? Semua data peserta akan turut dipadam.`)) return;
    const { error } = await supabase.from('supsas_kontingen').delete().eq('id', k.id);
    if (error) { toast.error('Gagal padam'); return; }
    toast.success('Kontinjen dipadam');
    refetch();
  };

  const copyCode = (k: SupsasKontingen) => {
    if (!k.invite_code) return;
    navigator.clipboard.writeText(k.invite_code);
    setCopiedId(k.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Kod disalin!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Urus Kontinjen</h1>
          <p className="text-white/30 text-sm mt-1">{kontingen.length} jabatan berdaftar</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all">
          <Plus className="w-4 h-4" />
          Tambah Kontinjen
        </button>
      </div>

      {/* Kontingen list */}
      <div className="space-y-4">
        {kontingen.map((k: SupsasKontingen, i: number) => (
          <motion.div
            key={k.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden"
          >
            {/* Top section */}
            <div className="flex items-center gap-4 p-5">
              {/* Color + initial */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white flex-shrink-0 border-2"
                style={{ backgroundColor: `${k.color}20`, borderColor: `${k.color}50`, color: k.color }}
              >
                {k.short_code.charAt(0)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-base truncate">{k.name}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">{k.short_code}</p>
              </div>

              {/* Leader status */}
              <div className="hidden sm:flex items-center">
                {k.leader_id ? (
                  <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    ✓ Ada Ketua
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    Tiada Ketua
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEdit(k)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(k)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/20 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Invite code section */}
            <div className="px-5 pb-5 pt-0 border-t border-white/5 mt-0">
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                {/* Code display */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 font-mono text-sm text-white/60 truncate">
                    {k.invite_code ?? '—'}
                  </div>
                  <button
                    onClick={() => copyCode(k)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                  >
                    {copiedId === k.id ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Regen code */}
                <button
                  onClick={() => handleRegen(k)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/30 text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Jana Semula
                </button>

                {/* Revoke leader */}
                {k.leader_id && (
                  <button
                    onClick={() => handleRevoke(k)}
                    disabled={revoking === k.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex-shrink-0 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Batalkan Ketua
                  </button>
                )}
              </div>
              <p className="text-[9px] text-white/20 mt-2 font-medium">
                {k.invite_used ? '✓ Kod telah digunakan oleh ketua' : '⏳ Menunggu ketua guna kod jemputan'}
              </p>
            </div>
          </motion.div>
        ))}

        {kontingen.length === 0 && (
          <div className="text-center py-12 text-white/20 text-sm font-black uppercase tracking-widest">
            Belum ada kontinjen. Tambah jabatan pertama!
          </div>
        )}
      </div>

      {/* Modal */}
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
              className="fixed inset-x-4 bottom-4 top-auto md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:w-[480px] z-50 bg-[#0A1628] border border-white/10 rounded-[2rem] shadow-[0_20px_80px_rgba(0,0,0,0.7)] p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white">{editTarget ? 'Edit Kontinjen' : 'Tambah Kontinjen Baharu'}</h2>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Nama Jabatan</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="cth: Jabatan Teknologi Maklumat" className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-medium placeholder-white/20 focus:outline-none focus:border-amber-500/40 transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Kod Pendek</label>
                <input value={form.short_code} onChange={e => setForm(p => ({ ...p, short_code: e.target.value.toUpperCase().slice(0, 6) }))} placeholder="cth: JTM" className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-black uppercase placeholder-white/20 focus:outline-none focus:border-amber-500/40 transition-all" maxLength={6} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Warna Kontinjen</label>
                <div className="flex flex-wrap gap-2">
                  {DEPT_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                      className={cn('w-9 h-9 rounded-xl border-2 transition-all', form.color === c ? 'border-white scale-110' : 'border-transparent scale-100')}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                    className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 cursor-pointer" />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <span className="animate-spin">⟳</span> : <Save className="w-4 h-4" />}
                {editTarget ? 'Simpan Perubahan' : 'Tambah + Jana Kod Jemputan'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
