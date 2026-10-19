import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  ShoppingCart,
  HeartHandshake
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
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

// ── Modul Teras Kampus (Bento Grid 5 Ekosistem) ───────────────
const MODULES = [
  {
    id: 'ekpp',
    title: 'e-Aktiviti',
    subtitle: 'Nadi Organisasi',
    desc: 'Sistem tadbir urus rasmi untuk 21 kelab & persatuan berdaftar POLISAS. Automasi kertas kerja dan pelaporan bulanan secara digital.',
    icon: Shield,
    color: '#2E3A2F',
    accentColor: '#6B7F5B',
    path: '/portal',
    stats: ['21 Kelab Berdaftar', '41 Aktiviti Rasmi'],
    preview: (
      <div className="flex flex-col gap-2.5 p-4 md:p-6 h-full justify-center">
        {[
          { name: 'PePKa (Awam)', status: 'Diluluskan HEP', dot: '#6B7F5B' },
          { name: 'Robosas (Robotik)', status: 'Dalam Semakan', dot: '#C96F4F' },
          { name: 'ICS (Kerohanian)', status: 'Bajet Disahkan', dot: '#6B7F5B' }
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#D9C9B2]/80 shadow-2xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.dot }} />
            <span className="text-xs font-bold text-[#2E3A2F] truncate">{item.name}</span>
            <span className="ml-auto text-[9px] font-semibold text-[#6B7F5B] hidden sm:block">{item.status}</span>
          </div>
        ))}
      </div>
    )
  },
  {
    id: 'keusahawanan',
    title: 'e-Keusahawanan',
    subtitle: 'Ekonomi Pintar',
    desc: 'Memperkasa usahawan siswa POLISAS dengan sistem POS digital terpadu, pengurusan inventori gerai, dan analitik jualan masa nyata.',
    icon: BarChart3,
    color: '#6B7F5B',
    accentColor: '#C96F4F',
    path: '/keusahawanan',
    stats: ['270+ Produk Siswa', '340+ Pesanan Kampus'],
    preview: (
      <div className="flex items-end gap-2 p-4 md:p-6 h-full justify-center w-full">
        <div className="flex items-end justify-between w-full h-full pb-4">
          {[40, 70, 45, 90, 60, 80, 55].map((h, i) => (
            <motion.div
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: h / 100 }}
              transition={{ delay: 0.3 + (i * 0.1), duration: 0.8 }}
              className="w-4 md:w-6 lg:w-8 h-full origin-bottom bg-gradient-to-t from-[#6B7F5B]/30 to-[#6B7F5B] rounded-t-md shadow-xs"
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
    desc: 'Semakan maklumat dan pengurusan rekod mahasiswa merentasi Jabatan Kejuruteraan Awam, Mekanikal, Elektrik, Perdagangan dan Teknologi Makanan.',
    icon: GraduationCap,
    color: '#2E3A2F',
    accentColor: '#6B7F5B',
    path: '/akademik',
    stats: ['1,080+ Rekod Siswa', '5 Jabatan POLISAS'],
    preview: (
      <div className="flex items-center justify-center h-full relative">
        <div className="w-24 h-24 rounded-full border border-[#6B7F5B]/30 flex items-center justify-center bg-[#6B7F5B]/5 shadow-xs">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 rounded-full border-4 border-[#6B7F5B] border-t-transparent border-l-transparent"
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-[#2E3A2F]">4.00</span>
          <span className="text-[8px] font-bold text-[#6B7F5B] uppercase tracking-widest">HPNM</span>
        </div>
      </div>
    )
  },
  {
    id: 'polymart',
    title: 'PolyMart',
    subtitle: 'Pasaran Mahasiswa',
    desc: 'Platform e-dagang berpusat khas buat warga POLISAS. Sokong dan pesan makanan, minuman, serta cenderamata rasmi siswa dalam satu hab.',
    icon: ShoppingCart,
    color: '#C96F4F',
    accentColor: '#2E3A2F',
    path: '/polymart',
    stats: ['270+ Pilihan Menu & Barang', 'JPP Pay & QR Terus'],
    colSpan: 'lg:col-span-2',
    preview: (
      <div className="flex w-full h-full p-4 md:p-6 items-center justify-between overflow-hidden relative">
        {/* Bahagian Kiri: Ikon Utama PolyMart */}
        <div className="w-1/3 flex flex-col items-center justify-center relative z-10 pl-2 md:pl-6">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-[#C96F4F]/15 border border-[#C96F4F]/40 flex items-center justify-center shadow-xs mb-3"
          >
            <ShoppingCart className="w-8 h-8 md:w-10 md:h-10 text-[#C96F4F]" />
          </motion.div>
          <div className="h-2 w-16 bg-[#C96F4F]/30 rounded-full" />
        </div>

        {/* Bahagian Kanan: Senarai Transaksi Sebenar (CHICKEN POPCORN & Loaded Fries) */}
        <div className="w-2/3 flex flex-col gap-2.5 relative pr-2 md:pr-6">
          <div className="absolute left-0 top-[-20px] bottom-[-20px] w-px bg-gradient-to-b from-transparent via-[#C96F4F]/30 to-transparent" />
          {[
            { id: 1, name: 'CHICKEN POPCORN', vendor: 'QUADRA H', price: 'RM 9.00', status: 'Selesai' },
            { id: 2, name: 'loaded fries original', vendor: 'AL-FRIES', price: 'RM 6.00', status: 'Selesai' },
            { id: 3, name: 'Lanyard JPP POLISAS', vendor: 'Rasmi JPP', price: 'RM 15.00', status: 'Selesai' }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + (i * 0.2), duration: 0.5 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#D9C9B2]/80 ml-4 md:ml-6 shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-[#C96F4F]/15 flex items-center justify-center flex-shrink-0 text-[#C96F4F] font-black text-xs">
                #{item.id}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-[#2E3A2F] truncate">{item.name}</p>
                <p className="text-[9px] font-bold text-[#6B7F5B]">{item.vendor}</p>
              </div>
              <div className="text-right flex-shrink-0 hidden sm:block">
                <span className="text-xs font-black text-[#C96F4F] block">{item.price}</span>
                <span className="text-[8px] font-bold text-[#6B7F5B]">{item.status}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 'kebajikan',
    title: 'e-Kebajikan',
    subtitle: 'Prihatin & Responsif',
    desc: 'Sistem pelaporan aduan telus, bantuan Food Bank siswa, dan pemantauan penempatan kamsis serta kediaman luar kampus.',
    icon: HeartHandshake,
    color: '#6B7F5B',
    accentColor: '#2E3A2F',
    path: '/kebajikan',
    stats: ['1,080+ Rekod Kediaman', 'Tindakan Pantas'],
    preview: (
      <div className="flex items-center justify-center h-full relative w-full overflow-hidden">
        {/* Gelombang Radar */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 2.2, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-24 h-24 md:w-32 md:h-32 border-2 border-[#6B7F5B]/30 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 3.2, 1], opacity: [0.2, 0, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            className="absolute w-24 h-24 md:w-32 md:h-32 border border-[#6B7F5B]/20 rounded-full"
          />
        </div>

        <div className="relative z-10 w-20 h-20 md:w-28 md:h-28 rounded-full bg-white border border-[#6B7F5B]/40 flex items-center justify-center shadow-xs">
          <HeartHandshake className="w-10 h-10 md:w-14 md:h-14 text-[#6B7F5B]" />
        </div>

        {/* Nod Status Terapung */}
        <motion.div
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] right-[5%] md:right-[15%] w-16 h-12 md:w-20 md:h-16 rounded-xl bg-white border border-[#D9C9B2] flex flex-col items-center justify-center gap-1 shadow-2xs"
        >
          <div className="w-6 md:w-10 h-1.5 md:h-2 rounded-full bg-[#6B7F5B]" />
          <div className="w-10 md:w-14 h-1 md:h-1.5 rounded-full bg-[#D9C9B2]" />
        </motion.div>

        <motion.div
          animate={{ y: [10, -10, 10] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[10%] left-[5%] w-20 h-12 md:w-24 md:h-14 rounded-xl bg-white border border-[#D9C9B2] flex items-center justify-center gap-1.5 px-3 shadow-2xs"
        >
          <div className="w-2 h-2 rounded-full bg-[#C96F4F]" />
          <span className="text-[9px] font-bold text-[#2E3A2F]">Prihatin</span>
        </motion.div>
      </div>
    )
  }
];

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
  const { t } = useTranslation(['portal', 'common']);
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
              ? "bg-[#F8F6EE]/94  border-[#D9C9B2] shadow-[0_6px_25px_rgba(46,58,47,0.08)]"
              : "bg-white/85  border-[#D9C9B2]/80 shadow-xs"
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
              <span>{t('portal:explore_portal')}</span>
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
            className="fixed inset-x-4 top-24 z-40 p-6 rounded-3xl bg-[#F8F6EE]/98  border border-[#D9C9B2] md:hidden shadow-xl flex flex-col gap-3"
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
              {t('portal:explore_portal')}
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
  const { t } = useTranslation(['portal', 'common']);
  const navigate = useNavigate();
  const internalStats = useCampusStats();
  const stats = propStats || internalStats;

  return (
    <section className="relative min-h-[85vh] md:min-h-[92vh] flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden">
      {/* Sentuhan Latar Belakang Hangat */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none transform-gpu">
      </div>

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center">
        {/* Status Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#D9C9B2]  mb-8 md:mb-10 shadow-xs"
        >
          <div className="w-2 h-2 rounded-full bg-[#C96F4F] shadow-xs" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#2E3A2F]">
            {t('portal:portal_welcome')}
          </span>
        </motion.div>

        {/* Tipografi Utama Berpusat yang Gah */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl sm:text-6xl md:text-8xl xl:text-[7.5rem] font-black tracking-tight text-[#2E3A2F] mb-6 md:mb-8 pb-2 leading-[0.98]"
        >
          {t('portal:hero_title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm md:text-lg text-[#556453] max-w-2xl mx-auto font-medium leading-relaxed mb-10 md:mb-12 px-2"
        >
          {t('portal:hero_subtitle')}
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
            <span>{t('portal:explore_portal')}</span>
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

// ── 5. Bento Section 5 Modul Estetik & Kemas (<BentoSection />) ──
export const BentoSection: React.FC<{ stats?: CampusStats }> = ({ stats: propStats }) => {
  const { t } = useTranslation(['portal', 'common']);
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
              {t('portal:portal_select_module')}
            </span>
          </div>
          <h2 className="text-4xl sm:text-6xl md:text-[5rem] font-black tracking-tight text-[#2E3A2F] leading-[0.94]">
            {t('portal:features_heading')}
          </h2>
        </div>
        <p className="max-w-md text-sm md:text-base text-[#556453] font-medium leading-relaxed pb-2">
          {t('portal:features_desc')}
        </p>
      </div>

      {/* Grid Kad Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {MODULES.map((m: any) => (
          <SpotlightCard
            key={m.id}
            onClick={() => navigate(m.path)}
            className={cn("p-8 md:p-10 flex flex-col h-full bg-white", m.colSpan)}
          >
            {/* Bahagian Atas */}
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

            {/* Kandungan Penerangan */}
            <div className="flex-1 mb-8">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7F5B] block mb-2">
                {m.subtitle}
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-[#2E3A2F] mb-3 tracking-tight">
                {m.title}
              </h3>
              <p className="text-sm text-[#556453] font-medium leading-relaxed">
                {m.desc}
              </p>
            </div>

            {/* Bahagian Bawah: Preview & Metrik */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#D9C9B2]/60">
              <div className="rounded-2xl bg-[#F8F6EE] border border-[#D9C9B2]/70 aspect-[4/3] sm:aspect-square overflow-hidden relative">
                {m.preview}
              </div>
              <div className="flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-center gap-3 py-2 sm:py-0 sm:pl-4">
                {m.stats.map((s: string, idx: number) => (
                  <div key={idx} className="flex flex-col">
                    <span className="text-lg md:text-xl font-black text-[#2E3A2F] tracking-tight">{s.split(' ')[0]}</span>
                    <span className="text-[9px] font-bold text-[#556453] uppercase tracking-wider">{s.split(' ').slice(1).join(' ')}</span>
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
  const { t } = useTranslation(['portal', 'common']);
  const navigate = useNavigate();

  return (
    <section className="py-24 md:py-36 px-4 md:px-6 relative flex justify-center z-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="w-full max-w-5xl rounded-[2.5rem] md:rounded-[3.5rem] bg-white border border-[#D9C9B2] p-10 md:p-20 text-center space-y-6 md:space-y-8 relative overflow-hidden shadow-lg"
      >

        <h2 className="text-3xl md:text-6xl font-black tracking-tight text-[#2E3A2F] leading-[1.02] relative z-10">
          {t('portal:hero_title')}
        </h2>

        <p className="text-sm md:text-lg text-[#556453] max-w-xl mx-auto font-medium leading-relaxed relative z-10">
          {t('portal:hero_subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 pt-4">
          <button
            onClick={() => navigate('/portal')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#C96F4F] hover:bg-[#B85F40] text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <span>{t('portal:student_login')}</span>
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
            Majlis Perwakilan Pelajar Sesi Baharu
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
  const { t } = useTranslation(['portal', 'common']);
  const stats = useCampusStats();

  return (
    <div className="min-h-screen bg-[#F8F6EE] text-[#2E3A2F] selection:bg-[#C96F4F] selection:text-white relative overflow-x-hidden">
      {/* 1. Bar Navigasi Kapsul Terapung */}
      <Navbar />

      {/* 2. Hero Berpusat & Mockup Dashboard Operasi */}
      <Hero stats={stats} />

      {/* 3. Ticker Tape Berputar */}
      <TickerTape stats={stats} />

      {/* 4. Seksyen Bento Modul (5 Ekosistem Harmoni) */}
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
