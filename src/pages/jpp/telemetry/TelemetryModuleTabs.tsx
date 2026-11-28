import React, { useState } from 'react';
import {
  GraduationCap,
  Flag,
  Trophy,
  Tent,
  ShoppingBag,
  Bike,
  Briefcase,
  Home,
  CalendarDays,
  TrendingUp,
  Database,
  Zap,
  Building2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TelemetryData } from './telemetryTypes';
import { hexToRgba, cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface TelemetryModuleTabsProps {
  data: TelemetryData;
}

type TabType = 'trend' | 'campus' | 'commercial' | 'database';
type HealthStatus = 'healthy' | 'warning' | 'critical';

function stripLeadingEmoji(label: string): string {
  return label.replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/gu, '').trim();
}

function SubModuleCard({
  name,
  icon: Icon,
  color,
  metrics,
  health,
  statusBar,
}: {
  name: string;
  icon: React.ElementType;
  color: string;
  metrics: { label: string; value: number | string; alert?: boolean }[];
  health?: HealthStatus;
  statusBar?: { items: { label: string; count: number; color: string }[]; total: number };
}) {
  return (
    <div className="rounded-2xl border border-[#B8E4DC]/80 dark:border-[#252B35] bg-[#F6FBF9] dark:bg-[#0E1116] p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: hexToRgba(color, 0.14) }}
            >
              <Icon className="w-4 h-4" style={{ color }} aria-hidden="true" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B2420] dark:text-[#F1F5F9] truncate">
              {name}
            </span>
          </div>
          {health === 'healthy' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-label="Healthy" />
          )}
          {health === 'warning' && (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-label="Warning" />
          )}
          {health === 'critical' && (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-label="Critical" />
          )}
        </div>

        <div className="space-y-2">
          {metrics.map((m, i) => (
            <div key={i} className="flex items-center justify-between text-xs gap-2">
              <span className="text-[#3B635C] dark:text-[#94A0B2] font-medium">{m.label}</span>
              <span
                className={cn(
                  'font-bold font-mono tabular-nums',
                  m.alert
                    ? 'text-rose-700 dark:text-rose-400'
                    : 'text-[#0B2420] dark:text-[#F1F5F9]'
                )}
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {statusBar && statusBar.total > 0 && (
        <div className="mt-3 pt-2.5 border-t border-[#B8E4DC]/60 dark:border-[#252B35]">
          <div className="h-1.5 w-full bg-[#EBF7F4] dark:bg-[#1B2028] rounded-full overflow-hidden flex">
            {statusBar.items.map((item, i) => (
              <div
                key={i}
                style={{
                  width: `${(item.count / statusBar.total) * 100}%`,
                  backgroundColor: item.color,
                }}
                className="h-full"
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {statusBar.items.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs font-medium text-[#3B635C] dark:text-[#94A0B2]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
                <span className="font-mono tabular-nums">
                  {item.label} ({item.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0B2420] dark:bg-[#0E1116] text-[#F1F5F9] border border-[#1E4D45] dark:border-[#252B35] rounded-xl p-3 shadow-surface-lg text-xs">
      <p className="text-[#94A0B2] font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold font-mono tabular-nums text-sm">
          {p.value} <span className="text-xs text-[#94A0B2] font-sans font-normal">{p.name}</span>
        </p>
      ))}
    </div>
  );
}

export const TelemetryModuleTabs: React.FC<TelemetryModuleTabsProps> = ({ data }) => {
  const { t, i18n } = useTranslation(['jpp', 'common']);
  const [activeTab, setActiveTab] = useState<TabType>('trend');
  const { modules: m, diagnostics: d, snapshots } = data;

  const snapshotChartData = (snapshots || []).map((s) => ({
    date: new Date(s.snapshot_date).toLocaleDateString(
      i18n.language.startsWith('en') ? 'en-MY' : 'ms-MY',
      { day: '2-digit', month: 'short' }
    ),
    pelajar: s.m_profiles,
    kelab: s.m_clubs,
    tiket: s.m_kebajikan_tickets,
    pesanan: s.m_polymart_orders,
    trip: s.m_polyrider_jobs,
  }));

  const kebDonut = m
    ? [
        { name: t('jpp:telemetry_status_open', 'Terbuka'), value: m.kebajikan_breakdown?.open ?? 0, color: '#E11D48' },
        { name: t('jpp:telemetry_status_escalated', 'Escalated'), value: m.kebajikan_breakdown?.escalated ?? 0, color: '#D97706' },
        { name: t('jpp:telemetry_status_resolved', 'Selesai'), value: m.kebajikan_breakdown?.resolved ?? 0, color: '#0F766E' },
      ]
    : [];

  const tabDefinitions: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'trend', label: stripLeadingEmoji(t('jpp:telemetry_tab_trend', 'Trend Sejarah')), icon: TrendingUp },
    { id: 'campus', label: stripLeadingEmoji(t('jpp:telemetry_tab_campus', 'Kampus')), icon: Building2 },
    { id: 'commercial', label: stripLeadingEmoji(t('jpp:telemetry_tab_commercial', 'Komersial')), icon: ShoppingBag },
    { id: 'database', label: stripLeadingEmoji(t('jpp:telemetry_tab_database', 'DB Deep-Dive')), icon: Database },
  ];

  return (
    <section className="rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] bg-white dark:bg-[#13171D] p-5 sm:p-6 shadow-surface-sm space-y-5">
      {/* ── Tabs Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#B8E4DC]/60 dark:border-[#252B35]">
        <div>
          <h3 className="text-base font-bold text-[#0B2420] dark:text-[#F1F5F9] tracking-tight">
            {t('jpp:telemetry_tabs_title', 'Metrik Mendalam Subsistem')}
          </h3>
          <p className="text-xs font-medium text-[#3B635C] dark:text-[#94A0B2]">
            {t('jpp:telemetry_tabs_subtitle', 'Data Analisis & Statistik Rekod Modul')}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Tab Metrik Subsistem"
          className="flex items-center gap-1 p-1 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] overflow-x-auto scrollbar-hide"
        >
          {tabDefinitions.map((tab) => {
            const TabIcon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]',
                  isSelected
                    ? 'bg-[#0F766E] text-white dark:bg-[#1B2028] dark:text-[#2DD4BF] shadow-surface-sm'
                    : 'text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]'
                )}
              >
                <TabIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab 1: Trend Sejarah & Kebajikan Donut ── */}
      {activeTab === 'trend' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Growth AreaChart */}
          <div className="lg:col-span-2 rounded-2xl border border-[#B8E4DC]/80 dark:border-[#252B35] p-4 bg-[#F6FBF9] dark:bg-[#0E1116]">
            <div className="mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#2DD4BF] block">
                {t('jpp:telemetry_growth_title', 'Pertumbuhan Rekod 30-Hari')}
              </span>
              <p className="text-xs font-medium text-[#3B635C] dark:text-[#94A0B2] mt-0.5">
                {t('jpp:telemetry_growth_desc', 'Trafik Pelajar & Trip PolyRider daripada Snapshot Automatik')}
              </p>
            </div>
            {snapshotChartData.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snapshotChartData}>
                    <defs>
                      <linearGradient id="gPelajar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0F766E" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gTrip" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 500 }}
                      className="text-[#3B635C] dark:text-[#94A0B2]"
                      dy={8}
                    />
                    <YAxis hide />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="pelajar"
                      name="Pelajar"
                      stroke="#0F766E"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#gPelajar)"
                    />
                    <Area
                      type="monotone"
                      dataKey="trip"
                      name="Trip"
                      stroke="#14B8A6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#gTrip)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-center">
                <TrendingUp className="w-8 h-8 text-[#B8E4DC] dark:text-[#252B35] mb-2" aria-hidden="true" />
                <p className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                  {t('jpp:telemetry_no_snapshot_title', 'Belum ada data snapshot sejarah')}
                </p>
                <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-1 max-w-xs">
                  {t('jpp:telemetry_no_snapshot_desc', 'Snapshot harian dijana setiap 3:00 AM melalui cron pelayan.')}
                </p>
              </div>
            )}
          </div>

          {/* Kebajikan Donut Chart */}
          <div className="rounded-2xl border border-[#B8E4DC]/80 dark:border-[#252B35] p-4 bg-[#F6FBF9] dark:bg-[#0E1116] flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#2DD4BF] block mb-1">
                {t('jpp:telemetry_kebajikan_donut_title', 'Pecahan Tiket Kebajikan')}
              </span>
              <p className="text-xs font-medium text-[#3B635C] dark:text-[#94A0B2]">
                {t('jpp:telemetry_kebajikan_donut_desc', 'Status Terbuka vs Selesai')}
              </p>
            </div>

            <div className="h-44 w-full flex items-center justify-center">
              {kebDonut.every((item) => item.value === 0) ? (
                <p className="text-xs text-[#3B635C] dark:text-[#94A0B2]">
                  {t('jpp:telemetry_no_active_tickets', 'Tiada tiket aktif')}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={kebDonut}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {kebDonut.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2 border-t border-[#B8E4DC]/60 dark:border-[#252B35]">
              {kebDonut.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs font-medium">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} aria-hidden="true" />
                  <span className="text-[#3B635C] dark:text-[#94A0B2] font-mono tabular-nums">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Modul Pentadbiran & Kampus ── */}
      {activeTab === 'campus' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <SubModuleCard
            name="e-Akademik"
            icon={GraduationCap}
            color="#0F766E"
            metrics={[
              { label: t('jpp:telemetry_metric_cgpa_records', 'Rekod CGPA'), value: m.akademik_cgpa || 0 },
              { label: t('jpp:telemetry_metric_student_achievements', 'Pencapaian Siswa'), value: m.akademik_pencapaian || 0 },
              { label: t('jpp:telemetry_metric_cert_files', 'Fail Sijil Repository'), value: m.akademik_files || 0 },
            ]}
          />
          <SubModuleCard
            name={t('jpp:telemetry_module_clubs', 'Kelab & Persatuan')}
            icon={Flag}
            color="#10B981"
            metrics={[
              { label: t('jpp:telemetry_metric_total_clubs', 'Jumlah Kelab'), value: m.clubs || 0 },
              { label: t('jpp:telemetry_metric_activities_conducted', 'Aktiviti Dijalankan'), value: m.club_activities || 0 },
              { label: t('jpp:telemetry_metric_reports_submitted', 'Laporan Dihantar'), value: m.club_reports || 0 },
              { label: t('jpp:telemetry_metric_student_memberships', 'Keahlian Pelajar'), value: m.club_memberships || 0 },
            ]}
          />
          <SubModuleCard
            name={t('jpp:telemetry_module_supsas', 'SUPSAS Sukan')}
            icon={Trophy}
            color="#D97706"
            metrics={[
              { label: t('jpp:telemetry_metric_sports_categories', 'Kategori Sukan'), value: m.supsas_sports || 0 },
              { label: t('jpp:telemetry_metric_matches', 'Perlawanan'), value: m.supsas_fixtures || 0 },
              { label: t('jpp:telemetry_metric_official_results', 'Keputusan Rasmi'), value: m.supsas_results || 0 },
            ]}
          />
          <SubModuleCard
            name={t('jpp:telemetry_module_karnival', 'Karnival POLISAS')}
            icon={Tent}
            color="#0284C7"
            metrics={[
              { label: t('jpp:telemetry_metric_carnival_editions', 'Edisi Karnival'), value: m.karnival_editions || 0 },
              { label: t('jpp:telemetry_metric_booths', 'Booth Usahawan'), value: m.karnival_booths || 0 },
            ]}
          />
          <SubModuleCard
            name={t('jpp:telemetry_module_klk', 'KLK (Kediaman Luar)')}
            icon={Home}
            color="#14B8A6"
            metrics={[
              { label: t('jpp:telemetry_metric_external_students', 'Pelajar Luar Berdaftar'), value: m.klk_residency || 0 },
              { label: t('jpp:telemetry_metric_sync_logs', 'Log Sinkronisasi'), value: m.klk_sync_logs || 0 },
            ]}
          />
          <SubModuleCard
            name={t('jpp:telemetry_module_central_calendar', 'Takwim Pusat')}
            icon={CalendarDays}
            color="#0D9488"
            metrics={[{ label: t('jpp:telemetry_metric_calendar_events', 'Acara Kalendar'), value: m.takwim_events || 0 }]}
          />
        </div>
      )}

      {/* ── Tab 3: Modul Komersial & Logistik ── */}
      {activeTab === 'commercial' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <SubModuleCard
            name="PolyMart"
            icon={ShoppingBag}
            color="#0F766E"
            health={
              (d?.polymart?.pending_stale || 0) > 0 || (d?.polymart?.cancel_rate_pct || 0) > 60
                ? 'critical'
                : (d?.polymart?.cancel_rate_pct || 0) > 35
                ? 'warning'
                : 'healthy'
            }
            metrics={[
              { label: t('jpp:telemetry_metric_total_orders', 'Jumlah Pesanan'), value: m.polymart_orders || 0 },
              {
                label: t('jpp:telemetry_metric_cancellation_rate', 'Kadar Pembatalan'),
                value: `${(d?.polymart?.cancel_rate_pct || 0).toFixed(1)}%`,
              },
              {
                label: 'Pending > 48j',
                value: d?.polymart?.pending_stale || 0,
                alert: (d?.polymart?.pending_stale || 0) > 0,
              },
            ]}
            statusBar={
              d?.polymart?.status_breakdown
                ? {
                    total: Object.values(d.polymart.status_breakdown).reduce(
                      (a: any, b: any) => a + b,
                      0
                    ) as number,
                    items: [
                      {
                        label: 'COMPLETED',
                        count: d.polymart.status_breakdown.COMPLETED || 0,
                        color: '#10B981',
                      },
                      {
                        label: 'PENDING',
                        count: d.polymart.status_breakdown.PENDING || 0,
                        color: '#D97706',
                      },
                      {
                        label: 'CANCELLED',
                        count: d.polymart.status_breakdown.CANCELLED || 0,
                        color: '#E11D48',
                      },
                    ],
                  }
                : undefined
            }
          />

          <SubModuleCard
            name="PolyRider"
            icon={Bike}
            color="#0284C7"
            health={
              (d?.polyrider?.stuck_emergency || 0) > 0 || (d?.polyrider?.cancel_rate_pct || 0) > 60
                ? 'critical'
                : (d?.polyrider?.cancel_rate_pct || 0) > 35
                ? 'warning'
                : 'healthy'
            }
            metrics={[
              { label: t('jpp:telemetry_metric_total_trips', 'Jumlah Trip'), value: m.polyrider_jobs || 0 },
              {
                label: t('jpp:telemetry_metric_cancel_rate', 'Kadar Batal'),
                value: `${(d?.polyrider?.cancel_rate_pct || 0).toFixed(1)}%`,
              },
              {
                label: 'SOS Emergency Stuck',
                value: d?.polyrider?.stuck_emergency || 0,
                alert: (d?.polyrider?.stuck_emergency || 0) > 0,
              },
            ]}
            statusBar={
              d?.polyrider?.status_breakdown
                ? {
                    total: Object.values(d.polyrider.status_breakdown).reduce(
                      (a: any, b: any) => a + b,
                      0
                    ) as number,
                    items: [
                      {
                        label: 'COMPLETED',
                        count: d.polyrider.status_breakdown.COMPLETED || 0,
                        color: '#10B981',
                      },
                      {
                        label: 'EMERGENCY',
                        count: d.polyrider.status_breakdown.EMERGENCY || 0,
                        color: '#E11D48',
                      },
                      {
                        label: 'CANCELLED',
                        count: d.polyrider.status_breakdown.CANCELLED || 0,
                        color: '#64748B',
                      },
                    ],
                  }
                : undefined
            }
          />

          <SubModuleCard
            name="e-Keusahawanan"
            icon={Briefcase}
            color="#D97706"
            metrics={[
              { label: t('jpp:telemetry_metric_business_premises', 'Premis Bisnes'), value: m.businesses || 0 },
              { label: t('jpp:telemetry_metric_product_catalog', 'Katalog Produk'), value: m.business_products || 0 },
              { label: t('jpp:telemetry_metric_pos_transactions', 'Transaksi POS'), value: m.business_transactions || 0 },
            ]}
          />
        </div>
      )}

      {/* ── Tab 4: Diagnostik Database Mendalam ── */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[#B8E4DC]/80 dark:border-[#252B35] p-4 bg-[#F6FBF9] dark:bg-[#0E1116]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] block mb-1">
                {t('jpp:telemetry_cache_hit_rate', 'Cache Hit Rate')}
              </span>
              <p className="text-xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">
                {d?.database?.cache_hit_rate_pct || 99}%
              </p>
              <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-0.5">
                {t('jpp:telemetry_threshold_hit_rate', 'Threshold: > 85%')}
              </p>
            </div>

            <div className="rounded-xl border border-[#B8E4DC]/80 dark:border-[#252B35] p-4 bg-[#F6FBF9] dark:bg-[#0E1116]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] block mb-1">
                {t('jpp:telemetry_dead_tuples', 'Dead Tuples Bloat')}
              </span>
              <p className="text-xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">
                {d?.database?.dead_tuples_pct || 0}%
              </p>
              <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-0.5">
                {t('jpp:telemetry_vacuum_trigger', 'Vacuum trigger: > 20%')}
              </p>
            </div>

            <div className="rounded-xl border border-[#B8E4DC]/80 dark:border-[#252B35] p-4 bg-[#F6FBF9] dark:bg-[#0E1116]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] block mb-1">
                {t('jpp:telemetry_lock_contention', 'Lock Contention')}
              </span>
              <p className="text-xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">
                {d?.database?.waiting_locks || 0}
              </p>
              <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-0.5">
                {t('jpp:telemetry_waiting_locks', 'Locks menunggu')}
              </p>
            </div>

            <div className="rounded-xl border border-[#B8E4DC]/80 dark:border-[#252B35] p-4 bg-[#F6FBF9] dark:bg-[#0E1116]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] block mb-1">
                {t('jpp:telemetry_db_storage_size', 'Saiz Storan DB')}
              </span>
              <p className="text-xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">
                {d?.database?.db_size_mb || 0} MB
              </p>
              <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-0.5">
                {t('jpp:telemetry_total_postgres_size', 'Total PostgreSQL size')}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] bg-[#EBF7F4] dark:bg-[#0E1116] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#0B2420] dark:text-[#F1F5F9]">
                  {t('jpp:telemetry_watchdog_title', 'WAL & Realtime Watchdog')}
                </h4>
                <p className="text-xs text-[#3B635C] dark:text-[#94A0B2]">
                  {t(
                    'jpp:telemetry_watchdog_desc',
                    'Perlindungan had 2GB (2,048 MB) bagi mengelakkan database crash semasa Orientasi.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-5 text-xs font-mono shrink-0">
              <div>
                <span className="text-[#3B635C] dark:text-[#94A0B2] block text-xs font-sans font-medium">
                  {t('jpp:telemetry_replication_slot', 'Replication Slot')}
                </span>
                <span className="font-bold text-[#0F766E] dark:text-[#2DD4BF]">
                  {d?.database?.replication_slot_active
                    ? t('jpp:telemetry_slot_active', 'Aktif')
                    : t('jpp:telemetry_slot_inactive', 'Tidak Aktif')}
                </span>
              </div>
              <div>
                <span className="text-[#3B635C] dark:text-[#94A0B2] block text-xs font-sans font-medium">
                  {t('jpp:telemetry_realtime_tables', 'Jadual Realtime')}
                </span>
                <span className="font-bold tabular-nums text-[#0B2420] dark:text-[#F1F5F9]">
                  {t('jpp:telemetry_tables_count', '{{count}} Jadual', {
                    count: d?.database?.realtime_tables || 0,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
