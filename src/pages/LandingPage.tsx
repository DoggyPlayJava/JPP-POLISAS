import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Shield,
  Zap,
  Users,
  GraduationCap,
  Sparkles,
  Search,
  Compass,
  MapPin,
  Store,
  HeartHandshake,
  BookOpen,
  Activity,
  CheckCircle2,
  Menu,
  X,
  ChevronDown,
  Layers,
  Bot,
  Calendar,
  Trophy,
  FileCheck,
  QrCode,
  HelpCircle,
  ExternalLink,
  Laptop,
  Check,
  Building,
  Coffee,
  Clock,
  Award,
  ChevronRight,
  ShoppingBag,
  Bell,
  SlidersHorizontal,
  Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

// --- Smooth Scroll Helper ---
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

// --- Section 1: Floating Glassmorphic Pill Navbar ---
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
    { label: 'Keupayaan', href: '#keupayaan' },
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
            "flex items-center justify-between w-full max-w-6xl px-4 sm:px-6 py-2.5 rounded-full border transition-all duration-300 shadow-xl",
            "bg-[#08140E]/80 backdrop-blur-xl border-[#52796F]/25 shadow-[0_12px_40px_rgba(8,20,14,0.6)]"
          )}
        >
          {/* Logo & Brand Identity */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0E2218] border border-[#52796F]/30 p-1.5 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
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
                <span className="font-extrabold tracking-tight text-white text-sm sm:text-base leading-none">
                  JPP POLISAS
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest text-[#74C69D] bg-[#2D6A4F]/25 border border-[#74C69D]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#74C69D] animate-pulse" />
                  PORTAL RASMI
                </span>
              </div>
              <span className="text-[10px] text-[#84A98C] font-medium tracking-wide">
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
                className="text-xs font-semibold text-[#84A98C] hover:text-white transition-colors cursor-pointer tracking-wide"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Action Button & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/portal')}
              className="px-4 sm:px-5 py-2 rounded-full text-xs font-bold text-[#08140E] bg-[#74C69D] hover:bg-[#84A98C] transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(116,198,157,0.3)] active:scale-[0.98] cursor-pointer"
            >
              <span>Masuk Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              className="md:hidden w-9 h-9 rounded-full bg-[#0E2218] border border-[#52796F]/30 flex items-center justify-center text-[#84A98C] hover:text-white transition-colors"
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
            className="fixed inset-x-4 top-20 z-40 p-5 rounded-3xl bg-[#0E2218]/95 backdrop-blur-2xl border border-[#52796F]/30 md:hidden shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#52796F]/20 mb-3">
              <span className="text-xs font-bold text-[#74C69D] tracking-wider uppercase">
                PORTAL RASMI
              </span>
              <span className="text-[10px] text-[#84A98C]">Sesi 2026/2027</span>
            </div>
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => {
                    scrollToSection(link.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-3 px-3 rounded-xl text-sm font-semibold text-[#84A98C] hover:text-white hover:bg-[#2D6A4F]/20 transition-all flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-[#52796F]" />
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate('/portal');
              }}
              className="mt-4 w-full py-3 rounded-xl bg-[#74C69D] text-[#08140E] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
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

// --- Section 2: Asymmetric Hero Section with Perspective Deck & Live Ticker ---
export const Hero: React.FC<{ isLowEnd: boolean }> = ({ isLowEnd }) => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[92dvh] flex flex-col justify-between pt-28 sm:pt-36 pb-12 overflow-hidden bg-[#08140E]">
      {/* Editorial Ambient Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={cn(
            "absolute top-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-[#2D6A4F]/20 blur-[130px]",
            isLowEnd && "blur-[60px] opacity-40"
          )}
        />
        <div
          className={cn(
            "absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#0E2218] blur-[100px]",
            isLowEnd && "blur-[50px] opacity-30"
          )}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0E2218]/40 via-transparent to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Editorial Text Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Eyebrow Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0E2218] border border-[#52796F]/30 backdrop-blur-md mb-6 shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-[#74C69D] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#74C69D]">
                JPP POLISAS · Sistem Kampus Pintar
              </span>
            </motion.div>

            {/* Display H1 Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-black tracking-[-0.03em] text-[#FFFFFF] leading-[1.05]"
            >
              Masa Depan Kampus Digital Bermula Di Sini
            </motion.h1>

            {/* Subtext (strictly <= 20 words) */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-[#94A3B8] font-medium leading-relaxed my-6 max-w-xl"
            >
              Ekosistem digital berpusat mahasiswa POLISAS — daripada tadbir urus aktiviti hingga pasaran siswa dan navigasi pintar.
            </motion.p>

            {/* CTA Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <button
                onClick={() => navigate('/portal')}
                className="px-7 py-3.5 rounded-full bg-[#74C69D] hover:bg-[#84A98C] text-[#08140E] font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-2.5 shadow-[0_0_30px_rgba(116,198,157,0.35)] active:scale-[0.98] cursor-pointer"
              >
                <span>Masuk Portal Pelajar</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => scrollToSection('#ekosistem')}
                className="px-6 py-3.5 rounded-full bg-[#0E2218] border border-[#52796F]/30 text-[#84A98C] hover:text-white hover:border-[#74C69D] font-bold text-xs uppercase tracking-wider transition-all backdrop-blur-md active:scale-[0.98] cursor-pointer"
              >
                <span>Terokai Ekosistem</span>
              </button>
            </motion.div>
          </div>

          {/* Right Perspective Floating SuperApp Deck (5 cols) */}
          <div className="lg:col-span-5 w-full relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="relative w-full max-w-md mx-auto h-[440px] sm:h-[480px] perspective-[1000px]"
            >
              {/* Deck Card 3: PolyMaps 360 preview (Background Tilt) */}
              <div
                className={cn(
                  "absolute inset-x-0 top-0 h-[260px] rounded-3xl p-5 bg-[#0E2218]/90 border border-[#52796F]/20 shadow-xl transition-all duration-500",
                  "transform translate-y-0 scale-[0.88] opacity-60 hover:opacity-80"
                )}
                style={{ transform: 'rotateX(8deg) rotateY(-6deg) translateY(0px)' }}
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#52796F]/20 mb-3">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#74C69D]" />
                    <span className="text-xs font-bold text-white tracking-wide">PolyMaps 360</span>
                  </div>
                  <span className="text-[10px] text-[#84A98C] font-mono">Navigasi Langsung</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#08140E]/80 border border-[#52796F]/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-[#74C69D]" />
                    <div>
                      <p className="text-xs font-semibold text-white">Dewan Sri Mahkota</p>
                      <p className="text-[10px] text-[#84A98C]">Laluan Berbumbung Aktif</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#74C69D] bg-[#2D6A4F]/20 px-2 py-0.5 rounded-full">
                    360° View
                  </span>
                </div>
              </div>

              {/* Deck Card 2: PolyMart Hub preview (Middle Offset) */}
              <div
                className={cn(
                  "absolute inset-x-0 top-14 h-[270px] rounded-3xl p-5 bg-[#0E2218]/95 border border-[#52796F]/25 shadow-2xl transition-all duration-500",
                  "transform scale-[0.94] opacity-85 hover:opacity-100"
                )}
                style={{ transform: 'rotateX(5deg) rotateY(-3deg) translateY(24px)' }}
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#52796F]/20 mb-3">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#74C69D]" />
                    <span className="text-xs font-bold text-white tracking-wide">PolyMart Hub</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#74C69D] bg-[#2D6A4F]/20 px-2 py-0.5 rounded-md">
                    JPP Pay Sah
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#08140E]/90 border border-[#52796F]/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#84A98C] uppercase tracking-wider">
                      Barangan Siswa
                    </span>
                    <p className="text-xs font-bold text-white">Baju Rasmi JPP 2026</p>
                    <p className="text-sm font-black text-[#74C69D] font-mono mt-1">RM 39.00</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-[#84A98C]">Terjual</span>
                    <p className="text-xs font-bold text-white">142 Unit</p>
                  </div>
                </div>
              </div>

              {/* Deck Card 1: Portal Cockpit (Foreground Focus) */}
              <div
                className={cn(
                  "absolute inset-x-0 top-28 h-[290px] rounded-3xl p-6 bg-[#0E2218] border border-[#52796F]/30 shadow-[0_20px_50px_rgba(8,20,14,0.9)] transition-all duration-500",
                  "transform scale-100 opacity-100"
                )}
                style={{ transform: 'rotateX(0deg) translateY(48px)' }}
              >
                <div className="flex items-center justify-between pb-3.5 border-b border-[#52796F]/20 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#74C69D] animate-ping" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Portal Cockpit
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#74C69D] bg-[#2D6A4F]/30 px-2.5 py-1 rounded-full border border-[#74C69D]/30">
                    Sesi 2026/2027
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-2xl bg-[#08140E] border border-[#52796F]/20">
                    <span className="text-[10px] uppercase font-bold text-[#84A98C]">Merit Aktiviti</span>
                    <p className="text-2xl font-black text-white font-mono mt-0.5">185</p>
                    <span className="text-[10px] font-semibold text-[#74C69D]">Status Aktif</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#08140E] border border-[#52796F]/20">
                    <span className="text-[10px] uppercase font-bold text-[#84A98C]">Kertas Kerja</span>
                    <p className="text-2xl font-black text-white font-mono mt-0.5">100%</p>
                    <span className="text-[10px] font-semibold text-[#74C69D]">Digital Disahkan</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#08140E] border border-[#52796F]/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-[#74C69D]" />
                    <p className="text-xs font-semibold text-white/90 truncate">
                      Baucar FoodBank Fasa 2 Aktif
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-[#74C69D] bg-[#2D6A4F]/30 px-2 py-0.5 rounded-full">
                    Tebus
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Live Metrics Ticker Ribbon */}
      <div className="relative z-20 w-full mt-12 border-y border-[#52796F]/20 bg-[#0E2218]/80 backdrop-blur-md py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 divide-x-0 md:divide-x divide-[#52796F]/20">
            {[
              { val: '15,000+', label: 'Mahasiswa', sub: 'Akses Portal Rasmi' },
              { val: '120+', label: 'Kelab Aktif', sub: 'Tadbir Urus Digital' },
              { val: '12', label: 'Modul Bersepadu', sub: 'Satu Sistem Pintar' },
              { val: '100%', label: 'Digital & Telus', sub: 'Paperless Sepenuhnya' }
            ].map((metric, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex flex-col items-center md:items-start text-center md:text-left",
                  idx !== 0 && "md:pl-8"
                )}
              >
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                  {metric.val}
                </span>
                <span className="text-xs font-bold text-[#74C69D] uppercase tracking-wider mt-0.5">
                  {metric.label}
                </span>
                <span className="text-[11px] text-[#84A98C] font-medium hidden sm:inline">
                  {metric.sub}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Section 3: Interactive Showcase Tabs ---
export const InteractiveShowcase: React.FC = () => {
  type TabKey = 'semua' | 'kebajikan' | 'polymart' | 'akademik' | 'sukan';
  const [activeTab, setActiveTab] = useState<TabKey>('semua');
  const navigate = useNavigate();

  const tabs: { id: TabKey; label: string }[] = [
    { id: 'semua', label: 'Semua' },
    { id: 'kebajikan', label: 'Kebajikan' },
    { id: 'polymart', label: 'PolyMart' },
    { id: 'akademik', label: 'Akademik' },
    { id: 'sukan', label: 'Sukan & EMS' }
  ];

  return (
    <section id="ekosistem" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#08140E] relative z-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E2218] border border-[#52796F]/30 mb-4">
            <Layers className="w-3.5 h-3.5 text-[#74C69D]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#74C69D]">
              Ekosistem Bersepadu
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Antaramuka Berpusat Untuk Setiap Keperluan Siswa
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8] font-medium mt-4">
            Pilih kategori di bawah untuk meneroka pratonton komponen langsung yang dikuasakan oleh SuperApp POLISAS.
          </p>

          {/* Pill Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8 p-1.5 rounded-full bg-[#0E2218] border border-[#52796F]/30">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 sm:px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer",
                  activeTab === tab.id
                    ? "bg-[#74C69D] text-[#08140E] shadow-[0_0_15px_rgba(116,198,157,0.3)]"
                    : "text-[#84A98C] hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {activeTab === 'semua' && (
              <motion.div
                key="semua"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {/* Mini Card 1: Kebajikan */}
                <div
                  onClick={() => navigate('/kebajikan')}
                  className="p-6 rounded-3xl bg-[#0E2218] border border-[#52796F]/25 hover:border-[#74C69D]/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-[#2D6A4F]/25 flex items-center justify-center text-[#74C69D] mb-4">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#74C69D]">
                      Kebajikan
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">FoodBank & Aduan</h3>
                    <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                      Kupon makanan percuma dan saluran bantuan kecemasan siswa terpantas.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#52796F]/20 flex items-center justify-between text-xs font-bold text-[#74C69D]">
                    <span>Tebus Kupon</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Mini Card 2: PolyMart */}
                <div
                  onClick={() => navigate('/polymart')}
                  className="p-6 rounded-3xl bg-[#0E2218] border border-[#52796F]/25 hover:border-[#74C69D]/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-[#2D6A4F]/25 flex items-center justify-center text-[#74C69D] mb-4">
                      <Store className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#74C69D]">
                      PolyMart
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">Pasaran Siswa</h3>
                    <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                      Jual beli produk pelajar dan servis cetakan selamat melalui JPP Pay.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#52796F]/20 flex items-center justify-between text-xs font-bold text-[#74C69D]">
                    <span>Buka Katalog</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Mini Card 3: Akademik */}
                <div
                  onClick={() => navigate('/akademik')}
                  className="p-6 rounded-3xl bg-[#0E2218] border border-[#52796F]/25 hover:border-[#74C69D]/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-[#2D6A4F]/25 flex items-center justify-center text-[#74C69D] mb-4">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#74C69D]">
                      Akademik
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">Merit & Keputusan</h3>
                    <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                      Penjejakan CGPA dan pengesahan imbasan kod QR merit program secara langsung.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#52796F]/20 flex items-center justify-between text-xs font-bold text-[#74C69D]">
                    <span>Semak Rekod</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Mini Card 4: Sukan & EMS */}
                <div
                  onClick={() => navigate('/portal')}
                  className="p-6 rounded-3xl bg-[#0E2218] border border-[#52796F]/25 hover:border-[#74C69D]/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-[#2D6A4F]/25 flex items-center justify-center text-[#74C69D] mb-4">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#74C69D]">
                      Sukan & EMS
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">Kejohanan Kampus</h3>
                    <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
                      Jadual perlawanan SUPSAS, skor langsung, dan pengurusan pasukan antara jabatan.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#52796F]/20 flex items-center justify-between text-xs font-bold text-[#74C69D]">
                    <span>Lihat Jadual</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'kebajikan' && (
              <motion.div
                key="kebajikan"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0E2218] border border-[#52796F]/25 rounded-3xl p-6 sm:p-10"
              >
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#74C69D]">
                    Modul Kebajikan Pelajar
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    Bantuan Makanan FoodBank & Aduan Fasiliti Pantas
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    Sistem baucar makanan berkupon QR memberi jaminan tiada mahasiswa kelaparan di POLISAS. Saluran aduan terus dipantau Exco Kebajikan dengan masa tindak balas 24 jam.
                  </p>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 text-xs text-white">
                      <CheckCircle2 className="w-4 h-4 text-[#74C69D]" />
                      <span>Kupon digital QR ditebus terus di Kafeteria Pusat & Asrama</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white">
                      <CheckCircle2 className="w-4 h-4 text-[#74C69D]" />
                      <span>Bantuan kecemasan kewangan dan logistik kebajikan</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/kebajikan')}
                    className="mt-4 px-6 py-3 rounded-full bg-[#74C69D] text-[#08140E] text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                  >
                    <span>Akses e-Kebajikan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="lg:col-span-6">
                  {/* Voucher Preview Card */}
                  <div className="p-6 rounded-2xl bg-[#08140E] border border-[#52796F]/30 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#52796F]/20">
                      <div className="flex items-center gap-2">
                        <Coffee className="w-4 h-4 text-[#74C69D]" />
                        <span className="text-xs font-bold text-white">Kupon FoodBank Siswa</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#74C69D] bg-[#2D6A4F]/25 px-2 py-0.5 rounded-full">
                        Aktif
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#84A98C] uppercase">Nilai Bantuan</span>
                        <p className="text-2xl font-black text-white font-mono">RM 15.00</p>
                      </div>
                      <div className="w-16 h-16 rounded-xl bg-white p-1.5 flex items-center justify-center">
                        <QrCode className="w-full h-full text-black" />
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0E2218] border border-[#52796F]/20 text-[11px] text-[#94A3B8]">
                      Tebus di: Kafeteria Kolej Kediaman Siswa sebelum 10:00 Malam
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'polymart' && (
              <motion.div
                key="polymart"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0E2218] border border-[#52796F]/25 rounded-3xl p-6 sm:p-10"
              >
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#74C69D]">
                    Pasaran Komuniti Mahasiswa
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    PolyMart: Platform Niaga Siswa dengan JPP Pay
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    Sokong usahawan mahasiswa tempatan. Daripada barangan rasmi fakulti dan pakaian korporat hingga servis baik pulih komputer dan makanan sedia santap.
                  </p>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 text-xs text-white">
                      <CheckCircle2 className="w-4 h-4 text-[#74C69D]" />
                      <span>Sistem POS digital khusus untuk vendor pelajar berdaftar</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white">
                      <CheckCircle2 className="w-4 h-4 text-[#74C69D]" />
                      <span>Pengecasan transaksi sifar caj untuk memperkasa ekonomi siswa</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/polymart')}
                    className="mt-4 px-6 py-3 rounded-full bg-[#74C69D] text-[#08140E] text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                  >
                    <span>Masuk PolyMart</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[#08140E] border border-[#52796F]/25 space-y-2">
                    <span className="text-[10px] font-bold text-[#74C69D] uppercase">Barangan Rasmi</span>
                    <p className="text-xs font-bold text-white truncate">Lanyard & Kad Matrik JPP</p>
                    <p className="text-lg font-black text-[#74C69D] font-mono">RM 12.00</p>
                    <span className="text-[10px] text-[#84A98C] block">Stok Sedia Ada (POLISAS)</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#08140E] border border-[#52796F]/25 space-y-2">
                    <span className="text-[10px] font-bold text-[#74C69D] uppercase">Servis Pelajar</span>
                    <p className="text-xs font-bold text-white truncate">Cetak Kertas Kerja / Laporan</p>
                    <p className="text-lg font-black text-[#74C69D] font-mono">RM 0.10 / ms</p>
                    <span className="text-[10px] text-[#84A98C] block">Siap 15 Minit (KAMSIS)</span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'akademik' && (
              <motion.div
                key="akademik"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0E2218] border border-[#52796F]/25 rounded-3xl p-6 sm:p-10"
              >
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#74C69D]">
                    Kecemerlangan Holistik
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    e-Akademik & Pengesahan Merit QR Masa Nyata
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    Pantau unjuran CGPA dan merit penglibatan kokurikulum secara berpusat. Setiap kehadiran program diiktiraf terus ke dalam rekod transkrip aktiviti siswa.
                  </p>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 text-xs text-white">
                      <CheckCircle2 className="w-4 h-4 text-[#74C69D]" />
                      <span>Imbasan QR automatik mengesahkan mata merit dalam 1 saat</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white">
                      <CheckCircle2 className="w-4 h-4 text-[#74C69D]" />
                      <span>Kalkulator HPNM & peringatan peperiksaan berjadual</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/akademik')}
                    className="mt-4 px-6 py-3 rounded-full bg-[#74C69D] text-[#08140E] text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                  >
                    <span>Semak e-Akademik</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="lg:col-span-6">
                  <div className="p-6 rounded-2xl bg-[#08140E] border border-[#52796F]/30 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#52796F]/20">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-[#74C69D]" />
                        <span className="text-xs font-bold text-white">Kad Prestasi Siswa</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#74C69D]">HPNM Terkini: 3.82</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-[#0E2218] border border-[#52796F]/20">
                        <span className="text-[10px] text-[#84A98C]">Mata Merit Sesi</span>
                        <p className="text-xl font-black text-white font-mono mt-0.5">+45 Pts</p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0E2218] border border-[#52796F]/20">
                        <span className="text-[10px] text-[#84A98C]">Gred Purata (HPA)</span>
                        <p className="text-xl font-black text-[#74C69D] font-mono mt-0.5">3.90</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0E2218] border border-[#52796F]/20 flex items-center justify-between text-xs">
                      <span className="text-white">Program Seterusnya: Karnival Inovasi</span>
                      <span className="text-[#74C69D] font-bold font-mono">+10 Pts</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'sukan' && (
              <motion.div
                key="sukan"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0E2218] border border-[#52796F]/25 rounded-3xl p-6 sm:p-10"
              >
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#74C69D]">
                    Sistem Pengurusan Sukan (EMS)
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    Kejohanan Sukan Kampus & Papan Skor SUPSAS
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    Pengurusan pusingan kalah mati, pendaftaran atlet antara jabatan, dan penstriman keputusan masa nyata untuk seluruh warga sukan POLISAS.
                  </p>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 text-xs text-white">
                      <CheckCircle2 className="w-4 h-4 text-[#74C69D]" />
                      <span>Penjanaan braket automatik bagi futsal, bola tampar, dan e-sukan</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white">
                      <CheckCircle2 className="w-4 h-4 text-[#74C69D]" />
                      <span>Carta kedudukan pingat jabatan dikemas kini serta-merta</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/portal')}
                    className="mt-4 px-6 py-3 rounded-full bg-[#74C69D] text-[#08140E] text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                  >
                    <span>Lihat Kejohanan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="lg:col-span-6">
                  <div className="p-6 rounded-2xl bg-[#08140E] border border-[#52796F]/30 space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-[#52796F]/20">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-[#74C69D]" />
                        <span className="text-xs font-bold text-white">Braket SUPSAS Futsal</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#74C69D] bg-[#2D6A4F]/25 px-2 py-0.5 rounded-full">
                        Separuh Akhir
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0E2218] border border-[#52796F]/20 flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Jabatan Teknologi Maklumat</span>
                      <span className="font-mono font-black text-[#74C69D]">3 - 1</span>
                      <span className="text-[#84A98C]">Jabatan Kejuruteraan Mekanikal</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0E2218] border border-[#52796F]/20 flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Jabatan Perdagangan</span>
                      <span className="font-mono font-black text-amber-400">Live 1 - 1</span>
                      <span className="text-[#84A98C]">Jabatan Kejuruteraan Awam</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

// --- Section 4: Platform Capabilities Bento Grid ---
export const PlatformCapabilitiesBento: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="keupayaan" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#08140E] relative z-20">
      <div className="max-w-7xl mx-auto">
        {/* Editorial Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E2218] border border-[#52796F]/30">
              <Zap className="w-3.5 h-3.5 text-[#74C69D]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#74C69D]">
                Keupayaan Platform
              </span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Empat Tiang Teras SuperApp POLISAS
            </h2>
          </div>
          <p className="max-w-md text-sm text-[#94A3B8] font-medium leading-relaxed">
            Struktur teknologi bersepadu yang dirangka untuk memacu kecekapan, keusahawanan siswa, kebajikan berkesan, dan kebolehcapaian kampus.
          </p>
        </div>

        {/* 4 Asymmetric Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          {/* Card 1: Tadbir Urus Kelab (e-Aktiviti) (7 cols) */}
          <div
            onClick={() => navigate('/portal')}
            className="lg:col-span-7 rounded-3xl p-8 sm:p-10 bg-[#0E2218] border border-[#52796F]/25 hover:border-[#74C69D]/40 transition-all cursor-pointer group flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#2D6A4F]/25 border border-[#52796F]/30 flex items-center justify-center text-[#74C69D] group-hover:scale-105 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="w-10 h-10 rounded-full border border-[#52796F]/20 flex items-center justify-center bg-[#08140E] group-hover:bg-[#2D6A4F]/20 transition-colors">
                  <ArrowUpRight className="w-4 h-4 text-[#84A98C] group-hover:text-white transition-colors" />
                </div>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#74C69D]">
                Tadbir Urus Kelab (e-Aktiviti)
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Automasi kertas kerja dan pelaporan digital kelab.
              </h3>
              <p className="text-sm text-[#94A3B8] mt-3 leading-relaxed">
                Urus permohonan kertas kerja tanpa mencetak sehelai kertas pun. Sistem penjejakan kelulusan digital menghubungkan penasihat, JPP, dan pengurusan HEP secara telus.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-[#52796F]/20 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] text-[#84A98C] uppercase font-bold">Kelab Berdaftar</span>
                <p className="text-lg font-black text-white font-mono mt-0.5">120+ Kelab</p>
              </div>
              <div>
                <span className="text-[10px] text-[#84A98C] uppercase font-bold">Kadar Kelulusan</span>
                <p className="text-lg font-black text-[#74C69D] font-mono mt-0.5">98.4% Digital</p>
              </div>
              <div className="hidden sm:block">
                <span className="text-[10px] text-[#84A98C] uppercase font-bold">Masa Tindak Balas</span>
                <p className="text-lg font-black text-white font-mono mt-0.5">&lt; 48 Jam</p>
              </div>
            </div>
          </div>

          {/* Card 2: Pasaran Siswa (PolyMart) (5 cols) */}
          <div
            onClick={() => navigate('/polymart')}
            className="lg:col-span-5 rounded-3xl p-8 sm:p-10 bg-[#0E2218] border border-[#52796F]/25 hover:border-[#74C69D]/40 transition-all cursor-pointer group flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#2D6A4F]/25 border border-[#52796F]/30 flex items-center justify-center text-[#74C69D] group-hover:scale-105 transition-transform">
                  <Store className="w-6 h-6" />
                </div>
                <div className="w-10 h-10 rounded-full border border-[#52796F]/20 flex items-center justify-center bg-[#08140E] group-hover:bg-[#2D6A4F]/20 transition-colors">
                  <ArrowUpRight className="w-4 h-4 text-[#84A98C] group-hover:text-white transition-colors" />
                </div>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#74C69D]">
                Pasaran Siswa (PolyMart)
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Ekosistem jual beli barangan dan servis pelajar dengan JPP Pay.
              </h3>
              <p className="text-sm text-[#94A3B8] mt-3 leading-relaxed">
                Pusat perniagaan khusus buat usahawan siswa POLISAS menjual produk kraf, pakaian rasmi, buku rujukan, dan servis dengan jaminan transaksi selamat.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-[#52796F]/20 flex items-center justify-between">
              <span className="text-xs font-bold text-[#74C69D] bg-[#2D6A4F]/20 px-3 py-1 rounded-full border border-[#74C69D]/30">
                Pendaftaran Percuma
              </span>
              <span className="text-xs text-[#84A98C]">JPP Pay Terbina</span>
            </div>
          </div>

          {/* Card 3: Bantuan Kebajikan (e-Kebajikan & FoodBank) (5 cols) */}
          <div
            onClick={() => navigate('/kebajikan')}
            className="lg:col-span-5 rounded-3xl p-8 sm:p-10 bg-[#0E2218] border border-[#52796F]/25 hover:border-[#74C69D]/40 transition-all cursor-pointer group flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#2D6A4F]/25 border border-[#52796F]/30 flex items-center justify-center text-[#74C69D] group-hover:scale-105 transition-transform">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div className="w-10 h-10 rounded-full border border-[#52796F]/20 flex items-center justify-center bg-[#08140E] group-hover:bg-[#2D6A4F]/20 transition-colors">
                  <ArrowUpRight className="w-4 h-4 text-[#84A98C] group-hover:text-white transition-colors" />
                </div>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#74C69D]">
                Bantuan Kebajikan (e-Kebajikan & FoodBank)
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Permohonan bantuan kecemasan dan kupon makanan digital.
              </h3>
              <p className="text-sm text-[#94A3B8] mt-3 leading-relaxed">
                Saluran bantuan kebajikan segera untuk meringankan beban sara hidup siswa serta aduan kerosakan fasiliti kamsis yang telus dan pantas.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-[#52796F]/20 flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono">1,500+ Kupon Ditebus</span>
              <span className="text-xs text-[#74C69D]">Aduan 24 Jam Selesai</span>
            </div>
          </div>

          {/* Card 4: Kampus Pintar & Peta (PolyMaps 360°) (7 cols) */}
          <div
            onClick={() => navigate('/polymaps')}
            className="lg:col-span-7 rounded-3xl p-8 sm:p-10 bg-[#0E2218] border border-[#52796F]/25 hover:border-[#74C69D]/40 transition-all cursor-pointer group flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#2D6A4F]/25 border border-[#52796F]/30 flex items-center justify-center text-[#74C69D] group-hover:scale-105 transition-transform">
                  <Compass className="w-6 h-6" />
                </div>
                <div className="w-10 h-10 rounded-full border border-[#52796F]/20 flex items-center justify-center bg-[#08140E] group-hover:bg-[#2D6A4F]/20 transition-colors">
                  <ArrowUpRight className="w-4 h-4 text-[#84A98C] group-hover:text-white transition-colors" />
                </div>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#74C69D]">
                Kampus Pintar & Peta (PolyMaps 360°)
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                Navigasi pejalan kaki berbumbung dan lawatan 360° makmal serta dewan.
              </h3>
              <p className="text-sm text-[#94A3B8] mt-3 leading-relaxed">
                Cari dewan kuliah, makmal komputer, atau surau dengan mudah. PolyMaps memetakan laluan pejalan kaki berbumbung khas sewaktu hujan dan pemandangan interaktif 360°.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-[#52796F]/20 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] text-[#84A98C] uppercase font-bold">Laluan Terbina</span>
                <p className="text-lg font-black text-white font-mono mt-0.5">38 Lokasi</p>
              </div>
              <div>
                <span className="text-[10px] text-[#84A98C] uppercase font-bold">Lawatan Maya</span>
                <p className="text-lg font-black text-[#74C69D] font-mono mt-0.5">360° Panorama</p>
              </div>
              <div className="hidden sm:block">
                <span className="text-[10px] text-[#84A98C] uppercase font-bold">Mod Cuaca</span>
                <p className="text-lg font-black text-white font-mono mt-0.5">Laluan Teduh</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Section 5: Nexus AI Spotlight ---
export const NexusAiSpotlight: React.FC = () => {
  return (
    <section id="nexus" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#08140E] relative z-20 border-t border-[#52796F]/20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E2218] border border-[#52796F]/30 mb-4">
            <Bot className="w-3.5 h-3.5 text-[#74C69D]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#74C69D]">
              Enjin Kepintaran Buatan Nexus
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Nexus AI: Kuasa Kepintaran Berpusat
          </h2>
          <p className="text-sm sm:text-base text-[#94A3B8] font-medium mt-4">
            Menggabungkan model bahasa canggih bagi membantu exco menyemak pematuhan dokumen rasmi dan menjawab sebarang persoalan mahasiswa secara serta-merta.
          </p>
        </div>

        {/* Dual Split Spotlight Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Card: AI Semakan Kertas Kerja */}
          <div className="p-8 sm:p-10 rounded-3xl bg-[#0E2218] border border-[#52796F]/30 relative overflow-hidden flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#52796F]/20">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-5 h-5 text-[#74C69D]" />
                  <h3 className="text-lg font-bold text-white">AI Semakan Kertas Kerja</h3>
                </div>
                <span className="text-[10px] font-mono text-[#74C69D] bg-[#2D6A4F]/25 px-2.5 py-1 rounded-full border border-[#74C69D]/30">
                  Automasi HEP 2026
                </span>
              </div>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                Enjin pengesahan automatik yang menganalisis format kertas kerja, keselarasan belanjawan, dan kelayakan peruntukan sebelum dihantar ke meja penasihat kelab.
              </p>

              {/* Live Preview Box */}
              <div className="p-4 rounded-2xl bg-[#08140E] border border-[#52796F]/20 space-y-3 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-semibold truncate">
                    Kertas Kerja: Bengkel AI Siswa 2026
                  </span>
                  <span className="text-[#74C69D] font-mono font-bold">Skor: 98%</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs text-[#74C69D]">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Format 8 Seksyen Wajib HEP dipatuhi sepenuhnya.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#74C69D]">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Aritmetik perbelanjaan RM 2,450.00 seimbang tanpa ralat.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#52796F]/20 flex items-center justify-between text-xs text-[#84A98C]">
              <span>Masa Pemprosesan: 0.8s</span>
              <span className="font-semibold text-white">Kelulusan Lebih Cepat</span>
            </div>
          </div>

          {/* Right Card: Pembantu Pelajar Pintar */}
          <div className="p-8 sm:p-10 rounded-3xl bg-[#0E2218] border border-[#52796F]/30 relative overflow-hidden flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#52796F]/20">
                <div className="flex items-center gap-2.5">
                  <Bot className="w-5 h-5 text-[#74C69D]" />
                  <h3 className="text-lg font-bold text-white">Pembantu Pelajar Pintar</h3>
                </div>
                <span className="text-[10px] font-mono text-[#74C69D] bg-[#2D6A4F]/25 px-2.5 py-1 rounded-full border border-[#74C69D]/30">
                  Respon 24/7
                </span>
              </div>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                Rakan digital mahasiswa yang sedia menjawab sebarang soalan mengenai peraturan kamsis, pengiraan merit kokurikulum, dan direktori fasiliti kampus.
              </p>

              {/* Chat Demo Box */}
              <div className="p-4 rounded-2xl bg-[#08140E] border border-[#52796F]/20 space-y-3 mt-4">
                <div className="p-2.5 rounded-xl bg-[#0E2218] text-xs text-white/90">
                  <span className="text-[10px] text-[#84A98C] block">Soalan Siswa:</span>
                  &quot;Berapa mata merit minimum untuk kekal di asrama kamsis semester depan?&quot;
                </div>
                <div className="p-2.5 rounded-xl bg-[#2D6A4F]/20 border border-[#74C69D]/20 text-xs text-[#74C69D]">
                  <span className="text-[10px] text-[#74C69D]/70 block font-bold">Nexus AI:</span>
                  Syarat minimum kamsis ialah 60 mata merit aktiviti atau penglibatan jawatankuasa kelab yang disahkan.
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#52796F]/20 flex items-center justify-between text-xs text-[#84A98C]">
              <span>Ketersediaan: 100% Pantas</span>
              <span className="font-semibold text-white">Bahasa Melayu & Inggeris</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Section 6: Interactive Quick Search Bar ---
export const InteractiveSearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/portal?search=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/portal');
    }
  };

  const chips = ['DSK', 'Dewan Sri Mahkota', 'PolyMart', 'FoodBank', 'Bilik Seminar', 'Merit Aktiviti'];

  return (
    <section id="carian" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-[#08140E] relative z-20">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E2218] border border-[#52796F]/30 mb-4">
          <Search className="w-3.5 h-3.5 text-[#74C69D]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#74C69D]">
            Carian Pantas Kampus
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
          Cari Apa Sahaja Dalam Ekosistem POLISAS
        </h2>
        <p className="text-sm text-[#94A3B8] font-medium mt-3 mb-8">
          Akses pantas ke lokasi bangunan, semakan kod kursus, persatuan, mahupun maklumat bantuan pelajar.
        </p>

        {/* Editorial Search Form */}
        <form onSubmit={handleSearch} className="relative w-full max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-5 w-5 h-5 text-[#84A98C] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kod kursus, dewan, makmal, atau kelab (Cth: DSK, Dewan Sri Mahkota)..."
              className="w-full pl-14 pr-32 py-4 rounded-full bg-[#0E2218] border border-[#52796F]/30 text-white placeholder-[#84A98C]/60 text-xs sm:text-sm focus:outline-none focus:border-[#74C69D] focus:ring-2 focus:ring-[#74C69D]/20 transition-all shadow-xl"
            />
            <button
              type="submit"
              className="absolute right-2.5 px-5 py-2.5 rounded-full bg-[#74C69D] hover:bg-[#84A98C] text-[#08140E] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Cari</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Clickable Quick Filter Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <span className="text-xs text-[#84A98C] mr-1">Cadangan:</span>
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setQuery(chip);
                navigate(`/portal?search=${encodeURIComponent(chip)}`);
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#0E2218] border border-[#52796F]/20 text-[#84A98C] hover:text-white hover:border-[#74C69D] text-xs font-medium transition-all cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Section 7: Curated Campus Gallery ---
export const CuratedCampusGallery: React.FC = () => {
  const galleryItems = [
    {
      title: 'Karnival Inovasi & Keusahawanan',
      category: 'PolyMart Expo',
      desc: 'Pameran 60+ gerai siswa POLISAS menggunakan sistem transaksi bersepadu JPP Pay.',
      tag: 'Ekonomi Kampus'
    },
    {
      title: 'Kejohanan Sukan Tahunan (SUPSAS)',
      category: 'EMS Sukan',
      desc: 'Pertandingan 14 acara sukan melibatkan 1,200 atlet antara jabatan akademik.',
      tag: 'Kecergasan'
    },
    {
      title: 'Bengkel Kepimpinan & Tadbir Urus',
      category: 'e-Aktiviti',
      desc: 'Latihan pengurusan kertas kerja digital dan audit kewangan kelab bersama Exco JPP.',
      tag: 'Kepimpinan'
    },
    {
      title: 'Agihan Bantuan FoodBank Siswa',
      category: 'e-Kebajikan',
      desc: 'Inisiatif berkala menyalurkan kupon makanan bernutrisi kepada mahasiswa berkeperluan.',
      tag: 'Prihatin'
    }
  ];

  return (
    <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#08140E] relative z-20 border-t border-[#52796F]/20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E2218] border border-[#52796F]/30">
              <Sparkles className="w-3.5 h-3.5 text-[#74C69D]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#74C69D]">
                Galeri Ekosistem
              </span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Rentak Kehidupan Dinamik Mahasiswa
            </h2>
          </div>
          <p className="max-w-md text-sm text-[#94A3B8] font-medium leading-relaxed">
            Sorotan lensa inisiatif kepimpinan, kecemerlangan sukan, dan jaringan komuniti yang menggerakkan kampus POLISAS.
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {galleryItems.map((item, idx) => (
            <div
              key={idx}
              className="rounded-3xl p-6 bg-[#0E2218] border border-[#52796F]/25 hover:border-[#74C69D]/40 transition-all flex flex-col justify-between group shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono text-[#74C69D] bg-[#2D6A4F]/25 px-2.5 py-0.5 rounded-full border border-[#74C69D]/30">
                    {item.tag}
                  </span>
                  <span className="text-xs text-[#84A98C] font-semibold">{item.category}</span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-[#74C69D] transition-colors leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-[#94A3B8] mt-3 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#52796F]/20 flex items-center justify-between text-[11px] text-[#84A98C]">
                <span>POLISAS Kuatan</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#74C69D] group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Section 8: Hairline FAQ Accordion ---
export const FaqAccordion: React.FC = () => {
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
    <section id="faq" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#08140E] relative z-20 border-t border-[#52796F]/20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E2218] border border-[#52796F]/30 mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-[#74C69D]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#74C69D]">
              Soalan Lazim
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Segala Jawapan Yang Anda Perlukan
          </h2>
          <p className="text-sm text-[#94A3B8] font-medium mt-3">
            Ketahui lebih lanjut mengenai operasi sistem, pendaftaran modul, dan hak akses anda.
          </p>
        </div>

        {/* Minimalist Hairline-Divided Disclosure Rows */}
        <div className="divide-y divide-[#52796F]/25 border-y border-[#52796F]/25">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="py-5 sm:py-6">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between text-left gap-4 focus:outline-none group cursor-pointer"
                >
                  <span className="text-base sm:text-lg font-bold text-white group-hover:text-[#74C69D] transition-colors">
                    {faq.q}
                  </span>
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full border border-[#52796F]/30 flex items-center justify-center shrink-0 transition-transform duration-300",
                      isOpen ? "bg-[#74C69D] text-[#08140E] rotate-180" : "bg-[#0E2218] text-[#84A98C]"
                    )}
                  >
                    <ChevronDown className="w-4 h-4" />
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
                      <p className="text-sm text-[#94A3B8] leading-relaxed pt-3 pr-8">
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
    </section>
  );
};

// --- Section 9: Particle Halo / Sphere Final CTA ---
export const FinalSphereCta: React.FC<{ isLowEnd: boolean }> = ({ isLowEnd }) => {
  const navigate = useNavigate();

  return (
    <section className="py-24 sm:py-36 px-4 sm:px-6 lg:px-8 bg-[#08140E] relative z-20 overflow-hidden flex justify-center">
      {/* Halo / Sphere Ambient Rings */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className={cn(
            "w-[350px] sm:w-[550px] aspect-square rounded-full border border-[#74C69D]/20 bg-[#2D6A4F]/10 blur-[80px]",
            isLowEnd && "blur-[40px] opacity-30"
          )}
        />
        <div
          className={cn(
            "absolute w-[280px] sm:w-[480px] aspect-square rounded-full border border-[#52796F]/25",
            !isLowEnd && "animate-[spin_40s_linear_infinite]"
          )}
        />
        <div
          className={cn(
            "absolute w-[200px] sm:w-[380px] aspect-square rounded-full border border-[#74C69D]/15",
            !isLowEnd && "animate-[spin_25s_linear_infinite_reverse]"
          )}
        />
      </div>

      <div className="relative z-10 w-full max-w-4xl text-center p-8 sm:p-16 rounded-[2.5rem] bg-[#0E2218]/90 border border-[#52796F]/30 backdrop-blur-xl shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#08140E] border border-[#52796F]/30 mb-6">
          <span className="w-2 h-2 rounded-full bg-[#74C69D] animate-ping" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#74C69D]">
            Sesi 2026/2027 Dibuka
          </span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          Sedia Untuk Mula? Sertai ribuan mahasiswa POLISAS hari ini.
        </h2>

        <p className="text-sm sm:text-base text-[#94A3B8] font-medium max-w-xl mx-auto my-6 leading-relaxed">
          Urus kelab anda, tebus baucar kebajikan, nikmati pasaran PolyMart, dan akses segala kemudahan kampus dalam satu ekosistem moden.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => navigate('/portal')}
            className="px-8 py-4 rounded-full bg-[#74C69D] hover:bg-[#84A98C] text-[#08140E] font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-3 shadow-[0_0_35px_rgba(116,198,157,0.4)] active:scale-[0.98] cursor-pointer"
          >
            <span>Masuk Portal Pelajar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

// --- Section 10: Editorial Clean Footer ---
export const EditorialFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-[#08140E] border-t border-[#52796F]/20 pt-16 pb-12 px-4 sm:px-6 lg:px-8 relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12 pb-16">
          {/* Brand Info (4 cols) */}
          <div className="col-span-2 md:col-span-4 space-y-4">
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#0E2218] border border-[#52796F]/30 p-1.5 flex items-center justify-center">
                <img src="/jpp-logo.png" alt="JPP Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-tight text-white text-base leading-none">
                  JPP POLISAS
                </span>
                <span className="text-[10px] text-[#84A98C] mt-0.5">Sistem Kampus Pintar</span>
              </div>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed max-w-sm">
              Ekosistem Digital Bersepadu Mahasiswa POLISAS. Memacu kecemerlangan kepimpinan, automasi kelab, kebajikan telus, dan ekonomi siswa berdaya maju.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0E2218] border border-[#52796F]/20 text-[10px] text-[#74C69D]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#74C69D] animate-pulse" />
              <span>Sistem Aktif 99.98% Uptime</span>
            </div>
          </div>

          {/* Col 1: Ekosistem (2 cols) */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ekosistem</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => navigate('/portal')}
                  className="text-[#94A3B8] hover:text-[#74C69D] transition-colors cursor-pointer text-left"
                >
                  Portal Pelajar
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/polymart')}
                  className="text-[#94A3B8] hover:text-[#74C69D] transition-colors cursor-pointer text-left"
                >
                  PolyMart Siswa
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/polymaps')}
                  className="text-[#94A3B8] hover:text-[#74C69D] transition-colors cursor-pointer text-left"
                >
                  PolyMaps 360°
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/akademik')}
                  className="text-[#94A3B8] hover:text-[#74C69D] transition-colors cursor-pointer text-left"
                >
                  Modul e-Akademik
                </button>
              </li>
            </ul>
          </div>

          {/* Col 2: Servis Pelajar (2 cols) */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Servis Pelajar</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => navigate('/kebajikan')}
                  className="text-[#94A3B8] hover:text-[#74C69D] transition-colors cursor-pointer text-left"
                >
                  e-Kebajikan & Aduan
                </button>
              </li>
              <li>
                <span className="text-[#94A3B8]/70">Baucar FoodBank</span>
              </li>
              <li>
                <span className="text-[#94A3B8]/70">PolyRider Kampus</span>
              </li>
              <li>
                <span className="text-[#94A3B8]/70">Sistem Sukan (EMS)</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Pautan Rasmi (2 cols) */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Pautan Rasmi</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://polisas.mypoly.edu.my"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#94A3B8] hover:text-[#74C69D] transition-colors inline-flex items-center gap-1"
                >
                  <span>Portal POLISAS</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <span className="text-[#94A3B8]/70">CIDOS e-Learning</span>
              </li>
              <li>
                <span className="text-[#94A3B8]/70">Hal Ehwal Pelajar</span>
              </li>
              <li>
                <span className="text-[#94A3B8]/70">Majlis Sukan POLISAS</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Bantuan & Hubungi (2 cols) */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Bantuan & Hubungi</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => scrollToSection('#faq')}
                  className="text-[#94A3B8] hover:text-[#74C69D] transition-colors cursor-pointer text-left"
                >
                  Soalan Lazim (FAQ)
                </button>
              </li>
              <li>
                <span className="text-[#94A3B8]/70">Meja Bantuan Exco</span>
              </li>
              <li>
                <span className="text-[#94A3B8]/70">Panduan Kertas Kerja</span>
              </li>
              <li>
                <span className="text-[#94A3B8]/70">Dasar Privasi</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Disclaimer */}
        <div className="pt-8 border-t border-[#52796F]/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#84A98C]">
          <p>© 2026 Hak Cipta Terpelihara JPP POLISAS · Politeknik Sultan Haji Ahmad Shah.</p>
          <div className="flex items-center gap-6">
            <span>Semambu, Kuantan, Pahang</span>
            <span>Versi 3.0 Flagship</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

// --- Main LandingPage Component ---
export function LandingPage() {
  const { isLowPerf } = useDevicePerformance();
  const isLowEnd = isLowPerf;

  return (
    <div className="bg-[#08140E] min-h-screen text-white font-sans selection:bg-[#74C69D]/30 selection:text-white overflow-x-hidden">
      {/* Section 1: Floating Glassmorphic Pill Navbar */}
      <Navbar />

      <main>
        {/* Section 2: Asymmetric Hero Section */}
        <Hero isLowEnd={isLowEnd} />

        {/* Section 3: Interactive Showcase Tabs */}
        <InteractiveShowcase />

        {/* Section 4: Platform Capabilities Bento Grid */}
        <PlatformCapabilitiesBento />

        {/* Section 5: Nexus AI Spotlight */}
        <NexusAiSpotlight />

        {/* Section 6: Interactive Quick Search Bar */}
        <InteractiveSearchBar />

        {/* Section 7: Curated Campus Gallery */}
        <CuratedCampusGallery />

        {/* Section 8: Hairline FAQ Accordion */}
        <FaqAccordion />

        {/* Section 9: Particle Halo / Sphere Final CTA */}
        <FinalSphereCta isLowEnd={isLowEnd} />
      </main>

      {/* Section 10: Editorial Clean Footer */}
      <EditorialFooter />
    </div>
  );
}

export default LandingPage;
