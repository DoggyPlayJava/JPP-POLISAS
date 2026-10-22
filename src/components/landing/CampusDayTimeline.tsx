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
    tagColor: '#6B7F5B',
    metric: {
      value: '1,080+',
      label: 'Jadual Siswa Aktif',
    },
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
    tagColor: '#C96F4F',
    metric: {
      value: '340+',
      label: 'Pesanan Selesai Kampus',
    },
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
    tagColor: '#2E3A2F',
    metric: {
      value: '21',
      label: 'Kelab Rasmi Beroperasi',
    },
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
    tagColor: '#6B7F5B',
    metric: {
      value: '100%',
      label: 'Tindakan Responsif JPP',
    },
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
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl w-full max-h-[92vh] bg-[#2E3A2F] rounded-2xl sm:rounded-3xl border border-[#D9C9B2]/30 shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-4 sm:px-6 py-3.5 bg-[#232C24] border-b border-[#D9C9B2]/20 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C96F4F] flex-shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-[#F8F6EE] truncate">
              {title}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#F8F6EE] transition-colors cursor-pointer flex-shrink-0"
            aria-label={t('portal:timeline_close_preview', 'Tutup Pratonton')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 sm:p-6 overflow-auto flex items-center justify-center bg-[#1A221B]/95 max-h-[calc(92vh-56px)]">
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[78vh] w-auto h-auto object-contain rounded-xl shadow-2xl border border-[#D9C9B2]/20"
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
  accentColor: string;
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
  accentColor,
  onOpenLightbox,
}) => {
  const { t } = useTranslation(['portal', 'common']);
  const [activeView, setActiveView] = useState<'primary' | 'secondary'>('primary');
  const primaryImg = phase.image;
  const secondaryImg = phase.secondaryImage;
  const currentImg = activeView === 'primary' ? primaryImg : (secondaryImg || primaryImg);
  const companionImg = activeView === 'primary' ? secondaryImg : primaryImg;
  const activeIsPhone = isPhoneScreenshot(currentImg);

  return (
    <div id={phase.id} className="relative scroll-mt-28">
      {/* ── MOBILE TRACKER CONNECTOR & GLOWING DOT ── */}
      {/* Horizontal connector line linking Mobile Spine (left: 24px) to Card left (64px) */}
      <div className="lg:hidden absolute top-8 -left-10 w-10 h-0.5 bg-[#D9C9B2]/80 z-10" />

      {/* Mobile Glowing Tracker Dot sitting EXACTLY on spine (at -40px from card left = 24px container left) */}
      <div className="lg:hidden absolute top-8 -left-10 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.75, opacity: 0.5 }}
          animate={typeof window === 'undefined' ? { scale: 1, opacity: 1 } : undefined}
          {...(typeof window !== 'undefined' ? { whileInView: { scale: 1, opacity: 1 }, viewport: { once: true, margin: "-60px" } } : {})}
          transition={{ duration: 0.4 }}
          className="relative flex items-center justify-center"
        >
          {/* Glowing Ambient Halo */}
          <span
            className="absolute -inset-1.5 rounded-full opacity-40 blur-xs"
            style={{ backgroundColor: accentColor }}
          />
          {/* Subtle Pulse Ping */}
          <span
            className="absolute -inset-1 rounded-full animate-ping opacity-25"
            style={{ backgroundColor: accentColor }}
          />
          {/* Tracker White Node */}
          <div
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white border-2 flex items-center justify-center shadow-md relative z-10"
            style={{ borderColor: accentColor }}
          >
            <div
              className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          </div>
        </motion.div>
      </div>

      {/* ── DESKTOP TRACKER CONNECTOR & GLOWING DOT ── */}
      {/* Left Card: horizontal connector line to spine center (-right-10 = 40px width) */}
      {position === 'left' && (
        <>
          <div className="hidden lg:block absolute top-12 -right-10 w-10 h-0.5 bg-[#D9C9B2]/80 z-10" />
          <div className="hidden lg:flex absolute top-12 -right-10 translate-x-1/2 -translate-y-1/2 z-20 items-center justify-center">
            <motion.div
              initial={{ scale: 0.75, opacity: 0.5 }}
              animate={typeof window === 'undefined' ? { scale: 1, opacity: 1 } : undefined}
              {...(typeof window !== 'undefined' ? { whileInView: { scale: 1, opacity: 1 }, viewport: { once: true, margin: "-60px" } } : {})}
              transition={{ duration: 0.4 }}
              className="relative flex items-center justify-center"
            >
              <span
                className="absolute -inset-1.5 rounded-full opacity-40 blur-xs"
                style={{ backgroundColor: accentColor }}
              />
              <span
                className="absolute -inset-1 rounded-full animate-ping opacity-25"
                style={{ backgroundColor: accentColor }}
              />
              <div
                className="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center shadow-md relative z-10"
                style={{ borderColor: accentColor }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
            </motion.div>
          </div>
        </>
      )}

      {/* Right Card: horizontal connector line to spine center (-left-10 = 40px width) */}
      {position === 'right' && (
        <>
          <div className="hidden lg:block absolute top-12 -left-10 w-10 h-0.5 bg-[#D9C9B2]/80 z-10" />
          <div className="hidden lg:flex absolute top-12 -left-10 -translate-x-1/2 -translate-y-1/2 z-20 items-center justify-center">
            <motion.div
              initial={{ scale: 0.75, opacity: 0.5 }}
              animate={typeof window === 'undefined' ? { scale: 1, opacity: 1 } : undefined}
              {...(typeof window !== 'undefined' ? { whileInView: { scale: 1, opacity: 1 }, viewport: { once: true, margin: "-60px" } } : {})}
              transition={{ duration: 0.4 }}
              className="relative flex items-center justify-center"
            >
              <span
                className="absolute -inset-1.5 rounded-full opacity-40 blur-xs"
                style={{ backgroundColor: accentColor }}
              />
              <span
                className="absolute -inset-1 rounded-full animate-ping opacity-25"
                style={{ backgroundColor: accentColor }}
              />
              <div
                className="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center shadow-md relative z-10"
                style={{ borderColor: accentColor }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
            </motion.div>
          </div>
        </>
      )}

      {/* Main Card Frame with OpenLearning Smooth Slide-In Scroll Animation */}
      <motion.div
        initial={{ opacity: 0, x: position === 'left' ? -30 : 30, y: 20 }}
        animate={typeof window === 'undefined' ? { opacity: 1, x: 0, y: 0 } : undefined}
        {...(typeof window !== 'undefined' ? { whileInView: { opacity: 1, x: 0, y: 0 }, viewport: { once: true, margin: "-60px" } } : {})}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl p-6 md:p-8 bg-white border border-[#D9C9B2] shadow-[0_10px_35px_rgba(46,58,47,0.06)] relative overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_rgba(46,58,47,0.12)] group"
      >
        {/* Organic colored background halo */}
        <div
          className="absolute -top-24 -right-24 w-52 h-52 rounded-full blur-xl pointer-events-none opacity-20 transition-opacity duration-300 group-hover:opacity-30"
          style={{ backgroundColor: accentColor }}
        />

        {/* Top Card Meta: Time pill, badge, floating round icon */}
        <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-2xs font-mono"
              style={{ backgroundColor: phase.tagColor }}
            >
              {phase.time}
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: accentColor }}
            >
              {phase.badge}
            </span>
          </div>

          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs border transition-transform duration-300 group-hover:scale-105 flex-shrink-0"
            style={{
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}35`,
              color: accentColor,
            }}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>

        {/* Title & Copy */}
        <div className="mb-3 relative z-10">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7F5B] mb-1">
            {phase.subtitle}
          </div>
          <h4 className="text-2xl sm:text-3xl font-black text-[#2E3A2F] tracking-tight leading-snug">
            {phase.title}
          </h4>
        </div>

        <p className="text-xs sm:text-sm text-[#556453] font-medium leading-relaxed mb-5 relative z-10">
          {phase.description}
        </p>

        {/* Highlights List */}
        <div className="space-y-2 mb-5 relative z-10">
          {phase.highlights.map((highlight, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <CheckCircle2
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                style={{ color: accentColor }}
              />
              <span className="text-xs sm:text-sm font-semibold text-[#2E3A2F]">
                {highlight}
              </span>
            </div>
          ))}
        </div>

        {/* Metric Pill */}
        {phase.metric && (
          <div className="p-3.5 rounded-2xl bg-[#F8F6EE] border border-[#D9C9B2] inline-flex items-center gap-3.5 mb-6 shadow-2xs relative z-10">
            <div className="text-2xl font-black text-[#2E3A2F] font-mono tabular-nums leading-none">
              {phase.metric.value}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7F5B] leading-tight">
              {phase.metric.label}
            </div>
          </div>
        )}

        {/* Screenshot Header Controls: Perspective Switcher & Zoom */}
        <div className="pt-2 border-t border-[#D9C9B2]/50 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F8F6EE] border border-[#D9C9B2]">
              <button
                type="button"
                onClick={() => setActiveView('primary')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  activeView === 'primary'
                    ? "bg-[#2E3A2F] text-[#F8F6EE] shadow-2xs"
                    : "text-[#556453] hover:text-[#2E3A2F]"
                )}
              >
                {isPhoneScreenshot(primaryImg) ? (
                  <Smartphone className="w-3 h-3" />
                ) : (
                  <Laptop className="w-3 h-3" />
                )}
                <span>{t('portal:timeline_view_primary', 'Paparan Utama')}</span>
              </button>

              {secondaryImg && (
                <button
                  type="button"
                  onClick={() => setActiveView('secondary')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    activeView === 'secondary'
                      ? "bg-[#C96F4F] text-white shadow-2xs"
                      : "text-[#556453] hover:text-[#2E3A2F]"
                  )}
                >
                  {isPhoneScreenshot(secondaryImg) ? (
                    <Smartphone className="w-3 h-3" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>{phase.secondaryLabel || t('portal:timeline_view_secondary', 'Paparan Tambahan')}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                onOpenLightbox({
                  src: currentImg,
                  alt: phase.imageAlt,
                  title: `${phase.title} • ${activeView === 'primary' ? t('portal:timeline_view_primary', 'Paparan Utama') : (phase.secondaryLabel || t('portal:timeline_view_secondary', 'Pratonton'))}`,
                })
              }
              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6B7F5B] hover:text-[#2E3A2F] cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-[#F8F6EE]"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline">{t('portal:timeline_zoom_fullscreen', 'Zum Skrin Penuh')}</span>
            </button>
          </div>

          {/* Screenshot Display: Smartphone Mockup OR Laptop Browser Frame based on natural aspect ratio */}
          {activeIsPhone ? (
            /* ── SMARTPHONE FRAME (Native Mobile Scale, Un-squished) ── */
            <div className="relative w-full max-w-[270px] sm:max-w-xs mx-auto py-3">
              <div className="bg-[#1F2720] p-2.5 sm:p-3 rounded-[2.5rem] shadow-xl border border-[#D9C9B2]/60">
                <div
                  className="relative aspect-[9/18] bg-black rounded-[2rem] overflow-hidden group/img cursor-pointer"
                  onClick={() =>
                    onOpenLightbox({
                      src: currentImg,
                      alt: phase.imageAlt,
                      title: `${phase.title} • ${activeView === 'primary' ? t('portal:timeline_view_primary', 'Paparan Utama') : (phase.secondaryLabel || t('portal:timeline_view_secondary', 'Pratonton'))}`,
                    })
                  }
                >
                  <img
                    src={currentImg}
                    alt={phase.imageAlt}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover/img:scale-102"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1 rounded-full bg-black/75 text-white text-[10px] font-bold flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" /> {t('portal:timeline_zoom', 'Zum')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating secondary companion preview badge */}
              {companionImg && (
                <div
                  onClick={() => setActiveView(activeView === 'primary' ? 'secondary' : 'primary')}
                  className="absolute -bottom-2 -right-3 w-32 sm:w-36 rounded-xl overflow-hidden border-2 border-white shadow-xl bg-white cursor-pointer hover:scale-105 transition-transform group/float z-10"
                >
                  <div className="px-2 py-0.5 bg-[#2E3A2F] text-[8px] font-bold text-[#D9C9B2] flex items-center justify-between">
                    <span className="truncate">{activeView === 'primary' ? (phase.secondaryLabel || t('portal:timeline_view_secondary', 'Katalog')) : t('portal:timeline_view_primary', 'Paparan Utama')}</span>
                    <span className="text-[#C96F4F] group-hover/float:underline text-[7px]">{t('portal:timeline_switch', 'Tukar')}</span>
                  </div>
                  <img
                    src={companionImg}
                    alt="Companion preview"
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}
            </div>
          ) : (
            /* ── LAPTOP BROWSER FRAME (Crisp 16:10 Desktop Proportions) ── */
            <div className="relative w-full">
              <div className="w-full bg-[#2E3A2F] rounded-t-2xl pt-2 px-2 shadow-lg border border-[#2E3A2F]">
                {/* Top Browser Bar */}
                <div className="bg-[#232C24] rounded-t-xl px-3 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#C96F4F]" />
                    <div className="w-2 h-2 rounded-full bg-[#D9C9B2]" />
                    <div className="w-2 h-2 rounded-full bg-[#6B7F5B]" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-mono text-[#D9C9B2] truncate max-w-[200px] sm:max-w-xs">
                    jpp-polisas.edu.my • {phase.badge}
                  </span>
                  <div className="w-4" />
                </div>

                {/* Screenshot Container */}
                <div
                  className="relative aspect-[16/10] bg-[#F8F6EE] rounded-b-lg overflow-hidden border border-[#232C24] group/img cursor-pointer"
                  onClick={() =>
                    onOpenLightbox({
                      src: currentImg,
                      alt: phase.imageAlt,
                      title: `${phase.title} • ${activeView === 'primary' ? t('portal:timeline_view_primary', 'Paparan Utama') : (phase.secondaryLabel || t('portal:timeline_view_secondary', 'Pratonton'))}`,
                    })
                  }
                >
                  <img
                    src={currentImg}
                    alt={phase.imageAlt}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover/img:scale-102"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded-full bg-black/75 text-white text-[11px] font-bold flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5" /> {t('portal:timeline_click_to_zoom', 'Klik untuk zum paparan penuh')}
                    </span>
                  </div>
                </div>

                {/* Laptop Base */}
                <div className="h-2 bg-[#1F2720] rounded-b-lg flex items-center justify-center">
                  <div className="w-12 h-0.5 bg-[#2E3A2F] rounded-full" />
                </div>
              </div>

              {/* Overlapping Phone Badge (for Desktop cards with mobile companion, like Card 1 PolyMaps) */}
              {secondaryImg && (
                <div
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
                    "absolute -bottom-3 -right-2 sm:-right-4 z-20 rounded-xl overflow-hidden border-2 border-white shadow-xl bg-white cursor-pointer hover:scale-105 transition-all group/float",
                    phase.id === 'morning' ? "w-28 sm:w-36" : "w-32 sm:w-44"
                  )}
                >
                  <div className="px-2 py-0.5 bg-[#2E3A2F] text-[8px] font-bold text-[#D9C9B2] flex items-center justify-between">
                    <span className="truncate">{phase.secondaryLabel || t('portal:timeline_view_secondary', 'Pratonton')}</span>
                    <span className="text-[#C96F4F] group-hover/float:underline text-[7px] ml-1">
                      {isPhoneScreenshot(secondaryImg) ? t('portal:timeline_zoom', 'Zum') : t('portal:timeline_switch', 'Tukar')}
                    </span>
                  </div>
                  <div className="overflow-hidden max-h-36 sm:max-h-44 bg-[#1F2720]">
                    <img
                      src={secondaryImg}
                      alt={phase.secondaryLabel || 'Secondary Preview'}
                      className="w-full h-auto object-cover object-top"
                    />
                  </div>
                </div>
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
        metric: {
          value: CAMPUS_DAY_PHASES[0].metric?.value || '1,080+',
          label: t('portal:timeline_phase_morning_metric_label', CAMPUS_DAY_PHASES[0].metric?.label || 'Jadual Siswa Aktif'),
        },
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
        metric: {
          value: CAMPUS_DAY_PHASES[1].metric?.value || '340+',
          label: t('portal:timeline_phase_noon_metric_label', CAMPUS_DAY_PHASES[1].metric?.label || 'Pesanan Selesai Kampus'),
        },
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
        metric: {
          value: CAMPUS_DAY_PHASES[2].metric?.value || '21',
          label: t('portal:timeline_phase_evening_metric_label', CAMPUS_DAY_PHASES[2].metric?.label || 'Kelab Rasmi Beroperasi'),
        },
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
        metric: {
          value: CAMPUS_DAY_PHASES[3].metric?.value || '100%',
          label: t('portal:timeline_phase_night_metric_label', CAMPUS_DAY_PHASES[3].metric?.label || 'Tindakan Responsif JPP'),
        },
      },
    ];
  }, [t]);

  const scrollToPhase = (phaseId: string) => {
    const el = document.getElementById(phaseId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <section id="hari-kampus" className="py-24 md:py-32 px-4 md:px-6 bg-[#F8F6EE] relative z-20 overflow-hidden">
      {/* Decorative Organic Ambient Halos */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#6B7F5B]/5 rounded-full blur-xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#C96F4F]/5 rounded-full blur-xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        {/* Section Header (The OpenLearning Signature Style) */}
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#D9C9B2] shadow-2xs mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#C96F4F]" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#2E3A2F]">
              {t('portal:landing_timeline_badge', 'PENGALAMAN EKOSISTEM MAHASISWA')}
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#2E3A2F] tracking-tight mb-4 leading-[1.05]">
            {t('portal:landing_timeline_exp_title', 'The POLISAS Experience:')}
            <span className="block text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#6B7F5B] mt-1.5">
              {t('portal:landing_timeline_title', 'Sehari Bersama Ekosistem POLISAS')}
            </span>
          </h2>
          <p className="text-sm md:text-base text-[#556453] font-medium leading-relaxed max-w-2xl mx-auto">
            {t(
              'portal:landing_timeline_subtitle',
              'Satu ruang pintar di mana teknologi moden dan kehidupan kampus berpadu untuk memacu kecemerlangan mahasiswa'
            )}
          </p>

          {/* Quick-Jump Milestone Navigation Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 mt-8">
            {localizedPhases.map((phase) => (
              <button
                key={phase.id}
                type="button"
                onClick={() => scrollToPhase(phase.id)}
                className="px-3.5 sm:px-4 py-1.5 rounded-full bg-white hover:bg-[#2E3A2F] hover:text-[#F8F6EE] text-[#556453] border border-[#D9C9B2] text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer group"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: phase.tagColor }}
                />
                <span className="font-mono text-[11px]">{phase.time}</span>
                <span className="text-[11px] text-[#2E3A2F] group-hover:text-[#F8F6EE] font-semibold">
                  • {phase.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── TIMELINE SPINE & ALTERNATING CARDS GRID ── */}
        <div className="relative">
          {/* Desktop Central Spine Line (runs through the exact middle of the 2-column grid) */}
          <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 top-4 bottom-8 w-0.5 bg-gradient-to-b from-[#6B7F5B]/30 via-[#C96F4F]/40 to-[#2E3A2F]/30 pointer-events-none z-10" />

          {/* Mobile Left Spine Line (docked at left-6 = 24px) */}
          <div className="lg:hidden absolute left-6 top-4 bottom-8 w-0.5 bg-gradient-to-b from-[#6B7F5B]/30 via-[#C96F4F]/40 to-[#2E3A2F]/30 pointer-events-none z-10" />

          {/* Desktop Center Spine Node "&" Badge (OpenLearning Signature connecting element) */}
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 top-5 z-20 items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-[#6B7F5B] text-white font-serif font-black text-2xl flex items-center justify-center shadow-md border-2 border-white ring-4 ring-[#F8F6EE]">
              &
            </div>
          </div>

          {/* ── SECTION MARKERS HEADER (Flanking the Spine: Confident & Connected) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-6 mb-10 md:mb-14 relative">
            {/* Top-Left Section Marker: Pintar & Berdaya */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={typeof window === 'undefined' ? { opacity: 1, y: 0 } : undefined}
              {...(typeof window !== 'undefined' ? { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" } } : {})}
              transition={{ duration: 0.5 }}
              className="pl-16 lg:pl-0"
            >
              <div className="inline-flex items-center gap-2 text-xs font-bold font-mono tracking-widest text-[#6B7F5B] uppercase mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#6B7F5B]" />
                {t('portal:landing_phase_01_tag', 'Fasa 01 • Pembelajaran & Kemudahan')}
              </div>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#2E3A2F] tracking-tight">
                {t('portal:landing_phase_01_title', 'Pintar & Berdaya')}
              </h3>
              <p className="text-xs sm:text-sm text-[#556453] mt-2 font-medium max-w-md">
                {t(
                  'portal:landing_phase_01_desc',
                  'Pendedahan akademik pintar & keusahawanan kampus di hujung jari bermula awal pagi.'
                )}
              </p>
            </motion.div>

            {/* Top-Right Section Marker: Terhubung & Prihatin */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={typeof window === 'undefined' ? { opacity: 1, y: 0 } : undefined}
              {...(typeof window !== 'undefined' ? { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" } } : {})}
              transition={{ duration: 0.5 }}
              className="pl-16 lg:pl-0"
            >
              {/* Mobile '&' separator node */}
              <div className="lg:hidden flex items-center gap-3 py-4 -ml-16 pl-2">
                <div className="w-10 h-10 rounded-full bg-[#6B7F5B] text-white font-serif font-black text-xl flex items-center justify-center shadow-md border-2 border-white ring-2 ring-[#F8F6EE] z-20 flex-shrink-0">
                  &
                </div>
                <div className="h-px bg-[#D9C9B2] flex-1" />
              </div>

              <div className="inline-flex items-center gap-2 text-xs font-bold font-mono tracking-widest text-[#C96F4F] uppercase mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C96F4F]" />
                {t('portal:landing_phase_02_tag', 'Fasa 02 • Kepimpinan & Kebajikan')}
              </div>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#2E3A2F] tracking-tight">
                {t('portal:landing_phase_02_title', 'Terhubung & Prihatin')}
              </h3>
              <p className="text-xs sm:text-sm text-[#556453] mt-2 font-medium max-w-md">
                {t(
                  'portal:landing_phase_02_desc',
                  'Tadbir urus 21 kelab & EMS berpusat disokong rangkaian keselamatan kebajikan 24/7.'
                )}
              </p>
            </motion.div>
          </div>

          {/* ── ALTERNATING STORY CARDS TWO-COLUMN GRID ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-12 lg:gap-y-16 relative">
            {/* ── LEFT COLUMN: Pintar & Berdaya (Card 1 & Card 2) ── */}
            <div className="space-y-12 lg:space-y-16 pl-16 lg:pl-0 relative">
              {/* Card 1: Teroka (Discover) */}
              <StoryCard
                phase={localizedPhases[0]}
                position="left"
                icon={Compass}
                accentColor="#6B7F5B"
                onOpenLightbox={setLightboxImage}
              />

              {/* Card 2: Muamalat (PolyMart & JPP Pay) */}
              <StoryCard
                phase={localizedPhases[1]}
                position="left"
                icon={ShoppingBag}
                accentColor="#C96F4F"
                onOpenLightbox={setLightboxImage}
              />
            </div>

            {/* ── RIGHT COLUMN: Terhubung & Prihatin (Card 3 & Card 4) ── */}
            <div className="space-y-12 lg:space-y-16 pl-16 lg:pl-0 relative lg:pt-16">
              {/* Card 3: Pimpin (Kelab & EMS) */}
              <StoryCard
                phase={localizedPhases[2]}
                position="right"
                icon={Shield}
                accentColor="#2E3A2F"
                onOpenLightbox={setLightboxImage}
              />

              {/* Card 4: Peduli (Kebajikan & Food Bank) */}
              <StoryCard
                phase={localizedPhases[3]}
                position="right"
                icon={HeartHandshake}
                accentColor="#6B7F5B"
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
