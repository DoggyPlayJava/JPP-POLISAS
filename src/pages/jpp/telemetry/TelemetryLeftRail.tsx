import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  AlertTriangle,
  Server,
  Cpu,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { TelemetryData } from './telemetryTypes';
import { formatUptime, getRatingTheme } from './telemetryUtils';
import { cn } from '@/lib/utils';

interface TelemetryLeftRailProps {
  data: TelemetryData;
  onRefresh: () => void;
  loading: boolean;
  totalAlertsCount: number;
}

export const TelemetryLeftRail: React.FC<TelemetryLeftRailProps> = ({
  data,
  onRefresh,
  loading,
  totalAlertsCount,
}) => {
  const { resilience_score, resilience_rating, resilience_deductions, server } = data;
  const theme = getRatingTheme(resilience_rating);
  const heapPct = server?.memory?.heap_total_mb
    ? Math.round((server.memory.heap_used_mb / server.memory.heap_total_mb) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* ── 1. Executive Status Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[1.75rem] border border-slate-200/90 dark:border-white/[0.07] bg-white/95 dark:bg-[#0E1118]/90 p-5 shadow-xs backdrop-blur-md relative overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-[#EA580C] dark:text-[#FB923C] flex items-center justify-center font-black text-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                Pusat Kawalan
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/35">
                Super Admin JPP
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-white/60 font-medium leading-relaxed mb-4">
          {totalAlertsCount > 0
            ? `Terdapat ${totalAlertsCount} amaran aktif memerlukan pengesahan dan tindakan mitigasi pentadbir.`
            : 'Seluruh ekosistem digital JPP-POLISAS beroperasi pada integriti optimum tanpa kegagalan dikesan.'}
        </p>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black tracking-wide text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          {loading ? 'Menyegerak Data...' : 'Imbas Semula Telemetri'}
        </button>
      </motion.div>

      {/* ── 2. Resilience Score (Single Source of Truth from backend) ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[1.75rem] border border-slate-200/90 dark:border-white/[0.07] bg-white/95 dark:bg-[#0E1118]/90 p-5 shadow-xs backdrop-blur-md"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/35">
            Skor Ketahanan Sistem
          </span>
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border',
              theme.bg,
              theme.text,
              theme.border
            )}
          >
            {resilience_rating}
          </span>
        </div>

        <div className="flex items-baseline gap-2 my-2">
          <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
            {resilience_score}
          </span>
          <span className="text-sm font-bold text-slate-400 dark:text-white/30">/ 100</span>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-white/45 font-medium mb-3">
          {theme.sub}
        </p>

        {/* Deductions from backend if any */}
        {resilience_deductions && resilience_deductions.length > 0 ? (
          <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-white/30 block mb-1">
              Faktor Tolak-Mata Backend:
            </span>
            {resilience_deductions.map((ded, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-[11px] rounded-lg bg-rose-500/5 dark:bg-rose-500/10 px-2 py-1 border border-rose-500/10 text-rose-700 dark:text-rose-300"
              >
                <span className="truncate pr-2 font-medium">{ded.label}</span>
                <span className="font-black shrink-0 font-mono">{ded.points}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Tiada penalti — metrik sistem 100% optimum</span>
          </div>
        )}
      </motion.div>

      {/* ── 3. Server Process & Memory Metrics ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[1.75rem] border border-slate-200/90 dark:border-white/[0.07] bg-white/95 dark:bg-[#0E1118]/90 p-5 shadow-xs backdrop-blur-md space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/35">
              Enjin Node.js
            </span>
          </div>
          <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-white/30">
            PID {server.pid} • v{server.node_version}
          </span>
        </div>

        {/* Uptime Proses (Transparent labelling) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-white/40">
              Uptime Proses API
            </span>
            <span className="text-[10px] font-black font-mono text-emerald-600 dark:text-emerald-400">
              BERJALAN
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
            {formatUptime(server.uptime_seconds)}
          </p>
          <p className="text-[9px] text-slate-400 dark:text-white/25 mt-0.5">
            Masa aktif proses Express API sejak deploy terkini.
          </p>
        </div>

        {/* Heap Memory usage */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-white/40">
              Memori Heap (V8)
            </span>
            <span
              className={cn(
                'text-[10px] font-black font-mono',
                heapPct > 80 ? 'text-rose-500' : 'text-blue-600 dark:text-blue-400'
              )}
            >
              {heapPct}%
            </span>
          </div>
          <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
            {server.memory.heap_used_mb}{' '}
            <span className="text-xs text-slate-400 dark:text-white/30 font-medium">
              / {server.memory.heap_total_mb} MB
            </span>
          </p>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-white/[0.08] rounded-full overflow-hidden mt-1.5">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                heapPct > 80 ? 'bg-rose-500' : 'bg-blue-500'
              )}
              style={{ width: `${Math.min(heapPct, 100)}%` }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
