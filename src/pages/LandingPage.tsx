import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCampusStats } from '@/hooks/useCampusStats';
import { CampusStats } from '@/components/landing/landingTypes';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingTicker } from '@/components/landing/LandingTicker';
import { CampusDayTimeline } from '@/components/landing/CampusDayTimeline';
import { LandingBento } from '@/components/landing/LandingBento';
import { LandingNexusAI } from '@/components/landing/LandingNexusAI';
import { LandingStats } from '@/components/landing/LandingStats';
import { LandingCta } from '@/components/landing/LandingCta';
import { LandingFooter } from '@/components/landing/LandingFooter';

// ── Palette Tokens (Semambu Mineral Teal & Crisp Alabaster / Obsidian Carbon) ──
// Light: #F6FBF9 canvas, #FFFFFF cards, #B8E4DC borders, #0B2420 ink, #3B635C secondary, #0F766E accent
// Dark:  #090B0E canvas, #0E1116 chrome, #13171D cards, #252B35 borders, #F1F5F9 ink, #94A0B2 secondary, #2DD4BF accent

export type { CampusStats };
export { useCampusStats };

// ── Backward-Compatible Section Wrappers ──────────────────────
export const Navbar: React.FC = () => <LandingNavbar />;

export const Hero: React.FC<{ stats?: CampusStats }> = ({ stats: propStats }) => {
  const liveStats = useCampusStats();
  return <LandingHero stats={propStats || liveStats} />;
};

export const TickerTape: React.FC<{ stats?: CampusStats }> = ({ stats: propStats }) => {
  const liveStats = useCampusStats();
  return <LandingTicker stats={propStats || liveStats} />;
};

export const BentoSection: React.FC<{ stats?: CampusStats }> = ({ stats: propStats }) => {
  const liveStats = useCampusStats();
  return <LandingBento stats={propStats || liveStats} />;
};

export const NexusAISection: React.FC = () => <LandingNexusAI />;

export const StatsSection: React.FC<{ stats?: CampusStats }> = ({ stats: propStats }) => {
  const liveStats = useCampusStats();
  return <LandingStats stats={propStats || liveStats} />;
};

export const CtaSection: React.FC = () => <LandingCta />;

export const Footer: React.FC = () => <LandingFooter />;

const POLISAS_DEPARTMENTS = [
  { code: 'JKA', key: 'landing_dept_jka', fallback: 'Kejuruteraan Awam' },
  { code: 'JKM', key: 'landing_dept_jkm', fallback: 'Kejuruteraan Mekanikal' },
  { code: 'JKE', key: 'landing_dept_jke', fallback: 'Kejuruteraan Elektrik' },
  { code: 'JP', key: 'landing_dept_jp', fallback: 'Perdagangan' },
  { code: 'JTMK', key: 'landing_dept_jtmk', fallback: 'Teknologi Maklumat' },
];

// ── Komponen Utama Halaman Pendaratan (<LandingPage />) ────────
export const LandingPage: React.FC = () => {
  const { t } = useTranslation(['portal', 'common']);
  const stats = useCampusStats();

  return (
    <div className="min-h-[100dvh] bg-[#F6FBF9] dark:bg-[#090B0E] text-[#0B2420] dark:text-[#F1F5F9] selection:bg-[#0F766E] selection:text-white relative overflow-x-hidden font-sans">
      {/* 1. Bar Navigasi Kapsul Terapung */}
      <LandingNavbar />

      {/* 2. Hero Editorial & Pratonton Portal v2 Dwi-Peranti */}
      <LandingHero stats={stats} />

      {/* 3. Jalur Ekosistem Institusi Statik (Sifar Gelung Marquee & Sifar Ulangan KPI) */}
      <section
        id="ekosistem"
        aria-label={t('portal:nav_ecosystem', 'Ekosistem')}
        className="w-full bg-white dark:bg-[#0E1116] border-y border-[#B8E4DC] dark:border-[#252B35] py-5 px-4 md:px-6 relative z-20 scroll-mt-24"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] shrink-0">
            {t('portal:landing_ecosystem_scope', 'Ekosistem Digital Rasmi · 5 Jabatan Akademik')}
          </span>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
            {POLISAS_DEPARTMENTS.map((dept) => {
              const rawLabel = t(`portal:${dept.key}`, dept.fallback);
              const cleanName = rawLabel.replace(new RegExp(`^${dept.code}\\s*[•·\\-:]?\\s*`, 'i'), '');
              return (
                <span
                  key={dept.code}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F6FBF9] dark:bg-[#13171D] border border-[#B8E4DC]/90 dark:border-[#252B35] text-xs font-medium text-[#0B2420] dark:text-[#F1F5F9]"
                >
                  <span className="font-mono font-semibold text-[#0F766E] dark:text-[#2DD4BF]">
                    {dept.code}
                  </span>
                  <span className="text-[#3B635C] dark:text-[#94A0B2] hidden sm:inline">
                    {cleanName}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. "Sehari di POLISAS" Aliran Naratif Kampus (08:00 Pagi -> 21:00 Malam) */}
      <CampusDayTimeline />

      {/* 5. Seksyen Bento Modul (5 Ekosistem Teras) */}
      <LandingBento stats={stats} />

      {/* 6. Teras Kepintaran Buatan Nexus (Audit Kertas Kerja Pantas) */}
      <LandingNexusAI />

      {/* 7. Statistik & Impak Sebenar Kampus (Satu-satunya Seksyen KPI Berautoriti) */}
      <LandingStats stats={stats} />

      {/* 8. Gerakan Seruan Tindakan (CTA Bersatu) */}
      <LandingCta />

      {/* 9. Pengaki Halaman Institusi Rasmi */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
