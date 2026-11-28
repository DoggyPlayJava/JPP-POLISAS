import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Lock, ShoppingBag } from 'lucide-react';

export const LandingCta: React.FC = () => {
  const { t } = useTranslation(['portal', 'common']);
  const navigate = useNavigate();

  return (
    <section className="py-16 md:py-24 px-4 md:px-6 relative flex justify-center z-20 bg-gradient-to-b from-transparent to-[#EBF7F4]/60 dark:to-[#0E1116]">
      {/* Double-Bezel Architectural Finale */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={typeof window === 'undefined' ? { opacity: 1, scale: 1 } : undefined}
        {...(typeof window !== 'undefined' ? { whileInView: { opacity: 1, scale: 1 }, viewport: { once: true } } : {})}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-5xl rounded-[2.25rem] p-2 bg-[#0B2420]/[0.04] dark:bg-[#090B0E] ring-1 ring-[#0B2420]/10 dark:ring-[#252B35]"
      >
        <div className="w-full rounded-[1.85rem] bg-gradient-to-br from-[#0B2420] via-[#081C18] to-[#061714] dark:from-[#13171D] dark:via-[#13171D] dark:to-[#0E1116] border border-[#1E4D45] dark:border-[#252B35] p-8 sm:p-12 md:p-14 text-center space-y-6 relative overflow-hidden shadow-surface-lg">
          {/* Restrained Top Radial Highlight */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-[radial-gradient(circle,rgba(45,212,191,0.12)_0%,transparent_70%)] rounded-full pointer-events-none"
            aria-hidden="true"
          />

          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl md:text-[3rem] font-bold tracking-[-0.025em] text-[#F6FBF9] dark:text-[#F1F5F9] leading-[1.08] relative z-10 max-w-3xl mx-auto [text-wrap:balance]">
            {t('portal:landing_cta_heading', 'Sedia Melangkah ke Kampus Pintar POLISAS?')}
          </h2>

          {/* Subtitle */}
          <p className="text-sm md:text-base text-[#B8E4DC] dark:text-[#94A0B2] max-w-xl mx-auto font-normal leading-relaxed relative z-10">
            {t(
              'portal:landing_cta_desc',
              t(
                'portal:hero_subtitle',
                'Sertai mahasiswa POLISAS dalam ekosistem digital rasmi sesi 2026/2027. Akses pantas aktiviti kelab, pesanan makanan, dan kebajikan anda.'
              )
            )}
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10 pt-1">
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="w-full sm:w-auto pl-6 pr-2 py-2 min-h-[48px] rounded-full bg-[#2DD4BF] hover:bg-[#5EEAD4] text-[#090B0E] font-semibold text-sm flex items-center justify-between sm:justify-center gap-3 shadow-surface-md transition-[transform,background-color] duration-150 ease-apple-out active:scale-[0.97] group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
            >
              <span>{t('portal:student_login', 'Log Masuk Pelajar')}</span>
              <span className="w-8 h-8 rounded-full bg-[#090B0E]/15 flex items-center justify-center shrink-0">
                <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/polymart')}
              className="w-full sm:w-auto px-6 py-3 min-h-[48px] rounded-full bg-white/[0.06] dark:bg-[#1B2028] hover:bg-white/[0.12] dark:hover:bg-[#252B35] border border-[#1E4D45] dark:border-[#252B35] text-[#F6FBF9] dark:text-[#F1F5F9] font-semibold text-sm flex items-center justify-center gap-2 transition-[transform,background-color] duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
            >
              <ShoppingBag className="w-4 h-4 text-[#2DD4BF]" aria-hidden="true" />
              <span>{t('portal:landing_cta_explore_mart', 'Lihat PolyMart Siswa')}</span>
            </button>
          </div>

          {/* Trust & Security Assurances */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-5 text-xs font-medium text-[#B8E4DC] dark:text-[#94A0B2] relative z-10 border-t border-white/10 dark:border-[#252B35] mt-2">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#2DD4BF]" aria-hidden="true" />
              {t('portal:landing_cta_official_account', 'Akaun Rasmi Siswa POLISAS')}
            </span>
            <span className="hidden sm:inline text-white/25 dark:text-[#252B35]" aria-hidden="true">•</span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#2DD4BF]" aria-hidden="true" />
              {t('portal:landing_cta_rls_secure', 'Penyulitan Supabase RLS Selamat')}
            </span>
            <span className="hidden sm:inline text-white/25 dark:text-[#252B35]" aria-hidden="true">•</span>
            <span>{t('portal:landing_cta_session', 'Sesi Akademik 2026/2027')}</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default LandingCta;
