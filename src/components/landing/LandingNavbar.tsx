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
          isScrolled ? "pt-[calc(0.5rem+var(--sat,env(safe-area-inset-top,0px)))] pb-2 sm:pt-2.5 sm:pb-2.5 md:py-2.5" : "pt-[calc(0.625rem+var(--sat,env(safe-area-inset-top,0px)))] pb-2.5 sm:py-4 md:py-6"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between w-full max-w-6xl px-3 sm:px-4 md:px-6 py-1.5 sm:py-2.5 md:py-3 rounded-full border transition-all duration-500",
            isScrolled
              ? "bg-[#F6FBF9] border-[#B8E4DC] shadow-[0_8px_30px_rgba(11,36,32,0.08)]"
              : "bg-white border-[#B8E4DC]/80 shadow-xs"
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
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center p-1 sm:p-1.5 rounded-xl md:rounded-2xl bg-[#F6FBF9] border border-[#B8E4DC] overflow-hidden relative shadow-2xs group-hover:scale-105 transition-transform duration-300">
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
              <span className="font-black tracking-tight text-[#0B2420] text-xs sm:text-sm md:text-base leading-none">
                JPP POLISAS
              </span>
              <span className="hidden xl:block text-[10px] font-medium text-[#0F766E] tracking-tight leading-none mt-0.5 whitespace-nowrap">
                {t('portal:smart_system_new_session', 'Sistem Pintar Sesi Baharu')}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Shortcuts */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-7 whitespace-nowrap">
            {navLinks.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollToLandingSection(item.href)}
                className="text-xs font-semibold text-[#3B635C] hover:text-[#0B2420] transition-colors cursor-pointer tracking-wide whitespace-nowrap"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right Action Cluster: Language Switcher + Desktop CTA + Mobile Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
            {/* Global Language Switcher */}
            <LanguageToggle className="rounded-full bg-[#F6FBF9] border border-[#B8E4DC] text-[#0B2420] hover:bg-[#B8E4DC]/30 px-2 sm:px-2.5 h-8 md:h-9" />

            {/* Desktop-only Button-in-Button Island CTA */}
            <button
              type="button"
              onClick={() => navigate('/portal')}
              className="hidden lg:flex pl-4 pr-1.5 py-1.5 rounded-full bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold items-center gap-2.5 shadow-[0_8px_20px_-6px_rgba(15,118,110,0.45)] transition-[transform,background-color,box-shadow] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] group cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{t('portal:landing_explore_portal', t('portal:explore_portal', 'Terokai Portal'))}</span>
              <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="lg:hidden w-9 h-9 rounded-full bg-[#F6FBF9] border border-[#B8E4DC] flex items-center justify-center text-[#0B2420] hover:bg-[#B8E4DC]/20 transition-colors cursor-pointer"
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
              className="fixed inset-0 z-30 bg-black/30 lg:hidden"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-3 sm:inset-x-4 top-14 sm:top-20 z-40 p-5 sm:p-6 rounded-3xl bg-[#F6FBF9] border border-[#B8E4DC] lg:hidden shadow-2xl flex flex-col gap-2"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#B8E4DC]/60 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#0D9488]">
                  {t('portal:landing_quick_nav', 'Navigasi Pantas')}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#0B2420]">
                  <Sparkles className="w-3 h-3 text-[#0F766E]" />
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
                  className="text-left py-2.5 px-3 rounded-xl text-sm font-bold text-[#0B2420] hover:bg-white transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-[#0D9488]">→</span>
                </button>
              ))}

              {/* Mobile Drawer Full CTA */}
              <button
                type="button"
                onClick={() => {
                  navigate('/portal');
                  setIsMobileMenuOpen(false);
                }}
                className="mt-3 w-full pl-5 pr-2 py-2.5 rounded-full bg-[#0F766E] hover:bg-[#115E59] text-white text-sm font-semibold text-center shadow-md flex items-center justify-between active:scale-[0.98] transition-[transform,background-color] duration-200 cursor-pointer"
              >
                <span className="flex-1 text-center">{t('portal:landing_enter_student_portal', t('portal:explore_portal', 'Masuk Portal Pelajar'))}</span>
                <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default LandingNavbar;
