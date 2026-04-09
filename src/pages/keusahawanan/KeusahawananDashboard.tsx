import React from 'react';
import { motion } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { hexToRgba } from '@/lib/utils';

import {
  Users, CalendarDays, Lightbulb, Award,
  ArrowUpRight, Activity, Briefcase, Star, ChevronRight,
  Eye, ShieldCheck,
} from 'lucide-react';


// ─── Stat Card — pakai bg-card (light/dark mode aware) ───
function StatCard({ icon: Icon, label, value, sub, delay }: {
  icon: any; label: string; value: string; sub: string; delay: number;
}) {
  const { color } = useExcoTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl p-5 overflow-hidden bg-card border border-border"
    >
      {/* Glow latar sahaja — sangat subtle */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] pointer-events-none" style={{ background: hexToRgba(color, 0.06) }} />
      <div className="flex items-start justify-between mb-4">
        {/* Icon bulat bertema warna */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: hexToRgba(color, 0.1) }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground/40" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-muted-foreground">{label}</p>
      <p className="text-3xl font-black tracking-tight text-foreground">{value}</p>
      <p className="text-[11px] font-medium mt-1 text-muted-foreground/70">{sub}</p>
    </motion.div>
  );
}

// ─── Program Row ───
function ProgramCard({ program, index }: { program: any; index: number }) {
  const { color } = useExcoTheme();
  const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
    upcoming:  { bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', label: 'Akan Datang' },
    active:    { bg: hexToRgba(color, 0.1), color, label: 'Sedang Berjalan' },
    completed: { bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground)/0.5)', label: 'Selesai' },
  };
  const s = statusStyle[program.status] ?? statusStyle.upcoming;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index }}
      className="flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer group hover:bg-muted/50"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-muted">
        {program.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate text-foreground">{program.title}</p>
        <p className="text-[11px] text-muted-foreground">{program.date}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase" style={{ background: s.bg, color: s.color }}>
          {s.label}
        </div>
        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
      </div>
    </motion.div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────
export function KeusahawananDashboard() {
  const { color } = useExcoTheme();
  const { profile, isSuperAdmin } = useAuth();

  const stats = [
    { icon: CalendarDays, label: 'Program Aktif',     value: '3',       sub: '2 akan datang bulan ini', delay: 0.10 },
    { icon: Users,         label: 'Peserta Berdaftar', value: '127',     sub: '+18 minggu ini',           delay: 0.17 },
    { icon: Lightbulb,     label: 'Idea Diterima',     value: '24',      sub: '6 dalam semakan',          delay: 0.24 },
    { icon: Award,         label: 'Geran Diluluskan',  value: 'RM 4.2k', sub: '2 permohonan aktif',      delay: 0.31 },
  ];

  const programs = [
    { icon: '🚀', title: 'Bootcamp Usahawan Muda 2026',   date: '15 April 2026', status: 'upcoming' },
    { icon: '💼', title: 'Pameran Produk Pelajar — PITA', date: '22 April 2026', status: 'active' },
    { icon: '🧠', title: 'Workshop Pelan Perniagaan',      date: '5 Mac 2026',    status: 'completed' },
    { icon: '🏆', title: 'Pertandingan Idea Inovasi',      date: '1 Mei 2026',    status: 'upcoming' },
  ];

  const displayName = profile?.full_name?.split(' ')[0] || 'Pengguna';

  return (
    // Tiada background di sini — inherit bg-background dari Layout
    <div className="min-h-full p-4 sm:p-6 md:p-8 space-y-6">

      {/* Banner Pratonton Admin */}
      {isSuperAdmin && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50"
        >
          <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Mod Pratonton Admin</p>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/60 font-medium">Modul belum diaktifkan untuk pengguna am.</p>
          </div>
          <Eye className="w-4 h-4 text-amber-500/50 flex-shrink-0" />
        </motion.div>
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {/* Vertikal bar berwarna — tanda ekslusif exco */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-5 rounded-full" style={{ background: color }} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">e-Keusahawanan</p>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              Selamat Datang,{' '}
              <span style={{ color }}>{displayName}</span>
            </h1>
            <p className="text-sm mt-1 text-muted-foreground">
              Inovasi · Keusahawanan · Pembangunan Bakat Pelajar
            </p>
          </div>
          {/* Ikon dekor */}
          <div className="w-14 h-14 rounded-2xl hidden md:flex items-center justify-center text-2xl bg-muted border border-border shadow-sm">
            💡
          </div>
        </div>
      </motion.div>

      {/* Stat Cards — bg-card */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Grid Bawah */}
      <div className="grid md:grid-cols-3 gap-5">

        {/* Program Terkini — bg-card */}
        <div className="md:col-span-2 rounded-2xl p-5 bg-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {/* Bar kecil berwarna untuk tajuk section */}
              <div className="w-1 h-4 rounded-full" style={{ background: color }} />
              <h2 className="font-black text-sm text-foreground">Program Keusahawanan</h2>
            </div>
            <button className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
              Lihat Semua →
            </button>
          </div>
          <div className="space-y-1">
            {programs.map((p, i) => <ProgramCard key={i} program={p} index={i} />)}
          </div>
        </div>

        {/* Panel Kanan */}
        <div className="space-y-4">
          {/* Tindakan Pantas — bg-card */}
          <div className="rounded-2xl p-5 bg-card border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4" style={{ color }} />
              <h2 className="font-black text-sm text-foreground">Tindakan Pantas</h2>
            </div>
            <div className="space-y-1">
              {[
                { icon: CalendarDays, label: 'Tambah Program Baharu' },
                { icon: Lightbulb,    label: 'Semak Cadangan Idea' },
                { icon: Award,        label: 'Urus Permohonan Geran' },
                { icon: Briefcase,    label: 'Jana Laporan' },
              ].map((a, i) => (
                <button key={i}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                >
                  <a.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                  <span className="text-xs font-semibold">{a.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Moto — subtle colored card */}
          <div
            className="rounded-2xl p-4 text-center border"
            style={{ background: hexToRgba(color, 0.05), borderColor: hexToRgba(color, 0.15) }}
          >
            <Star className="w-5 h-5 mx-auto mb-2" style={{ color }} />
            <p className="text-xs font-black text-foreground leading-relaxed">"Usahawan berjaya bukan dilahirkan — mereka dibentuk."</p>
            <p className="text-[10px] mt-2 text-muted-foreground">— Moto e-Keusahawanan JPP Polisas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
