import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionTemplate, useMotionValue } from 'framer-motion';
import {
  ArrowRight, Shield, Zap, Users,
  BarChart3, GraduationCap,
  BrainCircuit, ArrowUpRight,
  Menu, X, BookOpen, Activity, PlayCircle, FileText, CheckCircle,
  ShoppingCart, HeartHandshake
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// --- Types & Config ---
const MAROON = '#831010';

const MODULES = [
  {
    id: 'ekpp',
    title: 'e-Aktiviti',
    subtitle: 'Nadi Organisasi',
    desc: 'Sistem tadbir urus kelab dan persatuan yang telus. Automasi kertas kerja dan pelaporan bulanan secara digital.',
    icon: Shield,
    color: '#831010',
    path: '/portal',
    stats: ['120+ Kelab Aktif', '98% Kelulusan Digital'],
    preview: (
      <div className="flex flex-col gap-2 p-3.5 h-full justify-center">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-white/90">Kertas Kerja DSK</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Diluluskan</span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-bold text-white/90">Bengkel AI Siswa</span>
          </div>
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Semakan</span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-bold text-white/90">Minit AGM Kelab</span>
          </div>
          <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Disahkan</span>
        </div>
      </div>
    )
  },
  {
    id: 'keusahawanan',
    title: 'e-Keusahawanan',
    subtitle: 'Ekonomi Pintar',
    desc: 'Memperkasakan usahawan siswa dengan sistem POS digital terpadu dan analitik jualan masa nyata.',
    icon: BarChart3,
    color: '#059669',
    path: '/keusahawanan',
    stats: ['RM 45k+ Jualan', '85+ Vendor Aktif'],
    preview: (
      <div className="flex flex-col justify-center h-full p-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Jualan Hari Ini</span>
            <p className="text-lg font-black text-white font-mono">RM 3,420.50</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-white/40">Transaksi</span>
            <p className="text-xs font-bold text-white/80">142 Pesanan</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="text-[9px] px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20">POS Pintar</span>
          <span className="text-[9px] px-2.5 py-1 rounded-md bg-white/[0.04] text-white/70 font-semibold border border-white/10">Katalog Digital</span>
        </div>
      </div>
    )
  },
  {
    id: 'akademik',
    title: 'e-Akademik',
    subtitle: 'Kecemerlangan Holistik',
    desc: 'Semakan maklumat dan pengurusan rekod merit pelajar secara bersepadu untuk jaminan kualiti.',
    icon: GraduationCap,
    color: '#2563eb',
    path: '/akademik',
    stats: ['12k+ Rekod', 'Sistem Merit QR'],
    preview: (
      <div className="flex flex-col justify-center h-full p-4 gap-2.5">
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Imbasan QR Merit</p>
              <p className="text-[9px] text-blue-300/80">Disahkan Serta-Merta</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-blue-400">+15 Merit</span>
        </div>
        <div className="flex items-center justify-between px-2 text-[10px] text-white/50 font-medium">
          <span>Rekod Terkumpul Siswa</span>
          <span className="text-white font-bold">12,450 Transaksi</span>
        </div>
      </div>
    )
  },
  {
    id: 'polymart',
    title: 'PolyMart',
    subtitle: 'Ekosistem Niaga',
    desc: 'Platform e-dagang berpusat khas buat siswa POLISAS. Jom sokong produk dan servis pelajar kita.',
    icon: ShoppingCart,
    color: '#f59e0b',
    path: '/polymart',
    stats: ['Produk Tempatan', 'JPP Pay Secure'],
    colSpan: 'lg:col-span-2',
    preview: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 h-full items-center">
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">Barangan Rasmi</span>
          <p className="text-xs font-bold text-white truncate">Baju Korporat JPP</p>
          <span className="text-xs font-mono font-black text-amber-300">RM 45.00</span>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Perkhidmatan</span>
          <p className="text-xs font-bold text-white truncate">Pakej Foto Konvo</p>
          <span className="text-xs font-mono font-black text-white/90">RM 15.00</span>
        </div>
      </div>
    )
  },
  {
    id: 'kebajikan',
    title: 'e-Kebajikan',
    subtitle: 'Semak & Prihatin',
    desc: 'Sistem pelaporan dan penjejakan aduan telus. Salurkan isu kebajikan mahasiswa secara terus kepada JPP.',
    icon: HeartHandshake,
    color: '#14b8a6',
    path: '/kebajikan',
    stats: ['Tindakan Pantas', 'Jejak Aduan'],
    preview: (
      <div className="flex flex-col justify-center h-full p-4 gap-2.5">
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4 text-teal-400" />
            </div>
            <span className="text-xs font-bold text-white">Aduan KAMSIS & Fasiliti</span>
          </div>
          <span className="text-[9px] font-bold text-teal-400 bg-teal-500/20 px-2 py-0.5 rounded-full border border-teal-500/30">Selesai 24j</span>
        </div>
        <div className="flex items-center justify-between px-2 text-[10px] text-white/50">
          <span>Kadar Penyelesaian Isu</span>
          <span className="text-teal-400 font-bold">98.2%</span>
        </div>
      </div>
    )
  }
];

const scrollTo = (id: string, offset = 100) => {
  const element = document.getElementById(id);
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
};

// --- Sub-Components ---

function SpotlightCard({ children, className, onClick }: any) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={cn("group relative overflow-hidden rounded-[2.5rem] bg-white/[0.02] border border-white/5 cursor-pointer shadow-lg transform-gpu", className)}
      onMouseMove={handleMouseMove}
      onClick={onClick}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition duration-500 md:group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              rgba(131, 16, 16, 0.15),
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </div>
  );
}

const Navbar = () => {
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
    { label: 'Ekosistem', id: 'ekosistem' },
    { label: 'Modul Utama', id: 'modul' },
    { label: 'Nexus AI', id: 'nexus' }
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 flex justify-center px-4 md:px-6",
          isScrolled ? "py-4 md:py-2" : "py-6 mt-2"
        )}
      >
        <div className={cn(
          "flex items-center justify-between w-full max-w-6xl px-4 md:px-6 py-3 md:py-2.5 rounded-full border transition-all duration-500",
          isScrolled
            ? "bg-[#0A0202]/80 backdrop-blur-2xl border-white/10 shadow-[0_10px_40px_-10px_rgba(131,16,16,0.3)]"
            : "bg-black/20 backdrop-blur-md border-white/5"
        )}>
          {/* Logo Section */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center p-1.5 rounded-xl bg-white/[0.05] border border-white/10 overflow-hidden relative">
              {/* Fallback styling just in case image doesn't load instantly */}
              <div className="absolute inset-0 bg-maroon/20 blur-md" />
              <img src="/jpp-logo.png" alt="JPP Logo" className="w-full h-full object-contain relative z-10" />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-white text-sm md:text-base leading-none">JPP POLISAS</span>
              <span className="text-[8px] md:text-[9px] font-bold text-red-500 uppercase tracking-widest leading-none mt-1">Sistem Pintar</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="hidden md:flex px-6 py-2.5 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-wider hover:bg-maroon hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(131,16,16,0.5)]"
            >
              Daftar Masuk
            </button>

            <button
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-white/[0.05] border border-white/10 text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-24 z-40 mx-4 rounded-[2rem] bg-[#0A0202]/95 backdrop-blur-3xl border border-white/10 p-6 flex flex-col gap-2 md:hidden shadow-[0_20px_60px_-15px_rgba(131,16,16,0.3)]"
          >
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  scrollTo(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className="text-left text-sm font-black uppercase tracking-widest text-white/50 hover:text-white py-4 border-b border-white/5 transition-colors"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => {
                navigate('/login');
                setIsMobileMenuOpen(false);
              }}
              className="mt-6 w-full py-4 rounded-xl bg-maroon text-white text-xs font-black uppercase tracking-widest text-center shadow-[0_0_30px_rgba(131,16,16,0.4)]"
            >
              Log Masuk Portal
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const TickerTape = () => (
  <div className="w-full bg-[#0A0202] border-y border-white/5 py-3 md:py-3.5 overflow-hidden flex items-center relative z-20 shadow-[0_0_50px_rgba(131,16,16,0.1)]">
    <motion.div
      animate={{ x: ["0%", "-50%"] }}
      transition={{ ease: "linear", duration: 35, repeat: Infinity }}
      className="flex whitespace-nowrap gap-8 md:gap-14 items-center transform-gpu will-change-transform"
    >
      {[...Array(2)].map((_, loopIdx) => (
        <React.Fragment key={loopIdx}>
          <div className="flex items-center gap-2.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">Nexus AI: Semakan Kertas Kerja Pintar Beroperasi</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="flex items-center gap-2.5">
            <Shield className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">e-Aktiviti: 120+ Kelab & Persatuan Berdaftar</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">e-Akademik: Pengesahan Merit QR Masa Nyata</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">PolyMart: Platform Niaga Mahasiswa POLISAS</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="flex items-center gap-2.5">
            <HeartHandshake className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">e-Kebajikan: Tindakan Aduan & Food Bank Prihatin</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
        </React.Fragment>
      ))}
    </motion.div>
  </div>
);

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[92dvh] flex items-center justify-center pt-24 md:pt-28 pb-16 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#0a0202]">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.18, 0.28, 0.18] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[70vw] max-w-4xl aspect-square bg-maroon/25 blur-[120px] rounded-full transform-gpu will-change-transform"
        />
        <div className="absolute top-0 right-0 w-1/3 h-1/2 bg-amber-500/5 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Editorial Content */}
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl mb-6 shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/90">
              Jawatankuasa Perwakilan Pelajar POLISAS
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-[-0.03em] text-white leading-[1.0] text-left"
          >
            Masa Depan <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-400 to-amber-200">
              Tadbir Urus Kampus.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-white/60 font-medium leading-relaxed my-6 max-w-xl text-left"
          >
            Platform digital rasmi memacu kepimpinan mahasiswa, automasi kelab, dan ekosistem kampus terpadu POLISAS.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center gap-4 text-left pt-2"
          >
            <button
              onClick={() => navigate('/portal')}
              className="px-8 py-3.5 rounded-xl bg-white text-black font-black uppercase text-xs tracking-wider hover:bg-maroon hover:text-white transition-all duration-300 flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-[0.98]"
            >
              <span>Masuk Portal Pelajar</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => scrollTo('ekosistem')}
              className="px-6 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white/80 font-bold uppercase text-xs tracking-wider hover:bg-white/10 hover:text-white transition-all backdrop-blur-md active:scale-[0.98]"
            >
              Lihat Ekosistem
            </button>
          </motion.div>
        </div>

        {/* Right Executive Preview Widget */}
        <div className="lg:col-span-5 w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="w-full rounded-[2rem] bg-gradient-to-b from-[#160505] to-[#0A0202] border border-white/10 p-6 md:p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-white/90 uppercase tracking-wider">Pusat Operasi Eksekutif</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                Sesi 2026/2027
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 mb-6">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Kelab Berdaftar</span>
                <p className="text-3xl font-black text-white mt-1">120+</p>
                <span className="text-[11px] font-semibold text-emerald-400 mt-1 inline-block">100% Aktif</span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Kelulusan Kertas</span>
                <p className="text-3xl font-black text-white mt-1">98.4%</p>
                <span className="text-[11px] font-semibold text-emerald-400 mt-1 inline-block">Digital & Pantas</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <div>
                    <p className="text-xs font-bold text-white/90">Anugerah MAKMP 2026</p>
                    <p className="text-[10px] text-white/40">Fasa Penjurian Calon</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Aktif</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-xs font-bold text-white/90">Food Bank & Kebajikan</p>
                    <p className="text-[10px] text-white/40">Pengagihan Berkala Siswa</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Beroperasi</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const SystemShowcase = () => {
  const [activeTab, setActiveTab] = useState<'aktiviti' | 'services' | 'makmp'>('aktiviti');
  const navigate = useNavigate();

  return (
    <section id="ekosistem" className="relative pb-20 pt-16 md:pt-24 z-10 flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Decorative Blur behind showcase */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-4xl h-48 md:h-64 bg-red-900/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-6xl rounded-[2rem] md:rounded-[2.5rem] border border-white/10 bg-[#0A0202]/95 backdrop-blur-3xl shadow-[0_20px_70px_-20px_rgba(131,16,16,0.35)] overflow-hidden">
        {/* Authentic Executive Header Deck */}
        <div className="border-b border-white/10 px-5 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-maroon/30 border border-maroon/50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-white">Sistem Eksekutif Siswa POLISAS</span>
              <p className="text-[10px] text-white/40">Pratonton Langsung Kawalan Kampus</p>
            </div>
          </div>

          {/* Interactive Showcase Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10">
            <button
              onClick={() => setActiveTab('aktiviti')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === 'aktiviti'
                  ? "bg-maroon text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              )}
            >
              e-Aktiviti (e-KPP)
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === 'services'
                  ? "bg-maroon text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              )}
            >
              PolyServices
            </button>
            <button
              onClick={() => setActiveTab('makmp')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === 'makmp'
                  ? "bg-maroon text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              )}
            >
              Penjurian MAKMP
            </button>
          </div>

          <button
            onClick={() => navigate('/portal')}
            className="hidden md:flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <span>Buka Portal Penuh</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Showcase Deck Content */}
        <div className="p-6 md:p-8 min-h-[360px]">
          {activeTab === 'aktiviti' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-white/80 uppercase tracking-wider">Saluran Kelulusan Kertas Kerja Terkini</h4>
                  <span className="text-[10px] font-mono text-emerald-400">Status Semasa</span>
                </div>

                {[
                  { title: "Karnival Keusahawanan Siswa 2026", club: "Kelab Keusahawanan", budget: "RM 3,500", status: "Diluluskan", statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                  { title: "Bengkel Robotik & AI Industri", club: "Persatuan Sains Komputer", budget: "RM 1,200", status: "Diluluskan", statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                  { title: "Sukan Antara Jabatan (SUPSAS)", club: "Majlis Sukan POLISAS", budget: "RM 5,800", status: "Pelaksanaan", statusColor: "text-amber-400 bg-amber-500/10 border-amber-500/20" }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between hover:bg-white/[0.05] transition-colors">
                    <div>
                      <h5 className="text-sm font-bold text-white">{item.title}</h5>
                      <p className="text-xs text-white/50">{item.club} • Peruntukan: <span className="font-mono text-white/80">{item.budget}</span></p>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border", item.statusColor)}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-2">Metrik Tadbir Urus</h4>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-white/40">Kertas Kerja Disahkan</span>
                    <p className="text-2xl font-black text-white font-mono">128 Dokumen</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-white/40">Peruntukan Dipantau</span>
                    <p className="text-2xl font-black text-amber-400 font-mono">RM 45,200</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-white/40">Penyertaan Pelajar</span>
                    <p className="text-2xl font-black text-white font-mono">2,450 Mahasiswa</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <h5 className="text-sm font-bold text-white">PolyRider Kampus</h5>
                  </div>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Masa Nyata</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Perkhidmatan penghantaran dan mobiliti sesama pelajar di dalam kawasan POLISAS dan persekitaran Semambu.
                </p>
                <div className="space-y-2 pt-2">
                  <div className="p-3 rounded-lg bg-white/[0.03] flex items-center justify-between text-xs">
                    <span className="text-white/80">Penunggang Aktif Bertugas</span>
                    <span className="font-mono font-bold text-emerald-400">8 Rider</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] flex items-center justify-between text-xs">
                    <span className="text-white/80">Kadar Tambang Selamat</span>
                    <span className="font-mono font-bold text-white">Bermula RM 2.00</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <h5 className="text-sm font-bold text-white">PolyRent Peralatan</h5>
                  </div>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Automasi</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Tempahan peralatan audio, khemah persatuan, dan fasiliti sukan JPP tanpa borang manual yang rumit.
                </p>
                <div className="space-y-2 pt-2">
                  <div className="p-3 rounded-lg bg-white/[0.03] flex items-center justify-between text-xs">
                    <span className="text-white/80">Peralatan Tersedia</span>
                    <span className="font-mono font-bold text-emerald-400">24 Kategori</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] flex items-center justify-between text-xs">
                    <span className="text-white/80">Pengambilan Pantas</span>
                    <span className="font-mono font-bold text-white">Imbas Kod Pengesahan</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'makmp' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Portal Penjurian MAKMP 2026</h4>
                  <p className="text-xs text-white/50">Sistem penilaian anugerah kepimpinan & kecemerlangan siswa berasaskan rubrik rasmi.</p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  Rubrik Automatik
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-white/40">Anugerah Kepimpinan JPP</span>
                  <p className="text-sm font-bold text-white mt-1">Calon Berpotensi Tertinggi</p>
                  <p className="text-[11px] text-emerald-400 mt-2">Merit Maksimum 10 Pts / Dokumen</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-white/40">Anugerah Usahawan Siswa</span>
                  <p className="text-sm font-bold text-white mt-1">Penilaian Prestasi & Hasil Jualan</p>
                  <p className="text-[11px] text-blue-400 mt-2">Penyelarasan Data POS PolyMart</p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-white/40">Audit Ketelusan Juri</span>
                  <p className="text-sm font-bold text-white mt-1">Penyegerakan Skor Bersepadu</p>
                  <p className="text-[11px] text-amber-400 mt-2">Jejak Log Audit Lengkap</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const BentoSection = () => {
  const navigate = useNavigate();

  return (
    <section id="modul" className="py-24 md:py-32 px-4 md:px-6 max-w-7xl mx-auto relative z-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 mb-16 md:mb-20">
        <div className="space-y-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-1.5 md:w-2 h-6 md:h-8 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
            <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] md:tracking-[0.5em] text-white/50">Ekosistem Teras</h2>
          </div>
          <h3 className="text-4xl sm:text-6xl md:text-[5rem] font-black tracking-[-0.02em] text-white leading-[0.9]">
            Satu Ekosistem. <br />
            <span className="text-white/30 italic font-light">Kawal Sepenuhnya.</span>
          </h3>
        </div>
        <p className="max-w-md text-sm md:text-base text-white/40 font-medium leading-relaxed pb-2">
          Struktur modular yang direka khas untuk logik tadbir urus. Organisasikan keperluan kampus dalam kepantasan milisaat.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {MODULES.map((m: any, i) => (
          <SpotlightCard
            key={m.id}
            onClick={() => navigate(m.path)}
            className={cn("p-8 md:p-10 flex flex-col h-full bg-[#0A0202] border border-white/10 hover:border-white/20 transition-colors", m.colSpan)}
          >
            {/* Top Row: Icon & Action */}
            <div className="flex items-start justify-between mb-10">
              <div
                className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                style={{ background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}30` }}
              >
                <m.icon className="w-7 h-7 md:w-8 md:h-8" />
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/5 flex items-center justify-center bg-white/[0.01] group-hover:bg-white/10 transition-colors">
                <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-white/30 group-hover:text-white transition-colors" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 mb-10 md:mb-12">
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: m.color }}>{m.subtitle}</p>
              <h4 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">{m.title}</h4>
              <p className="text-sm md:text-base text-white/50 font-medium leading-relaxed group-hover:text-white/70 transition-colors">
                {m.desc}
              </p>
            </div>

            {/* Bottom Row: Previews/Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[#050101] border border-white/5 aspect-[4/3] sm:aspect-square overflow-hidden relative group-hover:border-white/10 transition-colors">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0A0202] z-10 pointer-events-none" />
                {m.preview}
              </div>
              <div className="flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-center gap-4 py-4 sm:py-0 sm:pl-4">
                {m.stats.map((s, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="text-lg md:text-xl font-black text-white tracking-tighter">{s.split(' ')[0]}</span>
                    <span className="text-[8px] md:text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">{s.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </SpotlightCard>
        ))}
      </div>
    </section>
  );
};

const NexusAISection = () => {
  return (
    <section id="nexus" className="py-24 md:py-36 relative overflow-hidden bg-gradient-to-b from-[#0A0202] via-[#140202] to-[#0A0202] border-y border-white/5">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] mix-blend-screen" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10">

        {/* Text Editorial Content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="lg:col-span-5 space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-md">
            <BrainCircuit className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">Enjin Kepintaran Nexus</span>
          </div>

          <h3 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.0]">
            Kepintaran <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-white">Nexus.</span>
          </h3>

          <p className="text-sm md:text-base text-white/60 font-medium leading-relaxed">
            Sistem analisis berbantu AI yang menyemak struktur kertas kerja, pengiraan belanjawan, dan pematuhan format HEP sebelum dihantar kepada penasihat kelab.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            {[
              { label: 'Analisis Minit', desc: 'Sintaks Kewangan', icon: Activity },
              { label: 'Semakan Format', desc: 'Piawaian HEP 2026', icon: BookOpen },
              { label: 'Audit Bajet', desc: 'Pengesahan Jumlah', icon: Shield },
              { label: 'Bantuan 24/7', desc: 'Resolusi Isu Siswa', icon: Zap }
            ].map((f, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <f.icon className="w-4 h-4 text-red-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">{f.label}</h4>
                  <p className="text-[10px] text-white/40">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* High-Fidelity Document Audit Workbench Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="lg:col-span-7 w-full rounded-[2.5rem] border border-white/10 bg-[#070101] p-6 md:p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Nexus AI Document Audit Workbench</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Skor Pematuhan: 98%
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <span className="text-[9px] font-mono uppercase text-white/40 tracking-wider">Kertas Kerja Disemak</span>
              <p className="text-sm font-bold text-white">KERTAS KERJA: BENGKEL KEMAHIRAN AI & ROBOTIK SISWA 2026</p>
              <p className="text-xs text-white/50">Pemohon: Persatuan Teknologi Maklumat POLISAS</p>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-300">Format Template HEP: Sempurna</span>
                  <p className="text-white/60 mt-0.5">Semua 8 seksyen wajib merangkumi objektif, hasil pembelajaran, dan tentatif lengkap.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-300">Semakan Bajet: RM 1,500.00 Sah</span>
                  <p className="text-white/60 mt-0.5">Pengiraan item jamuan, penceramah, dan cenderahati seimbang tanpa ralat aritmetik.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-amber-300">Cadangan Penambahbaikan</span>
                  <p className="text-white/60 mt-0.5">Tambahkan pemetaan SDG 4 (Pendidikan Berkualiti) untuk meningkatkan skor penilaian aktiviti.</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-white/40 border-t border-white/5">
              <span>Masa Pemprosesan: 1.2s</span>
              <span className="font-mono text-emerald-400">Integriti Data: Disahkan</span>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

const StatsSection = () => {
  return (
    <section className="py-24 md:py-32 bg-[#050101] border-b border-white/5 relative z-20">
      <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 md:divide-x divide-white/5">
        {[
          { label: 'Kelab Pemimpin', val: '120+' },
          { label: 'Kertas Diluluskan', val: '10k+' },
          { label: 'Ekonomi Kampus', val: 'RM 50k' },
          { label: 'Merit Disahkan', val: '250k' }
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={`text-center space-y-2 md:space-y-4 ${i !== 0 && "md:pl-12"}`}
          >
            <p className="text-4xl md:text-6xl font-black text-white tracking-[-0.04em]">{s.val}</p>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const Footer = () => {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer id="manual" className="py-20 md:py-24 px-4 md:px-6 bg-[#0A0202] relative overflow-hidden">
      {/* Decorative footer glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-32 bg-red-900/10 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-16 relative z-10">

        <div className="space-y-6 md:space-y-8 max-w-xs">
          <div className="flex items-center gap-3 cursor-pointer" onClick={scrollToTop}>
            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center p-1.5 rounded-xl bg-white/[0.03] border border-white/5">
              <img src="/jpp-logo.png" alt="JPP Logo" className="w-full h-full object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-white/60 text-base md:text-lg leading-none">JPP POLISAS</span>
              <span className="text-[8px] md:text-[9px] font-bold text-white/20 uppercase tracking-[0.3em] leading-none mt-1.5">Sistem Pintar v2</span>
            </div>
          </div>
          <p className="text-xs text-white/30 font-medium leading-relaxed">
            Exco Kelab, Persatuan dan Perpaduan POLISAS.<br />
            Menyediakan ekosistem data bersepadu bagi melancarkan proses tadbir urus Polisas.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-24 w-full md:w-auto">
          {[
            { title: 'Aplikasi', links: [{ label: 'Portal Kelab', to: '/portal' }, { label: 'POS e-Keusahawanan', to: '/keusahawanan' }, { label: 'Scanner e-Akademik', to: '/akademik' }] },
            { title: 'Rujukan', links: [{ label: 'Manual Standard', to: '#' }, { label: 'Garis Panduan', to: '#' }, { label: 'Dasar Integriti', to: '#' }] },
            { title: 'Sokongan', links: [{ label: 'Pusat Bantuan', to: '#' }, { label: 'Hubungi Kami', to: '#' }] }
          ].map((g, i) => (
            <div key={i} className="space-y-6 md:space-y-8">
              <h5 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-white/80">{g.title}</h5>
              <ul className="space-y-4">
                {g.links.map((l, idx) => (
                  <li key={idx}>
                    <a href={l.to} className="text-xs font-semibold text-white/30 hover:text-white transition-colors">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 relative z-10">
        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/20">© 2026 Hak Cipta Terpelihara JPP POLISAS.</p>
        <div className="flex items-center gap-6 md:gap-8">
          {['Privasi', 'Terma Syarat', 'Keselamatan'].map(s => (
            <a key={s} href="#" className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white transition-colors">{s}</a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#0A0202] min-h-screen text-white font-sans selection:bg-red-500/30 selection:text-white overflow-x-hidden">
      <Navbar />

      <main>
        <Hero />
        <TickerTape />
        <SystemShowcase />
        <BentoSection />
        <NexusAISection />
        <StatsSection />

        {/* Final CTA Section */}
        <section className="py-24 md:py-40 px-4 md:px-6 relative flex justify-center z-20">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="w-full max-w-5xl rounded-[2.5rem] md:rounded-[4rem] bg-gradient-to-br from-red-600/10 via-[#0A0202] to-transparent border border-red-500/10 p-10 md:p-24 text-center space-y-8 md:space-y-12 relative overflow-hidden backdrop-blur-2xl"
          >
            {/* CTA Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full md:w-[600px] md:h-[600px] bg-red-600/10 blur-[60px] md:blur-[150px] rounded-full pointer-events-none transform-gpu will-change-transform" />

            <h3 className="text-4xl md:text-7xl lg:text-[6rem] font-black tracking-[-0.02em] text-white leading-[0.9] relative z-10">
              Gerakan <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-white">Bermula Di Sini.</span>
            </h3>
            <p className="text-sm md:text-lg text-white/50 font-medium max-w-xl mx-auto leading-relaxed relative z-10 px-4">
              Adakah urusan kelab anda sedia ditingkatkan ke tahap pengurusan eksekutif? Mohon kelulusan dan nikmati akses sekarang.
            </p>

            <button
              onClick={() => navigate('/portal')}
              className="relative z-10 px-8 py-4 md:px-12 md:py-6 rounded-2xl md:rounded-3xl bg-white text-black font-black uppercase text-xs md:text-sm tracking-[0.2em] hover:bg-maroon hover:text-white hover:scale-105 transition-all duration-500 flex items-center gap-3 md:gap-4 mx-auto shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(131,16,16,0.5)]"
            >
              Mohon Akses Sistem
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
