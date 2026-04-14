import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowRight, Sparkles, Shield, Zap, 
  BarChart3, GraduationCap, Users, 
  BrainCircuit, Globe, ArrowUpRight,
  Fingerprint, Cpu, Layers, LayoutDashboard,
  Menu, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

// --- Types & Config ---
const MAROON = '#831010';

const MODULES = [
  {
    id: 'ekpp',
    title: 'e-KPP',
    subtitle: 'Nadi Organisasi',
    desc: 'Sistem tadbir urus kelab dan persatuan yang telus. Automasi kertas kerja dan pelaporan bulanan secara digital.',
    icon: Shield,
    color: '#831010',
    path: '/portal',
    stats: ['120+ Kelab Aktif', '98% Kelulusan Digital'],
    preview: (
      <div className="flex flex-col gap-2 p-4 h-full justify-center">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <div className="h-1.5 w-24 bg-white/10 rounded-full" />
            <div className="ml-auto h-1.5 w-8 bg-white/5 rounded-full" />
          </div>
        ))}
      </div>
    )
  },
  {
    id: 'keusahawanan',
    title: 'e-Keusahawanan',
    subtitle: 'Ekonomi Madani',
    desc: 'Memperkasakan usahawan siswa dengan sistem POS digital terpadu dan analitik jualan masa nyata.',
    icon: BarChart3,
    color: '#059669',
    path: '/keusahawanan',
    stats: ['RM 45k+ Jualan', '85+ Vendor Aktif'],
    preview: (
      <div className="flex items-end gap-1.5 p-4 h-full justify-center">
        {[40, 70, 45, 90, 60, 80, 55].map((h, i) => (
          <motion.div 
            key={i} 
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: 0.5 + (i * 0.1), duration: 1 }}
            className="w-2 bg-gradient-to-t from-emerald-500/20 to-emerald-500 rounded-t-sm" 
          />
        ))}
      </div>
    )
  },
  {
    id: 'akademik',
    title: 'e-Akademik',
    subtitle: 'Kecemerlangan Holistik',
    desc: 'Transformasi pengesahan sijil melalui AI dan pengurusan merit yang sistematik untuk graduan TVET.',
    icon: GraduationCap,
    color: '#2563eb',
    path: '/akademik',
    stats: ['Scanner HPNM AI', 'Sistem Merit QR'],
    preview: (
      <div className="flex items-center justify-center h-full relative">
        <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-black text-blue-400">4.00</span>
        </div>
      </div>
    )
  }
];

// --- Sub-Components ---

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 flex justify-center py-4 px-6",
        isScrolled ? "py-2" : "py-6"
      )}
    >
      <div className={cn(
        "flex items-center justify-between w-full max-w-6xl px-6 py-2.5 rounded-full border transition-all duration-500",
        isScrolled 
          ? "bg-black/60 backdrop-blur-2xl border-white/10 shadow-2xl" 
          : "bg-transparent border-transparent"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-maroon flex items-center justify-center p-1.5 shadow-lg shadow-maroon/20">
            <Layers className="text-white w-full h-full" />
          </div>
          <span className="font-black tracking-tight text-white text-sm uppercase">JPP<span className="text-maroon">Digital</span></span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          {['Ekosistem', 'Modul', 'Nexus AI'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
              {item}
            </a>
          ))}
        </div>

        <button className="px-5 py-2 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-wider hover:bg-maroon hover:text-white transition-all duration-300 shadow-xl shadow-white/5">
          Daftar Masuk
        </button>
      </div>
    </motion.nav>
  );
};

const Hero = ({ onEnter }: { onEnter: () => void }) => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl aspect-square bg-maroon/20 blur-[150px] rounded-full opacity-30 animate-pulse" />
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-blue-500/10 blur-[120px] rounded-full opacity-20" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-maroon/10 blur-[120px] rounded-full opacity-20" />
      </div>

      <motion.div style={{ y: y1, opacity }} className="relative z-10 text-center px-6 max-w-4xl px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md mb-8"
        >
          <Sparkles className="w-3.5 h-3.5 text-maroon" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Sistem Tadbir Urus Bersepadu</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-6xl sm:text-8xl font-black tracking-[-0.04em] text-white leading-[0.9] mb-8"
        >
          Masa Hadapan <br />
          <span className="text-white/20">JPP Polisas.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm sm:text-lg text-white/40 max-w-2xl mx-auto font-medium leading-relaxed mb-12"
        >
          Kami membina infrastruktur digital yang menggabungkan automasi pintar, 
          analitik data ekonomi, dan kecemerlangan akademik dalam satu ekosistem Nexus.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button 
            onClick={onEnter}
            className="group px-8 py-4 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-maroon hover:text-white transition-all duration-500 flex items-center gap-3 shadow-2xl shadow-white/10"
          >
            Mula Sesi Digital
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="px-8 py-4 rounded-2xl bg-white/[0.05] border border-white/10 text-white/60 font-black uppercase text-xs tracking-widest hover:bg-white/10 hover:text-white transition-all duration-500">
            Manual Pengguna
          </button>
        </motion.div>
      </motion.div>

      {/* Hero Footnote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
      >
        <div className="w-px h-12 bg-gradient-to-b from-white/0 via-white/20 to-white/0" />
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Scroll Down</span>
      </motion.div>
    </section>
  );
};

const BentoSection = () => {
  const navigate = useNavigate();

  return (
    <section id="modul" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-2 h-8 rounded-full bg-maroon" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30">Ekosistem Utama</h2>
          </div>
          <h3 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-none">
            Satu Sistem. <br />
            <span className="text-white/20 italic">Pelbagai Kemungkinan.</span>
          </h3>
        </div>
        <p className="max-w-md text-sm text-white/40 font-medium">
          Kami membahagikan urusan kompleks kepada modul-modul pintar yang saling berhubung untuk memastikan kelancaran operasi JPP.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {MODULES.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            onClick={() => navigate(m.path)}
            className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] bg-white/[0.02] border border-white/10 p-8 hover:bg-white/[0.04] hover:border-white/20 transition-all duration-700 hover:shadow-2xl hover:shadow-maroon/5 flex flex-col"
          >
            {/* Top Row: Icon & Action */}
            <div className="flex items-start justify-between mb-8">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 group-hover:scale-110"
                style={{ background: `${m.color}20`, color: m.color, border: `1px solid ${m.color}40` }}
              >
                <m.icon className="w-7 h-7" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-white/10 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-500" />
            </div>

            {/* Content */}
            <div className="flex-1 mb-12">
              <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: m.color }}>{m.subtitle}</p>
              <h4 className="text-3xl font-black text-white mb-4">{m.title}</h4>
              <p className="text-xs text-white/40 font-medium leading-relaxed line-clamp-3 group-hover:text-white/60 transition-colors">
                {m.desc}
              </p>
            </div>

            {/* Bottom Row: Previews/Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-black/40 border border-white/5 aspect-[4/3] overflow-hidden">
                {m.preview}
              </div>
              <div className="flex flex-col justify-center gap-3">
                {m.stats.map((s, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="text-[10px] font-black text-white">{s.split(' ')[0]}</span>
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">{s.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subtle Gradient Glow */}
            <div 
              className="absolute -right-20 -bottom-20 w-40 h-40 blur-[80px] rounded-full transition-all duration-700 opacity-0 group-hover:opacity-20"
              style={{ background: m.color }}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const NexusAISection = () => {
  return (
    <section id="nexus ai" className="py-24 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-maroon/[0.05] border border-maroon/20">
            <BrainCircuit className="w-3 h-3 text-maroon" />
            <span className="text-[9px] font-black uppercase tracking-widest text-maroon">Nexus AI Core</span>
          </div>
          
          <h3 className="text-5xl sm:text-7xl font-black tracking-tight text-white leading-[0.9]">
            Kecerdasan <br />
            <span className="text-maroon">Strategik.</span>
          </h3>
          
          <p className="text-sm sm:text-lg text-white/40 font-medium leading-relaxed max-w-lg">
            Nexus AI bukan sekadar automasi. Ia adalah ejen pintar yang menganalisis sentimen mahasiswa, 
            mengoptimumkan belanjawan kelab, dan menjana dokumen perundangan organisasi dalam saat.
          </p>

          <div className="grid grid-cols-2 gap-6 pt-4">
            {[
              { label: 'Integriti Data', icon: Shield },
              { label: 'Respons Pantas', icon: Zap },
              { label: 'Multi-Modul', icon: Layers },
              { label: 'Automasi Penuh', icon: Cpu }
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center">
                  <f.icon className="w-4 h-4 text-white/40" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{f.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative aspect-square rounded-[3rem] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 flex items-center justify-center p-12 overflow-hidden shadow-2xl"
        >
          {/* Neural Network Abstract Visual */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-maroon/20 blur-[60px] rounded-full animate-pulse" />
          </div>
          <div className="relative z-10 w-full h-full border border-white/5 rounded-2xl flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border border-dashed border-white/5 rounded-full"
            />
             <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-12 border border-dotted border-white/10 rounded-full"
            />
            <div className="text-center space-y-4">
              <BrainCircuit className="w-20 h-20 text-maroon mx-auto drop-shadow-[0_0_30px_rgba(131,16,16,0.8)]" />
              <p className="text-[10px] font-black uppercase tracking-[1em] text-white/20 pl-[1em]">Scanning</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const StatsSection = () => {
  return (
    <section className="py-24 bg-white/[0.01] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
         {[
           { label: 'Kelab Berdaftar', val: '120+' },
           { label: 'Laporan Selesai', val: '10k+' },
           { label: 'Jualan POS', val: 'RM 50k+' },
           { label: 'Merit Terkumpul', val: '250k+' }
         ].map((s, i) => (
           <motion.div 
             key={i}
             initial={{ opacity: 0, y: 10 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: i * 0.1 }}
             className="text-center space-y-2"
           >
             <p className="text-5xl font-black text-white tracking-tighter">{s.val}</p>
             <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{s.label}</p>
           </motion.div>
         ))}
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="py-20 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
             <Layers className="text-maroon w-6 h-6" />
             <span className="font-black tracking-tight text-white text-lg uppercase">JPP<span className="text-maroon">Digital</span></span>
          </div>
          <p className="max-w-xs text-xs text-white/30 font-medium leading-relaxed">
            Unit Teknologi & Inovasi Digital Mahasiswa <br />
            Politeknik Sultan Haji Ahmad Shah.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
           {[
             { title: 'Sistem', links: ['Portal KPP', 'E-Keusahawanan', 'E-Akademik'] },
             { title: 'Polisi', links: ['Privasi', 'Terma Guna', 'Glosari'] },
             { title: 'Bantuan', links: ['Meja Bantuan', 'Manual', 'Nexus AI'] }
           ].map((g, i) => (
             <div key={i} className="space-y-6">
               <h5 className="text-[10px] font-black uppercase tracking-widest text-white/60">{g.title}</h5>
               <ul className="space-y-4">
                 {g.links.map((l, idx) => (
                   <li key={idx}>
                     <a href="#" className="text-xs text-white/30 hover:text-white transition-colors">{l}</a>
                   </li>
                 ))}
               </ul>
             </div>
           ))}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-[10px] text-white/20 font-medium">© 2025 JPP POLISAS. ALL RIGHTS RESERVED.</p>
        <div className="flex items-center gap-6">
           {['X', 'LinkedIn', 'Github'].map(s => (
             <a key={s} href="#" className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors">{s}</a>
           ))}
        </div>
      </div>
    </footer>
  );
};

export function LandingPage() {
  const navigate = useNavigate();
  
  const scrollToModul = () => {
    document.getElementById('modul')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-[#050505] min-h-screen text-white font-sans selection:bg-maroon selection:text-white">
      <Navbar />
      
      <main>
        <Hero onEnter={() => navigate('/portal')} />
        <BentoSection />
        <NexusAISection />
        <StatsSection />

        {/* Final CTA Section */}
        <section className="py-24 px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto rounded-[3rem] bg-gradient-to-br from-maroon/20 to-transparent border border-maroon/20 p-12 text-center space-y-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-maroon/10 blur-[100px] rounded-full" />
            
            <h3 className="text-4xl sm:text-7xl font-black tracking-tight text-white leading-[0.9]">
              Transformasi <br />
              <span className="text-maroon">Bermula Di Sini.</span>
            </h3>
            <p className="text-sm text-white/40 font-medium max-w-lg mx-auto leading-relaxed">
              Sertai beribu mahasiswa lain dalam memacu inovasi digital di Politeknik Sultan Haji Ahmad Shah.
            </p>
            
            <button 
              onClick={() => navigate('/portal')}
              className="px-8 py-4 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-maroon hover:text-white transition-all duration-500 flex items-center gap-3 mx-auto shadow-2xl shadow-white/10"
            >
              Mohon Akses JPP
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
