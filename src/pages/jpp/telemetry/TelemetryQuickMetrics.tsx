import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Server,
  BrainCircuit,
  Zap,
  TrendingUp,
  CheckCircle2,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { TelemetryData } from './telemetryTypes';
import { formatUptime } from './telemetryUtils';
import { cn } from '@/lib/utils';

interface TelemetryQuickMetricsProps {
  data: TelemetryData;
}

export const TelemetryQuickMetrics: React.FC<TelemetryQuickMetricsProps> = ({ data }) => {
  const { server, modules, diagnostics } = data;
  const db = diagnostics?.database;
  const keb = diagnostics?.kebajikan;
  const pm = diagnostics?.polymart;
  const pr = diagnostics?.polyrider;
  const ai = diagnostics?.ai;

  const dbConnPct = db?.max_connections
    ? Math.round(((db.active_connections || 0) / db.max_connections) * 100)
    : 0;

  const walPct = Math.min(Math.round(((db?.wal_retained_mb || 0) / 2048) * 100), 100);

  const aiPct = Math.min(Math.round(ai?.usage_pct || 0), 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* ── Kad 1: Amaran & Bottleneck Utama ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="rounded-2xl border border-slate-200/90 dark:border-white/[0.07] bg-white/95 dark:bg-[#0E1118]/90 p-4 shadow-xs backdrop-blur-md flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-white/35">
            Bottleneck Terkini
          </span>
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="space-y-2 mb-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-white/60 font-medium">SLA Kebajikan</span>
            <span
              className={cn(
                'font-black font-mono',
                (keb?.sla_breached || 0) > 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {(keb?.sla_breached || 0) > 0 ? `${keb?.sla_breached} Pecah ⚠️` : '0 Breached'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-white/60 font-medium">PolyMart Basi</span>
            <span
              className={cn(
                'font-black font-mono',
                (pm?.pending_stale || 0) > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'
              )}
            >
              {pm?.pending_stale || 0} &gt;48j
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-white/60 font-medium">PolyRider SOS</span>
            <span
              className={cn(
                'font-black font-mono',
                (pr?.stuck_emergency || 0) > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'
              )}
            >
              {(pr?.stuck_emergency || 0) > 0 ? `${pr?.stuck_emergency} Tersekat 🚨` : '0 Stuck'}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[9px] text-slate-400 dark:text-white/30 font-bold uppercase tracking-wider">
          <span>Status Triage</span>
          <span>Diperiksa Setiap Minit</span>
        </div>
      </motion.div>

      {/* ── Kad 2: Kesihatan Pangkalan Data ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="rounded-2xl border border-slate-200/90 dark:border-white/[0.07] bg-white/95 dark:bg-[#0E1118]/90 p-4 shadow-xs backdrop-blur-md flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-white/35">
            Database & WAL
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <HardDrive className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="space-y-2 mb-2">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-white/60 font-medium">Sambungan DB</span>
              <span className="font-black font-mono text-slate-900 dark:text-white">
                {db?.active_connections || 0} / {db?.max_connections || 100}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', dbConnPct > 80 ? 'bg-rose-500' : 'bg-emerald-500')}
                style={{ width: `${Math.min(dbConnPct, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-white/60 font-medium">WAL Retained</span>
              <span className="font-black font-mono text-slate-900 dark:text-white">
                {db?.wal_retained_mb || 0} MB
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  (db?.wal_retained_mb || 0) > 1024
                    ? 'bg-rose-500'
                    : (db?.wal_retained_mb || 0) > 512
                    ? 'bg-amber-500'
                    : 'bg-violet-500'
                )}
                style={{ width: `${walPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[9px] text-slate-400 dark:text-white/30 font-bold uppercase tracking-wider">
          <span>Had WAL: 2,048 MB</span>
          <span>{db?.cache_hit_rate_pct || 99}% Cache Hit</span>
        </div>
      </motion.div>

      {/* ── Kad 3: Kepintaran AI Nexus ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="rounded-2xl border border-slate-200/90 dark:border-white/[0.07] bg-white/95 dark:bg-[#0E1118]/90 p-4 shadow-xs backdrop-blur-md flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-white/35">
            Enjin Kepintaran AI
          </span>
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <BrainCircuit className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="space-y-2 mb-2">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600 dark:text-white/60 font-medium">Penggunaan Kuota</span>
              <span className="font-black font-mono text-slate-900 dark:text-white">
                {aiPct}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', aiPct > 90 ? 'bg-rose-500' : 'bg-purple-500')}
                style={{ width: `${aiPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-white/60 font-medium">Token Digunakan</span>
            <span className="font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {(modules.ai_tokens_used || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-white/60 font-medium">Log Interaksi</span>
            <span className="font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {(modules.ai_usage_logs || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[9px] text-slate-400 dark:text-white/30 font-bold uppercase tracking-wider">
          <span>Had: {(modules.ai_token_limit || 1000000).toLocaleString()}</span>
          <span>Nexus Gemini</span>
        </div>
      </motion.div>

      {/* ── Kad 4: Automasi & Snapshot ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="rounded-2xl border border-slate-200/90 dark:border-white/[0.07] bg-white/95 dark:bg-[#0E1118]/90 p-4 shadow-xs backdrop-blur-md flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-white/35">
            Automasi & Rekod
          </span>
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="space-y-2 mb-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-white/60 font-medium">Snapshot Cron</span>
            <span className="font-black font-mono text-emerald-600 dark:text-emerald-400">
              03:00 AM (Harian)
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-white/60 font-medium">Data Terkumpul</span>
            <span className="font-black font-mono text-slate-900 dark:text-white">
              {(data.snapshots || []).length} Hari
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-white/60 font-medium">Push Subscriptions</span>
            <span className="font-black font-mono text-cyan-600 dark:text-cyan-400">
              {modules.push_subscriptions || 0}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[9px] text-slate-400 dark:text-white/30 font-bold uppercase tracking-wider">
          <span>Notifikasi Terhantar</span>
          <span className="font-mono">{(modules.notifications || 0).toLocaleString()}</span>
        </div>
      </motion.div>
    </div>
  );
};
