import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  BarChart3,
  GraduationCap,
  ShoppingCart,
  HeartHandshake,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpotlightCard } from './SpotlightCard';
import { BentoModule, CampusStats } from './landingTypes';

interface LandingBentoProps {
  stats: CampusStats;
}

export const LandingBento: React.FC<LandingBentoProps> = ({ stats }) => {
  const { t } = useTranslation(['portal', 'common']);
  const navigate = useNavigate();

  const modules: BentoModule[] = [
    {
      id: 'ekpp',
      title: t('portal:module_eaktiviti_title', 'e-Aktiviti'),
      subtitle: t('portal:module_eaktiviti_subtitle', 'Nadi Organisasi'),
      desc: t(
        'portal:module_eaktiviti_desc',
        'Sistem tadbir urus rasmi untuk 21 kelab & persatuan berdaftar POLISAS. Automasi kertas kerja dan pelaporan bulanan secara digital.'
      ),
      icon: Shield,
      color: '#0B2420',
      accentColor: '#0D9488',
      path: '/portal',
      stats: [
        { value: `${stats.clubsCount}`, label: t('portal:stat_registered_clubs_label', 'Kelab Berdaftar') },
        { value: `${stats.activitiesCount}`, label: t('portal:stat_official_activities_label', 'Aktiviti Rasmi') },
      ],
      preview: (
        <div className="flex flex-col gap-2.5 p-4 md:p-6 h-full justify-center">
          {[
            {
              name: 'PePKa (Awam)',
              status: t('portal:status_approved_hep', 'Diluluskan HEP'),
              dot: '#0D9488',
            },
            {
              name: 'Robosas (Robotik)',
              status: t('portal:status_in_review', 'Dalam Semakan'),
              dot: '#0F766E',
            },
            {
              name: 'ICS (Kerohanian)',
              status: t('portal:status_budget_verified', 'Bajet Disahkan'),
              dot: '#0D9488',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-2xs hover:border-[#0D9488] transition-colors"
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.dot }} />
              <span className="text-xs font-bold text-[#0B2420] dark:text-[#F1F5F9] truncate">{item.name}</span>
              <span className="ml-auto text-[11px] font-semibold text-[#0F766E] dark:text-[#2DD4BF] hidden sm:block">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'keusahawanan',
      title: t('portal:module_keusahawanan_title', 'e-Keusahawanan'),
      subtitle: t('portal:module_keusahawanan_subtitle', 'Ekonomi Pintar'),
      desc: t(
        'portal:module_keusahawanan_desc',
        'Memperkasa usahawan siswa POLISAS dengan sistem POS digital terpadu, pengurusan inventori gerai, dan analitik jualan masa nyata.'
      ),
      icon: BarChart3,
      color: '#0D9488',
      accentColor: '#0F766E',
      path: '/keusahawanan',
      stats: [
        { value: `${stats.productsCount}+`, label: t('portal:stat_student_products_label', 'Produk Siswa') },
        { value: `${stats.ordersCount}+`, label: t('portal:stat_campus_orders_label', 'Pesanan Kampus') },
      ],
      preview: (
        <div className="flex items-end gap-2 p-4 md:p-6 h-full justify-center w-full">
          <div className="flex items-end justify-between w-full h-full pb-4">
            {[40, 70, 45, 90, 60, 80, 55].map((h, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: h / 100 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.6 }}
                className="w-4 md:w-6 lg:w-7 h-full origin-bottom bg-gradient-to-t from-[#0D9488]/30 to-[#0D9488] rounded-t-md shadow-xs"
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'akademik',
      title: t('portal:module_akademik_title', 'e-Akademik'),
      subtitle: t('portal:module_akademik_subtitle', 'Kecemerlangan Holistik'),
      desc: t(
        'portal:module_akademik_desc',
        'Semakan maklumat dan pengurusan rekod mahasiswa merentasi Jabatan Kejuruteraan Awam, Mekanikal, Elektrik, Perdagangan dan Teknologi Makanan.'
      ),
      icon: GraduationCap,
      color: '#0B2420',
      accentColor: '#0D9488',
      path: '/akademik',
      stats: [
        { value: `${stats.studentsCount.toLocaleString()}+`, label: t('portal:stat_student_records_label', 'Rekod Siswa') },
        { value: '5', label: t('portal:stat_polisas_departments_label', 'Jabatan POLISAS') },
      ],
      preview: (
        <div className="relative w-full h-full overflow-hidden rounded-xl group/prev">
          <img
            src="/GAMBAR/Automated E-akademik integration view.png"
            alt="Automated E-akademik View"
            className="w-full h-full object-cover object-left-top transition-transform duration-500 group-hover/prev:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B2420]/85 via-[#0B2420]/20 to-transparent flex items-end p-3">
            <div className="flex items-center justify-between w-full gap-2">
              <span className="text-[11px] font-semibold text-white tracking-tight truncate">
                Jadual &amp; Navigasi PolyMaps
              </span>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#14B8A6] text-[#061714] shrink-0">
                4.00 HPNM
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'polymart',
      title: t('portal:module_polymart_title', 'PolyMart'),
      subtitle: t('portal:module_polymart_subtitle', 'Pasaran Mahasiswa'),
      desc: t(
        'portal:module_polymart_desc',
        'Platform e-dagang berpusat khas buat warga POLISAS. Sokong dan pesan makanan, minuman, serta cenderamata rasmi siswa dalam satu hab.'
      ),
      icon: ShoppingCart,
      color: '#0F766E',
      accentColor: '#0B2420',
      path: '/polymart',
      stats: [
        { value: `${stats.productsCount}+`, label: t('portal:stat_menu_items_label', 'Pilihan Menu & Barang') },
        { value: '100%', label: t('portal:stat_cashless_secure_label', 'JPP Pay Tanpa Tunai') },
      ],
      colSpan: 'lg:col-span-2',
      preview: (
        <div className="flex w-full h-full p-4 md:p-5 items-center justify-between overflow-hidden relative bg-[#061714]">
          {/* Left Icon Display */}
          <div className="w-1/3 flex flex-col items-center justify-center relative z-10 pl-1 md:pl-3">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#14B8A6]/15 border border-[#2DD4BF]/35 flex items-center justify-center shadow-xs mb-3">
              <ShoppingCart className="w-8 h-8 md:w-10 md:h-10 text-[#2DD4BF]" />
            </div>
            <div className="h-1.5 w-14 bg-[#2DD4BF]/35 rounded-full" />
          </div>

          {/* Right Product Items (Chicken Popcorn, Loaded Fries, Lanyard) */}
          <div className="w-2/3 flex flex-col gap-2 relative pr-1 md:pr-2">
            {[
              {
                id: 1,
                name: 'CHICKEN POPCORN',
                vendor: 'QUADRA H',
                price: 'RM 9.00',
                status: 'Selesai',
              },
              {
                id: 2,
                name: 'loaded fries original',
                vendor: 'AL-FRIES',
                price: 'RM 6.00',
                status: 'Selesai',
              },
              {
                id: 3,
                name: 'Lanyard JPP POLISAS',
                vendor: 'Rasmi JPP',
                price: 'RM 15.00',
                status: 'Selesai',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-[#0B2420] border border-[#1E4D45] ml-2 md:ml-3 hover:border-[#2DD4BF]/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/15 flex items-center justify-center shrink-0 text-[#2DD4BF] font-bold text-xs font-mono">
                  #{item.id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#F6FBF9] truncate">{item.name}</p>
                  <p className="text-[11px] font-medium text-[#99CBC2] truncate">
                    {item.vendor === 'Rasmi JPP' ? t('portal:official_jpp', 'Rasmi JPP') : item.vendor}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-[#2DD4BF] block font-mono tabular-nums">
                    {item.price}
                  </span>
                  <span className="text-[11px] font-medium text-[#99CBC2]">
                    {t('portal:status_completed', item.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'kebajikan',
      title: t('portal:module_kebajikan_title', 'e-Kebajikan'),
      subtitle: t('portal:module_kebajikan_subtitle', 'Prihatin & Responsif'),
      desc: t(
        'portal:module_kebajikan_desc',
        'Sistem pelaporan aduan telus, bantuan Food Bank siswa, dan pemantauan penempatan kamsis serta kediaman luar kampus.'
      ),
      icon: HeartHandshake,
      color: '#0D9488',
      accentColor: '#0B2420',
      path: '/kebajikan',
      stats: [
        { value: `${stats.studentsCount.toLocaleString()}+`, label: t('portal:stat_residence_records_label', 'Rekod Kediaman') },
        { value: '24/7', label: t('portal:stat_quick_action_label', 'Tindakan Pantas') },
      ],
      preview: (
        <div className="relative w-full h-full overflow-hidden rounded-xl group/prev">
          <img
            src="/GAMBAR/Aduan Kebajikan Status Portal View.png"
            alt="Aduan Kebajikan Status Portal View"
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover/prev:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B2420]/90 via-[#0B2420]/20 to-transparent flex items-end p-3">
            <div className="flex items-center justify-between w-full gap-2">
              <span className="text-[11px] font-semibold text-white tracking-tight truncate">
                Radar Kebajikan &amp; Food Bank
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#0F766E] text-white shrink-0">
                24/7 Aktif
              </span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="modul" className="py-24 md:py-32 px-4 md:px-6 max-w-7xl mx-auto relative z-20">
      {/* Stacked Focused Section Header (No uppercase eyebrow spam or split filler) */}
      <div className="max-w-3xl mb-14 md:mb-16 space-y-3">
        <h2 className="text-3xl sm:text-5xl md:text-[3.75rem] font-black tracking-[-0.03em] text-[#0B2420] dark:text-[#F1F5F9] leading-[1.02]">
          {t('portal:features_heading', 'Ciri-Ciri Menyeluruh Platform')}
        </h2>
        <p className="text-sm md:text-base text-[#3B635C] dark:text-[#94A0B2] font-normal leading-relaxed max-w-2xl">
          {t(
            'portal:features_desc',
            '5 tonggak utama sistem mengintegrasikan seluruh pentadbiran kokurikulum, kebajikan, perniagaan kampus, dan rekod siswa dalam satu sistem bersatu.'
          )}
        </p>
      </div>

      {/* Gapless Bento Cards Grid with Deep Pine-Teal Flagship Anchoring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 grid-flow-dense gap-6 md:gap-8">
        {modules.map((m) => {
          const isFlagship = m.id === 'polymart';
          const isTintedIce = m.id === 'akademik';

          return (
            <SpotlightCard
              key={m.id}
              onClick={() => navigate(m.path)}
              spotlightColor={isFlagship ? 'rgba(45, 212, 191, 0.14)' : 'rgba(13, 148, 136, 0.09)'}
              className={cn(
                'p-7 sm:p-8 md:p-9 flex flex-col h-full shadow-surface-sm',
                isFlagship
                  ? '!bg-[#0B2420] dark:!bg-[#13171D] !border-[#1E4D45] dark:!border-[#252B35] hover:!border-[#2DD4BF]/60 text-[#F6FBF9]'
                  : isTintedIce
                  ? 'bg-gradient-to-br from-white via-white to-[#EBF7F4]/90 dark:from-[#13171D] dark:via-[#13171D] dark:to-[#1B2028] dark:border-[#252B35]'
                  : 'bg-white dark:bg-[#13171D] dark:border-[#252B35]',
                m.colSpan
              )}
            >
              {/* Top Bar of Card */}
              <div className="flex items-start justify-between mb-7">
                <div
                  className={cn(
                    'w-13 h-13 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-xs transition-transform duration-200 group-hover:scale-105',
                    isFlagship ? '!bg-[#14B8A6]/15 !text-[#2DD4BF]' : 'dark:!bg-[#1B2028] dark:!text-[#2DD4BF]'
                  )}
                  style={!isFlagship ? { backgroundColor: `${m.color}15`, color: m.color } : undefined}
                >
                  <m.icon className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <div
                  className={cn(
                    'w-10 h-10 md:w-11 md:h-11 rounded-full border flex items-center justify-center transition-colors duration-200',
                    isFlagship
                      ? 'border-[#1E4D45] dark:border-[#252B35] bg-[#061714] dark:bg-[#0E1116] text-[#2DD4BF] group-hover:bg-[#2DD4BF] group-hover:text-[#061714]'
                      : 'border-[#B8E4DC] dark:border-[#252B35] bg-[#F6FBF9] dark:bg-[#1B2028] text-[#0B2420] dark:text-[#F1F5F9] group-hover:bg-[#0F766E] dark:group-hover:bg-[#2DD4BF] group-hover:text-white dark:group-hover:text-[#090B0E]'
                  )}
                >
                  <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              </div>

              {/* Middle Content */}
              <div className="flex-1 mb-7">
                <span
                  className={cn(
                    'text-xs font-semibold block mb-1.5',
                    isFlagship ? 'text-[#2DD4BF]' : 'text-[#0F766E] dark:text-[#2DD4BF]'
                  )}
                >
                  {m.subtitle}
                </span>
                <h3
                  className={cn(
                    'text-2xl md:text-[1.75rem] font-bold mb-2.5 tracking-tight',
                    isFlagship ? 'text-[#F6FBF9]' : 'text-[#0B2420] dark:text-[#F1F5F9]'
                  )}
                >
                  {m.title}
                </h3>
                <p
                  className={cn(
                    'text-sm font-normal leading-relaxed',
                    isFlagship ? 'text-[#99CBC2] dark:text-[#94A0B2]' : 'text-[#3B635C] dark:text-[#94A0B2]'
                  )}
                >
                  {m.desc}
                </p>
              </div>

              {/* Bottom Preview + Stat Metrics */}
              <div
                className={cn(
                  'grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t',
                  isFlagship ? 'border-[#1E4D45] dark:border-[#252B35]' : 'border-[#B8E4DC]/60 dark:border-[#252B35]'
                )}
              >
                <div
                  className={cn(
                    'rounded-2xl border aspect-[4/3] sm:aspect-square overflow-hidden relative',
                    isFlagship
                      ? 'bg-[#061714] dark:bg-[#090B0E] border-[#1E4D45] dark:border-[#252B35]'
                      : 'bg-[#F6FBF9] dark:bg-[#0E1116] border-[#B8E4DC]/70 dark:border-[#252B35]'
                  )}
                >
                  {m.preview}
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-center gap-3 py-2 sm:py-0 sm:pl-4">
                  {m.stats.map((s, idx: number) => {
                    let value = '';
                    let label = '';
                    if (typeof s === 'object' && s !== null && 'value' in s) {
                      value = s.value;
                      label = s.label;
                    } else {
                      const str = String(s);
                      const match = str.match(/^([\d,]+(?:\.\d+)?\+?%?)\s+(.+)$/);
                      if (match) {
                        value = match[1];
                        label = match[2];
                      } else if (str.toLowerCase().includes('pay') || str.toLowerCase().includes('qr')) {
                        value = '100%';
                        label = str;
                      } else if (str.toLowerCase().includes('tindakan') || str.toLowerCase().includes('action') || str.toLowerCase().includes('pantas') || str.toLowerCase().includes('quick')) {
                        value = '24/7';
                        label = str;
                      } else {
                        value = '★';
                        label = str;
                      }
                    }
                    return (
                      <div key={idx} className="flex flex-col">
                        <span
                          className={cn(
                            'text-lg md:text-xl font-black tracking-tight font-mono tabular-nums',
                            isFlagship ? 'text-[#F6FBF9]' : 'text-[#0B2420] dark:text-[#F1F5F9]'
                          )}
                        >
                          {value}
                        </span>
                        <span
                          className={cn(
                            'text-[11px] font-medium',
                            isFlagship ? 'text-[#99CBC2] dark:text-[#94A0B2]' : 'text-[#3B635C] dark:text-[#94A0B2]'
                          )}
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SpotlightCard>
          );
        })}
      </div>
    </section>
  );
};

export default LandingBento;
