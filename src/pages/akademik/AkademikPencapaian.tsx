import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { hexToRgba } from '@/lib/utils';
import { uploadPdfToDrive } from '@/lib/driveUpload';
import {
  Plus, Trophy, Clock, CheckCircle, XCircle, Upload,
  ChevronDown, X, FileText, AlertCircle, Loader2, Trash2, UnlockKeyhole,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';

const THEME = '#818CF8';

const JENIS_OPTIONS  = ['ANUGERAH', 'SIJIL', 'PERTANDINGAN'];
const PERINGKAT_OPTIONS = ['ANTARABANGSA', 'KEBANGSAAN', 'NEGERI', 'DAERAH'];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  MENUNGGU: { label: 'Menunggu', color: '#F59E0B', bg: '#F59E0B18', icon: Clock },
  DISAHKAN: { label: 'Disahkan', color: '#10B981', bg: '#10B98118', icon: CheckCircle },
  DITOLAK:  { label: 'Ditolak',  color: '#EF4444', bg: '#EF444418', icon: XCircle },
};

// ─── Form Tambah Pencapaian ───────────────────────────────────
function TambahForm({ categories, meritConfig, onClose, onSuccess }: any) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    category_id: '', jenis: '', peringkat: '',
    nama_pencapaian: '', penganjur: '', tarikh: '',
  });
  const [file, setFile]       = useState<File | null>(null);
  const [saving, setSaving]   = useState(false);

  const meritPreview = meritConfig.find(
    (m: any) => m.jenis === form.jenis && m.peringkat === form.peringkat
  )?.merit_value ?? 0;

  const handleSubmit = async () => {
    if (!form.jenis || !form.peringkat || !form.nama_pencapaian) {
      toast.error('Sila lengkapkan medan wajib.'); return;
    }
    setSaving(true);
    try {
      let drive_view_url = null;
      let drive_download_url = null;
      let drive_file_id = null;

      if (file) {
        const url = await uploadPdfToDrive(
          file,
          'Akademik-Pencapaian',
          `pencapaian_${profile?.id}_${Date.now()}`
        );
        drive_view_url = url;
        drive_download_url = url;
      }

      const { error } = await supabase.from('akademik_pencapaian').insert({
        user_id:         profile!.id,
        category_id:     form.category_id || null,
        jenis:           form.jenis,
        peringkat:       form.peringkat,
        nama_pencapaian: form.nama_pencapaian,
        penganjur:       form.penganjur || null,
        tarikh:          form.tarikh || null,
        drive_view_url,
        drive_download_url,
        drive_file_id,
        merit_auto:      meritPreview,
        status:          'MENUNGGU',
      });

      if (error) throw error;
      toast.success('Pencapaian berjaya dihantar! Menunggu pengesahan exco.');
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Gagal hantar pencapaian.');
    } finally {
      setSaving(false);
    }
  };

  const field = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 rounded-[2rem] border border-white/[0.08] overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-900 border-b border-white/[0.06]">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-0.5">Baharu</p>
            <h2 className="text-lg font-black text-white">Tambah Pencapaian</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Kategori */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Kategori Sijil</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => field('category_id', form.category_id === cat.id ? '' : cat.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all"
                  style={form.category_id === cat.id
                    ? { background: `${cat.color}25`, borderColor: cat.color, color: cat.color }
                    : { background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
                  }
                >
                  <span>{cat.icon}</span> {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Jenis */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Jenis <span className="text-rose-400">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {JENIS_OPTIONS.map(j => (
                <button
                  key={j}
                  onClick={() => field('jenis', j)}
                  className="py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all"
                  style={form.jenis === j
                    ? { background: `${THEME}25`, borderColor: THEME, color: THEME }
                    : { background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
                  }
                >
                  {j}
                </button>
              ))}
            </div>
          </div>

          {/* Peringkat */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Peringkat <span className="text-rose-400">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PERINGKAT_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => field('peringkat', p)}
                  className="py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all"
                  style={form.peringkat === p
                    ? { background: `${THEME}25`, borderColor: THEME, color: THEME }
                    : { background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
                  }
                >
                  {p === 'ANTARABANGSA' ? 'Antarabangsa' : p === 'KEBANGSAAN' ? 'Kebangsaan' : p === 'NEGERI' ? 'Negeri' : p === 'DAERAH' ? 'Daerah' : 'Dalaman'}
                </button>
              ))}
            </div>
          </div>

          {/* Merit Preview */}
          {form.jenis && form.peringkat && (
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <Trophy className="w-4 h-4 shrink-0" style={{ color: THEME }} />
              <p className="text-xs font-black text-white/60">
                Merit dijangka: <span className="font-black" style={{ color: THEME }}>+{meritPreview} merit</span>
                <span className="text-white/30 font-medium ml-1">(selepas disahkan exco)</span>
              </p>
            </div>
          )}

          {/* Nama */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Nama Pencapaian <span className="text-rose-400">*</span></label>
            <input
              value={form.nama_pencapaian}
              onChange={e => field('nama_pencapaian', e.target.value)}
              placeholder="Contoh: Johan Pertandingan Debat Kebangsaan 2025"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/20 font-medium outline-none focus:border-white/20 transition-all"
            />
          </div>

          {/* Grid: Penganjur + Tarikh */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Penganjur</label>
              <input
                value={form.penganjur}
                onChange={e => field('penganjur', e.target.value)}
                placeholder="Nama penganjur"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/20 font-medium outline-none focus:border-white/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Tarikh</label>
              <input
                type="date"
                value={form.tarikh}
                onChange={e => field('tarikh', e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Upload Sijil PDF */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Upload Sijil (PDF)</label>
            <label className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] hover:border-white/20 transition-all group">
              <Upload className="w-4 h-4 text-white/30 group-hover:text-white/50 transition-colors" />
              <div className="flex-1 min-w-0">
                {file
                  ? <p className="text-xs font-black text-white/70 truncate">{file.name}</p>
                  : <p className="text-xs font-black text-white/30">Klik untuk pilih PDF (maks 30MB)</p>
                }
              </div>
              {file && (
                <button
                  onClick={e => { e.preventDefault(); setFile(null); }}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.08]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50"
            style={{ background: THEME, color: '#fff', boxShadow: `0 8px 24px ${hexToRgba(THEME, 0.3)}` }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
            {saving ? 'Menghantar...' : 'Hantar Pencapaian'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function AkademikPencapaian() {
  const { profile } = useAuth();
  const [pencapaian, setPencapaian] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [meritConfig, setMeritConfig] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter]     = useState<'SEMUA' | 'MENUNGGU' | 'DISAHKAN' | 'DITOLAK'>('SEMUA');
  const [unlockTarget, setUnlockTarget]   = useState<any>(null);
  const [unlockReason, setUnlockReason]   = useState('');
  const [unlockSaving, setUnlockSaving]   = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const [pencRes, catRes, configRes, unlockRes] = await Promise.all([
      supabase
        .from('akademik_pencapaian')
        .select('*, akademik_sijil_categories(name, icon, color)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('akademik_sijil_categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('akademik_merit_config').select('*'),
      supabase
        .from('akademik_unlock_requests')
        .select('pencapaian_id, status, unlocked_until, reviewer_note')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false }),
    ]);
    // Map unlock requests by pencapaian_id (most recent per pencapaian)
    const unlockMap: Record<string, any> = {};
    for (const req of (unlockRes.data || [])) {
      if (!unlockMap[req.pencapaian_id]) unlockMap[req.pencapaian_id] = req;
    }
    setPencapaian((pencRes.data || []).map(p => ({ ...p, _unlock: unlockMap[p.id] ?? null })));
    setCategories(catRes.data || []);
    setMeritConfig(configRes.data || []);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Padam pencapaian ini? Tindakan ini tidak boleh dibatalkan.')) return;

    // Fetch the pencapaian first so we can reverse merit if it was DISAHKAN
    const { data: pencRow } = await supabase
      .from('akademik_pencapaian')
      .select('id, status, merit_override, merit_auto, nama_pencapaian, user_id')
      .eq('id', id)
      .single();

    const { error, count } = await supabase
      .from('akademik_pencapaian')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      toast.error('Gagal padam: ' + error.message);
      return;
    }
    if (count === 0) {
      // RLS blocked the delete silently — possible causes:
      // 1. DISAHKAN but unlock window expired
      // 2. Not owner
      toast.error('Tidak dapat dipadam. Jika pencapaian ini telah disahkan, sila mohon buka kunci dahulu atau semak tempoh buka kunci sudah tamat.');
      return;
    }

    // ── Reverse merit if the pencapaian was DISAHKAN ───────────────────────
    if (pencRow && pencRow.status === 'DISAHKAN') {
      // Get the actual points awarded from merit_transactions (source of truth)
      const { data: txRow } = await supabase
        .from('merit_transactions')
        .select('points')
        .eq('reference_id', id)
        .eq('source', 'AKADEMIK')
        .gt('points', 0)   // only the original credit, not prior reversals
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const meritToReverse = txRow?.points ?? pencRow.merit_override ?? pencRow.merit_auto ?? 0;

      if (meritToReverse > 0) {
        // Insert a negative reversal transaction
        await supabase.from('merit_transactions').insert({
          user_id:      pencRow.user_id,
          club_id:      null,
          points:       -meritToReverse,
          reason:       `Pemadaman Pencapaian: ${pencRow.nama_pencapaian}`,
          actor_name:   'Sistem',
          source:       'AKADEMIK',
          reference_id: id,
        });
        // Decrement profile merit counters
        await supabase.rpc('increment_merit_by_source', {
          p_uid:   pencRow.user_id,
          p_delta: -meritToReverse,
          p_src:   'AKADEMIK',
        });
      }
    }

    toast.success('Pencapaian berjaya dipadam.');
    load();
  };


  const handleUnlockRequest = async () => {
    if (!unlockReason.trim()) { toast.error('Sila nyatakan sebab permohonan.'); return; }
    if (!unlockTarget || !profile?.id) return;
    setUnlockSaving(true);
    try {
      const { error } = await supabase.from('akademik_unlock_requests').insert({
        pencapaian_id: unlockTarget.id,
        user_id: profile.id,
        reason: unlockReason.trim(),
      });
      if (error) throw error;
      toast.success('Permohonan buka kunci dihantar! Menunggu kelulusan exco.');
      setUnlockTarget(null);
      setUnlockReason('');
    } catch (e: any) {
      toast.error('Gagal: ' + e.message);
    } finally {
      setUnlockSaving(false);
    }
  };

  const filtered = filter === 'SEMUA' ? pencapaian : pencapaian.filter(p => p.status === filter);
  const counts   = {
    SEMUA:    pencapaian.length,
    MENUNGGU: pencapaian.filter(p => p.status === 'MENUNGGU').length,
    DISAHKAN: pencapaian.filter(p => p.status === 'DISAHKAN').length,
    DITOLAK:  pencapaian.filter(p => p.status === 'DITOLAK').length,
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showForm && (
          <TambahForm
            categories={categories}
            meritConfig={meritConfig}
            onClose={() => setShowForm(false)}
            onSuccess={load}
          />
        )}
        {/* Unlock Request Modal */}
        {unlockTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setUnlockTarget(null)} />
            <div className="relative w-full max-w-md bg-slate-900 rounded-[2rem] border border-white/[0.08] p-6 space-y-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${THEME}20`, color: THEME }}>
                  <UnlockKeyhole className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Permohonan</p>
                  <h3 className="text-sm font-black text-white">Buka Kunci Pencapaian</h3>
                </div>
                <button onClick={() => setUnlockTarget(null)} className="ml-auto p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-white/40">Pencapaian <strong className="text-white/70">{unlockTarget.nama_pencapaian}</strong> telah disahkan. Nyatakan sebab permohonan buka kunci untuk edit/padam.</p>
              <textarea
                value={unlockReason}
                onChange={e => setUnlockReason(e.target.value)}
                placeholder="Nyatakan sebab permohonan..."
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleUnlockRequest}
                  disabled={unlockSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50"
                  style={{ background: THEME, color: '#fff' }}
                >
                  {unlockSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UnlockKeyhole className="w-3.5 h-3.5" />}
                  {unlockSaving ? 'Menghantar...' : 'Hantar Permohonan'}
                </button>
                <button onClick={() => setUnlockTarget(null)} className="px-4 py-3 rounded-xl text-xs font-black uppercase text-white/30 bg-white/[0.04]">Batal</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-1">Rekod</p>
          <h1 className="text-2xl font-black text-white">Pencapaian Saya</h1>
          <p className="text-xs text-white/40 font-medium mt-1">
            Rekod anugerah, sijil & pertandingan — merit dikira automatik
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
          style={{ background: THEME, color: '#fff', boxShadow: `0 8px 24px ${hexToRgba(THEME, 0.25)}` }}
        >
          <Plus className="w-4 h-4" />
          Tambah
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['SEMUA', 'MENUNGGU', 'DISAHKAN', 'DITOLAK'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all"
            style={filter === f
              ? { background: `${THEME}20`, borderColor: THEME, color: THEME }
              : { background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }
            }
          >
            {f} <span className="opacity-60">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-[1.5rem] bg-white/[0.03] animate-pulse border border-white/[0.04]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <Trophy className="w-10 h-10 mx-auto text-white/10" />
          <p className="text-[11px] font-black uppercase tracking-widest text-white/20">
            {filter === 'SEMUA' ? 'Belum ada pencapaian' : `Tiada pencapaian ${filter.toLowerCase()}`}
          </p>
          {filter === 'SEMUA' && (
            <button
              onClick={() => setShowForm(true)}
              className="text-[10px] font-black uppercase tracking-wider underline underline-offset-2 hover:opacity-70 transition-opacity"
              style={{ color: THEME }}
            >
              + Tambah Pencapaian Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p, i) => {
            const sc  = STATUS_CFG[p.status] || STATUS_CFG.MENUNGGU;
            const SIcon = sc.icon;
            const cat = p.akademik_sijil_categories;
            const merit = p.merit_override ?? p.merit_auto;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-4 p-4 rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
              >
                {/* Cat icon */}
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: cat ? `${cat.color}20` : `${THEME}15` }}
                >
                  {cat?.icon || '🏆'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white line-clamp-1">{p.nama_pencapaian}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-[10px] font-bold text-white/30">{p.jenis}</span>
                    <span className="text-[10px] font-bold text-white/20">·</span>
                    <span className="text-[10px] font-bold text-white/30">{p.peringkat}</span>
                    {p.penganjur && (
                      <>
                        <span className="text-[10px] font-bold text-white/20">·</span>
                        <span className="text-[10px] font-bold text-white/30">{p.penganjur}</span>
                      </>
                    )}
                    {p.tarikh && (
                      <>
                        <span className="text-[10px] font-bold text-white/20">·</span>
                        <span className="text-[10px] font-bold text-white/30">
                          {format(new Date(p.tarikh), 'd MMM yyyy', { locale: ms })}
                        </span>
                      </>
                    )}
                  </div>
                  {p.status === 'DITOLAK' && p.rejection_reason && (
                    <div className="flex items-start gap-2 mt-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/15">
                      <AlertCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-rose-400/80 font-medium">{p.rejection_reason}</p>
                    </div>
                  )}
                  {p.status === 'DISAHKAN' && p.merit_override !== null && p.merit_override < p.merit_auto && p.rejection_reason && (
                    <div className="flex items-start gap-2 mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/15">
                      <AlertCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-400/80 font-medium">Sebab Pengurangan: {p.rejection_reason}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[8px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: sc.bg, color: sc.color }}>
                    <SIcon className="w-2.5 h-2.5" />
                    {sc.label}
                  </span>
                  {p.status === 'DISAHKAN' && (
                    <div className="flex flex-col items-end">
                      {p.merit_override !== null && p.merit_override !== p.merit_auto ? (
                        <>
                          <span className="text-[8px] font-bold text-white/30 line-through">+{p.merit_auto} asal</span>
                          <span className="text-[10px] font-black" style={{ color: THEME }}>+{p.merit_override} merit</span>
                        </>
                      ) : (
                        <span className="text-[9px] font-black" style={{ color: THEME }}>+{merit} merit</span>
                      )}
                    </div>
                  )}
                  {p.drive_view_url && (
                    <a
                      href={p.drive_view_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-black text-white/25 hover:text-white/60 flex items-center gap-1 transition-colors"
                    >
                      <FileText className="w-2.5 h-2.5" /> Sijil
                    </a>
                  )}
                  {/* Action buttons */}
                  {(p.status === 'MENUNGGU' || p.status === 'DITOLAK') && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Padam pencapaian"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {p.status === 'DISAHKAN' && (() => {
                    const unlock = p._unlock;
                    const isApproved = unlock?.status === 'DILULUSKAN';
                    const withinWindow = isApproved && unlock?.unlocked_until && new Date(unlock.unlocked_until) > new Date();
                    const isPending    = unlock?.status === 'MENUNGGU';
                    const isRejected   = unlock?.status === 'DITOLAK';

                    if (withinWindow) {
                      // Calculate remaining hours
                      const hoursLeft = Math.max(0, Math.ceil((new Date(unlock.unlocked_until).getTime() - Date.now()) / 3600000));
                      return (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            🔓 Diluluskan ({hoursLeft}j lagi)
                          </span>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-rose-500/20"
                          >
                            <Trash2 className="w-2.5 h-2.5" /> Padam
                          </button>
                        </div>
                      );
                    }
                    if (isPending) {
                      return (
                        <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          ⏳ Menunggu Kelulusan
                        </span>
                      );
                    }
                    if (isRejected) {
                      return (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[8px] font-black text-rose-400/80 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/15">
                            ✕ Ditolak
                          </span>
                          {unlock?.reviewer_note && (
                            <p className="text-[8px] text-white/25 max-w-[120px] text-right">{unlock.reviewer_note}</p>
                          )}
                          <button
                            onClick={() => { setUnlockTarget(p); setUnlockReason(''); }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition-all border border-white/[0.06]"
                          >
                            <UnlockKeyhole className="w-2.5 h-2.5" /> Cuba Lagi
                          </button>
                        </div>
                      );
                    }
                    // No request yet
                    const isReduced = p.merit_override !== null && p.merit_override < p.merit_auto;
                    return (
                      <button
                        onClick={() => { setUnlockTarget(p); setUnlockReason(''); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-amber-400 hover:bg-amber-500/10 transition-all border border-white/[0.06] hover:border-amber-500/20"
                        title={isReduced ? "Rayuan Markah / Buka Kunci" : "Minta buka kunci"}
                      >
                        <UnlockKeyhole className="w-2.5 h-2.5" /> {isReduced ? 'Rayuan Markah' : 'Buka Kunci'}
                      </button>
                    );
                  })()}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
