import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Download, Star, Search, ChevronUp, ChevronDown,
  GraduationCap, Filter, AlertCircle, Loader2,
  TrendingUp, Award, Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getSemesterInfo } from '@/types';
import { toast } from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface StudentRow {
  id: string;
  full_name: string;
  matric_no: string | null;
  phone: string | null;
  programme_code: string | null;
  intake_year: number | null;
  intake_period: number | null;
  semester_override: number | null;
  latest_hpnm: number | null;
  merit_pencapaian: number;
  merit_aktiviti: number;
  // Joined from recommendations
  isRecommended: boolean;
  recommendationNote: string | null;
  recommendedBy: string | null;
}

type SortKey = 'hpnm' | 'pencapaian' | 'aktiviti' | 'nama';
type SortDir = 'asc' | 'desc';

const CURRENT_SESSION = '2025/2026';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getIntakeMonths = (settings: Record<string, string>) => ({
  month1: parseInt(settings['intake_1_month'] ?? '7'),
  month2: parseInt(settings['intake_2_month'] ?? '1'),
});

function getCohortLabel(student: StudentRow, intakeConfig: { month1: number; month2: number }): string {
  if (!student.intake_year || !student.intake_period) return '—';
  const isFtv = student.programme_code === 'FTV';
  const info = getSemesterInfo(
    student.intake_year,
    student.intake_period as 1 | 2,
    isFtv,
    intakeConfig.month1,
    intakeConfig.month2,
    student.semester_override,
  );
  if (!info) return '—';
  return `${info.level} • Sem ${info.semester}`;
}

function getCohortLevel(student: StudentRow, intakeConfig: { month1: number; month2: number }): string {
  if (!student.intake_year || !student.intake_period) return 'unknown';
  const isFtv = student.programme_code === 'FTV';
  const info = getSemesterInfo(
    student.intake_year,
    student.intake_period as 1 | 2,
    isFtv,
    intakeConfig.month1,
    intakeConfig.month2,
    student.semester_override,
  );
  return info?.level ?? 'unknown';
}


// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function JppAsramaPage() {
  const { user, profile, isSuperAdmin } = useAuth();

  const [students, setStudents]         = useState<StudentRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [intakeConfig, setIntakeConfig] = useState({ month1: 7, month2: 1 });

  // Filters
  const [filterTahap, setFilterTahap]     = useState<string>('Semua');
  const [filterProg, setFilterProg]       = useState<string>('Semua');
  const [search, setSearch]               = useState('');
  const [sortKey, setSortKey]             = useState<SortKey>('hpnm');
  const [sortDir, setSortDir]             = useState<SortDir>('desc');

  // Recommendation toggle loading
  const [recLoading, setRecLoading] = useState<string | null>(null);

  // ── Access guard ───────────────────────────────────────────────────────────
  const jppUnit     = profile?.jpp_unit;
  const jppPosition = profile?.jpp_position;
  const isKediamanExco = profile?.role === 'JPP' && jppUnit === 'KK';
  const isYdp = jppPosition === 'YDP' || jppPosition === 'YANG_DIPERTUA' || jppPosition === 'NAIB_YDP';

  const hasAccess = isSuperAdmin || isKediamanExco || isYdp;

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasAccess) return;
    fetchAll();
  }, [hasAccess]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAll() {
    setLoading(true);
    try {
      const [settingsRes, profilesRes, cgpaRes, pencapaianRes, qrRes, recsRes] =
        await Promise.all([
          supabase.from('system_settings')
            .select('key, value')
            .in('key', ['intake_1_month', 'intake_2_month']),

          supabase.from('profiles')
            .select('id, full_name, matric_no, phone, programme_code, intake_year, intake_period, semester_override')
            .eq('account_status', 'APPROVED')
            .not('role', 'in', '("STAFF","SUPER_ADMIN_JPP","ADMIN")')
            .not('matric_no', 'is', null)
            .order('full_name', { ascending: true }),

          supabase.from('akademik_cgpa_records')
            .select('user_id, hpnm, created_at')
            .order('created_at', { ascending: false }),

          supabase.from('akademik_pencapaian')
            .select('user_id, merit_auto, merit_override')
            .eq('status', 'APPROVED'),

          supabase.from('akademik_qr_scans')
            .select('user_id, merit_awarded'),

          supabase.from('asrama_recommendations')
            .select('user_id, notes, marked_by, profiles!asrama_recommendations_marked_by_fkey(full_name)')
            .eq('session', CURRENT_SESSION),
        ]);

      // Build intake config
      const settingsMap: Record<string, string> = {};
      (settingsRes.data ?? []).forEach((s: any) => { settingsMap[s.key] = s.value; });
      const cfg = getIntakeMonths(settingsMap);
      setIntakeConfig(cfg);

      // Build HPNM map: user_id → latest hpnm
      const hpnmMap: Record<string, number | null> = {};
      for (const rec of (cgpaRes.data ?? []) as any[]) {
        if (!(rec.user_id in hpnmMap)) hpnmMap[rec.user_id] = rec.hpnm;
      }

      // Build merit_pencapaian map
      const pencapaianMap: Record<string, number> = {};
      for (const rec of (pencapaianRes.data ?? []) as any[]) {
        const val = rec.merit_override ?? rec.merit_auto ?? 0;
        pencapaianMap[rec.user_id] = (pencapaianMap[rec.user_id] ?? 0) + val;
      }

      // Build merit_aktiviti (QR scan) map
      const qrMap: Record<string, number> = {};
      for (const rec of (qrRes.data ?? []) as any[]) {
        qrMap[rec.user_id] = (qrMap[rec.user_id] ?? 0) + (rec.merit_awarded ?? 0);
      }

      // Build recommendations map
      const recsMap: Record<string, { note: string | null; markedBy: string | null }> = {};
      for (const rec of (recsRes.data ?? []) as any[]) {
        recsMap[rec.user_id] = {
          note: rec.notes,
          markedBy: (rec.profiles as any)?.full_name ?? null,
        };
      }

      // Merge into student rows
      const rows: StudentRow[] = (profilesRes.data ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        matric_no: p.matric_no,
        phone: p.phone,
        programme_code: p.programme_code,
        intake_year: p.intake_year,
        intake_period: p.intake_period,
        semester_override: p.semester_override,
        latest_hpnm: hpnmMap[p.id] ?? null,
        merit_pencapaian: pencapaianMap[p.id] ?? 0,
        merit_aktiviti: qrMap[p.id] ?? 0,
        isRecommended: p.id in recsMap,
        recommendationNote: recsMap[p.id]?.note ?? null,
        recommendedBy: recsMap[p.id]?.markedBy ?? null,
      }));

      setStudents(rows);
    } catch (err) {
      console.error('[JppAsramaPage] fetchAll error:', err);
      toast.error('Gagal memuatkan data pelajar.');
    } finally {
      setLoading(false);
    }
  }

  // ── Toggle recommendation ──────────────────────────────────────────────────
  async function toggleRecommend(student: StudentRow) {
    if (!user?.id) return;
    setRecLoading(student.id);
    try {
      if (student.isRecommended) {
        // Remove
        await supabase.from('asrama_recommendations')
          .delete()
          .eq('user_id', student.id)
          .eq('session', CURRENT_SESSION);
        toast.success('Tandaan Disyorkan dibuang.');
      } else {
        // Add
        const note = `Disyorkan oleh ${profile?.full_name ?? 'JPP'}`;
        await supabase.from('asrama_recommendations').upsert({
          user_id: student.id,
          session: CURRENT_SESSION,
          notes: note,
          marked_by: user.id,
        }, { onConflict: 'user_id,session' });
        toast.success('Pelajar ditandakan sebagai Disyorkan ⭐');
      }
      await fetchAll();
    } catch (err) {
      toast.error('Gagal mengemas kini cadangan.');
    } finally {
      setRecLoading(null);
    }
  }

  // ── Filter & sort logic ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = [...students];

    if (filterTahap !== 'Semua') {
      rows = rows.filter(s => getCohortLevel(s, intakeConfig) === filterTahap);
    }
    if (filterProg !== 'Semua') {
      rows = rows.filter(s => s.programme_code === filterProg);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(s =>
        s.full_name?.toLowerCase().includes(q) ||
        s.matric_no?.toLowerCase().includes(q)
      );
    }

    rows.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'hpnm') {
        diff = (a.latest_hpnm ?? -1) - (b.latest_hpnm ?? -1);
      } else if (sortKey === 'pencapaian') {
        diff = a.merit_pencapaian - b.merit_pencapaian;
      } else if (sortKey === 'aktiviti') {
        diff = a.merit_aktiviti - b.merit_aktiviti;
      } else {
        diff = a.full_name.localeCompare(b.full_name);
      }
      return sortDir === 'desc' ? -diff : diff;
    });

    return rows;
  }, [students, filterTahap, filterProg, search, sortKey, sortDir, intakeConfig]);

  // Derived stats
  const totalWithHpnm  = students.filter(s => s.latest_hpnm !== null).length;
  const totalRecommended = students.filter(s => s.isRecommended).length;

  // Unique programme codes that actually appear
  const availableProgs = useMemo(() => {
    const codes = [...new Set(students.map(s => s.programme_code).filter(Boolean))] as string[];
    return codes.sort();
  }, [students]);

  // ── Sort toggle ────────────────────────────────────────────────────────────
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  function exportCsv() {
    const headers = ['#', 'Nama', 'No Matrik', 'Program', 'Kohort', 'HPNM', 'Merit Pencapaian', 'Merit Aktiviti', 'Disyorkan'];
    const rows = filtered.map((s, i) => [
      i + 1,
      s.full_name,
      s.matric_no ?? '',
      s.programme_code ?? '',
      getCohortLabel(s, intakeConfig),
      s.latest_hpnm?.toFixed(2) ?? '',
      s.merit_pencapaian,
      s.merit_aktiviti,
      s.isRecommended ? `Ya (${s.recommendedBy ?? ''})` : 'Tidak',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `asrama-rujukan-${CURRENT_SESSION.replace('/', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Fail CSV berjaya dieksport!');
  }

  // ── Sort Icon ──────────────────────────────────────────────────────────────
  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 text-violet-400" />
      : <ChevronUp className="w-3 h-3 text-violet-400" />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Access Denied
  // ─────────────────────────────────────────────────────────────────────────
  if (!loading && !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <p className="font-black text-slate-700 dark:text-slate-200">Akses Terhad</p>
          <p className="text-sm text-slate-500">Hanya Exco Kediaman & Kerohanian yang diberi kebenaran.</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Main
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/15 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="font-black text-base text-slate-900 dark:text-white leading-none">
                Papan Rujukan Asrama
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                Sesi {CURRENT_SESSION}
              </p>
            </div>
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-violet-500/20 flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Stat cards ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            { label: 'Jumlah Pelajar', value: students.length, icon: GraduationCap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Ada HPNM', value: totalWithHpnm, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Tiada HPNM', value: students.length - totalWithHpnm, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Disyorkan ⭐', value: totalRecommended, icon: Star, color: 'text-violet-500', bg: 'bg-violet-500/10' },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className={`font-black text-xl leading-none ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Filters ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-4 flex flex-wrap gap-3 items-center"
        >
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />

          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama atau matrik..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
            />
          </div>

          {/* Tahap filter */}
          <select
            value={filterTahap}
            onChange={e => setFilterTahap(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/30 cursor-pointer"
          >
            <option value="Semua">Semua Tahap</option>
            <option value="Junior">Junior</option>
            <option value="Senior">Senior</option>
            <option value="Asasi">Asasi</option>
          </select>

          {/* Programme filter */}
          <select
            value={filterProg}
            onChange={e => setFilterProg(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/30 cursor-pointer"
          >
            <option value="Semua">Semua Program</option>
            {availableProgs.map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </motion.div>

        {/* ── Table (desktop) ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800/80">
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-slate-400 w-10">#</th>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-slate-400">
                    <button className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onClick={() => handleSort('nama')}>
                      Nama <SortIcon k="nama" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-slate-400">Matrik</th>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-slate-400">Prog</th>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-slate-400">Kohort</th>
                  <th className="text-center px-3 py-3 font-black uppercase tracking-widest text-emerald-500">
                    <button className="flex items-center gap-1 mx-auto hover:text-emerald-600 transition-colors" onClick={() => handleSort('hpnm')}>
                      HPNM <SortIcon k="hpnm" />
                    </button>
                  </th>
                  <th className="text-center px-3 py-3 font-black uppercase tracking-widest text-sky-500">
                    <button className="flex items-center gap-1 mx-auto hover:text-sky-600 transition-colors" onClick={() => handleSort('pencapaian')}>
                      <Award className="w-3 h-3" /> Pencapaian <SortIcon k="pencapaian" />
                    </button>
                  </th>
                  <th className="text-center px-3 py-3 font-black uppercase tracking-widest text-amber-500">
                    <button className="flex items-center gap-1 mx-auto hover:text-amber-600 transition-colors" onClick={() => handleSort('aktiviti')}>
                      <Zap className="w-3 h-3" /> Aktiviti <SortIcon k="aktiviti" />
                    </button>
                  </th>
                  <th className="text-center px-4 py-3 font-black uppercase tracking-widest text-violet-500">Disyorkan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400 font-bold text-sm">
                      Tiada pelajar ditemui.
                    </td>
                  </tr>
                )}
                {filtered.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`border-b border-slate-100 dark:border-slate-800/50 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30 ${s.isRecommended ? 'bg-violet-50/40 dark:bg-violet-900/10' : ''}`}
                  >
                    <td className="px-4 py-3 font-black text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{s.full_name}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{s.matric_no ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-black text-slate-600 dark:text-slate-300 text-[10px] tracking-wider">
                        {s.programme_code ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-bold">
                      {getCohortLabel(s, intakeConfig)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {s.latest_hpnm !== null
                        ? <span className="font-black text-emerald-600 dark:text-emerald-400">{s.latest_hpnm.toFixed(2)}</span>
                        : <span className="text-slate-300 dark:text-slate-600">—</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-black ${s.merit_pencapaian > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-slate-300 dark:text-slate-600'}`}>
                        {s.merit_pencapaian > 0 ? `${s.merit_pencapaian} pts` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-black ${s.merit_aktiviti > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}>
                        {s.merit_aktiviti > 0 ? `${s.merit_aktiviti} pts` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => toggleRecommend(s)}
                          disabled={recLoading === s.id}
                          title={s.isRecommended ? s.recommendationNote ?? 'Disyorkan' : 'Tandai sebagai Disyorkan'}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                            s.isRecommended
                              ? 'bg-violet-500/15 text-violet-500 hover:bg-rose-500/15 hover:text-rose-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-500'
                          }`}
                        >
                          {recLoading === s.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Star className={`w-3.5 h-3.5 ${s.isRecommended ? 'fill-violet-500' : ''}`} />
                          }
                        </button>
                        {s.isRecommended && s.recommendedBy && (
                          <p className="text-[9px] font-bold text-violet-400 leading-tight text-center max-w-[80px] truncate">
                            oleh {s.recommendedBy}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Jumlah: {filtered.length} pelajar
            </p>
            <p className="text-[10px] text-slate-400 font-bold">
              ✦ Pencapaian = merit akademik diluluskan &nbsp;|&nbsp; ✦ Aktiviti = merit QR scan
            </p>
          </div>
        </motion.div>

        {/* ── Card view (mobile) ──────────────────────────────────── */}
        <div className="md:hidden space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 font-bold text-sm">
              Tiada pelajar ditemui.
            </div>
          )}
          {filtered.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`rounded-2xl border p-4 space-y-3 ${
                s.isRecommended
                  ? 'bg-violet-50/60 dark:bg-violet-900/15 border-violet-200/60 dark:border-violet-700/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/60'
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 font-black text-xs text-slate-500">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm text-slate-900 dark:text-white truncate">{s.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-mono text-[10px] text-slate-400">{s.matric_no ?? '—'}</span>
                      {s.programme_code && (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-black text-[9px] text-slate-500 tracking-wider">
                          {s.programme_code}
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-slate-500">{getCohortLabel(s, intakeConfig)}</span>
                    </div>
                  </div>
                </div>

                {/* Star button */}
                <button
                  onClick={() => toggleRecommend(s)}
                  disabled={recLoading === s.id}
                  className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center transition-all active:scale-90 ${
                    s.isRecommended
                      ? 'bg-violet-500/15 text-violet-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-300'
                  }`}
                >
                  {recLoading === s.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Star className={`w-4 h-4 ${s.isRecommended ? 'fill-violet-500' : ''}`} />
                  }
                </button>
              </div>

              {/* Merit grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">HPNM</p>
                  <p className="font-black text-sm text-emerald-700 dark:text-emerald-300">
                    {s.latest_hpnm !== null ? s.latest_hpnm.toFixed(2) : '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-sky-50 dark:bg-sky-900/20 px-3 py-2 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-sky-500 mb-0.5">Pencapaian</p>
                  <p className="font-black text-sm text-sky-700 dark:text-sky-300">
                    {s.merit_pencapaian > 0 ? `${s.merit_pencapaian}` : '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-0.5">Aktiviti</p>
                  <p className="font-black text-sm text-amber-700 dark:text-amber-300">
                    {s.merit_aktiviti > 0 ? `${s.merit_aktiviti}` : '—'}
                  </p>
                </div>
              </div>

              {/* Recommendation note */}
              {s.isRecommended && s.recommendedBy && (
                <p className="text-[10px] font-bold text-violet-500 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-violet-500" />
                  Disyorkan oleh {s.recommendedBy}
                </p>
              )}
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
