import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Lock, ShoppingBag } from 'lucide-react';

export const LandingCta: React.FC = () => {
  const { t } = useTranslation(['portal', 'common']);
  const navigate = useNavigate();

  return (
    <section className="py-20 md:py-32 px-4 md:px-6 relative flex justify-center z-20 bg-gradient-to-b from-transparent to-[#EBF7F4]/60 dark:to-[#0E1116]">
      {/* Double-Bezel Pine-Teal Architectural Finale */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={typeof window === 'undefined' ? { opacity: 1, scale: 1 } : undefined}
        {...(typeof window !== 'undefined' ? { whileInView: { opacity: 1, scale: 1 }, viewport: { once: true } } : {})}
        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-5xl rounded-[2.75rem] p-2 bg-[#0B2420]/[0.05] dark:bg-white/[0.03] ring-1 ring-[#0B2420]/10 dark:ring-[#252B35]"
      >
        <div className="w-full rounded-[2.25rem] bg-gradient-to-br from-[#0B2420] via-[#081C18] to-[#061714] dark:from-[#13171D] dark:via-[#0E1116] dark:to-[#090B0E] border border-[#1E4D45] dark:border-[#252B35] p-8 sm:p-12 md:p-16 text-center space-y-6 md:space-y-8 relative overflow-hidden shadow-surface-lg">
          {/* Restrained Top Radial Highlight */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-[radial-gradient(circle,rgba(20,184,166,0.16)_0%,transparent_70%)] rounded-full pointer-events-none" />

          {/* Headline (Distinct from Hero headline) */}
          <h2 className="text-3xl sm:text-5xl md:text-[3.5rem] font-black tracking-[-0.03em] text-[#F6FBF9] leading-[1.04] relative z-10 max-w-3xl mx-auto [text-wrap:balance]">
            {t('portal:landing_cta_heading', 'Sedia Melangkah ke Kampus Pintar POLISAS?')}
          </h2>

          {/* Subtitle */}
          <p className="text-sm md:text-base text-[#99CBC2] max-w-xl mx-auto font-normal leading-relaxed relative z-10">
            {t(
              'portal:landing_cta_desc',
              t(
                'portal:hero_subtitle',
                'Sertai lebih 1,000 mahasiswa POLISAS dalam ekosistem digital rasmi sesi 2026/2027. Akses pantas aktiviti kelab, pesanan makanan, dan kebajikan anda.'
              )
            )}
          </p>

          {/* Dual Button-in-Button CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 relative z-10 pt-2">
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="w-full sm:w-auto pl-7 pr-2 py-2 min-h-[52px] rounded-full bg-[#2DD4BF] hover:bg-[#5EEAD4] text-[#061714] font-bold text-sm flex items-center justify-between sm:justify-center gap-3 shadow-[0_14px_30px_-8px_rgba(45,212,191,0.4)] transition-[transform,background-color,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] group cursor-pointer"
            >
              <span>{t('portal:student_login', 'Log Masuk Pelajar')}</span>
              <span className="w-8 h-8 rounded-full bg-[#061714]/15 flex items-center justify-center shrink-0">
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/polymart')}
              className="w-full sm:w-auto px-6 py-3 min-h-[52px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-[#1E4D45] text-[#F6FBF9] font-semibold text-sm flex items-center justify-center gap-2 transition-[transform,background-color] duration-200 active:scale-[0.98] cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#2DD4BF]" />
              <span>{t('portal:landing_cta_explore_mart', 'Lihat PolyMart Siswa')}</span>
            </button>
          </div>

          {/* Trust & Security Assurances */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-5 text-xs font-medium text-[#99CBC2] relative z-10 border-t border-white/10 mt-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#2DD4BF]" />
              {t('portal:landing_cta_official_account', 'Akaun Rasmi Siswa POLISAS')}
            </span>
            <span className="hidden sm:inline text-white/25" aria-hidden="true">•</span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#2DD4BF]" />
              {t('portal:landing_cta_rls_secure', 'Penyulitan Supabase RLS Selamat')}
            </span>
            <span className="hidden sm:inline text-white/25" aria-hidden="true">•</span>
            <span>{t('portal:landing_cta_session', 'Sesi Akademik 2026/2027')}</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default LandingCta;
