import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Shield,
  User,
  Cloud,
  LayoutGrid,
  Lock,
  Database,
  Layers,
  ChevronDown,
  Info,
  X,
  Server,
  Zap,
} from 'lucide-react';
import { TelemetryData } from './telemetryTypes';
import { cn } from '@/lib/utils';
import { formatUptime } from './telemetryUtils';

interface TelemetryTopologyFlowProps {
  data: TelemetryData;
}

export const TelemetryTopologyFlow: React.FC<TelemetryTopologyFlowProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'flow' | 'traffic' | 'heatmap'>('flow');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const { server, modules, diagnostics } = data;
  const db = diagnostics?.database;
  const keb = diagnostics?.kebajikan;
  const pm = diagnostics?.polymart;
  const pr = diagnostics?.polyrider;
  const ai = diagnostics?.ai;

  const heapPct = server?.memory?.heap_total_mb
    ? Math.round((server.memory.heap_used_mb / server.memory.heap_total_mb) * 100)
    : 0;

  // Node health evaluations
  const nodeStatus = {
    internet: 'healthy',
    firewall: heapPct > 80 ? 'warning' : 'healthy',
    identity: 'healthy',
    cloud: (pm?.pending_stale || 0) > 0 ? 'warning' : 'healthy',
    applications:
      (keb?.sla_breached || 0) > 0 || (pr?.stuck_emergency || 0) > 0 ? 'critical' : 'healthy',
    db: (db?.wal_retained_mb || 0) > 1024 ? 'critical' : (db?.wal_retained_mb || 0) > 512 ? 'warning' : 'healthy',
  };

  const nodeDetails: Record<string, { title: string; subtitle: string; stats: { label: string; val: string }[] }> = {
    internet: {
      title: '🌐 Internet & Ingress Trafik',
      subtitle: 'Sesi web portal dan aplikasi PWA siswa yang aktif mengakses sistem.',
      stats: [
        { label: 'Jumlah Siswa Berdaftar', val: `${(modules.profiles || 0).toLocaleString()} pengguna` },
        { label: 'Push Subscriptions', val: `${modules.push_subscriptions || 0} aktif` },
        { label: 'Notifikasi Terhantar', val: `${(modules.notifications || 0).toLocaleString()} rekod` },
      ],
    },
    firewall: {
      title: '⚡ Firewall & Node.js API Gateway',
      subtitle: 'Pelayan Express API yang memproses semua panggilan backend dan penghalaan.',
      stats: [
        { label: 'Uptime Proses API', val: formatUptime(server.uptime_seconds) },
        { label: 'Penggunaan Heap', val: `${server.memory.heap_used_mb} / ${server.memory.heap_total_mb} MB (${heapPct}%)` },
        { label: 'PID & Platform', val: `PID ${server.pid} • ${server.platform}` },
      ],
    },
    identity: {
      title: '🛡️ Identity & Supabase Auth Shield',
      subtitle: 'Pengesahan token JWT dan kawalan capaian berasaskan peranan (RBAC).',
      stats: [
        { label: 'Sesi Keselamatan', val: 'Disahkan (JWT Auth)' },
        { label: 'Akses Peranan', val: 'SUPER_ADMIN_JPP Guard' },
        { label: 'Integriti Token', val: 'Aktif & Sah' },
      ],
    },
    cloud: {
      title: '☁️ Cloud Services (PolyMart & AI Nexus)',
      subtitle: 'Perkhidmatan pasaran mahasiswa dan enjin kepintaran buatan.',
      stats: [
        { label: 'Jumlah Pesanan PolyMart', val: `${modules.polymart_orders || 0} pesanan` },
        { label: 'Pesanan Tertunggak >48j', val: `${pm?.pending_stale || 0} pesanan` },
        { label: 'Token AI Digunakan', val: `${(modules.ai_tokens_used || 0).toLocaleString()} token` },
      ],
    },
    applications: {
      title: '📦 Applications (PolyRider & e-Kebajikan)',
      subtitle: 'Perkhidmatan logistik kampus dan sistem aduan bantuan mahasiswa.',
      stats: [
        { label: 'Trip PolyRider', val: `${modules.polyrider_jobs || 0} trip` },
        { label: 'SOS Emergency Tersekat', val: `${pr?.stuck_emergency || 0} kes` },
        { label: 'Tiket e-Kebajikan', val: `${modules.kebajikan_tickets || 0} (${keb?.sla_breached || 0} SLA breached)` },
      ],
    },
    db: {
      title: '🗄️ Critical Assets (PostgreSQL Cluster)',
      subtitle: 'Pangkalan data teras Supabase yang menyimpan seluruh rekod universiti.',
      stats: [
        { label: 'Sambungan Aktif', val: `${db?.active_connections || 0} / ${db?.max_connections || 100} conns` },
        { label: 'WAL Retained', val: `${db?.wal_retained_mb || 0} MB (Had: 2,048 MB)` },
        { label: 'Cache Hit Rate', val: `${db?.cache_hit_rate_pct || 99.9}%` },
      ],
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
      {/* ── Header & View Toggles (SentinelAI Image 3 Style) ── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">
            Threat Overview
          </h3>
          <p className="text-[11px] font-bold text-slate-400">
            Live AI Network • Klik nod untuk analisis terperinci
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-50 border border-slate-200/70">
          {(
            [
              { id: 'flow', label: 'Flow View' },
              { id: 'traffic', label: 'Traffic' },
              { id: 'heatmap', label: 'Risk Heatmap' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setViewMode(tab.id);
                setActiveNodeId(null);
              }}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                viewMode === tab.id
                  ? 'bg-[#FFEDE7] text-[#FF5B37] font-black shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── View 1: Flow View (Fluid Bezier Node Network) ── */}
      {viewMode === 'flow' && (
        <div className="relative py-8 my-2">
          {/* SVG Connecting Bezier Paths */}
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 760 210">
              {/* Path 1: Node 1 -> Node 2 */}
              <path
                d="M 85 105 C 130 105, 140 105, 185 105"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />

              {/* Path 2: Node 2 -> Node 3 */}
              <path
                d="M 235 105 C 280 105, 290 105, 335 105"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="2.5"
              />

              {/* Path 3: Node 3 -> Split into Node 4a (Cloud Services) */}
              <path
                d="M 385 105 C 430 105, 450 55, 495 55"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="2.5"
              />

              {/* Path 4: Node 3 -> Split into Node 4b (Applications) */}
              <path
                d="M 385 105 C 430 105, 450 155, 495 155"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="2.5"
              />

              {/* Path 5: Node 4a -> Converge into Node 5 (Critical Assets) */}
              <path
                d="M 545 55 C 590 55, 610 105, 655 105"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="2.5"
              />

              {/* Path 6: Node 4b -> Converge into Node 5 */}
              <path
                d="M 545 155 C 590 155, 610 105, 655 105"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="2.5"
              />
            </svg>
          </div>

          {/* ── 5 Interactive Nodes Row ── */}
          <div className="relative z-10 flex items-center justify-between px-2 sm:px-6">
            {/* Node 1: Internet */}
            <div
              onClick={() => setActiveNodeId(activeNodeId === 'internet' ? null : 'internet')}
              className="flex flex-col items-center text-center cursor-pointer group"
            >
              <div
                className={cn(
                  'w-13 h-13 rounded-full bg-white border shadow-sm flex items-center justify-center transition-all group-hover:scale-110',
                  activeNodeId === 'internet'
                    ? 'border-emerald-500 ring-4 ring-emerald-100'
                    : 'border-slate-200/90 group-hover:border-slate-400'
                )}
              >
                <Globe className="w-5 h-5 text-slate-600 group-hover:text-emerald-600 transition-colors" />
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">Internet</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {(modules.profiles || 0).toLocaleString()} events
              </span>
            </div>

            {/* Node 2: Firewall (API Server) — with pinned alert badge */}
            <div
              onClick={() => setActiveNodeId(activeNodeId === 'firewall' ? null : 'firewall')}
              className="flex flex-col items-center text-center cursor-pointer group relative"
            >
              {/* Alert Badge Pinned to Node 2 */}
              <div className="absolute -top-7 whitespace-nowrap z-20">
                <div
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-[9px] font-black border shadow-2xs leading-none flex items-center gap-1',
                    heapPct > 80
                      ? 'bg-[#FFF5F2] border-[#FFCCBE] text-[#EA580C]'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      heapPct > 80 ? 'bg-[#EA580C]' : 'bg-emerald-500'
                    )}
                  />
                  <span>{heapPct > 80 ? `Memory Spike Heap ${heapPct}%` : 'API Optimal'}</span>
                </div>
              </div>

              <div
                className={cn(
                  'w-13 h-13 rounded-full bg-white border shadow-sm flex items-center justify-center transition-all group-hover:scale-110',
                  heapPct > 80
                    ? 'border-[#EA580C] ring-4 ring-orange-100'
                    : activeNodeId === 'firewall'
                    ? 'border-blue-500 ring-4 ring-blue-100'
                    : 'border-slate-200/90 group-hover:border-slate-400'
                )}
              >
                <Shield
                  className={cn(
                    'w-5 h-5 transition-colors',
                    heapPct > 80 ? 'text-[#EA580C]' : 'text-slate-600'
                  )}
                />
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">Firewall</span>
              <span className="text-[10px] text-slate-400 font-medium">API Server</span>
            </div>

            {/* Node 3: Identity */}
            <div
              onClick={() => setActiveNodeId(activeNodeId === 'identity' ? null : 'identity')}
              className="flex flex-col items-center text-center cursor-pointer group"
            >
              <div
                className={cn(
                  'w-13 h-13 rounded-full bg-white border shadow-sm flex items-center justify-center transition-all group-hover:scale-110',
                  activeNodeId === 'identity'
                    ? 'border-cyan-500 ring-4 ring-cyan-100'
                    : 'border-slate-200/90 group-hover:border-slate-400'
                )}
              >
                <User className="w-5 h-5 text-slate-600 group-hover:text-cyan-600 transition-colors" />
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">Identity</span>
              <span className="text-[10px] text-slate-400 font-medium">Auth Shield</span>
            </div>

            {/* Branching Column: Cloud Services (Top) + Applications (Bottom) */}
            <div className="flex flex-col items-center gap-6">
              {/* Node 4a: Cloud Services — with pinned AI Containment badge */}
              <div
                onClick={() => setActiveNodeId(activeNodeId === 'cloud' ? null : 'cloud')}
                className="flex flex-col items-center text-center cursor-pointer group relative"
              >
                {/* Pinned Badge */}
                <div className="absolute -top-6 whitespace-nowrap z-20">
                  <div className="px-2 py-0.5 rounded-full text-[8px] font-black border bg-[#F0FDF4] border-[#BBF7D0] text-emerald-700 shadow-2xs leading-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>AI Containment</span>
                  </div>
                </div>

                <div
                  className={cn(
                    'w-12 h-12 rounded-full bg-white border shadow-sm flex items-center justify-center transition-all group-hover:scale-110',
                    activeNodeId === 'cloud'
                      ? 'border-purple-500 ring-4 ring-purple-100'
                      : 'border-slate-200/90 group-hover:border-slate-400'
                  )}
                >
                  <Cloud className="w-4 h-4 text-slate-600 group-hover:text-purple-600 transition-colors" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 mt-1">Cloud Services</span>
                <span className="text-[9px] text-emerald-600 font-medium">Healthy</span>
              </div>

              {/* Node 4b: Applications */}
              <div
                onClick={() => setActiveNodeId(activeNodeId === 'applications' ? null : 'applications')}
                className="flex flex-col items-center text-center cursor-pointer group"
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-full bg-white border shadow-sm flex items-center justify-center transition-all group-hover:scale-110',
                    nodeStatus.applications === 'critical'
                      ? 'border-rose-500 ring-4 ring-rose-100'
                      : activeNodeId === 'applications'
                      ? 'border-blue-500 ring-4 ring-blue-100'
                      : 'border-slate-200/90 group-hover:border-slate-400'
                  )}
                >
                  <LayoutGrid
                    className={cn(
                      'w-4 h-4 transition-colors',
                      nodeStatus.applications === 'critical' ? 'text-rose-600' : 'text-slate-600'
                    )}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-800 mt-1">Applications</span>
                <span
                  className={cn(
                    'text-[9px] font-medium',
                    nodeStatus.applications === 'critical' ? 'text-rose-600 font-bold' : 'text-emerald-600'
                  )}
                >
                  {nodeStatus.applications === 'critical' ? 'Attention' : 'Healthy'}
                </span>
              </div>
            </div>

            {/* Node 5: Critical Assets (PostgreSQL) */}
            <div
              onClick={() => setActiveNodeId(activeNodeId === 'db' ? null : 'db')}
              className="flex flex-col items-center text-center cursor-pointer group"
            >
              <div
                className={cn(
                  'w-13 h-13 rounded-full bg-white border shadow-sm flex items-center justify-center transition-all group-hover:scale-110',
                  activeNodeId === 'db'
                    ? 'border-emerald-500 ring-4 ring-emerald-100'
                    : 'border-slate-200/90 group-hover:border-slate-400'
                )}
              >
                <Lock className="w-5 h-5 text-slate-600 group-hover:text-emerald-600 transition-colors" />
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">Critical Assets</span>
              <span className="text-[10px] text-emerald-600 font-medium">Protected</span>
            </div>
          </div>

          {/* ── Dynamic Drilldown Inspector Drawer when Node is Clicked ── */}
          <AnimatePresence>
            {activeNodeId && nodeDetails[activeNodeId] && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="mt-6 pt-4 border-t border-slate-100 rounded-xl bg-slate-50 p-4 text-left relative"
              >
                <button
                  onClick={() => setActiveNodeId(null)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>

                <h4 className="text-xs font-black text-slate-900">
                  {nodeDetails[activeNodeId].title}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {nodeDetails[activeNodeId].subtitle}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-slate-200/70">
                  {nodeDetails[activeNodeId].stats.map((s, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 block">{s.label}</span>
                      <span className="text-xs font-black text-slate-800 mt-0.5 block">{s.val}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Bottom Legend (SentinelAI Style) ── */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-3 text-[11px] font-medium text-slate-500 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Healthy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
              Threat Flow
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Critical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              AI Containment
            </span>
          </div>
        </div>
      )}

      {/* ── View 2: Traffic View ── */}
      {viewMode === 'traffic' && (
        <div className="py-4 space-y-3">
          {[
            { label: 'Pesanan PolyMart', count: modules.polymart_orders || 0, max: 200, color: 'bg-pink-500' },
            { label: 'Trip PolyRider', count: modules.polyrider_jobs || 0, max: 200, color: 'bg-cyan-500' },
            { label: 'Tiket e-Kebajikan', count: modules.kebajikan_tickets || 0, max: 100, color: 'bg-rose-500' },
            { label: 'Token AI Assistant', count: modules.ai_tokens_used || 0, max: modules.ai_token_limit || 1000000, color: 'bg-purple-500' },
          ].map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>{item.label}</span>
                <span className="font-mono">{item.count.toLocaleString()}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', item.color)}
                  style={{ width: `${Math.min((item.count / item.max) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── View 3: Heatmap ── */}
      {viewMode === 'heatmap' && (
        <div className="py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { name: 'Node.js Engine', status: 'Healthy', color: 'text-emerald-600 bg-emerald-50' },
            { name: 'PostgreSQL Pool', status: 'Healthy', color: 'text-emerald-600 bg-emerald-50' },
            { name: 'WAL Watchdog', status: 'Optimal', color: 'text-emerald-600 bg-emerald-50' },
            { name: 'PolyMart Orders', status: (pm?.pending_stale || 0) > 0 ? 'Warning' : 'Healthy', color: (pm?.pending_stale || 0) > 0 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50' },
            { name: 'PolyRider SOS', status: (pr?.stuck_emergency || 0) > 0 ? 'Critical' : 'Healthy', color: (pr?.stuck_emergency || 0) > 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50' },
            { name: 'e-Kebajikan SLA', status: (keb?.sla_breached || 0) > 0 ? 'Warning' : 'Healthy', color: (keb?.sla_breached || 0) > 0 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50' },
          ].map((item, idx) => (
            <div key={idx} className={cn('p-3 rounded-xl border border-slate-200/80', item.color)}>
              <span className="text-xs font-bold block">{item.name}</span>
              <span className="text-[10px] font-black uppercase mt-1 block">{item.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
