import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Zap,
  BarChart3,
  GraduationCap,
  Shield,
  ShoppingCart,
  HeartHandshake,
} from 'lucide-react';
import { CampusStats } from './landingTypes';

interface LandingTickerProps {
  stats: CampusStats;
}

export const LandingTicker: React.FC<LandingTickerProps> = ({ stats }) => {
  const { t } = useTranslation(['portal', 'common']);

  const tickerItems = [
    {
      icon: <Zap className="w-3.5 h-3.5 text-[#C96F4F]" />,
      text: t('portal:ticker_nexus_ai', 'Nexus AI: Semakan Dokumen & Kertas Kerja Pintar'),
    },
    {
      icon: <BarChart3 className="w-3.5 h-3.5 text-[#6B7F5B]" />,
      text: t(
        'portal:ticker_keusahawanan',
        `e-Keusahawanan: ${stats.productsCount}+ Produk & ${stats.ordersCount}+ Pesanan PolyMart`,
        { products: stats.productsCount, orders: stats.ordersCount }
      ),
    },
    {
      icon: <GraduationCap className="w-3.5 h-3.5 text-[#2E3A2F]" />,
      text: t(
        'portal:ticker_akademik',
        `e-Akademik: ${stats.studentsCount.toLocaleString()}+ Rekod Siswa Sesi 2026/2027`,
        { students: stats.studentsCount.toLocaleString() }
      ),
    },
    {
      icon: <Shield className="w-3.5 h-3.5 text-[#2E3A2F]" />,
      text: t(
        'portal:ticker_eaktiviti',
        `e-Aktiviti: ${stats.clubsCount} Kelab Berdaftar & ${stats.activitiesCount} Aktiviti Rasmi`,
        { clubs: stats.clubsCount, activities: stats.activitiesCount }
      ),
    },
    {
      icon: <ShoppingCart className="w-3.5 h-3.5 text-[#C96F4F]" />,
      text: t('portal:ticker_polymart', 'PolyMart: Pasaran Siswa POLISAS • JPP Pay Selamat'),
    },
    {
      icon: <HeartHandshake className="w-3.5 h-3.5 text-[#6B7F5B]" />,
      text: t('portal:ticker_kebajikan', 'e-Kebajikan: Pemantauan Kediaman Luar & Kamsis Bersepadu'),
    },
  ];

  return (
    <div
      id="ekosistem"
      className="w-full bg-[#F2EDE4] border-y border-[#D9C9B2] py-3.5 md:py-4 overflow-hidden flex items-center relative z-20 group"
    >
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ ease: 'linear', duration: 40, repeat: Infinity }}
        className="flex whitespace-nowrap gap-8 md:gap-14 items-center transform-gpu will-change-transform group-hover:[animation-play-state:paused]"
      >
        {[...Array(4)].map((_, loopIdx) => (
          <React.Fragment key={loopIdx}>
            {tickerItems.map((item, itemIdx) => (
              <React.Fragment key={`${loopIdx}-${itemIdx}`}>
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span className="text-[11px] md:text-xs font-bold text-[#2E3A2F] tracking-tight">
                    {item.text}
                  </span>
                </div>
                <div className="flex items-center px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5B]" />
                </div>
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
};

export default LandingTicker;
