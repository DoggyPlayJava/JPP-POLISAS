import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Server,
  Shield,
  ShoppingBag,
  Bike,
  Database,
  X,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { TelemetryData } from './telemetryTypes';
import { cn } from '@/lib/utils';
import { formatUptime } from './telemetryUtils';

interface TelemetryTopologyFlowProps {
  data: TelemetryData;
  onFilterTimelineByRoute?: (route: string) => void;
}

function stripLeadingEmoji(label: string): string {
  return label.replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/gu, '').trim();
}

export const TelemetryTopologyFlow: React.FC<TelemetryTopologyFlowProps> = ({
  data,
  onFilterTimelineByRoute,
}) => {
  const { t } = useTranslation(['jpp', 'common']);
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

  // ── 1. Data-Driven Health States per Node ──
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

  // Node visual classes — crisp Semambu Teal (Light) & Obsidian Carbon (Dark), zero ping/pulse
  const getNodeVisual = (st: string, isSelected: boolean) => {
    if (st === 'critical') {
      return {
        border:
          'border-rose-500 dark:border-rose-400 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300',
        ring: isSelected ? 'ring-4 ring-rose-500/25' : 'ring-2 ring-rose-500/20',
      };
    }
    if (st === 'warning') {
      return {
        border:
          'border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300',
        ring: isSelected ? 'ring-4 ring-amber-500/25' : 'ring-2 ring-amber-500/20',
      };
    }
    return {
      border: isSelected
        ? 'border-[#0F766E] dark:border-[#2DD4BF] bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF]'
        : 'border-[#B8E4DC] dark:border-[#252B35] bg-white dark:bg-[#0E1116] text-[#0B2420] dark:text-[#F1F5F9] hover:border-[#0F766E] dark:hover:border-[#2DD4BF]',
      ring: isSelected ? 'ring-4 ring-[#0F766E]/20 dark:ring-[#2DD4BF]/20' : '',
    };
  };

  // ── 2. Conditional Alert Badges ──
  const apiBadge =
    heapPct > 80
      ? {
          text: t('jpp:telemetry_topo_badge_heap_spike', 'Heap Spike {{pct}}%', { pct: heapPct }),
          color: 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200',
          dot: 'bg-rose-600 dark:bg-rose-400',
        }
      : null;

  const commercialBadge =
    (pm?.pending_stale || 0) > 0
      ? {
          text: t('jpp:telemetry_topo_badge_stale_orders', '{{count}} Pesanan Basi >48j', { count: pm.pending_stale }),
          color: 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200',
          dot: 'bg-amber-600 dark:bg-amber-400',
        }
      : aiPct > 85
      ? {
          text: t('jpp:telemetry_topo_badge_ai_quota', 'AI Kuota {{pct}}%', { pct: aiPct }),
          color: 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200',
          dot: 'bg-amber-600 dark:bg-amber-400',
        }
      : null;

  const operationsBadge =
    (keb?.sla_breached || 0) > 0
      ? {
          text: t('jpp:telemetry_topo_badge_sla_breached', '{{count}} SLA Tiket Pecah!', { count: keb.sla_breached }),
          color: 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200',
          dot: 'bg-rose-600 dark:bg-rose-400',
        }
      : (pr?.stuck_emergency || 0) > 0
      ? {
          text: t('jpp:telemetry_topo_badge_sos_stuck', '{{count}} SOS Tersekat!', { count: pr.stuck_emergency }),
          color: 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200',
          dot: 'bg-rose-600 dark:bg-rose-400',
        }
      : null;

  const dbBadge =
    (db?.wal_retained_mb || 0) > 512
      ? {
          text: t('jpp:telemetry_topo_badge_wal', 'WAL {{mb}}MB / 2GB', { mb: db.wal_retained_mb }),
          color: 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200',
          dot: 'bg-rose-600 dark:bg-rose-400',
        }
      : dbConnPct > 80
      ? {
          text: t('jpp:telemetry_topo_badge_pool', 'Pool {{active}}/{{max}}', {
            active: db.active_connections,
            max: db.max_connections,
          }),
          color: 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200',
          dot: 'bg-amber-600 dark:bg-amber-400',
        }
      : null;

  // ── 3. Subsystem Inspector Data (Lucide Icons, Zero Emojis) ──
  const nodeDetails: Record<
    string,
    {
      icon: React.ElementType;
      title: string;
      subtitle: string;
      route?: string;
      stats: { label: string; val: string }[];
    }
  > = {
    ingress: {
      icon: Globe,
      title: stripLeadingEmoji(t('jpp:telemetry_topo_ingress_title', 'Siswa & Ingress Trafik')),
      subtitle: t('jpp:telemetry_topo_ingress_sub', 'Sesi web portal dan aplikasi PWA siswa yang aktif mengakses sistem.'),
      route: '/portal',
      stats: [
        {
          label: t('jpp:telemetry_topo_registered_students', 'Jumlah Siswa Berdaftar'),
          val: `${(modules.profiles || 0).toLocaleString()} ${t('jpp:telemetry_topo_records_unit', 'rekod')}`,
        },
        {
          label: t('jpp:telemetry_topo_push_subs', 'Push Subscriptions'),
          val: t('jpp:telemetry_topo_push_subs_val', '{{count}} aktif', { count: modules.push_subscriptions || 0 }),
        },
        {
          label: t('jpp:telemetry_topo_notifications_sent', 'Notifikasi Terhantar'),
          val: `${(modules.notifications || 0).toLocaleString()} ${t('jpp:telemetry_topo_notifs_unit', 'notif')}`,
        },
      ],
    },
    api: {
      icon: Zap,
      title: stripLeadingEmoji(t('jpp:telemetry_topo_api_title', 'Node.js API Gateway (Express)')),
      subtitle: t('jpp:telemetry_topo_api_sub', 'Pelayan API backend yang memproses laluan, middleware keselamatan, dan soket.'),
      route: '/jpp/telemetry',
      stats: [
        { label: t('jpp:telemetry_topo_api_uptime', 'Uptime Proses API'), val: formatUptime(server.uptime_seconds) },
        {
          label: t('jpp:telemetry_topo_api_heap', 'Memori Heap V8'),
          val: `${server.memory.heap_used_mb} / ${server.memory.heap_total_mb} MB (${heapPct}%)`,
        },
        { label: t('jpp:telemetry_topo_api_pid', 'ID Proses (PID)'), val: `PID ${server.pid} • v${server.node_version}` },
      ],
    },
    auth: {
      icon: Shield,
      title: stripLeadingEmoji(t('jpp:telemetry_topo_auth_title', 'Supabase Auth & RBAC Guard')),
      subtitle: t('jpp:telemetry_topo_auth_sub', 'Pengesahan token JWT sesi login pelajar dan kebenaran SUPER_ADMIN_JPP.'),
      route: '/login',
      stats: [
        { label: t('jpp:telemetry_topo_auth_session', 'Sesi Keselamatan'), val: 'JWT Bearer Active' },
        { label: t('jpp:telemetry_topo_auth_role_access', 'Akses Peranan'), val: 'SuperAdmin RBAC Enforced' },
        {
          label: t('jpp:telemetry_topo_auth_pending_acc', 'Akaun Menunggu'),
          val: t('jpp:telemetry_topo_accounts_unit', '{{count}} akaun', { count: diagnostics?.accounts?.pending || 0 }),
        },
      ],
    },
    commercial: {
      icon: ShoppingBag,
      title: stripLeadingEmoji(t('jpp:telemetry_topo_commercial_title', 'PolyMart & AI Nexus')),
      subtitle: t('jpp:telemetry_topo_commercial_sub', 'Ekosistem e-dagang siswa dan enjin kecerdasan buatan kampus.'),
      route: '/polymart',
      stats: [
        {
          label: t('jpp:telemetry_topo_orders_label', 'Pesanan PolyMart'),
          val: t('jpp:telemetry_topo_orders_unit', '{{count}} pesanan', { count: modules.polymart_orders || 0 }),
        },
        {
          label: t('jpp:telemetry_topo_stale_orders_label', 'Pesanan Tertunggak >48j'),
          val: t('jpp:telemetry_topo_orders_unit', '{{count}} pesanan', { count: pm?.pending_stale || 0 }),
        },
        {
          label: t('jpp:telemetry_topo_ai_tokens_label', 'Token AI Digunakan'),
          val: `${(modules.ai_tokens_used || 0).toLocaleString()} / ${(modules.ai_token_limit || 1000000).toLocaleString()}`,
        },
      ],
    },
    operations: {
      icon: Bike,
      title: stripLeadingEmoji(t('jpp:telemetry_topo_ops_title', 'PolyRider & e-Kebajikan')),
      subtitle: t('jpp:telemetry_topo_ops_sub', 'Logistik penghantaran makanan kampus dan hab aduan bantuan siswa.'),
      route: '/kebajikan',
      stats: [
        {
          label: t('jpp:telemetry_topo_trips_label', 'Trip PolyRider'),
          val: t('jpp:telemetry_topo_trips_unit', '{{count}} trip', { count: modules.polyrider_jobs || 0 }),
        },
        {
          label: t('jpp:telemetry_topo_sos_label', 'SOS Emergency Tersekat'),
          val: t('jpp:telemetry_topo_cases_unit', '{{count}} kes', { count: pr?.stuck_emergency || 0 }),
        },
        {
          label: t('jpp:telemetry_topo_tickets_label', 'Tiket e-Kebajikan'),
          val: t('jpp:telemetry_topo_tickets_stat', '{{total}} ({{breached}} SLA breached)', {
            total: modules.kebajikan_tickets || 0,
            breached: keb?.sla_breached || 0,
          }),
        },
      ],
    },
    db: {
      icon: Database,
      title: stripLeadingEmoji(t('jpp:telemetry_topo_db_title', 'PostgreSQL Cluster & WAL Watchdog')),
      subtitle: t('jpp:telemetry_topo_db_sub', 'Pangkalan data utama Supabase dengan pemantauan had WAL 2GB.'),
      route: '/jpp/telemetry',
      stats: [
        {
          label: t('jpp:telemetry_topo_active_conns_label', 'Sambungan Aktif'),
          val: `${db?.active_connections || 0} / ${db?.max_connections || 100} conns`,
        },
        {
          label: t('jpp:telemetry_topo_wal_retained_label', 'WAL Retained'),
          val: t('jpp:telemetry_topo_wal_retained_val', '{{mb}} MB (Had: 2,048 MB)', { mb: db?.wal_retained_mb || 0 }),
        },
        { label: t('jpp:telemetry_cache_hit_rate', 'Cache Hit Rate'), val: `${db?.cache_hit_rate_pct || 99.9}%` },
      ],
    },
  };

  // Static architectural connector colors (zero infinite SVG animations)
  const getPathColor = (toStatus: string) => {
    if (toStatus === 'critical') return '#E11D48';
    if (toStatus === 'warning') return '#D97706';
    return '#14B8A6';
  };

  const getPathOpacity = (fromId: string, toId: string) => {
    if (!activeNodeId) return 0.65;
    return activeNodeId === fromId || activeNodeId === toId ? 1 : 0.25;
  };

  const ActiveDetailIcon = activeNodeId && nodeDetails[activeNodeId] ? nodeDetails[activeNodeId].icon : null;

  return (
    <section className="bg-white dark:bg-[#13171D] rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] shadow-surface-sm p-5 sm:p-6 flex flex-col justify-between">
      {/* ── Header & View Toggles ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h3 className="text-base font-bold text-[#0B2420] dark:text-[#F1F5F9] tracking-tight [text-wrap:balance]">
            {t('jpp:telemetry_topo_header_title', 'Threat & Architecture Overview')}
          </h3>
          <p className="text-xs font-medium text-[#3B635C] dark:text-[#94A0B2] mt-0.5">
            {t('jpp:telemetry_topo_header_desc', 'Arkitektur Langsung JPP-POLISAS • Klik mana-mana nod untuk analisis')}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Mod Paparan Topologi"
          className="flex items-center gap-1 p-1 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] self-start sm:self-auto"
        >
          {(
            [
              { id: 'flow', label: t('jpp:telemetry_topo_tab_flow', 'Flow View') },
              { id: 'traffic', label: t('jpp:telemetry_topo_tab_traffic', 'Traffic') },
              { id: 'heatmap', label: t('jpp:telemetry_topo_tab_heatmap', 'Risk Heatmap') },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={viewMode === tab.id}
              onClick={() => {
                setViewMode(tab.id);
                setActiveNodeId(null);
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]',
                viewMode === tab.id
                  ? 'bg-[#0F766E] text-white dark:bg-[#1B2028] dark:text-[#2DD4BF] shadow-surface-sm'
                  : 'text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── View 1: Static Architectural Flow View ── */}
      {viewMode === 'flow' && (
        <div className="my-2">
          <div className="overflow-x-auto scrollbar-hide pb-2">
            <div className="relative py-8 min-w-[440px]">
              {/* Static Architectural SVG Bezier Connectors (zero infinite animation) */}
              <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 760 210">
                  <path
                    d="M 85 105 C 130 105, 140 105, 185 105"
                    fill="none"
                    stroke={getPathColor(nodeStatus.api)}
                    strokeOpacity={getPathOpacity('ingress', 'api')}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    className="transition-opacity duration-200"
                  />
                  <path
                    d="M 235 105 C 280 105, 290 105, 335 105"
                    fill="none"
                    stroke={getPathColor(nodeStatus.auth)}
                    strokeOpacity={getPathOpacity('api', 'auth')}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    className="transition-opacity duration-200"
                  />
                  <path
                    d="M 385 105 C 430 105, 450 55, 495 55"
                    fill="none"
                    stroke={getPathColor(nodeStatus.commercial)}
                    strokeOpacity={getPathOpacity('auth', 'commercial')}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    className="transition-opacity duration-200"
                  />
                  <path
                    d="M 385 105 C 430 105, 450 155, 495 155"
                    fill="none"
                    stroke={getPathColor(nodeStatus.operations)}
                    strokeOpacity={getPathOpacity('auth', 'operations')}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    className="transition-opacity duration-200"
                  />
                  <path
                    d="M 545 55 C 590 55, 610 105, 655 105"
                    fill="none"
                    stroke={getPathColor(nodeStatus.db)}
                    strokeOpacity={getPathOpacity('commercial', 'db')}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    className="transition-opacity duration-200"
                  />
                  <path
                    d="M 545 155 C 590 155, 610 105, 655 105"
                    fill="none"
                    stroke={getPathColor(nodeStatus.db)}
                    strokeOpacity={getPathOpacity('operations', 'db')}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    className="transition-opacity duration-200"
                  />
                </svg>
              </div>

              {/* ── 5 Interactive Architecture Nodes ── */}
              <div className="relative z-10 flex items-center justify-between gap-1.5 px-1 sm:px-2">
                {/* Node 1: Siswa Ingress */}
                <button
                  type="button"
                  aria-pressed={activeNodeId === 'ingress'}
                  onClick={() => setActiveNodeId(activeNodeId === 'ingress' ? null : 'ingress')}
                  className="flex flex-col items-center text-center group focus-visible:outline-none max-w-[84px]"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full border shadow-surface-sm flex items-center justify-center transition-[transform,border-color,background-color] duration-200 group-hover:scale-105 group-active:scale-[0.97] group-focus-visible:ring-2 group-focus-visible:ring-[#0F766E] dark:group-focus-visible:ring-[#2DD4BF]',
                      getNodeVisual(nodeStatus.ingress, activeNodeId === 'ingress').border,
                      getNodeVisual(nodeStatus.ingress, activeNodeId === 'ingress').ring
                    )}
                  >
                    <Globe className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9] mt-1.5 leading-tight">
                    {t('jpp:telemetry_topo_node_ingress', 'Siswa Ingress')}
                  </span>
                  <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal font-mono tabular-nums leading-tight">
                    {t('jpp:telemetry_topo_sessions_count', '{{count}} sesi', {
                      count: (modules.profiles || 0).toLocaleString(),
                    })}
                  </span>
                </button>

                {/* Node 2: Node.js API Gateway */}
                <button
                  type="button"
                  aria-pressed={activeNodeId === 'api'}
                  onClick={() => setActiveNodeId(activeNodeId === 'api' ? null : 'api')}
                  className="flex flex-col items-center text-center group relative focus-visible:outline-none max-w-[84px]"
                >
                  {apiBadge && (
                    <div className="absolute -top-7 whitespace-nowrap z-20">
                      <div
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-xs font-semibold border leading-tight flex items-center gap-1.5',
                          apiBadge.color
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', apiBadge.dot)} aria-hidden="true" />
                        <span>{apiBadge.text}</span>
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full border shadow-surface-sm flex items-center justify-center transition-[transform,border-color,background-color] duration-200 group-hover:scale-105 group-active:scale-[0.97] group-focus-visible:ring-2 group-focus-visible:ring-[#0F766E] dark:group-focus-visible:ring-[#2DD4BF]',
                      getNodeVisual(nodeStatus.api, activeNodeId === 'api').border,
                      getNodeVisual(nodeStatus.api, activeNodeId === 'api').ring
                    )}
                  >
                    <Server className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9] mt-1.5 leading-tight">
                    {t('jpp:telemetry_topo_node_api', 'Node.js API')}
                  </span>
                  <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal font-mono tabular-nums leading-tight">
                    {t('jpp:telemetry_topo_heap_pct', 'Heap {{pct}}%', { pct: heapPct })}
                  </span>
                </button>

                {/* Node 3: Auth & RBAC Shield */}
                <button
                  type="button"
                  aria-pressed={activeNodeId === 'auth'}
                  onClick={() => setActiveNodeId(activeNodeId === 'auth' ? null : 'auth')}
                  className="flex flex-col items-center text-center group focus-visible:outline-none max-w-[84px]"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full border shadow-surface-sm flex items-center justify-center transition-[transform,border-color,background-color] duration-200 group-hover:scale-105 group-active:scale-[0.97] group-focus-visible:ring-2 group-focus-visible:ring-[#0F766E] dark:group-focus-visible:ring-[#2DD4BF]',
                      getNodeVisual(nodeStatus.auth, activeNodeId === 'auth').border,
                      getNodeVisual(nodeStatus.auth, activeNodeId === 'auth').ring
                    )}
                  >
                    <Shield className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9] mt-1.5 leading-tight">
                    {t('jpp:telemetry_topo_node_auth', 'Supabase Auth')}
                  </span>
                  <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal leading-tight">
                    {t('jpp:telemetry_topo_rbac_guard', 'RBAC Guard')}
                  </span>
                </button>

                {/* Branching Column: PolyMart & AI (4a) + PolyRider & Kebajikan (4b) */}
                <div className="flex flex-col items-center gap-5">
                  {/* Node 4a: PolyMart & AI */}
                  <button
                    type="button"
                    aria-pressed={activeNodeId === 'commercial'}
                    onClick={() => setActiveNodeId(activeNodeId === 'commercial' ? null : 'commercial')}
                    className="flex flex-col items-center text-center group relative focus-visible:outline-none max-w-[92px]"
                  >
                    {commercialBadge && (
                      <div className="absolute -top-7 whitespace-nowrap z-20">
                        <div
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-xs font-semibold border leading-tight flex items-center gap-1.5',
                            commercialBadge.color
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', commercialBadge.dot)} aria-hidden="true" />
                          <span>{commercialBadge.text}</span>
                        </div>
                      </div>
                    )}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full border shadow-surface-sm flex items-center justify-center transition-[transform,border-color,background-color] duration-200 group-hover:scale-105 group-active:scale-[0.97] group-focus-visible:ring-2 group-focus-visible:ring-[#0F766E] dark:group-focus-visible:ring-[#2DD4BF]',
                        getNodeVisual(nodeStatus.commercial, activeNodeId === 'commercial').border,
                        getNodeVisual(nodeStatus.commercial, activeNodeId === 'commercial').ring
                      )}
                    >
                      <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9] mt-1.5 leading-tight">
                      {t('jpp:telemetry_topo_node_commercial', 'PolyMart & AI')}
                    </span>
                    <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal font-mono tabular-nums leading-tight">
                      {t('jpp:telemetry_topo_orders_unit', '{{count}} pesanan', { count: modules.polymart_orders || 0 })}
                    </span>
                  </button>

                  {/* Node 4b: PolyRider & Kebajikan */}
                  <button
                    type="button"
                    aria-pressed={activeNodeId === 'operations'}
                    onClick={() => setActiveNodeId(activeNodeId === 'operations' ? null : 'operations')}
                    className="flex flex-col items-center text-center group relative focus-visible:outline-none max-w-[92px]"
                  >
                    {operationsBadge && (
                      <div className="absolute -top-7 whitespace-nowrap z-20">
                        <div
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-xs font-semibold border leading-tight flex items-center gap-1.5',
                            operationsBadge.color
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', operationsBadge.dot)} aria-hidden="true" />
                          <span>{operationsBadge.text}</span>
                        </div>
                      </div>
                    )}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full border shadow-surface-sm flex items-center justify-center transition-[transform,border-color,background-color] duration-200 group-hover:scale-105 group-active:scale-[0.97] group-focus-visible:ring-2 group-focus-visible:ring-[#0F766E] dark:group-focus-visible:ring-[#2DD4BF]',
                        getNodeVisual(nodeStatus.operations, activeNodeId === 'operations').border,
                        getNodeVisual(nodeStatus.operations, activeNodeId === 'operations').ring
                      )}
                    >
                      <Bike className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9] mt-1.5 leading-tight">
                      {t('jpp:telemetry_topo_node_operations', 'Rider & Kebajikan')}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-normal font-mono tabular-nums leading-tight',
                        nodeStatus.operations === 'critical'
                          ? 'text-rose-700 dark:text-rose-300 font-semibold'
                          : 'text-[#3B635C] dark:text-[#94A0B2]'
                      )}
                    >
                      {nodeStatus.operations === 'critical'
                        ? t('jpp:telemetry_topo_attention_needed', 'Perhatian Diperlukan')
                        : t('jpp:telemetry_topo_trips_unit', '{{count}} trip', { count: modules.polyrider_jobs || 0 })}
                    </span>
                  </button>
                </div>

                {/* Node 5: PostgreSQL Cluster & WAL */}
                <button
                  type="button"
                  aria-pressed={activeNodeId === 'db'}
                  onClick={() => setActiveNodeId(activeNodeId === 'db' ? null : 'db')}
                  className="flex flex-col items-center text-center group relative focus-visible:outline-none max-w-[88px]"
                >
                  {dbBadge && (
                    <div className="absolute -top-7 whitespace-nowrap z-20">
                      <div
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-xs font-semibold border leading-tight flex items-center gap-1.5',
                          dbBadge.color
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', dbBadge.dot)} aria-hidden="true" />
                        <span>{dbBadge.text}</span>
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full border shadow-surface-sm flex items-center justify-center transition-[transform,border-color,background-color] duration-200 group-hover:scale-105 group-active:scale-[0.97] group-focus-visible:ring-2 group-focus-visible:ring-[#0F766E] dark:group-focus-visible:ring-[#2DD4BF]',
                      getNodeVisual(nodeStatus.db, activeNodeId === 'db').border,
                      getNodeVisual(nodeStatus.db, activeNodeId === 'db').ring
                    )}
                  >
                    <Database className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9] mt-1.5 leading-tight">
                    {t('jpp:telemetry_topo_node_db', 'PostgreSQL DB')}
                  </span>
                  <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal font-mono tabular-nums leading-tight">
                    {t('jpp:telemetry_topo_conns_unit', '{{active}}/{{max}} conns', {
                      active: db?.active_connections || 0,
                      max: db?.max_connections || 100,
                    })}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Dynamic Drilldown Inspector Panel when Node is Selected ── */}
          <AnimatePresence>
            {activeNodeId && nodeDetails[activeNodeId] && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="mt-4 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] p-4 text-left relative"
              >
                <button
                  type="button"
                  onClick={() => setActiveNodeId(null)}
                  aria-label={t('jpp:telemetry_close_btn', 'Tutup')}
                  className="absolute top-3 right-3 p-1 rounded-lg text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] hover:text-[#0B2420] dark:hover:text-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-8">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {ActiveDetailIcon && (
                      <div className="w-8 h-8 rounded-lg bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] flex items-center justify-center text-[#0F766E] dark:text-[#2DD4BF] shrink-0 mt-0.5">
                        <ActiveDetailIcon className="w-4 h-4" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#0B2420] dark:text-[#F1F5F9]">
                        {nodeDetails[activeNodeId].title}
                      </h4>
                      <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-0.5">
                        {nodeDetails[activeNodeId].subtitle}
                      </p>
                    </div>
                  </div>

                  {nodeDetails[activeNodeId].route && onFilterTimelineByRoute && (
                    <button
                      type="button"
                      onClick={() => onFilterTimelineByRoute(nodeDetails[activeNodeId].route!)}
                      className="text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] hover:underline flex items-center gap-1.5 bg-[#EBF7F4] dark:bg-[#1B2028] px-3 py-1.5 rounded-lg border border-[#B8E4DC] dark:border-[#252B35] self-start sm:self-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
                    >
                      <span>{t('jpp:telemetry_topo_filter_module_errors', 'Tapis Ralat Modul Ini')}</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-[#B8E4DC]/60 dark:border-[#252B35]">
                  {nodeDetails[activeNodeId].stats.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35]"
                    >
                      <span className="text-xs font-medium text-[#3B635C] dark:text-[#94A0B2] block">
                        {s.label}
                      </span>
                      <span className="text-xs font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums mt-0.5 block">
                        {s.val}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Status Legend ── */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4 pt-3 text-xs font-medium text-[#3B635C] dark:text-[#94A0B2] border-t border-[#B8E4DC]/60 dark:border-[#252B35]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
              {t('jpp:telemetry_topo_legend_optimal', 'Optimal')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400" aria-hidden="true" />
              {t('jpp:telemetry_topo_legend_threshold', 'Amaran Threshold')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-400" aria-hidden="true" />
              {t('jpp:telemetry_topo_legend_critical', 'Kritikal / Broken')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF]" aria-hidden="true" />
              {t('jpp:telemetry_topo_legend_live_flow', 'Aliran Langsung')}
            </span>
          </div>
        </div>
      )}

      {/* ── View 2: Traffic View ── */}
      {viewMode === 'traffic' && (
        <div className="py-4 space-y-3.5">
          {[
            {
              label: t('jpp:telemetry_topo_traffic_polymart', 'Pesanan PolyMart'),
              count: modules.polymart_orders || 0,
              max: 200,
              color: 'bg-[#0F766E] dark:bg-[#2DD4BF]',
            },
            {
              label: t('jpp:telemetry_topo_traffic_polyrider', 'Trip PolyRider'),
              count: modules.polyrider_jobs || 0,
              max: 200,
              color: 'bg-sky-600 dark:bg-sky-400',
            },
            {
              label: t('jpp:telemetry_topo_traffic_kebajikan', 'Tiket e-Kebajikan'),
              count: modules.kebajikan_tickets || 0,
              max: 100,
              color: 'bg-amber-600 dark:bg-amber-400',
            },
            {
              label: t('jpp:telemetry_topo_traffic_ai', 'Token AI Assistant'),
              count: modules.ai_tokens_used || 0,
              max: modules.ai_token_limit || 1000000,
              color: 'bg-emerald-600 dark:bg-emerald-400',
            },
          ].map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                <span>{item.label}</span>
                <span className="font-mono tabular-nums text-[#3B635C] dark:text-[#94A0B2]">
                  {item.count.toLocaleString()}
                </span>
              </div>
              <div className="h-2 w-full bg-[#EBF7F4] dark:bg-[#1B2028] rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', item.color)}
                  style={{ width: `${Math.min((item.count / Math.max(item.max, 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── View 3: Risk Heatmap ── */}
      {viewMode === 'heatmap' && (
        <div className="py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            {
              name: t('jpp:telemetry_topo_hm_nodejs', 'Node.js Engine'),
              status: nodeStatus.api,
              detail: `${server.memory.heap_used_mb}MB Heap`,
            },
            {
              name: t('jpp:telemetry_topo_hm_pgpool', 'PostgreSQL Pool'),
              status: nodeStatus.db,
              detail: `${db?.active_connections || 0}/${db?.max_connections || 100} Conns`,
            },
            {
              name: t('jpp:telemetry_topo_hm_wal', 'WAL Watchdog'),
              status: nodeStatus.db,
              detail: `${db?.wal_retained_mb || 0}MB / 2GB`,
            },
            {
              name: t('jpp:telemetry_topo_hm_polymart', 'PolyMart Orders'),
              status: nodeStatus.commercial,
              detail: t('jpp:telemetry_topo_hm_pending', '{{count}} Tertunggak', { count: pm?.pending_stale || 0 }),
            },
            {
              name: t('jpp:telemetry_topo_hm_polyrider', 'PolyRider SOS'),
              status: nodeStatus.operations,
              detail: t('jpp:telemetry_topo_hm_emergency', '{{count}} Kecemasan', { count: pr?.stuck_emergency || 0 }),
            },
            {
              name: t('jpp:telemetry_topo_hm_kebajikan', 'e-Kebajikan SLA'),
              status: nodeStatus.operations,
              detail: t('jpp:telemetry_topo_hm_sla_breached', '{{count}} Melepasi SLA', {
                count: keb?.sla_breached || 0,
              }),
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className={cn(
                'p-3.5 rounded-xl border',
                item.status === 'critical'
                  ? 'border-rose-300 dark:border-rose-500/35 bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200'
                  : item.status === 'warning'
                  ? 'border-amber-300 dark:border-amber-500/35 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200'
                  : 'border-[#B8E4DC] dark:border-[#252B35] bg-[#F6FBF9] dark:bg-[#0E1116] text-[#0B2420] dark:text-[#F1F5F9]'
              )}
            >
              <span className="text-xs font-semibold block">{item.name}</span>
              <span className="text-xs font-mono tabular-nums mt-1 block opacity-85">{item.detail}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
