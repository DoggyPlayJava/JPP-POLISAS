import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  Zap,
  GraduationCap,
  Sparkles,
  Search,
  Compass,
  MapPin,
  Store,
  HeartHandshake,
  Menu,
  X,
  ChevronDown,
  Bot,
  Trophy,
  FileCheck,
  QrCode,
  Coffee,
  CheckCircle2,
  ChevronRight,
  Globe2,
  Smartphone,
  Star,
  Users,
  Calendar,
  Layers,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

// Design Read:
// Reading this as: Flagship SuperApp landing page faithful to reference media_1791375970007.png,
// with a clean porcelain & warm silk canvas, luminous emerald accents (#059669, #10B981),
// 3D handheld mockups, micro-app showcases, student community testimonials, and giant POLISAS watermark footer.
// Dials: DESIGN_VARIANCE: 7, MOTION_INTENSITY: 6, VISUAL_DENSITY: 3.

// Smooth scroll helper
const scrollToSection = (id: string, offset = 80) => {
  const cleanId = id.replace('#', '');
  const element = document.getElementById(cleanId);
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
};

// --- Section 1: Floating Glassmorphic Pill Navbar (<Navbar />) ---
export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Ekosistem', href: '#ekosistem' },
    { label: 'Modul', href: '#modul' },
    { label: 'Statistik', href: '#statistik' },
    { label: 'Soalan Lazim', href: '#faq' }
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 flex justify-center px-4 sm:px-6",
          isScrolled ? "py-3" : "py-5"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between w-full max-w-6xl px-4 sm:px-6 py-2.5 rounded-full border transition-all duration-300",
            "bg-white/85 dark:bg-[#0E2218]/85 backdrop-blur-xl border-slate-200/80 dark:border-[#52796F]/25 shadow-sm dark:shadow-[0_12px_40px_rgba(8,20,14,0.6)]"
          )}
        >
          {/* Logo & Brand Identity */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[#0E2218] border border-emerald-200/80 dark:border-[#52796F]/30 p-1.5 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
              <img
                src="/jpp-logo.png"
                alt="JPP Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-slate-900 dark:text-white text-sm sm:text-base leading-none">
                  JPP POLISAS
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest text-emerald-700 dark:text-[#74C69D] bg-emerald-100/70 dark:bg-[#2D6A4F]/25 border border-emerald-300/60 dark:border-[#74C69D]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  PORTAL RASMI
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-[#84A98C] font-medium tracking-wide">
                Politeknik Sultan Haji Ahmad Shah
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-xs font-semibold text-slate-600 dark:text-[#84A98C] hover:text-emerald-600 dark:hover:text-white transition-colors cursor-pointer tracking-wide"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Action Button & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/portal')}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:text-[#08140E] dark:bg-[#74C69D] dark:hover:bg-[#84A98C] transition-all flex items-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
            >
              <span>Masuk Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              className="md:hidden w-9 h-9 rounded-full bg-slate-100 dark:bg-[#0E2218] border border-slate-200 dark:border-[#52796F]/30 flex items-center justify-center text-slate-700 dark:text-[#84A98C] hover:text-slate-900 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-20 z-40 p-5 rounded-3xl bg-white/95 dark:bg-[#0E2218]/95 backdrop-blur-2xl border border-slate-200 dark:border-[#52796F]/30 md:hidden shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#52796F]/20 mb-3">
              <span className="text-xs font-bold text-emerald-600 dark:text-[#74C69D] tracking-wider uppercase">
                PORTAL RASMI
              </span>
              <span className="text-[10px] text-slate-500 dark:text-[#84A98C]">Sesi 2026/2027</span>
            </div>
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => {
                    scrollToSection(link.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-3 px-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-[#84A98C] hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-[#2D6A4F]/20 transition-all flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-[#52796F]" />
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate('/portal');
              }}
              className="mt-4 w-full py-3 rounded-xl bg-emerald-600 dark:bg-[#74C69D] text-white dark:text-[#08140E] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Masuk Portal Pelajar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// --- Section 2: Handheld SuperApp Hero (<Hero />) ---
export const Hero: React.FC<{ isLowEnd: boolean }> = ({ isLowEnd }) => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[92dvh] flex flex-col justify-between pt-28 sm:pt-36 pb-16 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-emerald-50/20 dark:from-[#08140E] dark:via-[#08140E] dark:to-[#0A1C12]">
      {/* Ethereal Diffuse Warm & Mint Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={cn(
            "absolute top-[-5%] left-1/2 -translate-x-1/2 w-[70vw] h-[40vw] rounded-full bg-gradient-to-r from-amber-200/20 via-emerald-200/25 to-teal-200/20 dark:from-emerald-950/20 dark:via-[#2D6A4F]/20 dark:to-transparent blur-[140px]",
            isLowEnd && "blur-[70px] opacity-40"
          )}
        />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 text-center my-auto">
        {/* Eyebrow Pill */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-[#0E2218] border border-slate-200/80 dark:border-[#52796F]/30 backdrop-blur-md mb-6 shadow-xs"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-[#74C69D]">
            POLISAS SuperApp 2026/2027
          </span>
        </motion.div>

        {/* Display H1 Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black tracking-[-0.035em] text-slate-900 dark:text-white leading-[1.08] max-w-4xl mx-auto"
        >
          Menghubungkan Setiap Detik Kehidupan Kampus.
        </motion.h1>

        {/* Subtext (concise <= 20 words, no em-dashes) */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg text-slate-600 dark:text-[#94A3B8] font-medium leading-relaxed my-6 max-w-2xl mx-auto"
        >
          Akses e-Akademik, aktiviti kelab, pasaran PolyMart, dan navigasi pintar dalam satu sentuhan mudah alih.
        </motion.p>

        {/* Dual Action CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3.5 pt-2 mb-16"
        >
          <button
            onClick={() => navigate('/portal')}
            className="px-7 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-[#74C69D] dark:hover:bg-[#84A98C] dark:text-[#08140E] font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-2.5 shadow-md active:scale-[0.98] cursor-pointer"
          >
            <span>Masuk Portal Pelajar</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => scrollToSection('#ekosistem')}
            className="px-6 py-3.5 rounded-full bg-white dark:bg-[#0E2218] border border-slate-200/90 dark:border-[#52796F]/30 text-slate-700 dark:text-[#84A98C] hover:text-slate-900 dark:hover:text-white font-bold text-xs uppercase tracking-wider transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <span>Terokai Ekosistem</span>
          </button>
        </motion.div>

        {/* Central Handheld Phone Mockup with Peripheral Floating Cards (Faithful to SkyGoo) */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="relative w-full max-w-lg mx-auto pt-4"
        >
          {/* Main Handheld Smartphone Frame */}
          <div className="relative mx-auto w-[280px] sm:w-[320px] rounded-[2.5rem] p-3 bg-slate-900 border-[6px] border-slate-800 shadow-[0_25px_60px_rgba(15,23,42,0.25)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.8)] z-10">
            {/* Dynamic Island Pill */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-950 rounded-full z-20 flex items-center justify-end px-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
            </div>

            {/* Phone Screen Display */}
            <div className="w-full rounded-[2rem] bg-slate-50 dark:bg-[#0E2218] overflow-hidden pt-8 pb-5 px-4 text-left border border-slate-100 dark:border-white/5">
              {/* Screen Top Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10 mb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 block">Selamat Datang</span>
                  <p className="text-xs font-black text-slate-900 dark:text-white">Pelajar POLISAS</p>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[9px] font-black font-mono">
                  AKTIF
                </div>
              </div>

              {/* SuperApp Core Micro-Grid (6 Tiles) */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div
                  onClick={() => navigate('/akademik')}
                  className="p-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 text-center cursor-pointer hover:border-emerald-300 transition-colors"
                >
                  <GraduationCap className="w-4 h-4 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
                  <span className="text-[9px] font-bold text-slate-800 dark:text-white block truncate">e-Akademik</span>
                </div>
                <div
                  onClick={() => navigate('/polymart')}
                  className="p-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 text-center cursor-pointer hover:border-emerald-300 transition-colors"
                >
                  <Store className="w-4 h-4 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
                  <span className="text-[9px] font-bold text-slate-800 dark:text-white block truncate">PolyMart</span>
                </div>
                <div
                  onClick={() => navigate('/polymaps')}
                  className="p-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 text-center cursor-pointer hover:border-emerald-300 transition-colors"
                >
                  <Compass className="w-4 h-4 mx-auto text-teal-600 dark:text-teal-400 mb-1" />
                  <span className="text-[9px] font-bold text-slate-800 dark:text-white block truncate">PolyMaps</span>
                </div>
                <div
                  onClick={() => navigate('/kebajikan')}
                  className="p-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 text-center cursor-pointer hover:border-emerald-300 transition-colors"
                >
                  <HeartHandshake className="w-4 h-4 mx-auto text-rose-600 dark:text-rose-400 mb-1" />
                  <span className="text-[9px] font-bold text-slate-800 dark:text-white block truncate">FoodBank</span>
                </div>
                <div
                  onClick={() => navigate('/portal')}
                  className="p-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 text-center cursor-pointer hover:border-emerald-300 transition-colors"
                >
                  <Shield className="w-4 h-4 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
                  <span className="text-[9px] font-bold text-slate-800 dark:text-white block truncate">Kelab EKPP</span>
                </div>
                <div
                  onClick={() => navigate('/portal')}
                  className="p-2 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 text-center cursor-pointer hover:border-emerald-300 transition-colors"
                >
                  <Trophy className="w-4 h-4 mx-auto text-indigo-600 dark:text-indigo-400 mb-1" />
                  <span className="text-[9px] font-bold text-slate-800 dark:text-white block truncate">SUPSAS</span>
                </div>
              </div>

              {/* In-App Live Activity Card */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">Imbasan Merit QR</span>
                  <span className="text-[9px] font-mono text-emerald-600 font-bold">+15 Pts</span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-white/60 mt-0.5 truncate">Bengkel Kemahiran Siswa</p>
              </div>
            </div>
          </div>

          {/* Floating Card 1: e-Akademik Merit (Top Left Floating) */}
          <motion.div
            animate={isLowEnd ? {} : { y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-4 -left-6 sm:-left-16 p-3.5 rounded-2xl bg-white/95 dark:bg-[#0E2218] border border-slate-200/80 dark:border-[#52796F]/30 shadow-lg z-20 text-left w-44 hidden xs:block"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-bold text-slate-900 dark:text-white">Portal Cockpit</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-500">CGPA Semasa</span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">3.82</span>
            </div>
            <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">190 Mata Merit</span>
          </motion.div>

          {/* Floating Card 2: PolyMart Hub (Top Right Floating) */}
          <motion.div
            animate={isLowEnd ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute top-8 -right-6 sm:-right-16 p-3.5 rounded-2xl bg-white/95 dark:bg-[#0E2218] border border-slate-200/80 dark:border-[#52796F]/30 shadow-lg z-20 text-left w-44 hidden xs:block"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Store className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-bold text-slate-900 dark:text-white">PolyMart Hub</span>
            </div>
            <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">Baju Rasmi JPP</p>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">RM 39.00</span>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">JPP Pay</span>
            </div>
          </motion.div>

          {/* Floating Card 3: FoodBank Siswa (Bottom Left Floating) */}
          <motion.div
            animate={isLowEnd ? {} : { y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-6 -left-8 sm:-left-14 p-3 rounded-2xl bg-white/95 dark:bg-[#0E2218] border border-slate-200/80 dark:border-[#52796F]/30 shadow-lg z-20 text-left w-40 hidden sm:block"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Coffee className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[10px] font-bold text-slate-900 dark:text-white">Kupon FoodBank</span>
            </div>
            <p className="text-sm font-black font-mono text-emerald-600">RM 15.00</p>
            <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full inline-block mt-0.5">Ditebus di Kafe</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// --- Section 3: Micro-App Showcase Triad (<MicroAppTriad />) ---
export const MicroAppTriad: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="ekosistem" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#08140E] border-t border-slate-100 dark:border-white/5">
      <div className="max-w-6xl mx-auto text-center">
        {/* Editorial Heading */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight max-w-2xl mx-auto">
          Rancang Perjalanan Harian Kampus Anda
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8] font-medium max-w-xl mx-auto mt-4 mb-14 leading-relaxed">
          Satu sistem yang mengingati jadual kelas, bilik kuliah, laluan jalan kaki, dan penempatan anda.
        </p>

        {/* 3 Mockup Cards Triad (Faithful to SkyGoo Triad) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: PolyMaps 360 & Navigasi */}
          <div
            onClick={() => navigate('/polymaps')}
            className="rounded-3xl p-6 bg-slate-50 dark:bg-[#0E2218] border border-slate-200/80 dark:border-[#52796F]/25 hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all cursor-pointer group text-left shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-[#74C69D]">
                PolyMaps 360
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                Navigasi Kampus & Peta Teduh
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-2 leading-relaxed">
                Panduan interaktif dewan kuliah, makmal komputer, dan pemetaan laluan berbumbung sewaktu hujan.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-[#74C69D]">
              <span>Buka Peta Kampus</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: e-Akademik & Takwim */}
          <div
            onClick={() => navigate('/akademik')}
            className="rounded-3xl p-6 bg-slate-50 dark:bg-[#0E2218] border border-slate-200/80 dark:border-[#52796F]/25 hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all cursor-pointer group text-left shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                e-Akademik & Takwim
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                Jadual Sesi & Unjuran Merit
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-2 leading-relaxed">
                Penjejakan tarikh peperiksaan, takwim aktiviti HEP, dan rekod keputusan CGPA secara berpusat.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>Semak Takwim</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: PolyRent & KAMSIS */}
          <div
            onClick={() => navigate('/portal')}
            className="rounded-3xl p-6 bg-slate-50 dark:bg-[#0E2218] border border-slate-200/80 dark:border-[#52796F]/25 hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all cursor-pointer group text-left shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-5">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                PolyRent & KAMSIS
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                Penempatan & Rumah Sewa
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-2 leading-relaxed">
                Semakan keputusan asrama kamsis dan direktori sewa rumah luar kampus yang disahkan selamat.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs font-bold text-cyan-600 dark:text-cyan-400">
              <span>Semak Penempatan</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Section 4: 2x2 Bento Feature Grid (<CommerceBentoGrid />) ---
export const CommerceBentoGrid: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="modul" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-slate-50/60 dark:bg-[#08140E] border-t border-slate-100 dark:border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Pesanan Pantas. Penjejakan Masa Nyata.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8] font-medium mt-3 leading-relaxed">
            Ekosistem perniagaan siswa PolyMart dan bantuan makanan FoodBank yang telus.
          </p>
        </div>

        {/* 2x2 Bento Tiles (Faithful to SkyGoo 2x2 layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tile 1: PolyMart Katalog */}
          <div
            onClick={() => navigate('/polymart')}
            className="p-8 rounded-3xl bg-white dark:bg-[#0E2218] border border-slate-200/80 dark:border-[#52796F]/25 hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-500/20 px-2.5 py-1 rounded-full">
                  Pasaran Siswa
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">JPP PAY SAH</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Katalog Produk PolyMart</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] mt-2 leading-relaxed">
                Jual beli produk kraf, makanan kafeteria, pakaian rasmi, dan servis cetakan terus antara penuntut POLISAS.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-[#74C69D]">
              <span>Buka Katalog PolyMart</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Tile 2: JPP Pay & Resit Digital */}
          <div
            onClick={() => navigate('/polymart')}
            className="p-8 rounded-3xl bg-white dark:bg-[#0E2218] border border-slate-200/80 dark:border-[#52796F]/25 hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-500/20 px-2.5 py-1 rounded-full">
                  Sifar Caj
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">100% TELUS</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">JPP Pay & Resit Digital</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] mt-2 leading-relaxed">
                Transaksi tanpa tunai selamat dengan pengesahan resit automatik bagi memperkasa ekonomi mikro mahasiswa.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-[#74C69D]">
              <span>Ketahui JPP Pay</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Tile 3: Kupon Digital FoodBank Siswa */}
          <div
            onClick={() => navigate('/kebajikan')}
            className="p-8 rounded-3xl bg-white dark:bg-[#0E2218] border border-slate-200/80 dark:border-[#52796F]/25 hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-500/20 px-2.5 py-1 rounded-full">
                  Kebajikan Mahasiswa
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600">RM 15 PERCUMA</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Kupon FoodBank Siswa</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] mt-2 leading-relaxed">
                Bantuan makanan segera secara bermaruah melalui baucar kupon QR digital yang boleh ditebus di kafeteria kolej kediaman.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-[#74C69D]">
              <span>Mohon Kupon FoodBank</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Tile 4: Pesanan Pantas Mudah Alih */}
          <div
            onClick={() => navigate('/portal')}
            className="p-8 rounded-3xl bg-white dark:bg-[#0E2218] border border-slate-200/80 dark:border-[#52796F]/25 hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-all cursor-pointer group shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-500/20 px-2.5 py-1 rounded-full">
                  Pemberitahuan Segera
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">STATUS REALTIME</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Pesanan Pantas Mudah Alih</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] mt-2 leading-relaxed">
                Penjejakan pesanan jualan dan pengesahan pikap fizikal di kafe atau asrama dengan notifikasi masa nyata.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-[#74C69D]">
              <span>Terokai Modul Pesanan</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Section 5: Split Lifestyle Photo & FAQ Accordion (<FaqSplitSection />) ---
export const FaqSplitSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Siapa yang layak mengakses Portal JPP POLISAS?',
      a: 'Semua pelajar berdaftar, staf akademik, dan barisan pimpinan exco POLISAS mempunyai akses penuh mengikut peranan akaun masing-masing dengan menggunakan emel siswa atau kredensial kampus rasmi.'
    },
    {
      q: 'Bagaimana kelab menghantar kertas kerja aktiviti?',
      a: 'Melalui modul e-Aktiviti secara paperless sepenuhnya. Sistem dilengkapi semakan automatik format HEP dan penjejakan status kelulusan masa nyata daripada penasihat hingga pengurusan HEP.'
    },
    {
      q: 'Adakah PolyMart dibuka untuk semua pelajar berniaga?',
      a: 'Ya, vendor siswa boleh mendaftar perniagaan secara percuma. PolyMart menyediakan platform katalog produk, pengesahan tempahan segera, dan transaksi selamat yang dikuasakan oleh JPP Pay.'
    },
    {
      q: 'Bagaimana merit akademik dan merit aktiviti dikira?',
      a: 'Merit aktiviti dikreditkan secara automatik melalui imbasan kod QR rasmi semasa menghadiri program, manakala pemantauan HPNM dan rekod transkrip aktiviti boleh disemak melalui modul e-Akademik.'
    }
  ];

  return (
    <section id="faq" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#08140E] border-t border-slate-100 dark:border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Authentic Lifestyle Campus Photography (Persis SkyGoo) */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 dark:border-white/10 group h-[420px]">
              <img
                src="https://picsum.photos/seed/polisas-lifestyle-campus/800/1000"
                alt="Kehidupan Kampus POLISAS"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Komuniti Siswa</span>
                <p className="text-lg font-black mt-1">Ekosistem Yang Mengutamakan Anda</p>
                <p className="text-xs text-slate-300 mt-1">Bantuan, aktiviti, dan sokongan bila-bila masa.</p>
              </div>
            </div>
          </div>

          {/* Right: Hairline FAQ Accordion */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Soalan Lazim
              </h2>
              <p className="text-sm text-slate-600 dark:text-[#94A3B8] font-medium mt-2">
                Ketahui lebih lanjut mengenai operasi sistem, pendaftaran modul, dan hak akses anda.
              </p>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-white/10 border-y border-slate-200 dark:border-white/10">
              {faqs.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div key={index} className="py-4 sm:py-5">
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="w-full flex items-center justify-between text-left gap-4 focus:outline-none group cursor-pointer"
                    >
                      <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-[#74C69D] transition-colors">
                        {faq.q}
                      </span>
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 transition-transform duration-300",
                          isOpen ? "bg-emerald-600 text-white dark:bg-[#74C69D] dark:text-[#08140E] rotate-180" : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-[#84A98C]"
                        )}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed pt-2 pr-6">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Section 6: Campus Scale & 3D Globe Metric (<CampusGlobeScale />) ---
export const CampusGlobeScale: React.FC = () => {
  return (
    <section id="statistik" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-slate-50/70 dark:bg-[#08140E] border-t border-slate-100 dark:border-white/5 text-center">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight max-w-2xl mx-auto">
          Satu Kampus. Dihubungkan Sepenuhnya.
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8] font-medium max-w-xl mx-auto mt-3 mb-12 leading-relaxed">
          Akses menyeluruh tanpa perlu bertukar platform berasingan.
        </p>

        {/* 3D Glowing Globe Visual (Persis SkyGoo Globe Section) */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto mb-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-emerald-400/20 via-teal-300/10 to-transparent blur-2xl pointer-events-none" />
          <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-emerald-300/40 dark:border-emerald-500/30 bg-gradient-to-tr from-emerald-100/60 via-teal-50 to-white dark:from-emerald-950/60 dark:via-[#0E2218] dark:to-transparent flex items-center justify-center shadow-inner relative overflow-hidden">
            <Globe2 className="w-40 h-40 sm:w-48 sm:h-48 text-emerald-600/30 dark:text-emerald-400/20 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 via-transparent to-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Metric Ribbon (3 Counters) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-200/60 dark:border-white/10 text-center">
          <div>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono">15,000+</p>
            <p className="text-xs text-slate-500 dark:text-[#84A98C] font-semibold mt-1">Mahasiswa</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono">120+</p>
            <p className="text-xs text-slate-500 dark:text-[#84A98C] font-semibold mt-1">Kelab Aktif</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-[#74C69D] font-mono">12</p>
            <p className="text-xs text-slate-500 dark:text-[#84A98C] font-semibold mt-1">Modul Bersepadu</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono">100%</p>
            <p className="text-xs text-slate-500 dark:text-[#84A98C] font-semibold mt-1">Digital & Telus</p>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Section 7: Student Testimonials & Community Voice (<StudentCommunityVoice />) ---
export const StudentCommunityVoice: React.FC = () => {
  const testimonials = [
    {
      name: 'Nur Aisyah',
      role: 'Diploma Kejuruteraan Elektrik',
      image: 'https://picsum.photos/seed/student-aisyah/200/200',
      comment: 'Urusan semakan CGPA dan merit kokurikulum jadi sangat mudah. Hanya imbas kod QR aktiviti terus masuk rekod.'
    },
    {
      name: 'Muhammad Farhan',
      role: 'Diploma Teknologi Maklumat',
      image: 'https://picsum.photos/seed/student-farhan/200/200',
      comment: 'PolyMart membolehkan kelab kami menjual merchandise rasmi dengan JPP Pay tanpa sebarang caj tersembunyi.'
    },
    {
      name: 'Sarah Tan',
      role: 'Diploma Perdagangan',
      image: 'https://picsum.photos/seed/student-sarah/200/200',
      comment: 'Kupon FoodBank membantu ramai rakan saya ketika waktu kecemasan. Sangat bersyukur inisiatif ini serba digital.'
    },
    {
      name: 'Hafizuddin',
      role: 'Diploma Kejuruteraan Mekanikal',
      image: 'https://picsum.photos/seed/student-hafiz/200/200',
      comment: 'PolyMaps 360 paling berguna sewaktu awal semester untuk cari makmal dan laluan berbumbung bila hujan.'
    }
  ];

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-50/40 via-emerald-50/30 to-white dark:from-[#0E2218] dark:to-[#08140E] border-t border-slate-100 dark:border-white/5">
      <div className="max-w-6xl mx-auto text-center">
        {/* Brand Badges Triad */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <span className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#0E2218] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-[#84A98C] shadow-2xs">
            Politeknik KPT
          </span>
          <span className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#0E2218] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-[#84A98C] shadow-2xs">
            Majlis Perwakilan Pelajar
          </span>
          <span className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#0E2218] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-[#84A98C] shadow-2xs">
            Hal Ehwal Pelajar
          </span>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight max-w-2xl mx-auto">
          Suara Mahasiswa POLISAS
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8] font-medium max-w-xl mx-auto mt-3 mb-14 leading-relaxed">
          Pengalaman sebenar ribuan warga kampus yang memanfaatkan SuperApp setiap hari.
        </p>

        {/* 4 Testimonial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="p-6 rounded-3xl bg-white dark:bg-[#0E2218] border border-slate-200/80 dark:border-[#52796F]/25 shadow-xs flex flex-col justify-between"
            >
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed mb-6">
                &ldquo;{t.comment}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
                <img src={t.image} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{t.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-[#84A98C] truncate max-w-[140px]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Section 8: Final Perspective Handheld CTA & Grand Watermark Footer (<FinalHandheldCtaAndFooter />) ---
export const FinalHandheldCtaAndFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* Final Perspective Handheld CTA Banner */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white relative overflow-hidden text-center">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Sedia Untuk Mula?
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Bersedia Memulakan Pengalaman Kampus Pintar Anda?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto my-6 leading-relaxed">
            Sertai ribuan penuntut POLISAS hari ini dalam ekosistem digital yang serba lengkap dan pantas.
          </p>

          <button
            onClick={() => navigate('/portal')}
            className="px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all duration-300 inline-flex items-center gap-2.5 shadow-lg active:scale-[0.98] cursor-pointer"
          >
            <span>Masuk Portal Pelajar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Grand Editorial Footer with Giant POLISAS Watermark */}
      <footer className="pt-16 pb-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#08140E] border-t border-slate-200/80 dark:border-white/10 relative overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-16 border-b border-slate-100 dark:border-white/5">
            {/* Col 1 & 2: Brand Info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-white/5 border border-emerald-200 dark:border-white/10 p-1 flex items-center justify-center">
                  <img src="/jpp-logo.png" alt="JPP POLISAS" className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="text-base font-black tracking-tight text-slate-900 dark:text-white block">
                    JPP POLISAS
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-[#84A98C]">
                    Jawatankuasa Perwakilan Pelajar
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed max-w-sm">
                SuperApp digital rasmi Politeknik Sultan Haji Ahmad Shah. Menghubungkan kebajikan, pengurusan aktiviti, pasaran siswa, dan kejohanan kampus.
              </p>
            </div>

            {/* Col 3: Servis Pelajar */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Servis Pelajar
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-[#84A98C]">
                <li>
                  <button onClick={() => navigate('/portal')} className="hover:text-emerald-600 dark:hover:text-white transition-colors cursor-pointer">
                    Portal Utama
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/akademik')} className="hover:text-emerald-600 dark:hover:text-white transition-colors cursor-pointer">
                    e-Akademik & Merit
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/polymart')} className="hover:text-emerald-600 dark:hover:text-white transition-colors cursor-pointer">
                    PolyMart Siswa
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/kebajikan')} className="hover:text-emerald-600 dark:hover:text-white transition-colors cursor-pointer">
                    FoodBank Siswa
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/polymaps')} className="hover:text-emerald-600 dark:hover:text-white transition-colors cursor-pointer">
                    PolyMaps 360
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Pautan Rasmi */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Pautan Rasmi
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-[#84A98C]">
                <li>
                  <a href="https://polisas.mypolycc.edu.my" target="_blank" rel="noreferrer" className="hover:text-emerald-600 dark:hover:text-white transition-colors">
                    Laman Web POLISAS
                  </a>
                </li>
                <li>
                  <a href="https://spmp.polisas.edu.my" target="_blank" rel="noreferrer" className="hover:text-emerald-600 dark:hover:text-white transition-colors">
                    Portal SPMP POLISAS
                  </a>
                </li>
                <li>
                  <a href="https://www.mypolycc.edu.my" target="_blank" rel="noreferrer" className="hover:text-emerald-600 dark:hover:text-white transition-colors">
                    Jabatan Pendidikan Politeknik (JPPKK)
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 5: Bantuan & Hubungi */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Bantuan & Hubungi
              </h4>
              <div className="space-y-2 text-xs text-slate-600 dark:text-[#84A98C]">
                <p>Aras 1, Bangunan HEP, POLISAS, Semambu, 25350 Kuantan, Pahang</p>
                <p className="text-emerald-600 font-mono">jpp@polisas.edu.my</p>
              </div>
            </div>
          </div>

          {/* Legal Notice */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-[#84A98C]">
            <p>© 2026 JPP POLISAS. Hak Cipta Terpelihara.</p>
            <p className="text-[11px] text-slate-400">
              Dibangunkan oleh Majlis Perwakilan Pelajar POLISAS
            </p>
          </div>

          {/* Giant POLISAS Watermark (Faithful to SkyGoo Watermark) */}
          <div className="text-center pt-10 select-none pointer-events-none opacity-[0.06] dark:opacity-[0.04]">
            <span className="text-7xl sm:text-9xl md:text-[11rem] font-black tracking-tighter text-slate-900 dark:text-white block uppercase">
              POLISAS
            </span>
          </div>
        </div>
      </footer>
    </>
  );
};

// --- Main Entry Component ---
export const LandingPage: React.FC = () => {
  const { isLowPerf: isLowEnd } = useDevicePerformance();

  return (
    <div className="min-h-screen bg-white dark:bg-[#08140E] text-slate-900 dark:text-white font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {/* 1. Navbar */}
      <Navbar />

      <main>
        {/* 2. Hero Handheld SuperApp */}
        <Hero isLowEnd={isLowEnd} />

        {/* 3. Micro-App Showcase Triad */}
        <MicroAppTriad />

        {/* 4. Commerce & Welfare 2x2 Bento */}
        <CommerceBentoGrid />

        {/* 5. Lifestyle Photo Split + FAQ */}
        <FaqSplitSection />

        {/* 6. Campus Scale & 3D Globe */}
        <CampusGlobeScale />

        {/* 7. Student Community Voice */}
        <StudentCommunityVoice />

        {/* 8. Final CTA & Grand Footer */}
        <FinalHandheldCtaAndFooter />
      </main>
    </div>
  );
};

export default LandingPage;
