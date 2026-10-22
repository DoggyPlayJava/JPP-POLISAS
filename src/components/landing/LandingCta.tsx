import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Sparkles, Lock } from 'lucide-react';

export const LandingCta: React.FC = () => {
  const { t } = useTranslation(['portal', 'common']);
  const navigate = useNavigate();

  return (
    <section className="py-20 md:py-32 px-4 md:px-6 relative flex justify-center z-20 bg-gradient-to-b from-transparent to-[#F2EDE4]/60">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={typeof window === 'undefined' ? { opacity: 1, scale: 1 } : undefined}
        {...(typeof window !== 'undefined' ? { whileInView: { opacity: 1, scale: 1 }, viewport: { once: true } } : {})}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl rounded-[2.5rem] md:rounded-[3.5rem] bg-white border border-[#D9C9B2] p-8 sm:p-12 md:p-20 text-center space-y-6 md:space-y-8 relative overflow-hidden shadow-[0_20px_60px_rgba(46,58,47,0.08)]"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-[#C96F4F]/10 rounded-full blur-xl pointer-events-none" />


        {/* Small Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F8F6EE] border border-[#D9C9B2] shadow-2xs relative z-10">
          <Sparkles className="w-3.5 h-3.5 text-[#C96F4F]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#2E3A2F]">
            {t('portal:landing_cta_tag', 'Gerbang Rasmi Mahasiswa')}
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#2E3A2F] leading-[1.02] relative z-10 max-w-3xl mx-auto">
          {t('portal:hero_title', 'Ekosistem Digital Kampus & Super App Pelajar')}
        </h2>

        {/* Subtitle */}
        <p className="text-sm md:text-base text-[#556453] max-w-xl mx-auto font-medium leading-relaxed relative z-10">
          {t(
            'portal:landing_cta_desc',
            t(
              'portal:hero_subtitle',
              'Sertai lebih 1,000 mahasiswa POLISAS dalam ekosistem digital rasmi sesi 2026/2027. Akses pantas aktiviti kelab, pesanan makanan, dan kebajikan anda.'
            )
          )}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 pt-2">
          <button
            onClick={() => navigate('/portal')}
            className="w-full sm:w-auto px-9 py-4 rounded-2xl bg-[#C96F4F] hover:bg-[#B85F40] text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <span>{t('portal:student_login', 'Log Masuk Pelajar')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Trust & Security Assurances */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 text-[11px] font-semibold text-[#6B7F5B] relative z-10 border-t border-[#D9C9B2]/60 mt-4">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#6B7F5B]" />
            {t('portal:landing_cta_official_account', 'Akaun Rasmi Siswa POLISAS')}
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#6B7F5B]" />
            {t('portal:landing_cta_rls_secure', 'Penyulitan Supabase RLS Selamat')}
          </span>
          <span className="hidden sm:inline">•</span>
          <span>{t('portal:landing_cta_session', 'Sesi Akademik 2026/2027')}</span>
        </div>
      </motion.div>
    </section>
  );
};

export default LandingCta;
