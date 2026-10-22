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
      color: '#2E3A2F',
      accentColor: '#6B7F5B',
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
              dot: '#6B7F5B',
            },
            {
              name: 'Robosas (Robotik)',
              status: t('portal:status_in_review', 'Dalam Semakan'),
              dot: '#C96F4F',
            },
            {
              name: 'ICS (Kerohanian)',
              status: t('portal:status_budget_verified', 'Bajet Disahkan'),
              dot: '#6B7F5B',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#D9C9B2]/80 shadow-2xs hover:border-[#6B7F5B] transition-colors"
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.dot }} />
              <span className="text-xs font-bold text-[#2E3A2F] truncate">{item.name}</span>
              <span className="ml-auto text-[9px] font-semibold text-[#6B7F5B] hidden sm:block">
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
      color: '#6B7F5B',
      accentColor: '#C96F4F',
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
                className="w-4 md:w-6 lg:w-7 h-full origin-bottom bg-gradient-to-t from-[#6B7F5B]/30 to-[#6B7F5B] rounded-t-md shadow-xs"
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
      color: '#2E3A2F',
      accentColor: '#6B7F5B',
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#2E3A2F]/85 via-[#2E3A2F]/20 to-transparent flex items-end p-3">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-bold text-white tracking-wide truncate">
                Jadual & Navigasi PolyMaps
              </span>
              <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-[#6B7F5B] text-white">
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
      color: '#C96F4F',
      accentColor: '#2E3A2F',
      path: '/polymart',
      stats: [
        { value: `${stats.productsCount}+`, label: t('portal:stat_menu_items_label', 'Pilihan Menu & Barang') },
        { value: '100%', label: t('portal:stat_cashless_secure_label', 'JPP Pay Tanpa Tunai') },
      ],
      colSpan: 'lg:col-span-2',
      preview: (
        <div className="flex w-full h-full p-4 md:p-6 items-center justify-between overflow-hidden relative">
          {/* Left Icon Display */}
          <div className="w-1/3 flex flex-col items-center justify-center relative z-10 pl-2 md:pl-4">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-[#C96F4F]/15 border border-[#C96F4F]/40 flex items-center justify-center shadow-xs mb-3"
            >
              <ShoppingCart className="w-8 h-8 md:w-10 md:h-10 text-[#C96F4F]" />
            </motion.div>
            <div className="h-2 w-16 bg-[#C96F4F]/30 rounded-full" />
          </div>

          {/* Right Product Items (Chicken Popcorn, Loaded Fries, Lanyard) */}
          <div className="w-2/3 flex flex-col gap-2.5 relative pr-2 md:pr-4">
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
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#D9C9B2]/80 ml-2 md:ml-4 shadow-2xs hover:border-[#C96F4F] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[#C96F4F]/15 flex items-center justify-center flex-shrink-0 text-[#C96F4F] font-black text-xs font-mono">
                  #{item.id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-[#2E3A2F] truncate">{item.name}</p>
                  <p className="text-[9px] font-bold text-[#6B7F5B]">
                    {item.vendor === 'Rasmi JPP' ? t('portal:official_jpp', 'Rasmi JPP') : item.vendor}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-black text-[#C96F4F] block font-mono">
                    {item.price}
                  </span>
                  <span className="text-[8px] font-bold text-[#6B7F5B]">
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
      color: '#6B7F5B',
      accentColor: '#2E3A2F',
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#2E3A2F]/90 via-[#2E3A2F]/20 to-transparent flex items-end p-3">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-bold text-white tracking-wide truncate">
                Radar Kebajikan & Food Bank
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#C96F4F] text-white">
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
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 mb-16 md:mb-20">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#C96F4F]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#556453]">
              {t('portal:landing_bento_tag', 'Modul Bersepadu')}
            </span>
          </div>
          <h2 className="text-4xl sm:text-6xl md:text-[4.5rem] font-black tracking-tight text-[#2E3A2F] leading-[0.96]">
            {t('portal:features_heading', 'Ciri-Ciri Menyeluruh Platform')}
          </h2>
        </div>
        <p className="max-w-md text-sm md:text-base text-[#556453] font-medium leading-relaxed pb-2">
          {t(
            'portal:features_desc',
            '5 tonggak utama sistem mengintegrasikan seluruh pentadbiran kokurikulum, kebajikan, perniagaan kampus, dan rekod siswa dalam satu sistem bersatu.'
          )}
        </p>
      </div>

      {/* Bento Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {modules.map((m) => (
          <SpotlightCard
            key={m.id}
            onClick={() => navigate(m.path)}
            className={cn('p-8 md:p-10 flex flex-col h-full bg-white', m.colSpan)}
          >
            {/* Top Bar of Card */}
            <div className="flex items-start justify-between mb-8">
              <div
                className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundColor: `${m.color}15`, color: m.color }}
              >
                <m.icon className="w-7 h-7 md:w-8 md:h-8" />
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-[#D9C9B2] flex items-center justify-center bg-[#F8F6EE] group-hover:bg-[#C96F4F] group-hover:text-white transition-colors">
                <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-[#2E3A2F] group-hover:text-white" />
              </div>
            </div>

            {/* Middle Content */}
            <div className="flex-1 mb-8">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7F5B] block mb-2">
                {m.subtitle}
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-[#2E3A2F] mb-3 tracking-tight">
                {m.title}
              </h3>
              <p className="text-sm text-[#556453] font-medium leading-relaxed">{m.desc}</p>
            </div>

            {/* Bottom Preview + Stat Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#D9C9B2]/60">
              <div className="rounded-2xl bg-[#F8F6EE] border border-[#D9C9B2]/70 aspect-[4/3] sm:aspect-square overflow-hidden relative">
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
                      <span className="text-lg md:text-xl font-black text-[#2E3A2F] tracking-tight font-mono tabular-nums">
                        {value}
                      </span>
                      <span className="text-[9px] font-bold text-[#556453] uppercase tracking-wider">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
};

export default LandingBento;
