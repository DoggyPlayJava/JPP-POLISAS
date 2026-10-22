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
    <section id="nexus" className="py-24 md:py-36 px-4 md:px-6 bg-white border-y border-[#D9C9B2] relative z-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 items-center">

        {/* Left Column: Descriptive Content & Capabilities (6 cols) */}
        <div className="lg:col-span-6 space-y-6 md:space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F8F6EE] border border-[#D9C9B2]">
            <BrainCircuit className="w-4 h-4 text-[#C96F4F]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2E3A2F]">
              {t('portal:nexus_engine_tag', 'Enjin AI Generatif Terpadu')}
            </span>
          </div>

          <h2 className="text-4xl sm:text-6xl md:text-[4.5rem] font-black tracking-tight text-[#2E3A2F] leading-[0.95]">
            {t('portal:nexus_intelligence', 'Kepintaran Nexus')} <br />
            <span className="text-[#C96F4F]">{t('portal:empowering_operations', 'Memperkasa Operasi.')}</span>
          </h2>

          <p className="text-sm md:text-base text-[#556453] font-medium leading-relaxed max-w-xl">
            {t(
              'portal:nexus_ai_description',
              'Sistem dipacu LLM untuk menyemak kualiti kertas kerja aktiviti dan merumuskan sentimen mahasiswa secara pintar. Serahkan tugasan analitik kepada kepintaran sistem JPP.'
            )}
          </p>

          <div className="grid grid-cols-2 gap-5 md:gap-6 pt-4 border-t border-[#D9C9B2]/60 mt-6">
            {aiFeatures.map((f, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 rounded-2xl bg-[#F8F6EE]/60 border border-[#D9C9B2]/60">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#D9C9B2]/80 flex items-center justify-center text-[#2E3A2F] shadow-2xs">
                  <f.icon className="w-5 h-5 text-[#2E3A2F]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#2E3A2F]">{f.label}</h3>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#556453]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Interactive Paperwork Audit Simulation Card (6 cols) */}
        <div className="lg:col-span-6">
          <div className="relative rounded-[2.5rem] bg-[#2E3A2F] p-6 sm:p-8 text-white shadow-[0_20px_50px_rgba(46,58,47,0.2)] border border-[#2E3A2F] overflow-hidden">
            {/* Top Scanning Bar */}
            <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#D9C9B2]">
                  <SearchCheck className="w-4 h-4 text-[#C96F4F]" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#D9C9B2] block">
                    {t('portal:nexus_audit_title', 'Audit Kertas Kerja Automatik')}
                  </span>
                  <span className="text-xs font-black text-[#F8F6EE]">
                    Nexus Copilot v2.9
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#6B7F5B]/30 border border-[#6B7F5B]/50 text-[10px] font-bold text-[#D9C9B2] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5B] animate-ping" />
                {t('portal:nexus_live_scan', 'Live Scan')}
              </span>
            </div>

            {/* Document Metadata Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#D9C9B2] block mb-1">
                KERTAS_KERJA_2026_FINAL.PDF
              </span>
              <p className="text-sm font-black text-[#F8F6EE] leading-tight">
                {t('portal:nexus_doc_title', 'Karnival Keusahawanan & Kokurikulum POLISAS 2026')}
              </p>
              <div className="flex items-center gap-2 mt-2 text-[10px] font-semibold text-[#D9C9B2]">
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
                  color: '#6B7F5B',
                },
                {
                  label: t('portal:nexus_budget_syntax', 'Sintaks & Keseimbangan Belanjawan'),
                  score: '100%',
                  status: t('portal:nexus_verified_accurate', 'Disahkan Tepat'),
                  color: '#6B7F5B',
                },
                {
                  label: t('portal:nexus_kpi_objectives', 'Objektif & KPI Mahasiswa'),
                  score: '94%',
                  status: t('portal:nexus_aligned_calendar', 'Selaras Takwim'),
                  color: '#C96F4F',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4" style={{ color: item.color }} />
                    <span className="text-xs font-bold text-[#F8F6EE]">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-black text-[#F8F6EE] block">
                      {item.score}
                    </span>
                    <span className="text-[9px] font-semibold text-[#D9C9B2]">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Overall Score Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#6B7F5B]/30 via-[#C96F4F]/20 to-transparent border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#C96F4F]" />
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#D9C9B2] block">
                    {t('portal:nexus_ai_recommendation', 'Keputusan Cadangan AI')}
                  </span>
                  <span className="text-xs font-black text-[#F8F6EE]">
                    {t('portal:nexus_recommended_approval', 'Disyorkan untuk Kelulusan HEP')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-[#F8F6EE]">96</span>
                <span className="text-xs text-[#D9C9B2]">/100</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default LandingNexusAI;
