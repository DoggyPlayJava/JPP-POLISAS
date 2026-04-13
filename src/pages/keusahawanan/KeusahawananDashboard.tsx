import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { hexToRgba, getMalaysianNickname } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

import {
  Users, CalendarDays, Lightbulb, Award,
  ArrowUpRight, Activity, Briefcase, Star, ChevronRight,
  Eye, ShieldCheck,
} from 'lucide-react';


// ─── Stat Card — pakai bg-card (light/dark mode aware) ───
// ─── Data & Config ────────────────────────────────────────────────────────────
// ─── Sub-Components ───────────────────────────────────────────────────────────

function FeaturedActionCard({ icon: Icon, label, desc, onClick, primary = false, delay }: any) {
  const { color } = useExcoTheme();
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`relative w-full text-left rounded-[2rem] p-6 lg:p-8 flex flex-col justify-between overflow-hidden border transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl
        ${primary ? 'text-white' : 'bg-card border-border/50 hover:border-border'}`}
      style={primary ? { background: color, borderColor: hexToRgba(color, 0.4) } : {}}
      whileTap={{ scale: 0.98 }}
    >
      {primary && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-[50px] rounded-full pointer-events-none" />
      )}
      <div className="flex items-center justify-between mb-8 sm:mb-12">
        <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center shadow-sm 
          ${primary ? 'bg-white/20 text-white' : 'bg-muted/50 text-foreground border border-border'}`}
          style={!primary ? { color } : {}}
        >
          <Icon className="w-6 h-6 lg:w-7 lg:h-7" />
        </div>
        <ArrowUpRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 
          ${primary ? 'text-white/70' : 'text-muted-foreground/40'}`} />
      </div>
      <div>
        <h3 className={`font-black text-xl lg:text-2xl tracking-tight mb-2
          ${primary ? 'text-white' : 'text-foreground'}`}>{label}</h3>
        <p className={`text-[11px] lg:text-xs font-medium max-w-[80%] leading-relaxed
          ${primary ? 'text-white/80' : 'text-muted-foreground/60'}`}>{desc}</p>
      </div>
    </motion.button>
  );
}

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
  const navigate = useNavigate();
  const displayName = getMalaysianNickname(profile?.full_name);

  const [stats, setStats] = useState([
    { icon: CalendarDays, label: 'Program Aktif',     value: '-', sub: 'Memuat...', delay: 0.10 },
    { icon: Users,        label: 'Bisnes Berdaftar',  value: '-', sub: 'Memuat...', delay: 0.17 },
    { icon: Activity,     label: 'Sesi POS Aktif',    value: '-', sub: 'Memuat...', delay: 0.24 },
    { icon: Award,        label: 'Jualan Terkini',    value: '-', sub: 'Memuat...', delay: 0.31 },
  ]);
  const [latestPrograms, setLatestPrograms] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          { count: countActive },
          { count: countUpcoming },
          { count: countBusinesses },
          { count: countPendingBus },
          { count: countPosSessions },
          { data: recentSessions },
          { data: programs }
        ] = await Promise.all([
          supabase.from('keusahawanan_programs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('keusahawanan_programs').select('*', { count: 'exact', head: true }).eq('status', 'upcoming'),
          supabase.from('keusahawanan_businesses').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
          supabase.from('keusahawanan_businesses').select('*', { count: 'exact', head: true }).eq('status', 'PENDING_INTERVIEW'),
          supabase.from('business_sessions').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
          supabase.from('business_sessions').select('total_sales').eq('status', 'CLOSED').order('created_at', { ascending: false }).limit(50),
          supabase.from('keusahawanan_programs').select('*').order('created_at', { ascending: false }).limit(4)
        ]);

        const totalSales = (recentSessions || []).reduce((acc, s) => acc + (Number(s.total_sales) || 0), 0);

        setStats([
          { icon: CalendarDays, label: 'Program Aktif',     value: String(countActive || 0), sub: `${countUpcoming || 0} akan datang`, delay: 0.10 },
          { icon: Users,        label: 'Bisnes Berdaftar',  value: String(countBusinesses || 0), sub: `${countPendingBus || 0} pending`, delay: 0.17 },
          { icon: Activity,     label: 'Sesi POS Aktif',    value: String(countPosSessions || 0), sub: 'Sedang berjalan', delay: 0.24 },
          { icon: Award,        label: 'Jualan Terkini',    value: `RM ${totalSales.toFixed(2)}`, sub: 'Berdasarkan sesi lalu', delay: 0.31 },
        ]);

        if (programs) {
          setLatestPrograms(programs.map(p => ({
            id: p.id,
            icon: p.icon || '📌',
            title: p.title,
            date: p.date_label || 'Tiada Tarikh',
            status: p.status
          })));
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchData();
  }, []);

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

      {/* Featured Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8 sm:mt-12">
        <FeaturedActionCard 
          icon={Briefcase} label="Sistem POS" desc="Buka terminal jualan runcit & QR." 
          onClick={() => navigate('/keusahawanan/pos')} primary={true} delay={0.1} />
        <FeaturedActionCard 
          icon={Activity} label="Analitik Jualan" desc="Pantau prestasi jualan & kewangan." 
          onClick={() => navigate('/keusahawanan/pos/stats')} delay={0.2} />
        <FeaturedActionCard 
          icon={Lightbulb} label="Bisnes & Profil" desc="Semak status permohonan vendor." 
          onClick={() => navigate('/keusahawanan/urus-perniagaan')} delay={0.3} />
        <FeaturedActionCard 
          icon={CalendarDays} label="Urus Program" desc="Aktiviti dan geran keusahawanan." 
          onClick={() => navigate('/keusahawanan/program')} delay={0.4} />
      </div>

      {/* Dashboard Grid */}
      <div className="space-y-6 sm:space-y-8 mt-12">
        {/* Row 1: Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {stats.map((s, i) => <StatCard key={i} {...s} />)}
        </div>

        {/* Row 2: Programs */}
        <div className="rounded-[2rem] p-6 sm:p-8 md:p-10 bg-card border border-border/50 shadow-sm mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 rounded-full" style={{ background: color }} />
              <div>
                <h2 className="font-black text-lg uppercase tracking-wider text-foreground leading-tight">Program Terkini</h2>
                <p className="text-xs font-medium text-muted-foreground mt-1">Aktiviti & sesi e-keusahawanan terkini</p>
              </div>
            </div>
            <button onClick={() => navigate('/keusahawanan/program')} className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 group">
              Lihat Semua
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {latestPrograms.length > 0 ? (
              latestPrograms.map((p, i) => <ProgramRow key={i} p={p} i={i} />)
            ) : (
              <div className="col-span-full text-center py-16 bg-muted/20 border border-dashed rounded-2xl">
                 <CalendarDays className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                 <div className="text-muted-foreground/60 text-xs font-black uppercase tracking-widest">Tiada Program direkodkan</div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
