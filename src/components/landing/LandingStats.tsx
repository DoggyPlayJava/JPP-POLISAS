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
      icon: <ShieldCheck className="w-5 h-5 text-[#2DD4BF]" />,
      label: t('portal:stats_registered_leader_clubs', 'Kelab Pemimpin Berdaftar'),
      val: `${stats.clubsCount}`,
      sub: t('portal:landing_stats_sub_entities', '21 Entiti Sah'),
    },
    {
      icon: <Users className="w-5 h-5 text-[#5EEAD4]" />,
      label: t('portal:stats_current_registered_students', 'Mahasiswa Berdaftar Semasa'),
      val: `${stats.studentsCount.toLocaleString()}+`,
      sub: t('portal:landing_stats_sub_departments', '5 Jabatan Utama'),
    },
    {
      icon: <Activity className="w-5 h-5 text-[#B8E4DC]" />,
      label: t('portal:stats_monitored_activities', 'Aktiviti & Kertas Kerja Dipantau'),
      val: `${stats.activitiesCount}`,
      sub: t('portal:landing_stats_sub_auto', 'Automasi Penuh'),
    },
    {
      icon: <ShoppingBag className="w-5 h-5 text-[#2DD4BF]" />,
      label: t('portal:stats_polymart_student_products', 'Produk Siswa di PolyMart'),
      val: `${stats.productsCount}+`,
      sub: t('portal:landing_stats_sub_catalog', 'Gerai & Katalog'),
    },
  ];

  return (
    <section id="statistik" className="py-20 md:py-28 px-4 md:px-6 max-w-7xl mx-auto relative z-20">
      <div className="rounded-[2.5rem] md:rounded-[3.5rem] bg-[#0B2420] text-white p-8 sm:p-12 md:p-16 border border-[#1E4D45] shadow-[0_25px_60px_rgba(11,36,32,0.22)] relative overflow-hidden">
        {/* Subtle Ambient Telemetry Glows */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#14B8A6]/15 rounded-full blur-xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#0D9488]/10 rounded-full blur-xl pointer-events-none" />

        {/* Section Mini Header */}
        <div className="text-center mb-12 md:mb-16 relative z-10">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest text-[#B8E4DC] mb-3">
            {t('portal:landing_stats_badge', 'Impak & Data Kampus')}
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#F6FBF9] tracking-tight">
            {t('portal:landing_stats_title', 'Angka Sebenar Menggerakkan POLISAS')}
          </h2>
        </div>

        {/* 4 Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 md:divide-x divide-white/10 relative z-10">
          {statItems.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={typeof window === 'undefined' ? { opacity: 1, y: 0 } : undefined}
              {...(typeof window !== 'undefined' ? { whileInView: { opacity: 1, y: 0 }, viewport: { once: true } } : {})}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`text-center space-y-2 md:space-y-3 ${i !== 0 ? 'md:pl-8' : ''}`}
            >
              <div className="mx-auto w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                {s.icon}
              </div>
              <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#F6FBF9] tracking-tight font-mono tabular-nums">
                {s.val}
              </p>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#B8E4DC] leading-tight">
                {s.label}
              </p>
              <span className="text-[9px] font-semibold text-[#5EEAD4] block">
                {s.sub}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Live Telemetry Secondary Pill */}
        <div className="mt-12 flex justify-center relative z-10">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#B8E4DC] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-pulse" />
            <span className="font-mono font-bold text-white">{`${stats.ordersCount}+`}</span>
            <span>{t('portal:landing_stats_completed_orders', 'Pesanan Diselesaikan')}</span>
            <span className="text-white/30 hidden sm:inline">•</span>
            <span className="text-[#5EEAD4] font-bold text-[11px] hidden sm:inline">
              {t('portal:landing_stats_sub_transactions', 'Transaksi Kampus')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingStats;
