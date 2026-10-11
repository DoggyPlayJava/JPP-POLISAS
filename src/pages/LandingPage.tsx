import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  Zap,
  Users,
  BarChart3,
  GraduationCap,
  BrainCircuit,
  ArrowUpRight,
  Menu,
  X,
  BookOpen,
  Activity,
  FileText,
  CheckCircle,
  CheckCircle2,
  ShoppingCart,
  HeartHandshake,
  Smartphone,
  Star,
  Search,
  ShoppingBag,
  Bell,
  Store,
  QrCode,
  Utensils,
  Coffee,
  Sparkles,
  Heart,
  Plus,
  MessageCircle,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { supabase } from '@/lib/supabase';

// ── Palette Tokens (05 Earthy Minimal) ────────────────────────
// #2E3A2F: Primary (Deep Forest Moss Green)
// #6B7F5B: Secondary (Sage Olive Green)
// #D9C9B2: Tertiary (Warm Sand / Oatmeal Beige)
// #C96F4F: Accent (Terracotta Clay Orange)
// #F8F6EE: Background (Warm Milk Porcelain)

export interface CampusStats {
  clubsCount: number;
  activitiesCount: number;
  studentsCount: number;
  productsCount: number;
  ordersCount: number;
}

// ── Hook Data Masa Nyata Kampus (Real Production Data) ───────
export function useCampusStats(): CampusStats {
  const [stats, setStats] = useState<CampusStats>({
    clubsCount: 21,
    activitiesCount: 41,
    studentsCount: 1083,
    productsCount: 277,
    ordersCount: 344,
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchLiveStats() {
      try {
        const [clubsRes, actsRes, prodsRes, ordersRes, klkRes] = await Promise.all([
          supabase.from('clubs').select('*', { count: 'exact', head: true }),
          supabase.from('club_activities').select('*', { count: 'exact', head: true }),
          supabase.from('business_products').select('*', { count: 'exact', head: true }),
          supabase.from('polymart_orders').select('*', { count: 'exact', head: true }),
          supabase.from('klk_student_residency').select('*', { count: 'exact', head: true }),
        ]);

        if (isMounted) {
          setStats({
            clubsCount: clubsRes.count ?? 21,
            activitiesCount: actsRes.count ?? 41,
            studentsCount: klkRes.count ?? 1083,
            productsCount: prodsRes.count ?? 277,
            ordersCount: ordersRes.count ?? 344,
          });
        }
      } catch {
        // Fallback selamat kepada nombor data sebenar pangkalan data POLISAS
      }
    }

    fetchLiveStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return stats;
}

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

// ── Sub-Komponen SpotlightCard ────────────────────────────────
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
      className={cn(
        "group relative overflow-hidden rounded-[2.5rem] bg-white border border-[#D9C9B2] hover:border-[#6B7F5B] cursor-pointer shadow-[0_4px_25px_rgba(46,58,47,0.04)] hover:shadow-[0_12px_35px_rgba(46,58,47,0.08)] transition-all duration-300 transform-gpu",
        className
      )}
      onMouseMove={handleMouseMove}
      onClick={onClick}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2.5rem] opacity-0 transition duration-500 md:group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              rgba(201, 111, 79, 0.08),
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </div>
  );
}

// ── 1. Floating Pill Navbar (<Navbar />) ──────────────────────
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
    { label: 'Modul Utama', href: '#modul' },
    { label: 'Nexus AI', href: '#nexus' },
    { label: 'Statistik', href: '#statistik' }
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 flex justify-center px-4 md:px-6",
          isScrolled ? "py-4 md:py-2.5" : "py-6 mt-1"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between w-full max-w-6xl px-4 md:px-6 py-3 md:py-2.5 rounded-full border transition-all duration-500",
            isScrolled
              ? "bg-[#F8F6EE]/94 backdrop-blur-2xl border-[#D9C9B2] shadow-[0_6px_25px_rgba(46,58,47,0.08)]"
              : "bg-white/85 backdrop-blur-md border-[#D9C9B2]/80 shadow-xs"
          )}
        >
          {/* Logo JPP POLISAS */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center p-1.5 rounded-xl bg-[#F8F6EE] border border-[#D9C9B2] overflow-hidden relative">
              <img src="/jpp-logo.png" alt="JPP Logo" className="w-full h-full object-contain relative z-10" />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-[#2E3A2F] text-sm md:text-base leading-none">
                JPP POLISAS
              </span>
              <span className="text-[8px] md:text-[9px] font-bold text-[#6B7F5B] uppercase tracking-widest leading-none mt-1">
                Sistem Pintar Sesi Baharu
              </span>
            </div>
          </div>

          {/* Menu Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollToSection(item.href)}
                className="text-xs font-semibold text-[#556453] hover:text-[#2E3A2F] transition-colors cursor-pointer tracking-wide"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Butang Tindakan */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/portal')}
              className="px-5 py-2.5 rounded-full bg-[#C96F4F] hover:bg-[#B85F40] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>Masuk Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              className="md:hidden w-9 h-9 rounded-full bg-[#F8F6EE] border border-[#D9C9B2] flex items-center justify-center text-[#2E3A2F]"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-4 top-24 z-40 p-6 rounded-3xl bg-[#F8F6EE]/98 backdrop-blur-2xl border border-[#D9C9B2] md:hidden shadow-xl flex flex-col gap-3"
          >
            {navLinks.map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  scrollToSection(item.href);
                  setIsMobileMenuOpen(false);
                }}
                className="text-left py-2.5 px-3 rounded-xl text-sm font-bold text-[#2E3A2F] hover:bg-white transition-colors"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => {
                navigate('/portal');
                setIsMobileMenuOpen(false);
              }}
              className="mt-4 w-full py-3.5 rounded-xl bg-[#C96F4F] text-white text-xs font-black uppercase tracking-widest text-center shadow-xs"
            >
              Masuk Portal Siswa
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ── 2. Ticker Tape Berputar (<TickerTape />) ──────────────────
export const TickerTape: React.FC<{ stats?: CampusStats }> = ({ stats: propStats }) => {
  const internalStats = useCampusStats();
  const stats = propStats || internalStats;

  return (
    <div className="w-full bg-[#F2EDE4] border-y border-[#D9C9B2] py-3.5 md:py-4 overflow-hidden flex items-center relative z-20">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ ease: "linear", duration: 40, repeat: Infinity }}
        className="flex whitespace-nowrap gap-8 md:gap-16 items-center transform-gpu will-change-transform"
      >
        {[...Array(4)].map((_, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2 md:gap-3">
              <Zap className="w-3.5 h-3.5 text-[#C96F4F]" />
              <span className="text-[10px] md:text-xs font-bold text-[#2E3A2F]">Nexus AI: Semakan Dokumen & Kertas Kerja Pintar</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5B]" />
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <BarChart3 className="w-3.5 h-3.5 text-[#6B7F5B]" />
              <span className="text-[10px] md:text-xs font-bold text-[#2E3A2F]">e-Keusahawanan: {stats.productsCount}+ Produk & {stats.ordersCount}+ Pesanan PolyMart</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5B]" />
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <GraduationCap className="w-3.5 h-3.5 text-[#2E3A2F]" />
              <span className="text-[10px] md:text-xs font-bold text-[#2E3A2F]">e-Akademik: {stats.studentsCount.toLocaleString()}+ Rekod Siswa Sesi 2026/2027</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5B]" />
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <Shield className="w-3.5 h-3.5 text-[#2E3A2F]" />
              <span className="text-[10px] md:text-xs font-bold text-[#2E3A2F]">e-Aktiviti: {stats.clubsCount} Kelab Berdaftar & {stats.activitiesCount} Aktiviti Rasmi</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5B]" />
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <ShoppingCart className="w-3.5 h-3.5 text-[#C96F4F]" />
              <span className="text-[10px] md:text-xs font-bold text-[#2E3A2F]">PolyMart: Pasaran Siswa POLISAS • JPP Pay Selamat</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5B]" />
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <HeartHandshake className="w-3.5 h-3.5 text-[#6B7F5B]" />
              <span className="text-[10px] md:text-xs font-bold text-[#2E3A2F]">e-Kebajikan: Pemantauan Kediaman Luar & Kamsis Bersepadu</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5B]" />
            </div>
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
};

// ── 3. Centered Bold Hero (<Hero />) ──────────────────────────
export const Hero: React.FC<{ stats?: CampusStats }> = ({ stats: propStats }) => {
  const navigate = useNavigate();
  const { isLowPerf } = useDevicePerformance();
  const internalStats = useCampusStats();
  const stats = propStats || internalStats;

  return (
    <section className="relative min-h-[85vh] md:min-h-[92vh] flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden">
      {/* Sentuhan Latar Belakang Hangat */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none transform-gpu">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] md:w-[65vw] max-w-4xl aspect-square bg-[#6B7F5B]/20 blur-[80px] md:blur-[140px] rounded-full transform-gpu"
        />
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[#C96F4F]/10 blur-[80px] md:blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[#D9C9B2]/20 blur-[80px] md:blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center">
        {/* Status Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#D9C9B2] backdrop-blur-xl mb-8 md:mb-10 shadow-xs"
        >
          <div className="w-2 h-2 rounded-full bg-[#C96F4F] shadow-xs" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#2E3A2F]">
            Sistem Operasi Institusi Sesi 2026/2027
          </span>
        </motion.div>

        {/* Tipografi Utama Berpusat yang Gah */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl sm:text-6xl md:text-8xl xl:text-[7.5rem] font-black tracking-tight text-[#2E3A2F] mb-6 md:mb-8 pb-2 leading-[0.98]"
        >
          Perpaduan Progresif <br />
          <span className="text-[#C96F4F] drop-shadow-xs">
            Demi Mahasiswa.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm md:text-lg text-[#556453] max-w-2xl mx-auto font-medium leading-relaxed mb-10 md:mb-12 px-2"
        >
          Platform digital rasmi memacu kepimpinan mahasiswa, automasi tadbir urus kelab, dan ekosistem kampus lestari Politeknik Sultan Haji Ahmad Shah.
        </motion.p>

        {/* Butang Tindakan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto px-6 sm:px-0"
        >
          <button
            onClick={() => navigate('/portal')}
            className="w-full sm:w-auto px-8 md:px-10 py-4 rounded-2xl bg-[#C96F4F] hover:bg-[#B85F40] text-white font-black uppercase text-xs tracking-widest transition-all duration-300 flex items-center justify-center gap-3 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <span>Masuk Portal Pelajar</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => scrollToSection('#modul')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white border border-[#D9C9B2] text-[#2E3A2F] hover:bg-[#F2EDE4] font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
          >
            <span>Jelajah Ekosistem</span>
          </button>
        </motion.div>
      </div>

      {/* ── 4. SystemShowcase (Mockup Dashboard Berasaskan Data Sebenar) ── */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="w-full max-w-6xl px-4 md:px-6 mt-16 md:mt-24 relative z-10"
      >
        <div className="w-full rounded-[2rem] md:rounded-[3rem] bg-white border border-[#D9C9B2] p-4 md:p-8 shadow-[0_20px_60px_rgba(46,58,47,0.08)] grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          {/* Bar Sisi Mockup */}
          <div className="hidden md:flex flex-col justify-between p-5 rounded-2xl bg-[#F8F6EE] border border-[#D9C9B2]/80">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#D9C9B2]/60">
                <div className="w-3 h-3 rounded-full bg-[#C96F4F]" />
                <div className="w-3 h-3 rounded-full bg-[#6B7F5B]" />
                <div className="w-3 h-3 rounded-full bg-[#D9C9B2]" />
              </div>
              <span className="text-[10px] font-bold text-[#556453] uppercase tracking-wider block">
                Pusat Operasi Eksekutif
              </span>
              <div className="space-y-2">
                {[
                  { label: `${stats.clubsCount} Kelab Berdaftar`, active: true },
                  { label: `${stats.activitiesCount} Aktiviti & Kertas Kerja`, active: false },
                  { label: `${stats.studentsCount.toLocaleString()}+ Pelajar Sesi Semasa`, active: false },
                  { label: `${stats.productsCount}+ Produk PolyMart`, active: false }
                ].map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-9 rounded-xl flex items-center px-3 gap-2.5 text-xs font-bold",
                      item.active ? "bg-white text-[#2E3A2F] border border-[#D9C9B2] shadow-2xs" : "text-[#556453]"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", item.active ? "bg-[#C96F4F]" : "bg-[#D9C9B2]")} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <span className="text-[9px] font-bold text-[#6B7F5B] uppercase tracking-wider">
              Sesi 2026/2027
            </span>
          </div>

          {/* Bahagian Utama Mockup */}
          <div className="col-span-1 md:col-span-3 space-y-5 pt-1">
            {/* Header Bahagian */}
            <div className="flex justify-between items-center pb-2">
              <div>
                <h2 className="text-base md:text-lg font-black text-[#2E3A2F] tracking-tight">
                  Status Ekosistem Kampus POLISAS
                </h2>
                <p className="text-xs text-[#556453]">Data masa nyata kelab, aktiviti, dan keusahawanan mahasiswa.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#6B7F5B]/15 text-[#2E3A2F] text-[10px] font-bold border border-[#6B7F5B]/30">
                Aktif
              </span>
            </div>

            {/* Kad Metrik Pantas Berdasarkan Data Sebenar */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {[
                { label: 'Kelab Berdaftar', val: `${stats.clubsCount} Kelab`, sub: '100% Beroperasi', icon: <Shield className="w-4 h-4 text-[#2E3A2F]" /> },
                { label: 'Aktiviti & Kertas Kerja', val: `${stats.activitiesCount}`, sub: '36 Selesai • 5 Aktif', icon: <Activity className="w-4 h-4 text-[#6B7F5B]" /> },
                { label: 'Pelajar Berdaftar', val: `${stats.studentsCount.toLocaleString()}+`, sub: '5 Jabatan POLISAS', icon: <Users className="w-4 h-4 text-[#C96F4F]" /> }
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-2xl bg-[#F8F6EE] border border-[#D9C9B2]/80 flex flex-col justify-between">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#D9C9B2]/60 flex items-center justify-center mb-2 shadow-2xs">
                    {item.icon}
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-[#556453] uppercase tracking-wider block">{item.label}</span>
                    <p className="text-xl md:text-2xl font-black text-[#2E3A2F] tracking-tight">{item.val}</p>
                    <span className="text-[9px] font-semibold text-[#6B7F5B]">{item.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Carta Bar Interaktif Menunjukkan Agihan Aktiviti Mengikut Minggu */}
            <div className="p-4 md:p-6 rounded-2xl bg-[#F8F6EE] border border-[#D9C9B2]/80 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-[#2E3A2F]">Aktiviti & Kertas Kerja Mengikut Minggu</span>
                <span className="text-[10px] font-semibold text-[#556453]">Semasa</span>
              </div>
              <div className="h-28 md:h-36 flex items-end justify-between gap-1.5 md:gap-3 px-1 md:px-4">
                {[35, 50, 45, 80, 55, 95, 65, 40, 85, 60, 75].map((h, i) => (
                  <div key={i} className="w-full h-full flex items-end justify-center">
                    <div
                      style={{ height: `${h}%` }}
                      className="w-full max-w-[1.75rem] bg-gradient-to-t from-[#6B7F5B]/30 to-[#6B7F5B] rounded-t-md hover:to-[#C96F4F] transition-colors duration-300"
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

// ── Showcase PolyMart Tulen Sepadan UI Sebenar (1:1 Screenshot Parity) ──
const RealPolyMartDeviceShowcase: React.FC = () => {
  return (
    <div className="relative w-full flex items-center justify-center py-6 px-2 overflow-hidden">
      {/* Halo Pencahayaan Estetik */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] h-[320px] bg-gradient-to-tr from-[#6B7F5B]/15 via-[#D9C9B2]/20 to-[#C96F4F]/10 rounded-full blur-[70px]" />
      </div>

      {/* Rangka Telefon Pintar Bersih & Megah (Tanpa Kad Bertindih) */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-full max-w-[285px] sm:max-w-[305px] rounded-[2.6rem] bg-[#1E261F] p-3 shadow-[0_30px_70px_-15px_rgba(46,58,47,0.35)] border-2 border-[#3A4A3B]"
      >
        {/* Skrin Telefon Tulen PolyMart */}
        <div className="rounded-[2.1rem] bg-[#FAFAF8] overflow-hidden flex flex-col border border-[#E5E7EB] text-[#1E261F] select-none text-left">
          
          {/* Status Bar */}
          <div className="pt-2 px-4 pb-1 flex items-center justify-between text-[10px] font-bold text-[#1E261F] bg-white border-b border-[#F0F0EE]">
            <span>9:41</span>
            <div className="w-14 h-3.5 bg-black rounded-full mx-auto" />
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span className="text-[8px] font-semibold">5G</span>
            </div>
          </div>

          {/* Bar Carian & Ikon Navigasi Pantas (Sepadan Gambar Sebenar) */}
          <div className="p-3 bg-white border-b border-[#F0F0EE] space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#556453]">
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </div>
              <div className="w-8 h-8 rounded-full bg-[#EA580C] text-white flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 h-8 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] flex items-center px-3 gap-1.5 text-[8.5px] text-[#9CA3AF]">
                <Search className="w-3 h-3 text-[#9CA3AF]" />
                <span className="truncate">Cari makanan, servis, pakaian...</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] flex items-center justify-center">
                <Store className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Kategori Tab (Semua, Makanan, Minuman, Aksesori) */}
            <div className="flex items-center gap-1.5 overflow-hidden text-[9px] font-bold">
              <div className="px-2.5 py-1 rounded-full bg-[#F59E0B] text-white flex items-center gap-1 shadow-xs">
                <div className="grid grid-cols-2 gap-0.5 w-2 h-2">
                  <div className="bg-white rounded-2xs" />
                  <div className="bg-white rounded-2xs" />
                  <div className="bg-white rounded-2xs" />
                  <div className="bg-white rounded-2xs" />
                </div>
                <span>Semua</span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#4B5563] flex items-center gap-1 border border-[#E5E7EB]">
                <Utensils className="w-2.5 h-2.5" />
                <span>Makanan</span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#4B5563] flex items-center gap-1 border border-[#E5E7EB]">
                <Coffee className="w-2.5 h-2.5" />
                <span>Minuman</span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#4B5563] flex items-center gap-1 border border-[#E5E7EB]">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Aksesori</span>
              </div>
            </div>
          </div>

          {/* Banner Kempen Rasmi PolyMart (Sepadan Gambar Sebenar) */}
          <div className="p-3 pb-2">
            <div className="rounded-2xl bg-gradient-to-br from-[#2E1D13] via-[#523420] to-[#7E5234] p-3 text-white shadow-xs relative overflow-hidden">
              <div className="flex items-center gap-1 text-[7.5px] font-black text-[#FDE68A] uppercase tracking-wider mb-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Pasar Mahasiswa POLISAS</span>
              </div>
              <h4 className="text-[12px] font-black leading-tight tracking-tight">
                Jelajah & Tempah Produk <span className="text-[#F59E0B]">Kampus Anda</span>
              </h4>
              <p className="text-[7.5px] text-[#D1D5DB] mt-1 line-clamp-1">
                Tempah produk terus dari usahawan mahasiswa POLISAS.
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <span className="px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-xs text-[7.5px] font-bold border border-white/10">
                  39 Produk
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-xs text-[7.5px] font-bold border border-white/10">
                  9 Peniaga
                </span>
              </div>
            </div>
          </div>

          {/* Bahagian Peniaga Aktif (Sepadan Gambar Sebenar) */}
          <div className="px-3 py-1">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1 text-[9.5px] font-black text-[#1E261F]">
                <div className="w-3.5 h-3.5 rounded-full bg-[#EA580C] text-white flex items-center justify-center">
                  <TrendingUp className="w-2 h-2" />
                </div>
                <span>Peniaga Aktif</span>
              </div>
              <span className="text-[8px] font-bold text-[#EA580C]">Lihat Semua &gt;</span>
            </div>

            <div className="flex items-center gap-2 overflow-hidden py-1">
              {[
                { name: 'QUADRA H', isLogo: true },
                { name: 'AL-FRIES', isLogo: false },
                { name: 'DTM3B', isLogo: false },
                { name: 'DBS3C', isLogo: false },
                { name: 'DAC4A', isLogo: false },
              ].map((v, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center border text-[8px] font-black shadow-2xs",
                    v.isLogo ? "bg-black text-[#D4AF37] border-black" : "bg-white text-[#EA580C] border-[#FDE68A]"
                  )}>
                    {v.isLogo ? 'QH' : <Store className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[7px] font-bold text-[#4B5563] truncate max-w-[36px]">{v.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grid Produk Sebenar PolyMart (CHICKEN POPCORN & Loaded Fries) */}
          <div className="px-3 pt-1 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1 text-[9.5px] font-black text-[#1E261F]">
                <Sparkles className="w-3 h-3 text-[#F59E0B]" />
                <span>Semua Produk (39)</span>
              </div>
              <span className="text-[8px] font-bold text-[#6B7280]">Terbaru ▾</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Kad Produk 1: CHICKEN POPCORN (QUADRA H) */}
              <div className="bg-white rounded-xl overflow-hidden border border-[#E5E7EB] shadow-2xs flex flex-col justify-between">
                <div className="aspect-[4/3] bg-[#F3F4F6] relative overflow-hidden">
                  <img
                    src="https://api.cipher-node.org/storage/v1/object/public/keusahawanan-products/b6eeabeb-7ce0-4f9a-becf-56eb30805139/1787944599182.jpeg"
                    alt="CHICKEN POPCORN"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-sm bg-black/60 backdrop-blur-xs text-white text-[6.5px] font-bold">
                    Makanan
                  </span>
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center text-[#9CA3AF]">
                    <Heart className="w-2.5 h-2.5" />
                  </div>
                </div>
                <div className="p-1.5">
                  <div className="flex items-center gap-1 text-[6.5px] text-[#6B7280]">
                    <Store className="w-2 h-2 text-[#EA580C]" />
                    <span>QUADRA H</span>
                  </div>
                  <h5 className="text-[8.5px] font-black text-[#1E261F] truncate mt-0.5">CHICKEN POPCORN</h5>
                  <p className="text-[9.5px] font-black text-[#EA580C] mt-1">RM 9.00</p>
                </div>
              </div>

              {/* Kad Produk 2: loaded fries original (AL-FRIES) */}
              <div className="bg-white rounded-xl overflow-hidden border border-[#E5E7EB] shadow-2xs flex flex-col justify-between">
                <div className="aspect-[4/3] bg-[#F3F4F6] relative overflow-hidden">
                  <img
                    src="https://api.cipher-node.org/storage/v1/object/public/keusahawanan-products/0d898ba3-1458-40c6-acb0-5db5c365986b/1786332337392.jpeg"
                    alt="loaded fries original"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-sm bg-black/60 backdrop-blur-xs text-white text-[6.5px] font-bold">
                    Makanan
                  </span>
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center text-[#9CA3AF]">
                    <Heart className="w-2.5 h-2.5" />
                  </div>
                </div>
                <div className="p-1.5">
                  <div className="flex items-center gap-1 text-[6.5px] text-[#6B7280]">
                    <Store className="w-2 h-2 text-[#EA580C]" />
                    <span>AL-FRIES</span>
                  </div>
                  <h5 className="text-[8.5px] font-black text-[#1E261F] truncate mt-0.5">loaded fries original</h5>
                  <p className="text-[9.5px] font-black text-[#EA580C] mt-1">RM 6.00</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Dock Navigation Tulen (Sepadan Gambar Sebenar) */}
          <div className="mt-auto px-4 py-2 bg-white/90 backdrop-blur-md border-t border-[#F0F0EE] flex items-center justify-between text-[#6B7280] relative">
            <div className="w-5 h-5 flex items-center justify-center text-[#1E261F]">
              <Store className="w-3.5 h-3.5" />
            </div>
            <Heart className="w-3.5 h-3.5" />
            <div className="w-7 h-7 rounded-full bg-[#991B1B] text-white flex items-center justify-center shadow-xs">
              <Plus className="w-4 h-4" />
            </div>
            <ShoppingCart className="w-3.5 h-3.5" />
            <div className="relative">
              <ShoppingBag className="w-3.5 h-3.5" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#EA580C] text-[6px] text-white flex items-center justify-center font-bold">4</div>
            </div>

            {/* Butang Chat Terapung di Bucu Kanan */}
            <div className="absolute -top-8 right-2 w-7 h-7 rounded-full bg-[#EA580C] text-white flex items-center justify-center shadow-md">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ── 5. Bento Section 5 Modul Estetik (<BentoSection />) ───────
export const BentoSection: React.FC<{ stats?: CampusStats }> = ({ stats: propStats }) => {
  const navigate = useNavigate();
  const internalStats = useCampusStats();
  const stats = propStats || internalStats;

  return (
    <section id="modul" className="py-24 md:py-32 px-4 md:px-6 max-w-7xl mx-auto relative z-20">
      {/* Header Seksyen */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 mb-16 md:mb-20">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#C96F4F]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#556453]">
              EKOSISTEM TERAS
            </span>
          </div>
          <h2 className="text-4xl sm:text-6xl md:text-[5rem] font-black tracking-tight text-[#2E3A2F] leading-[0.94]">
            Satu Ekosistem. <br />
            <span className="text-[#6B7F5B] font-semibold italic">Kawal Sepenuhnya.</span>
          </h2>
        </div>
        <p className="max-w-md text-sm md:text-base text-[#556453] font-medium leading-relaxed pb-2">
          Struktur modular yang direka khas untuk logik tadbir urus. Organisasikan keperluan kampus dalam kepantasan milisaat.
        </p>
      </div>

      {/* Grid Kad Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Kad 1: e-Aktiviti (Estetik & Workflow Kertas Kerja Sebenar) */}
        <SpotlightCard
          onClick={() => navigate('/portal')}
          className="p-8 md:p-10 flex flex-col justify-between h-full bg-white"
        >
          <div>
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#2E3A2F]/10 text-[#2E3A2F] shadow-xs">
                <Shield className="w-7 h-7" />
              </div>
              <div className="w-10 h-10 rounded-full border border-[#D9C9B2] flex items-center justify-center bg-[#F8F6EE] group-hover:bg-[#C96F4F] group-hover:text-white transition-colors">
                <ArrowUpRight className="w-4 h-4 text-[#2E3A2F] group-hover:text-white" />
              </div>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7F5B] block mb-1">
              Nadi Organisasi
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-[#2E3A2F] mb-3 tracking-tight">
              e-Aktiviti
            </h3>
            <p className="text-sm text-[#556453] font-medium leading-relaxed mb-6">
              Sistem tadbir urus rasmi untuk {stats.clubsCount} kelab & persatuan berdaftar POLISAS. Automasi kertas kerja dan pelaporan bulanan secara digital.
            </p>
          </div>

          {/* Pratonton Estetik: Penjejak Kertas Kerja & Kelab */}
          <div className="space-y-4 pt-4 border-t border-[#D9C9B2]/60">
            <div className="rounded-2xl bg-[#F8F6EE] border border-[#D9C9B2]/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#2E3A2F] text-white flex items-center justify-center text-[9px] font-black">
                    P
                  </div>
                  <span className="text-xs font-bold text-[#2E3A2F]">PePKa (Awam)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#6B7F5B]/15 text-[#2E3A2F] text-[9px] font-bold">
                  Diluluskan HEP
                </span>
              </div>
              
              <p className="text-[11px] font-bold text-[#556453]">Malam Apresiasi Siswa 2026</p>
              
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="h-1.5 w-full bg-[#6B7F5B] rounded-full" />
                  <span className="text-[8px] font-bold text-[#6B7F5B]">1. Semakan</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="h-1.5 w-full bg-[#6B7F5B] rounded-full" />
                  <span className="text-[8px] font-bold text-[#6B7F5B]">2. JPP OK</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="h-1.5 w-full bg-[#C96F4F] rounded-full animate-pulse" />
                  <span className="text-[8px] font-bold text-[#C96F4F]">3. Bajet RM2.5k</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-black text-[#2E3A2F]">{stats.clubsCount} Kelab Berdaftar</span>
              <span className="text-xs font-bold text-[#6B7F5B]">{stats.activitiesCount} Aktiviti Aktif</span>
            </div>
          </div>
        </SpotlightCard>

        {/* Kad 2: e-Keusahawanan (Estetik POS & Transaksi Gerai) */}
        <SpotlightCard
          onClick={() => navigate('/keusahawanan')}
          className="p-8 md:p-10 flex flex-col justify-between h-full bg-white"
        >
          <div>
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#6B7F5B]/10 text-[#6B7F5B] shadow-xs">
                <BarChart3 className="w-7 h-7" />
              </div>
              <div className="w-10 h-10 rounded-full border border-[#D9C9B2] flex items-center justify-center bg-[#F8F6EE] group-hover:bg-[#C96F4F] group-hover:text-white transition-colors">
                <ArrowUpRight className="w-4 h-4 text-[#2E3A2F] group-hover:text-white" />
              </div>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7F5B] block mb-1">
              Ekonomi Pintar
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-[#2E3A2F] mb-3 tracking-tight">
              e-Keusahawanan
            </h3>
            <p className="text-sm text-[#556453] font-medium leading-relaxed mb-6">
              Memperkasa usahawan siswa POLISAS dengan sistem POS digital terpadu, pengurusan inventori gerai, dan analitik jualan masa nyata.
            </p>
          </div>

          {/* Pratonton Estetik: Terminal Transaksi & Trend Jualan */}
          <div className="space-y-4 pt-4 border-t border-[#D9C9B2]/60">
            <div className="rounded-2xl bg-[#F8F6EE] border border-[#D9C9B2]/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#556453]">Jualan Sesi Ini</span>
                <span className="flex items-center gap-1 text-[9px] font-bold text-[#6B7F5B]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5B] animate-ping" />
                  Masa Nyata
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-[#2E3A2F]">RM 4,361.30</p>
                <span className="text-[10px] font-bold text-[#6B7F5B]">+18.4% jualan</span>
              </div>
              <div className="h-10 flex items-end justify-between gap-1 pt-1">
                {[30, 45, 60, 40, 95, 75, 50].map((h, idx) => (
                  <div key={idx} className="w-full flex flex-col items-center gap-1">
                    <div style={{ height: `${h}%` }} className="w-full rounded-t-sm bg-gradient-to-t from-[#6B7F5B]/30 to-[#6B7F5B]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-black text-[#2E3A2F]">{stats.productsCount}+ Produk Siswa</span>
              <span className="text-xs font-bold text-[#6B7F5B]">{stats.ordersCount}+ Pesanan Selesai</span>
            </div>
          </div>
        </SpotlightCard>

        {/* Kad 3: e-Akademik (Estetik Pengesahan Merit QR & Rekod Pelajar) */}
        <SpotlightCard
          onClick={() => navigate('/akademik')}
          className="p-8 md:p-10 flex flex-col justify-between h-full bg-white"
        >
          <div>
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#2E3A2F]/10 text-[#2E3A2F] shadow-xs">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div className="w-10 h-10 rounded-full border border-[#D9C9B2] flex items-center justify-center bg-[#F8F6EE] group-hover:bg-[#C96F4F] group-hover:text-white transition-colors">
                <ArrowUpRight className="w-4 h-4 text-[#2E3A2F] group-hover:text-white" />
              </div>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7F5B] block mb-1">
              Kecemerlangan Holistik
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-[#2E3A2F] mb-3 tracking-tight">
              e-Akademik
            </h3>
            <p className="text-sm text-[#556453] font-medium leading-relaxed mb-6">
              Semakan maklumat dan pengurusan rekod mahasiswa merentasi Jabatan Kejuruteraan Awam, Mekanikal, Elektrik, Perdagangan dan Teknologi Makanan.
            </p>
          </div>

          {/* Pratonton Estetik: Kad Merit Siswa & Pengimbas QR */}
          <div className="space-y-4 pt-4 border-t border-[#D9C9B2]/60">
            <div className="rounded-2xl bg-[#F8F6EE] border border-[#D9C9B2]/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#6B7F5B]/15 text-[#2E3A2F] flex items-center justify-center text-xs font-black">
                    MA
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#2E3A2F]">Muhammad Aiman</p>
                    <p className="text-[9px] text-[#556453]">04DAT24F1023 • Geomatik</p>
                  </div>
                </div>
                <QrCode className="w-5 h-5 text-[#2E3A2F]" />
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-[#556453]">Merit Kolej Kediaman</span>
                  <span className="text-[#2E3A2F]">85 / 100</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#D9C9B2]/50 overflow-hidden">
                  <div className="h-full w-[85%] rounded-full bg-[#6B7F5B]" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-black text-[#2E3A2F]">{stats.studentsCount.toLocaleString()}+ Rekod Siswa</span>
              <span className="text-xs font-bold text-[#6B7F5B]">5 Jabatan POLISAS</span>
            </div>
          </div>
        </SpotlightCard>

        {/* Kad 4: PolyMart (SHOWCASE UTAMA LEBAR 2-KOLUM SEPADAN DENGAN GAMBAR 3) */}
        <SpotlightCard
          onClick={() => navigate('/polymart')}
          className="p-8 md:p-12 flex flex-col justify-between h-full bg-white lg:col-span-2 overflow-hidden relative group"
        >
          {/* Header Kad */}
          <div className="flex items-start justify-between mb-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center bg-[#C96F4F]/15 text-[#C96F4F] shadow-xs">
                <ShoppingCart className="w-7 h-7 md:w-8 md:h-8" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7F5B] block">
                  PASAR MAHASISWA POLISAS
                </span>
                <h3 className="text-2xl md:text-3xl font-black text-[#2E3A2F] tracking-tight">
                  PolyMart Siswa
                </h3>
              </div>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-[#D9C9B2] flex items-center justify-center bg-[#F8F6EE] group-hover:bg-[#C96F4F] group-hover:text-white transition-colors">
              <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-[#2E3A2F] group-hover:text-white" />
            </div>
          </div>

          {/* Grid Penerangan & Mockup Skrin Sebenar PolyMart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10 flex-1">
            {/* Kiri: Penerangan & Statistik */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6">
              <p className="text-sm md:text-base text-[#556453] font-medium leading-relaxed">
                Platform e-dagang berpusat khas warga POLISAS. Sokong usahawan mahasiswa secara terus tanpa orang tengah untuk makanan sedap, minuman segar, dan cenderamata rasmi kampus.
              </p>

              <div className="space-y-3 py-4 border-y border-[#D9C9B2]/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#556453]">Produk Aktif Dalam Sistem:</span>
                  <span className="text-sm font-black text-[#2E3A2F]">39+ Menu Pilihan</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#556453]">Peniaga Siswa Berdaftar:</span>
                  <span className="text-sm font-black text-[#2E3A2F]">9 Gerai Aktif</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#556453]">Sistem Pembayaran:</span>
                  <span className="text-xs font-black text-[#6B7F5B]">JPP Pay & QR Terus</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-[#C96F4F] group-hover:translate-x-1.5 transition-transform">
                <span>Buka Pasaran Siswa Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Kanan: Mockup UI Sebenar Sepadan Gambar 3 Tanpa Clutter */}
            <div className="lg:col-span-7 flex justify-center items-center">
              <RealPolyMartDeviceShowcase />
            </div>
          </div>
        </SpotlightCard>

        {/* Kad 5: e-Kebajikan (Estetik Hab Prihatin & Bantuan Siswa) */}
        <SpotlightCard
          onClick={() => navigate('/kebajikan')}
          className="p-8 md:p-10 flex flex-col justify-between h-full bg-white"
        >
          <div>
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#6B7F5B]/10 text-[#6B7F5B] shadow-xs">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <div className="w-10 h-10 rounded-full border border-[#D9C9B2] flex items-center justify-center bg-[#F8F6EE] group-hover:bg-[#C96F4F] group-hover:text-white transition-colors">
                <ArrowUpRight className="w-4 h-4 text-[#2E3A2F] group-hover:text-white" />
              </div>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7F5B] block mb-1">
              Prihatin & Responsif
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-[#2E3A2F] mb-3 tracking-tight">
              e-Kebajikan
            </h3>
            <p className="text-sm text-[#556453] font-medium leading-relaxed mb-6">
              Sistem pelaporan aduan telus, bantuan Food Bank siswa, dan pemantauan penempatan kamsis serta kediaman luar kampus.
            </p>
          </div>

          {/* Pratonton Estetik: Hab Prihatin & Food Bank */}
          <div className="space-y-4 pt-4 border-t border-[#D9C9B2]/60">
            <div className="rounded-2xl bg-[#F8F6EE] border border-[#D9C9B2]/80 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2E3A2F]">Food Bank Siswa</span>
                <span className="px-2 py-0.5 rounded-full bg-[#6B7F5B]/15 text-[#2E3A2F] text-[9px] font-bold">
                  Aktif Hari Ini
                </span>
              </div>
              <p className="text-[10px] text-[#556453] font-medium leading-snug">
                Pek makanan percuma tersedia di Kamsis Semambu untuk asnaf & B40.
              </p>
              <div className="flex items-center gap-2 pt-1 text-[9px] font-bold text-[#6B7F5B]">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Pemantauan Zon Kediaman: Semambu & IM</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-black text-[#2E3A2F]">1,080+ Rekod Kediaman</span>
              <span className="text-xs font-bold text-[#6B7F5B]">Tindakan Pantas</span>
            </div>
          </div>
        </SpotlightCard>

      </div>
    </section>
  );
};

// ── 6. Enjin AI Pintar Nexus (<NexusAISection />) ─────────────
export const NexusAISection: React.FC = () => {
  return (
    <section id="nexus" className="py-24 md:py-36 px-4 md:px-6 bg-white border-y border-[#D9C9B2] relative z-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
        {/* Visual Nod AI */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative aspect-square max-w-lg mx-auto w-full flex items-center justify-center lg:order-2"
        >
          <div className="absolute inset-0 bg-[#6B7F5B]/10 rounded-full blur-[80px] pointer-events-none" />

          {/* Gelang Orbit */}
          <div className="w-[80%] h-[80%] rounded-full border border-[#D9C9B2] flex items-center justify-center relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-[#6B7F5B]/40"
            />

            {/* Teras Otak Pintar */}
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-[#2E3A2F] text-white flex items-center justify-center shadow-xl relative z-10">
              <BrainCircuit className="w-14 h-14 md:w-16 md:h-16 text-[#F8F6EE]" />
            </div>

            {/* Nod Terapung */}
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[12%] left-[12%] w-12 h-12 rounded-full bg-white border border-[#D9C9B2] flex items-center justify-center shadow-sm text-[#2E3A2F]"
            >
              <FileText className="w-5 h-5 text-[#2E3A2F]" />
            </motion.div>

            <motion.div
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-[16%] right-[16%] w-12 h-12 rounded-full bg-white border border-[#D9C9B2] flex items-center justify-center shadow-sm text-[#6B7F5B]"
            >
              <CheckCircle className="w-5 h-5 text-[#6B7F5B]" />
            </motion.div>
          </div>
        </motion.div>

        {/* Penerangan Nexus AI */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-6 md:space-y-8 lg:order-1"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F8F6EE] border border-[#D9C9B2]">
            <BrainCircuit className="w-4 h-4 text-[#C96F4F]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2E3A2F]">
              A.I Core Engine
            </span>
          </div>

          <h2 className="text-4xl sm:text-6xl md:text-[4.5rem] font-black tracking-tight text-[#2E3A2F] leading-[0.95]">
            Kepintaran Nexus <br />
            <span className="text-[#C96F4F]">Memperkasa Operasi.</span>
          </h2>

          <p className="text-sm md:text-base text-[#556453] font-medium leading-relaxed max-w-lg">
            Sistem dipacu LLM untuk menyemak kualiti kertas kerja aktiviti dan merumuskan sentimen mahasiswa secara pintar. Serahkan tugasan analitik kepada kepintaran sistem JPP.
          </p>

          <div className="grid grid-cols-2 gap-6 md:gap-8 pt-4 border-t border-[#D9C9B2]/60 mt-6">
            {[
              { label: 'Analisis Minit', desc: 'Sintaks Kewangan', icon: Activity },
              { label: 'Penjanaan', desc: 'Teks Automatik', icon: BookOpen },
              { label: 'Audit Semak', desc: 'Ralat Format', icon: Shield },
              { label: 'Pakar JPP', desc: 'Resolusi Isu 24/7', icon: Zap }
            ].map((f, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#F8F6EE] border border-[#D9C9B2]/80 flex items-center justify-center text-[#2E3A2F]">
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#2E3A2F]">{f.label}</h3>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#556453]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ── 7. Statistik & Impak Kampus (<StatsSection />) ────────────
export const StatsSection: React.FC<{ stats?: CampusStats }> = ({ stats: propStats }) => {
  const internalStats = useCampusStats();
  const stats = propStats || internalStats;

  return (
    <section id="statistik" className="py-24 md:py-32 bg-[#2E3A2F] text-white relative z-20">
      <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 md:divide-x divide-white/10">
        {[
          { label: 'Kelab Pemimpin Berdaftar', val: `${stats.clubsCount}` },
          { label: 'Mahasiswa Berdaftar Semasa', val: `${stats.studentsCount.toLocaleString()}+` },
          { label: 'Aktiviti & Kertas Kerja Dipantau', val: `${stats.activitiesCount}` },
          { label: 'Produk Siswa di PolyMart', val: `${stats.productsCount}+` }
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={`text-center space-y-2 md:space-y-3 ${i !== 0 && "md:pl-10"}`}
          >
            <p className="text-4xl md:text-6xl font-black text-[#F8F6EE] tracking-tight">{s.val}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#D9C9B2]">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

// ── 8. Banner Gerakan Tindakan (<CtaSection />) ───────────────
export const CtaSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 md:py-36 px-4 md:px-6 relative flex justify-center z-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="w-full max-w-5xl rounded-[2.5rem] md:rounded-[3.5rem] bg-white border border-[#D9C9B2] p-10 md:p-20 text-center space-y-6 md:space-y-8 relative overflow-hidden shadow-lg"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#6B7F5B]/10 rounded-full blur-[80px] pointer-events-none" />

        <h2 className="text-3xl md:text-6xl font-black tracking-tight text-[#2E3A2F] leading-[1.02] relative z-10">
          Gerakan Mahasiswa Bermula Di Sini.
        </h2>

        <p className="text-sm md:text-lg text-[#556453] max-w-xl mx-auto font-medium leading-relaxed relative z-10">
          Sertai portal pengurusan kampus bersepadu. Urus kelab, mohon kelulusan kertas kerja, dan pantau kebajikan anda.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 pt-4">
          <button
            onClick={() => navigate('/portal')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#C96F4F] hover:bg-[#B85F40] text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <span>Daftar / Log Masuk Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </section>
  );
};

// ── 9. Pengaki Halaman Rasmi (<Footer />) ──────────────────────
export const Footer: React.FC = () => (
  <footer className="w-full bg-[#F2EDE4] border-t border-[#D9C9B2] py-16 px-4 md:px-6 relative z-20">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-white border border-[#D9C9B2] p-1.5 flex items-center justify-center shadow-2xs">
          <img src="/jpp-logo.png" alt="JPP POLISAS" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col text-left">
          <span className="font-black text-sm tracking-tight text-[#2E3A2F]">JPP POLISAS</span>
          <span className="text-[9px] font-bold text-[#6B7F5B] uppercase tracking-wider">
            Jawatankuasa Perwakilan Pelajar Sesi Baharu
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6 text-xs font-semibold text-[#556453]">
        <a href="#ekosistem" onClick={(e) => { e.preventDefault(); scrollToSection('#ekosistem'); }} className="hover:text-[#2E3A2F] transition-colors">Ekosistem</a>
        <a href="#modul" onClick={(e) => { e.preventDefault(); scrollToSection('#modul'); }} className="hover:text-[#2E3A2F] transition-colors">Modul</a>
        <a href="#nexus" onClick={(e) => { e.preventDefault(); scrollToSection('#nexus'); }} className="hover:text-[#2E3A2F] transition-colors">Nexus AI</a>
        <a href="#statistik" onClick={(e) => { e.preventDefault(); scrollToSection('#statistik'); }} className="hover:text-[#2E3A2F] transition-colors">Statistik</a>
      </div>

      <p className="text-[10px] font-medium text-[#556453]">
        © 2026 JPP Digital Portal POLISAS. Hak Cipta Terpelihara.
      </p>
    </div>
  </footer>
);

// ── Komponen Utama Halaman Pendaratan (<LandingPage />) ────────
export const LandingPage: React.FC = () => {
  const stats = useCampusStats();

  return (
    <div className="min-h-screen bg-[#F8F6EE] text-[#2E3A2F] selection:bg-[#C96F4F] selection:text-white relative overflow-x-hidden">
      {/* 1. Bar Navigasi Kapsul Terapung */}
      <Navbar />

      {/* 2. Hero Berpusat & Mockup Dashboard Operasi */}
      <Hero stats={stats} />

      {/* 3. Ticker Tape Berputar */}
      <TickerTape stats={stats} />

      {/* 4. Seksyen Bento Modul (Termasuk Mockup Mudah Alih PolyMart) */}
      <BentoSection stats={stats} />

      {/* 5. Teras Kepintaran Buatan Nexus */}
      <NexusAISection />

      {/* 6. Statistik & Impak Sebenar Kampus */}
      <StatsSection stats={stats} />

      {/* 7. Gerakan Seruan Tindakan (CTA) */}
      <CtaSection />

      {/* 8. Pengaki Halaman Rasmi */}
      <Footer />
    </div>
  );
};

export default LandingPage;
