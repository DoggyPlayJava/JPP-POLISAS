import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  BrainCircuit,
  FileText,
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
    <section id="nexus" className="py-24 md:py-36 px-4 md:px-6 bg-white dark:bg-[#0E1116] border-y border-[#B8E4DC] dark:border-[#252B35] relative z-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 items-center">

        {/* Left Column: Descriptive Content & Capabilities (6 cols) */}
        <div className="lg:col-span-6 space-y-6 md:space-y-8">
          <h2 className="text-3xl sm:text-5xl md:text-[3.75rem] font-black tracking-[-0.03em] text-[#0B2420] dark:text-[#F1F5F9] leading-[1.02]">
            {t('portal:nexus_intelligence', 'Kepintaran Nexus')} <br />
            <span className="text-[#0F766E] dark:text-[#2DD4BF]">{t('portal:empowering_operations', 'Memperkasa Operasi.')}</span>
          </h2>

          <p className="text-sm md:text-base text-[#3B635C] dark:text-[#94A0B2] font-normal leading-relaxed max-w-xl">
            {t(
              'portal:nexus_ai_description',
              'Sistem dipacu LLM untuk menyemak kualiti kertas kerja aktiviti dan merumuskan sentimen mahasiswa secara pintar. Serahkan tugasan analitik kepada kepintaran sistem JPP.'
            )}
          </p>

          <div className="grid grid-cols-2 gap-4 md:gap-5 pt-4 border-t border-[#B8E4DC]/60 dark:border-[#252B35] mt-6">
            {aiFeatures.map((f, i) => (
              <div key={i} className="flex flex-col gap-2 p-3.5 rounded-2xl bg-[#F6FBF9] dark:bg-[#13171D] border border-[#B8E4DC]/70 dark:border-[#252B35] shadow-surface-sm">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1B2028] border border-[#B8E4DC]/80 dark:border-[#252B35] flex items-center justify-center text-[#0B2420] dark:text-[#F1F5F9] shadow-2xs">
                  <f.icon className="w-5 h-5 text-[#0F766E] dark:text-[#2DD4BF]" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-[#0B2420] dark:text-[#F1F5F9]">{f.label}</h3>
                  <p className="text-[11px] font-medium text-[#3B635C] dark:text-[#94A0B2]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Double-Bezel Interactive Paperwork Audit Simulation Card (6 cols) */}
        <div className="lg:col-span-6">
          <div className="rounded-[2.75rem] p-2 bg-[#0B2420]/[0.05] dark:bg-white/[0.03] ring-1 ring-[#0B2420]/10 dark:ring-[#252B35]">
            <div className="relative rounded-[2.25rem] bg-[#0B2420] dark:bg-[#13171D] p-6 sm:p-8 text-white shadow-surface-lg border border-[#1E4D45] dark:border-[#252B35] overflow-hidden">
              {/* Top Scanning Bar */}
              <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#B8E4DC]">
                    <SearchCheck className="w-4 h-4 text-[#2DD4BF]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-[#99CBC2] block">
                      {t('portal:nexus_audit_title', 'Audit Kertas Kerja Automatik')}
                    </span>
                    <span className="text-xs font-bold text-[#F6FBF9]">
                      Nexus Copilot v2.9
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#14B8A6]/20 border border-[#14B8A6]/40 text-[11px] font-semibold text-[#99F6E4] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
                  {t('portal:nexus_live_scan', 'Live Scan')}
                </span>
              </div>

              {/* Document Metadata Card */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
                <span className="text-[11px] font-mono text-[#99CBC2] block mb-1">
                  KERTAS_KERJA_2026_FINAL.PDF
                </span>
                <p className="text-sm font-bold text-[#F6FBF9] leading-tight">
                  {t('portal:nexus_doc_title', 'Karnival Keusahawanan & Kokurikulum POLISAS 2026')}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-[#B8E4DC]">
                  <span>{t('portal:nexus_doc_organizer', 'Anjuran: Kelab Keusahawanan')}</span>
                  <span>•</span>
                  <span>{t('portal:nexus_doc_budget', 'Bajet: RM 4,500')}</span>
                </div>
              </div>

              {/* Live Audit Metrics Grid */}
              <div className="space-y-3 mb-6">
                {[
                  {
                    label: t('portal:nexus_hep_compliance', 'Pematuhan Format HEP'),
                    score: '98%',
                    status: t('portal:nexus_standards_compliant', 'Patuh Piawaian'),
                    color: '#2DD4BF',
                  },
                  {
                    label: t('portal:nexus_budget_syntax', 'Sintaks & Keseimbangan Belanjawan'),
                    score: '100%',
                    status: t('portal:nexus_verified_accurate', 'Disahkan Tepat'),
                    color: '#14B8A6',
                  },
                  {
                    label: t('portal:nexus_kpi_objectives', 'Objektif & KPI Mahasiswa'),
                    score: '94%',
                    status: t('portal:nexus_aligned_calendar', 'Selaras Takwim'),
                    color: '#5EEAD4',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 shrink-0" style={{ color: item.color }} />
                      <span className="text-xs font-semibold text-[#F6FBF9]">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[#F6FBF9] block">
                        {item.score}
                      </span>
                      <span className="text-[11px] font-medium text-[#99CBC2]">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall Score Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#14B8A6]/25 via-[#0D9488]/20 to-transparent border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-[#2DD4BF]" />
                  <div>
                    <span className="text-[11px] font-medium text-[#99CBC2] block">
                      {t('portal:nexus_ai_recommendation', 'Keputusan Cadangan AI')}
                    </span>
                    <span className="text-xs font-bold text-[#F6FBF9]">
                      {t('portal:nexus_recommended_approval', 'Disyorkan untuk Kelulusan HEP')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-[#F6FBF9]">96</span>
                  <span className="text-xs text-[#B8E4DC]">/100</span>
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
