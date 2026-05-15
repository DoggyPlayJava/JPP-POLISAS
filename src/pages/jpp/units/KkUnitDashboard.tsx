// ============================================================
// KkUnitDashboard — Dashboard khusus untuk unit KK
// (Exco Kediaman dan Kerohanian)
// Tab 1: Dashboard aktiviti & laporan (ExcoGenericDashboard)
// Tab 2: Unit Pengurusan Asrama — assign/remove staff
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, ChevronRight, LayoutGrid, ShieldCheck,
  UserPlus, Trash2, RefreshCw, QrCode, Trophy, CalendarDays,
  Plus, Pencil, Loader2, DownloadCloud, Palette, ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { hexToRgba } from '@/lib/utils';
import { ExcoGenericDashboard } from './ExcoGenericDashboard';
import { QrMeritManager } from '@/pages/akademik/AkademikQrScan';
import { DemeritManager } from '@/pages/akademik/DemeritManager';
import { MeritRasmiReviewPanel } from '@/components/program/MeritRasmiReviewPanel';
import { KamsisKlkStatsWidget } from './KamsisKlkStatsWidget';
import { TAKWIM_JENIS, SESI_OPTIONS } from '@/config/takwim-constants';
import type { TakwimItem } from '@/config/takwim-constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PDFDownloadLink } from '@react-pdf/renderer';
import TakwimPusatPDFTemplate from '@/components/reports/TakwimPusatPDFTemplate';
import { getContrastColor } from '@/lib/color-utils';

const LOGO_POLISAS_URL = '/polisas-logo.jpg';

async function toBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Logo fetch failed:', url, e);
    return '';
  }
}

const KK_COLOR = '#E879F9';

// ─── Rujukan Asrama Banner ────────────────────────────────────────────────────
function AsramaBanner() {
  const navigate = useNavigate();
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => navigate('/jpp/asrama')}
      className="w-full flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all group text-left hover:brightness-110"
      style={{
        background: hexToRgba(KK_COLOR, 0.06),
        borderColor: hexToRgba(KK_COLOR, 0.2),
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
        style={{ background: hexToRgba(KK_COLOR, 0.15) }}
      >
        <Building2 className="w-6 h-6" style={{ color: KK_COLOR }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-white leading-tight">
          Papan Rujukan Asrama
        </p>
        <p className="text-[10px] text-white/40 font-medium mt-1 leading-relaxed">
          Semak senarai pelajar dengan HPNM & merit untuk kelulusan permohonan kediaman sesi 2025/2026
        </p>
      </div>
      <ChevronRight className="w-5 h-5 flex-shrink-0 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
    </motion.button>
  );
}

// ─── Unit Pengurusan Asrama Tab ───────────────────────────────────────────────
function UnitAsramaTab() {
  const { profile, isSuperAdmin, isKediamanExco } = useAuth();

  const [unitAdmins, setUnitAdmins]       = useState<any[]>([]);
  const [searchUser, setSearchUser]       = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading]            = useState(true);

  const canManage = isSuperAdmin || isKediamanExco;

  const fetchUnitAdmins = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('asrama_unit_admins')
      .select('*, user:user_id(id, full_name, avatar_url, matric_no, role, email)')
      .order('created_at', { ascending: false });
    setUnitAdmins(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUnitAdmins(); }, [fetchUnitAdmins]);

  // Search all users (Students + JPP + Admin) — no role restriction
  const handleSearchUser = async (q: string) => {
    setSearchUser(q);
    if (q.length < 2) { setSearchResults([]); return; }

    // Search by nama ATAU no. matrik (jangan filter account_status — nak cari semua)
    let query = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, matric_no, role, email')
      .or(`full_name.ilike.%${q}%,matric_no.ilike.%${q}%`)
      .limit(8);

    // Exclude yang dah ada dalam senarai — UUID tanpa single quotes (format PostgREST)
    if (unitAdmins.length > 0) {
      const excludeIds = unitAdmins.map(a => a.user_id).join(',');
      query = query.not('id', 'in', `(${excludeIds})`);
    }

    const { data } = await query;
    setSearchResults(data || []);
  };

  const handleAddAdmin = async (userId: string, userName: string) => {
    const { error } = await supabase
      .from('asrama_unit_admins')
      .insert({ user_id: userId, assigned_by: profile?.id, notes: 'Ditugaskan melalui panel KK' });
    if (error) { toast.error('Gagal: ' + error.message); return; }
    toast.success(`${userName} berjaya ditambah sebagai Unit Pengurusan Asrama!`);
    setSearchUser(''); setSearchResults([]);
    fetchUnitAdmins();
  };

  const handleRemoveAdmin = async (adminId: string, userName: string) => {
    if (!window.confirm(`Buang ${userName} dari Unit Pengurusan Asrama?`)) return;
    const { error } = await supabase.from('asrama_unit_admins').delete().eq('id', adminId);
    if (error) { toast.error('Gagal membuang: ' + error.message); return; }
    toast.success(`${userName} berjaya dibuang.`);
    fetchUnitAdmins();
  };

  return (
    <motion.div
      key="unit-asrama"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Info banner */}
      <div
        className="rounded-[2rem] p-5 border space-y-2"
        style={{
          borderColor: hexToRgba(KK_COLOR, 0.25),
          background: hexToRgba(KK_COLOR, 0.04),
        }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" style={{ color: KK_COLOR }} />
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: KK_COLOR }}>
            Unit Pengurusan Asrama — Akses Rujukan
          </p>
        </div>
        <p className="text-xs text-white/40 leading-relaxed">
          Pengguna yang disenaraikan di sini mendapat akses ke <strong className="text-white/70">Papan Rujukan Asrama</strong> ({' '}
          <code className="text-[10px] text-fuchsia-400">/jpp/asrama</code>) untuk membantu Exco Kediaman semak merit dan
          HPNM pelajar bagi tujuan kelulusan permohonan kediaman i-KAMSIS. Mereka <em>tidak</em> mempunyai kuasa edit data pelajar.
        </p>
      </div>

      {/* Search + Add (hanya Exco KK & SuperAdmin) */}
      {canManage && (
        <div
          className="rounded-[2rem] border p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
            <UserPlus className="w-3.5 h-3.5" /> Tambah Pegawai Unit Pengurusan Asrama
          </p>
          <div className="relative">
            <input
              value={searchUser}
              onChange={e => handleSearchUser(e.target.value)}
              placeholder="Cari nama pengguna..."
              className="w-full h-11 px-4 rounded-2xl text-sm font-medium outline-none bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 transition-all"
            />
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-2xl bg-[#0f0f13] border border-white/10 shadow-xl overflow-hidden">
                  {searchResults.map(u => {
                    // Tentukan jenis akaun untuk badge
                    const roleLabel =
                      u.role === 'SUPER_ADMIN_JPP' ? 'Super Admin' :
                      u.role === 'JPP'             ? 'JPP' :
                      u.role === 'CLUB_PRESIDENT'  ? 'Presiden' :
                      u.role === 'CLUB_MT'         ? 'MT Kelab' :
                      'Pelajar';
                    const roleBg =
                      u.role === 'SUPER_ADMIN_JPP' ? '#ef4444' :
                      u.role === 'JPP'             ? '#8b5cf6' :
                      u.role === 'CLUB_PRESIDENT'  ? '#f59e0b' :
                      '#64748b';
                    return (
                      <button
                        key={u.id}
                        onClick={() => handleAddAdmin(u.id, u.full_name)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                      >
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                          style={{ background: KK_COLOR }}
                        >
                          {u.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-black text-white">{u.full_name}</p>
                            <span
                              className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full text-white"
                              style={{ background: roleBg + '99' }}
                            >
                              {roleLabel}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/50">
                            {u.matric_no || u.email || 'Tiada maklumat'}
                          </p>
                        </div>
                        <span
                          className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: hexToRgba(KK_COLOR, 0.1), color: KK_COLOR }}
                        >
                          + Tambah
                        </span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Senarai current unit admins */}
      <div
        className="rounded-[2rem] border p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
            Senarai Unit Pengurusan Asrama ({unitAdmins.length})
          </p>
          <button
            onClick={fetchUnitAdmins}
            className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/50 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3 h-3" /> Muat Semula
          </button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <RefreshCw className="w-5 h-5 animate-spin text-white/20" />
          </div>
        ) : unitAdmins.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-6">
            Tiada pegawai unit ditetapkan lagi.
          </p>
        ) : (
          <div className="space-y-2">
            {unitAdmins.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * i }}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                  style={{ background: KK_COLOR }}
                >
                  {a.user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white">{a.user?.full_name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <p className="text-[10px] text-white/50 flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3" style={{ color: KK_COLOR }} />
                      Unit Pengurusan Asrama
                    </p>
                    {/* Tunjuk jenis akaun */}
                    {a.user?.role && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full text-white/70"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                      >
                        {a.user.role === 'SUPER_ADMIN_JPP' ? 'Super Admin' :
                         a.user.role === 'JPP' ? 'JPP' :
                         a.user.role === 'CLUB_PRESIDENT' ? 'Presiden' :
                         a.user.role === 'CLUB_MT' ? 'MT Kelab' :
                         'Pelajar'}
                      </span>
                    )}
                    {a.user?.matric_no && (
                      <span className="text-[9px] text-white/30 font-mono">{a.user.matric_no}</span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRemoveAdmin(a.id, a.user?.full_name)}
                    className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Takwim Kediaman Tab ──────────────────────────────────────────────────────
function TakwimKediamanTab() {
  const { profile } = useAuth();
  const [items, setItems] = useState<TakwimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sesi, setSesi] = useState('2026/2027');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TakwimItem | null>(null);
  const emptyForm = { jenis: 'KELAB_KEDIAMAN', tajuk: '', catatan: '', tarikh_mula: '', tarikh_tamat: '', bil_minggu: '', aktiviti: '', warna_custom: '', kelab_kediaman_label: '' };
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  // ── Warna Rasmi (persisted) ──
  const [themeColor, setThemeColor] = useState(KK_COLOR);
  const [colorInput, setColorInput] = useState(KK_COLOR);
  const [savingColor, setSavingColor] = useState(false);
  const textOnTheme = getContrastColor(themeColor);

  // ── Logo (base64 for PDF) ──
  const [logoPolisas, setLogoPolisas] = useState('');
  const [logosLoaded, setLogosLoaded] = useState(false);

  React.useEffect(() => {
    setLogosLoaded(false);
    toBase64(LOGO_POLISAS_URL)
      .then((p) => { setLogoPolisas(p); setLogosLoaded(true); });
  }, []);

  const pdfReady = logosLoaded && items.length > 0;

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const [dataRes, colorRes] = await Promise.all([
      supabase
        .from('takwim_pusat')
        .select('*')
        .in('jenis', ['KELAB_KEDIAMAN', 'KK'])
        .eq('sesi', sesi)
        .order('tarikh_mula', { ascending: true }),
      supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'kk_theme_color')
        .single(),
    ]);
    if (dataRes.error) { console.error(dataRes.error); toast.error('Gagal memuatkan takwim.'); }
    setItems((dataRes.data || []).map((tp: any) => ({
      id: tp.id, type: 'takwim_pusat' as const, jenis: tp.jenis, tajuk: tp.tajuk,
      catatan: tp.catatan, tarikh_mula: tp.tarikh_mula, tarikh_tamat: tp.tarikh_tamat,
      bil_minggu: tp.bil_minggu, aktiviti: tp.aktiviti, warna_custom: tp.warna_custom,
      sesi: tp.sesi, exco_module: tp.exco_module, created_by: tp.created_by,
      kelab_kediaman_label: tp.kelab_kediaman_label,
    })));
    // Load saved theme color
    if (colorRes.data?.value) {
      let c = colorRes.data.value;
      if (typeof c !== 'string') c = JSON.stringify(c);
      c = c.replace(/^"|"$/g, '');
      if (/^#[0-9A-Fa-f]{6}$/.test(c)) { setThemeColor(c); setColorInput(c); }
    }
    setLoading(false);
  }, [sesi]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  // ── Save warna rasmi ──
  const handleSaveColor = async () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(colorInput)) { toast.error('Format warna tidak sah.'); return; }
    setSavingColor(true);
    try {
      const { error } = await supabase.from('system_settings').update({ value: JSON.stringify(colorInput) }).eq('key', 'kk_theme_color');
      if (error) { await supabase.from('system_settings').insert({ key: 'kk_theme_color', value: JSON.stringify(colorInput) }); }
      setThemeColor(colorInput);
      toast.success('Warna rasmi KK berjaya dikemaskini!');
    } catch { toast.error('Gagal menyimpan warna.'); }
    finally { setSavingColor(false); }
  };

  const openCreate = (jenis: 'KELAB_KEDIAMAN' | 'KK') => {
    setEditTarget(null);
    setForm({ ...emptyForm, jenis });
    setDialogOpen(true);
  };
  const openEdit = (item: TakwimItem) => {
    setEditTarget(item);
    setForm({ jenis: item.jenis, tajuk: item.tajuk, catatan: item.catatan || '', tarikh_mula: item.tarikh_mula, tarikh_tamat: item.tarikh_tamat || '', bil_minggu: item.bil_minggu || '', aktiviti: item.aktiviti || '', warna_custom: item.warna_custom || '', kelab_kediaman_label: item.kelab_kediaman_label || '' });
    setDialogOpen(true);
  };
  const handleSave = async () => {
    if (!form.tajuk || !form.tarikh_mula) { toast.error('Sila lengkapkan tajuk & tarikh.'); return; }
    setSaving(true);
    const payload = {
      jenis: form.jenis, tajuk: form.tajuk, catatan: form.catatan || null,
      tarikh_mula: form.tarikh_mula, tarikh_tamat: form.tarikh_tamat || null,
      bil_minggu: form.bil_minggu ? Number(form.bil_minggu) : null,
      aktiviti: form.aktiviti || null, sesi,
      exco_module: 'KK', created_by: profile?.id,
      warna_custom: form.warna_custom || null,
      kelab_kediaman_label: form.jenis === 'KELAB_KEDIAMAN' ? (form.kelab_kediaman_label || null) : null,
    };
    try {
      const res = editTarget
        ? await supabase.from('takwim_pusat').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editTarget.id)
        : await supabase.from('takwim_pusat').insert([payload]);
      if (res.error) throw res.error;
      toast.success(editTarget ? 'Dikemaskini!' : 'Ditambah!');
      setDialogOpen(false); fetchData();
    } catch (e: any) { toast.error(e.message || 'Gagal.'); }
    finally { setSaving(false); }
  };
  const handleDelete = async (item: TakwimItem) => {
    if (!window.confirm(`Padam "${item.tajuk}"?`)) return;
    const { error } = await supabase.from('takwim_pusat').delete().eq('id', item.id);
    if (error) { toast.error('Gagal memadamkan.'); return; }
    toast.success('Dipadam.'); fetchData();
  };

  const fmtDate = (d: string) => { try { const dt = new Date(d); return dt.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; } };


  return (
    <motion.div key="takwim" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="rounded-[2rem] p-5 border space-y-3" style={{ borderColor: hexToRgba(KK_COLOR, 0.25), background: hexToRgba(KK_COLOR, 0.04) }}>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4" style={{ color: KK_COLOR }} />
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: KK_COLOR }}>Takwim Kediaman & Kerohanian</p>
        </div>
        <p className="text-xs text-white/40 leading-relaxed">
          Urus takwim khusus kelab kediaman (JPPI, AG, IS, dll.) dan aktiviti exco KK. Takwim kelab kediaman <strong className="text-white/70">hanya visible untuk JPP</strong> — student biasa tidak boleh melihatnya.
        </p>
      </div>

      {/* Controls Row 1 — Warna Rasmi + Session */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Color Picker (Warna Rasmi KK) */}
        <div className="flex items-center gap-4 bg-card p-5 rounded-[2rem] border border-border shadow-sm">
          <Palette className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Warna Rasmi KK</p>
            <p className="text-[10px] text-muted-foreground">Header jadual, baris cuti & PDF.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input type="color" value={colorInput} onChange={e => setColorInput(e.target.value)} className="w-11 h-11 rounded-xl border-2 border-border cursor-pointer" />
            <div className="hidden sm:flex h-11 px-3 rounded-xl items-center font-black text-[10px] uppercase tracking-widest shadow-sm" style={{ backgroundColor: colorInput, color: getContrastColor(colorInput) }}>{colorInput}</div>
            <Button onClick={handleSaveColor} disabled={savingColor || colorInput === themeColor} variant="outline" size="sm" className="rounded-xl h-11 px-4 font-black text-xs">{savingColor ? '...' : 'Simpan'}</Button>
          </div>
        </div>
        {/* Session Selector */}
        <div className="flex items-center gap-4 bg-card p-5 rounded-[2rem] border border-border shadow-sm">
          <CalendarDays className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sesi Akademik</p>
            <p className="text-[10px] text-muted-foreground">Sesi yang dipaparkan dalam jadual PDF.</p>
          </div>
          <Select value={sesi} onValueChange={setSesi}>
            <SelectTrigger className="w-40 rounded-xl h-11 font-bold text-sm border-border"><SelectValue placeholder="Pilih sesi" /></SelectTrigger>
            <SelectContent>{SESI_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="font-bold">{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Controls Row 2 — Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => openCreate('KELAB_KEDIAMAN')} className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest" style={{ background: themeColor, color: textOnTheme }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Kelab Kediaman
        </Button>
        <Button onClick={() => openCreate('KK')} variant="outline" className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-white/10 text-white/60">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Exco KK
        </Button>
        <div className="ml-auto">
          {pdfReady ? (
            <PDFDownloadLink
              document={
                <TakwimPusatPDFTemplate
                  data={items}
                  themeColor={themeColor}
                  session={sesi}
                  filterLabel="Takwim Kediaman & Kerohanian"
                  logoPolisas={logoPolisas}
                />
              }
              fileName={`Takwim_Kediaman_${sesi.replace('/', '-')}.pdf`}
            >
              {/* @ts-ignore */}
              {({ loading: pdfLoading }) => (
                <Button
                  disabled={pdfLoading}
                  className="h-10 rounded-xl font-black tracking-widest uppercase text-[10px] shadow-lg"
                  style={{ backgroundColor: themeColor, color: textOnTheme }}
                >
                  {pdfLoading
                    ? <span className="animate-pulse">Menjana PDF...</span>
                    : <><DownloadCloud className="w-3.5 h-3.5 mr-1.5" />Muat Turun PDF</>
                  }
                </Button>
              )}
            </PDFDownloadLink>
          ) : (
            <Button disabled className="h-10 rounded-xl font-black text-[10px] opacity-60">
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Logo...
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center"><p className="text-xs font-black text-white/20 uppercase tracking-widest">Tiada entri takwim kediaman</p></div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.04]">
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Jenis</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Tajuk</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Kelab</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Tarikh</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30">Minggu</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white/30 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {items.map(item => {
                  const cfg = TAKWIM_JENIS[item.jenis];
                  const color = item.warna_custom || cfg?.color || KK_COLOR;
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <Badge className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border-none" style={{ background: hexToRgba(color, 0.15), color }}>{cfg?.shortLabel || item.jenis}</Badge>
                      </td>
                      <td className="px-4 py-3"><p className="text-xs font-black text-white/90">{item.tajuk}</p></td>
                      <td className="px-4 py-3"><p className="text-[10px] text-fuchsia-400/70 font-bold">{item.kelab_kediaman_label || '—'}</p></td>
                      <td className="px-4 py-3 text-[11px] font-bold text-white/60 whitespace-nowrap">{fmtDate(item.tarikh_mula)}{item.tarikh_tamat && item.tarikh_tamat !== item.tarikh_mula ? ` — ${fmtDate(item.tarikh_tamat)}` : ''}</td>
                      <td className="px-4 py-3 text-xs font-black text-white/40 text-center">{item.bil_minggu || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => handleDelete(item)} className="w-7 h-7 rounded-lg bg-rose-500/5 text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[2rem] p-0 border-none bg-slate-900 overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-8 space-y-5 overflow-y-auto flex-1">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight text-white">{editTarget ? 'Kemaskini' : 'Entri Baharu'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Jenis</Label>
                <Select value={form.jenis} onValueChange={v => setForm({ ...form, jenis: v })} disabled={!!editTarget}>
                  <SelectTrigger className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KELAB_KEDIAMAN">Kelab Kediaman</SelectItem>
                    <SelectItem value="KK">Exco KK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.jenis === 'KELAB_KEDIAMAN' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Nama Kelab Kediaman</Label>
                  <Input value={form.kelab_kediaman_label} onChange={e => setForm({ ...form, kelab_kediaman_label: e.target.value })} className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold" placeholder="cth: JPPI, AG, IS..." />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Tajuk *</Label>
                <Input value={form.tajuk} onChange={e => setForm({ ...form, tajuk: e.target.value })} className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold" placeholder="Nama aktiviti..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Tarikh Mula *</Label>
                  <Input type="date" value={form.tarikh_mula} onChange={e => setForm({ ...form, tarikh_mula: e.target.value })} className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Tarikh Tamat</Label>
                  <Input type="date" value={form.tarikh_tamat} onChange={e => setForm({ ...form, tarikh_tamat: e.target.value })} className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Bil. Minggu</Label>
                  <Input type="number" value={form.bil_minggu} onChange={e => setForm({ ...form, bil_minggu: e.target.value })} className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Catatan</Label>
                  <Input value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold" />
                </div>
              </div>
              {/* Color Picker */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Warna (Pilihan)</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.warna_custom || KK_COLOR} onChange={e => setForm({ ...form, warna_custom: e.target.value })} className="w-12 h-12 rounded-xl border-2 border-white/10 cursor-pointer bg-transparent" />
                  <Input value={form.warna_custom} onChange={e => setForm({ ...form, warna_custom: e.target.value })} className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-mono font-bold flex-1" placeholder={KK_COLOR} />
                  {form.warna_custom && <button onClick={() => setForm({ ...form, warna_custom: '' })} className="text-[10px] font-bold text-white/30 hover:text-white/60">Reset</button>}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-white/[0.02] border-t border-white/5 gap-3">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 h-12 rounded-xl text-white/50">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-[2] h-12 rounded-xl font-black text-[10px] uppercase tracking-widest text-white" style={{ background: KK_COLOR }}>
              {saving ? 'Menyimpan...' : editTarget ? 'Kemaskini' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function KkUnitDashboard() {
  const { hasKediamanAccess, isKediamanExco, isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'unit' | 'qr' | 'merit-rasmi' | 'takwim' | 'demerit'>(() => {
    return (searchParams.get('tab') as any) || 'dashboard';
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (['qr', 'unit', 'dashboard', 'merit-rasmi', 'takwim', 'demerit'].includes(tab || '')) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'dashboard' | 'unit' | 'qr' | 'merit-rasmi' | 'takwim' | 'demerit') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Tab "Unit Pengurusan Asrama" hanya kelihatan untuk Exco KK & SuperAdmin (boleh manage)
  const showUnitTab = isSuperAdmin || isKediamanExco;

  return (
    <div className="space-y-5">
      {/* Tabs — hanya papar jika ada hak manage */}
      {showUnitTab && (
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.05] p-1 rounded-2xl overflow-x-auto">
          <button
            onClick={() => handleTabChange('dashboard')}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all"
            style={
              activeTab === 'dashboard'
                ? { background: KK_COLOR, color: '#fff' }
                : { color: 'rgba(255,255,255,0.4)' }
            }
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Dashboard
          </button>
          <button
            onClick={() => handleTabChange('unit')}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all"
            style={
              activeTab === 'unit'
                ? { background: KK_COLOR, color: '#fff' }
                : { color: 'rgba(255,255,255,0.4)' }
            }
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Unit Pengurusan Asrama
          </button>
          <button
            onClick={() => handleTabChange('merit-rasmi')}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all"
            style={
              activeTab === 'merit-rasmi'
                ? { background: KK_COLOR, color: '#fff' }
                : { color: 'rgba(255,255,255,0.4)' }
            }
          >
            <Trophy className="w-3.5 h-3.5" /> Merit Rasmi
          </button>
          <button
            onClick={() => handleTabChange('qr')}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all"
            style={
              activeTab === 'qr'
                ? { background: KK_COLOR, color: '#fff' }
                : { color: 'rgba(255,255,255,0.4)' }
            }
          >
            <QrCode className="w-3.5 h-3.5" /> QR Merit
          </button>
          <button
            onClick={() => handleTabChange('takwim')}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all"
            style={
              activeTab === 'takwim'
                ? { background: KK_COLOR, color: '#fff' }
                : { color: 'rgba(255,255,255,0.4)' }
            }
          >
            <CalendarDays className="w-3.5 h-3.5" /> Takwim
          </button>
          <button
            onClick={() => handleTabChange('demerit')}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all"
            style={
              activeTab === 'demerit'
                ? { background: KK_COLOR, color: '#fff' }
                : { color: 'rgba(255,255,255,0.4)' }
            }
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Demerit
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-5"
          >
            {/* Rujukan Asrama shortcut — hanya untuk yang ada akses */}
            {hasKediamanAccess && <AsramaBanner />}

            {/* Generic dashboard (aktiviti, laporan, tindakan pantas) */}
            <div className="pt-2">
              <KamsisKlkStatsWidget themeColor={KK_COLOR} />
            </div>

            <ExcoGenericDashboard
              excoUnit="KK"
              themeColor={KK_COLOR}
              excoLabel="Kediaman & Kerohanian"
            />
          </motion.div>
        )}

        {activeTab === 'unit' && showUnitTab && (
          <motion.div
            key="unit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <UnitAsramaTab />
          </motion.div>
        )}

        {activeTab === 'qr' && showUnitTab && (
          <motion.div
            key="qr"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <div className="rounded-[2rem] border p-6 bg-[rgba(255,255,255,0.01)] border-[rgba(255,255,255,0.07)]">
              <QrMeritManager themeColor={KK_COLOR} />
            </div>
          </motion.div>
        )}

        {activeTab === 'merit-rasmi' && showUnitTab && (
          <motion.div
            key="merit-rasmi"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <div className="rounded-[2rem] border p-6 bg-[rgba(255,255,255,0.01)] border-[rgba(255,255,255,0.07)]">
              <MeritRasmiReviewPanel reviewerUnit="KEDIAMAN" themeColor={KK_COLOR} />
            </div>
          </motion.div>
        )}

        {activeTab === 'demerit' && showUnitTab && (
          <motion.div
            key="demerit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <div className="rounded-[2rem] border p-6 bg-[rgba(255,255,255,0.01)] border-[rgba(255,255,255,0.07)]">
              <DemeritManager sourceOverride="QR_SCAN" />
            </div>
          </motion.div>
        )}

        {activeTab === 'takwim' && showUnitTab && (
          <motion.div
            key="takwim"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <TakwimKediamanTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
