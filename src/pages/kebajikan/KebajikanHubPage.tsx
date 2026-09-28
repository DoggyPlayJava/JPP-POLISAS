/**
 * KebajikanHubPage.tsx
 * Hab E-Kebajikan & Bantuan Siswa POLISAS
 * 
 * Direka bentuk dengan estetik Minimalis Eksekutif (Linear/Apple-style):
 * - Hero ringkas berimpak tinggi, bebas teks generik AI yang sesak
 * - 2 Kad Utama Berkualiti Tinggi: Aduan & Fasiliti (Teal) dan Food Bank JPP (Amber)
 * - Lencana SLA & Status Dinamik masa nyata
 * - Jalur Akses Pantas Pegawai/Exco yang elegan
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HeartHandshake,
  ShoppingBag,
  Plus,
  ClipboardList,
  BarChart3,
  QrCode,
  ArrowRight,
  ShieldCheck,
  LayoutDashboard,
  Inbox,
  FileBarChart2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { loadLocalFoodBankSettings } from '@/lib/foodbankDefaults';
import { cn } from '@/lib/utils';

export function KebajikanHubPage() {
  const { isKebajikanExco, isKediamanExco, isSuperAdmin, isYdp } = useAuth();
  const isExcoOrStaff = isKebajikanExco || isKediamanExco || isSuperAdmin || isYdp;

  const [isFoodBankActive, setIsFoodBankActive] = useState<boolean>(false);

  useEffect(() => {
    async function checkFoodBankStatus() {
      try {
        const { data, error } = await supabase
          .from('foodbank_settings')
          .select('is_module_active, is_application_open')
          .limit(1)
          .maybeSingle();

        if (error || !data) {
          const local = loadLocalFoodBankSettings();
          setIsFoodBankActive(local.is_module_active ?? false);
        } else {
          setIsFoodBankActive(data.is_module_active ?? false);
        }
      } catch {
        const local = loadLocalFoodBankSettings();
        setIsFoodBankActive(local.is_module_active ?? false);
      }
    }
    checkFoodBankStatus();
  }, []);

  return (
    <div className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-6xl mx-auto transition-colors">
      {/* ── Minimalist Executive Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-center max-w-2xl mx-auto mb-10 md:mb-12"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 mb-3 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          Majlis Perwakilan Pelajar POLISAS
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
          Hab E-Kebajikan & Bantuan Siswa
        </h1>

        <p className="mt-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
          Penyelesaian aduan prasarana kampus dan permohonan pakej bantuan makanan Food Bank JPP secara telus dan pantas.
        </p>
      </motion.div>

      {/* ── 2 Primary Pillar Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-12">
        {/* Kad 1: Aduan & Fasiliti Kampus */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="group relative rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-teal-500/20 hover:border-teal-500/40 dark:hover:border-teal-400/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
          {/* Subtle Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />

          <div className="relative z-10">
            {/* Header Strip */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-inner group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
                <Clock className="w-3.5 h-3.5" />
                SLA &lt; 24 Jam
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Aduan & Fasiliti Kampus
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal mb-8">
              Salurkan isu kamsis, kafeteria, dan kemudahan pembelajaran terus kepada barisan Exco Kebajikan &amp; Pengurusan Asrama dengan sembang langsung dan notifikasi status.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="relative z-10 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <Link to="/kebajikan/buat-aduan" className="w-full block">
              <Button className="w-full h-11 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 font-bold rounded-xl gap-2 shadow-sm transition-all group/btn">
                <Plus className="w-4 h-4" />
                <span>Hantar Aduan Baharu</span>
                <ArrowRight className="w-4 h-4 ml-auto transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </Link>

            <div className="grid grid-cols-2 gap-2">
              <Link to="/kebajikan/aduan-saya">
                <Button
                  variant="outline"
                  className="w-full h-10 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl text-xs gap-1.5"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Aduan Saya</span>
                </Button>
              </Link>
              <Link to="/kebajikan/statistik">
                <Button
                  variant="outline"
                  className="w-full h-10 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl text-xs gap-1.5"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Statistik Awam</span>
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Kad 2: Food Bank JPP */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="group relative rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-amber-500/20 hover:border-amber-500/40 dark:hover:border-amber-400/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
          {/* Subtle Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />

          <div className="relative z-10">
            {/* Header Strip */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border",
                isFoodBankActive
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              )}>
                <Sparkles className="w-3.5 h-3.5" />
                {isFoodBankActive ? 'Pendaftaran Dibuka' : 'Dalam Persediaan'}
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Food Bank JPP
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal mb-8">
              Bantuan pakej makanan asas dan keperluan harian percuma bagi mahasiswa POLISAS dengan kuota rakan serumah automatik dan Pas Pengambilan Digital (QR).
            </p>
          </div>

          {/* Action CTAs */}
          <div className="relative z-10 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <Link to="/kebajikan/foodbank" className="w-full block">
              <Button className="w-full h-11 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold rounded-xl gap-2 shadow-sm transition-all group/btn">
                <ShoppingBag className="w-4 h-4" />
                <span>{isFoodBankActive ? 'Mohon Bantuan Makanan' : 'Semak Info & Katalog Persediaan'}</span>
                <ArrowRight className="w-4 h-4 ml-auto transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </Link>

            <Link to="/kebajikan/foodbank" className="w-full block">
              <Button
                variant="outline"
                className="w-full h-10 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl text-xs gap-2"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Semak Pas Pengambilan QR Saya</span>
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ── Subtle Staff & Exco Management Strip (Only for Staff/Exco) ── */}
      {isExcoOrStaff && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Pusat Pengurusan Pegawai &amp; Exco
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Link
              to="/kebajikan/dashboard"
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-teal-500/30 transition-all flex items-center gap-2.5 text-xs font-semibold text-slate-200"
            >
              <LayoutDashboard className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="truncate">Papan Pemuka Tiket</span>
            </Link>

            <Link
              to="/kebajikan/tiket"
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-teal-500/30 transition-all flex items-center gap-2.5 text-xs font-semibold text-slate-200"
            >
              <Inbox className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="truncate">Senarai Tiket Aduan</span>
            </Link>

            <Link
              to="/jpp/foodbank"
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-400/40 transition-all flex items-center gap-2.5 text-xs font-semibold text-amber-200"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Pusat Kawalan Food Bank</span>
            </Link>

            <Link
              to="/kebajikan/laporan"
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-teal-500/30 transition-all flex items-center gap-2.5 text-xs font-semibold text-slate-200"
            >
              <FileBarChart2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="truncate">Laporan Statistik</span>
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
