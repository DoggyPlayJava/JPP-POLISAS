import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Flag,
  Trophy,
  Tent,
  ShoppingBag,
  Bike,
  Briefcase,
  Heart,
  Home,
  CalendarDays,
  Bell,
  Users,
  TrendingUp,
  Database,
  Zap,
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
import { formatUptime } from './telemetryUtils';

interface TelemetryModuleTabsProps {
  data: TelemetryData;
}

type TabType = 'trend' | 'campus' | 'commercial' | 'database';

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
  metrics: { label: string; value: number | string }[];
  health?: '✅' | '🟡' | '🔴';
  statusBar?: { items: { label: string; count: number; color: string }[]; total: number };
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02] p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: hexToRgba(color, 0.15) }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-white/60">
              {name}
            </span>
          </div>
          {health && <span className="text-xs">{health}</span>}
        </div>

        <div className="space-y-1.5">
          {metrics.map((m, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-500 dark:text-white/40 font-bold">{m.label}</span>
              <span
                className={cn(
                  'font-black font-mono tabular-nums',
                  m.value.toString().includes('⚠️') || m.value.toString().includes('🚨')
                    ? 'text-rose-500'
                    : 'text-slate-900 dark:text-white/80'
                )}
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {statusBar && statusBar.total > 0 && (
        <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-white/[0.04]">
          <div className="h-1.5 w-full bg-slate-200/60 dark:bg-white/10 rounded-full overflow-hidden flex">
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
          <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1.5">
            {statusBar.items.map((item, i) => (
              <div key={i} className="flex items-center gap-1 text-[8px] font-bold text-slate-500 dark:text-white/40">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>
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
    <div className="bg-slate-900 text-white dark:bg-[#0a0a0f] border border-white/10 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-white/50 text-[10px] font-bold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-black text-sm">
          {p.value} <span className="text-[10px] text-white/40 font-medium">{p.name}</span>
        </p>
      ))}
    </div>
  );
}

export const TelemetryModuleTabs: React.FC<TelemetryModuleTabsProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<TabType>('trend');
  const { modules: m, diagnostics: d, snapshots } = data;

  const snapshotChartData = (snapshots || []).map((s) => ({
    date: new Date(s.snapshot_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' }),
    pelajar: s.m_profiles,
    kelab: s.m_clubs,
    tiket: s.m_kebajikan_tickets,
    pesanan: s.m_polymart_orders,
    trip: s.m_polyrider_jobs,
  }));

  const kebDonut = m
    ? [
        { name: 'Terbuka', value: m.kebajikan_breakdown?.open ?? 0, color: '#EF4444' },
        { name: 'Escalated', value: m.kebajikan_breakdown?.escalated ?? 0, color: '#F59E0B' },
        { name: 'Selesai', value: m.kebajikan_breakdown?.resolved ?? 0, color: '#10B981' },
      ]
    : [];

  return (
    <div className="rounded-[2rem] border border-slate-200/90 dark:border-white/[0.07] bg-white/95 dark:bg-[#0E1118]/90 p-6 shadow-xs  space-y-5">
      {/* ── Tabs Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
            Metrik Mendalam Subsistem
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/35">
            Data Analisis & Statistik Rekod Modul
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] overflow-x-auto">
          {[
            { id: 'trend', label: '📊 Trend Sejarah' },
            { id: 'campus', label: '🏛️ Kampus' },
            { id: 'commercial', label: '🛒 Komersial' },
            { id: 'database', label: '⚙️ DB Deep-Dive' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-black tracking-wide whitespace-nowrap transition-all',
                activeTab === tab.id
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 1: Trend Sejarah & Kebajikan Donut ── */}
      {activeTab === 'trend' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Growth AreaChart */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] p-4 bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 block">
                Pertumbuhan Rekod 30-Hari
              </span>
              <p className="text-xs font-bold text-slate-600 dark:text-white/70">
                Trafik Pelajar & Trip PolyRider daripada Snapshot Automatik
              </p>
            </div>
            {snapshotChartData.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snapshotChartData}>
                    <defs>
                      <linearGradient id="gPelajar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gTrip" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'currentColor', fontSize: 9, fontWeight: 700 }}
                      className="text-slate-400 dark:text-white/30"
                      dy={8}
                    />
                    <YAxis hide />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="pelajar"
                      name="Pelajar"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url"
                    />
                    <Area
                      type="monotone"
                      dataKey="trip"
                      name="Trip"
                      stroke="#06B6D4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#gTrip)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-center">
                <TrendingUp className="w-8 h-8 text-slate-300 dark:text-white/20 mb-2" />
                <p className="text-xs font-bold text-slate-500 dark:text-white/40">
                  Belum ada data snapshot sejarah
                </p>
                <p className="text-[10px] text-slate-400 dark:text-white/25 mt-1 max-w-xs">
                  Snapshot harian dijana setiap 3:00 AM melalui cron pelayan.
                </p>
              </div>
            )}
          </div>

          {/* Kebajikan Donut Chart */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.06] p-4 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 block mb-1">
                Pecahan Tiket Kebajikan
              </span>
              <p className="text-xs font-bold text-slate-600 dark:text-white/70">
                Status Terbuka vs Selesai
              </p>
            </div>

            <div className="h-44 w-full flex items-center justify-center">
              {kebDonut.every((d) => d.value === 0) ? (
                <p className="text-xs text-slate-400 dark:text-white/30">Tiada tiket aktif</p>
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

            <div className="flex justify-center gap-3 pt-2 border-t border-slate-200/60 dark:border-white/[0.04]">
              {kebDonut.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[10px] font-bold">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-slate-600 dark:text-white/60">
                    {d.name} ({d.value})
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
            color="#8B5CF6"
            metrics={[
              { label: 'Rekod CGPA', value: m.akademik_cgpa || 0 },
              { label: 'Pencapaian Siswa', value: m.akademik_pencapaian || 0 },
              { label: 'Fail Sijil Repository', value: m.akademik_files || 0 },
            ]}
          />
          <SubModuleCard
            name="Kelab & Persatuan"
            icon={Flag}
            color="#10B981"
            metrics={[
              { label: 'Jumlah Kelab', value: m.clubs || 0 },
              { label: 'Aktiviti Dijalankan', value: m.club_activities || 0 },
              { label: 'Laporan Dihantar', value: m.club_reports || 0 },
              { label: 'Keahlian Pelajar', value: m.club_memberships || 0 },
            ]}
          />
          <SubModuleCard
            name="SUPSAS Sukan"
            icon={Trophy}
            color="#EAB308"
            metrics={[
              { label: 'Kategori Sukan', value: m.supsas_sports || 0 },
              { label: 'Perlawanan', value: m.supsas_fixtures || 0 },
              { label: 'Keputusan Rasmi', value: m.supsas_results || 0 },
            ]}
          />
          <SubModuleCard
            name="Karnival POLISAS"
            icon={Tent}
            color="#F472B6"
            metrics={[
              { label: 'Edisi Karnival', value: m.karnival_editions || 0 },
              { label: 'Booth Usahawan', value: m.karnival_booths || 0 },
            ]}
          />
          <SubModuleCard
            name="KLK (Kediaman Luar)"
            icon={Home}
            color="#A78BFA"
            metrics={[
              { label: 'Pelajar Luar Berdaftar', value: m.klk_residency || 0 },
              { label: 'Log Sinkronisasi', value: m.klk_sync_logs || 0 },
            ]}
          />
          <SubModuleCard
            name="Takwim Pusat"
            icon={CalendarDays}
            color="#14B8A6"
            metrics={[{ label: 'Acara Kalendar', value: m.takwim_events || 0 }]}
          />
        </div>
      )}

      {/* ── Tab 3: Modul Komersial & Logistik ── */}
      {activeTab === 'commercial' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <SubModuleCard
            name="PolyMart"
            icon={ShoppingBag}
            color="#EC4899"
            health={
              d?.polymart?.pending_stale > 0 || (d?.polymart?.cancel_rate_pct || 0) > 60
                ? '🔴'
                : (d?.polymart?.cancel_rate_pct || 0) > 35
                ? '🟡'
                : '✅'
            }
            metrics={[
              { label: 'Jumlah Pesanan', value: m.polymart_orders || 0 },
              {
                label: 'Kadar Pembatalan',
                value: `${(d?.polymart?.cancel_rate_pct || 0).toFixed(1)}%`,
              },
              {
                label: 'Pending > 48j',
                value: d?.polymart?.pending_stale > 0 ? `${d.polymart.pending_stale} ⚠️` : 0,
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
                        color: '#F59E0B',
                      },
                      {
                        label: 'CANCELLED',
                        count: d.polymart.status_breakdown.CANCELLED || 0,
                        color: '#EF4444',
                      },
                    ],
                  }
                : undefined
            }
          />

          <SubModuleCard
            name="PolyRider"
            icon={Bike}
            color="#06B6D4"
            health={
              d?.polyrider?.stuck_emergency > 0 || (d?.polyrider?.cancel_rate_pct || 0) > 60
                ? '🔴'
                : (d?.polyrider?.cancel_rate_pct || 0) > 35
                ? '🟡'
                : '✅'
            }
            metrics={[
              { label: 'Jumlah Trip', value: m.polyrider_jobs || 0 },
              {
                label: 'Kadar Batal',
                value: `${(d?.polyrider?.cancel_rate_pct || 0).toFixed(1)}%`,
              },
              {
                label: 'SOS Emergency Stuck',
                value: d?.polyrider?.stuck_emergency > 0 ? `${d.polyrider.stuck_emergency} 🚨` : 0,
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
                        color: '#EF4444',
                      },
                      {
                        label: 'CANCELLED',
                        count: d.polyrider.status_breakdown.CANCELLED || 0,
                        color: '#374151',
                      },
                    ],
                  }
                : undefined
            }
          />

          <SubModuleCard
            name="e-Keusahawanan"
            icon={Briefcase}
            color="#F59E0B"
            metrics={[
              { label: 'Premis Bisnes', value: m.businesses || 0 },
              { label: 'Katalog Produk', value: m.business_products || 0 },
              { label: 'Transaksi POS', value: m.business_transactions || 0 },
            ]}
          />
        </div>
      )}

      {/* ── Tab 4: Diagnostik Database Mendalam ── */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.06] p-3 bg-slate-50/50 dark:bg-white/[0.02]">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-white/30 block mb-1">
                Cache Hit Rate
              </span>
              <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {d?.database?.cache_hit_rate_pct || 99}%
              </p>
              <p className="text-[9px] text-slate-400 dark:text-white/30 mt-0.5">Threshold: &gt; 85%</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.06] p-3 bg-slate-50/50 dark:bg-white/[0.02]">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-white/30 block mb-1">
                Dead Tuples Bloat
              </span>
              <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {d?.database?.dead_tuples_pct || 0}%
              </p>
              <p className="text-[9px] text-slate-400 dark:text-white/30 mt-0.5">Vacuum trigger: &gt; 20%</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.06] p-3 bg-slate-50/50 dark:bg-white/[0.02]">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-white/30 block mb-1">
                Lock Contention
              </span>
              <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {d?.database?.waiting_locks || 0}
              </p>
              <p className="text-[9px] text-slate-400 dark:text-white/30 mt-0.5">Locks menunggu</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.06] p-3 bg-slate-50/50 dark:bg-white/[0.02]">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-white/30 block mb-1">
                Saiz Storan DB
              </span>
              <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {d?.database?.db_size_mb || 0} MB
              </p>
              <p className="text-[9px] text-slate-400 dark:text-white/30 mt-0.5">Total PostgreSQL size</p>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  WAL & Realtime Watchdog
                </h4>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Perlindungan had 2GB (2,048 MB) bagi mengelakkan database crash semasa Orientasi.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 dark:text-white/30 block text-[9px] uppercase">Replication Slot</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {d?.database?.replication_slot_active ? '● Aktif' : '○ Tidak Aktif'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-white/30 block text-[9px] uppercase">Jadual Realtime</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {d?.database?.realtime_tables || 0} Jadual
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
