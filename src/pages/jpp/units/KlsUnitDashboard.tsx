// ============================================================
// KlsUnitDashboard — Dashboard Analitik Hotspot & Residensi Pelajar Luar Kampus
// Unit Code: 'KLS' | Accent Color: #60A5FA
// ============================================================
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Building2, MapPin, Database, ArrowRight,
  AlertTriangle, BarChart3, Car, Shield, Users,
  Compass, ExternalLink, RefreshCw, CheckCircle2,
  PhoneCall, FileText, ChevronRight, PieChart, Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { KamsisKlkStatsWidget } from './KamsisKlkStatsWidget';
import { getKlkAcademicYear } from '@/utils/klkUtils';
import { useTranslation } from 'react-i18next';

const KLS_COLOR = '#60A5FA';

// ── Master Hotspot Reference with Approx Distance ───────────────────────
const HOTSPOT_REFERENCE: Record<string, { label: string; distance: string; zone: string }> = {
  'SEMAMBU': { label: 'Semambu / Politeknik', distance: '1 - 3 km', zone: 'Zon Utama' },
  'INDERA MAHKOTA': { label: 'Indera Mahkota (IM 1 - 15)', distance: '4 - 7 km', zone: 'Zon Bandar' },
  'BESERAH': { label: 'Beserah / Pantai Batu Hitam', distance: '8 - 12 km', zone: 'Zon Pesisir' },
  'ALOR AKAR': { label: 'Alor Akar / Seri Kuantan', distance: '5 - 8 km', zone: 'Zon Tengah' },
  'AIR PUTIH': { label: 'Air Putih / Galing', distance: '6 - 9 km', zone: 'Zon Bandar' },
  'TAMAN TAS': { label: 'Taman Tas / Pandan', distance: '14 - 18 km', zone: 'Zon Barat' },
  'KUBANG BUAYA': { label: 'Kubang Buaya / Teluk Sisek', distance: '9 - 13 km', zone: 'Zon Pantai' },
  'BUKIT SEKILAU': { label: 'Bukit Sekilau / Bukit Ubi', distance: '7 - 10 km', zone: 'Zon Bandar' },
  'SUNGAI ISAP': { label: 'Sungai Isap / Permatang Badak', distance: '11 - 15 km', zone: 'Zon Selatan' },
  'BUKIT RANGIN': { label: 'Bukit Rangin / KotaSAS', distance: '9 - 14 km', zone: 'Zon Utara' },
};

export function KlsUnitDashboard() {
  const { t } = useTranslation(['jpp', 'common']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const academicYear = getKlkAcademicYear();

  const [activeTab, setActiveTab] = useState<'hotspot' | 'kamsis' | 'ekosistem'>('hotspot');
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);

  // Raw data from DB
  const [residencyData, setResidencyData] = useState<any[]>([]);

  // Load live data safely with Promise.all
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [residencyRes] = await Promise.all([
        supabase
          .from('klk_student_residency')
          .select('id, nama_pelajar, no_matrik, tinggal_luar, kawasan_kediaman, kawasan_custom, jabatan')
          .eq('academic_year', academicYear)
          .eq('is_expired', false),
      ]);

      if (residencyRes.error) {
        if (residencyRes.error.code === '42P01') {
          setDbReady(false);
          return;
        }
        throw residencyRes.error;
      }

      setDbReady(true);
      setResidencyData(residencyRes.data || []);
    } catch (err) {
      console.error('Failed to load KLS residency data:', err);
      setDbReady(false);
    } finally {
      setLoading(false);
    }
  }, [user, academicYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregated Analytics
  const analytics = useMemo(() => {
    const luarList = residencyData.filter((r) => r.tinggal_luar);
    const kamsisList = residencyData.filter((r) => !r.tinggal_luar);
    const total = residencyData.length || 1;

    const luarCount = luarList.length;
    const kamsisCount = kamsisList.length;
    const luarPct = Math.round((luarCount / total) * 100);
    const kamsisPct = 100 - luarPct;

    // Aggregate by kawasan
    const kawasanMap: Record<string, number> = {};
    luarList.forEach((r) => {
      const key = (r.kawasan_kediaman || r.kawasan_custom || 'LAIN-LAIN').trim().toUpperCase();
      kawasanMap[key] = (kawasanMap[key] || 0) + 1;
    });

    const sortedKawasan = Object.entries(kawasanMap)
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / (luarCount || 1)) * 100),
        meta: HOTSPOT_REFERENCE[name] || {
          label: name,
          distance: 'Luar Sempadan Utama',
          zone: 'Zon Bebas',
        },
      }))
      .sort((a, b) => b.count - a.count);

    const topKawasan = sortedKawasan[0]?.name || '—';

    return {
      luarCount,
      kamsisCount,
      totalStudents: residencyData.length,
      luarPct,
      kamsisPct,
      topKawasan,
      sortedKawasan,
    };
  }, [residencyData]);

  return (
    <div className="space-y-6">
      {/* DB not ready warning */}
      {!loading && !dbReady && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-amber-800 dark:text-amber-200">
              {t('jpp:kls_db_not_ready_title', 'Pangkalan Data KLK Sedang Disediakan')}
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              {t('jpp:kls_db_not_ready_desc', 'Jadual klk_student_residency belum bersedia sepenuhnya. Sila lawati menu tetapan untuk semakan.')}
            </p>
          </div>
        </div>
      )}

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kad 1: Pelajar Luar Kampus */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {t('jpp:kls_card_outside_students', 'Pelajar Luar Kampus')}
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {loading ? '—' : analytics.luarCount}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            {loading ? '...' : t('jpp:kls_pct_registered', '{{pct}}% daripada jumlah berdaftar', { pct: analytics.luarPct })}
          </p>
        </div>

        {/* Kad 2: Dalam KAMSIS */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {t('jpp:kls_card_in_kamsis', 'Dalam KAMSIS')}
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {loading ? '—' : analytics.kamsisCount}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            {loading ? '...' : t('jpp:kls_pct_hostel_cap', '{{pct}}% kapasiti asrama', { pct: analytics.kamsisPct })}
          </p>
        </div>

        {/* Kad 3: Top Hotspot Kawasan */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {t('jpp:kls_card_top_hotspot', 'Hotspot Utama')}
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight truncate">
            {loading ? '—' : analytics.topKawasan}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium">
            {t('jpp:kls_top_density_desc', 'Kepadatan tertinggi rumah sewa')}
          </p>
        </div>

        {/* Kad 4: Nisbah Residensi */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-xs relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              {t('jpp:kls_card_ratio', 'Nisbah Luar : Kamsis')}
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono tabular-nums text-slate-950 dark:text-white tracking-tight">
            {loading ? '—' : `${analytics.luarPct} : ${analytics.kamsisPct}`}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/40 mt-1 font-medium font-mono tabular-nums">
            {t('jpp:kls_academic_year_note', 'Tahun {{year}}', { year: academicYear })}
          </p>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.06] pb-3 overflow-x-auto scrollbar-none">
        {[
          { key: 'hotspot', label: t('jpp:kls_tab_hotspot', 'Analisis Hotspot Kawasan'), icon: MapPin },
          { key: 'kamsis', label: t('jpp:kls_tab_kamsis', 'KAMSIS & Permohonan'), icon: Building2 },
          { key: 'ekosistem', label: t('jpp:kls_tab_ecosystem', 'Ekosistem Luar Kampus'), icon: Compass },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap active:scale-[0.98]',
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: Analisis Hotspot Kawasan ── */}
      {activeTab === 'hotspot' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {t('jpp:kls_breakdown_title', 'Pecahan Residensi Mengikut Kawasan')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                  {t('jpp:kls_breakdown_desc', 'Analitik taburan lokasi tempat tinggal mahasiswa luar kampus POLISAS.')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono tabular-nums">
                  {t('jpp:kls_recorded_areas', '{{count}} Kawasan Direkodkan', { count: analytics.sortedKawasan.length })}
                </span>
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 hover:bg-slate-200 transition-colors"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs font-mono text-slate-400">
                {t('jpp:kls_processing_data', 'Memproses data taburan hotspot...')}
              </div>
            ) : analytics.sortedKawasan.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] text-center text-xs text-slate-400">
                {t('jpp:kls_no_records', 'Tiada rekod kediaman luar dijumpai untuk tahun akademik {{year}}.', { year: academicYear })}
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.sortedKawasan.map((kawasan, index) => {
                  const maxCount = analytics.sortedKawasan[0]?.count || 1;
                  const barWidthPct = Math.max(6, Math.round((kawasan.count / maxCount) * 100));

                  return (
                    <div
                      key={kawasan.name}
                      className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] hover:border-slate-300 dark:hover:border-white/10 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-200/60 dark:bg-white/[0.06] text-slate-700 dark:text-white/70 font-mono text-xs font-black flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <div>
                            <span className="font-black text-sm text-slate-900 dark:text-white">
                              {kawasan.name}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-white/40 ml-2">
                              ({kawasan.meta.zone} · {kawasan.meta.distance})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono tabular-nums font-black text-blue-600 dark:text-blue-400">
                            {t('jpp:kls_students_count', '{{count}} Pelajar', { count: kawasan.count })}
                          </span>
                          <span className="text-[10px] font-mono tabular-nums font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-white/[0.06] text-slate-700 dark:text-white/60">
                            {kawasan.pct}%
                          </span>
                        </div>
                      </div>

                      {/* Bar Visual Tailwind (Zero Reflow) */}
                      <div className="w-full bg-slate-200/70 dark:bg-white/[0.05] h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500"
                          style={{ width: `${barWidthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: KAMSIS & Permohonan ── */}
      {activeTab === 'kamsis' && (
        <div className="space-y-6">
          <KamsisKlkStatsWidget themeColor={KLS_COLOR} />
        </div>
      )}

      {/* ── TAB 3: Ekosistem Luar Kampus (PolyRent + PolyRider + Bantuan) ── */}
      {activeTab === 'ekosistem' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kad PolyRent */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-xs flex flex-col justify-between group hover:border-emerald-500/30 transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <Home className="w-5 h-5" />
                </div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">
                  {t('jpp:kls_polyrent_title', 'PolyRent — Portal Rumah Sewa')}
                </h4>
                <p className="text-xs text-slate-600 dark:text-white/60 mt-1 leading-relaxed">
                  {t('jpp:kls_polyrent_desc', 'Pangkalan data rumah sewa yang telah diverifikasi untuk mahasiswa POLISAS. Membantu semakan deposit, perjanjian sewa dan keselamatan kawasan kejiranan.')}
                </p>
              </div>
              <button
                onClick={() => navigate('/polyrent')}
                className="mt-4 flex items-center justify-between w-full p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider transition-colors"
              >
                <span>{t('jpp:kls_polyrent_btn', 'Buka PolyRent')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Kad PolyRider */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-xs flex flex-col justify-between group hover:border-purple-500/30 transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center mb-3">
                  <Car className="w-5 h-5" />
                </div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">
                  {t('jpp:kls_polyrider_title', 'PolyRider — Carpool & Mobiliti')}
                </h4>
                <p className="text-xs text-slate-600 dark:text-white/60 mt-1 leading-relaxed">
                  {t('jpp:kls_polyrider_desc', 'Sistem pengangkutan komuter selamat dari zon kediaman Semambu, Indera Mahkota dan Beserah ke kampus utama. Dikawal selia oleh JPP POLISAS.')}
                </p>
              </div>
              <button
                onClick={() => navigate('/polyrider-admin')}
                className="mt-4 flex items-center justify-between w-full p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-black text-xs uppercase tracking-wider transition-colors"
              >
                <span>{t('jpp:kls_polyrider_btn', 'Panel Pengurusan PolyRider')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Talian Bantuan Kecemasan Luar Kampus */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-xs">
            <h4 className="font-black text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              {t('jpp:kls_emergency_helpline_title', 'Talian Bantuan Kecemasan & Keselamatan Kediaman Luar')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
                <p className="font-bold text-slate-900 dark:text-white">
                  {t('jpp:kls_bilik_gerakan', 'Bilik Gerakan JPP')}
                </p>
                <p className="text-slate-500 dark:text-white/40 mt-0.5">
                  {t('jpp:kls_aduan_24h', 'Talian Aduan 24 Jam')}
                </p>
                <p className="font-mono tabular-nums font-black text-blue-600 dark:text-blue-400 mt-1">09-565 5300</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
                <p className="font-bold text-slate-900 dark:text-white">
                  {t('jpp:kls_polis_beserah', 'Balai Polis Beserah')}
                </p>
                <p className="text-slate-500 dark:text-white/40 mt-0.5">
                  {t('jpp:kls_semambu_beserah_zone', 'Kawasan Semambu/Beserah')}
                </p>
                <p className="font-mono tabular-nums font-black text-blue-600 dark:text-blue-400 mt-1">09-544 7222</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04]">
                <p className="font-bold text-slate-900 dark:text-white">
                  {t('jpp:kls_polis_im', 'Balai Polis Indera Mahkota')}
                </p>
                <p className="text-slate-500 dark:text-white/40 mt-0.5">
                  {t('jpp:kls_im_zone', 'Kawasan IM 1 - IM 15')}
                </p>
                <p className="font-mono tabular-nums font-black text-blue-600 dark:text-blue-400 mt-1">09-573 3222</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t('jpp:kls_quick_dashboard', 'Buka Dashboard KLK'), desc: t('jpp:kls_quick_dashboard_desc', 'Peta & senarai penuh pelajar'), icon: MapPin, href: '/klk', color: KLS_COLOR },
          { label: t('jpp:kls_quick_public_stats', 'Statistik Awam'), desc: t('jpp:kls_quick_public_stats_desc', 'QR Code & data semasa'), icon: BarChart3, href: '/klk/statistik', color: '#10B981' },
          { label: t('jpp:kls_quick_settings', 'Tetapan & Import'), desc: t('jpp:kls_quick_settings_desc', 'Webhook, CSV import, kawasan'), icon: Database, href: '/klk/tetapan', color: '#818CF8' },
          { label: t('jpp:kls_quick_polyrider_admin', 'PolyRider Admin'), desc: t('jpp:kls_quick_polyrider_admin_desc', 'Pantau rider & tetapan harga'), icon: Car, href: '/polyrider-admin', color: '#8B5CF6' },
        ].map((link) => (
          <button
            key={link.href}
            onClick={() => navigate(link.href)}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all text-left group shadow-xs active:scale-[0.98]"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${link.color}1a` }}
            >
              <link.icon className="w-4 h-4" style={{ color: link.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {link.label}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{link.desc}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors shrink-0" />
          </button>
        ))}
      </div>

      {/* Tahun akademik note */}
      <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
        {t('jpp:kls_current_academic_year', 'Tahun Akademik Sesi Semasa: {{year}}', { year: academicYear })}
      </p>
    </div>
  );
}
