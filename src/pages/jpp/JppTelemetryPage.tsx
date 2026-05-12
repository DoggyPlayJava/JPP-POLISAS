import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  Activity, Server, Cpu, HardDrive, Clock, RefreshCw, Loader2,
  Users, Flag, Heart, ShoppingBag, Bike, Briefcase, Trophy, Tent,
  Home, CalendarDays, Bell, BrainCircuit, FileText, GraduationCap,
  Award, FolderOpen, MessageCircle, Star, AlertTriangle, ShieldCheck,
  Database, CheckCircle2, XCircle, TrendingUp, Zap,
} from 'lucide-react';
import { hexToRgba, cn, API_BASE_URL } from '@/lib/utils';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { supabase } from '@/lib/supabase';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TelemetryData {
  server: {
    uptime_seconds: number;
    memory: { rss_mb: number; heap_used_mb: number; heap_total_mb: number; external_mb: number };
    cpu: { user_us: number; system_us: number };
    node_version: string; platform: string; pid: number;
  };
  modules: Record<string, any>;
  diagnostics?: {
    polyrider: any; polymart: any; kebajikan: any;
    ai: any; push: any; accounts: any; database: any;
  };
  snapshots: any[];
  timestamp: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}h ${h}j ${m}m`;
  return `${h}j ${m}m ${Math.floor(s % 60)}s`;
}

// ── Bento Card ────────────────────────────────────────────────────────────────
function BentoCard({ label, value, sub, icon: Icon, color, delay = 0 }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] p-5 hover:bg-white/[0.05] transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: hexToRgba(color, 0.15) }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-black text-white leading-none">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/35 mt-1.5">{label}</p>
      {sub && <p className="text-[10px] text-white/20 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// ── Module Card ───────────────────────────────────────────────────────────────
function ModuleCard({ name, icon: Icon, color, metrics, health, statusBar, delay = 0 }: {
  name: string; icon: React.ElementType; color: string;
  metrics: { label: string; value: number | string }[];
  health?: '✅' | '🟡' | '🔴';
  statusBar?: { items: { label: string; count: number; color: string }[], total: number };
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 hover:bg-white/[0.05] transition-all flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: hexToRgba(color, 0.15) }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{name}</span>
        </div>
        {health && <span className="text-sm" title="Health Score">{health}</span>}
      </div>

      <div className="space-y-1.5 flex-1">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-[10px] text-white/30 font-bold">{m.label}</span>
            <span className={cn("text-xs font-black tabular-nums", 
              // Hilight critical values if they contain warnings
              m.value.toString().includes('⚠️') ? 'text-red-400' : 'text-white/80'
            )}>{m.value}</span>
          </div>
        ))}
      </div>

      {statusBar && statusBar.total > 0 && (
        <div className="mt-4">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
            {statusBar.items.map((item, i) => (
              <div key={i} style={{ width: `${(item.count / statusBar.total) * 100}%`, backgroundColor: item.color }} className="h-full" />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
            {statusBar.items.map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[8px] font-bold text-white/30">{item.label} ({item.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-3 shadow-xl">
      <p className="text-white/50 text-[10px] font-bold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-white font-black text-sm">
          {p.value} <span className="text-[10px] text-white/40 font-medium">{p.name}</span>
        </p>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════
export function JppTelemetryPage() {
  const { isSuperAdmin } = useAuth();
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch theme
  useEffect(() => {
    supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
      .then(({ data: d }) => { if (d?.color) setThemeColor(d.color); });
  }, []);

  // Fetch telemetry
  const fetchTelemetry = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sesi tamat tempoh.');
      const API_URL = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_URL}/api/system-telemetry`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message || 'Gagal memuatkan data telemetri.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTelemetry(); }, []);

  // Guard
  if (!isSuperAdmin) return <Navigate to="/jpp" replace />;

  const m = data?.modules;
  const d = data?.diagnostics;
  const srv = data?.server;
  const heapPct = srv ? Math.round((srv.memory.heap_used_mb / srv.memory.heap_total_mb) * 100) : 0;
  
  // Collect all alerts
  const allAlerts = d ? [
    ...(d.polyrider?.alerts || []),
    ...(d.polymart?.alerts || []),
    ...(d.kebajikan?.alerts || []),
    ...(d.ai?.alerts || []),
    ...(d.database?.alerts || []),
  ] : [];

  // ── Snapshot trend data ──
  const snapshotChartData = (data?.snapshots || []).map(s => ({
    date: new Date(s.snapshot_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' }),
    pelajar: s.m_profiles,
    kelab: s.m_clubs,
    tiket: s.m_kebajikan_tickets,
    pesanan: s.m_polymart_orders,
    trip: s.m_polyrider_jobs,
  }));

  // Kebajikan donut
  const kebDonut = m ? [
    { name: 'Terbuka', value: m.kebajikan_breakdown?.open ?? 0, color: '#EF4444' },
    { name: 'Escalated', value: m.kebajikan_breakdown?.escalated ?? 0, color: '#F59E0B' },
    { name: 'Selesai', value: m.kebajikan_breakdown?.resolved ?? 0, color: '#10B981' },
  ] : [];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-[10%] left-[20%] w-[35vw] h-[35vw] rounded-full blur-3xl opacity-[0.04]"
          style={{ background: themeColor }} />
        <div className="absolute bottom-[10%] right-[5%] w-[25vw] h-[25vw] rounded-full blur-3xl opacity-[0.03]"
          style={{ background: '#10B981' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 space-y-8">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ background: hexToRgba(themeColor, 0.1), borderColor: hexToRgba(themeColor, 0.2) }}>
              <Activity className="w-6 h-6" style={{ color: themeColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">Telemetri Sistem</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">Pusat Kawalan Infrastruktur JPP-POLISAS</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-[10px] text-white/25 font-bold">
                Dikemas kini: {lastRefresh.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={fetchTelemetry}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              Muat Semula
            </button>
          </div>
        </motion.div>

        {/* ── Error ── */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300 font-medium">{error}</p>
          </motion.div>
        )}

        {/* ── Loading ── */}
        {loading && !data && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-white/20" />
          </div>
        )}

        {data && m && srv && (
          <>
            {/* ═══ SECTION: Alert Banner ═══ */}
            {allAlerts.length > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-red-500/10 border border-red-500/20 rounded-[1.75rem] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-red-400">{allAlerts.length} Amaran Kritikal Dikesan</h2>
                </div>
                <ul className="space-y-2">
                  {allAlerts.map((alert, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-200">
                      <span className="text-red-500/50 mt-0.5">•</span>
                      {alert}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* ═══ SECTION A: Teras Infrastruktur (Resilience) ═══ */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-3 px-1">Teras Infrastruktur (Resilience)</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Node.js Server */}
                <div className="rounded-[2rem] border border-[#60A5FA]/20 bg-[#60A5FA]/5 p-6 flex flex-col relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#60A5FA]/10 blur-3xl rounded-full" />
                  <div className="flex items-center justify-between mb-6 z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#60A5FA]/20 flex items-center justify-center">
                        <Server className="w-5 h-5 text-[#60A5FA]" />
                      </div>
                      <div>
                        <h3 className="text-white font-black text-lg leading-tight">Node.js Engine</h3>
                        <p className="text-[10px] text-[#60A5FA]/60 font-black uppercase tracking-widest">Frontend API Server</p>
                      </div>
                    </div>
                    <div className={cn("px-3 py-1 rounded-full text-[10px] font-black tracking-widest", heapPct > 80 ? "bg-red-500/20 text-red-400" : "bg-[#10B981]/20 text-[#10B981]")}>
                      {heapPct > 80 ? 'HEAP TINGGI' : 'OPTIMAL'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 z-10 mb-6">
                    <div>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Memori Heap</p>
                      <p className="text-2xl font-black text-white">{srv.memory.heap_used_mb} <span className="text-sm text-white/40 font-medium">/ {srv.memory.heap_total_mb} MB</span></p>
                      {/* Progress bar */}
                      <div className="h-1.5 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div className={cn("h-full rounded-full", heapPct > 80 ? "bg-red-500" : "bg-[#60A5FA]")} style={{ width: `${heapPct}%` }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Uptime</p>
                      <p className="text-2xl font-black text-white">{formatUptime(srv.uptime_seconds)}</p>
                      <p className="text-[10px] text-white/30 mt-1">v{srv.node_version} • PID {srv.pid}</p>
                    </div>
                  </div>
                </div>

                {/* PostgreSQL Database */}
                <div className="rounded-[2rem] border border-[#10B981]/20 bg-[#10B981]/5 p-6 flex flex-col relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#10B981]/10 blur-3xl rounded-full" />
                  <div className="flex items-center justify-between mb-6 z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#10B981]/20 flex items-center justify-center">
                        <Database className="w-5 h-5 text-[#10B981]" />
                      </div>
                      <div>
                        <h3 className="text-white font-black text-lg leading-tight">PostgreSQL Cluster</h3>
                        <p className="text-[10px] text-[#10B981]/60 font-black uppercase tracking-widest">Database Resilience</p>
                      </div>
                    </div>
                    <div className={cn("px-3 py-1 rounded-full text-[10px] font-black tracking-widest", 
                      (d?.database?.active_connections > (d?.database?.max_connections || 100) * 0.8 || d?.database?.txid_age > 1000000000) ? "bg-red-500/20 text-red-400" : "bg-[#10B981]/20 text-[#10B981]"
                    )}>
                      {(d?.database?.active_connections > (d?.database?.max_connections || 100) * 0.8 || d?.database?.txid_age > 1000000000) ? 'AMARAN' : 'STABIL'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10 mb-4">
                    <div className="col-span-2">
                      <div className="flex justify-between items-end mb-1">
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Sambungan Aktif</p>
                        <span className="text-[10px] text-[#10B981] font-bold">{Math.round((d?.database?.active_connections / (d?.database?.max_connections || 100)) * 100)}%</span>
                      </div>
                      <p className="text-2xl font-black text-white">{d?.database?.active_connections || 0} <span className="text-sm text-white/40 font-medium">/ {d?.database?.max_connections || 100}</span></p>
                      <div className="h-1.5 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div className={cn("h-full rounded-full", d?.database?.active_connections > (d?.database?.max_connections || 100) * 0.8 ? "bg-red-500" : "bg-[#10B981]")} 
                             style={{ width: `${Math.min((d?.database?.active_connections / (d?.database?.max_connections || 100)) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex justify-between items-end mb-1">
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Umur XID</p>
                        <span className="text-[10px] text-amber-500 font-bold">Max 2B</span>
                      </div>
                      <p className="text-2xl font-black text-white">{((d?.database?.txid_age || 0) / 1000000).toFixed(1)}M</p>
                      <div className="h-1.5 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div className={cn("h-full rounded-full", d?.database?.txid_age > 1500000000 ? "bg-red-500" : "bg-amber-500")} 
                             style={{ width: `${Math.min(((d?.database?.txid_age || 0) / 2000000000) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 z-10 border-t border-white/5 pt-4 mt-2">
                     <div>
                       <p className="text-[9px] text-white/30 uppercase tracking-widest">Cache Hit</p>
                       <p className={cn("text-sm font-black", d?.database?.cache_hit_rate_pct < 85 ? "text-red-400" : "text-white")}>{d?.database?.cache_hit_rate_pct || 0}%</p>
                     </div>
                     <div>
                       <p className="text-[9px] text-white/30 uppercase tracking-widest">Dead Tup</p>
                       <p className={cn("text-sm font-black", d?.database?.dead_tuples_pct > 20 ? "text-red-400" : "text-white")}>{d?.database?.dead_tuples_pct || 0}%</p>
                     </div>
                     <div>
                       <p className="text-[9px] text-white/30 uppercase tracking-widest">Locks</p>
                       <p className={cn("text-sm font-black", d?.database?.waiting_locks > 5 ? "text-red-400" : "text-white")}>{d?.database?.waiting_locks || 0}</p>
                     </div>
                     <div>
                       <p className="text-[9px] text-white/30 uppercase tracking-widest">Saiz</p>
                       <p className="text-sm font-black text-white">{d?.database?.db_size_mb || 0} <span className="text-[10px] text-white/40">MB</span></p>
                     </div>
                  </div>
                </div>

              </div>

              {/* WAL & Realtime Monitoring — crash prevention panel */}
              {d?.database && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "rounded-[2rem] border p-6 relative overflow-hidden",
                    d.database.wal_retained_mb > 1024
                      ? "border-red-500/30 bg-red-500/5"
                      : d.database.wal_retained_mb > 512
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-[#A78BFA]/20 bg-[#A78BFA]/5"
                  )}
                >
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#A78BFA]/10 blur-3xl rounded-full" />
                  <div className="flex items-center justify-between mb-6 z-10 relative">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#A78BFA]/20 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-[#A78BFA]" />
                      </div>
                      <div>
                        <h3 className="text-white font-black text-lg leading-tight">WAL & Realtime Monitor</h3>
                        <p className="text-[10px] text-[#A78BFA]/60 font-black uppercase tracking-widest">Pencegahan Crash Automatik</p>
                      </div>
                    </div>
                    <div className={cn("px-3 py-1 rounded-full text-[10px] font-black tracking-widest",
                      d.database.wal_retained_mb > 1024 ? "bg-red-500/20 text-red-400" :
                      d.database.wal_retained_mb > 512 ? "bg-amber-500/20 text-amber-400" :
                      "bg-[#10B981]/20 text-[#10B981]"
                    )}>
                      {d.database.wal_retained_mb > 1024 ? '🚨 KRITIKAL' : d.database.wal_retained_mb > 512 ? '⚠️ AMARAN' : '✅ SELAMAT'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10 relative mb-4">
                    {/* WAL Retained */}
                    <div className="col-span-2">
                      <div className="flex justify-between items-end mb-1">
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">WAL Retained</p>
                        <span className={cn("text-[10px] font-bold",
                          d.database.wal_retained_mb > 1024 ? "text-red-400" :
                          d.database.wal_retained_mb > 512 ? "text-amber-400" :
                          "text-[#A78BFA]"
                        )}>{d.database.wal_retained_mb > 1024 ? '🚨 BAHAYA' : d.database.wal_retained_mb > 512 ? '⚠️ TINGGI' : 'Normal'}</span>
                      </div>
                      <p className="text-2xl font-black text-white">
                        {d.database.wal_retained_mb || 0} <span className="text-sm text-white/40 font-medium">/ 2,048 MB</span>
                      </p>
                      <div className="h-1.5 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all",
                          d.database.wal_retained_mb > 1024 ? "bg-red-500" :
                          d.database.wal_retained_mb > 512 ? "bg-amber-500" :
                          "bg-[#A78BFA]"
                        )} style={{ width: `${Math.min((d.database.wal_retained_mb / 2048) * 100, 100)}%` }} />
                      </div>
                      <p className="text-[9px] text-white/20 mt-1">Had sistem: 2GB. Slot di-invalidate jika melebihi had.</p>
                    </div>

                    {/* Realtime Tables */}
                    <div>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Jadual Realtime</p>
                      <p className={cn("text-2xl font-black", d.database.realtime_tables > 10 ? "text-amber-400" : "text-white")}>
                        {d.database.realtime_tables || 0}
                      </p>
                      <p className="text-[9px] text-white/20 mt-1">Optimal: ≤ 10 jadual</p>
                    </div>

                    {/* DB Uptime */}
                    <div>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">DB Uptime</p>
                      <p className="text-2xl font-black text-white">{formatUptime(d.database.db_uptime_seconds || 0)}</p>
                      <p className="text-[9px] text-white/20 mt-1">Sejak restart terakhir</p>
                    </div>
                  </div>

                  {/* Bottom stats row */}
                  <div className="grid grid-cols-3 gap-2 z-10 relative border-t border-white/5 pt-4 mt-2">
                    <div>
                      <p className="text-[9px] text-white/30 uppercase tracking-widest">list_changes Calls</p>
                      <p className="text-sm font-black text-white">{(d.database.realtime_list_changes_calls || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/30 uppercase tracking-widest">CPU Time (list_changes)</p>
                      <p className="text-sm font-black text-white">{((d.database.realtime_list_changes_total_ms || 0) / 1000).toFixed(1)}s</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/30 uppercase tracking-widest">Replication Slot</p>
                      <p className={cn("text-sm font-black", d.database.replication_slot_active ? "text-[#10B981]" : "text-red-400")}>
                        {d.database.replication_slot_active ? '● Aktif' : '○ Tidak Aktif'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* ═══ SECTION B: Module Metrics ═══ */}

            {/* Cluster: Akademik & Kelab */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-3 px-1">📚 Akademik & Kelab</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ModuleCard name="e-Akademik" icon={GraduationCap} color="#8B5CF6" delay={0.05} metrics={[
                  { label: 'Rekod CGPA', value: m.akademik_cgpa },
                  { label: 'Sijil/Pencapaian', value: m.akademik_pencapaian },
                  { label: 'Fail Repository', value: m.akademik_files },
                ]} />
                <ModuleCard name="Kelab/Persatuan" icon={Flag} color="#4ADE80" delay={0.1} metrics={[
                  { label: 'Jumlah Kelab', value: m.clubs },
                  { label: 'Aktiviti', value: m.club_activities },
                  { label: 'Laporan', value: m.club_reports },
                  { label: 'Keahlian', value: m.club_memberships },
                ]} />
                <ModuleCard name="SUPSAS" icon={Trophy} color="#EAB308" delay={0.15} metrics={[
                  { label: 'Sukan', value: m.supsas_sports },
                  { label: 'Perlawanan', value: m.supsas_fixtures },
                  { label: 'Keputusan', value: m.supsas_results },
                ]} />
                <ModuleCard name="Karnival" icon={Tent} color="#F472B6" delay={0.2} metrics={[
                  { label: 'Edisi', value: m.karnival_editions },
                  { label: 'Booth', value: m.karnival_booths },
                ]} />
              </div>
            </div>

            {/* Cluster: Komersial */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-3 px-1">🛒 Komersial</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <ModuleCard 
                  name="PolyMart" icon={ShoppingBag} color="#EC4899" delay={0.05} 
                  health={d?.polymart?.pending_stale > 0 || d?.polymart?.cancel_rate_pct > 60 ? '🔴' : d?.polymart?.cancel_rate_pct > 35 ? '🟡' : '✅'}
                  metrics={[
                    { label: 'Pesanan', value: m.polymart_orders },
                    { label: 'Kadar Batal', value: d?.polymart?.cancel_rate_pct > 60 ? `${d.polymart.cancel_rate_pct.toFixed(1)}% ⚠️` : `${d?.polymart?.cancel_rate_pct?.toFixed(1) || 0}%` },
                    { label: 'Pending > 48j', value: d?.polymart?.pending_stale > 0 ? `${d.polymart.pending_stale} ⚠️` : 0 },
                  ]} 
                  statusBar={d?.polymart?.status_breakdown ? {
                    total: Object.values(d.polymart.status_breakdown).reduce((a:any,b:any) => a+b, 0) as number,
                    items: [
                      { label: 'COMPLETED', count: d.polymart.status_breakdown.COMPLETED || 0, color: '#10B981' },
                      { label: 'PENDING', count: d.polymart.status_breakdown.PENDING || 0, color: '#F59E0B' },
                      { label: 'CANCELLED', count: d.polymart.status_breakdown.CANCELLED || 0, color: '#EF4444' },
                    ]
                  } : undefined}
                />
                <ModuleCard 
                  name="PolyRider" icon={Bike} color="#06B6D4" delay={0.1} 
                  health={d?.polyrider?.stuck_emergency > 0 || d?.polyrider?.cancel_rate_pct > 60 ? '🔴' : d?.polyrider?.cancel_rate_pct > 35 ? '🟡' : '✅'}
                  metrics={[
                    { label: 'Trip', value: m.polyrider_jobs },
                    { label: 'Kadar Batal', value: d?.polyrider?.cancel_rate_pct > 60 ? `${d.polyrider.cancel_rate_pct.toFixed(1)}% ⚠️` : `${d?.polyrider?.cancel_rate_pct?.toFixed(1) || 0}%` },
                    { label: 'Stuck Emergency', value: d?.polyrider?.stuck_emergency > 0 ? `${d.polyrider.stuck_emergency} ⚠️` : 0 },
                  ]}
                  statusBar={d?.polyrider?.status_breakdown ? {
                    total: Object.values(d.polyrider.status_breakdown).reduce((a:any,b:any) => a+b, 0) as number,
                    items: [
                      { label: 'COMPLETED', count: d.polyrider.status_breakdown.COMPLETED || 0, color: '#10B981' },
                      { label: 'EMERGENCY', count: d.polyrider.status_breakdown.EMERGENCY || 0, color: '#EF4444' },
                      { label: 'CANCELLED', count: d.polyrider.status_breakdown.CANCELLED || 0, color: '#374151' },
                    ]
                  } : undefined}
                />
                <ModuleCard name="e-Keusahawanan" icon={Briefcase} color="#F59E0B" delay={0.15} metrics={[
                  { label: 'Bisnes', value: m.businesses },
                  { label: 'Produk', value: m.business_products },
                  { label: 'Transaksi POS', value: m.business_transactions },
                ]} />
              </div>
            </div>

            {/* Cluster: Pentadbiran */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-3 px-1">🏛️ Pentadbiran</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <ModuleCard 
                  name="e-Kebajikan" icon={Heart} color="#EF4444" delay={0.05} 
                  health={d?.kebajikan?.sla_breached > 0 || d?.kebajikan?.unassigned > 3 ? '🔴' : d?.kebajikan?.high_priority_open > 0 ? '🟡' : '✅'}
                  metrics={[
                    { label: 'Tiket', value: m.kebajikan_tickets },
                    { label: 'SLA Breached', value: d?.kebajikan?.sla_breached > 0 ? `${d.kebajikan.sla_breached} ⚠️` : 0 },
                    { label: 'Unassigned', value: d?.kebajikan?.unassigned > 3 ? `${d.kebajikan.unassigned} ⚠️` : (d?.kebajikan?.unassigned || 0) },
                    { label: 'High Priority', value: d?.kebajikan?.high_priority_open || 0 },
                  ]} 
                  statusBar={d?.kebajikan?.status_breakdown ? {
                    total: Object.values(d.kebajikan.status_breakdown).reduce((a:any,b:any) => a+b, 0) as number,
                    items: [
                      { label: 'RESOLVED/CLOSED', count: (d.kebajikan.status_breakdown.RESOLVED || 0) + (d.kebajikan.status_breakdown.CLOSED || 0), color: '#10B981' },
                      { label: 'ESCALATED', count: d.kebajikan.status_breakdown.ESCALATED || 0, color: '#F59E0B' },
                      { label: 'OPEN', count: Object.keys(d.kebajikan.status_breakdown).filter(k => !['RESOLVED','CLOSED','ESCALATED','CANCELLED'].includes(k)).reduce((a,k) => a + d.kebajikan.status_breakdown[k], 0), color: '#3B82F6' },
                    ]
                  } : undefined}
                />
                <ModuleCard name="KLK (Kediaman)" icon={Home} color="#A78BFA" delay={0.1} metrics={[
                  { label: 'Pelajar Luar', value: m.klk_residency },
                  { label: 'Sync Logs', value: m.klk_sync_logs },
                ]} />
                <ModuleCard name="Takwim Pusat" icon={CalendarDays} color="#14B8A6" delay={0.15} metrics={[
                  { label: 'Acara', value: m.takwim_events },
                ]} />
              </div>
            </div>

            {/* Cluster: Infrastruktur */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-3 px-1">⚙️ Infrastruktur</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ModuleCard name="Push Notifikasi" icon={Bell} color="#60A5FA" delay={0.05} metrics={[
                  { label: 'Langganan Aktif', value: m.push_subscriptions },
                  { label: 'Notifikasi Terhantar', value: m.notifications },
                ]} />
                <ModuleCard 
                  name="AI Assistant" icon={BrainCircuit} color="#F472B6" delay={0.1} 
                  health={d?.ai?.usage_pct > 90 ? '🔴' : d?.ai?.usage_pct > 70 ? '🟡' : '✅'}
                  metrics={[
                    { label: 'Usage', value: d?.ai?.usage_pct > 90 ? `${d.ai.usage_pct.toFixed(1)}% ⚠️` : `${d?.ai?.usage_pct?.toFixed(1) || 0}%` },
                    { label: 'Tokens', value: m.ai_tokens_used?.toLocaleString() ?? 0 },
                    { label: 'Limit', value: m.ai_token_limit?.toLocaleString() ?? '-' },
                  ]} 
                />
                <ModuleCard name="Profil Pelajar" icon={Users} color="#10B981" delay={0.15} metrics={[
                  { label: 'Jumlah Berdaftar', value: m.profiles },
                  { label: 'Pending/Rejected', value: (d?.accounts?.pending || 0) + (d?.accounts?.rejected || 0) },
                ]} />
              </div>
            </div>

            {/* ═══ SECTION C: Charts ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trend Chart */}
              {snapshotChartData.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="lg:col-span-2 rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] p-6">
                  <div className="mb-6">
                    <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white/40 mb-1">Trend Pertumbuhan Sistem</h2>
                    <p className="text-[10px] text-white/25">Data harian dari snapshot telemetri (30 hari)</p>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={snapshotChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradPelajar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradTrip" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 700 }} dy={8} minTickGap={30} />
                        <YAxis hide />
                        <RechartsTooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="pelajar" name="Pelajar" stroke="#60A5FA" strokeWidth={2} fillOpacity={1} fill="url(#gradPelajar)" />
                        <Area type="monotone" dataKey="trip" name="Trip" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#gradTrip)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              {/* Kebajikan Donut */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                className="rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] p-6 flex flex-col">
                <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white/40 mb-2">Status Tiket Kebajikan</h2>
                <div className="flex-1 min-h-[200px] w-full flex items-center justify-center">
                  {kebDonut.every(d => d.value === 0) ? (
                    <div className="text-center">
                      <Heart className="w-8 h-8 text-white/10 mx-auto mb-2" />
                      <p className="text-xs text-white/30">Tiada tiket</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={kebDonut} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                          {kebDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: '#0a0a0f', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontWeight: 800 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {kebDonut.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-[10px] text-white/40 font-bold">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* No snapshot data — show hint */}
              {snapshotChartData.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="lg:col-span-2 rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] p-6 flex flex-col items-center justify-center text-center py-16">
                  <TrendingUp className="w-10 h-10 text-white/10 mb-3" />
                  <p className="text-sm font-bold text-white/30">Belum ada data sejarah</p>
                  <p className="text-[11px] text-white/20 mt-1 max-w-xs">Snapshot pertama akan diambil secara automatik pada pukul 3:00 pagi esok. Graf trend akan muncul selepas data terkumpul.</p>
                </motion.div>
              )}
            </div>

            {/* ═══ SECTION D: Timestamp Footer ═══ */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex items-center justify-between px-2 pt-4 border-t border-white/[0.04]">
              <div className="flex items-center gap-2 text-white/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">SUPER_ADMIN_JPP · Akses Terhad</span>
              </div>
              <span className="text-[10px] text-white/15 font-mono">
                {data.timestamp ? new Date(data.timestamp).toLocaleString('ms-MY') : '—'}
              </span>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
