import React from 'react';
import { useTranslation } from 'react-i18next';
import { scrollToLandingSection } from './LandingNavbar';

export const LandingFooter: React.FC = () => {
  const { t } = useTranslation(['portal', 'common']);

  return (
    <footer className="w-full bg-[#F2EDE4] border-t border-[#D9C9B2] py-14 px-4 md:px-6 relative z-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
        {/* Brand & Badge */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-white border border-[#D9C9B2] p-1.5 flex items-center justify-center shadow-2xs">
            <img
              src="/jpp-logo.png"
              alt="JPP POLISAS"
              className="w-full h-full object-contain"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.includes('GAMBAR')) {
                  img.src = '/GAMBAR/Logo Rasmi JPP.png';
                }
              }}
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-black text-sm tracking-tight text-[#2E3A2F]">
              JPP POLISAS
            </span>
            <span className="text-[9px] font-bold text-[#6B7F5B] uppercase tracking-wider">
              {t('portal:mpp_new_session', 'Majlis Perwakilan Pelajar Sesi Baharu')}
            </span>
          </div>
        </div>

        {/* Quick Nav Anchors */}
        <div className="flex flex-wrap justify-center items-center gap-6 text-xs font-semibold text-[#556453]">
          <a
            href="#ekosistem"
            onClick={(e) => {
              e.preventDefault();
              scrollToLandingSection('#ekosistem');
            }}
            className="hover:text-[#2E3A2F] transition-colors"
          >
            {t('portal:nav_ecosystem', 'Ekosistem')}
          </a>
          <a
            href="#hari-kampus"
            onClick={(e) => {
              e.preventDefault();
              scrollToLandingSection('#hari-kampus');
            }}
            className="hover:text-[#2E3A2F] transition-colors"
          >
            {t('portal:nav_campus_life', 'Hari Kampus')}
          </a>
          <a
            href="#modul"
            onClick={(e) => {
              e.preventDefault();
              scrollToLandingSection('#modul');
            }}
            className="hover:text-[#2E3A2F] transition-colors"
          >
            {t('portal:nav_main_modules', 'Modul')}
          </a>
          <a
            href="#nexus"
            onClick={(e) => {
              e.preventDefault();
              scrollToLandingSection('#nexus');
            }}
            className="hover:text-[#2E3A2F] transition-colors"
          >
            {t('portal:nav_nexus_ai', 'Nexus AI')}
          </a>
          <a
            href="#statistik"
            onClick={(e) => {
              e.preventDefault();
              scrollToLandingSection('#statistik');
            }}
            className="hover:text-[#2E3A2F] transition-colors"
          >
            {t('portal:nav_statistics', 'Statistik')}
          </a>
        </div>

        {/* Copyright Notice */}
        <p className="text-[10px] font-medium text-[#556453]">
          {t(
            'portal:footer_copyright',
            '© 2026 JPP Digital Portal POLISAS. Hak Cipta Terpelihara.'
          )}
        </p>
      </div>
    </footer>
  );
};

export default LandingFooter;
