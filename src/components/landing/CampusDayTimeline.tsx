import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  ShoppingBag,
  Shield,
  HeartHandshake,
  CheckCircle2,
  Sparkles,
  Maximize2,
  X,
  Laptop,
  Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DayPhase } from './landingTypes';

export const CAMPUS_DAY_PHASES: DayPhase[] = [
  {
    id: 'morning',
    time: '08:00 Pagi',
    title: 'Teroka (Discover)',
    subtitle: 'Fasa 1: Kelas Pagi & Orientasi Dewan',
    description:
      'Akses jadual kuliah peribadi, takwim akademik, dan panduan lokasi bilik kuliah di PolyMaps dalam satu paparan masa nyata.',
    badge: 'e-Akademik + PolyMaps',
    image: '/GAMBAR/Automated E-akademik integration view.png',
    secondaryImage: '/GAMBAR/Polymap View Phone.png',
    secondaryLabel: 'Navigasi PolyMaps',
    imageAlt: 'Integrasi Jadual Akademik dan Navigasi PolyMaps',
    deviceType: 'laptop',
    highlights: [
      'Waktu, kod kursus, dan pensyarah tepat pada telefon',
      'Navigasi terus ke pintu dewan dan makmal di PolyMaps',
      'Paparan waktu rehat & waktu solat teratur',
    ],
    tagColor: '#0F766E',
  },
  {
    id: 'noon',
    time: '12:30 Tgh Hari',
    title: 'Muamalat (PolyMart & JPP Pay)',
    subtitle: 'Fasa 2: Rehat Tengah Hari & Kafeteria',
    description:
      'Pesan santapan kafeteria kegemaran tanpa barisan panjang, bayar serta-merta secara tanpa tunai melalui JPP Pay, dan sokong usahawan siswa.',
    badge: 'PolyMart + JPP Pay',
    image: '/GAMBAR/Inside Polymart View Phone.png',
    secondaryImage: '/GAMBAR/Polymart View Phone.png',
    secondaryLabel: 'Katalog PolyMart',
    imageAlt: 'Menu dan Pembelian Pantas di PolyMart',
    deviceType: 'phone',
    highlights: [
      'Pesan makanan kegemaran (Chicken Popcorn, Loaded Fries, dll.)',
      'Pengesahan resit dan kod pesanan digital automatik',
      'Sokongan keusahawanan siswa & kelab POLISAS',
    ],
    tagColor: '#0F766E',
  },
  {
    id: 'evening',
    time: '17:00 Petang',
    title: 'Pimpin (Kelab & EMS)',
    subtitle: 'Fasa 3: Kepimpinan Kokurikulum & EMS',
    description:
      'Tadbir urus 21 kelab & persatuan POLISAS, automasi kelulusan kertas kerja HEP secara digital, dan laksana acara berprestij bersama sistem juri EMS.',
    badge: 'e-Aktiviti + EMS MakMP',
    image: '/GAMBAR/Kelab Preview.png',
    secondaryImage: '/GAMBAR/Event Management System (EMS) Preview.png',
    secondaryLabel: 'Sistem EMS & Merit',
    imageAlt: 'Tadbir Urus Kelab dan Pengurusan Acara',
    deviceType: 'laptop',
    highlights: [
      'Aliran semakan kertas kerja digital telus & pantas',
      'Pengurusan juri pertandingan & penilaian berpusat EMS',
      'Pemberian markah merit kokurikulum MakMP secara automatik',
    ],
    tagColor: '#0F766E',
  },
  {
    id: 'night',
    time: '21:00 Malam',
    title: 'Peduli (Kebajikan & Food Bank)',
    subtitle: 'Fasa 4: Prihatin Mahasiswa 24 Jam',
    description:
      'Sistem aduan kamsis dan kediaman luar yang pantas bertindak, serta agihan bantuan Food Bank siswa yang telus, bermaruah dan terpelihara.',
    badge: 'e-Kebajikan & Food Bank',
    image: '/GAMBAR/Aduan Kebajikan Status Portal View.png',
    secondaryImage: '/GAMBAR/Foodbank Admin Preview.png',
    secondaryLabel: 'Portal Bantuan Food Bank',
    imageAlt: 'Portal Status Aduan Kebajikan dan Food Bank Siswa',
    deviceType: 'laptop',
    highlights: [
      'Status tindakan aduan kamsis & kediaman luar secara masa nyata',
      'Radar prihatin Food Bank untuk siswa yang memerlukan',
      'Bimbingan pintar Nexus AI untuk bantuan soalan lazim kebajikan',
    ],
    tagColor: '#0F766E',
  },
];

interface LightboxModalProps {
  src: string;
  alt: string;
  title: string;
  onClose: () => void;
}

const LightboxModal: React.FC<LightboxModalProps> = ({ src, alt, title, onClose }) => {
  const { t } = useTranslation(['portal', 'common']);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl w-full max-h-[85dvh] bg-[#0B2420] dark:bg-[#13171D] rounded-2xl sm:rounded-3xl border border-[#1E4D45] dark:border-[#252B35] shadow-surface-lg overflow-hidden flex flex-col"
      >
        <div className="px-4 sm:px-6 py-3.5 bg-[#081C18] dark:bg-[#0E1116] border-b border-[#1E4D45] dark:border-[#252B35] flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2DD4BF] flex-shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-semibold text-[#F6FBF9] dark:text-[#F1F5F9] truncate">
              {title}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 dark:bg-[#1B2028] dark:hover:bg-[#252B35] text-[#F6FBF9] dark:text-[#F1F5F9] transition-colors cursor-pointer flex-shrink-0"
            aria-label={t('portal:timeline_close_preview', 'Tutup Pratonton')}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-3 sm:p-6 overflow-auto flex items-center justify-center bg-[#061714] dark:bg-[#090B0E] max-h-[calc(85dvh-56px)]">
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[75dvh] w-auto h-auto object-contain rounded-xl shadow-surface-lg border border-white/10 dark:border-[#252B35]"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

interface StoryCardProps {
  phase: DayPhase;
  position: 'left' | 'right';
  icon: React.ElementType;
  onOpenLightbox: (data: { src: string; alt: string; title: string }) => void;
}

const isPhoneScreenshot = (src?: string): boolean => {
  if (!src) return false;
  return src.toLowerCase().includes('phone');
};

const StoryCard: React.FC<StoryCardProps> = ({
  phase,
  position,
  icon: Icon,
  onOpenLightbox,
}) => {
  const { t } = useTranslation(['portal', 'common']);
  const [activeView, setActiveView] = useState<'primary' | 'secondary'>('primary');
  const primaryImg = phase.image;
  const secondaryImg = phase.secondaryImage;
  const currentImg = activeView === 'primary' ? primaryImg : secondaryImg || primaryImg;
  const companionImg = activeView === 'primary' ? secondaryImg : primaryImg;
  const activeIsPhone = isPhoneScreenshot(currentImg);

  const openCurrentLightbox = () =>
    onOpenLightbox({
      src: currentImg,
      alt: phase.imageAlt,
      title: `${phase.title} • ${
        activeView === 'primary'
          ? t('portal:timeline_view_primary', 'Paparan Utama')
          : phase.secondaryLabel || t('portal:timeline_view_secondary', 'Pratonton')
      }`,
    });

  return (
    <div id={phase.id} className="relative scroll-mt-28">
      {/* ── MOBILE TRACKER CONNECTOR & CRISP NODE (ZERO BLUR / ZERO PING) ── */}
      <div className="lg:hidden absolute top-8 -left-10 w-10 h-0.5 bg-[#B8E4DC] dark:bg-[#252B35] z-10" aria-hidden="true" />

      <div className="lg:hidden absolute top-8 -left-10 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center" aria-hidden="true">
        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white dark:bg-[#13171D] border-2 border-[#0F766E] dark:border-[#2DD4BF] flex items-center justify-center shadow-surface-sm">
          <div className="w-2 h-2 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF]" />
        </div>
      </div>

      {/* ── DESKTOP TRACKER CONNECTOR & NODE ── */}
      {position === 'left' && (
        <>
          <div className="hidden lg:block absolute top-12 -right-10 w-10 h-0.5 bg-[#B8E4DC] dark:bg-[#252B35] z-10" aria-hidden="true" />
          <div className="hidden lg:flex absolute top-12 -right-10 translate-x-1/2 -translate-y-1/2 z-20 items-center justify-center" aria-hidden="true">
            <div className="w-6 h-6 rounded-full bg-white dark:bg-[#13171D] border-2 border-[#0F766E] dark:border-[#2DD4BF] flex items-center justify-center shadow-surface-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF]" />
            </div>
          </div>
        </>
      )}

      {position === 'right' && (
        <>
          <div className="hidden lg:block absolute top-12 -left-10 w-10 h-0.5 bg-[#B8E4DC] dark:bg-[#252B35] z-10" aria-hidden="true" />
          <div className="hidden lg:flex absolute top-12 -left-10 -translate-x-1/2 -translate-y-1/2 z-20 items-center justify-center" aria-hidden="true">
            <div className="w-6 h-6 rounded-full bg-white dark:bg-[#13171D] border-2 border-[#0F766E] dark:border-[#2DD4BF] flex items-center justify-center shadow-surface-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF]" />
            </div>
          </div>
        </>
      )}

      {/* Main Card Frame */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={typeof window === 'undefined' ? { opacity: 1, y: 0 } : undefined}
        {...(typeof window !== 'undefined'
          ? { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-40px' } }
          : {})}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        className="rounded-3xl p-5 sm:p-7 bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] shadow-surface-sm relative overflow-hidden transition-[border-color,box-shadow] duration-200 hover:shadow-surface-md group"
      >
        {/* Top Card Meta */}
        <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wide text-white dark:text-[#090B0E] bg-[#0F766E] dark:bg-[#2DD4BF] font-mono">
              {phase.time}
            </span>
            <span className="text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF]">
              {phase.badge}
            </span>
          </div>

          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0F766E] dark:text-[#2DD4BF] transition-transform duration-200 group-hover:scale-105 flex-shrink-0">
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        {/* Title & Copy */}
        <div className="mb-3 relative z-10">
          <div className="text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] mb-1">
            {phase.subtitle}
          </div>
          <h4 className="text-xl sm:text-2xl font-bold text-[#0B2420] dark:text-[#F1F5F9] tracking-tight leading-snug">
            {phase.title}
          </h4>
        </div>

        <p className="text-sm text-[#3B635C] dark:text-[#94A0B2] font-normal leading-relaxed mb-4 relative z-10">
          {phase.description}
        </p>

        {/* Highlights List */}
        <div className="space-y-2 mb-5 relative z-10">
          {phase.highlights.map((highlight, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#0F766E] dark:text-[#2DD4BF]" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium text-[#0B2420] dark:text-[#F1F5F9]">
                {highlight}
              </span>
            </div>
          ))}
        </div>

        {/* Screenshot Header Controls: Perspective Switcher & Zoom */}
        <div className="pt-3.5 border-t border-[#B8E4DC]/60 dark:border-[#252B35] relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35]">
              <button
                type="button"
                onClick={() => setActiveView('primary')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
                  activeView === 'primary'
                    ? 'bg-[#0F766E] dark:bg-[#2DD4BF] text-white dark:text-[#090B0E] shadow-2xs'
                    : 'text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]'
                )}
              >
                {isPhoneScreenshot(primaryImg) ? (
                  <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Laptop className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{t('portal:timeline_view_primary', 'Paparan Utama')}</span>
              </button>

              {secondaryImg && (
                <button
                  type="button"
                  onClick={() => setActiveView('secondary')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
                    activeView === 'secondary'
                      ? 'bg-[#0F766E] dark:bg-[#2DD4BF] text-white dark:text-[#090B0E] shadow-2xs'
                      : 'text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]'
                  )}
                >
                  {isPhoneScreenshot(secondaryImg) ? (
                    <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{phase.secondaryLabel || t('portal:timeline_view_secondary', 'Paparan Tambahan')}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={openCurrentLightbox}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] dark:text-[#2DD4BF] hover:text-[#0B2420] dark:hover:text-[#F1F5F9] cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-[#F6FBF9] dark:hover:bg-[#1B2028]"
            >
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t('portal:timeline_zoom_fullscreen', 'Zum Skrin Penuh')}</span>
            </button>
          </div>

          {/* Screenshot Display */}
          {activeIsPhone ? (
            <div className="relative w-full max-w-[260px] sm:max-w-[280px] mx-auto py-2">
              <div className="bg-[#061714] dark:bg-[#090B0E] p-2.5 rounded-[2.25rem] shadow-surface-lg border border-[#1E4D45] dark:border-[#252B35]">
                <button
                  type="button"
                  onClick={openCurrentLightbox}
                  className="block w-full relative aspect-[9/18] bg-black rounded-[1.75rem] overflow-hidden group/img cursor-pointer"
                  aria-label={`${phase.title} — ${t('portal:timeline_zoom', 'Zum')}`}
                >
                  <img
                    src={currentImg}
                    alt={phase.imageAlt}
                    width={390}
                    height={780}
                    className="w-full h-full object-cover object-top transition-transform duration-200 group-hover/img:scale-[1.02]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <span className="px-3 py-1 rounded-full bg-black/80 text-white text-xs font-semibold flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" /> {t('portal:timeline_zoom', 'Zum')}
                    </span>
                  </div>
                </button>
              </div>

              {companionImg && (
                <button
                  type="button"
                  onClick={() => setActiveView(activeView === 'primary' ? 'secondary' : 'primary')}
                  className="absolute -bottom-2 -right-3 w-32 sm:w-36 rounded-xl overflow-hidden border-2 border-white dark:border-[#252B35] shadow-surface-lg bg-white dark:bg-[#13171D] cursor-pointer hover:scale-[1.03] transition-transform duration-200 group/float z-10 text-left"
                >
                  <div className="px-2 py-1 bg-[#0B2420] dark:bg-[#0E1116] text-xs font-medium text-[#B8E4DC] dark:text-[#94A0B2] flex items-center justify-between gap-1">
                    <span className="truncate">
                      {activeView === 'primary'
                        ? phase.secondaryLabel || t('portal:timeline_view_secondary', 'Katalog')
                        : t('portal:timeline_view_primary', 'Paparan Utama')}
                    </span>
                  </div>
                  <img
                    src={companionImg}
                    alt="Companion preview"
                    width={240}
                    height={360}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </button>
              )}
            </div>
          ) : (
            <div className="relative w-full">
              <div className="w-full bg-[#0B2420] dark:bg-[#0E1116] rounded-2xl pt-2 px-2 pb-2 shadow-surface-md border border-[#1E4D45] dark:border-[#252B35]">
                {/* Top Browser Bar */}
                <div className="bg-[#081C18] dark:bg-[#13171D] rounded-t-xl px-3 py-1.5 flex items-center justify-between border-b border-white/5 dark:border-[#252B35]">
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <div className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
                    <div className="w-2 h-2 rounded-full bg-[#B8E4DC]/60 dark:bg-[#252B35]" />
                    <div className="w-2 h-2 rounded-full bg-[#0D9488]" />
                  </div>
                  <span className="text-xs font-mono text-[#B8E4DC] dark:text-[#94A0B2] truncate max-w-[220px] sm:max-w-xs">
                    jpp-polisas.edu.my • {phase.badge}
                  </span>
                  <div className="w-4" aria-hidden="true" />
                </div>

                {/* Screenshot Container */}
                <button
                  type="button"
                  onClick={openCurrentLightbox}
                  className="block w-full relative aspect-[16/10] bg-[#F6FBF9] dark:bg-[#090B0E] rounded-b-lg overflow-hidden group/img cursor-pointer"
                  aria-label={`${phase.title} — ${t('portal:timeline_click_to_zoom', 'Klik untuk zum paparan penuh')}`}
                >
                  <img
                    src={currentImg}
                    alt={phase.imageAlt}
                    width={1280}
                    height={800}
                    className="w-full h-full object-cover object-top transition-transform duration-200 group-hover/img:scale-[1.02]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-full bg-black/80 text-white text-xs font-semibold flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                      {t('portal:timeline_click_to_zoom', 'Klik untuk zum paparan penuh')}
                    </span>
                  </div>
                </button>
              </div>

              {/* Overlapping Companion Preview */}
              {secondaryImg && (
                <button
                  type="button"
                  onClick={() => {
                    if (isPhoneScreenshot(secondaryImg)) {
                      onOpenLightbox({
                        src: secondaryImg,
                        alt: phase.secondaryLabel || 'Navigasi PolyMaps',
                        title: `${phase.title} • ${phase.secondaryLabel || 'Navigasi PolyMaps'}`,
                      });
                    } else {
                      setActiveView(activeView === 'primary' ? 'secondary' : 'primary');
                    }
                  }}
                  className={cn(
                    'absolute -bottom-3 -right-2 sm:-right-3 z-20 rounded-xl overflow-hidden border-2 border-white dark:border-[#252B35] shadow-surface-lg bg-white dark:bg-[#13171D] cursor-pointer hover:scale-[1.03] transition-transform duration-200 group/float text-left',
                    phase.id === 'morning' ? 'w-28 sm:w-36' : 'w-32 sm:w-44'
                  )}
                >
                  <div className="px-2 py-1 bg-[#0B2420] dark:bg-[#0E1116] text-xs font-medium text-[#B8E4DC] dark:text-[#94A0B2] flex items-center justify-between gap-1">
                    <span className="truncate">{phase.secondaryLabel || t('portal:timeline_view_secondary', 'Pratonton')}</span>
                  </div>
                  <div className="overflow-hidden max-h-32 sm:max-h-40 bg-[#061714] dark:bg-[#090B0E]">
                    <img
                      src={secondaryImg}
                      alt={phase.secondaryLabel || 'Secondary Preview'}
                      width={240}
                      height={320}
                      className="w-full h-auto object-cover object-top"
                      loading="lazy"
                    />
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const CampusDayTimeline: React.FC = () => {
  const { t } = useTranslation(['portal', 'common']);
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);

  const localizedPhases = React.useMemo<DayPhase[]>(() => {
    return [
      {
        ...CAMPUS_DAY_PHASES[0],
        time: t('portal:timeline_phase_morning_time', CAMPUS_DAY_PHASES[0].time),
        title: t('portal:timeline_phase_morning_title', CAMPUS_DAY_PHASES[0].title),
        subtitle: t('portal:timeline_phase_morning_subtitle', CAMPUS_DAY_PHASES[0].subtitle),
        description: t('portal:timeline_phase_morning_desc', CAMPUS_DAY_PHASES[0].description),
        badge: t('portal:timeline_phase_morning_badge', CAMPUS_DAY_PHASES[0].badge),
        secondaryLabel: t('portal:timeline_phase_morning_sec_label', CAMPUS_DAY_PHASES[0].secondaryLabel),
        highlights: [
          t('portal:timeline_phase_morning_h1', CAMPUS_DAY_PHASES[0].highlights[0]),
          t('portal:timeline_phase_morning_h2', CAMPUS_DAY_PHASES[0].highlights[1]),
          t('portal:timeline_phase_morning_h3', CAMPUS_DAY_PHASES[0].highlights[2]),
        ],
      },
      {
        ...CAMPUS_DAY_PHASES[1],
        time: t('portal:timeline_phase_noon_time', CAMPUS_DAY_PHASES[1].time),
        title: t('portal:timeline_phase_noon_title', CAMPUS_DAY_PHASES[1].title),
        subtitle: t('portal:timeline_phase_noon_subtitle', CAMPUS_DAY_PHASES[1].subtitle),
        description: t('portal:timeline_phase_noon_desc', CAMPUS_DAY_PHASES[1].description),
        badge: t('portal:timeline_phase_noon_badge', CAMPUS_DAY_PHASES[1].badge),
        secondaryLabel: t('portal:timeline_phase_noon_sec_label', CAMPUS_DAY_PHASES[1].secondaryLabel),
        highlights: [
          t('portal:timeline_phase_noon_h1', CAMPUS_DAY_PHASES[1].highlights[0]),
          t('portal:timeline_phase_noon_h2', CAMPUS_DAY_PHASES[1].highlights[1]),
          t('portal:timeline_phase_noon_h3', CAMPUS_DAY_PHASES[1].highlights[2]),
        ],
      },
      {
        ...CAMPUS_DAY_PHASES[2],
        time: t('portal:timeline_phase_evening_time', CAMPUS_DAY_PHASES[2].time),
        title: t('portal:timeline_phase_evening_title', CAMPUS_DAY_PHASES[2].title),
        subtitle: t('portal:timeline_phase_evening_subtitle', CAMPUS_DAY_PHASES[2].subtitle),
        description: t('portal:timeline_phase_evening_desc', CAMPUS_DAY_PHASES[2].description),
        badge: t('portal:timeline_phase_evening_badge', CAMPUS_DAY_PHASES[2].badge),
        secondaryLabel: t('portal:timeline_phase_evening_sec_label', CAMPUS_DAY_PHASES[2].secondaryLabel),
        highlights: [
          t('portal:timeline_phase_evening_h1', CAMPUS_DAY_PHASES[2].highlights[0]),
          t('portal:timeline_phase_evening_h2', CAMPUS_DAY_PHASES[2].highlights[1]),
          t('portal:timeline_phase_evening_h3', CAMPUS_DAY_PHASES[2].highlights[2]),
        ],
      },
      {
        ...CAMPUS_DAY_PHASES[3],
        time: t('portal:timeline_phase_night_time', CAMPUS_DAY_PHASES[3].time),
        title: t('portal:timeline_phase_night_title', CAMPUS_DAY_PHASES[3].title),
        subtitle: t('portal:timeline_phase_night_subtitle', CAMPUS_DAY_PHASES[3].subtitle),
        description: t('portal:timeline_phase_night_desc', CAMPUS_DAY_PHASES[3].description),
        badge: t('portal:timeline_phase_night_badge', CAMPUS_DAY_PHASES[3].badge),
        secondaryLabel: t('portal:timeline_phase_night_sec_label', CAMPUS_DAY_PHASES[3].secondaryLabel),
        highlights: [
          t('portal:timeline_phase_night_h1', CAMPUS_DAY_PHASES[3].highlights[0]),
          t('portal:timeline_phase_night_h2', CAMPUS_DAY_PHASES[3].highlights[1]),
          t('portal:timeline_phase_night_h3', CAMPUS_DAY_PHASES[3].highlights[2]),
        ],
      },
    ];
  }, [t]);

  return (
    <section id="hari-kampus" className="py-16 md:py-24 px-4 md:px-6 bg-[#F6FBF9] dark:bg-[#090B0E] relative z-20 overflow-hidden scroll-mt-24">
      <div className="max-w-7xl mx-auto relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] shadow-2xs mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF]" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#0B2420] dark:text-[#F1F5F9]">
              {t('portal:landing_timeline_badge', 'PENGALAMAN EKOSISTEM MAHASISWA')}
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0B2420] dark:text-[#F1F5F9] tracking-[-0.025em] mb-4 leading-[1.08] [text-wrap:balance]">
            {t('portal:landing_timeline_exp_title', 'The POLISAS Experience:')}
            <span className="block text-2xl sm:text-3xl md:text-4xl font-semibold text-[#0F766E] dark:text-[#2DD4BF] mt-1.5">
              {t('portal:landing_timeline_title', 'Sehari Bersama Ekosistem POLISAS')}
            </span>
          </h2>
          <p className="text-sm md:text-base text-[#3B635C] dark:text-[#94A0B2] font-normal leading-relaxed max-w-2xl mx-auto">
            {t(
              'portal:landing_timeline_subtitle',
              'Satu ruang pintar di mana teknologi moden dan kehidupan kampus berpadu untuk memacu kecemerlangan mahasiswa'
            )}
          </p>
        </div>

        {/* ── TIMELINE SPINE & ALTERNATING CARDS GRID ── */}
        <div className="relative">
          {/* Desktop Central Spine Line */}
          <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 top-4 bottom-8 w-0.5 bg-gradient-to-b from-[#0D9488]/30 via-[#14B8A6]/40 to-[#B8E4DC]/40 dark:to-[#252B35] pointer-events-none z-10" aria-hidden="true" />

          {/* Mobile Left Spine Line */}
          <div className="lg:hidden absolute left-6 top-4 bottom-8 w-0.5 bg-gradient-to-b from-[#0D9488]/30 via-[#14B8A6]/40 to-[#B8E4DC]/40 dark:to-[#252B35] pointer-events-none z-10" aria-hidden="true" />

          {/* Desktop Center Spine Node "&" Badge */}
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-4 z-20 items-center justify-center" aria-hidden="true">
            <div className="w-11 h-11 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF] text-white dark:text-[#090B0E] font-serif font-bold text-xl flex items-center justify-center shadow-surface-sm border-2 border-white dark:border-[#090B0E] ring-4 ring-[#F6FBF9] dark:ring-[#090B0E]">
              &amp;
            </div>
          </div>

          {/* ── SECTION MARKERS HEADER ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-6 mb-8 md:mb-12 relative">
            <div className="pl-16 lg:pl-0">
              <div className="inline-flex items-center gap-2 text-xs font-semibold font-mono tracking-wider text-[#0F766E] dark:text-[#2DD4BF] uppercase mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF]" aria-hidden="true" />
                {t('portal:landing_phase_01_tag', 'Fasa 01 • Pembelajaran & Kemudahan')}
              </div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0B2420] dark:text-[#F1F5F9] tracking-tight">
                {t('portal:landing_phase_01_title', 'Pintar & Berdaya')}
              </h3>
              <p className="text-sm text-[#3B635C] dark:text-[#94A0B2] mt-1.5 font-normal max-w-md">
                {t(
                  'portal:landing_phase_01_desc',
                  'Pendedahan akademik pintar & keusahawanan kampus di hujung jari bermula awal pagi.'
                )}
              </p>
            </div>

            <div className="pl-16 lg:pl-0">
              <div className="lg:hidden flex items-center gap-3 py-3 -ml-16 pl-2" aria-hidden="true">
                <div className="w-9 h-9 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF] text-white dark:text-[#090B0E] font-serif font-bold text-lg flex items-center justify-center shadow-surface-sm border-2 border-white dark:border-[#090B0E] ring-2 ring-[#F6FBF9] dark:ring-[#090B0E] z-20 flex-shrink-0">
                  &amp;
                </div>
                <div className="h-px bg-[#B8E4DC] dark:bg-[#252B35] flex-1" />
              </div>

              <div className="inline-flex items-center gap-2 text-xs font-semibold font-mono tracking-wider text-[#0F766E] dark:text-[#2DD4BF] uppercase mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0F766E] dark:bg-[#2DD4BF]" aria-hidden="true" />
                {t('portal:landing_phase_02_tag', 'Fasa 02 • Kepimpinan & Kebajikan')}
              </div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0B2420] dark:text-[#F1F5F9] tracking-tight">
                {t('portal:landing_phase_02_title', 'Terhubung & Prihatin')}
              </h3>
              <p className="text-sm text-[#3B635C] dark:text-[#94A0B2] mt-1.5 font-normal max-w-md">
                {t(
                  'portal:landing_phase_02_desc',
                  'Tadbir urus 21 kelab & EMS berpusat disokong rangkaian keselamatan kebajikan 24/7.'
                )}
              </p>
            </div>
          </div>

          {/* ── ALTERNATING STORY CARDS TWO-COLUMN GRID ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-10 lg:gap-y-12 relative">
            <div className="space-y-10 lg:space-y-12 pl-16 lg:pl-0 relative">
              <StoryCard
                phase={localizedPhases[0]}
                position="left"
                icon={Compass}
                onOpenLightbox={setLightboxImage}
              />
              <StoryCard
                phase={localizedPhases[1]}
                position="left"
                icon={ShoppingBag}
                onOpenLightbox={setLightboxImage}
              />
            </div>

            <div className="space-y-10 lg:space-y-12 pl-16 lg:pl-0 relative lg:pt-12">
              <StoryCard
                phase={localizedPhases[2]}
                position="right"
                icon={Shield}
                onOpenLightbox={setLightboxImage}
              />
              <StoryCard
                phase={localizedPhases[3]}
                position="right"
                icon={HeartHandshake}
                onOpenLightbox={setLightboxImage}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <LightboxModal
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            title={lightboxImage.title}
            onClose={() => setLightboxImage(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

export default CampusDayTimeline;
