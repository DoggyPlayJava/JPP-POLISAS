import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionTemplate, useMotionValue } from 'framer-motion';
import {
  ArrowRight, Shield, Zap, Users,
  BarChart3, GraduationCap,
  BrainCircuit, ArrowUpRight,
  Menu, X, BookOpen, Activity, PlayCircle, FileText, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// --- Types & Config ---
const MAROON = '#831010';

const MODULES = [
  {
    id: 'ekpp',
    title: 'e-KPP',
    subtitle: 'Nadi Organisasi',
    desc: 'Sistem tadbir urus kelab dan persatuan yang telus. Automasi kertas kerja dan pelaporan bulanan secara digital.',
    icon: Shield,
    color: '#831010',
    path: '/portal',
    stats: ['120+ Kelab Aktif', '98% Kelulusan Digital'],
    preview: (
      <div className="flex flex-col gap-2 p-4 md:p-6 h-full justify-center">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <div className="h-2 w-32 bg-white/20 rounded-full" />
            <div className="ml-auto h-2 w-10 bg-white/10 rounded-full hidden sm:block" />
          </div>
        ))}
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
      <div className="flex items-end gap-2 p-4 md:p-6 h-full justify-center w-full">
        <div className="flex items-end justify-between w-full h-full pb-4">
            {[40, 70, 45, 90, 60, 80, 55].map((h, i) => (
            <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.5 + (i * 0.1), duration: 1 }}
                className="w-4 md:w-6 lg:w-8 bg-gradient-to-t from-emerald-500/20 to-emerald-500 rounded-t-md shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            />
            ))}
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
      <div className="flex items-center justify-center h-full relative">
        <div className="w-24 h-24 rounded-full border border-blue-500/30 flex items-center justify-center bg-blue-500/5 shadow-[0_0_30px_rgba(37,99,235,0.15)]">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 rounded-full border-4 border-blue-500 border-t-transparent border-l-transparent" 
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-white dropshadow-md">4.00</span>
          <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">HPNM</span>
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
      className={cn("group relative overflow-hidden rounded-[2.5rem] bg-white/[0.02] border border-white/5 cursor-pointer shadow-lg", className)}
      onMouseMove={handleMouseMove}
      onClick={onClick}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition duration-500 group-hover:opacity-100"
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
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
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
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
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
  <div className="w-full bg-[#0A0202] border-y border-white/5 py-3 md:py-4 overflow-hidden flex items-center relative z-20 shadow-[0_0_50px_rgba(131,16,16,0.1)]">
    <motion.div
      animate={{ x: ["0%", "-50%"] }}
      transition={{ ease: "linear", duration: 40, repeat: Infinity }}
      className="flex whitespace-nowrap gap-8 md:gap-16 items-center"
    >
      {[...Array(4)].map((_, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-2 md:gap-3">
            <Zap className="w-3 h-3 md:w-4 md:h-4 text-amber-500" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/50">Nexus AI: 12 Laporan Telah Disemak</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-1 h-1 rounded-full bg-white/20" />
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <BarChart3 className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/50">e-Keusahawanan: Transaksi RM 2.5k Direkod</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-1 h-1 rounded-full bg-white/20" />
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <GraduationCap className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/50">e-Akademik: 45 Pelajar Imbas QR Merit</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-1 h-1 rounded-full bg-white/20" />
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Shield className="w-3 h-3 md:w-4 md:h-4 text-maroon fill-maroon/20" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/50">e-KPP: Kertas Kerja DSK Lulus</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-1 h-1 rounded-full bg-white/20" />
          </div>
        </React.Fragment>
      ))}
    </motion.div>
  </div>
);

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] md:min-h-screen flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden">
      {/* Deep Space Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#0a0202]">
        {/* Core Glowing Orb */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] md:w-[60vw] max-w-4xl aspect-square bg-maroon/30 blur-[100px] md:blur-[140px] rounded-full" 
        />
        {/* Secondary Accents */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-red-900/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-rose-900/10 blur-[120px] rounded-full" />
        
        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] md:opacity-[0.05] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center">
        {/* Status Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/[0.02] border border-white/5 backdrop-blur-xl mb-8 md:mb-10 shadow-[0_0_20px_rgba(131,16,16,0.15)]"
        >
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
            Sistem Operasi Institusi v2.0
          </span>
        </motion.div>

        {/* Big Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-[3.25rem] leading-[0.95] sm:text-6xl md:text-8xl xl:text-[8rem] font-black tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/30 mb-6 md:mb-8 pb-2"
        >
          Masa Depan <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-600 to-maroon drop-shadow-sm">
            Tadbir Urus.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm md:text-lg text-white/50 max-w-2xl mx-auto font-medium leading-relaxed mb-10 md:mb-12 px-2"
        >
          Hadiri ke tahap seterusnya. Platform eksklusif Jawatankuasa Perwakilan Pelajar mengurus organisasi, penjanaan aset, dan analitik data dengan ekosistem pintar berpusat.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto px-6 sm:px-0"
        >
          <button
            onClick={() => navigate('/portal')}
            className="w-full sm:w-auto group relative px-8 md:px-10 py-4 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-maroon hover:text-white transition-all duration-500 flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(131,16,16,0.5)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/50 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <span className="relative z-10">Mula Sesi Digital</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
          </button>
          
          <button 
            onClick={() => scrollTo('nexus')}
            className="w-full sm:w-auto group px-8 md:px-10 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white/70 font-black uppercase text-xs tracking-widest hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-500 flex items-center justify-center gap-3 backdrop-blur-md"
          >
            <PlayCircle className="w-4 h-4 text-white/40 group-hover:text-red-400 transition-colors" />
            Kenali Nexus
          </button>
        </motion.div>
      </div>
    </section>
  );
};

const SystemShowcase = () => {
  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0, 0.4], [0.9, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [0.3, 1]);
  const rotateX = useTransform(scrollYProgress, [0, 0.4], [20, 0]);

  return (
    <section id="ekosistem" className="relative pb-20 md:pb-32 pt-16 md:pt-24 z-10 flex flex-col items-center justify-center px-4 overflow-hidden" style={{ perspective: 1200 }}>
      {/* Decorative Blur behind showcase */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-4xl h-48 md:h-64 bg-red-900/20 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        style={{ scale, opacity, rotateX }}
        className="relative w-full max-w-6xl rounded-t-[2rem] md:rounded-[2.5rem] border-x border-t border-white/10 bg-[#0A0202]/90 backdrop-blur-3xl shadow-[0_-20px_60px_-20px_rgba(131,16,16,0.3)] md:shadow-[0_-30px_100px_-20px_rgba(131,16,16,0.35)] overflow-hidden"
      >
        {/* Fake Browser Chrome */}
        <div className="h-10 md:h-12 border-b border-white/5 flex items-center px-4 md:px-6 gap-3 bg-white/[0.02]">
          <div className="flex gap-1.5 md:gap-2">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-white/10 border border-white/5" />
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-white/10 border border-white/5" />
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-white/10 border border-white/5" />
          </div>
          <div className="mx-auto flex items-center gap-2 px-6 md:px-12 py-1 md:py-1.5 rounded-full bg-black/60 border border-white/5">
            <Shield className="w-3 h-3 text-white/30 hidden md:block" />
            <span className="text-[9px] md:text-[10px] text-white/30 font-medium tracking-widest">portal.jpppolisas.edu.my</span>
          </div>
        </div>

        {/* Dashboard Content Mockup */}
        <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-4 gap-6 h-[400px] md:h-[600px] bg-gradient-to-b from-[#0A0202] to-black relative">
          
          {/* Bottom Fade Mask */}
          <div className="absolute bottom-0 left-0 right-0 h-40 md:h-56 bg-gradient-to-t from-[#050101] to-transparent z-10 block pointer-events-none" />

          {/* Sidebar */}
          <div className="hidden md:block col-span-1 space-y-6">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-8 h-8 rounded-lg bg-maroon border border-red-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(131,16,16,0.4)]">
                 <div className="w-4 h-4 bg-white/50 rounded-sm" />
              </div>
              <div className="h-3 w-20 bg-white/20 rounded-full" />
            </div>
            <div className="space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`h-11 w-full rounded-xl flex items-center px-4 gap-4 ${i === 1 ? 'bg-maroon/10 border border-maroon/20' : 'bg-transparent border border-transparent hover:bg-white/[0.02]'}`}>
                  <div className={`w-4 h-4 rounded-md ${i === 1 ? 'bg-red-400' : 'bg-white/10'}`} />
                  <div className={`h-2.5 w-20 rounded-full ${i === 1 ? 'bg-white/60' : 'bg-white/10'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-1 md:col-span-3 space-y-6 pt-2">
            {/* Header part */}
            <div className="flex justify-between items-center mb-2 md:mb-6">
              <div className="space-y-2.5">
                <div className="h-6 md:h-8 w-32 md:w-48 bg-white/10 rounded-lg" />
                <div className="h-2 md:h-3 w-48 md:w-64 bg-white/5 rounded-full" />
              </div>
              <div className="h-10 w-10 md:w-32 bg-maroon/20 border border-maroon/30 rounded-xl" />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
              {[
                { c: 'border-white/5', b: 'bg-white/[0.02]', icon: <Zap className="w-4 h-4 text-amber-500/50" /> },
                { c: 'border-emerald-500/10', b: 'bg-emerald-500/[0.02]', icon: <Activity className="w-4 h-4 text-emerald-500/50" /> },
                { c: 'border-blue-500/10', b: 'bg-blue-500/[0.02]', hideOnMobile: true, icon: <Users className="w-4 h-4 text-blue-500/50" /> }
              ].map((style, i) => (
                <div key={i} className={cn("h-28 md:h-36 border rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col justify-between shadow-sm", style.c, style.b, style.hideOnMobile && "hidden lg:flex")}>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 flex items-center justify-center">
                    {style.icon}
                  </div>
                  <div className="space-y-2.5">
                    <div className="h-5 md:h-7 w-2/3 bg-white/20 rounded-md" />
                    <div className="h-2 w-1/2 bg-white/10 rounded-full" />
                  </div>
                </div>
              ))}
            </div>

            {/* Chart Area */}
            <div className="h-48 md:h-72 w-full bg-white/[0.02] border border-white/5 rounded-[2rem] p-5 md:p-8 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-maroon" />
                    <div className="h-3 md:h-4 w-24 md:w-32 bg-white/10 rounded-full" />
                 </div>
                 <div className="flex gap-2">
                    <div className="h-2 w-8 bg-white/5 rounded-full" />
                    <div className="h-2 w-8 bg-white/10 rounded-full" />
                 </div>
              </div>
              <div className="flex-1 flex items-end justify-between gap-1.5 md:gap-3 px-1 md:px-4">
                {[30, 50, 45, 80, 50, 95, 65, 40, 85, 55, 75].map((h, i) => (
                  <div key={i} className="group relative w-full h-full flex items-end justify-center">
                    <div 
                        style={{ height: `${h}%` }} 
                        className="w-full max-w-[1.5rem] bg-gradient-to-t from-maroon/20 to-red-500/60 rounded-t-sm md:rounded-t-md transition-all duration-300 group-hover:from-maroon/40 group-hover:to-red-400" 
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
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
        {MODULES.map((m, i) => (
          <SpotlightCard
            key={m.id}
            onClick={() => navigate(m.path)}
            className="p-8 md:p-10 flex flex-col h-full bg-[#0A0202] border border-white/10 hover:border-white/20 transition-colors"
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
    <section id="nexus" className="py-24 md:py-40 relative overflow-hidden bg-gradient-to-b from-[#0A0202] via-[#140202] to-[#0A0202] border-y border-white/5">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] mix-blend-screen" />
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24 items-center relative z-10">
        
        {/* Core Visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative aspect-square md:aspect-auto md:h-[600px] w-full rounded-[3rem] border border-white/5 flex items-center justify-center p-8 md:p-12 overflow-hidden bg-black/40 lg:order-2 shadow-2xl"
        >
          {/* Reactor Background Glow */}
          <div className="absolute inset-0 z-0 flex items-center justify-center">
            <div className="w-48 h-48 md:w-64 md:h-64 bg-red-600/20 blur-[80px] md:blur-[100px] rounded-full animate-pulse" />
          </div>
          
          <div className="relative z-10 w-full h-full flex items-center justify-center">
             {/* Dynamic Rings */}
             <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute w-[90%] h-[90%] border border-dashed border-red-500/20 rounded-full"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute w-[65%] h-[65%] border border-solid border-r-red-500/30 border-t-red-500/10 border-b-transparent border-l-transparent rounded-full"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute w-[45%] h-[45%] border border-dotted border-white/20 rounded-full"
            />

            {/* Core Element */}
            <div className="relative z-20 flex flex-col items-center justify-center">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-[#0A0202] border border-red-500/40 flex items-center justify-center backdrop-blur-xl shadow-[0_0_50px_rgba(220,38,38,0.3)]">
                <BrainCircuit className="w-8 h-8 md:w-12 md:h-12 text-white/90 drop-shadow-md" />
              </div>
            </div>
            
            {/* Floating Nodes */}
            <motion.div 
               animate={{ y: [-10, 10, -10] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-[15%] left-[15%] w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#050101] border border-white/10 flex items-center justify-center shadow-lg"
            >
              <FileText className="w-4 h-4 md:w-5 md:h-5 text-white/50" />
            </motion.div>

            <motion.div 
               animate={{ y: [10, -10, 10] }}
               transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
               className="absolute bottom-[20%] right-[20%] w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#050101] border border-white/10 flex items-center justify-center shadow-lg"
            >
              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-500/70" />
            </motion.div>
          </div>
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-6 md:space-y-8 lg:order-1"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-md">
            <BrainCircuit className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">A.I Core Engine</span>
          </div>

          <h3 className="text-5xl sm:text-7xl md:text-[5rem] font-black tracking-tight text-white leading-[0.9]">
            Kepintaran <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-white">Nexus.</span>
          </h3>

          <p className="text-sm md:text-lg text-white/50 font-medium leading-relaxed max-w-lg">
            Sistem dipacu LLM (Large Language Model) untuk menyemak kualiti laporan teknikal dan merumuskan sentimen mahasiswa. Serahkan tugasan analitik kepada ejen pintar JPP.
          </p>

          <div className="grid grid-cols-2 gap-6 md:gap-10 pt-4 md:pt-8 border-t border-white/5 mt-8">
            {[
              { label: 'Analisis Minit', desc: 'Sintaks Kewangan', icon: Activity },
              { label: 'Penjanaan', desc: 'Teks Automatik', icon: BookOpen },
              { label: 'Audit Semak', desc: 'Ralat Pemformatan', icon: Shield },
              { label: 'Pakar JPP', desc: 'Resolusi Isu 24/7', icon: Zap }
            ].map((f, i) => (
              <div key={i} className="flex flex-col gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                  <f.icon className="w-4 h-4 md:w-5 md:h-5 text-white/60" />
                </div>
                <div>
                  <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white mb-1 md:mb-1.5">{f.label}</h4>
                  <p className="text-[8px] md:text-[9px] uppercase font-bold tracking-[0.2em] text-white/30">{f.desc}</p>
                </div>
              </div>
            ))}
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
  const scrollToTop = () => window.scrollTo({top: 0, behavior: 'smooth'});

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
            Unit Teknologi & Inovasi Digital Mahasiswa.<br />
            Menyediakan ekosistem data bersepadu bagi melancarkan proses tadbir urus Polisas.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-24 w-full md:w-auto">
          {[
            { title: 'Aplikasi', links: [{label:'Portal e-KPP', to:'/portal'}, {label:'POS e-Keusahawanan', to:'/keusahawanan'}, {label:'Scanner e-Akademik', to:'/akademik'}] },
            { title: 'Rujukan', links: [{label:'Manual Standard', to:'#'}, {label:'Garis Panduan', to:'#'}, {label:'Dasar Integriti', to:'#'}] },
            { title: 'Sokongan', links: [{label:'Pusat Bantuan', to:'#'}, {label:'Hubungi Kami', to:'#'}] }
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full md:w-[600px] md:h-[600px] bg-red-600/10 blur-[100px] md:blur-[150px] rounded-full pointer-events-none" />

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
