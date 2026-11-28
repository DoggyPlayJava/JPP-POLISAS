import React from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { TelemetryData } from './telemetryTypes';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface TelemetryLeftRailProps {
  data: TelemetryData;
  adminName?: string;
  onRefresh: () => void;
  loading: boolean;
  totalAlertsCount: number;
  onOpenIncidentsClick?: () => void;
}

export const TelemetryLeftRail: React.FC<TelemetryLeftRailProps> = ({
  data,
  adminName,
  onRefresh,
  loading,
  totalAlertsCount,
  onOpenIncidentsClick,
}) => {
  const { t } = useTranslation(['jpp', 'common']);
  const { resilience_score, resilience_rating, resilience_deductions, server } = data;

  const criticalCount = resilience_deductions.filter((d) => Math.abs(d.points) >= 15).length;
  const mediumCount = resilience_deductions.filter((d) => Math.abs(d.points) < 15).length;
  const displayName = adminName?.trim() || t('jpp:telemetry_rail_admin', 'Admin');

  const scoreTone =
    resilience_score >= 85
      ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
      : resilience_score >= 65
      ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
      : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30';

  return (
    <aside className="bg-white dark:bg-[#13171D] rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] shadow-surface-sm p-5 space-y-5 h-full">
      {/* ── 1. Greeting & Incident Review Panel (Mineral Teal / Obsidian Carbon) ── */}
      <div className="rounded-xl p-4 sm:p-5 bg-[#EBF7F4] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35]">
        <h2 className="text-lg font-bold text-[#0B2420] dark:text-[#F1F5F9] tracking-tight leading-snug [text-wrap:balance]">
          {t('jpp:telemetry_rail_good_morning', 'Good morning,')}
          <br />
          <span className="text-[#0F766E] dark:text-[#2DD4BF]">{displayName}</span>
        </h2>
        <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal leading-relaxed mt-2">
          {totalAlertsCount > 0
            ? t(
                'jpp:telemetry_rail_alerts_detected',
                '{{count}} amaran integriti dikesan semalaman. Satu insiden memerlukan pengesahan anda.',
                { count: totalAlertsCount }
              )
            : t(
                'jpp:telemetry_rail_healthy_desc',
                'Sistem beroperasi pada mod kestabilan tinggi semalaman. Tiada insiden kritikal.'
              )}
        </p>

        <button
          type="button"
          onClick={onOpenIncidentsClick || onRefresh}
          disabled={loading}
          className="mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white dark:text-[#090B0E] bg-[#0F766E] hover:bg-[#0D665F] dark:bg-[#2DD4BF] dark:hover:bg-[#14B8A6] active:scale-[0.98] transition-[transform,opacity,background-color] duration-200 ease-apple-out flex items-center justify-between shadow-surface-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
        >
          <span>
            {loading
              ? t('jpp:telemetry_rail_syncing', 'Menyegerak…')
              : t('jpp:telemetry_rail_review_incident', 'Review Incident')}
          </span>
          <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
        </button>
      </div>

      {/* ── 2. Security Score (Resilience Score) ── */}
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-[#3B635C] dark:text-[#94A0B2] mb-1">
          <span className="uppercase tracking-wider">
            {t('jpp:telemetry_rail_security_score', 'Security Score')}
          </span>
          <span className="font-mono">%</span>
        </div>

        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-4xl font-bold text-[#0B2420] dark:text-[#F1F5F9] tracking-tight font-mono tabular-nums">
            {resilience_score}
          </span>
          <span className="text-sm font-medium text-[#3B635C] dark:text-[#94A0B2] font-mono">/100</span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold border', scoreTone)}>
            {resilience_rating}
          </span>
        </div>

        {/* Trend Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs font-medium mb-1.5">
            <span className="flex items-center gap-1 text-[#0F766E] dark:text-[#2DD4BF] font-semibold">
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              {t('jpp:telemetry_rail_vs_yesterday', '+2.4% vs semalam')}
            </span>
            <span className="text-[#3B635C] dark:text-[#94A0B2] font-mono tabular-nums">{resilience_score}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#EBF7F4] dark:bg-[#1B2028] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0F766E] dark:bg-[#2DD4BF] rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, resilience_score))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[#B8E4DC]/60 dark:border-[#252B35]" />

      {/* ── 3. Open Incidents ── */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] block mb-1">
          {t('jpp:telemetry_rail_open_incidents', 'Open Incidents')}
        </span>

        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-2xl font-bold font-mono tabular-nums',
              resilience_deductions.length > 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-[#0B2420] dark:text-[#F1F5F9]'
            )}
          >
            {resilience_deductions.length}
          </span>
          <span className="text-xs font-medium text-[#3B635C] dark:text-[#94A0B2]">
            {t('jpp:telemetry_rail_attention_needed', 'Perhatian diperlukan')}
          </span>
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs font-medium text-[#3B635C] dark:text-[#94A0B2]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-400" aria-hidden="true" />
            <span className="tabular-nums">{t('jpp:telemetry_rail_high', 'High: {{count}}', { count: criticalCount })}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" aria-hidden="true" />
            <span className="tabular-nums">{t('jpp:telemetry_rail_medium', 'Medium: {{count}}', { count: mediumCount })}</span>
          </span>
        </div>
      </div>

      <div className="border-t border-[#B8E4DC]/60 dark:border-[#252B35]" />

      {/* ── 4. Auto Resolution ── */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] block mb-1">
          {t('jpp:telemetry_rail_auto_resolution', 'Auto Resolution')}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">94%</span>
        </div>
        <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal mt-1">
          {t('jpp:telemetry_rail_cron_active', '+3% vs semalam • Cron & Snapshot Aktif')}
        </p>
      </div>

      <div className="border-t border-[#B8E4DC]/60 dark:border-[#252B35]" />

      {/* ── 5. AI Confidence & Engine ── */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] block mb-1">
          {t('jpp:telemetry_rail_ai_confidence', 'AI Confidence')}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">97%</span>
        </div>
        <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal mt-1 font-mono tabular-nums">
          {t('jpp:telemetry_rail_ai_confidence_note', 'AI model confidence tinggi • PID {{pid}}', { pid: server.pid })}
        </p>
      </div>
    </aside>
  );
};
