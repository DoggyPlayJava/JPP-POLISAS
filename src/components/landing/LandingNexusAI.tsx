import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  Activity,
  BookOpen,
  Shield,
  Zap,
  Sparkles,
  SearchCheck,
} from 'lucide-react';

export const LandingNexusAI: React.FC = () => {
  const { t } = useTranslation(['portal', 'common']);

  const aiFeatures = [
    {
      label: t('portal:nexus_feature_minutes_analysis', 'Analisis Minit'),
      desc: t('portal:nexus_feature_financial_syntax', 'Sintaks Kewangan'),
      icon: Activity,
    },
    {
      label: t('portal:nexus_feature_generation', 'Penjanaan'),
      desc: t('portal:nexus_feature_auto_text', 'Teks Automatik'),
      icon: BookOpen,
    },
    {
      label: t('portal:nexus_feature_audit_check', 'Audit Semak'),
      desc: t('portal:nexus_feature_format_errors', 'Ralat Format'),
      icon: Shield,
    },
    {
      label: t('portal:nexus_feature_jpp_expert', 'Pakar JPP'),
      desc: t('portal:nexus_feature_issue_resolution', 'Resolusi Isu 24/7'),
      icon: Zap,
    },
  ];

  return (
    <section
      id="nexus"
      className="py-16 md:py-24 px-4 md:px-6 bg-white dark:bg-[#0E1116] border-y border-[#B8E4DC] dark:border-[#252B35] relative z-20 scroll-mt-24"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14 items-center">
        {/* Left Column: Capabilities */}
        <div className="lg:col-span-6 space-y-5 md:space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-[3.1rem] font-bold tracking-[-0.025em] text-[#0B2420] dark:text-[#F1F5F9] leading-[1.08] [text-wrap:balance]">
            {t('portal:nexus_intelligence', 'Kepintaran Nexus')}{' '}
            <span className="block text-[#0F766E] dark:text-[#2DD4BF]">
              {t('portal:empowering_operations', 'Memperkasa Operasi.')}
            </span>
          </h2>

          <p className="text-sm md:text-base text-[#3B635C] dark:text-[#94A0B2] font-normal leading-relaxed max-w-xl">
            {t(
              'portal:nexus_ai_description',
              'Sistem dipacu LLM untuk menyemak kualiti kertas kerja aktiviti dan merumuskan sentimen mahasiswa secara pintar. Serahkan tugasan analitik kepada kepintaran sistem JPP.'
            )}
          </p>

          <div className="grid grid-cols-2 gap-3.5 md:gap-4 pt-5 border-t border-[#B8E4DC]/70 dark:border-[#252B35]">
            {aiFeatures.map((f, i) => (
              <div
                key={i}
                className="flex flex-col gap-2.5 p-4 rounded-2xl bg-[#F6FBF9] dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-surface-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#1B2028] border border-[#B8E4DC]/80 dark:border-[#252B35] flex items-center justify-center text-[#0F766E] dark:text-[#2DD4BF] shadow-2xs">
                  <f.icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#0B2420] dark:text-[#F1F5F9]">{f.label}</h3>
                  <p className="text-xs font-normal text-[#3B635C] dark:text-[#94A0B2] mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Paperwork Audit Simulation Card */}
        <div className="lg:col-span-6">
          <div className="rounded-[2.25rem] p-2 bg-[#0B2420]/[0.04] dark:bg-[#090B0E] ring-1 ring-[#0B2420]/10 dark:ring-[#252B35]">
            <div className="relative rounded-[1.85rem] bg-[#0B2420] dark:bg-[#13171D] p-5 sm:p-7 text-white shadow-surface-lg border border-[#1E4D45] dark:border-[#252B35] overflow-hidden">
              {/* Top Scanning Bar */}
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/10 dark:border-[#252B35] mb-5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/10 dark:bg-[#1B2028] flex items-center justify-center shrink-0">
                    <SearchCheck className="w-4 h-4 text-[#2DD4BF]" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-[#B8E4DC] dark:text-[#94A0B2] block truncate">
                      {t('portal:nexus_audit_title', 'Audit Kertas Kerja Automatik')}
                    </span>
                    <span className="text-sm font-semibold text-[#F6FBF9] dark:text-[#F1F5F9] block">
                      Nexus Copilot v2.9
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#14B8A6]/15 dark:bg-[#1B2028] border border-[#2DD4BF]/35 dark:border-[#252B35] text-xs font-semibold text-[#5EEAD4] dark:text-[#2DD4BF] flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#2DD4BF]" aria-hidden="true" />
                  {t('portal:nexus_live_scan', 'Live Scan')}
                </span>
              </div>

              {/* Document Metadata Card */}
              <div className="p-4 rounded-2xl bg-white/[0.06] dark:bg-[#0E1116] border border-white/10 dark:border-[#252B35] mb-5">
                <span className="text-xs font-mono text-[#B8E4DC] dark:text-[#94A0B2] block mb-1">
                  KERTAS_KERJA_2026_FINAL.PDF
                </span>
                <p className="text-sm font-semibold text-[#F6FBF9] dark:text-[#F1F5F9] leading-snug">
                  {t('portal:nexus_doc_title', 'Karnival Keusahawanan & Kokurikulum POLISAS 2026')}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs font-normal text-[#B8E4DC] dark:text-[#94A0B2]">
                  <span>{t('portal:nexus_doc_organizer', 'Anjuran: Kelab Keusahawanan')}</span>
                  <span aria-hidden="true">•</span>
                  <span>{t('portal:nexus_doc_budget', 'Bajet: RM 4,500')}</span>
                </div>
              </div>

              {/* Live Audit Metrics Grid */}
              <div className="space-y-2.5 mb-5">
                {[
                  {
                    label: t('portal:nexus_hep_compliance', 'Pematuhan Format HEP'),
                    score: '98%',
                    status: t('portal:nexus_standards_compliant', 'Patuh Piawaian'),
                  },
                  {
                    label: t('portal:nexus_budget_syntax', 'Sintaks & Keseimbangan Belanjawan'),
                    score: '100%',
                    status: t('portal:nexus_verified_accurate', 'Disahkan Tepat'),
                  },
                  {
                    label: t('portal:nexus_kpi_objectives', 'Objektif & KPI Mahasiswa'),
                    score: '94%',
                    status: t('portal:nexus_aligned_calendar', 'Selaras Takwim'),
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white/[0.05] dark:bg-[#0E1116] border border-white/10 dark:border-[#252B35] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle className="w-4 h-4 shrink-0 text-[#2DD4BF]" aria-hidden="true" />
                      <span className="text-xs sm:text-sm font-medium text-[#F6FBF9] dark:text-[#F1F5F9] truncate">
                        {item.label}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs sm:text-sm font-mono tabular-nums font-bold text-[#F6FBF9] dark:text-[#F1F5F9] block">
                        {item.score}
                      </span>
                      <span className="text-xs font-normal text-[#B8E4DC] dark:text-[#94A0B2]">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall Score Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#14B8A6]/20 via-[#0D9488]/15 to-transparent dark:from-[#2DD4BF]/12 dark:via-[#1B2028] dark:to-[#1B2028] border border-white/10 dark:border-[#252B35] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sparkles className="w-5 h-5 text-[#2DD4BF] shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="text-xs font-normal text-[#B8E4DC] dark:text-[#94A0B2] block">
                      {t('portal:nexus_ai_recommendation', 'Keputusan Cadangan AI')}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-[#F6FBF9] dark:text-[#F1F5F9] block truncate">
                      {t('portal:nexus_recommended_approval', 'Disyorkan untuk Kelulusan HEP')}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 font-mono tabular-nums">
                  <span className="text-2xl font-bold text-[#F6FBF9] dark:text-[#F1F5F9]">96</span>
                  <span className="text-xs text-[#B8E4DC] dark:text-[#94A0B2]">/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingNexusAI;
