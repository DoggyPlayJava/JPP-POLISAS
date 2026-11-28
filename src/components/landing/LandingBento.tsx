import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  BarChart3,
  GraduationCap,
  ShoppingCart,
  HeartHandshake,
  ArrowUpRight,
  Receipt,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpotlightCard } from './SpotlightCard';
import { BentoModule, CampusStats } from './landingTypes';

interface LandingBentoProps {
  stats: CampusStats;
}

export const LandingBento: React.FC<LandingBentoProps> = ({ stats: _stats }) => {
  const { t } = useTranslation(['portal', 'common']);
  const navigate = useNavigate();

  const modules: Array<BentoModule & { capabilityLabel: string }> = [
    {
      id: 'ekpp',
      title: t('portal:module_eaktiviti_title', 'e-Aktiviti'),
      subtitle: t('portal:module_eaktiviti_subtitle', 'Nadi Organisasi'),
      desc: t(
        'portal:module_eaktiviti_desc',
        'Sistem tadbir urus rasmi untuk 21 kelab & persatuan berdaftar POLISAS. Automasi kertas kerja dan pelaporan bulanan secara digital.'
      ),
      icon: Shield,
      color: '#0F766E',
      accentColor: '#0D9488',
      path: '/portal',
      stats: [],
      capabilityLabel: t(
        'portal:landing_bento_eaktiviti_cap',
        'Aliran Kertas Kerja HEP & Laporan Bulanan Digital'
      ),
      preview: (
        <div className="flex flex-col gap-2 p-3.5 sm:p-4 h-full justify-center">
          {[
            {
              name: 'PePKa (Awam)',
              status: t('portal:status_approved_hep', 'Diluluskan HEP'),
            },
            {
              name: 'Robosas (Robotik)',
              status: t('portal:status_in_review', 'Dalam Semakan'),
            },
            {
              name: 'ICS (Kerohanian)',
              status: t('portal:status_budget_verified', 'Bajet Disahkan'),
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" aria-hidden="true" />
                <span className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9] truncate">
                  {item.name}
                </span>
              </div>
              <span className="text-xs font-medium text-[#0F766E] dark:text-[#2DD4BF] shrink-0 whitespace-nowrap">
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
      stats: [],
      capabilityLabel: t(
        'portal:landing_bento_keusahawanan_cap',
        'POS Kampus, Inventori Gerai & Jualan Langsung'
      ),
      preview: (
        <div className="flex flex-col justify-between gap-2.5 p-3.5 sm:p-4 h-full">
          {/* Merchant POS Summary Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Receipt className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9] truncate">
                {t('portal:landing_bento_pos_header', 'POS Siswa · Gerai Aktif')}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-xs font-medium text-[#0F766E] dark:text-[#2DD4BF] shrink-0">
              {t('portal:landing_bento_pos_today', 'Hari Ini')}
            </span>
          </div>

          {/* 2-Column Honest POS Totals */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] px-3 py-2">
              <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] block">
                {t('portal:landing_bento_pos_daily_sales', 'Jualan Harian')}
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-[#0B2420] dark:text-[#F1F5F9]">
                RM 428.50
              </span>
            </div>
            <div className="rounded-xl bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] px-3 py-2">
              <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] block">
                {t('portal:landing_bento_pos_qr_tx', 'Transaksi QR')}
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-[#0F766E] dark:text-[#2DD4BF]">
                48
              </span>
            </div>
          </div>

          {/* Recent Campus Merchant Receipts */}
          <div className="space-y-1.5">
            {[
              { stall: 'Dapur Siswa Semambu', method: 'DuitNow QR', amount: 'RM 14.50' },
              { stall: 'Kopi Kafe JKE', method: 'JPP Pay', amount: 'RM 6.00' },
            ].map((tx, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-[#13171D] border border-[#B8E4DC]/60 dark:border-[#252B35] text-xs"
              >
                <span className="font-medium text-[#0B2420] dark:text-[#F1F5F9] truncate">{tx.stall}</span>
                <span className="font-mono tabular-nums font-semibold text-[#0F766E] dark:text-[#2DD4BF] shrink-0">
                  {tx.amount}
                </span>
              </div>
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
      color: '#0F766E',
      accentColor: '#0D9488',
      path: '/akademik',
      stats: [],
      capabilityLabel: t(
        'portal:landing_bento_akademik_cap',
        '5 Jabatan POLISAS · Jadual & HPNM'
      ),
      preview: (
        <div className="relative w-full h-full overflow-hidden group/prev">
          <img
            src="/GAMBAR/Automated E-akademik integration view.png"
            alt="Automated E-akademik View"
            width={1280}
            height={720}
            className="w-full h-full object-cover object-left-top transition-transform duration-200 group-hover/prev:scale-[1.03]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B2420]/90 via-[#0B2420]/25 to-transparent dark:from-[#090B0E]/95 dark:via-[#090B0E]/25 flex items-end p-3.5">
            <div className="flex items-center justify-between w-full gap-2">
              <span className="text-xs font-semibold text-white leading-tight">
                {t('portal:landing_bento_akademik_label', 'Jadual & Navigasi PolyMaps')}
              </span>
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#2DD4BF] text-[#090B0E] shrink-0">
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
      accentColor: '#2DD4BF',
      path: '/polymart',
      stats: [],
      colSpan: 'lg:col-span-2',
      capabilityLabel: t(
        'portal:landing_bento_polymart_cap',
        '100% JPP Pay Tanpa Tunai · Peniaga Siswa'
      ),
      preview: (
        <div className="flex flex-col gap-2.5 p-3.5 sm:p-5 h-full justify-center bg-[#061714] dark:bg-[#0E1116]">
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
          ].map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#0B2420] dark:bg-[#1B2028] border border-[#1E4D45] dark:border-[#252B35] hover:border-[#2DD4BF]/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/15 dark:bg-[#2DD4BF]/15 flex items-center justify-center shrink-0 text-[#2DD4BF] font-semibold text-xs font-mono">
                #{item.id}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-[#F6FBF9] dark:text-[#F1F5F9] truncate">
                  {item.name}
                </p>
                <p className="text-xs font-normal text-[#B8E4DC] dark:text-[#94A0B2] truncate">
                  {item.vendor === 'Rasmi JPP' ? t('portal:official_jpp', 'Rasmi JPP') : item.vendor}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs sm:text-sm font-semibold text-[#2DD4BF] block font-mono tabular-nums">
                  {item.price}
                </span>
                <span className="text-xs font-normal text-[#B8E4DC] dark:text-[#94A0B2]">
                  {t('portal:status_completed', item.status)}
                </span>
              </div>
            </div>
          ))}
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
      accentColor: '#0F766E',
      path: '/kebajikan',
      stats: [],
      capabilityLabel: t(
        'portal:landing_bento_kebajikan_cap',
        '24/7 Tindakan Pantas & Food Bank Siswa'
      ),
      preview: (
        <div className="relative w-full h-full overflow-hidden group/prev">
          <img
            src="/GAMBAR/Aduan Kebajikan Status Portal View.png"
            alt="Aduan Kebajikan Status Portal View"
            width={1280}
            height={720}
            className="w-full h-full object-cover object-top transition-transform duration-200 group-hover/prev:scale-[1.03]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B2420]/90 via-[#0B2420]/25 to-transparent dark:from-[#090B0E]/95 dark:via-[#090B0E]/25 flex items-end p-3.5">
            <div className="flex items-center justify-between w-full gap-2">
              <span className="text-xs font-semibold text-white leading-tight">
                {t('portal:landing_bento_kebajikan_label', 'Radar Kebajikan & Food Bank')}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF] text-white dark:text-[#090B0E] shrink-0">
                {t('portal:landing_bento_kebajikan_active', '24/7 Aktif')}
              </span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="modul" className="py-16 md:py-24 px-4 md:px-6 max-w-7xl mx-auto relative z-20 scroll-mt-24">
      {/* Stacked Focused Section Header */}
      <div className="max-w-3xl mb-10 md:mb-14 space-y-3">
        <h2 className="text-3xl sm:text-4xl md:text-[3.1rem] font-bold tracking-[-0.025em] text-[#0B2420] dark:text-[#F1F5F9] leading-[1.08] [text-wrap:balance]">
          {t('portal:features_heading', 'Ciri-Ciri Menyeluruh Platform')}
        </h2>
        <p className="text-sm md:text-base text-[#3B635C] dark:text-[#94A0B2] font-normal leading-relaxed max-w-2xl">
          {t(
            'portal:features_desc',
            '5 tonggak utama sistem mengintegrasikan seluruh pentadbiran kokurikulum, kebajikan, perniagaan kampus, dan rekod siswa dalam satu sistem bersatu.'
          )}
        </p>
      </div>

      {/* Bento Cards Grid — Full-Width Unclipped Previews & Obsidian Dark Parity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 grid-flow-dense gap-5 md:gap-6">
        {modules.map((m) => {
          const isFlagship = m.id === 'polymart';

          return (
            <SpotlightCard
              key={m.id}
              onClick={() => navigate(m.path)}
              spotlightColor={isFlagship ? 'rgba(45, 212, 191, 0.12)' : 'rgba(13, 148, 136, 0.08)'}
              className={cn(
                'p-6 sm:p-7 flex flex-col h-full shadow-surface-sm',
                isFlagship
                  ? '!bg-[#0B2420] dark:!bg-[#13171D] !border-[#1E4D45] dark:!border-[#252B35] hover:!border-[#2DD4BF]/60 text-[#F6FBF9] dark:text-[#F1F5F9]'
                  : 'bg-white dark:bg-[#13171D] dark:border-[#252B35] dark:hover:border-[#2DD4BF]/50',
                m.colSpan
              )}
            >
              {/* Top Bar of Card */}
              <div className="flex items-start justify-between mb-5">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xs transition-transform duration-200 group-hover:scale-105',
                    isFlagship
                      ? 'bg-[#14B8A6]/15 dark:bg-[#1B2028] text-[#2DD4BF]'
                      : 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF]'
                  )}
                >
                  <m.icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div
                  className={cn(
                    'w-9 h-9 rounded-full border flex items-center justify-center transition-colors duration-200',
                    isFlagship
                      ? 'border-[#1E4D45] dark:border-[#252B35] bg-[#061714] dark:bg-[#0E1116] text-[#2DD4BF] group-hover:bg-[#2DD4BF] group-hover:text-[#090B0E]'
                      : 'border-[#B8E4DC] dark:border-[#252B35] bg-[#F6FBF9] dark:bg-[#1B2028] text-[#0B2420] dark:text-[#F1F5F9] group-hover:bg-[#0F766E] dark:group-hover:bg-[#2DD4BF] group-hover:text-white dark:group-hover:text-[#090B0E]'
                  )}
                >
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>

              {/* Middle Content */}
              <div className="mb-5">
                <span
                  className={cn(
                    'text-xs font-semibold block mb-1',
                    isFlagship ? 'text-[#2DD4BF]' : 'text-[#0F766E] dark:text-[#2DD4BF]'
                  )}
                >
                  {m.subtitle}
                </span>
                <h3
                  className={cn(
                    'text-xl md:text-2xl font-bold mb-2 tracking-tight',
                    isFlagship ? 'text-[#F6FBF9] dark:text-[#F1F5F9]' : 'text-[#0B2420] dark:text-[#F1F5F9]'
                  )}
                >
                  {m.title}
                </h3>
                <p
                  className={cn(
                    'text-sm font-normal leading-relaxed',
                    isFlagship ? 'text-[#B8E4DC] dark:text-[#94A0B2]' : 'text-[#3B635C] dark:text-[#94A0B2]'
                  )}
                >
                  {m.desc}
                </p>
              </div>

              {/* Full-Width Unclipped Preview Surface */}
              <div
                className={cn(
                  'mt-auto rounded-2xl border overflow-hidden relative',
                  isFlagship
                    ? 'bg-[#061714] dark:bg-[#0E1116] border-[#1E4D45] dark:border-[#252B35] min-h-[212px]'
                    : 'bg-[#F6FBF9] dark:bg-[#0E1116] border-[#B8E4DC]/80 dark:border-[#252B35] min-h-[196px] aspect-[16/10]'
                )}
              >
                {m.preview}
              </div>

              {/* Quiet Single-Line Capability Footer (zero redundant stat repetition) */}
              <div
                className={cn(
                  'mt-4 pt-3.5 border-t flex items-center justify-between gap-2 text-xs font-medium',
                  isFlagship
                    ? 'border-[#1E4D45] dark:border-[#252B35] text-[#B8E4DC] dark:text-[#94A0B2]'
                    : 'border-[#B8E4DC]/70 dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2]'
                )}
              >
                <span>{m.capabilityLabel}</span>
              </div>
            </SpotlightCard>
          );
        })}
      </div>
    </section>
  );
};

export default LandingBento;
