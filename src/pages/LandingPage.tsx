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

// ── Palette Tokens (05 Earthy Minimal / Neo-Campus) ───────────
// #2E3A2F: Primary (Deep Forest Moss Green)
// #6B7F5B: Secondary (Sage Olive Green)
// #D9C9B2: Tertiary (Warm Sand / Oatmeal Beige)
// #C96F4F: Accent (Terracotta Clay Orange)
// #F8F6EE: Background (Warm Milk Porcelain)

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

// ── Komponen Utama Halaman Pendaratan (<LandingPage />) ────────
export const LandingPage: React.FC = () => {
  const { t } = useTranslation(['portal', 'common']);
  const stats = useCampusStats();

  return (
    <div className="min-h-screen bg-[#F8F6EE] text-[#2E3A2F] selection:bg-[#C96F4F] selection:text-white relative overflow-x-hidden font-sans">
      {/* 1. Bar Navigasi Kapsul Terapung */}
      <LandingNavbar />

      {/* 2. Hero Berpusat & Mockup Dwi-Perspektif (Laptop + Telefon Pintar) */}
      <LandingHero stats={stats} />

      {/* 3. Ticker Tape Berputar (Data Masa Nyata Kampus) */}
      <LandingTicker stats={stats} />

      {/* 4. "Sehari di POLISAS" Interaktif Time Switcher (08:00 Pagi -> 21:00 Malam) */}
      <CampusDayTimeline />

      {/* 5. Seksyen Bento Modul (5 Ekosistem Teras) */}
      <LandingBento stats={stats} />

      {/* 6. Teras Kepintaran Buatan Nexus (Audit Kertas Kerja Pantas) */}
      <LandingNexusAI />

      {/* 7. Statistik & Impak Sebenar Kampus */}
      <LandingStats stats={stats} />

      {/* 8. Gerakan Seruan Tindakan (CTA Bersatu) */}
      <LandingCta />

      {/* 9. Pengaki Halaman Rasmi */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
