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
  ShieldCheck,
  X,
} from 'lucide-react';
import { UnifiedTimelineEvent } from './telemetryTypes';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface TelemetryLiveTimelineProps {
  events: UnifiedTimelineEvent[];
  loading?: boolean;
  routeFilter?: string | null;
  onClearRouteFilter?: () => void;
  onViewAllClick?: () => void;
}

export const TelemetryLiveTimeline: React.FC<TelemetryLiveTimelineProps> = ({
  events,
  routeFilter = null,
  onClearRouteFilter,
  onViewAllClick,
}) => {
  const { t, i18n } = useTranslation(['jpp', 'common']);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'error' | 'warning'>('all');

  const routeScopedEvents = routeFilter
    ? events.filter((ev) => (ev.pagePath || '').startsWith(routeFilter) || (ev.endpoint || '').includes(routeFilter))
    : events;

  const filteredEvents = routeScopedEvents.filter((ev) => {
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
    if (ev.severity === 'CRITICAL') return 'bg-rose-600 dark:bg-rose-400 ring-rose-500/20';
    if (ev.badge === 'ERROR') return 'bg-rose-500 dark:bg-rose-400 ring-rose-500/20';
    if (ev.severity === 'WARNING') return 'bg-amber-500 dark:bg-amber-400 ring-amber-500/20';
    return 'bg-[#0F766E] dark:bg-[#2DD4BF] ring-[#0F766E]/20 dark:ring-[#2DD4BF]/20';
  };

  return (
    <aside className="bg-white dark:bg-[#13171D] rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] shadow-surface-sm p-5 flex flex-col justify-between h-full">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#B8E4DC]/60 dark:border-[#252B35]">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#0B2420] dark:text-[#F1F5F9] tracking-tight">
              {t('jpp:telemetry_timeline_title', 'Live Timeline')}
            </h3>
            <p className="text-xs font-medium text-[#3B635C] dark:text-[#94A0B2]">
              {t('jpp:telemetry_timeline_subtitle', 'Penjejak Ralat & Halaman Bermasalah')}
            </p>
          </div>
          {onViewAllClick && (
            <button
              type="button"
              onClick={onViewAllClick}
              className="text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] hover:underline flex items-center gap-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF] rounded"
            >
              <span>{t('jpp:telemetry_timeline_view_all', 'View All')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Active Route Filter Banner */}
        {routeFilter && onClearRouteFilter && (
          <div className="mt-3 px-3 py-1.5 rounded-lg bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] flex items-center justify-between gap-2 text-xs">
            <span className="font-mono font-medium text-[#0F766E] dark:text-[#2DD4BF] truncate">
              Route: {routeFilter}
            </span>
            <button
              type="button"
              onClick={onClearRouteFilter}
              aria-label={t('jpp:telemetry_close_btn', 'Tutup')}
              className="p-0.5 rounded text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ── Filter Pills ── */}
        <div className="flex items-center gap-1.5 pt-3 pb-2 overflow-x-auto scrollbar-hide">
          {[
            { id: 'all', label: t('jpp:telemetry_filter_all', 'Semua'), count: routeScopedEvents.length },
            {
              id: 'critical',
              label: t('jpp:telemetry_filter_critical', 'Kritikal'),
              count: routeScopedEvents.filter((e) => e.severity === 'CRITICAL').length,
            },
            {
              id: 'error',
              label: t('jpp:telemetry_filter_error', 'Error'),
              count: routeScopedEvents.filter((e) => e.badge === 'ERROR').length,
            },
            {
              id: 'warning',
              label: t('jpp:telemetry_filter_warning', 'Amaran'),
              count: routeScopedEvents.filter((e) => e.severity === 'WARNING').length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]',
                filter === tab.id
                  ? 'bg-[#0F766E] text-white dark:bg-[#2DD4BF] dark:text-[#090B0E]'
                  : 'bg-[#F6FBF9] dark:bg-[#1B2028] text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#232933]'
              )}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs font-mono tabular-nums leading-none',
                    filter === tab.id
                      ? 'bg-white/20 text-white dark:bg-[#090B0E]/20 dark:text-[#090B0E]'
                      : 'bg-white dark:bg-[#0E1116] text-[#0B2420] dark:text-[#F1F5F9]'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Event Stream ── */}
      <div className="relative flex-1 py-2 my-2 overflow-y-auto overscroll-contain max-h-[500px] pr-1">
        {/* Vertical Rail Line */}
        <div className="absolute left-[6px] top-3 bottom-6 w-[2px] bg-[#B8E4DC]/60 dark:bg-[#252B35]" aria-hidden="true" />

        <div className="space-y-3.5 relative z-10">
          {displayEvents.length === 0 ? (
            <div className="text-center py-10">
              <ShieldCheck className="w-7 h-7 text-[#0F766E] dark:text-[#2DD4BF] mx-auto mb-2" aria-hidden="true" />
              <p className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                {t('jpp:telemetry_no_errors_title', 'Tiada Ralat Dikesan')}
              </p>
              <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-1">
                {t('jpp:telemetry_no_errors_desc', 'Semua halaman dan subsistem beroperasi dengan lancar.')}
              </p>
            </div>
          ) : (
            displayEvents.map((ev, i) => {
              const isExpanded = expandedId === ev.id;
              const hasDetails = !!(ev.stack || ev.endpoint || ev.filename);

              return (
                <div key={ev.id || i} className="flex items-start gap-2.5 text-left">
                  {/* Dot Node */}
                  <div className="mt-1.5 flex items-center justify-center shrink-0">
                    <span className={cn('w-3 h-3 rounded-full ring-4', getDotStyle(ev))} aria-hidden="true" />
                  </div>

                  {/* Event Card */}
                  <div
                    className={cn(
                      'min-w-0 flex-1 p-3 rounded-xl border transition-colors',
                      isExpanded
                        ? 'bg-[#F6FBF9] dark:bg-[#0E1116] border-[#0F766E]/40 dark:border-[#2DD4BF]/40'
                        : 'bg-white dark:bg-[#0E1116]/70 border-[#B8E4DC]/80 dark:border-[#252B35] hover:border-[#0F766E]/40 dark:hover:border-[#2DD4BF]/40'
                    )}
                  >
                    {/* Header: Page Badge & Time */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium font-mono bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35] max-w-[180px] truncate">
                        <Globe className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{ev.pagePath || '/'}</span>
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={cn(
                            'text-xs font-semibold uppercase px-1.5 py-0.5 rounded',
                            ev.severity === 'CRITICAL' || ev.badge === 'ERROR'
                              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                              : ev.severity === 'WARNING'
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                              : 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF]'
                          )}
                        >
                          {ev.badge || ev.severity}
                        </span>
                        <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-mono tabular-nums">
                          {new Date(ev.timestamp).toLocaleTimeString(
                            i18n.language.startsWith('en') ? 'en-MY' : 'ms-MY',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            }
                          )}
                        </span>
                      </div>
                    </div>

                    {ev.pageTitle && (
                      <p className="text-xs font-medium text-[#3B635C] dark:text-[#94A0B2] mb-0.5">
                        {ev.pageTitle}
                      </p>
                    )}

                    <p className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9] leading-snug break-words">
                      {ev.title}
                    </p>

                    {ev.filename && (
                      <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-mono mt-1 truncate flex items-center gap-1">
                        <FileCode className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{ev.filename.split('/').pop()}</span>
                      </p>
                    )}

                    {hasDetails && (
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                        className="w-full mt-2 flex items-center justify-between text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] pt-1.5 border-t border-[#B8E4DC]/60 dark:border-[#252B35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF] rounded"
                      >
                        <span>
                          {isExpanded
                            ? t('jpp:telemetry_hide_details', 'Sembunyikan Butiran')
                            : t('jpp:telemetry_click_for_trace', 'Klik untuk Jejak Penuh')}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>
                    )}

                    {/* ── Expanded Drawer ── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="mt-2.5 pt-2.5 border-t border-[#B8E4DC]/60 dark:border-[#252B35] space-y-2 text-xs"
                        >
                          {ev.endpoint && (
                            <div>
                              <span className="font-semibold text-[#3B635C] dark:text-[#94A0B2] block">
                                {t('jpp:telemetry_page_url', 'URL Halaman:')}
                              </span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <code className="p-1.5 rounded bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0B2420] dark:text-[#F1F5F9] font-mono text-xs break-all flex-1">
                                  {ev.endpoint}
                                </code>
                                {ev.endpoint.startsWith('http') && (
                                  <a
                                    href={ev.endpoint}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] hover:bg-[#B8E4DC]/50 dark:hover:bg-[#232933]"
                                    title={t('jpp:telemetry_open_page_tooltip', 'Buka Halaman Ini')}
                                    aria-label={t('jpp:telemetry_open_page_tooltip', 'Buka Halaman Ini')}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          {ev.stack && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-[#3B635C] dark:text-[#94A0B2]">
                                  {t('jpp:telemetry_call_stack', 'Call Stack:')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(ev.id, ev.stack || '')}
                                  className="text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] hover:underline flex items-center gap-1"
                                >
                                  {copiedId === ev.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                      <span>{t('jpp:telemetry_copied', 'Disalin')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                      <span>{t('jpp:telemetry_copy', 'Salin')}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <pre className="p-2.5 rounded-lg bg-[#0E1116] border border-[#252B35] text-[#F1F5F9] font-mono text-xs max-h-32 overflow-y-auto overscroll-contain whitespace-pre-wrap leading-relaxed">
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
    </aside>
  );
};
