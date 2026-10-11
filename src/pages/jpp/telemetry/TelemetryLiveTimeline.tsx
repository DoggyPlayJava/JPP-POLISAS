import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  AlertTriangle,
  Bug,
  ShieldCheck,
  Filter,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { UnifiedTimelineEvent } from './telemetryTypes';
import { cn } from '@/lib/utils';

interface TelemetryLiveTimelineProps {
  events: UnifiedTimelineEvent[];
  loading?: boolean;
}

type FilterCategory = 'all' | 'critical' | 'warning' | 'system';

export const TelemetryLiveTimeline: React.FC<TelemetryLiveTimelineProps> = ({
  events,
  loading = false,
}) => {
  const [filter, setFilter] = useState<FilterCategory>('all');

  const filteredEvents = events.filter((ev) => {
    if (filter === 'critical') return ev.severity === 'CRITICAL';
    if (filter === 'warning') return ev.severity === 'WARNING';
    if (filter === 'system') return ev.type === 'system' || ev.severity === 'INFO';
    return true;
  });

  const criticalCount = events.filter((e) => e.severity === 'CRITICAL').length;
  const warningCount = events.filter((e) => e.severity === 'WARNING').length;

  return (
    <div className="rounded-[1.75rem] border border-slate-200/90 dark:border-white/[0.07] bg-white/95 dark:bg-[#0E1118]/90 p-5 shadow-xs backdrop-blur-md space-y-4 flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
            Kronologi Insiden & Log
          </h2>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-white/30">
          {filteredEvents.length} Peristiwa
        </span>
      </div>

      {/* ── Filter Pills: [Semua] [Kritikal] [Amaran] [Sistem] ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { id: 'all', label: 'Semua', count: events.length },
          { id: 'critical', label: 'Kritikal', count: criticalCount, badgeColor: 'bg-rose-500 text-white' },
          { id: 'warning', label: 'Amaran', count: warningCount, badgeColor: 'bg-amber-500 text-white' },
          { id: 'system', label: 'Sistem', count: events.filter((e) => e.type === 'system').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as FilterCategory)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5',
              filter === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={cn(
                  'px-1 py-0.2 rounded-full text-[8px] font-mono font-black',
                  filter === tab.id
                    ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                    : tab.badgeColor || 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white/60'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Timeline Events Stream ── */}
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[560px] pr-1">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 px-4">
            <ShieldCheck className="w-8 h-8 text-emerald-400 dark:text-emerald-500/50 mx-auto mb-2" />
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Tiada Rekod Mengikut Kategori
            </p>
            <p className="text-[11px] text-slate-400 dark:text-white/30 mt-1">
              Tiada amaran atau ralat sepadan dengan penapis ini.
            </p>
          </div>
        ) : (
          filteredEvents.map((ev, i) => {
            const isCrit = ev.severity === 'CRITICAL';
            const isWarn = ev.severity === 'WARNING';

            return (
              <motion.div
                key={ev.id || i}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                className={cn(
                  'rounded-xl border p-3 transition-all relative overflow-hidden',
                  isCrit
                    ? 'border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10'
                    : isWarn
                    ? 'border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10'
                    : 'border-slate-200/80 dark:border-white/[0.06] bg-slate-50/60 dark:bg-white/[0.02]'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        isCrit ? 'bg-rose-500 animate-pulse' : isWarn ? 'bg-amber-500' : 'bg-blue-500'
                      )}
                    />
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-white/40">
                      {ev.source}
                    </span>
                    {ev.endpoint && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-white/70">
                        {ev.endpoint}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0',
                      isCrit
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                        : isWarn
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                    )}
                  >
                    {ev.badge}
                  </span>
                </div>

                <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug break-words">
                  {ev.title}
                </p>

                {ev.subtitle && (
                  <p className="text-[10px] text-slate-500 dark:text-white/40 truncate mt-1 font-mono">
                    {ev.subtitle}
                  </p>
                )}

                <p className="text-[9px] text-slate-400 dark:text-white/25 mt-1.5 font-mono">
                  {new Date(ev.timestamp).toLocaleTimeString('ms-MY', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}{' '}
                  •{' '}
                  {new Date(ev.timestamp).toLocaleDateString('ms-MY', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </p>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
