import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { hexToRgba } from '@/lib/utils';
import { Plus, Search, CalendarDays, Users, MapPin, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';


type ProgramStatus = 'upcoming' | 'active' | 'completed';

interface Program {
  id: string; icon: string; title: string; description: string;
  date: string; venue: string; participants: number; maxParticipants: number;
  status: ProgramStatus; tags: string[];
}

const DEMO_PROGRAMS: Program[] = [
  {
    id: '1', icon: '🚀', title: 'Bootcamp Usahawan Muda 2026',
    description: 'Program intensif 3 hari untuk membangunkan kemahiran keusahawanan di kalangan pelajar. Merangkumi sesi pitching, networking dan pembangunan model perniagaan.',
    date: '15–17 April 2026', venue: 'Dewan Polisas, Blok A', participants: 45, maxParticipants: 60,
    status: 'upcoming', tags: ['Bootcamp', 'Intensif'],
  },
  {
    id: '2', icon: '💼', title: 'Pameran Produk Pelajar — PITA',
    description: 'Pameran tahunan produk dan perkhidmatan yang dibangunkan oleh pelajar Polisas.',
    date: '22 April 2026', venue: 'Kompleks Sukan Polisas', participants: 120, maxParticipants: 200,
    status: 'active', tags: ['Pameran', 'Industri'],
  },
  {
    id: '3', icon: '🧠', title: 'Workshop Pelan Perniagaan',
    description: 'Sesi interaktif untuk membantu pelajar menyediakan pelan perniagaan yang komprehensif.',
    date: '5 Mac 2026', venue: 'Bilik Kuliah 3A', participants: 38, maxParticipants: 40,
    status: 'completed', tags: ['Workshop'],
  },
  {
    id: '4', icon: '🏆', title: 'Pertandingan Idea Inovasi',
    description: 'Pertandingan idea perniagaan inovatif dengan hadiah tunai dan bimbingan usahawan berjaya.',
    date: '1 Mei 2026', venue: 'Dewan Besar', participants: 0, maxParticipants: 100,
    status: 'upcoming', tags: ['Pertandingan', 'Inovasi'],
  },
];

export function KeusahawananProgram() {
  const { color } = useExcoTheme();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProgramStatus | 'all'>('all');
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  const statusMap: Record<ProgramStatus, { label: string; chipBg: string; chipColor: string }> = {
    active:    { label: 'Sedang Berjalan', chipBg: hexToRgba(color, 0.1), chipColor: color },
    upcoming:  { label: 'Akan Datang',     chipBg: 'rgba(59,130,246,0.1)', chipColor: '#3b82f6' },
    completed: { label: 'Selesai',          chipBg: 'hsl(var(--muted))', chipColor: 'hsl(var(--muted-foreground))' },
  };

  const filtered = DEMO_PROGRAMS.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchFilter;
  });

  return (
    // Inherit bg-background dari Layout — tiada background sendiri
    <div className="min-h-full p-4 sm:p-6 md:p-8 space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: color }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">e-Keusahawanan</p>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Program Keusahawanan</h1>
          <p className="text-sm mt-0.5 text-muted-foreground">Urus semua program, workshop dan pertandingan</p>
        </div>
        <Button
          className="gap-2 font-black text-[11px] uppercase tracking-wider rounded-xl flex-shrink-0 text-white w-full sm:w-auto"
          style={{ background: color }}
        >
          <Plus className="w-4 h-4" />
          Tambah Program
        </Button>
      </motion.div>

      {/* Carian + Filter */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari program..."
            className="w-full h-11 pl-11 pr-4 rounded-xl text-sm font-medium outline-none bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-1"
            style={{ '--tw-ring-color': hexToRgba(color, 0.3) } as any}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'upcoming', 'completed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border"
              style={
                filterStatus === s
                  ? { background: hexToRgba(color, 0.1), borderColor: hexToRgba(color, 0.35), color }
                  : { background: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
              }
            >
              {s === 'all' ? 'Semua' : statusMap[s].label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Grid Program */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((program, i) => {
          const st = statusMap[program.status];
          const pct = Math.round((program.participants / program.maxParticipants) * 100);
          return (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => setSelectedProgram(program)}
              className="cursor-pointer group rounded-2xl p-5 transition-all duration-200 bg-card border border-border hover:border-muted-foreground/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-muted">
                    {program.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-black leading-tight text-foreground">{program.title}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {program.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Status chip — hanya chip "Sedang Berjalan" ada warna tema */}
                <div className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex-shrink-0"
                  style={{ background: st.chipBg, color: st.chipColor }}>
                  {st.label}
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px] mb-4 text-muted-foreground">
                <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{program.date}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{program.venue.split(',')[0]}</span>
              </div>

              {/* Progress bar — warna tema */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{program.participants} peserta</span>
                  <span>{pct}% penuh</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-black uppercase text-muted-foreground group-hover:text-foreground transition-colors">
                <span>Lihat Butiran</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal Butiran */}
      <AnimatePresence>
        {selectedProgram && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedProgram(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto rounded-3xl p-6 sm:p-8 bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
            >
              <button onClick={() => setSelectedProgram(null)}
                className="absolute top-5 right-5 p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
              <div className="text-4xl mb-4">{selectedProgram.icon}</div>
              <div className="mb-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase"
                  style={{ background: statusMap[selectedProgram.status].chipBg, color: statusMap[selectedProgram.status].chipColor }}>
                  {statusMap[selectedProgram.status].label}
                </span>
              </div>
              <h2 className="text-lg font-black mb-3 text-foreground">{selectedProgram.title}</h2>
              <p className="text-sm mb-5 leading-relaxed text-muted-foreground">{selectedProgram.description}</p>
              <div className="space-y-2 text-sm font-medium text-muted-foreground">
                <p className="flex items-center gap-2"><CalendarDays className="w-4 h-4" style={{ color }} />{selectedProgram.date}</p>
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4" style={{ color }} />{selectedProgram.venue}</p>
                <p className="flex items-center gap-2"><Users className="w-4 h-4" style={{ color }} />{selectedProgram.participants} / {selectedProgram.maxParticipants} peserta</p>
              </div>
              {/* Divider bertema warna */}
              <div className="h-px my-5" style={{ background: hexToRgba(color, 0.2) }} />
              <div className="flex gap-3">
                <Button className="flex-1 font-black text-[11px] uppercase tracking-wider rounded-xl text-white" style={{ background: color }}>
                  Kemaskini Program
                </Button>
                <Button variant="outline" className="font-black text-[11px] uppercase rounded-xl">
                  Laporan
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
