import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Server,
  Shield,
  Layers,
  Database,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  Activity,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { TelemetryData } from './telemetryTypes';
import { cn } from '@/lib/utils';

interface TelemetryTopologyFlowProps {
  data: TelemetryData;
}

type ViewMode = 'flow' | 'traffic' | 'heatmap';

export const TelemetryTopologyFlow: React.FC<TelemetryTopologyFlowProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { server, modules, diagnostics } = data;
  const db = diagnostics?.database;
  const keb = diagnostics?.kebajikan;
  const pm = diagnostics?.polymart;
  const pr = diagnostics?.polyrider;
  const ai = diagnostics?.ai;

  // Node health checks
  const heapPct = server?.memory?.heap_total_mb
    ? Math.round((server.memory.heap_used_mb / server.memory.heap_total_mb) * 100)
    : 0;

  const nodeStatus = {
    ingress: 'optimal',
    engine: heapPct > 80 ? 'warning' : 'optimal',
    auth: 'optimal',
    services:
      (keb?.sla_breached || 0) > 0 || (pr?.stuck_emergency || 0) > 0
        ? 'critical'
        : (pm?.pending_stale || 0) > 0 || (ai?.usage_pct || 0) > 85
        ? 'warning'
        : 'optimal',
    db:
      (db?.wal_retained_mb || 0) > 1024 ||
      (db?.active_connections || 0) > (db?.max_connections || 100) * 0.85
        ? 'critical'
        : (db?.wal_retained_mb || 0) > 512
        ? 'warning'
        : 'optimal',
    wal: (db?.wal_retained_mb || 0) > 1024 ? 'critical' : (db?.wal_retained_mb || 0) > 512 ? 'warning' : 'optimal',
  };

  const getStatusColor = (st: string) => {
    if (st === 'critical') return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
    if (st === 'warning') return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
  };

  const getStatusDot = (st: string) => {
    if (st === 'critical') return 'bg-rose-500 animate-ping';
    if (st === 'warning') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="rounded-[2rem] border border-slate-200/90 dark:border-white/[0.07] bg-white/95 dark:bg-[#0E1118]/90 p-6 shadow-xs backdrop-blur-md relative overflow-hidden">
      {/* ── Header & View Toggles ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Topologi Aliran Sistem
            </h2>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/35 mt-0.5">
            Arkitektur Rangkaian Langsung & Kesihatan Perkhidmatan
          </p>
        </div>

        {/* SentinelAI-style View Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] self-start sm:self-auto">
          {(
            [
              { id: 'flow', label: 'Aliran Pipeline' },
              { id: 'traffic', label: 'Beban Trafik' },
              { id: 'heatmap', label: 'Peta Kesihatan' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all',
                viewMode === tab.id
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── View 1: Interactive Flow View ── */}
      {viewMode === 'flow' && (
        <div className="py-4">
          <div className="relative">
            {/* SVG Flow Connecting Lines */}
            <div className="hidden lg:block absolute inset-0 pointer-events-none z-0">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 160">
                <defs>
                  <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                <path
                  d="M 60 80 C 180 80, 220 80, 340 80 C 460 80, 500 80, 740 80"
                  fill="none"
                  stroke="url(#flowGrad)"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  className="animate-pulse"
                />
              </svg>
            </div>

            {/* Nodes Container */}
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Node 1: Ingress */}
              <div
                onClick={() => setSelectedNode('ingress')}
                className={cn(
                  'rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between h-36',
                  selectedNode === 'ingress'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                    : 'border-slate-200/80 dark:border-white/[0.07] bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className={cn('w-2 h-2 rounded-full', getStatusDot(nodeStatus.ingress))} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/35 block">
                    Pelajar Ingress
                  </span>
                  <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {(modules.profiles || 0).toLocaleString()}
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-white/30 truncate mt-0.5">
                    Sesi PWA & Web
                  </p>
                </div>
              </div>

              {/* Node 2: Node.js API Engine */}
              <div
                onClick={() => setSelectedNode('engine')}
                className={cn(
                  'rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between h-36',
                  selectedNode === 'engine'
                    ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20'
                    : 'border-slate-200/80 dark:border-white/[0.07] bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                  <span className={cn('w-2 h-2 rounded-full', getStatusDot(nodeStatus.engine))} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/35 block">
                    Node.js Engine
                  </span>
                  <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {server.memory.heap_used_mb} MB
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-white/30 truncate mt-0.5">
                    Heap {heapPct}% • PID {server.pid}
                  </p>
                </div>
              </div>

              {/* Node 3: Auth & RBAC Shield */}
              <div
                onClick={() => setSelectedNode('auth')}
                className={cn(
                  'rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between h-36',
                  selectedNode === 'auth'
                    ? 'border-cyan-500 bg-cyan-500/5 ring-2 ring-cyan-500/20'
                    : 'border-slate-200/80 dark:border-white/[0.07] bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className={cn('w-2 h-2 rounded-full', getStatusDot(nodeStatus.auth))} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/35 block">
                    Auth & RBAC
                  </span>
                  <p className="text-base font-black text-slate-900 dark:text-white">
                    Terkawal
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-white/30 truncate mt-0.5">
                    Supabase Policy Active
                  </p>
                </div>
              </div>

              {/* Node 4: Modul Perkhidmatan */}
              <div
                onClick={() => setSelectedNode('services')}
                className={cn(
                  'rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between h-36',
                  selectedNode === 'services'
                    ? 'border-purple-500 bg-purple-500/5 ring-2 ring-purple-500/20'
                    : 'border-slate-200/80 dark:border-white/[0.07] bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className={cn('w-2 h-2 rounded-full', getStatusDot(nodeStatus.services))} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/35 block">
                    Modul Teras
                  </span>
                  <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {(modules.polymart_orders || 0) + (modules.kebajikan_tickets || 0)} Aktif
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-white/30 truncate mt-0.5">
                    Mart • Rider • Kebajikan
                  </p>
                </div>
              </div>

              {/* Node 5: PostgreSQL & WAL */}
              <div
                onClick={() => setSelectedNode('db')}
                className={cn(
                  'rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between h-36 col-span-2 md:col-span-1',
                  selectedNode === 'db'
                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
                    : 'border-slate-200/80 dark:border-white/[0.07] bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                  <span className={cn('w-2 h-2 rounded-full', getStatusDot(nodeStatus.db))} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/35 block">
                    PostgreSQL Cluster
                  </span>
                  <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {db?.active_connections || 0} / {db?.max_connections || 100}
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-white/30 truncate mt-0.5">
                    WAL: {db?.wal_retained_mb || 0} MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Node Detail Popup / Inspector Drawer */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] text-xs flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span className="text-slate-600 dark:text-white/70">
                    {selectedNode === 'ingress' && 'Ingress: Portal web & sesi PWA pelajar bertindak dengan lancar tanpa throttled requests.'}
                    {selectedNode === 'engine' && `Node.js: Uptime sistem terkini ${server.uptime_seconds}s dengan ${server.cpu.user_us}us CPU user load.`}
                    {selectedNode === 'auth' && 'Supabase Auth: Sesi token disahkan dengan Role Based Access Control (RBAC) Super Admin.'}
                    {selectedNode === 'services' && `Modul: ${modules.polymart_orders || 0} pesanan PolyMart, ${modules.polyrider_jobs || 0} trip Rider, ${modules.kebajikan_tickets || 0} tiket bantuan.`}
                    {selectedNode === 'db' && `Pangkalan Data: Saiz storan ${db?.db_size_mb || 0} MB, Cache Hit ${db?.cache_hit_rate_pct || 99}%, Slot replikasi: ${db?.replication_slot_active ? 'Aktif' : 'Tidak Aktif'}.`}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0 uppercase tracking-wider"
                >
                  Tutup
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── View 2: Traffic Load Comparison ── */}
      {viewMode === 'traffic' && (
        <div className="py-2 space-y-3">
          <p className="text-[11px] text-slate-500 dark:text-white/40 mb-3">
            Perbandingan volum beban operasi merentasi modul-modul aktif POLISAS:
          </p>
          {[
            { label: 'Pesanan PolyMart', count: modules.polymart_orders || 0, max: 200, color: 'bg-pink-500' },
            { label: 'Trip PolyRider', count: modules.polyrider_jobs || 0, max: 200, color: 'bg-cyan-500' },
            { label: 'Tiket e-Kebajikan', count: modules.kebajikan_tickets || 0, max: 100, color: 'bg-rose-500' },
            { label: 'Keahlian Kelab Siswa', count: modules.club_memberships || 0, max: 500, color: 'bg-emerald-500' },
            { label: 'Token AI Assistant', count: modules.ai_tokens_used || 0, max: modules.ai_token_limit || 1000000, color: 'bg-purple-500' },
          ].map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-white/70">{item.label}</span>
                <span className="font-black font-mono text-slate-900 dark:text-white tabular-nums">
                  {item.count.toLocaleString()}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', item.color)}
                  style={{ width: `${Math.min((item.count / item.max) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── View 3: Health Heatmap ── */}
      {viewMode === 'heatmap' && (
        <div className="py-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { name: 'Node.js Engine', status: nodeStatus.engine, detail: `${server.memory.heap_used_mb}MB Heap` },
            { name: 'PostgreSQL Pool', status: nodeStatus.db, detail: `${db?.active_connections || 0}/${db?.max_connections || 100} Conns` },
            { name: 'WAL Watchdog', status: nodeStatus.wal, detail: `${db?.wal_retained_mb || 0}MB / 2GB` },
            { name: 'PolyMart Orders', status: (pm?.pending_stale || 0) > 0 ? 'warning' : 'optimal', detail: `${pm?.pending_stale || 0} Tertunggak` },
            { name: 'PolyRider SOS', status: (pr?.stuck_emergency || 0) > 0 ? 'critical' : 'optimal', detail: `${pr?.stuck_emergency || 0} Kecemasan` },
            { name: 'e-Kebajikan SLA', status: (keb?.sla_breached || 0) > 0 ? 'critical' : 'optimal', detail: `${keb?.sla_breached || 0} Melepasi SLA` },
          ].map((item, idx) => (
            <div
              key={idx}
              className={cn(
                'rounded-xl border p-3 flex items-center justify-between',
                getStatusColor(item.status)
              )}
            >
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white">{item.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-white/40 font-mono mt-0.5">{item.detail}</p>
              </div>
              <span className={cn('w-2 h-2 rounded-full', getStatusDot(item.status))} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
