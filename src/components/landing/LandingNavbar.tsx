import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X, Sparkles } from 'lucide-react';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { cn } from '@/lib/utils';

export const scrollToLandingSection = (id: string, offset = 80) => {
  if (typeof window === 'undefined') return;
  const cleanId = id.replace('#', '');
  const element = document.getElementById(cleanId);
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  }
};

export const LandingNavbar: React.FC = () => {
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
    { label: t('portal:nav_ecosystem', 'Ekosistem'), href: '#ekosistem' },
    { label: t('portal:nav_campus_life', 'Hari Kampus'), href: '#hari-kampus' },
    { label: t('portal:nav_main_modules', 'Modul Utama'), href: '#modul' },
    { label: t('portal:nav_nexus_ai', 'Nexus AI'), href: '#nexus' },
    { label: t('portal:nav_statistics', 'Statistik'), href: '#statistik' },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 flex justify-center px-3 sm:px-4 md:px-6",
          isScrolled ? "py-2 sm:py-2.5 md:py-2.5" : "py-2.5 sm:py-4 md:py-6"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between w-full max-w-6xl px-3 sm:px-4 md:px-6 py-1.5 sm:py-2.5 md:py-3 rounded-full border transition-all duration-500 backdrop-blur-md",
            isScrolled
              ? "bg-[#F8F6EE]/95 border-[#D9C9B2] shadow-[0_8px_30px_rgba(46,58,47,0.08)]"
              : "bg-white/95 border-[#D9C9B2]/80 shadow-xs"
          )}
        >
          {/* Logo JPP POLISAS & Branding - Clean, slim, no redundant AI capsule */}
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center p-1 sm:p-1.5 rounded-xl md:rounded-2xl bg-[#F8F6EE] border border-[#D9C9B2] overflow-hidden relative shadow-2xs group-hover:scale-105 transition-transform duration-300">
              <img
                src="/jpp-logo.png"
                alt="JPP Logo"
                className="w-full h-full object-contain relative z-10"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.src.includes('GAMBAR')) {
                    img.src = '/GAMBAR/Logo Rasmi JPP.png';
                  }
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-[#2E3A2F] text-xs sm:text-sm md:text-base leading-none">
                JPP POLISAS
              </span>
              <span className="hidden sm:block text-[8px] md:text-[9px] font-bold text-[#6B7F5B] uppercase tracking-widest leading-none mt-1">
                {t('portal:smart_system_new_session', 'Sistem Pintar Sesi Baharu')}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Shortcuts */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollToLandingSection(item.href)}
                className="text-xs font-semibold text-[#556453] hover:text-[#2E3A2F] transition-colors cursor-pointer tracking-wide"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right Action Cluster: Language Switcher + Desktop CTA + Mobile Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            {/* Global Language Switcher */}
            <LanguageToggle className="rounded-full bg-[#F8F6EE] border border-[#D9C9B2] text-[#2E3A2F] hover:bg-[#D9C9B2]/30 px-2 sm:px-2.5 h-8 md:h-9" />

            {/* Desktop-only Explore CTA - Hidden on mobile to keep navbar slim & elegant */}
            <button
              onClick={() => navigate('/portal')}
              className="hidden md:flex px-5 py-2.5 rounded-full bg-[#C96F4F] hover:bg-[#B85F40] text-white text-xs font-bold uppercase tracking-wider items-center gap-2 shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>{t('portal:landing_explore_portal', t('portal:explore_portal', 'Terokai Portal'))}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              className="md:hidden w-8 h-8 rounded-full bg-[#F8F6EE] border border-[#D9C9B2] flex items-center justify-center text-[#2E3A2F] hover:bg-[#D9C9B2]/20 transition-colors cursor-pointer"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={t('portal:landing_toggle_nav', 'Buka menu navigasi')}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Backdrop & Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-30 bg-black/30 backdrop-blur-xs md:hidden"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-3 sm:inset-x-4 top-14 sm:top-20 z-40 p-5 sm:p-6 rounded-3xl bg-[#F8F6EE]/98 backdrop-blur-xl border border-[#D9C9B2] md:hidden shadow-2xl flex flex-col gap-2"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#D9C9B2]/60 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7F5B]">
                  {t('portal:landing_quick_nav', 'Navigasi Pantas')}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#2E3A2F]">
                  <Sparkles className="w-3 h-3 text-[#C96F4F]" />
                  {t('portal:landing_student_superapp', 'Superapp Mahasiswa')}
                </span>
              </div>

              {navLinks.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    scrollToLandingSection(item.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left py-2.5 px-3 rounded-xl text-sm font-bold text-[#2E3A2F] hover:bg-white/80 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-[#6B7F5B]">→</span>
                </button>
              ))}

              {/* Mobile Drawer Full CTA */}
              <button
                onClick={() => {
                  navigate('/portal');
                  setIsMobileMenuOpen(false);
                }}
                className="mt-3 w-full py-3.5 rounded-2xl bg-[#C96F4F] hover:bg-[#B85F40] text-white text-xs font-black uppercase tracking-widest text-center shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <span>{t('portal:landing_enter_student_portal', t('portal:explore_portal', 'Masuk Portal Pelajar'))}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default LandingNavbar;
