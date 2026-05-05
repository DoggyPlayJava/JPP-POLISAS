import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Download, Star, Search, ChevronUp, ChevronDown,
  GraduationCap, Filter, AlertCircle, Loader2,
  TrendingUp, Award, Zap, Settings, Power, FileText,
  Home
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getSemesterInfo } from '@/types';
import { toast } from 'react-hot-toast';
import { KamsisSettingsModal } from '@/components/kamsis/KamsisSettingsModal';
import { useAcademicSession } from '@/contexts/AcademicSessionContext';
import { sendNotificationToUser } from '@/lib/notifications';

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

  // Recommendations
  isRecommended: boolean;
  recommendationNote: string | null;
  recommendedBy: string | null;

  // New Fields
  klk_status: 'LUAR' | 'DALAM' | 'BELUM_JAWAB';
  kamsis_status: string | null; // PENDING, APPROVED, REJECTED, OPT_OUT
  kamsis_extra_data: any;
}

type SortKey = 'hpnm' | 'pencapaian' | 'aktiviti' | 'nama';
type SortDir = 'asc' | 'desc';
type TabKey = 'semua' | 'pemohon' | 'rayuan' | 'kamsis' | 'klk';

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
// Components
// ─────────────────────────────────────────────────────────────────────────────
function ToggleBtn({ label, status, loading, onToggle }: { label: string; status: boolean; loading: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={cn(
        "flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm whitespace-nowrap",
        status ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20" : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
      )}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Power className="w-3 h-3" />}
      {status ? `TUTUP ${label}` : `BUKA ${label}`}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function JppAsramaPage() {
  const { user, profile, isSuperAdmin } = useAuth();
  const { activeSession, semesterString, refreshSession } = useAcademicSession();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [intakeConfig, setIntakeConfig] = useState({ month1: 7, month2: 1 });

  // System Settings
  const [sysSettings, setSysSettings] = useState<Record<string, boolean>>({
    kamsis_application_open: false,
    kamsis_result_open: false,
    kamsis_appeal_open: false,
    kamsis_appeal_result_open: false,
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<TabKey>('semua');
  const [filterTahap, setFilterTahap] = useState<string>('Semua');
  const [filterProg, setFilterProg] = useState<string>('Semua');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('hpnm');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Recommendation toggle loading
  const [recLoading, setRecLoading] = useState<string | null>(null);

  // ── Access guard ───────────────────────────────────────────────────────────
  const jppUnit = profile?.jpp_unit;
  const jppPosition = profile?.jpp_position;
  const isKediamanExco = profile?.role === 'JPP' && jppUnit === 'KK';
  const isYdp = jppPosition === 'YDP' || jppPosition === 'YANG_DIPERTUA' || jppPosition === 'NAIB_YDP';

  const hasAccess = isSuperAdmin || isKediamanExco || isYdp;

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasAccess) return;
    fetchAll();
  }, [hasAccess, activeSession, semesterString]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAllRows(builderFn: () => any) {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    let fetchMore = true;

    while (fetchMore) {
      const { data, error } = await builderFn().range(from, from + step - 1);
      if (error) throw error;
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += step;
        if (data.length < step) fetchMore = false;
      } else {
        fetchMore = false;
      }
    }
    return { data: allData };
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const [settingsRes, profilesRes, cgpaRes, recsRes, klkRes, kamsisRes] =
        await Promise.all([
          supabase.from('system_settings')
            .select('key, value')
            .in('key', ['intake_1_month', 'intake_2_month', 'kamsis_application_open', 'kamsis_result_open', 'kamsis_appeal_open', 'kamsis_appeal_result_open']),

          fetchAllRows(() => supabase.from('profiles')
            .select('id, full_name, matric_no, phone, programme_code, intake_year, intake_period, semester_override, merit_akademik, merit_asrama')
            .eq('account_status', 'APPROVED')
            .not('role', 'in', '("STAFF","SUPER_ADMIN_JPP","ADMIN")')
            .not('matric_no', 'is', null)
            .order('full_name', { ascending: true })),

          fetchAllRows(() => supabase.from('akademik_cgpa_records')
            .select('user_id, hpnm, created_at')
            .order('created_at', { ascending: false })),

          fetchAllRows(() => supabase.from('asrama_recommendations')
            .select('user_id, notes, marked_by, profiles!asrama_recommendations_marked_by_fkey(full_name)')
            .eq('session', activeSession)),

          fetchAllRows(() => supabase.from('klk_student_residency')
            .select('user_id, tinggal_luar')
            .eq('academic_year', activeSession)),

          fetchAllRows(() => supabase.from('kamsis_applications')
            .select('user_id, status, extra_data')
            .eq('session', activeSession)
            .eq('semester', semesterString)),
        ]);

      // Build config map
      const settingsMap: Record<string, any> = {};
      (settingsRes.data ?? []).forEach((s: any) => { settingsMap[s.key] = s.value; });
      setIntakeConfig(getIntakeMonths(settingsMap));
      setSysSettings({
        kamsis_application_open: typeof settingsMap['kamsis_application_open'] === 'string' ? settingsMap['kamsis_application_open'] === 'true' : !!settingsMap['kamsis_application_open'],
        kamsis_result_open: typeof settingsMap['kamsis_result_open'] === 'string' ? settingsMap['kamsis_result_open'] === 'true' : !!settingsMap['kamsis_result_open'],
        kamsis_appeal_open: typeof settingsMap['kamsis_appeal_open'] === 'string' ? settingsMap['kamsis_appeal_open'] === 'true' : !!settingsMap['kamsis_appeal_open'],
        kamsis_appeal_result_open: typeof settingsMap['kamsis_appeal_result_open'] === 'string' ? settingsMap['kamsis_appeal_result_open'] === 'true' : !!settingsMap['kamsis_appeal_result_open'],
      });

      // Build maps
      const hpnmMap: Record<string, number | null> = {};
      for (const rec of (cgpaRes.data ?? []) as any[]) {
        if (!(rec.user_id in hpnmMap)) {
          const val = rec.hpnm !== null && rec.hpnm !== undefined ? parseFloat(rec.hpnm) : null;
          hpnmMap[rec.user_id] = (val !== null && !isNaN(val)) ? val : null;
        }
      }

      const recsMap: Record<string, { note: string | null; markedBy: string | null }> = {};
      for (const rec of (recsRes.data ?? []) as any[]) {
        recsMap[rec.user_id] = { note: rec.notes, markedBy: (rec.profiles as any)?.full_name ?? null };
      }

      const klkMap: Record<string, boolean> = {};
      for (const k of (klkRes.data ?? []) as any[]) {
        klkMap[k.user_id] = k.tinggal_luar;
      }

      const kamsisMap: Record<string, any> = {};
      for (const k of (kamsisRes.data ?? []) as any[]) {
        kamsisMap[k.user_id] = k;
      }

      // Merge into student rows
      const rows: StudentRow[] = (profilesRes.data ?? []).map((p: any) => {
        const isFtv = p.programme_code === 'FTV';
        const info = getSemesterInfo(
          p.intake_year,
          p.intake_period as 1 | 2,
          isFtv,
          intakeConfig.month1,
          intakeConfig.month2,
          p.semester_override
        );
        const sem = info?.semester ?? 0;

        let klk_status: 'LUAR' | 'DALAM' | 'BELUM_JAWAB' = 'BELUM_JAWAB';
        if (p.id in klkMap) {
          klk_status = klkMap[p.id] ? 'LUAR' : 'DALAM';
        } else if (sem === 1) {
          klk_status = 'DALAM'; // Sem 1 is auto kamsis
        }

        return {
          id: p.id,
          full_name: p.full_name,
          matric_no: p.matric_no,
          phone: p.phone,
          programme_code: p.programme_code,
          intake_year: p.intake_year,
          intake_period: p.intake_period,
          semester_override: p.semester_override,
          latest_hpnm: hpnmMap[p.id] ?? null,
          merit_pencapaian: p.merit_akademik ?? 0,
          merit_aktiviti: p.merit_asrama ?? 0,
          isRecommended: p.id in recsMap,
          recommendationNote: recsMap[p.id]?.note ?? null,
          recommendedBy: recsMap[p.id]?.markedBy ?? null,
          klk_status,
          kamsis_status: kamsisMap[p.id]?.status ?? null,
          kamsis_extra_data: kamsisMap[p.id]?.extra_data ?? null,
        };
      });

      setStudents(rows);
    } catch (err) {
      console.error('[JppAsramaPage] fetchAll error:', err);
      toast.error('Gagal memuatkan data pelajar.');
    } finally {
      setLoading(false);
    }
  }

  // ── Toggle Settings ────────────────────────────────────────────────────────
  async function toggleSetting(key: string) {
    setTogglingKey(key);
    try {
      const newValue = !sysSettings[key];
      const { error } = await supabase.from('system_settings').upsert({
        key: key,
        value: newValue
      }, { onConflict: 'key' });

      if (error) throw error;

      setSysSettings(prev => ({ ...prev, [key]: newValue }));
      toast.success('Tetapan berjaya dikemaskini!');
    } catch (e) {
      toast.error('Gagal menukar status tetapan.');
    } finally {
      setTogglingKey(null);
    }
  }

  // ── Toggle recommendation ──────────────────────────────────────────────────
  async function toggleRecommend(student: StudentRow) {
    if (!user?.id) return;
    setRecLoading(student.id);
    try {
      if (student.isRecommended) {
        await supabase.from('asrama_recommendations').delete()
          .eq('user_id', student.id).eq('session', activeSession);
        toast.success('Tandaan Disyorkan dibuang.');
      } else {
        const note = `Disyorkan oleh ${profile?.full_name ?? 'JPP'}`;
        await supabase.from('asrama_recommendations').upsert({
          user_id: student.id, session: activeSession, notes: note, marked_by: user.id,
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

  // ── Update Kamsis Status ───────────────────────────────────────────────────
  async function updateStatus(student: StudentRow, status: 'APPROVED' | 'REJECTED' | 'APPEAL_REJECTED') {
    if (!user?.id) return;
    try {
      await supabase.from('kamsis_applications').update({ status })
        .eq('user_id', student.id).eq('session', activeSession).eq('semester', semesterString);
      toast.success(`Status dikemaskini kepada ${status}`);

      // ── Notifikasi kepada pelajar ──
      try {
        const titleMap: Record<string, string> = {
          APPROVED: '✅ Permohonan Asrama Diluluskan',
          REJECTED: '❌ Permohonan Asrama Ditolak',
          APPEAL_REJECTED: '❌ Rayuan Asrama Ditolak',
        };
        const msgMap: Record<string, string> = {
          APPROVED: `Tahniah! Permohonan asrama anda untuk sesi ${activeSession} telah diluluskan.`,
          REJECTED: `Permohonan asrama anda untuk sesi ${activeSession} tidak berjaya. Anda boleh membuat rayuan jika tetingkap rayuan dibuka.`,
          APPEAL_REJECTED: `Rayuan permohonan asrama anda untuk sesi ${activeSession} tidak berjaya. Sila hubungi pihak pengurusan untuk maklumat lanjut.`,
        };
        await sendNotificationToUser(student.id, {
          title: titleMap[status],
          message: msgMap[status],
          type: 'KAMSIS_STATUS',
          module: 'KAMSIS',
          link: '/dashboard',
        });
      } catch {} // Jangan block bisnes logic

      await fetchAll();
    } catch {
      toast.error('Gagal kemaskini status.');
    }
  }

  // ── Filter & sort logic ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = [...students];

    // Tab Filters
    if (activeTab === 'pemohon') {
      rows = rows.filter(s => (s.kamsis_status === 'PENDING' || s.kamsis_status === 'REJECTED' || (s.kamsis_status === 'APPROVED' && !s.kamsis_extra_data?.appeal_reason)));
    } else if (activeTab === 'rayuan') {
      rows = rows.filter(s => s.kamsis_status === 'APPEALING' || s.kamsis_status === 'APPEAL_REJECTED' || (s.kamsis_status === 'APPROVED' && !!s.kamsis_extra_data?.appeal_reason));
    } else if (activeTab === 'klk') {
      rows = rows.filter(s => s.klk_status === 'LUAR');
    } else if (activeTab === 'kamsis') {
      rows = rows.filter(s => s.klk_status === 'DALAM');
    }

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
  }, [students, filterTahap, filterProg, search, sortKey, sortDir, intakeConfig, activeTab]);

  // Derived stats
  const totalWithHpnm = students.filter(s => s.latest_hpnm !== null).length;
  const totalRecommended = students.filter(s => s.isRecommended).length;
  const totalPemohon = students.filter(s => s.kamsis_status === 'PENDING').length;
  const totalLuar = students.filter(s => s.klk_status === 'LUAR').length;

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

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 text-violet-400" />
      : <ChevronUp className="w-3 h-3 text-violet-400" />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Access Denied / Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (!loading && !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <p className="font-black text-slate-700 dark:text-slate-200">Akses Terhad</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {showSettingsModal && <KamsisSettingsModal onClose={() => setShowSettingsModal(false)} />}

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
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                Sesi
                <input
                  key={activeSession}
                  type="text"
                  defaultValue={activeSession}
                  onBlur={async (e) => {
                    const val = e.target.value.trim();
                    if (!val || val === activeSession) return;
                    const toastId = toast.loading('Menukar sesi...');
                    try {
                      await supabase.from('system_settings').upsert(
                        { key: 'current_academic_session', value: val },
                        { onConflict: 'key' }
                      );
                      await refreshSession();
                      toast.success(`Sesi KAMSIS ditukar ke ${val}`, { id: toastId });
                    } catch { toast.error('Gagal tukar sesi.', { id: toastId }); }
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  className="w-[90px] bg-violet-500/10 border border-violet-500/20 rounded-lg px-2 py-0.5 text-[10px] font-black text-violet-600 dark:text-violet-300 text-center focus:outline-none focus:border-violet-500/50 hover:bg-violet-500/20 transition-colors"
                />
                ·
                <select
                  value={semesterString}
                  onChange={async (e) => {
                    const val = e.target.value;
                    const toastId = toast.loading('Menukar semester...');
                    try {
                      await supabase.from('system_settings').upsert(
                        { key: 'current_academic_semester', value: val },
                        { onConflict: 'key' }
                      );
                      await refreshSession();
                      toast.success(`Semester KAMSIS ditukar ke Sem ${val}`, { id: toastId });
                    } catch { toast.error('Gagal tukar semester.', { id: toastId }); }
                  }}
                  className="bg-violet-500/10 border border-violet-500/20 rounded-lg px-2 py-0.5 text-[10px] font-black text-violet-600 dark:text-violet-300 cursor-pointer hover:bg-violet-500/20 transition-colors"
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3 (Pendek)</option>
                </select>
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black transition-all active:scale-95 flex-1 justify-center sm:flex-none"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Borang</span>
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:pb-0 md:overflow-visible md:flex-wrap">
            <ToggleBtn label="Permohonan Kamsis" status={sysSettings.kamsis_application_open} loading={togglingKey==='kamsis_application_open'} onToggle={() => toggleSetting('kamsis_application_open')} />
            <ToggleBtn label="Keputusan Pemohon" status={sysSettings.kamsis_result_open} loading={togglingKey==='kamsis_result_open'} onToggle={() => toggleSetting('kamsis_result_open')} />
            <ToggleBtn label="Permohonan Rayuan" status={sysSettings.kamsis_appeal_open} loading={togglingKey==='kamsis_appeal_open'} onToggle={() => toggleSetting('kamsis_appeal_open')} />
            <ToggleBtn label="Keputusan Rayuan" status={sysSettings.kamsis_appeal_result_open} loading={togglingKey==='kamsis_appeal_result_open'} onToggle={() => toggleSetting('kamsis_appeal_result_open')} />
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ── Stat cards ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0"><GraduationCap className="w-4 h-4 text-blue-500" /></div>
            <div>
              <p className="font-black text-xl leading-none text-blue-500">{students.length}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5">Semua Pelajar</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4 text-amber-500" /></div>
            <div>
              <p className="font-black text-xl leading-none text-amber-500">{totalPemohon}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5">Permohonan Baru</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-500/10 flex items-center justify-center flex-shrink-0"><Home className="w-4 h-4 text-slate-500" /></div>
            <div>
              <p className="font-black text-xl leading-none text-slate-500">{totalLuar}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5">Luar Kampus</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0"><Star className="w-4 h-4 text-violet-500" /></div>
            <div>
              <p className="font-black text-xl leading-none text-violet-500">{totalRecommended}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5">Disyorkan</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'semua', label: 'Semua Data' },
            { id: 'pemohon', label: 'Senarai Pemohon Baru' },
            { id: 'rayuan', label: 'Senarai Rayuan' },
            { id: 'kamsis', label: 'Dalam Asrama' },
            { id: 'klk', label: 'Luar Kampus (KLK)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabKey)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors ${activeTab === tab.id
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Filters ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-4 flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input type="text" placeholder="Cari nama..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/30" />
          </div>
          <select value={filterTahap} onChange={e => setFilterTahap(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/30">
            <option value="Semua">Semua Tahap</option>
            <option value="Junior">Junior</option><option value="Senior">Senior</option><option value="Asasi">Asasi</option>
          </select>
          <select value={filterProg} onChange={e => setFilterProg(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/30">
            <option value="Semua">Semua Program</option>
            {availableProgs.map(code => <option key={code} value={code}>{code}</option>)}
          </select>
        </motion.div>

        {/* ── Table (desktop) ─────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20">
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-slate-400 w-10">#</th>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-slate-400"><button className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onClick={() => handleSort('nama')}>Nama <SortIcon k="nama" /></button></th>
                  <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-slate-400">Kohort</th>
                  <th className="text-center px-3 py-3 font-black uppercase tracking-widest text-emerald-500"><button className="flex items-center gap-1 mx-auto" onClick={() => handleSort('hpnm')}>HPNM <SortIcon k="hpnm" /></button></th>
                  <th className="text-center px-3 py-3 font-black uppercase tracking-widest text-sky-500"><button className="flex items-center gap-1 mx-auto" onClick={() => handleSort('pencapaian')}><Award className="w-3 h-3" /> Pencapaian <SortIcon k="pencapaian" /></button></th>
                  <th className="text-center px-3 py-3 font-black uppercase tracking-widest text-amber-500"><button className="flex items-center gap-1 mx-auto" onClick={() => handleSort('aktiviti')}><Zap className="w-3 h-3" /> Aktiviti <SortIcon k="aktiviti" /></button></th>

                  {activeTab === 'pemohon' || activeTab === 'rayuan' ? (
                    <>
                      <th className="text-left px-4 py-3 font-black uppercase tracking-widest text-slate-400">Maklumat Tambahan</th>
                      <th className="text-center px-4 py-3 font-black uppercase tracking-widest text-violet-500">Disyorkan</th>
                      <th className="text-center px-4 py-3 font-black uppercase tracking-widest text-slate-400">Status / Tindakan</th>
                    </>
                  ) : (
                    <>
                      <th className="text-center px-4 py-3 font-black uppercase tracking-widest text-slate-400">Status Residensi</th>
                      <th className="text-center px-4 py-3 font-black uppercase tracking-widest text-violet-500">Disyorkan</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 ${s.isRecommended ? 'bg-violet-50/40 dark:bg-violet-900/10' : ''}`}>
                    <td className="px-4 py-3 font-black text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{s.full_name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{s.matric_no} • {s.programme_code}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-bold">{getCohortLabel(s, intakeConfig)}</td>
                    <td className="px-3 py-3 text-center font-black text-emerald-600 dark:text-emerald-400">{s.latest_hpnm?.toFixed(2) ?? '—'}</td>
                    <td className="px-3 py-3 text-center font-black text-sky-600 dark:text-sky-400">{s.merit_pencapaian > 0 ? s.merit_pencapaian : '—'}</td>
                    <td className="px-3 py-3 text-center font-black text-amber-600 dark:text-amber-400">{s.merit_aktiviti > 0 ? s.merit_aktiviti : '—'}</td>

                    {activeTab === 'pemohon' || activeTab === 'rayuan' ? (
                      <>
                        <td className="px-4 py-3 text-[10px] text-slate-500 font-mono">
                          {s.kamsis_extra_data && Object.keys(s.kamsis_extra_data).length > 0
                            ? Object.entries(s.kamsis_extra_data).map(([k, v]) => <div key={k}><span className="font-bold text-slate-400">{k}:</span> {String(v)}</div>)
                            : 'Tiada'
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleRecommend(s)} disabled={recLoading === s.id} className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-all active:scale-90 ${s.isRecommended ? 'bg-violet-500/15 text-violet-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                            {recLoading === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className={`w-3.5 h-3.5 ${s.isRecommended ? 'fill-violet-500' : ''}`} />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.kamsis_status === 'PENDING' ? (
                            isSuperAdmin ? (
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => updateStatus(s, 'APPROVED')} className="px-3 py-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded text-[10px] font-black uppercase transition-colors">Lulus</button>
                                <button onClick={() => updateStatus(s, 'REJECTED')} className="px-3 py-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded text-[10px] font-black uppercase transition-colors">Tolak</button>
                              </div>
                            ) : (
                              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-black uppercase">Menunggu Kelulusan</span>
                            )
                          ) : s.kamsis_status === 'APPEALING' ? (
                            isSuperAdmin ? (
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => updateStatus(s, 'APPROVED')} className="px-3 py-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded text-[10px] font-black uppercase transition-colors">Terima Rayuan</button>
                                <button onClick={() => updateStatus(s, 'APPEAL_REJECTED')} className="px-3 py-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded text-[10px] font-black uppercase transition-colors">Tolak Rayuan</button>
                              </div>
                            ) : (
                              <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-500 text-[10px] font-black uppercase">Rayuan Diproses</span>
                            )
                          ) : (
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${s.kamsis_status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                              {s.kamsis_status === 'APPEAL_REJECTED' ? 'RAYUAN DITOLAK' : s.kamsis_status}
                            </span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-center">
                          {s.klk_status === 'LUAR' ? (
                            <span className="px-2 py-0.5 bg-slate-500/15 text-slate-400 text-[10px] font-black rounded-md uppercase">Luar Kampus</span>
                          ) : s.klk_status === 'DALAM' ? (
                            <span className="px-2 py-0.5 bg-violet-500/15 text-violet-400 text-[10px] font-black rounded-md uppercase">Asrama</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-500/15 text-amber-500 text-[10px] font-black rounded-md uppercase">Belum Jawab</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleRecommend(s)} disabled={recLoading === s.id} className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-all active:scale-90 ${s.isRecommended ? 'bg-violet-500/15 text-violet-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                            {recLoading === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className={`w-3.5 h-3.5 ${s.isRecommended ? 'fill-violet-500' : ''}`} />}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── Mobile List (Cards) ─────────────────────────────────── */}
        <div className="md:hidden space-y-3">
          {filtered.map((s, i) => (
            <div key={s.id} className={cn(
              "bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-3",
              s.isRecommended && "bg-violet-50/40 dark:bg-violet-900/10 border-violet-200/50 dark:border-violet-800/50"
            )}>
               <div className="flex justify-between items-start gap-2">
                 <div>
                   <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{s.full_name}</p>
                   <p className="text-[10px] text-slate-500 mt-0.5">{s.matric_no} • {s.programme_code}</p>
                 </div>
                 <div className="text-right flex-shrink-0">
                   <p className="text-[10px] font-bold text-slate-400">HPNM</p>
                   <p className="font-black text-emerald-600 dark:text-emerald-400">{s.latest_hpnm?.toFixed(2) ?? '—'}</p>
                 </div>
               </div>

               <div className="flex gap-4 border-y border-slate-100 dark:border-slate-800/50 py-3">
                 <div className="flex-1">
                   <p className="text-[10px] font-bold text-slate-400">Pencapaian</p>
                   <p className="font-black text-sky-600 dark:text-sky-400">{s.merit_pencapaian > 0 ? s.merit_pencapaian : '—'}</p>
                 </div>
                 <div className="flex-1">
                   <p className="text-[10px] font-bold text-slate-400">Aktiviti</p>
                   <p className="font-black text-amber-600 dark:text-amber-400">{s.merit_aktiviti > 0 ? s.merit_aktiviti : '—'}</p>
                 </div>
                 <div className="flex-1 text-right">
                   <p className="text-[10px] font-bold text-slate-400">Kohort</p>
                   <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{getCohortLabel(s, intakeConfig)}</p>
                 </div>
               </div>

               <div className="flex items-center justify-between">
                  <div>
                    {(activeTab === 'pemohon' || activeTab === 'rayuan') ? (
                       s.kamsis_status === 'PENDING' ? (
                          isSuperAdmin ? (
                             <div className="flex items-center gap-2">
                               <button onClick={() => updateStatus(s, 'APPROVED')} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg text-[10px] font-black uppercase transition-colors">Lulus</button>
                               <button onClick={() => updateStatus(s, 'REJECTED')} className="px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-black uppercase transition-colors">Tolak</button>
                             </div>
                          ) : (
                             <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-black uppercase">Menunggu Kelulusan</span>
                          )
                       ) : s.kamsis_status === 'APPEALING' ? (
                          isSuperAdmin ? (
                             <div className="flex items-center gap-2">
                               <button onClick={() => updateStatus(s, 'APPROVED')} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg text-[10px] font-black uppercase transition-colors">Terima</button>
                               <button onClick={() => updateStatus(s, 'APPEAL_REJECTED')} className="px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-black uppercase transition-colors">Tolak</button>
                             </div>
                          ) : (
                             <span className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-500 text-[10px] font-black uppercase">Rayuan Diproses</span>
                          )
                       ) : (
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${s.kamsis_status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                            {s.kamsis_status === 'APPEAL_REJECTED' ? 'RAYUAN DITOLAK' : s.kamsis_status}
                          </span>
                       )
                    ) : (
                       s.klk_status === 'LUAR' ? (
                          <span className="px-2.5 py-1 bg-slate-500/15 text-slate-400 text-[10px] font-black rounded-md uppercase">Luar Kampus</span>
                       ) : s.klk_status === 'DALAM' ? (
                          <span className="px-2.5 py-1 bg-violet-500/15 text-violet-400 text-[10px] font-black rounded-md uppercase">Asrama</span>
                       ) : (
                          <span className="px-2.5 py-1 bg-amber-500/15 text-amber-500 text-[10px] font-black rounded-md uppercase">Belum Jawab</span>
                       )
                    )}
                  </div>

                  <button onClick={() => toggleRecommend(s)} disabled={recLoading === s.id} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${s.isRecommended ? 'bg-violet-500/15 text-violet-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                    {recLoading === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className={`w-4 h-4 ${s.isRecommended ? 'fill-violet-500' : ''}`} />}
                  </button>
               </div>
               
               {(activeTab === 'pemohon' || activeTab === 'rayuan') && s.kamsis_extra_data && Object.keys(s.kamsis_extra_data).length > 0 && (
                  <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800/50 text-[10px] text-slate-500 font-mono">
                     {Object.entries(s.kamsis_extra_data).map(([k, v]) => <div key={k}><span className="font-bold text-slate-400">{k}:</span> {String(v)}</div>)}
                  </div>
               )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
              <p className="text-sm font-bold text-slate-500">Tiada rekod pelajar.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
