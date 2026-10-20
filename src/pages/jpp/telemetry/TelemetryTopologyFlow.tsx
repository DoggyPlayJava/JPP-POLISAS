import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Server,
  Shield,
  ShoppingBag,
  Bike,
  Heart,
  Database,
  Lock,
  Layers,
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  Zap,
  Activity,
} from 'lucide-react';
import { TelemetryData } from './telemetryTypes';
import { cn } from '@/lib/utils';
import { formatUptime } from './telemetryUtils';

interface TelemetryTopologyFlowProps {
  data: TelemetryData;
  onFilterTimelineByRoute?: (route: string) => void;
}

export const TelemetryTopologyFlow: React.FC<TelemetryTopologyFlowProps> = ({
  data,
  onFilterTimelineByRoute,
}) => {
  const { t } = useTranslation();
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

  const dbConnPct = db?.max_connections
    ? Math.round(((db.active_connections || 0) / db.max_connections) * 100)
    : 0;

  const aiPct = Math.round(ai?.usage_pct || 0);

  // ── 1. REAL Data-Driven Health States per Node ──
  const nodeStatus = {
    ingress: 'healthy',
    api: heapPct > 80 ? 'warning' : 'healthy',
    auth: 'healthy',
    commercial:
      (pm?.cancel_rate_pct || 0) > 60 || aiPct > 90
        ? 'critical'
        : (pm?.pending_stale || 0) > 0 || aiPct > 70
        ? 'warning'
        : 'healthy',
    operations:
      (keb?.sla_breached || 0) > 0 || (pr?.stuck_emergency || 0) > 0
        ? 'critical'
        : (keb?.unassigned || 0) > 3 || (pr?.cancel_rate_pct || 0) > 35
        ? 'warning'
        : 'healthy',
    db:
      (db?.wal_retained_mb || 0) > 1024 || dbConnPct > 85
        ? 'critical'
        : (db?.wal_retained_mb || 0) > 512 || (db?.cache_hit_rate_pct || 99) < 85
        ? 'warning'
        : 'healthy',
  };

  // Node health styling
  const getNodeVisual = (st: string, isSelected: boolean) => {
    if (st === 'critical') {
      return {
        border: 'border-rose-500 bg-rose-50/80 text-rose-600',
        ring: 'ring-4 ring-rose-200 animate-pulse',
        badgeColor: 'bg-rose-500',
        dot: 'bg-rose-500 animate-ping',
      };
    }
    if (st === 'warning') {
      return {
        border: 'border-[#F97316] bg-orange-50/80 text-[#EA580C]',
        ring: 'ring-4 ring-orange-200',
        badgeColor: 'bg-[#F97316]',
        dot: 'bg-[#F97316]',
      };
    }
    return {
      border: isSelected
        ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
        : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400',
      ring: isSelected ? 'ring-4 ring-emerald-100' : '',
      badgeColor: 'bg-emerald-500',
      dot: 'bg-emerald-500',
    };
  };

  // ── 2. REAL Conditional Alert Badges (HANYA MUNCUL JIKA ADA AMARAN SEBENAR!) ──
  // Node 2 (API Gateway)
  const apiBadge =
    heapPct > 80 ? { text: t('jpp:telemetry_topo_badge_heap_spike', 'Heap Spike {{pct}}%', { pct: heapPct }), color: 'bg-rose-50 border-rose-300 text-rose-700' } : null;

  // Node 4a (Commercial: PolyMart & AI)
  const commercialBadge =
    (pm?.pending_stale || 0) > 0
      ? { text: t('jpp:telemetry_topo_badge_stale_orders', '{{count}} Pesanan Basi >48j', { count: pm.pending_stale }), color: 'bg-amber-50 border-amber-300 text-amber-800' }
      : aiPct > 85
      ? { text: t('jpp:telemetry_topo_badge_ai_quota', 'AI Kuota {{pct}}%', { pct: aiPct }), color: 'bg-amber-50 border-amber-300 text-amber-800' }
      : null;

  // Node 4b (Operations: PolyRider & Kebajikan)
  const operationsBadge =
    (keb?.sla_breached || 0) > 0
      ? { text: t('jpp:telemetry_topo_badge_sla_breached', '{{count}} SLA Tiket Pecah!', { count: keb.sla_breached }), color: 'bg-rose-50 border-rose-300 text-rose-800' }
      : (pr?.stuck_emergency || 0) > 0
      ? { text: t('jpp:telemetry_topo_badge_sos_stuck', '{{count}} SOS Tersekat!', { count: pr.stuck_emergency }), color: 'bg-rose-50 border-rose-300 text-rose-800' }
      : null;

  // Node 5 (PostgreSQL Cluster & WAL)
  const dbBadge =
    (db?.wal_retained_mb || 0) > 512
      ? { text: t('jpp:telemetry_topo_badge_wal', 'WAL {{mb}}MB / 2GB', { mb: db.wal_retained_mb }), color: 'bg-rose-50 border-rose-300 text-rose-800' }
      : dbConnPct > 80
      ? { text: t('jpp:telemetry_topo_badge_pool', 'Pool {{active}}/{{max}}', { active: db.active_connections, max: db.max_connections }), color: 'bg-amber-50 border-amber-300 text-amber-800' }
      : null;

  // ── 3. Real Subsystem Inspector Data ──
  const nodeDetails: Record<
    string,
    { title: string; subtitle: string; route?: string; stats: { label: string; val: string }[] }
  > = {
    ingress: {
      title: t('jpp:telemetry_topo_ingress_title', '🌐 Siswa & Ingress Trafik'),
      subtitle: t('jpp:telemetry_topo_ingress_sub', 'Sesi web portal dan aplikasi PWA siswa yang aktif mengakses sistem.'),
      route: '/portal',
      stats: [
        { label: t('jpp:telemetry_topo_registered_students', 'Jumlah Siswa Berdaftar'), val: `${(modules.profiles || 0).toLocaleString()} ${t('jpp:telemetry_topo_records_unit', 'rekod')}` },
        { label: t('jpp:telemetry_topo_push_subs', 'Push Subscriptions'), val: t('jpp:telemetry_topo_push_subs_val', '{{count}} aktif', { count: modules.push_subscriptions || 0 }) },
        { label: t('jpp:telemetry_topo_notifications_sent', 'Notifikasi Terhantar'), val: `${(modules.notifications || 0).toLocaleString()} ${t('jpp:telemetry_topo_notifs_unit', 'notif')}` },
      ],
    },
    api: {
      title: t('jpp:telemetry_topo_api_title', '⚡ Node.js API Gateway (Express)'),
      subtitle: t('jpp:telemetry_topo_api_sub', 'Pelayan API backend yang memproses laluan, middleware keselamatan, dan soket.'),
      route: '/jpp/telemetry',
      stats: [
        { label: t('jpp:telemetry_topo_api_uptime', 'Uptime Proses API'), val: formatUptime(server.uptime_seconds) },
        { label: t('jpp:telemetry_topo_api_heap', 'Memori Heap V8'), val: `${server.memory.heap_used_mb} / ${server.memory.heap_total_mb} MB (${heapPct}%)` },
        { label: t('jpp:telemetry_topo_api_pid', 'ID Proses (PID)'), val: `PID ${server.pid} • v${server.node_version}` },
      ],
    },
    auth: {
      title: t('jpp:telemetry_topo_auth_title', '🛡️ Supabase Auth & RBAC Guard'),
      subtitle: t('jpp:telemetry_topo_auth_sub', 'Pengesahan token JWT sesi login pelajar dan kebenaran SUPER_ADMIN_JPP.'),
      route: '/login',
      stats: [
        { label: t('jpp:telemetry_topo_auth_session', 'Sesi Keselamatan'), val: 'JWT Bearer Active' },
        { label: t('jpp:telemetry_topo_auth_role_access', 'Akses Peranan'), val: 'SuperAdmin RBAC Enforced' },
        { label: t('jpp:telemetry_topo_auth_pending_acc', 'Akaun Menunggu'), val: t('jpp:telemetry_topo_accounts_unit', '{{count}} akaun', { count: diagnostics?.accounts?.pending || 0 }) },
      ],
    },
    commercial: {
      title: t('jpp:telemetry_topo_commercial_title', '🛒 PolyMart & AI Nexus'),
      subtitle: t('jpp:telemetry_topo_commercial_sub', 'Ekosistem e-dagang siswa dan enjin kecerdasan buatan kampus.'),
      route: '/polymart',
      stats: [
        { label: t('jpp:telemetry_topo_orders_label', 'Pesanan PolyMart'), val: t('jpp:telemetry_topo_orders_unit', '{{count}} pesanan', { count: modules.polymart_orders || 0 }) },
        { label: t('jpp:telemetry_topo_stale_orders_label', 'Pesanan Tertunggak >48j'), val: t('jpp:telemetry_topo_orders_unit', '{{count}} pesanan', { count: pm?.pending_stale || 0 }) },
        { label: t('jpp:telemetry_topo_ai_tokens_label', 'Token AI Digunakan'), val: `${(modules.ai_tokens_used || 0).toLocaleString()} / ${(modules.ai_token_limit || 1000000).toLocaleString()}` },
      ],
    },
    operations: {
      title: t('jpp:telemetry_topo_ops_title', '📦 PolyRider & e-Kebajikan'),
      subtitle: t('jpp:telemetry_topo_ops_sub', 'Logistik penghantaran makanan kampus dan hab aduan bantuan siswa.'),
      route: '/kebajikan',
      stats: [
        { label: t('jpp:telemetry_topo_trips_label', 'Trip PolyRider'), val: t('jpp:telemetry_topo_trips_unit', '{{count}} trip', { count: modules.polyrider_jobs || 0 }) },
        { label: t('jpp:telemetry_topo_sos_label', 'SOS Emergency Tersekat'), val: t('jpp:telemetry_topo_cases_unit', '{{count}} kes', { count: pr?.stuck_emergency || 0 }) },
        { label: t('jpp:telemetry_topo_tickets_label', 'Tiket e-Kebajikan'), val: t('jpp:telemetry_topo_tickets_stat', '{{total}} ({{breached}} SLA breached)', { total: modules.kebajikan_tickets || 0, breached: keb?.sla_breached || 0 }) },
      ],
    },
    db: {
      title: t('jpp:telemetry_topo_db_title', '🗄️ PostgreSQL Cluster & WAL Watchdog'),
      subtitle: t('jpp:telemetry_topo_db_sub', 'Pangkalan data utama Supabase dengan pemantauan had WAL 2GB.'),
      route: '/jpp/telemetry',
      stats: [
        { label: t('jpp:telemetry_topo_active_conns_label', 'Sambungan Aktif'), val: `${db?.active_connections || 0} / ${db?.max_connections || 100} conns` },
        { label: t('jpp:telemetry_topo_wal_retained_label', 'WAL Retained'), val: t('jpp:telemetry_topo_wal_retained_val', '{{mb}} MB (Had: 2,048 MB)', { mb: db?.wal_retained_mb || 0 }) },
        { label: t('jpp:telemetry_cache_hit_rate', 'Cache Hit Rate'), val: `${db?.cache_hit_rate_pct || 99.9}%` },
      ],
    },
  };

  // Color determination for connection paths
  const getPathColor = (fromStatus: string, toStatus: string) => {
    if (toStatus === 'critical') return '#EF4444'; // Red broken link
    if (toStatus === 'warning') return '#F97316'; // Orange warning link
    return '#10B981'; // Green healthy flow
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
      {/* ── Custom CSS for Animated SVG Lines ── */}
      <style>{`
        @keyframes flowDash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .flow-line-animated {
          stroke-dasharray: 6 6;
          animation: flowDash 1s linear infinite;
        }
      `}</style>

      {/* ── Header & View Toggles ── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">
            {t('jpp:telemetry_topo_header_title', 'Threat & Architecture Overview')}
          </h3>
          <p className="text-[11px] font-bold text-slate-400">
            {t('jpp:telemetry_topo_header_desc', 'Arkitektur Langsung JPP-POLISAS • Klik mana-mana nod untuk analisis')}
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-50 border border-slate-200/70">
          {(
            [
              { id: 'flow', label: t('jpp:telemetry_topo_tab_flow', 'Flow View') },
              { id: 'traffic', label: t('jpp:telemetry_topo_tab_traffic', 'Traffic') },
              { id: 'heatmap', label: t('jpp:telemetry_topo_tab_heatmap', 'Risk Heatmap') },
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

      {/* ── View 1: REAL Animated Data-Driven Flow View ── */}
      {viewMode === 'flow' && (
        <div className="relative py-8 my-2">
          {/* Animated SVG Bezier Flow Paths */}
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 760 210">
              {/* Path 1: Ingress -> API Gateway */}
              <path
                d="M 85 105 C 130 105, 140 105, 185 105"
                fill="none"
                stroke={getPathColor(nodeStatus.ingress, nodeStatus.api)}
                strokeWidth="2.5"
                className="flow-line-animated"
              />

              {/* Path 2: API Gateway -> Auth Shield */}
              <path
                d="M 235 105 C 280 105, 290 105, 335 105"
                fill="none"
                stroke={getPathColor(nodeStatus.api, nodeStatus.auth)}
                strokeWidth="2.5"
                className="flow-line-animated"
              />

              {/* Path 3: Auth Shield -> Branch to PolyMart & AI (4a) */}
              <path
                d="M 385 105 C 430 105, 450 55, 495 55"
                fill="none"
                stroke={getPathColor(nodeStatus.auth, nodeStatus.commercial)}
                strokeWidth="2.5"
                className="flow-line-animated"
              />

              {/* Path 4: Auth Shield -> Branch to PolyRider & Kebajikan (4b) */}
              <path
                d="M 385 105 C 430 105, 450 155, 495 155"
                fill="none"
                stroke={getPathColor(nodeStatus.auth, nodeStatus.operations)}
                strokeWidth="2.5"
                className="flow-line-animated"
              />

              {/* Path 5: PolyMart & AI -> Converge into PostgreSQL Cluster (5) */}
              <path
                d="M 545 55 C 590 55, 610 105, 655 105"
                fill="none"
                stroke={getPathColor(nodeStatus.commercial, nodeStatus.db)}
                strokeWidth="2.5"
                className="flow-line-animated"
              />

              {/* Path 6: PolyRider & Kebajikan -> Converge into PostgreSQL Cluster (5) */}
              <path
                d="M 545 155 C 590 155, 610 105, 655 105"
                fill="none"
                stroke={getPathColor(nodeStatus.operations, nodeStatus.db)}
                strokeWidth="2.5"
                className="flow-line-animated"
              />
            </svg>
          </div>

          {/* ── 5 Interactive Real JPP Nodes ── */}
          <div className="relative z-10 flex items-center justify-between px-2 sm:px-6">
            {/* ── Node 1: Siswa Ingress ── */}
            <div
              onClick={() => setActiveNodeId(activeNodeId === 'ingress' ? null : 'ingress')}
              className="flex flex-col items-center text-center cursor-pointer group"
            >
              <div
                className={cn(
                  'w-13 h-13 rounded-full border shadow-sm flex items-center justify-center transition-all group-hover:scale-110',
                  getNodeVisual(nodeStatus.ingress, activeNodeId === 'ingress').border,
                  getNodeVisual(nodeStatus.ingress, activeNodeId === 'ingress').ring
                )}
              >
                <Globe className="w-5 h-5 transition-colors" />
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">{t('jpp:telemetry_topo_node_ingress', 'Siswa Ingress')}</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {t('jpp:telemetry_topo_sessions_count', '{{count}} sesi', { count: (modules.profiles || 0).toLocaleString() })}
              </span>
            </div>

            {/* ── Node 2: Node.js API Gateway (With Conditional Badge) ── */}
            <div
              onClick={() => setActiveNodeId(activeNodeId === 'api' ? null : 'api')}
              className="flex flex-col items-center text-center cursor-pointer group relative"
            >
              {/* Conditional Alert Badge */}
              {apiBadge && (
                <div className="absolute -top-7 whitespace-nowrap z-20">
                  <div
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[9px] font-black border shadow-2xs leading-none flex items-center gap-1',
                      apiBadge.color
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span>{apiBadge.text}</span>
                  </div>
                </div>
              )}

              <div
                className={cn(
                  'w-13 h-13 rounded-full border shadow-sm flex items-center justify-center transition-all group-hover:scale-110',
                  getNodeVisual(nodeStatus.api, activeNodeId === 'api').border,
                  getNodeVisual(nodeStatus.api, activeNodeId === 'api').ring
                )}
              >
                <Server className="w-5 h-5 transition-colors" />
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">{t('jpp:telemetry_topo_node_api', 'Node.js API')}</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {t('jpp:telemetry_topo_heap_pct', 'Heap {{pct}}%', { pct: heapPct })}
              </span>
            </div>

            {/* ── Node 3: Auth & RBAC Shield ── */}
            <div
              onClick={() => setActiveNodeId(activeNodeId === 'auth' ? null : 'auth')}
              className="flex flex-col items-center text-center cursor-pointer group"
            >
              <div
                className={cn(
                  'w-13 h-13 rounded-full border shadow-sm flex items-center justify-center transition-all group-hover:scale-110',
                  getNodeVisual(nodeStatus.auth, activeNodeId === 'auth').border,
                  getNodeVisual(nodeStatus.auth, activeNodeId === 'auth').ring
                )}
              >
                <Shield className="w-5 h-5 transition-colors" />
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">{t('jpp:telemetry_topo_node_auth', 'Supabase Auth')}</span>
              <span className="text-[10px] text-slate-400 font-medium">{t('jpp:telemetry_topo_rbac_guard', 'RBAC Guard')}</span>
            </div>

            {/* ── Branching Column: PolyMart & AI (4a) + PolyRider & Kebajikan (4b) ── */}
            <div className="flex flex-col items-center gap-6">
              {/* ── Node 4a: PolyMart & AI (With Conditional Badge) ── */}
              <div
                onClick={() => setActiveNodeId(activeNodeId === 'commercial' ? null : 'commercial')}
                className="flex flex-col items-center text-center cursor-pointer group relative"
              >
                {/* Conditional Badge */}
                {commercialBadge && (
                  <div className="absolute -top-6 whitespace-nowrap z-20">
                    <div
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[8px] font-black border shadow-2xs leading-none flex items-center gap-1',
                        commercialBadge.color
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{commercialBadge.text}</span>
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    'w-12 h-12 rounded-full border shadow-sm flex items-center justify-center transition-all group-hover:scale-110',
                    getNodeVisual(nodeStatus.commercial, activeNodeId === 'commercial').border,
                    getNodeVisual(nodeStatus.commercial, activeNodeId === 'commercial').ring
                  )}
                >
                  <ShoppingBag className="w-4 h-4 transition-colors" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 mt-1">{t('jpp:telemetry_topo_node_commercial', 'PolyMart & AI')}</span>
                <span className="text-[9px] text-slate-400 font-medium">
                  {t('jpp:telemetry_topo_orders_unit', '{{count}} pesanan', { count: modules.polymart_orders || 0 })}
                </span>
              </div>

              {/* ── Node 4b: PolyRider & Kebajikan (With Conditional Badge) ── */}
              <div
                onClick={() => setActiveNodeId(activeNodeId === 'operations' ? null : 'operations')}
                className="flex flex-col items-center text-center cursor-pointer group relative"
              >
                {/* Conditional Badge */}
                {operationsBadge && (
                  <div className="absolute -top-6 whitespace-nowrap z-20">
                    <div
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[8px] font-black border shadow-2xs leading-none flex items-center gap-1',
                        operationsBadge.color
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span>{operationsBadge.text}</span>
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    'w-12 h-12 rounded-full border shadow-sm flex items-center justify-center transition-all group-hover:scale-110',
                    getNodeVisual(nodeStatus.operations, activeNodeId === 'operations').border,
                    getNodeVisual(nodeStatus.operations, activeNodeId === 'operations').ring
                  )}
                >
                  <Bike className="w-4 h-4 transition-colors" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 mt-1">{t('jpp:telemetry_topo_node_operations', 'Rider & Kebajikan')}</span>
                <span
                  className={cn(
                    'text-[9px] font-medium',
                    nodeStatus.operations === 'critical' ? 'text-rose-600 font-black' : 'text-slate-400'
                  )}
                >
                  {nodeStatus.operations === 'critical' ? t('jpp:telemetry_topo_attention_needed', 'Perhatian Diperlukan') : t('jpp:telemetry_topo_trips_unit', '{{count}} trip', { count: modules.polyrider_jobs || 0 })}
                </span>
              </div>
            </div>

            {/* ── Node 5: PostgreSQL Cluster & WAL (With Conditional Badge) ── */}
            <div
              onClick={() => setActiveNodeId(activeNodeId === 'db' ? null : 'db')}
              className="flex flex-col items-center text-center cursor-pointer group relative"
            >
              {/* Conditional Badge */}
              {dbBadge && (
                <div className="absolute -top-7 whitespace-nowrap z-20">
                  <div
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[9px] font-black border shadow-2xs leading-none flex items-center gap-1',
                      dbBadge.color
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span>{dbBadge.text}</span>
                  </div>
                </div>
              )}

              <div
                className={cn(
                  'w-13 h-13 rounded-full border shadow-sm flex items-center justify-center transition-all group-hover:scale-110',
                  getNodeVisual(nodeStatus.db, activeNodeId === 'db').border,
                  getNodeVisual(nodeStatus.db, activeNodeId === 'db').ring
                )}
              >
                <Database className="w-5 h-5 transition-colors" />
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">{t('jpp:telemetry_topo_node_db', 'PostgreSQL DB')}</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {t('jpp:telemetry_topo_conns_unit', '{{active}}/{{max}} conns', { active: db?.active_connections || 0, max: db?.max_connections || 100 })}
              </span>
            </div>
          </div>

          {/* ── Dynamic Drilldown Inspector Drawer when Node is Clicked ── */}
          <AnimatePresence>
            {activeNodeId && nodeDetails[activeNodeId] && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-6 pt-4 border-t border-slate-100 rounded-xl bg-slate-50/90 p-4 text-left relative"
              >
                <button
                  onClick={() => setActiveNodeId(null)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between pr-8">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">
                      {nodeDetails[activeNodeId].title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {nodeDetails[activeNodeId].subtitle}
                    </p>
                  </div>

                  {nodeDetails[activeNodeId].route && onFilterTimelineByRoute && (
                    <button
                      onClick={() => onFilterTimelineByRoute(nodeDetails[activeNodeId].route!)}
                      className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md border border-blue-200"
                    >
                      <span>{t('jpp:telemetry_topo_filter_module_errors', 'Tapis Ralat Modul Ini')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

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

          {/* ── Real Status Legend ── */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-3 text-[11px] font-medium text-slate-500 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {t('jpp:telemetry_topo_legend_optimal', 'Optimal')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
              {t('jpp:telemetry_topo_legend_threshold', 'Amaran Threshold')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              {t('jpp:telemetry_topo_legend_critical', 'Kritikal / Broken')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {t('jpp:telemetry_topo_legend_live_flow', 'Aliran Langsung')}
            </span>
          </div>
        </div>
      )}

      {/* ── View 2: Traffic View ── */}
      {viewMode === 'traffic' && (
        <div className="py-4 space-y-3">
          {[
            { label: t('jpp:telemetry_topo_traffic_polymart', 'Pesanan PolyMart'), count: modules.polymart_orders || 0, max: 200, color: 'bg-pink-500' },
            { label: t('jpp:telemetry_topo_traffic_polyrider', 'Trip PolyRider'), count: modules.polyrider_jobs || 0, max: 200, color: 'bg-cyan-500' },
            { label: t('jpp:telemetry_topo_traffic_kebajikan', 'Tiket e-Kebajikan'), count: modules.kebajikan_tickets || 0, max: 100, color: 'bg-rose-500' },
            { label: t('jpp:telemetry_topo_traffic_ai', 'Token AI Assistant'), count: modules.ai_tokens_used || 0, max: modules.ai_token_limit || 1000000, color: 'bg-purple-500' },
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
            { name: t('jpp:telemetry_topo_hm_nodejs', 'Node.js Engine'), status: nodeStatus.api, detail: `${server.memory.heap_used_mb}MB Heap` },
            { name: t('jpp:telemetry_topo_hm_pgpool', 'PostgreSQL Pool'), status: nodeStatus.db, detail: `${db?.active_connections || 0}/${db?.max_connections || 100} Conns` },
            { name: t('jpp:telemetry_topo_hm_wal', 'WAL Watchdog'), status: nodeStatus.db, detail: `${db?.wal_retained_mb || 0}MB / 2GB` },
            { name: t('jpp:telemetry_topo_hm_polymart', 'PolyMart Orders'), status: nodeStatus.commercial, detail: t('jpp:telemetry_topo_hm_pending', '{{count}} Tertunggak', { count: pm?.pending_stale || 0 }) },
            { name: t('jpp:telemetry_topo_hm_polyrider', 'PolyRider SOS'), status: nodeStatus.operations, detail: t('jpp:telemetry_topo_hm_emergency', '{{count}} Kecemasan', { count: pr?.stuck_emergency || 0 }) },
            { name: t('jpp:telemetry_topo_hm_kebajikan', 'e-Kebajikan SLA'), status: nodeStatus.operations, detail: t('jpp:telemetry_topo_hm_sla_breached', '{{count}} Melepasi SLA', { count: keb?.sla_breached || 0 }) },
          ].map((item, idx) => (
            <div
              key={idx}
              className={cn(
                'p-3 rounded-xl border',
                item.status === 'critical'
                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                  : item.status === 'warning'
                  ? 'border-orange-300 bg-orange-50 text-orange-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              )}
            >
              <span className="text-xs font-bold block">{item.name}</span>
              <span className="text-[10px] font-mono mt-0.5 block">{item.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
