import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  FileCode,
  Globe,
  AlertTriangle,
  Bug,
  ShieldCheck,
} from 'lucide-react';
import { UnifiedTimelineEvent } from './telemetryTypes';
import { cn } from '@/lib/utils';

interface TelemetryLiveTimelineProps {
  events: UnifiedTimelineEvent[];
  loading?: boolean;
  onViewAllClick?: () => void;
}

export const TelemetryLiveTimeline: React.FC<TelemetryLiveTimelineProps> = ({
  events,
  loading = false,
  onViewAllClick,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'error' | 'warning'>('all');

  const filteredEvents = events.filter((ev) => {
    if (filter === 'critical') return ev.severity === 'CRITICAL';
    if (filter === 'error') return ev.badge === 'ERROR';
    if (filter === 'warning') return ev.severity === 'WARNING';
    return true;
  });

  const displayEvents = filteredEvents.slice(0, 10);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDotStyle = (ev: UnifiedTimelineEvent) => {
    if (ev.severity === 'CRITICAL') return 'bg-rose-500 ring-rose-200';
    if (ev.badge === 'ERROR') return 'bg-red-500 ring-red-200';
    if (ev.severity === 'WARNING') return 'bg-amber-500 ring-amber-200';
    return 'bg-emerald-500 ring-emerald-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between h-full">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Live Timeline
            </h3>
            <p className="text-[10px] font-bold text-slate-400">
              Penjejak Ralat & Halaman Bermasalah
            </p>
          </div>
          <button
            onClick={onViewAllClick}
            className="text-xs font-black text-[#FF5B37] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* ── Filter Pills ── */}
        <div className="flex items-center gap-1.5 pt-3 pb-2 overflow-x-auto">
          {[
            { id: 'all', label: 'Semua', count: events.length },
            {
              id: 'critical',
              label: 'Kritikal',
              count: events.filter((e) => e.severity === 'CRITICAL').length,
            },
            {
              id: 'error',
              label: 'Error',
              count: events.filter((e) => e.badge === 'ERROR').length,
            },
            {
              id: 'warning',
              label: 'Amaran',
              count: events.filter((e) => e.severity === 'WARNING').length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1',
                filter === tab.id
                  ? 'bg-slate-900 text-white font-black shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={cn(
                    'px-1 py-0.2 rounded-full text-[8px] font-mono',
                    filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Event Stream with Detailed Page Badge ── */}
      <div className="relative flex-1 py-2 my-2 overflow-y-auto max-h-[500px] pr-1">
        {/* Vertical Rail Line */}
        <div className="absolute left-[6px] top-3 bottom-6 w-[2px] bg-slate-100" />

        <div className="space-y-4 relative z-10">
          {displayEvents.length === 0 ? (
            <div className="text-center py-10">
              <ShieldCheck className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-700">Tiada Ralat Dikesan</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Semua halaman dan subsistem beroperasi dengan lancar.
              </p>
            </div>
          ) : (
            displayEvents.map((ev, i) => {
              const isExpanded = expandedId === ev.id;
              const hasDetails = !!(ev.stack || ev.endpoint || ev.filename);

              return (
                <div
                  key={ev.id || i}
                  className="flex items-start gap-2.5 pl-0 group text-left"
                >
                  {/* Dot Node */}
                  <div className="mt-1 flex items-center justify-center shrink-0">
                    <span
                      className={cn(
                        'w-3 h-3 rounded-full ring-4 shadow-2xs',
                        getDotStyle(ev)
                      )}
                    />
                  </div>

                  {/* Card Container */}
                  <div
                    onClick={() => hasDetails && setExpandedId(isExpanded ? null : ev.id)}
                    className={cn(
                      'min-w-0 flex-1 p-2.5 rounded-xl border transition-all cursor-pointer',
                      isExpanded
                        ? 'bg-slate-50 border-slate-300 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                    )}
                  >
                    {/* Header: Page Badge & Time */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      {/* Highlighted Page Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono bg-blue-50 text-blue-700 border border-blue-200/80 max-w-[200px] truncate">
                        <span>📄</span>
                        <span className="truncate">{ev.pagePath || '/'}</span>
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={cn(
                            'text-[8px] font-black uppercase px-1.5 py-0.5 rounded',
                            ev.severity === 'CRITICAL' || ev.badge === 'ERROR'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          )}
                        >
                          {ev.badge || ev.severity}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {new Date(ev.timestamp).toLocaleTimeString('ms-MY', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Friendly Page Title */}
                    {ev.pageTitle && (
                      <p className="text-[10px] font-bold text-slate-500 mb-0.5">
                        {ev.pageTitle}
                      </p>
                    )}

                    {/* Real Error Message */}
                    <p className="text-xs font-black text-slate-900 leading-snug break-words">
                      {ev.title}
                    </p>

                    {/* Script Filename if available */}
                    {ev.filename && (
                      <p className="text-[9px] text-slate-400 font-mono mt-1 truncate flex items-center gap-1">
                        <FileCode className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{ev.filename.split('/').pop()}</span>
                      </p>
                    )}

                    {/* Expand/Collapse Indicator */}
                    {hasDetails && (
                      <div className="mt-1 flex items-center justify-between text-[9px] font-bold text-slate-400 pt-1 border-t border-slate-100">
                        <span>{isExpanded ? 'Sembunyikan Butiran' : 'Klik untuk Jejak Penuh'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    )}

                    {/* ── Expanded Drawer ── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, }}
                          animate={{ opacity: 1, }}
                          exit={{ opacity: 0, }}
                          className="mt-2.5 pt-2 border-t border-slate-200 space-y-2 text-[10px]"
                        >
                          {/* Full URL Path */}
                          {ev.endpoint && (
                            <div>
                              <span className="font-bold text-slate-500 block">URL Halaman:</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <code className="p-1 rounded bg-slate-100 text-slate-800 font-mono text-[9px] break-all flex-1">
                                  {ev.endpoint}
                                </code>
                                {ev.endpoint.startsWith('http') && (
                                  <a
                                    href={ev.endpoint}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                                    title="Buka Halaman Ini"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Full Stack Trace */}
                          {ev.stack && (
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-bold text-slate-500">Call Stack:</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(ev.id, ev.stack || '');
                                  }}
                                  className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                                >
                                  {copiedId === ev.id ? (
                                    <>
                                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                                      <span className="text-emerald-600">Disalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-2.5 h-2.5" />
                                      <span>Salin</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className="p-2 rounded bg-slate-900 text-slate-200 font-mono text-[8px] max-h-32 overflow-y-auto whitespace-pre-wrap leading-tight">
                                {ev.stack}
                              </pre>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
