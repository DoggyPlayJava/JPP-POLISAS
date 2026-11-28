import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Calendar, ShieldCheck } from 'lucide-react';
import { scrollToLandingSection } from './LandingNavbar';

export const LandingFooter: React.FC = () => {
  const { t } = useTranslation(['portal', 'common']);

  const pageAnchors = [
    { label: t('portal:nav_ecosystem', 'Ekosistem'), href: '#ekosistem' },
    { label: t('portal:nav_campus_life', 'Hari Kampus'), href: '#hari-kampus' },
    { label: t('portal:nav_main_modules', 'Modul'), href: '#modul' },
    { label: t('portal:nav_nexus_ai', 'Nexus AI'), href: '#nexus' },
    { label: t('portal:nav_statistics', 'Statistik'), href: '#statistik' },
  ];

  const coreModules = [
    { label: t('portal:module_eaktiviti_title', 'e-Aktiviti'), href: '/portal' },
    { label: t('portal:module_polymart_title', 'PolyMart'), href: '/polymart' },
    { label: t('portal:module_akademik_title', 'e-Akademik'), href: '/akademik' },
    { label: t('portal:module_kebajikan_title', 'e-Kebajikan'), href: '/kebajikan' },
    { label: t('portal:module_keusahawanan_title', 'e-Keusahawanan'), href: '/keusahawanan' },
  ];

  return (
    <footer className="w-full bg-[#EBF7F4] dark:bg-[#0E1116] border-t border-[#B8E4DC] dark:border-[#252B35] pt-14 pb-10 px-4 md:px-6 relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 pb-10 border-b border-[#B8E4DC]/80 dark:border-[#252B35]">
          {/* Col 1: Brand Identity */}
          <div className="sm:col-span-2 lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] p-1.5 flex items-center justify-center shadow-2xs shrink-0">
                <img
                  src="/jpp-logo.png"
                  alt="JPP POLISAS"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.includes('GAMBAR')) {
                      img.src = '/GAMBAR/Logo Rasmi JPP.png';
                    }
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-[#0B2420] dark:text-[#F1F5F9]">
                  JPP POLISAS
                </span>
                <span className="text-xs font-medium text-[#0F766E] dark:text-[#2DD4BF]">
                  {t('portal:mpp_new_session', 'Majlis Perwakilan Pelajar Sesi Baharu')}
                </span>
              </div>
            </div>

            <p className="text-sm text-[#3B635C] dark:text-[#94A0B2] leading-relaxed max-w-md font-normal">
              {t(
                'portal:landing_footer_desc',
                'Portal digital rasmi mahasiswa Politeknik Sultan Haji Ahmad Shah (POLISAS) yang menyatukan tadbir urus kelab, kebajikan, keusahawanan, dan akademik.'
              )}
            </p>
          </div>

          {/* Col 2: Page Navigation */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0B2420] dark:text-[#F1F5F9]">
              {t('portal:landing_footer_nav_heading', 'Navigasi Halaman')}
            </h3>
            <ul className="space-y-2.5 text-sm font-medium text-[#3B635C] dark:text-[#94A0B2]">
              {pageAnchors.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToLandingSection(item.href);
                    }}
                    className="hover:text-[#0F766E] dark:hover:text-[#2DD4BF] transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Core Modules */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0B2420] dark:text-[#F1F5F9]">
              {t('portal:landing_footer_modules_heading', 'Modul Teras')}
            </h3>
            <ul className="space-y-2.5 text-sm font-medium text-[#3B635C] dark:text-[#94A0B2]">
              {coreModules.map((mod) => (
                <li key={mod.href}>
                  <a
                    href={mod.href}
                    className="hover:text-[#0F766E] dark:hover:text-[#2DD4BF] transition-colors"
                  >
                    {mod.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Campus & Session Info */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0B2420] dark:text-[#F1F5F9]">
              {t('portal:landing_footer_campus_heading', 'Kampus & Sesi')}
            </h3>
            <div className="space-y-2.5 text-sm text-[#3B635C] dark:text-[#94A0B2]">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Politeknik Sultan Haji Ahmad Shah,{' '}
                  {t('portal:landing_footer_campus_address', 'Semambu, 25350 Kuantan, Pahang')}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" aria-hidden="true" />
                <span>{t('portal:landing_cta_session', 'Sesi Akademik 2026/2027')}</span>
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" aria-hidden="true" />
                <span>{t('portal:landing_cta_official_account', 'Akaun Rasmi Siswa POLISAS')}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-[#3B635C] dark:text-[#94A0B2]">
          <p>
            {t(
              'portal:footer_copyright',
              '© 2026 JPP Digital Portal POLISAS. Hak Cipta Terpelihara.'
            )}
          </p>
          <p className="text-[#0F766E] dark:text-[#2DD4BF]">
            {t('portal:landing_footer_built_by', 'Dibangunkan oleh JPP POLISAS · Kampus Semambu')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
