// ============================================================
// KlkDashboard — Dashboard Exco Kediaman Luar Kampus (/klk)
// Akses: Exco KLS + MT oversee KLS + SUPER_ADMIN_JPP
// ============================================================
import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Users, Home, Building2, ArrowUpRight, ChevronRight,
  Download, RefreshCw, Wifi, AlertTriangle, Filter, Search,
  BarChart2, Clock, Database, Pencil, X, Check, Save,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

// Lazy load map untuk jimat bundle size
const KlkHotspotMap = lazy(() =>
  import('@/components/klk/KlkHotspotMap').then(m => ({ default: m.KlkHotspotMap }))
);

const KLS_COLOR = '#60A5FA';

interface DashboardStats {
  total_luar: number;
  total_kamsis: number;
  total_pending: number;
  by_source: { webapp: number; google_form: number; csv: number };
  by_kawasan: { kawasan: string; count: number; latitude?: number; longitude?: number }[];
  by_jabatan: { jabatan: string; count: number }[];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'pagi';
  if (h < 15) return 'tengah hari';
  if (h < 19) return 'petang';
  return 'malam';
}

function getCurrentAcademicYear() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

// MOCK DATA — digunakan semasa DB belum ready
const MOCK_STATS: DashboardStats = {
  total_luar: 0,
  total_kamsis: 0,
  total_pending: 0,
  by_source: { webapp: 0, google_form: 0, csv: 0 },
  by_kawasan: [],
  by_jabatan: [],
};

// ── Kawasan list (same as student form) ────────────────────────────────────
const KAWASAN_LIST = [
  'SEMAMBU','TAMAN TAS','KUBANG BUAYA','ALOR AKAR','AIR PUTIH',
  'BUKIT SEKILAU','INDERA MAHKOTA','SUNGAI ISAP','BUKIT RANGIN',
  'PERMATANG BADAK','PELINDUNG','BESERAH','BUKIT GOH','KOTASAS','BANDAR DAMANSARA',
];

// ── Modal Edit Rekod ───────────────────────────────────────────────────────
function EditRecordModal({ record, onClose, onSaved }: { record: any; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = React.useState(false);
  const [nama, setNama] = React.useState(record.nama_pelajar ?? '');
  const [matrik, setMatrik] = React.useState(record.no_matrik ?? '');
  const [telefon, setTelefon] = React.useState(record.no_telefon ?? '');
  const [jabatan, setJabatan] = React.useState(record.jabatan ?? '');
  const [kawasan, setKawasan] = React.useState(record.kawasan_kediaman ?? '');
  const [kawasanCustom, setKawasanCustom] = React.useState(record.kawasan_custom ?? '');
  const [alamat, setAlamat] = React.useState(record.alamat_kediaman ?? '');
  const [tinggalLuar, setTinggalLuar] = React.useState<boolean>(record.tinggal_luar ?? true);
  const [source, setSource] = React.useState(record.source ?? 'WEBAPP');
  const [cadangan, setCadangan] = React.useState(record.cadangan ?? '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !matrik.trim()) { toast.error('Nama dan No. Matrik wajib diisi.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('klk_student_residency')
        .update({
          nama_pelajar: nama.trim().toUpperCase(),
          no_matrik: matrik.trim().toUpperCase(),
          no_telefon: telefon.trim() || null,
          jabatan: jabatan.trim() || null,
          tinggal_luar: tinggalLuar,
          kawasan_kediaman: tinggalLuar ? kawasan : null,
          kawasan_custom: tinggalLuar && kawasan === 'LAIN_LAIN' ? kawasanCustom.trim() : null,
          alamat_kediaman: tinggalLuar ? alamat.trim() || null : null,
          cadangan: cadangan.trim() || null,
          source,
        })
        .eq('id', record.id);
      if (error) throw error;
      toast.success('Rekod berjaya dikemaskini!');
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal kemaskini rekod.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full h-10 px-3 rounded-xl bg-slate-800/80 border border-white/[0.08] text-white text-xs font-medium focus:outline-none focus:border-blue-500/50 placeholder:text-slate-600';
  const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="relative w-full max-w-lg bg-slate-900 border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="font-black text-sm text-white">Edit Rekod Kediaman</p>
              <p className="text-[10px] text-slate-500">{record.no_matrik ?? '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">

          {/* Status tinggal */}
          <div>
            <label className={labelCls}>Status Kediaman</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setTinggalLuar(false)}
                className={cn('h-10 rounded-xl text-xs font-black border transition-all',
                  !tinggalLuar ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.06]')}>
                Dalam KAMSIS
              </button>
              <button type="button" onClick={() => setTinggalLuar(true)}
                className={cn('h-10 rounded-xl text-xs font-black border transition-all',
                  tinggalLuar ? 'bg-blue-500/15 border-blue-500/40 text-blue-300' : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.06]')}>
                Luar Kampus
              </button>
            </div>
          </div>

          {/* Row: Nama + Matrik */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nama Pelajar *</label>
              <input className={inputCls} value={nama} onChange={e => setNama(e.target.value)} placeholder="NAMA PENUH" required />
            </div>
            <div>
              <label className={labelCls}>No. Matrik *</label>
              <input className={inputCls} value={matrik} onChange={e => setMatrik(e.target.value.toUpperCase())} placeholder="22DCS12345" required />
            </div>
          </div>

          {/* Row: Telefon + Jabatan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>No. Telefon</label>
              <input className={inputCls} value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="01X-XXXXXXXX" type="tel" />
            </div>
            <div>
              <label className={labelCls}>Jabatan / Program</label>
              <input className={inputCls} value={jabatan} onChange={e => setJabatan(e.target.value)} placeholder="DCS / DEE / dll" />
            </div>
          </div>

          {tinggalLuar && (
            <>
              {/* Kawasan */}
              <div>
                <label className={labelCls}>Kawasan Kediaman</label>
                <select
                  value={kawasan} onChange={e => setKawasan(e.target.value)}
                  className={cn(inputCls, 'appearance-none')}
                >
                  <option value="">-- Pilih kawasan --</option>
                  {KAWASAN_LIST.map(k => <option key={k} value={k}>{k}</option>)}
                  <option value="LAIN_LAIN">Lain-lain</option>
                </select>
              </div>

              {kawasan === 'LAIN_LAIN' && (
                <div>
                  <label className={labelCls}>Nyatakan Kawasan</label>
                  <input className={inputCls} value={kawasanCustom} onChange={e => setKawasanCustom(e.target.value)} placeholder="Nama kawasan..." />
                </div>
              )}

              {/* Alamat */}
              <div>
                <label className={labelCls}>Alamat Kediaman</label>
                <textarea
                  value={alamat} onChange={e => setAlamat(e.target.value)} rows={2}
                  placeholder="No. 12, Jalan Semambu 1..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-white/[0.08] text-white text-xs font-medium focus:outline-none focus:border-blue-500/50 placeholder:text-slate-600 resize-none"
                />
              </div>

              {/* Cadangan */}
              <div>
                <label className={labelCls}>Cadangan / Nota</label>
                <textarea
                  value={cadangan} onChange={e => setCadangan(e.target.value)} rows={2}
                  placeholder="Nota tambahan..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-white/[0.08] text-white text-xs font-medium focus:outline-none focus:border-blue-500/50 placeholder:text-slate-600 resize-none"
                />
              </div>
            </>
          )}

          {/* Sumber */}
          <div>
            <label className={labelCls}>Sumber Data</label>
            <select value={source} onChange={e => setSource(e.target.value)} className={cn(inputCls, 'appearance-none')}>
              <option value="WEBAPP">App (Website)</option>
              <option value="GOOGLE_FORM">Google Form</option>
              <option value="CSV_IMPORT">CSV Import</option>
              <option value="MANUAL">Manual (Exco Edit)</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-white/[0.08] text-xs font-black text-slate-400 hover:bg-white/[0.04] transition-colors">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 text-xs font-black text-blue-300 hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</> : <><Save className="w-3.5 h-3.5" /> Simpan Perubahan</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export function KlkDashboard() {
  const { profile, user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [filterKawasan, setFilterKawasan] = useState('');
  const [editRecord, setEditRecord] = useState<any | null>(null);  // rekod yang sedang diedit
  const [lainLainCount, setLainLainCount] = useState(0);

  const academicYear = getCurrentAcademicYear();
  const name = profile?.full_name?.split(' ')[0] ?? 'Exco';

  // ── RBAC Check ─────────────────────────────────────────────
  const isKlsExco = profile?.role === 'JPP' && profile?.jpp_unit === 'KLS';
  const hasAccess = isSuperAdmin || isKlsExco;
  // MT check — akan dilakukan query bila DB ready
  // Untuk sekarang, SUPER_ADMIN dan KLS exco boleh akses

  useEffect(() => {
    if (!hasAccess) {
      toast.error('Anda tidak mempunyai akses ke modul ini.');
      navigate('/jpp');
    }
  }, [hasAccess, navigate]);

  // ── Fetch Data ─────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Test if DB table exists
      const { error: testErr } = await supabase
        .from('klk_student_residency')
        .select('id')
        .limit(1);

      if (testErr?.code === '42P01') {
        // Table belum wujud — tunjuk empty state
        setDbReady(false);
        setLoading(false);
        return;
      }

      setDbReady(true);

      // Fetch semua data untuk academic year semasa
      const [residencyRes, kawasanRes, lainRes] = await Promise.all([
        supabase
          .from('klk_student_residency')
          .select('id, tinggal_luar, kawasan_kediaman, jabatan, source, created_at, nama_pelajar, no_matrik, no_telefon, kawasan_custom')
          .eq('academic_year', academicYear)
          .order('created_at', { ascending: false }),
        supabase
          .from('klk_kawasan')
          .select('name, latitude, longitude')
          .eq('is_active', true),
        supabase.rpc('get_klk_lain_lain_summary'),
      ]);

      if (lainRes.data) setLainLainCount((lainRes.data as any[]).length);

      const allData = residencyRes.data ?? [];
      const kawasanCoords: Record<string, { lat: number; lng: number }> = {};
      (kawasanRes.data ?? []).forEach((k: any) => {
        kawasanCoords[k.name] = { lat: k.latitude, lng: k.longitude };
      });

      // Kira stats
      const luarData = allData.filter((d: any) => d.tinggal_luar);
      const kamsisData = allData.filter((d: any) => !d.tinggal_luar);

      // Group by kawasan
      const kawasanMap: Record<string, number> = {};
      luarData.forEach((d: any) => {
        const k = d.kawasan_kediaman === 'LAIN_LAIN' ? (d.kawasan_custom ?? 'LAIN_LAIN') : (d.kawasan_kediaman ?? 'TIDAK DIISI');
        kawasanMap[k] = (kawasanMap[k] ?? 0) + 1;
      });
      const byKawasan = Object.entries(kawasanMap)
        .sort((a, b) => b[1] - a[1])
        .map(([kawasan, count]) => ({
          kawasan, count,
          latitude: kawasanCoords[kawasan]?.lat,
          longitude: kawasanCoords[kawasan]?.lng,
        }));

      // Group by jabatan
      const jabatanMap: Record<string, number> = {};
      luarData.forEach((d: any) => {
        const j = d.jabatan ?? 'Tidak Diisi';
        jabatanMap[j] = (jabatanMap[j] ?? 0) + 1;
      });
      const byJabatan = Object.entries(jabatanMap).sort((a, b) => b[1] - a[1]).map(([jabatan, count]) => ({ jabatan, count }));

      // Source breakdown
      const bySource = {
        webapp: allData.filter((d: any) => d.source === 'WEBAPP').length,
        google_form: allData.filter((d: any) => d.source === 'GOOGLE_FORM').length,
        csv: allData.filter((d: any) => d.source === 'CSV_IMPORT').length,
      };

      setStats({
        total_luar: luarData.length,
        total_kamsis: kamsisData.length,
        total_pending: 0, // TODO: calculate from profiles sem 2+
        by_source: bySource,
        by_kawasan: byKawasan,
        by_jabatan: byJabatan,
      });

      setRecentSubmissions(luarData.slice(0, 20));
    } catch (e) {
      console.error('[KlkDashboard] fetchAll error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, academicYear]);

  useEffect(() => {
    fetchAll();
    // Visibility-based refresh (ikut guideline §15.3)
    const handleVis = () => { if (document.visibilityState === 'visible') fetchAll(); };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, [fetchAll]);

  // ── Export CSV ─────────────────────────────────────────────
  const handleExport = async () => {
    if (!dbReady) { toast.error('Database belum sedia.'); return; }
    try {
      const { data } = await supabase
        .from('klk_student_residency')
        .select('nama_pelajar, no_matrik, no_telefon, jabatan, kawasan_kediaman, kawasan_custom, alamat_kediaman, cadangan, source, created_at')
        .eq('academic_year', academicYear)
        .eq('tinggal_luar', true);

      if (!data?.length) { toast.error('Tiada data untuk export.'); return; }
      const headers = ['Nama', 'No Matrik', 'No Telefon', 'Jabatan', 'Kawasan', 'Alamat', 'Cadangan', 'Sumber', 'Tarikh'];
      const rows = data.map((d: any) => [
        d.nama_pelajar, d.no_matrik, d.no_telefon ?? '',
        d.jabatan ?? '', d.kawasan_kediaman === 'LAIN_LAIN' ? d.kawasan_custom : d.kawasan_kediaman,
        d.alamat_kediaman ?? '', d.cadangan ?? '', d.source,
        new Date(d.created_at).toLocaleDateString('ms-MY'),
      ]);
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `KLK_${academicYear.replace('/', '-')}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Export berjaya!');
    } catch { toast.error('Gagal export.'); }
  };

  // ── Render ─────────────────────────────────────────────────
  const statCards = [
    { label: 'Pelajar Luar Kampus', value: stats.total_luar, icon: Home, color: '#60A5FA', href: '#senarai' },
    { label: 'Dalam KAMSIS', value: stats.total_kamsis, icon: Building2, color: '#22C55E', href: '#senarai' },
    { label: 'App', value: stats.by_source.webapp, icon: Database, color: '#818CF8', href: '#senarai' },
    { label: 'Google Form', value: stats.by_source.google_form, icon: Wifi, color: '#F59E0B', href: '#senarai' },
  ];

  const top5Kawasan = stats.by_kawasan.slice(0, 5);
  const maxKawasanCount = top5Kawasan[0]?.count ?? 1;

  const filteredSubs = recentSubmissions.filter(d => {
    const matchQ = !searchQ || d.nama_pelajar?.toLowerCase().includes(searchQ.toLowerCase()) || d.no_matrik?.toLowerCase().includes(searchQ.toLowerCase());
    const matchK = !filterKawasan || d.kawasan_kediaman === filterKawasan;
    return matchQ && matchK;
  });

  if (!hasAccess) return null;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto min-h-screen">
      {/* Greeting */}
      <div className="mb-8">
        <motion.h1 initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="text-3xl font-black text-slate-50 mb-1 tracking-tight">
          Selamat {getGreeting()}, {name}! 👋
        </motion.h1>
        <p className="text-sm text-slate-400 font-medium">
          Dashboard Kediaman Luar Kampus — Tahun Akademik <strong className="text-slate-300">{academicYear}</strong>
        </p>
      </div>

      {/* DB Not Ready Banner */}
      {!loading && !dbReady && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-300">Database Sedang Disediakan</p>
            <p className="text-xs text-amber-400/70 mt-1">
              Jadual <code className="font-mono bg-amber-500/10 px-1 rounded">klk_student_residency</code> belum wujud. Migration perlu dijalankan dahulu. Form pelajar sudah boleh digunakan — data akan disimpan bila DB sedia.
            </p>
          </div>
        </motion.div>
      )}

      {/* Lain-lain Warning Banner */}
      {!loading && dbReady && lainLainCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl p-4 border border-amber-500/25 bg-amber-500/5 flex items-center gap-4 cursor-pointer hover:bg-amber-500/10 transition-colors"
          onClick={() => navigate('/klk/tetapan?tab=kawasan')}
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-amber-300">
              {lainLainCount} kawasan tidak dikenali perlu dimigrate
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Pelajar memasukkan kawasan yang tidak tersenarai — klik untuk migrate dalam Tetapan KLK.
            </p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
        </motion.div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <motion.a key={s.label} href={s.href} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.06 }}
            className="block rounded-2xl p-5 border transition-all hover:scale-[1.02] cursor-pointer shadow-lg backdrop-blur-xl relative overflow-hidden group"
            style={{ background: `rgba(${hexRgb(s.color)}, 0.03)`, borderColor: `rgba(${hexRgb(s.color)}, 0.15)` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
              style={{ backgroundImage: `linear-gradient(to br, rgba(${hexRgb(s.color)}, 0.5), transparent)` }} />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `rgba(${hexRgb(s.color)}, 0.15)` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: s.color }} />
            </div>
            <p className="text-3xl font-black text-slate-50 mb-1">{loading ? '—' : s.value.toLocaleString()}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
          </motion.a>
        ))}
      </div>

      {/* Map + Top Kawasan */}
      <div className="grid lg:grid-cols-5 gap-6 mb-8">
        {/* Peta */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] overflow-hidden shadow-xl"
          style={{ height: 380 }}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
            <div>
              <h2 className="font-black text-sm text-slate-100">Peta Hotspot Kawasan</h2>
              <p className="text-[10px] text-slate-500">Kuantan & sekitar POLISAS</p>
            </div>
            <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{'≥20'}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{'≥10'}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />{'≥5'}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />{'<5'}</span>
            </div>
          </div>
          <div style={{ height: 'calc(100% - 44px)' }}>
            <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-slate-500">Memuatkan peta...</div>}>
              <KlkHotspotMap data={stats.by_kawasan.map(k => ({ name: k.kawasan, latitude: k.latitude ?? 0, longitude: k.longitude ?? 0, count: k.count }))} />
            </Suspense>
          </div>
        </motion.div>

        {/* Top 5 Kawasan */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="lg:col-span-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-5 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-black text-sm text-slate-100">Top Kawasan</h2>
              <p className="text-[10px] text-slate-500">Paling ramai pelajar</p>
            </div>
            <BarChart2 className="w-4 h-4 text-slate-600" />
          </div>
          {top5Kawasan.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-600">Belum ada data</div>
          ) : (
            <div className="space-y-3">
              {top5Kawasan.map((k, i) => (
                <div key={k.kawasan}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-600 w-4">{i + 1}</span>
                      <span className="text-xs font-black text-slate-200 truncate max-w-[140px]">{k.kawasan}</span>
                    </div>
                    <span className="text-xs font-black text-slate-300">{k.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(k.count / maxKawasanCount) * 100}%` }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: i === 0 ? '#EF4444' : i === 1 ? '#F59E0B' : KLS_COLOR }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Jabatan breakdown */}
          {stats.by_jabatan.length > 0 && (
            <div className="mt-6">
              <h3 className="font-black text-[11px] uppercase tracking-widest text-slate-500 mb-3">Mengikut Jabatan</h3>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.by_jabatan.slice(0, 5)} barCategoryGap="30%">
                    <XAxis dataKey="jabatan" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 }} labelStyle={{ color: 'white', fontWeight: 700 }} />
                    <Bar dataKey="count" name="Pelajar" radius={[3, 3, 0, 0]} fill={KLS_COLOR} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Senarai Pelajar */}
      <motion.div id="senarai" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-2xl border border-white/[0.05] bg-white/[0.02] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
          <div>
            <h2 className="font-black text-base text-slate-100">Senarai Pelajar Luar Kampus</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">{stats.total_luar} rekod · {academicYear}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchAll} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-slate-300">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <Link to="/klk/tetapan"
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-colors"
              style={{ background: `rgba(${hexRgb(KLS_COLOR)}, 0.1)`, color: KLS_COLOR }}>
              Tetapan <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.04]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Cari nama / matrik..."
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-800/60 border border-white/[0.06] text-white text-xs font-medium focus:outline-none focus:border-blue-500/40 placeholder:text-slate-600"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterKawasan} onChange={e => setFilterKawasan(e.target.value)}
              className="h-9 pl-9 pr-4 rounded-xl bg-slate-800/60 border border-white/[0.06] text-white text-xs font-medium focus:outline-none appearance-none"
            >
              <option value="">Semua Kawasan</option>
              {stats.by_kawasan.map(k => <option key={k.kawasan} value={k.kawasan}>{k.kawasan}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Nama Pelajar', 'No. Matrik', 'No. Telefon', 'Jabatan', 'Kawasan', 'Sumber', 'Tarikh', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-xs text-slate-500">Memuatkan data...</td></tr>
              ) : filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <Home className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                    <p className="text-xs text-slate-500 font-medium">
                      {dbReady ? 'Belum ada submission untuk semester ini' : 'Menunggu setup database...'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSubs.map((d, i) => (
                  <motion.tr key={d.id ?? i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-3 text-sm font-black text-slate-200 whitespace-nowrap">{d.nama_pelajar}</td>
                    <td className="px-5 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">{d.no_matrik}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">{d.no_telefon ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-slate-400 uppercase">{d.jabatan ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-lg"
                        style={{ background: `rgba(${hexRgb(KLS_COLOR)}, 0.12)`, color: KLS_COLOR }}>
                        {d.kawasan_kediaman === 'LAIN_LAIN' ? d.kawasan_custom : d.kawasan_kediaman}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wide',
                        d.source === 'WEBAPP' ? 'bg-indigo-500/10 text-indigo-400' :
                        d.source === 'GOOGLE_FORM' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      )}>
                        {d.source === 'WEBAPP' ? 'App' : d.source === 'GOOGLE_FORM' ? 'G-Form' : 'CSV'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString('ms-MY') : '—'}
                    </td>
                    {/* Butang Edit */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => setEditRecord(d)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/25 flex items-center justify-center transition-all border border-blue-500/20"
                        title="Edit rekod"
                      >
                        <Pencil className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Edit Record Modal ── */}
      {editRecord && (
        <EditRecordModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSaved={() => { setEditRecord(null); fetchAll(); }}
        />
      )}
    </div>
  );
}

function hexRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
