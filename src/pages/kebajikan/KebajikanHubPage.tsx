import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HeartHandshake,
  ShoppingBag,
  Plus,
  ClipboardList,
  BarChart3,
  QrCode,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  LayoutDashboard,
  Inbox,
  FileBarChart2,
  Clock,
  Sparkles,
  HelpCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function KebajikanHubPage() {
  const { isKebajikanExco, isKediamanExco, isSuperAdmin, isYdp } = useAuth();
  const isExcoOrStaff = isKebajikanExco || isKediamanExco || isSuperAdmin || isYdp;

  return (
    <div className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-7xl mx-auto transition-colors">
      {/* ── Hero Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-3xl mx-auto mb-10 md:mb-14"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 mb-4 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          Pusat Khidmat & Bantuan Siswa POLISAS
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15] mb-4">
          Pusat Kebajikan &amp; Bantuan Mahasiswa POLISAS
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
          Satu pintu rasmi Majlis Perwakilan Pelajar untuk menyalurkan aduan fasiliti kolej kediaman, kafeteria dan kebajikan siswa, serta memohon bantuan makanan Food Bank JPP secara telus, pantas dan bermaruah.
        </p>

        {/* Quick Highlights / Status Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>SLA Tindakan: <strong>24–48 Jam</strong></span>
          </div>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Bantuan Makanan: <strong>Bebas Yuran / Percuma</strong></span>
          </div>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Kerahsiaan &amp; Integriti Terjamin</span>
          </div>
        </div>
      </motion.div>

      {/* ── Two Primary Pillar Cards (Balanced Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-12">
        {/* Kad 1: Aduan & Kebajikan Kampus */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="group relative rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-teal-500/20 hover:border-teal-500/40 dark:hover:border-teal-400/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
          {/* Decorative Glow */}
          <div className="absolute -top-24 -right-24 w-52 h-52 bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

          <div>
            {/* Top row */}
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-inner group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                Sistem Aduan E-Kebajikan
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
              Aduan &amp; Kebajikan Kampus
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-normal">
              Saluran pantas untuk melaporkan isu fasiliti asrama, aduan harga dan kebersihan kafeteria, kebajikan pembelajaran, serta kecemasan siswa dengan pemantauan terus oleh Exco bertugas.
            </p>

            {/* Feature Checklist */}
            <div className="space-y-2.5 mb-6 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                <span>Tiket aduan dengan penjejakan status masa nyata</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                <span>Sembang langsung (chat) bersama Exco penyiasat &amp; PIC</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                <span>Sokongan eskalasi ke Unit Pengurusan Asrama &amp; JHEP</span>
              </div>
            </div>

            {/* Stat Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Tiket Diselesaikan: <strong>Ketelusan &amp; Rekod Terpelihara</strong></span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <Link to="/kebajikan/buat-aduan" className="w-full block">
              <Button className="w-full h-11 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 font-bold rounded-xl gap-2 shadow-sm transition-all group/btn">
                <Plus className="w-4 h-4" />
                <span>Buat Aduan Baharu</span>
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

        {/* Kad 2: Bantuan Food Bank JPP */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="group relative rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-amber-500/20 hover:border-amber-500/40 dark:hover:border-amber-400/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
          {/* Decorative Glow */}
          <div className="absolute -top-24 -right-24 w-52 h-52 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

          <div>
            {/* Top row */}
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                Inisiatif Prihatin Siswa
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
              Bantuan Food Bank JPP
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-normal">
              Inisiatif bantuan makanan asas dan pek nutrisi percuma untuk mahasiswa POLISAS yang memerlukan, dengan semakan had pendapatan isi rumah dan penjanaan pas pengambilan QR tanpa tunai.
            </p>

            {/* Feature Checklist */}
            <div className="space-y-2.5 mb-6 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span>Pek makanan asas percuma untuk golongan B40 &amp; asnaf</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span>Pas Pengambilan Digital berkod QR selamat</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span>Semakan kelayakan pantas &amp; penolakan stok inventori telus</span>
              </div>
            </div>

            {/* Default Distribution Location Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-[11px] font-semibold text-amber-900 dark:text-amber-200 mb-8">
              <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>Lokasi Agihan: <strong>Kaunter JHEP, Bangunan Pentadbiran</strong></span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <Link to="/kebajikan/foodbank" className="w-full block">
              <Button className="w-full h-11 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold rounded-xl gap-2 shadow-sm transition-all group/btn">
                <ShoppingBag className="w-4 h-4" />
                <span>Mohon Bantuan Makanan</span>
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

      {/* ── Exco & Staff Management Section (Conditional) ── */}
      {isExcoOrStaff && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-teal-500/30 shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-500/20 text-teal-300 text-[10px] font-black uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3 h-3 text-teal-400" />
                Akses Pentadbiran &amp; Majlis Tertinggi
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Pusat Kawalan E-Kebajikan &amp; Food Bank
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Panel pengurusan tindakan tiket aduan, agihan pegawai penyiasat, pemantauan lejar bajet dan stok Food Bank POLISAS.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {/* Dashboard Tiket */}
            <Link
              to="/kebajikan/dashboard"
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal-400/40 transition-all duration-200 group"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                Papan Pemuka Tiket
              </p>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Analitik tiket, beban staf dan pemantauan SLA aktif.
              </p>
            </Link>

            {/* Senarai Tiket */}
            <Link
              to="/kebajikan/tiket"
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal-400/40 transition-all duration-200 group"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Inbox className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                Senarai Tiket
              </p>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Tapis tiket masuk, kemas kini status dan eskalasi aduan.
              </p>
            </Link>

            {/* Pusat Kawalan Food Bank */}
            <Link
              to="/jpp/foodbank"
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 transition-all duration-200 group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                Pusat Kawalan Food Bank
              </p>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Verifikasi pas QR pengambilan, inventori dan audit lejar.
              </p>
            </Link>

            {/* Laporan Bulanan */}
            <Link
              to="/kebajikan/laporan"
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal-400/40 transition-all duration-200 group"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileBarChart2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                Laporan Bulanan
              </p>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Penjanaan ringkasan statistik PDF untuk HEP dan mesyuarat.
              </p>
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Komponen Awal / Placeholder Muka Depan Food Bank JPP
 * Digunakan untuk menyokong laluan `/kebajikan/foodbank` sebelum integrasi modul borang penuh.
 */
export function FoodBankPage() {
  return (
    <div className="w-full min-h-full px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-5xl mx-auto transition-colors">
      <div className="mb-6">
        <Link
          to="/kebajikan"
          className="inline-flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          <span>Kembali ke Hab Kebajikan</span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-6 sm:p-10 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-amber-500/20 shadow-sm relative overflow-hidden"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-800 dark:text-amber-300 mb-1">
              Bantuan Makanan Siswa POLISAS
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Food Bank JPP POLISAS
            </h1>
          </div>
        </div>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8 font-normal">
          Program Food Bank JPP menyediakan bantuan barangan keperluan makanan asas secara percuma kepada mahasiswa POLISAS yang memerlukan. Sistem pengagihan berasaskan pas QR memastikan agihan yang teratur, adil dan telus.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Kelayakan</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Terbuka kepada semua mahasiswa berdaftar POLISAS, khususnya daripada keluarga B40 dan berpendapatan rendah.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2 mb-2 text-teal-600 dark:text-teal-400 font-bold text-xs">
              <MapPin className="w-4 h-4" />
              <span>Pusat Agihan</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Kaunter Hal Ehwal Pelajar (JHEP), Aras Bawah Bangunan Pentadbiran Utama POLISAS.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <QrCode className="w-4 h-4" />
              <span>Pas Pengambilan QR</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Permohonan yang diluluskan akan menerima pas QR digital untuk diimbas semasa sesi serahan pek makanan.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Modul Permohonan Dalam Pengaktifan Sesi</p>
              <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                Borang permohonan atas talian dan semakan stok inventori sedang diselaraskan bersama pengurusan kaunter JHEP.
              </p>
            </div>
          </div>
          <Link to="/kebajikan">
            <Button className="h-9 px-4 text-xs font-bold bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 rounded-xl">
              Kembali ke Hab
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
