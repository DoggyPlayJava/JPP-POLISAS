import React from 'react';
import { motion } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { hexToRgba, getMalaysianNickname } from '@/lib/utils';

import {
  Users, CalendarDays, Lightbulb, Award,
  ArrowUpRight, Activity, Briefcase, Star, ChevronRight,
  Eye, ShieldCheck,
} from 'lucide-react';


// ─── Stat Card — pakai bg-card (light/dark mode aware) ───
// ─── Data & Config ────────────────────────────────────────────────────────────

const STATS_CONFIG = [
  { icon: CalendarDays, label: 'Program Aktif',     value: '3',       sub: '2 akan datang', delay: 0.10 },
  { icon: Users,         label: 'Peserta',           value: '127',     sub: '+18 minggu ini', delay: 0.17 },
  { icon: Lightbulb,     label: 'Idea Diterima',     value: '24',      sub: '6 semakan',      delay: 0.24 },
  { icon: Award,         label: 'Geran',             value: 'RM 4.2k', sub: '2 aktif',        delay: 0.31 },
];

const PREVIEW_PROGRAMS = [
  { icon: '🚀', title: 'Bootcamp Usahawan Muda 2026',   date: '15 April 2026', status: 'upcoming' },
  { icon: '💼', title: 'Pameran Produk Pelajar — PITA', date: '22 April 2026', status: 'active' },
  { icon: '🧠', title: 'Workshop Pelan Perniagaan',      date: '5 Mac 2026',    status: 'completed' },
  { icon: '🏆', title: 'Pertandingan Idea Inovasi',      date: '1 Mei 2026',    status: 'upcoming' },
];

const QUICK_ACTIONS = [
  { icon: CalendarDays, label: 'Program Baharu' },
  { icon: Lightbulb,    label: 'Semak Idea' },
  { icon: Award,        label: 'Urus Geran' },
  { icon: Briefcase,    label: 'Jana Laporan' },
];

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, delay }: any) {
  const { color } = useExcoTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-[1.5rem] p-4 sm:p-6 overflow-hidden bg-card border border-border/50 hover:shadow-xl transition-all duration-300"
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] pointer-events-none opacity-30" style={{ background: color }} />
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg" 
          style={{ background: hexToRgba(color, 0.1), border: `1px solid ${hexToRgba(color, 0.15)}` }}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color }} />
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/30" />
      </div>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 text-muted-foreground/60 truncate">{label}</p>
      <p className="text-2xl sm:text-4xl font-black tracking-tight text-foreground leading-none">{value}</p>
      <p className="text-[9px] sm:text-[11px] font-medium mt-3 text-muted-foreground/40">{sub}</p>
    </motion.div>
  );
}

function ProgramRow({ p, i }: any) {
  const { color } = useExcoTheme();
  const statusStyle: any = {
    upcoming:  { bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', label: 'Akan Datang' },
    active:    { bg: hexToRgba(color, 0.1), color, label: 'Aktif' },
    completed: { bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground)/0.5)', label: 'Selesai' },
  };
  const s = statusStyle[p.status] ?? statusStyle.upcoming;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * i }}
      className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer group hover:bg-muted/50"
    >
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-base sm:text-lg flex-shrink-0 bg-muted/50 border border-border/30">
        {p.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-black truncate text-foreground leading-tight">{p.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{p.date}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter sm:tracking-normal" 
          style={{ background: s.bg, color: s.color }}>
          {s.label}
        </div>
        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground" />
      </div>
    </motion.div>
  );
}

// ─── Main Dashboard Component ────────────────────────────────────────────────

export function KeusahawananDashboard() {
  const { color }    = useExcoTheme();
  const { profile, isSuperAdmin } = useAuth();
  const displayName = getMalaysianNickname(profile?.full_name);

  return (
    <div className="min-h-full p-5 sm:p-8 md:p-12 space-y-8 md:space-y-12">
      
      {/* Admin Banner */}
      {isSuperAdmin && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3.5 px-6 py-4 rounded-[2rem] bg-amber-500/[0.03] border border-amber-500/20 backdrop-blur-xl">
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600/80">Admin Preview</p>
            <p className="text-[10px] text-amber-600/50 font-medium truncate">Modul ini dalam kawalan pentadbiran JPP.</p>
          </div>
          <Eye className="w-4 h-4 text-amber-500/30" />
        </motion.div>
      )}

      {/* Hero Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full" style={{ background: color }} />
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">Overview</p>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-foreground leading-[0.9]">
              Halo, <span style={{ color }}>{displayName}</span>
            </h1>
            <p className="text-sm md:text-base font-medium text-muted-foreground/60 max-w-sm">
              Pantau prestasi dan aktiviti keusahawanan Polisas hari ini.
            </p>
          </div>
          <div className="w-24 h-24 rounded-[2.5rem] hidden lg:flex items-center justify-center text-4xl bg-card border border-border shadow-2xl relative overflow-hidden group">
             <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ background: color }} />
             💡
          </div>
        </div>
      </motion.div>

      {/* Dashboard Grid */}
      <div className="space-y-6 sm:space-y-8">
        {/* Row 1: Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {STATS_CONFIG.map((s, i) => <StatCard key={i} {...s} />)}
        </div>

        {/* Row 2: Programs & Actions */}
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Programs Panel */}
          <div className="lg:col-span-2 rounded-[2rem] p-6 sm:p-8 bg-card border border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-4 rounded-full" style={{ background: color }} />
                <h2 className="font-black text-xs uppercase tracking-widest text-foreground">Program Terkini</h2>
              </div>
              <button className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all">
                Semua →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1">
              {PREVIEW_PROGRAMS.map((p, i) => <ProgramRow key={i} p={p} i={i} />)}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="space-y-6">
            <div className="rounded-[2rem] p-6 sm:p-8 bg-card border border-border/50 shadow-sm lg:sticky lg:top-8">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-4 h-4 opacity-40" style={{ color }} />
                <h2 className="font-black text-xs uppercase tracking-widest text-foreground leading-none">Tindakan Pantas</h2>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {QUICK_ACTIONS.map((a, i) => (
                  <button key={i}
                    className="flex items-center justify-between p-3.5 rounded-2xl transition-all hover:bg-muted/50 group active:scale-[0.97]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-background transition-colors">
                        <a.icon className="w-4 h-4 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/60 group-hover:text-foreground transition-colors">{a.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>

            {/* Quote Card */}
            <div className="rounded-[2rem] p-6 text-center border bg-card/40 backdrop-blur-sm shadow-sm"
              style={{ borderColor: hexToRgba(color, 0.1) }}
            >
              <Star className="w-5 h-5 mx-auto mb-3 opacity-30" style={{ color }} />
              <p className="text-[11px] font-black text-foreground italic leading-relaxed">
                "Usahawan berjaya bukan dilahirkan — mereka dibentuk."
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
