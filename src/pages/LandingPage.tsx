import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Flag, Users, CalendarDays, Shield, ArrowRight,
  CheckCircle2, Star, ChevronRight, TrendingUp,
  Sparkles, Banknote, FileCheck, BarChart3,
  CalendarRange, Cpu, Brain, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { ALL_CLUBS as STATIC_CLUBS } from '@/types';

const features = [
  {
    icon: Sparkles,
    title: 'Nexus AI Assistant',
    desc: 'Pembantu pintar yang tersedia 24/7 untuk menjawab soalan dan membantu urusan kelab anda.',
    badge: 'AI Powered',
  },
  {
    icon: Banknote,
    title: 'Smart Budgeting',
    desc: 'Penjana bajet automatik menggunakan AI untuk pengurusan kewangan yang lebih telus.',
    badge: 'Nexus Ecosystem',
  },
  {
    icon: FileCheck,
    title: 'AI Grammar Check',
    desc: 'Pastikan laporan aktiviti anda berkualiti tinggi dengan bantuan semakan tatabahasa AI.',
    badge: 'Nexus Ecosystem',
  },
  {
    icon: BarChart3,
    title: 'Analisis Prestasi',
    desc: 'Pantau pencapaian kelab dengan dashboard data yang dikuasakan oleh AI Nexus.',
    badge: 'Nexus Ecosystem',
  },
  {
    icon: CalendarRange,
    title: 'Laporan Automatik',
    desc: 'Kini laporan anda hanya dengan sekali klik!',
  },
  {
    icon: Shield,
    title: 'Akses Berstruktur',
    desc: 'Sistem RBAC dengan 4 peranan: Super Admin JPP, Presiden, MT dan Ahli Kelab.',
  },
];

export function LandingPage() {
  const [clubs, setClubs] = useState<any[]>(STATIC_CLUBS.length > 0 ? STATIC_CLUBS : []);

  useEffect(() => {
    async function fetchClubs() {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('name', { ascending: true });
      
      if (!error && data) {
        setClubs(data.map(c => ({
          id: c.id,
          name: c.name,
          shortName: c.short_name,
          category: c.category,
          color: c.theme_color,
          logo_url: c.logo_url
        })));
      }
    }
    fetchClubs();
  }, []);

  const stats = [
    { label: 'Kelab & Persatuan', value: `${clubs.length || 21}+` },
    { label: 'Ciri Dikuasakan AI', value: 'Nexus' },
    { label: 'Aktiviti Bulanan', value: 'Digital' },
    { label: 'Politeknik Sultan Haji Ahmad Shah', value: 'POLISAS' },
  ];
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Navbar ─────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center overflow-hidden shadow-lg">
              <img src="/jpp-logo.png" alt="JPP" className="w-7 h-7 object-contain" />
            </div>
            <div className="leading-tight">
              <span className="font-black text-sm text-primary tracking-tight">e-KPP</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-accent/80 block -mt-0.5">JPP Polisas</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="rounded-xl font-bold text-xs uppercase tracking-widest h-9 px-5">
                Log Masuk
              </Button>
            </Link>
            <Link to="/login">
              <Button className="rounded-xl font-bold text-xs uppercase tracking-widest h-9 px-5 bg-primary text-primary-foreground shadow-lg shadow-primary/20 glow-accent">
                Daftar
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-32 px-6 lg:px-12">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/6 rounded-full blur-[120px] -mr-80 -mt-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/8 rounded-full blur-[100px] -ml-40 pointer-events-none" />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, hsl(0 67% 32%) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-8 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] bg-accent/12 text-accent border border-accent/20">
              Platform Digital JPP Polisas
            </Badge>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
              <span className="text-primary">e-KPP</span>
              <br />
              <span className="text-foreground/80">Kelab, Persatuan</span>
              <br />
              <span className="text-accent">& Perpaduan</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed mb-10">
              Sistem pengurusan digital untuk <strong className="text-primary font-black">Jawatankuasa Perwakilan Pelajar (JPP)</strong> Politeknik Sultan Haji Ahmad Shah.
              Urus semua kelab dan persatuan JPP Polisas dalam satu platform yang tersusun.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login">
                <Button size="lg"
                  className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 gap-3">
                  Eksplorasi Nexus
                  <Sparkles className="w-5 h-5 fill-white/20" />
                </Button>
              </Link>
              <div className="flex items-center gap-2 h-14 px-6 rounded-2xl border border-border/60 bg-muted/30">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sistem Beroperasi</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────── */}
      <section className="py-16 px-6 lg:px-12 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-rose-900 opacity-50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/15 rounded-full blur-[100px] -mr-40 -mt-40" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="text-center">
                <p className="text-4xl md:text-5xl font-black text-white tracking-tighter">{s.value}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mt-2">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-accent/12 text-accent border-none">
              Ciri-ciri Utama
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
              Semua yang anda perlukan
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto font-medium">
              Direka khas untuk keperluan pengurusan kelab dan persatuan JPP Polisas.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }} whileHover={{ y: -6 }}>
                <Card className="bento-card border-none h-full group overflow-hidden relative">
                  {f.badge && (
                    <div className="absolute top-4 right-4 group-hover:scale-105 transition-transform">
                      <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                        {f.badge}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-7">
                    <div className="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-primary/15 transition-all duration-300 shadow-sm">
                      <f.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-black text-lg tracking-tight mb-2 flex items-center gap-2">
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground/80 leading-relaxed font-medium">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Clubs Grid ─────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-accent/12 text-accent border-none">
              {clubs.length > 0 ? `${clubs.length} Kelab & Persatuan` : 'Memuat Senarai...'}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
              Kelab yang Berdaftar
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {clubs.map((club, i) => (
              <motion.div key={club.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }} viewport={{ once: true }} whileHover={{ y: -4, scale: 1.03 }}>
                <Card className="bento-card border-none text-center group cursor-default overflow-hidden">
                  <div className="h-1 w-full" style={{ backgroundColor: club.color }} />
                  <CardContent className="p-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs mx-auto mb-2 shadow-sm overflow-hidden bg-muted/20"
                      style={{ backgroundColor: club.logo_url ? 'transparent' : club.color }}>
                      {club.logo_url ? (
                        <img src={club.logo_url} alt={club.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        club.shortName?.slice(0, 2) || '?'
                      )}
                    </div>
                    <p className="font-black text-xs tracking-tight leading-tight">{club.name}</p>
                    <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-0.5">{club.category}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ──────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <Badge className="mb-4 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-accent/12 text-accent border-none">
              Sistem Peranan
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
              4 Peringkat Akses
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { role: 'SUPER_ADMIN_JPP', label: 'Super Admin JPP', desc: 'Akses penuh ke semua kelab dan data JPP Polisas.', color: 'bg-rose-500' },
              { role: 'CLUB_PRESIDENT', label: 'Presiden Kelab', desc: 'Urus aktiviti, ahli dan maklumat kelab anda.', color: 'bg-amber-500' },
              { role: 'CLUB_MT', label: 'MT Kelab', desc: 'Tambah dan kemaskini aktiviti kelab.', color: 'bg-blue-500' },
              { role: 'CLUB_MEMBER', label: 'Ahli Kelab', desc: 'Lihat aktiviti dan maklumat kelab.', color: 'bg-slate-400' },
            ].map((r, i) => (
              <motion.div key={r.role} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                <Card className="bento-card border-none h-full overflow-hidden relative">
                  <div className={`h-1.5 w-full absolute top-0 ${r.color}`} />
                  <CardContent className="p-6 pt-8">
                    <div className={`w-10 h-10 rounded-xl ${r.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-black text-sm tracking-tight mb-1.5">{r.label}</h3>
                    <p className="text-xs text-muted-foreground/70 leading-relaxed">{r.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nexus Ecosystem (New) ────────────────── */}
      <section className="py-24 px-6 lg:px-12 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <Badge className="bg-primary text-primary-foreground border-none font-black text-[10px] tracking-[0.2em] uppercase px-4 py-1.5 shadow-lg shadow-primary/20">
                Nexus Ecosystem
              </Badge>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-[1.1]">
                Enjin AI yang Menggerakkan <span className="text-primary">Masa Hadapan</span>
              </h2>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                Platform e-KPP bukan sekadar sistem pengurusan biasa. Dengan integrasi bot Nexus, setiap langkah pentadbiran kelab dipermudahkan melalui kecerdasan buatan.
              </p>
              <div className="space-y-4">
                {[
                  { title: 'Generatif & Adaptif', desc: 'Sistem belajar dari corak aktiviti kelab anda.' },
                  { title: 'Automasi Penuh', desc: 'Dari laporan bulanan hingga tugasan harian anda.' },
                  { title: 'Telus & Selamat', desc: 'Memastikan integriti data setiap kelab terpelihara.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-black text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative z-10 aspect-square rounded-[3rem] overflow-hidden border-8 border-background shadow-2xl bg-card flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                <Cpu className="w-32 h-32 text-primary animate-bounce duration-[3000ms]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="absolute border border-primary/20 rounded-full animate-ping"
                      style={{ width: `${(i + 1) * 100}px`, height: `${(i + 1) * 100}px`, animationDuration: `${2 + i}s` }} />
                  ))}
                </div>
              </div>
              {/* Floating blobs for Nexus look */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section className="py-32 px-6 lg:px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/4 to-primary/8 pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10 space-y-8">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight">
            Sedia untuk bermula?
          </h2>
          <p className="text-lg text-muted-foreground font-medium">
            Daftar sekarang dan mula mengurus kelab anda dengan lebih efisien.
          </p>
          <Link to="/login">
            <Button size="lg"
              className="h-16 px-14 rounded-2xl bg-primary text-primary-foreground font-black text-base uppercase tracking-widest shadow-2xl shadow-primary/30 glow-accent transition-all hover:scale-105 active:scale-95">
              Daftar Sekarang
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="py-16 px-6 lg:px-12 border-t border-border/30 bg-muted/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center overflow-hidden">
              <img src="/jpp-logo.png" alt="JPP" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <p className="font-black text-sm text-primary tracking-tight">e-KPP JPP Polisas</p>
              <p className="text-[10px] font-medium text-muted-foreground/50">Kelab · Persatuan · Perpaduan</p>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
            © 2026 e-KPP JPP Polisas. Hak cipta terpelihara.
          </p>
        </div>
      </footer>
    </div>
  );
}
