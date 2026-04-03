import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Flag, Users, CalendarDays, Shield, ArrowRight,
  CheckCircle2, Star, ChevronRight, TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ALL_CLUBS } from '@/types';

const features = [
  {
    icon: Flag,
    title: 'Pengurusan Kelab',
    desc: 'Urus semua 17 kelab dan persatuan JPP Polisas dalam satu platform yang tersusun.',
  },
  {
    icon: CalendarDays,
    title: 'Penjadualan Aktiviti',
    desc: 'Rancang, jadual dan pantau setiap aktiviti kelab dengan mudah dan efisien.',
  },
  {
    icon: Users,
    title: 'Ahli Jawatankuasa',
    desc: 'Urus senarai ahli MT, presiden dan ahli kelab dengan sistem peranan yang jelas.',
  },
  {
    icon: Shield,
    title: 'Akses Berstruktur',
    desc: 'Sistem RBAC dengan 4 peranan: Super Admin JPP, Presiden, MT dan Ahli Kelab.',
  },
];

const stats = [
  { label: 'Kelab & Persatuan Berdaftar', value: '17' },
  { label: 'Kategori Kelab', value: '3' },
  { label: 'Peranan Pengguna', value: '4' },
  { label: 'Politeknik Sultan Haji Ahmad Shah', value: 'POLISAS' },
];

const testimonials = [
  { text: 'e-KPP memudahkan kami memantau semua aktiviti kelab dalam satu tempat. Sangat membantu!', name: 'Ahmad Faiz', role: 'Presiden Elektron' },
  { text: 'Sistem ini membolehkan kami menguruskan ahli jawatankuasa dengan lebih sistematik.', name: 'Nur Aisyah', role: 'MT Kebudayaan' },
  { text: 'Laporan aktiviti kini lebih mudah disediakan. Terima kasih JPP Polisas!', name: 'Haziq Azman', role: 'Presiden Robosas' },
];

export function LandingPage() {
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
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-6">
              <span className="text-primary">e-KPP</span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/50">
                Kelab, Persatuan
              </span>
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
                  className="h-14 px-10 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/30 glow-accent transition-all hover:scale-105 active:scale-95 gap-3">
                  Mulakan Sekarang
                  <ArrowRight className="w-5 h-5" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }} whileHover={{ y: -6 }}>
                <Card className="bento-card border-none h-full group">
                  <CardContent className="p-7">
                    <div className="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-primary/15 transition-all duration-300 shadow-sm">
                      <f.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-black text-lg tracking-tight mb-2">{f.title}</h3>
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
              17 Kelab &amp; Persatuan
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
              Kelab yang Berdaftar
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {ALL_CLUBS.map((club, i) => (
              <motion.div key={club.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }} viewport={{ once: true }} whileHover={{ y: -4, scale: 1.03 }}>
                <Card className="bento-card border-none text-center group cursor-default overflow-hidden">
                  <div className="h-1 w-full" style={{ backgroundColor: club.color }} />
                  <CardContent className="p-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs mx-auto mb-2 shadow-md"
                      style={{ backgroundColor: club.color }}>
                      {club.shortName.slice(0, 2)}
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

      {/* ── Testimonials ───────────────────────────── */}
      <section className="py-24 px-6 lg:px-12 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black tracking-tighter">Kata Mereka</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
                <Card className="bento-card border-none h-full">
                  <CardContent className="p-8 flex flex-col gap-5">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, s) => (
                        <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm font-medium leading-relaxed text-muted-foreground/90 italic flex-1">"{t.text}"</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-border/40">
                      <Avatar className="h-10 w-10 rounded-xl">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${t.name}&backgroundColor=8B1A1A&textColor=FFF8F0`} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs">
                          {t.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-black">{t.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
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
