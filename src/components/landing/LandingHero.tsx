import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  Users,
  Compass,
  Laptop,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CampusStats } from './landingTypes';
import { scrollToLandingSection } from './LandingNavbar';

interface LandingHeroProps {
  stats: CampusStats;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ stats }) => {
  const { t } = useTranslation(['portal', 'common']);
  const navigate = useNavigate();
  const [phoneView, setPhoneView] = useState<'polymart' | 'polymaps'>('polymart');

  return (
    <section id="hero" className="relative min-h-[92vh] flex flex-col items-center justify-center pt-24 md:pt-32 pb-16 overflow-hidden bg-gradient-to-b from-[#F8F6EE] via-[#F8F6EE] to-[#F2EDE4]/70">
      {/* OpenLearning Inspired Ambient Atmospheric Glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[480px] bg-gradient-to-tr from-[#6B7F5B]/15 via-[#C96F4F]/12 to-[#D9C9B2]/25 rounded-full blur-xl pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-72 h-72 bg-[#6B7F5B]/10 rounded-full blur-xl pointer-events-none hidden md:block" />
      <div className="absolute top-1/3 right-10 w-72 h-72 bg-[#C96F4F]/10 rounded-full blur-xl pointer-events-none hidden md:block" />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center">
        {/* Institutional Eyebrow Tag (Single-line on mobile, sleek & non-wrapping) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/90 border border-[#D9C9B2] text-[#2E3A2F] text-[10px] sm:text-xs font-semibold tracking-wide mb-3 sm:mb-4 shadow-2xs backdrop-blur-xs max-w-[94vw] sm:max-w-none"
        >
          <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-[#6B7F5B] flex-shrink-0" />
          <span className="font-bold text-[#2E3A2F] flex-shrink-0">POLISAS &bull;</span>
          <span className="text-[#556453] truncate sm:whitespace-normal">
            {t('portal:hero_title', 'Ekosistem Digital Kampus & Super App Pelajar')}
          </span>
        </motion.div>

        {/* Master Punchy Headline (Responsive scale: airy on mobile, dramatic on desktop) */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl sm:text-5xl md:text-6xl lg:text-[5.5rem] font-black tracking-tight text-[#2E3A2F] mb-3 sm:mb-6 leading-[1.08] sm:leading-[0.98] max-w-4xl text-balance"
        >
          <span>Satu Kampus. </span>
          <span className="text-[#C96F4F]">Satu Ekosistem Pintar.</span>
        </motion.h1>

        {/* Subtitle Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xs sm:text-base md:text-lg text-[#556453] max-w-2xl mx-auto font-medium leading-relaxed mb-4 sm:mb-8 px-2"
        >
          {t(
            'portal:hero_subtitle',
            'Platform berpusat rasmi Majlis Perwakilan Pelajar POLISAS: mengintegrasikan aktiviti kelab, keusahawanan PolyMart, rekod akademik, dan kebajikan mahasiswa dalam satu gerbang pantas.'
          )}
        </motion.p>

        {/* CTA Actions Group (Compact, breathable mobile spacing) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto px-2 sm:px-0 mb-4 sm:mb-6"
        >
          <button
            onClick={() => navigate('/portal')}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-[#C96F4F] hover:bg-[#B85F40] text-white font-black uppercase text-xs tracking-widest transition-all duration-300 flex items-center justify-center gap-2 sm:gap-2.5 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <span>{t('portal:explore_portal', 'Terokai Portal Pelajar')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => scrollToLandingSection('#hari-kampus')}
            className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white border border-[#D9C9B2] text-[#2E3A2F] hover:bg-[#F2EDE4] font-bold sm:font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 shadow-2xs active:scale-95 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-[#6B7F5B]" />
            <span>{t('portal:landing_explore_campus_day', 'Jelajah Hari Kampus')}</span>
          </button>
        </motion.div>

        {/* ── MOBILE-ONLY DECLUTTERED PROOF STRIP (Zero Visual Slop, Airy & High-End) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="sm:hidden flex flex-col items-center gap-2 w-full mt-1 px-2"
        >
          {/* Compact Social Proof Line */}
          <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-[#2E3A2F]">
            <div className="flex -space-x-1">
              {['FA', 'NR', 'AI'].map((name, idx) => (
                <div
                  key={idx}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white ring-1 ring-white bg-[#6B7F5B]"
                >
                  {name}
                </div>
              ))}
            </div>
            <span className="font-bold text-[#2E3A2F]">
              {t('portal:landing_community_proof', '1,080+ Mahasiswa POLISAS Aktif')}
            </span>
            <span className="text-[#C96F4F] font-bold">★ 4.9</span>
          </div>

          {/* Minimal Dot-Separated Departments String */}
          <div className="text-[10px] font-bold text-[#6B7F5B] uppercase tracking-wider flex items-center justify-center gap-1.5 flex-wrap">
            <span>JKA</span>
            <span className="text-[#D9C9B2]">&bull;</span>
            <span>JKM</span>
            <span className="text-[#D9C9B2]">&bull;</span>
            <span>JKE</span>
            <span className="text-[#D9C9B2]">&bull;</span>
            <span>JP</span>
            <span className="text-[#D9C9B2]">&bull;</span>
            <span>JTMK</span>
          </div>
        </motion.div>

        {/* ── DESKTOP/TABLET RICH COMMUNITY STACK (Hidden on mobile to eliminate clutter) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="hidden sm:flex flex-wrap items-center justify-center gap-3 sm:gap-5 mt-2 px-4 py-2.5 rounded-2xl bg-white/90 border border-[#D9C9B2] shadow-2xs backdrop-blur-xs"
        >
          {/* Stacked Student Avatar Circles + Siswa Aktif */}
          <div className="flex items-center gap-2.5 pr-2 sm:pr-4 border-b sm:border-b-0 sm:border-r border-[#D9C9B2]/70 pb-2 sm:pb-0">
            <div className="flex -space-x-2">
              {[
                { name: 'FA', bg: 'bg-[#6B7F5B]' },
                { name: 'NR', bg: 'bg-[#C96F4F]' },
                { name: 'AI', bg: 'bg-[#2E3A2F]' },
                { name: 'ZK', bg: 'bg-[#D9C9B2] text-[#2E3A2F]' },
              ].map((av, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white ring-2 ring-white shadow-2xs font-mono",
                    av.bg
                  )}
                >
                  {av.name}
                </div>
              ))}
            </div>
            <div className="text-left text-xs">
              <span className="font-black text-[#2E3A2F] block leading-tight">
                {t('portal:landing_community_proof', '1,080+ Mahasiswa POLISAS Aktif')}
              </span>
              <span className="text-[10px] font-bold text-[#6B7F5B] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6B7F5B] animate-pulse" />
                <span>{t('portal:landing_chip_active_students', '1,080+ Siswa Aktif')}</span>
              </span>
            </div>
          </div>

          {/* PolyMart Live Orders Proof */}
          <div className="flex items-center gap-2.5 pl-0 sm:pl-1">
            <div className="w-7 h-7 rounded-xl bg-[#C96F4F]/15 flex items-center justify-center text-[#C96F4F]">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <div className="text-left text-xs">
              <span className="font-black text-[#2E3A2F] block leading-tight">
                {t('portal:landing_chip_polymart_direct', 'Pesanan PolyMart Terus')}
              </span>
              <span className="text-[10px] font-bold text-[#C96F4F] flex items-center gap-1">
                <span>★ 4.9</span>
                <span className="text-[#556453] font-medium">• {`${stats.ordersCount}+ ${t('portal:landing_badge_orders_completed', 'Pesanan Selesai')}`}</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── DESKTOP/TABLET 5 ACADEMIC FACULTIES RIBBON (Hidden on mobile, represented cleanly above) ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="hidden sm:flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 text-[#556453]"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7F5B]">
            {t('portal:landing_academic_departments', '5 Jabatan Akademik:')}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-[#2E3A2F]">
            <span className="px-2.5 py-1 rounded-lg bg-white/80 border border-[#D9C9B2] hover:border-[#6B7F5B] transition-colors shadow-2xs">
              JKA (Awam)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/80 border border-[#D9C9B2] hover:border-[#6B7F5B] transition-colors shadow-2xs">
              JKM (Mekanikal)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/80 border border-[#D9C9B2] hover:border-[#6B7F5B] transition-colors shadow-2xs">
              JKE (Elektrik)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/80 border border-[#D9C9B2] hover:border-[#6B7F5B] transition-colors shadow-2xs">
              JP (Perdagangan)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/80 border border-[#D9C9B2] hover:border-[#6B7F5B] transition-colors shadow-2xs">
              JTMK (InfoTech)
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── DUAL PERSPECTIVE DEVICE SHOWCASE (Laptop + Overlapping Smartphone) ── */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="w-full max-w-6xl px-4 sm:px-6 md:px-8 mt-8 md:mt-10 relative z-10"
      >
        <div className="relative mx-auto flex items-center justify-center">

          {/* 1. ANGLED LAPTOP FRAME */}
          <div className="w-full max-w-4xl bg-[#2E3A2F] rounded-t-2xl sm:rounded-t-3xl pt-3 px-3 sm:pt-4 sm:px-4 shadow-[0_25px_70px_rgba(46,58,47,0.18)] border border-[#2E3A2F]/40 transform-gpu transition-all">
            {/* Laptop Screen Header / Browser Bar */}
            <div className="bg-[#232C24] rounded-t-xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between border-b border-[#2E3A2F]">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#C96F4F]" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#D9C9B2]" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#6B7F5B]" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#2E3A2F] text-[10px] sm:text-xs text-[#D9C9B2] font-mono">
                <Laptop className="w-3 h-3 text-[#6B7F5B]" />
                <span>portal.jpp-polisas.edu.my</span>
              </div>
              <div className="text-[10px] text-[#6B7F5B] font-bold hidden sm:block">
                HD v2.9
              </div>
            </div>

            {/* Laptop Display Screen */}
            <div className="relative aspect-[16/10] bg-[#F8F6EE] overflow-hidden rounded-b-lg border-x border-b border-[#232C24]">
              <img
                src="/GAMBAR/Portal View Laptop.png"
                alt="JPP POLISAS Portal Desktop View"
                className="w-full h-full object-cover object-top"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2E3A2F]/10 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Laptop Bottom Base Groove */}
            <div className="h-3 sm:h-4 bg-[#1F2720] rounded-b-xl flex items-center justify-center">
              <div className="w-16 sm:w-24 h-1 bg-[#2E3A2F] rounded-full" />
            </div>
          </div>

          {/* 2. OVERLAPPING SMARTPHONE FRAME (Dynamic Island + Switcher) */}
          <div className="absolute -bottom-6 -right-2 sm:-right-4 md:right-4 w-[160px] sm:w-[210px] md:w-[260px] z-20 transform-gpu rotate-[-2deg] hover:rotate-0 transition-transform duration-300">
            <div className="bg-[#1F2720] p-2 sm:p-2.5 rounded-[2rem] sm:rounded-[2.75rem] shadow-[0_20px_50px_rgba(46,58,47,0.25)] border-2 border-[#D9C9B2]/60">
              {/* Dynamic Island Screen Header */}
              <div className="relative aspect-[9/19.5] bg-black rounded-[1.6rem] sm:rounded-[2.25rem] overflow-hidden">
                {/* Dynamic Island Pill */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-4 bg-black rounded-full z-30 flex items-center justify-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2E3A2F]" />
                  <div className="w-2 h-2 rounded-full bg-[#6B7F5B]/60" />
                </div>

                {/* Phone Image Screenshot */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={phoneView}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="w-full h-full"
                  >
                    <img
                      src={
                        phoneView === 'polymart'
                          ? '/GAMBAR/Polymart View Phone.png'
                          : '/GAMBAR/Polymap View Phone.png'
                      }
                      alt={phoneView === 'polymart' ? 'PolyMart Phone View' : 'PolyMap Phone View'}
                      className="w-full h-full object-cover object-top"
                      loading="eager"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Floating View Switcher at bottom of phone */}
                <div className="absolute bottom-2.5 inset-x-2 z-30 flex items-center justify-center">
                  <div className="bg-[#2E3A2F]/90 backdrop-blur-md p-1 rounded-full border border-white/20 flex gap-1 shadow-lg">
                    <button
                      onClick={() => setPhoneView('polymart')}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all",
                        phoneView === 'polymart'
                          ? "bg-[#C96F4F] text-white shadow-2xs"
                          : "text-[#D9C9B2] hover:text-white"
                      )}
                    >
                      PolyMart
                    </button>
                    <button
                      onClick={() => setPhoneView('polymaps')}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold transition-all",
                        phoneView === 'polymaps'
                          ? "bg-[#6B7F5B] text-white shadow-2xs"
                          : "text-[#D9C9B2] hover:text-white"
                      )}
                    >
                      PolyMaps
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. FLOATING AMBIENT LIVE METRIC PILLS */}
          {/* Badge 1: PolyMart Orders (Top Right) */}
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="hidden sm:flex absolute -top-4 right-6 md:right-16 z-30 items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-[#D9C9B2] shadow-[0_8px_25px_rgba(46,58,47,0.12)]"
          >
            <div className="w-8 h-8 rounded-xl bg-[#C96F4F]/15 flex items-center justify-center text-[#C96F4F]">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7F5B] block leading-none">
                {t('portal:landing_badge_polymart_campus', 'PolyMart Kampus')}
              </span>
              <span className="text-sm font-black text-[#2E3A2F] tracking-tight">
                {`${stats.ordersCount}+ ${t('portal:landing_badge_orders_completed', 'Pesanan Selesai')}`}
              </span>
            </div>
          </motion.div>

          {/* Badge 2: Registered Clubs (Top Left) */}
          <motion.div
            animate={{ y: [4, -4, 4] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            className="hidden sm:flex absolute -top-2 left-4 md:left-12 z-30 items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-[#D9C9B2] shadow-[0_8px_25px_rgba(46,58,47,0.12)]"
          >
            <div className="w-8 h-8 rounded-xl bg-[#6B7F5B]/15 flex items-center justify-center text-[#6B7F5B]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7F5B] block leading-none">
                {t('portal:landing_badge_governance', 'Tadbir Urus')}
              </span>
              <span className="text-sm font-black text-[#2E3A2F] tracking-tight">
                {`${stats.clubsCount} ${t('portal:landing_badge_registered_clubs', 'Kelab Berdaftar')}`}
              </span>
            </div>
          </motion.div>

          {/* Badge 3: Verified Students (Bottom Left) */}
          <motion.div
            animate={{ y: [-3, 3, -3] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
            className="hidden md:flex absolute -bottom-4 left-8 md:left-20 z-30 items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-[#D9C9B2] shadow-[0_8px_25px_rgba(46,58,47,0.12)]"
          >
            <div className="w-8 h-8 rounded-xl bg-[#2E3A2F]/10 flex items-center justify-center text-[#2E3A2F]">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7F5B] block leading-none">
                {t('portal:landing_badge_student_body', 'Warga Siswa')}
              </span>
              <span className="text-sm font-black text-[#2E3A2F] tracking-tight">
                {`${stats.studentsCount.toLocaleString()}+ ${t('portal:landing_badge_student_records', 'Rekod Siswa')}`}
              </span>
            </div>
          </motion.div>


        </div>
      </motion.div>
    </section>
  );
};

export default LandingHero;
