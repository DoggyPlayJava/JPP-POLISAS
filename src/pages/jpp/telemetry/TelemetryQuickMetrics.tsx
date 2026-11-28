import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight } from 'lucide-react';
import { TelemetryData } from './telemetryTypes';

interface TelemetryQuickMetricsProps {
  data: TelemetryData;
  onViewThreatsClick?: () => void;
  onViewAutomationClick?: () => void;
}

export const TelemetryQuickMetrics: React.FC<TelemetryQuickMetricsProps> = ({
  data,
  onViewThreatsClick,
  onViewAutomationClick,
}) => {
  const { t } = useTranslation(['jpp', 'common']);
  const { diagnostics } = data;
  const db = diagnostics?.database;

  const dbHealthyPct = Math.round(db?.cache_hit_rate_pct ?? 94);

  return (
    <section className="bg-white dark:bg-[#13171D] rounded-2xl border border-[#B8E4DC] dark:border-[#252B35] shadow-surface-sm p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* ── Col 1: Top Threats (Last 24h) ── */}
      <div className="p-4 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/70 dark:border-[#252B35] flex flex-col justify-between gap-3 min-w-0">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs mb-3">
            <span className="text-[#0B2420] dark:text-[#F1F5F9] font-bold">
              {t('jpp:telemetry_qm_top_threats', 'Top Threats')}
            </span>
            <span className="text-[#3B635C] dark:text-[#94A0B2] font-medium shrink-0">
              {t('jpp:telemetry_qm_last_24h', 'Last 24h')}
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                label: t('jpp:telemetry_qm_threat_credential', 'Credential / SLA'),
                pct: 91,
                textColor: 'text-rose-700 dark:text-rose-400',
                barColor: 'bg-rose-600 dark:bg-rose-400',
              },
              {
                label: t('jpp:telemetry_qm_threat_api_abuse', 'API Abuse / Mart'),
                pct: 74,
                textColor: 'text-amber-700 dark:text-amber-400',
                barColor: 'bg-amber-500 dark:bg-amber-400',
              },
              {
                label: t('jpp:telemetry_qm_threat_ransomware', 'Ransomware / SOS'),
                pct: 35,
                textColor: 'text-[#0F766E] dark:text-[#2DD4BF]',
                barColor: 'bg-[#0F766E] dark:bg-[#2DD4BF]',
              },
              {
                label: t('jpp:telemetry_qm_threat_privilege', 'Privilege Escalation'),
                pct: 22,
                textColor: 'text-[#3B635C] dark:text-[#94A0B2]',
                barColor: 'bg-[#3B635C]/70 dark:bg-[#94A0B2]/70',
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between gap-2 text-xs font-medium mb-1">
                  <span className="text-[#0B2420] dark:text-[#F1F5F9] truncate">{item.label}</span>
                  <span className={`font-mono tabular-nums font-semibold shrink-0 ${item.textColor}`}>{item.pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#EBF7F4] dark:bg-[#1B2028] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.barColor}`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onViewThreatsClick}
          className="text-left text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] hover:underline flex items-center gap-1 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF] rounded"
        >
          <span>{t('jpp:telemetry_qm_view_all_threats', 'View all Threats')}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </button>
      </div>

      {/* ── Col 2: Infrastructure ── */}
      <div className="p-4 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/70 dark:border-[#252B35] flex flex-col justify-between gap-3 min-w-0">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs mb-3">
            <span className="text-[#0B2420] dark:text-[#F1F5F9] font-bold">
              {t('jpp:telemetry_qm_infrastructure', 'Infrastructure')}
            </span>
            <span className="text-[#0F766E] dark:text-[#2DD4BF] font-semibold flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
              {t('jpp:telemetry_qm_all_healthy', 'All healthy')}
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              { label: t('jpp:telemetry_qm_cloud_services', 'Cloud Services'), pct: 99, warn: false },
              { label: t('jpp:telemetry_qm_endpoints', 'Endpoints'), pct: 99, warn: false },
              { label: t('jpp:telemetry_qm_servers_api', 'Servers (API)'), pct: 99, warn: false },
              {
                label: t('jpp:telemetry_qm_databases_postgres', 'Databases (PostgreSQL)'),
                pct: Math.min(100, Math.max(0, dbHealthyPct)),
                warn: dbHealthyPct < 96,
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between gap-2 text-xs font-medium mb-1">
                  <span className="text-[#0B2420] dark:text-[#F1F5F9] truncate">{item.label}</span>
                  <span
                    className={`font-mono tabular-nums font-semibold shrink-0 ${
                      item.warn ? 'text-amber-700 dark:text-amber-400' : 'text-[#3B635C] dark:text-[#94A0B2]'
                    }`}
                  >
                    {item.pct}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#EBF7F4] dark:bg-[#1B2028] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.warn ? 'bg-amber-500 dark:bg-amber-400' : 'bg-[#0F766E] dark:bg-[#2DD4BF]'
                    }`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#B8E4DC]/50 dark:border-[#252B35]">
          <span className="text-xs font-medium text-[#3B635C] dark:text-[#94A0B2]">
            {t('jpp:telemetry_qm_overall_uptime', 'Overall Uptime')}
          </span>
          <span className="text-sm font-bold text-[#0F766E] dark:text-[#2DD4BF] font-mono tabular-nums">99.6%</span>
        </div>
      </div>

      {/* ── Col 3: AI Insights (Today) ── */}
      <div className="p-4 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/70 dark:border-[#252B35] flex flex-col justify-between gap-3 min-w-0">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs mb-3">
            <span className="text-[#0B2420] dark:text-[#F1F5F9] font-bold">
              {t('jpp:telemetry_qm_ai_insights', 'AI Insights')}
            </span>
            <span className="text-[#3B635C] dark:text-[#94A0B2] font-medium shrink-0">
              {t('jpp:telemetry_qm_today', 'Today')}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2 py-1 border-b border-[#B8E4DC]/40 dark:border-[#252B35]">
              <span className="text-[#3B635C] dark:text-[#94A0B2]">
                {t('jpp:telemetry_qm_threats_detected_ai', 'Threats detected by AI')}
              </span>
              <span className="font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums shrink-0">67%</span>
            </div>
            <div className="flex items-center justify-between gap-2 py-1 border-b border-[#B8E4DC]/40 dark:border-[#252B35]">
              <span className="text-[#3B635C] dark:text-[#94A0B2]">
                {t('jpp:telemetry_qm_false_positives_reduced', 'False-positives reduced')}
              </span>
              <span className="font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums shrink-0">43%</span>
            </div>
            <div className="flex items-center justify-between gap-2 py-1 border-b border-[#B8E4DC]/40 dark:border-[#252B35]">
              <span className="text-[#3B635C] dark:text-[#94A0B2]">
                {t('jpp:telemetry_qm_mean_time_to_detect', 'Mean time to detect')}
              </span>
              <span className="font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums shrink-0">18s</span>
            </div>
            <div className="flex items-center justify-between gap-2 py-1">
              <span className="text-[#3B635C] dark:text-[#94A0B2]">
                {t('jpp:telemetry_qm_risk_reduced', 'Risk reduced')}
              </span>
              <span className="font-bold text-[#0F766E] dark:text-[#2DD4BF] font-mono tabular-nums shrink-0">32%</span>
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] text-xs text-[#0B2420] dark:text-[#F1F5F9] font-medium flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" aria-hidden="true" />
          <span className="truncate">
            {t('jpp:telemetry_qm_ai_callout', 'AI: Semak tiket SLA tertunggak di e-Kebajikan')}
          </span>
        </div>
      </div>

      {/* ── Col 4: Automation ── */}
      <div className="p-4 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/70 dark:border-[#252B35] flex flex-col justify-between gap-3 min-w-0">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs mb-2">
            <span className="text-[#0B2420] dark:text-[#F1F5F9] font-bold">
              {t('jpp:telemetry_qm_automation', 'Automation')}
            </span>
            <span className="text-[#0F766E] dark:text-[#2DD4BF] font-semibold flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
              {t('jpp:telemetry_qm_active', 'Active')}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 mt-2">
            <div className="min-w-0">
              <span className="text-3xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">152</span>
              <p className="text-xs font-medium text-[#3B635C] dark:text-[#94A0B2] mt-0.5">
                {t('jpp:telemetry_qm_playbooks_executed', 'Playbooks Executed')}
              </p>
            </div>

            {/* Circular Gauge 94% */}
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                <path
                  className="text-[#EBF7F4] dark:text-[#1B2028]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#0F766E] dark:text-[#2DD4BF]"
                  strokeDasharray="94, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-xs font-bold font-mono tabular-nums text-[#0B2420] dark:text-[#F1F5F9]">94%</span>
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1.5 text-xs font-medium text-[#3B635C] dark:text-[#94A0B2]">
            <div className="flex justify-between gap-2">
              <span>{t('jpp:telemetry_qm_avg_response_time', 'Avg Response Time:')}</span>
              <span className="text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums font-semibold shrink-0">22s</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>{t('jpp:telemetry_qm_automation_coverage', 'Automation Coverage:')}</span>
              <span className="text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums font-semibold shrink-0">94%</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewAutomationClick}
          className="text-left text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] hover:underline flex items-center gap-1 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF] rounded"
        >
          <span>{t('jpp:telemetry_qm_view_automation', 'View automation activity')}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};
