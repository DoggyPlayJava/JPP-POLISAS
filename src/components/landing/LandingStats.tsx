import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ShieldCheck, Users, Activity, ShoppingBag } from 'lucide-react';
import { CampusStats } from './landingTypes';

interface LandingStatsProps {
  stats: CampusStats;
}

export const LandingStats: React.FC<LandingStatsProps> = ({ stats }) => {
  const { t } = useTranslation(['portal', 'common']);

  const statItems = [
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#2DD4BF]" aria-hidden="true" />,
      label: t('portal:stats_registered_leader_clubs', 'Kelab Pemimpin Berdaftar'),
      val: `${stats.clubsCount}`,
      sub: t('portal:landing_stats_sub_entities', '21 Entiti Sah'),
    },
    {
      icon: <Users className="w-5 h-5 text-[#2DD4BF]" aria-hidden="true" />,
      label: t('portal:stats_current_registered_students', 'Mahasiswa Berdaftar Semasa'),
      val: `${stats.studentsCount.toLocaleString()}+`,
      sub: t('portal:landing_stats_sub_departments', '5 Jabatan Utama'),
    },
    {
      icon: <Activity className="w-5 h-5 text-[#2DD4BF]" aria-hidden="true" />,
      label: t('portal:stats_monitored_activities', 'Aktiviti & Kertas Kerja Dipantau'),
      val: `${stats.activitiesCount}`,
      sub: t('portal:landing_stats_sub_auto', 'Automasi Penuh'),
    },
    {
      icon: <ShoppingBag className="w-5 h-5 text-[#2DD4BF]" aria-hidden="true" />,
      label: t('portal:stats_polymart_student_products', 'Produk Siswa di PolyMart'),
      val: `${stats.productsCount}+`,
      sub: t('portal:landing_stats_sub_catalog', 'Gerai & Katalog'),
    },
  ];

  return (
    <section id="statistik" className="py-16 md:py-24 px-4 md:px-6 max-w-7xl mx-auto relative z-20 scroll-mt-24">
      <div className="rounded-[2rem] md:rounded-[2.75rem] bg-[#0B2420] dark:bg-[#13171D] text-white p-7 sm:p-10 md:p-14 border border-[#1E4D45] dark:border-[#252B35] shadow-surface-lg relative overflow-hidden">
        {/* Subtle Radial Gradient Accent (zero CSS filter blur) */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[560px] h-40 bg-[radial-gradient(circle,rgba(45,212,191,0.10)_0%,transparent_70%)] pointer-events-none"
          aria-hidden="true"
        />

        {/* Section Header */}
        <div className="text-center mb-10 md:mb-14 relative z-10">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 dark:bg-[#1B2028] border border-white/10 dark:border-[#252B35] text-xs font-semibold uppercase tracking-widest text-[#B8E4DC] dark:text-[#94A0B2] mb-3">
            {t('portal:landing_stats_badge', 'Impak & Data Kampus')}
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-[2.75rem] font-bold text-[#F6FBF9] dark:text-[#F1F5F9] tracking-[-0.025em] leading-[1.1] [text-wrap:balance]">
            {t('portal:landing_stats_title', 'Angka Sebenar Menggerakkan POLISAS')}
          </h2>
        </div>

        {/* 4 Authoritative Campus Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 md:divide-x divide-white/10 dark:divide-[#252B35] relative z-10">
          {statItems.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={typeof window === 'undefined' ? { opacity: 1, y: 0 } : undefined}
              {...(typeof window !== 'undefined' ? { whileInView: { opacity: 1, y: 0 }, viewport: { once: true } } : {})}
              transition={{ delay: i * 0.05, duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className={`text-center space-y-2 md:space-y-2.5 ${i !== 0 ? 'md:pl-8' : ''}`}
            >
              <div className="mx-auto w-10 h-10 rounded-xl bg-white/10 dark:bg-[#1B2028] border border-white/10 dark:border-[#252B35] flex items-center justify-center mb-2.5">
                {s.icon}
              </div>
              <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F6FBF9] dark:text-[#F1F5F9] tracking-tight font-mono tabular-nums">
                {s.val}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#B8E4DC] dark:text-[#94A0B2] leading-snug">
                {s.label}
              </p>
              <span className="text-xs font-medium text-[#5EEAD4] dark:text-[#2DD4BF] block">
                {s.sub}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Calm Live Telemetry Pill */}
        <div className="mt-10 flex justify-center relative z-10">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.06] dark:bg-[#0E1116] border border-white/10 dark:border-[#252B35] text-xs font-medium text-[#B8E4DC] dark:text-[#94A0B2]">
            <span className="w-2 h-2 rounded-full bg-[#2DD4BF] shrink-0" aria-hidden="true" />
            <span className="font-mono tabular-nums font-bold text-[#F6FBF9] dark:text-[#F1F5F9]">
              {`${stats.ordersCount}+`}
            </span>
            <span>{t('portal:landing_stats_completed_orders', 'Pesanan Diselesaikan')}</span>
            <span className="text-white/30 dark:text-[#252B35] hidden sm:inline" aria-hidden="true">•</span>
            <span className="text-[#5EEAD4] dark:text-[#2DD4BF] font-semibold hidden sm:inline">
              {t('portal:landing_stats_sub_transactions', 'Transaksi Kampus')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingStats;
