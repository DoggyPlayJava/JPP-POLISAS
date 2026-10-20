import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn, hexToRgba } from '@/lib/utils';
import { getSemesterInfo } from '@/types';
import {
  Trophy, Star, BookOpen, Clock, CheckCircle,
  XCircle, ArrowRight, Plus, Zap, Award,
  GraduationCap, QrCode, ChevronDown, ListChecks,
  Upload, ScanLine, FileText, CalendarDays,
  Building2, CreditCard, Sparkles, User,
} from 'lucide-react';

const THEME = '#818CF8';

// BLANKET low-perf (diputuskan 2026-10): semua device dilayan low-perf.

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub, onClick, delay = 0 }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={cn(
        'rounded-[1.75rem] p-5 border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] text-slate-900 dark:text-white shadow-xs flex flex-col gap-3  min-h-[44px]',
        onClick && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.1] transition-all duration-300 active:scale-[0.99]'
      )}
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{ background: hexToRgba(color, 0.15), color }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">{value}</p>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-white/40 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 dark:text-white/20 font-medium mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─── Quick Action (Mobile-First >= 44px) ─────────────────────────
function QuickAction({ label, desc, icon: Icon, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.05] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/[0.1] transition-all text-left group min-h-[52px] w-full active:scale-[0.99] text-slate-900 dark:text-white"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
        style={{ background: hexToRgba(color, 0.15), color }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-slate-900 dark:text-white">{label}</p>
        <p className="text-[10px] text-slate-500 dark:text-white/40 font-medium mt-0.5 line-clamp-1">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-400 dark:text-white/20 group-hover:text-slate-600 dark:group-hover:text-white/40 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

// ─── QR Scan CTA Banner (student-only) ───────────────────────
function QrScanCta({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation(['akademik', 'common']);
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="w-full relative overflow-hidden rounded-[2rem] p-5 border border-indigo-200/80 dark:border-indigo-500/25 text-left group transition-all hover:border-indigo-400/40 active:scale-[0.99] min-h-[48px] bg-gradient-to-br from-indigo-50/90 via-indigo-50/50 to-white dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-blue-950/15"
    >
      {/* Pulse ring around QR icon */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
        <div
          className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: hexToRgba(THEME, 0.25), color: THEME }}
        >
          <ScanLine className="w-6 h-6" />
        </div>
      </div>

      <div className="pr-20 relative">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-300/60 mb-1">{t('akademik:qr_cta_badge', 'Merit Aktiviti')}</p>
        <p className="text-lg font-black text-slate-900 dark:text-white">{t('akademik:scan_qr_merit_title', 'Scan QR Merit')}</p>
        <p className="text-[11px] text-slate-600 dark:text-white/40 font-medium mt-1">
          {t('akademik:qr_cta_desc', 'Hadir program & pamer di kaunter aktiviti untuk dapatkan merit')}
        </p>
        <div
          className="flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase tracking-widest"
          style={{ color: THEME }}
        >
          {t('akademik:open_camera_scan', 'Buka Kamera Scan')} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </motion.button>
  );
}

// ─── Tutorial 3-Langkah (collapsible) ─────────────────────────
const TUTORIAL_KEY = 'akademik_tutorial_seen';

function TutorialCollapsible() {
  const { t } = useTranslation(['akademik', 'common']);
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(TUTORIAL_KEY) !== 'true'; }
    catch { return true; }
  });

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(TUTORIAL_KEY, 'true'); } catch { /* */ }
  };

  const steps = [
    {
      num: '1',
      icon: Upload,
      label: t('akademik:tutorial_step_1_title', 'Upload Pencapaian'),
      desc: t('akademik:tutorial_step_1_desc', 'Rekod sijil, anugerah, & pertandingan. Exco akan sahkan dalam 3–5 hari bekerja.'),
      color: THEME,
    },
    {
      num: '2',
      icon: QrCode,
      label: t('akademik:tutorial_step_2_title', 'Scan QR Aktiviti'),
      desc: t('akademik:tutorial_step_2_desc', 'Hadir program & scan kod QR di kaunter untuk merit aktiviti tambahan.'),
      color: '#34D399',
    },
    {
      num: '3',
      icon: CheckCircle,
      label: t('akademik:tutorial_step_3_title', 'Semak Merit & HPNM'),
      desc: t('akademik:tutorial_step_3_desc', 'Pantau jumlah merit & upload slip HPNM untuk rekod akademik lengkap.'),
      color: '#F59E0B',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden shadow-xs"
    >
      {/* Header */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all min-h-[44px]"
      >
        <div className="flex items-center gap-2">
          <ListChecks className="w-3.5 h-3.5 text-slate-400 dark:text-white/30" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
            {t('akademik:tutorial_guide_title', 'Panduan Bermula — 3 Langkah')}
          </span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-white/20" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {steps.map(s => {
                const StepIcon = s.icon;
                return (
                  <div
                    key={s.num}
                    className="flex flex-col gap-2 p-3.5 rounded-xl border border-slate-200/60 dark:border-white/[0.05] bg-slate-50/50 dark:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: hexToRgba(s.color, 0.15), color: s.color }}
                      >
                        <StepIcon className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[10px] font-black text-slate-800 dark:text-white/70">{s.label}</p>
                    </div>
                    <p className="text-[9px] text-slate-500 dark:text-white/40 font-medium leading-relaxed">{s.desc}</p>
                  </div>
                );
              })}
            </div>
            <div className="px-5 pb-4 flex justify-end">
              <button
                onClick={dismiss}
                className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 hover:text-slate-600 dark:hover:text-white/40 transition-colors py-2 px-3 min-h-[44px] flex items-center"
              >
                {t('akademik:tutorial_dismiss', 'Faham, jangan tunjuk lagi →')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────
export function AkademikDashboard() {
  const { t } = useTranslation(['akademik', 'common']);
  const { profile } = useAuth();
  const navigate    = useNavigate();

  const [stats, setStats] = useState({
    totalPencapaian: 0,
    disahkan:        0,
    menunggu:        0,
    ditolak:         0,
    meritAkademik:   0,
    meritQr:         0,
    meritKelab:      0,
    latestHpnm:      null as number | null,
  });
  const [recentPencapaian, setRecentPencapaian] = useState<any[]>([]);
  const [loading, setLoading] = useState(() => typeof window === 'undefined' ? false : true);

  const load = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [pencRes, cgpaRes] = await Promise.all([
        supabase
          .from('akademik_pencapaian')
          .select('id, nama_pencapaian, jenis, peringkat, status, merit_auto, merit_override, created_at, akademik_sijil_categories(name, icon, color)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('akademik_cgpa_records')
          .select('hpnm, semester, tahun')
          .eq('user_id', profile.id)
          .eq('is_user_verified', true)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const pencs = pencRes.data || [];
      const meritAkademik = (profile as any).merit_akademik ?? 0;
      const meritQr       = (profile as any).merit_asrama   ?? 0;
      const meritKelab    = (profile as any).merit_kelab     ?? 0;

      setStats({
        totalPencapaian: pencs.length,
        disahkan:        pencs.filter(p => p.status === 'DISAHKAN').length,
        menunggu:        pencs.filter(p => p.status === 'MENUNGGU').length,
        ditolak:         pencs.filter(p => p.status === 'DITOLAK').length,
        meritAkademik,
        meritQr,
        meritKelab,
        latestHpnm: cgpaRes.data?.[0]?.hpnm != null ? parseFloat(cgpaRes.data[0].hpnm) : null,
      });
      setRecentPencapaian(pencs.slice(0, 4));
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    MENUNGGU: { label: t('akademik:status_pending', 'Menunggu'), color: '#F59E0B', bg: '#F59E0B15', icon: Clock },
    DISAHKAN: { label: t('akademik:status_approved', 'Disahkan'), color: '#10B981', bg: '#10B98115', icon: CheckCircle },
    DITOLAK:  { label: t('akademik:status_rejected', 'Ditolak'),  color: '#EF4444', bg: '#EF444415', icon: XCircle },
  };

  const totalMerit = (profile?.merit || 0);

  // Student semester info
  const semInfo = profile?.intake_year
    ? getSemesterInfo(
        profile.intake_year,
        (profile.intake_period as 1 | 2) || 1,
        profile.programme_code === 'FTV',
        7,
        1,
        profile.semester_override
      )
    : {
        semester: profile?.semester_override || 1,
        level: (profile?.semester_override || 1) <= 3 ? 'Junior' : 'Senior',
      };

  if (loading) {
    return (
      <div className="space-y-4 py-4" aria-busy="true">
        <div className="rounded-[2rem] border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] p-5">
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {t('akademik:module_title', 'Hab Akademik & Matriks Jadual Waktu')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
            {t('akademik:module_subtitle', 'Matriks jadual kuliah, tarikh peperiksaan, parser jadual kelas, dan anggaran HPNM.')}
          </p>
        </div>
        <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
              {t('akademik:timetable_grid', 'Matriks Jadual Waktu Kelas')}
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              {t('akademik:current_slot', 'Kuliah Sedang Berlangsung')}
            </span>
          </div>
        </div>
        <div className="h-28 rounded-[2rem] bg-slate-200/60 dark:bg-white/[0.03] animate-pulse border border-slate-200/40 dark:border-white/[0.04]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-[1.75rem] bg-slate-200/60 dark:bg-white/[0.03] animate-pulse border border-slate-200/40 dark:border-white/[0.04]" />
          ))}
        </div>
        <div className="h-64 rounded-[2rem] bg-slate-200/60 dark:bg-white/[0.03] animate-pulse border border-slate-200/40 dark:border-white/[0.04]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Student Cockpit Header Card ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white p-5 md:p-6  relative overflow-hidden shadow-xs"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left: Student Identity & Academic Profile */}
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-400/30 text-indigo-600 dark:text-white font-black text-xl shadow-lg"
              style={{ background: hexToRgba(THEME, 0.2) }}
            >
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : <GraduationCap className="w-7 h-7 text-indigo-400 dark:text-indigo-300" />}
            </div>
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30">
                  {t('akademik:module_title', 'Hab Akademik & Matriks Jadual Waktu')}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  {t('akademik:status_active', 'Aktif')}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight truncate">
                {profile?.full_name || t('akademik:default_student_name', 'Pelajar POLISAS')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-white/40 font-medium">
                {t('akademik:module_subtitle', 'Matriks jadual kuliah, tarikh peperiksaan, parser jadual kelas, dan anggaran HPNM.')}
              </p>
              {/* Badges row: Matric, Department, Semester */}
              <div className="flex items-center gap-2.5 flex-wrap text-slate-500 dark:text-white/40 text-[11px] font-medium pt-1">
                <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-white/[0.04] px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span className="font-bold text-slate-700 dark:text-white/70">{profile?.matric_no || profile?.matrix_no || t('akademik:no_matric_no', 'Tiada No. Matrik')}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-white/[0.04] px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
                  <Building2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  <span className="font-bold text-slate-700 dark:text-white/70">{profile?.department || profile?.programme_code || t('akademik:default_department', 'Jabatan POLISAS')}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-white/[0.04] px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                  <span className="font-bold text-slate-700 dark:text-white/70">{t('akademik:semester_n', 'Sem {{sem}}', { sem: semInfo.semester })} ({semInfo.level})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quick Performance Metrics (CGPA + Merit Aktiviti) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 shrink-0 pt-2 md:pt-0">
            {/* CGPA Card */}
            <div
              onClick={() => navigate('/akademik/cgpa')}
              className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] hover:border-indigo-500/30 transition-all cursor-pointer min-h-[48px] flex flex-col justify-center"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40">HPNM / CGPA</span>
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-white leading-none">
                {stats.latestHpnm !== null ? stats.latestHpnm.toFixed(2) : '—'}
              </p>
              <span className="text-[8px] font-semibold text-sky-600 dark:text-sky-400/80 mt-1">{t('akademik:latest_badge', 'Terkini')}</span>
            </div>

            {/* Merit Aktiviti Card */}
            <div
              onClick={() => navigate('/akademik/qr')}
              className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.07] hover:border-emerald-500/30 transition-all cursor-pointer min-h-[48px] flex flex-col justify-center"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40">{t('akademik:merit_activity', 'Merit Aktiviti')}</span>
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-white leading-none">
                {stats.meritQr}
              </p>
              <span className="text-[8px] font-semibold text-emerald-600 dark:text-emerald-400/80 mt-1">{t('akademik:total_merit_short', 'Total {{count}} m', { count: totalMerit })}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Timetable Matrix Overview Card ── */}
      <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
              {t('akademik:timetable_grid', 'Matriks Jadual Waktu Kelas')}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            {t('akademik:current_slot', 'Kuliah Sedang Berlangsung')}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04] space-y-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase">
              {t('akademik:lecture_hall', 'Dewan Kuliah / Makmal')}
            </span>
            <p className="font-bold text-slate-800 dark:text-slate-200">{t('akademik:mock_hall_computer_lab', 'DK 1 / Makmal Komputer 3')}</p>
            <p className="text-[11px] text-slate-500 dark:text-white/40">
              {t('akademik:lecturer_name', 'Pensyarah / Pengajar')}: Dr. Haslina
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-500 uppercase">
                {t('akademik:next_slot', 'Slot Kuliah Seterusnya')}
              </span>
              <span className="text-[10px] text-amber-500 font-semibold">
                {t('akademik:free_slot', 'Masa Lapang / Rehat')} (13:00 - 14:00)
              </span>
            </div>
            <p className="font-bold text-slate-800 dark:text-slate-200">{t('akademik:mock_subject_cs_algo', 'Sains Komputer & Algoritma')}</p>
            <p className="text-[11px] text-slate-500 dark:text-white/40">
              {t('akademik:lecture_hall', 'Dewan Kuliah / Makmal')}: DK 2
            </p>
          </div>
        </div>
      </div>

      {/* ── QR Scan CTA ── */}
      <QrScanCta onClick={() => navigate('/akademik/qr')} />

      {/* ── Tutorial 3-Langkah ── */}
      <TutorialCollapsible />

      {/* ── Merit Hero Banner ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="tour-akademik-merit relative overflow-hidden rounded-[2rem] p-6 border border-slate-200/80 dark:border-white/[0.06] shadow-xs"
        style={{ background: `linear-gradient(135deg, ${hexToRgba(THEME, 0.12)}, ${hexToRgba('#60A5FA', 0.06)})` }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{ background: `radial-gradient(circle at 20% 50%, ${THEME}, transparent 60%)` }}
        />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-white/40 mb-1">{t('akademik:total_merit_overall', 'Jumlah Merit Keseluruhan')}</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black text-slate-900 dark:text-white">{totalMerit}</span>
              <span className="text-sm font-black text-slate-500 dark:text-white/40 mb-1">{t('akademik:merit_unit', 'merit')}</span>
            </div>
            {/* Breakdown row */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: '#A78BFA20', color: '#A78BFA' }}>
                  <Trophy className="w-2.5 h-2.5" />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-white/40 font-bold">
                  {t('akademik:tab_achievements', 'Pencapaian')} <span className="text-slate-800 dark:text-white/70 font-black">{stats.meritAkademik}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: '#34D39920', color: '#34D399' }}>
                  <Zap className="w-2.5 h-2.5" />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-white/40 font-bold">
                  {t('akademik:qr_cta_badge', 'QR Aktiviti')} <span className="text-slate-800 dark:text-white/70 font-black">{stats.meritQr}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: '#FB923C20', color: '#FB923C' }}>
                  <Award className="w-2.5 h-2.5" />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-white/40 font-bold">
                  {t('akademik:club_label', 'Kelab')} <span className="text-slate-800 dark:text-white/70 font-black">{stats.meritKelab}</span>
                </span>
              </div>
              {stats.latestHpnm !== null && (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: '#60A5FA20', color: '#60A5FA' }}>
                    <BookOpen className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-white/40 font-bold">
                    HPNM <span className="font-black" style={{ color: '#60A5FA' }}>{stats.latestHpnm.toFixed(2)}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl shrink-0"
            style={{ background: hexToRgba(THEME, 0.2), color: THEME, boxShadow: `0 8px 32px ${hexToRgba(THEME, 0.3)}` }}
          >
            <GraduationCap className="w-8 h-8" />
          </div>
        </div>
      </motion.div>

      {/* ── 4 Stat Cards ── */}
      <div className="tour-akademik-cgpa grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t('akademik:tab_achievements', 'Pencapaian')}   value={stats.totalPencapaian} icon={Trophy}      color={THEME}      delay={0.0}  onClick={() => navigate('/akademik/pencapaian')} />
        <StatCard label={t('akademik:status_approved', 'Disahkan')}     value={stats.disahkan}        icon={CheckCircle}  color="#10B981"    delay={0.06} />
        <StatCard label={t('akademik:status_pending', 'Menunggu')}     value={stats.menunggu}        icon={Clock}        color={stats.menunggu > 0 ? '#F59E0B' : '#94A3B8'} delay={0.12} />
        <StatCard label={t('akademik:latest_cgpa_label', 'HPNM Terkini')} value={stats.latestHpnm !== null ? stats.latestHpnm.toFixed(2) : '—'} icon={BookOpen} color="#60A5FA" delay={0.18} onClick={() => navigate('/akademik/cgpa')} />
      </div>

      {/* ── Alert: ditolak ── */}
      {stats.ditolak > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20"
        >
          <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
              {t('akademik:rejected_achievements_count', '{{count}} pencapaian ditolak', { count: stats.ditolak })}
            </p>
            <p className="text-[11px] text-rose-500 dark:text-rose-300/60 font-medium mt-0.5">
              {t('akademik:rejected_achievements_notice', 'Sila semak nota penolakan dan hantar semula.')}
            </p>
          </div>
          <button
            onClick={() => navigate('/akademik/pencapaian')}
            className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors shrink-0 min-h-[44px] flex items-center"
          >
            {t('akademik:review_arrow', 'Semak →')}
          </button>
        </motion.div>
      )}

      {/* ── Recent + Quick Actions ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Pencapaian Terkini */}
        <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">{t('akademik:recent_achievements_title', 'Pencapaian Terkini')}</h3>
            <button
              onClick={() => navigate('/akademik/pencapaian')}
              className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity min-h-[44px]"
              style={{ color: THEME }}
            >
              {t('akademik:all_arrow', 'Semua')} <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentPencapaian.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Trophy className="w-8 h-8 mx-auto text-slate-300 dark:text-white/10" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20">
                {t('akademik:no_achievements_yet', 'Belum ada pencapaian')}
              </p>
              <button
                onClick={() => navigate('/akademik/pencapaian')}
                className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-white/30 hover:text-slate-800 dark:hover:text-white/60 underline underline-offset-2 transition-all min-h-[44px]"
              >
                {t('akademik:add_now_btn', '+ Tambah Sekarang')}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentPencapaian.map(p => {
                const sc = statusConfig[p.status] || statusConfig.MENUNGGU;
                const StatusIcon = sc.icon;
                const cat = (p as any).akademik_sijil_categories;
                return (
                  <div
                    key={p.id}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition-all"
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: cat ? `${cat.color}20` : `${THEME}20`, color: cat?.color || THEME }}
                    >
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white leading-tight line-clamp-1">{p.nama_pencapaian}</p>
                      <p className="text-[9px] text-slate-500 dark:text-white/40 font-bold mt-0.5">
                        {p.jenis} · {p.peringkat}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        {sc.label}
                      </span>
                      {p.status === 'DISAHKAN' && (
                        <span className="text-[8px] font-black text-slate-500 dark:text-white/40">
                          +{p.merit_override ?? p.merit_auto} {t('akademik:merit_unit', 'merit')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions (Mobile-First >= 44px) */}
        <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.05] p-5 space-y-4 shadow-xs">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">{t('akademik:quick_actions_title', 'Tindakan Pantas')}</h3>
          <div className="space-y-2.5">
            <QuickAction
              label={t('akademik:quick_action_achievements_title', 'Pencapaian & Sijil')}
              desc={t('akademik:quick_action_achievements_desc', 'Rekod anugerah, sijil atau dokumen baru')}
              icon={FileText}
              color={THEME}
              onClick={() => navigate('/akademik/pencapaian')}
            />
            <QuickAction
              label={t('akademik:quick_action_cgpa_title', 'Semakan HPNM & CGPA')}
              desc={t('akademik:quick_action_cgpa_desc', 'Pantau graf prestasi & muat naik slip keputusan')}
              icon={BookOpen}
              color="#60A5FA"
              onClick={() => navigate('/akademik/cgpa')}
            />
            <QuickAction
              label={t('akademik:quick_action_qr_title', 'Scan QR Merit')}
              desc={t('akademik:quick_action_qr_desc', 'Scan kod QR kehadiran untuk merit aktiviti')}
              icon={QrCode}
              color="#34D399"
              onClick={() => navigate('/akademik/qr')}
            />
            <QuickAction
              label={t('akademik:quick_action_calendar_title', 'Takwim & Tarikh Penting')}
              desc={t('akademik:quick_action_calendar_desc', 'Jadual akademik, peperiksaan & tarikh aktiviti')}
              icon={CalendarDays}
              color="#F59E0B"
              onClick={() => navigate('/akademik/takwim')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
