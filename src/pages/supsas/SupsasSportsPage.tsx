import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Filter, Search } from 'lucide-react';
import { useSupsas } from '@/contexts/SupsasContext';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

const GENDER_LABEL: Record<string, string> = { male: 'Lelaki', female: 'Wanita', mixed: 'Campur' };
const FORMAT_LABEL: Record<string, string> = { knockout: 'Sistem Gugur', round_robin: 'Liga', group_knockout: 'Kumpulan + Gugur' };
const GENDER_COLOR: Record<string, string> = { male: 'text-blue-400 bg-blue-500/10 border-blue-500/20', female: 'text-pink-400 bg-pink-500/10 border-pink-500/20', mixed: 'text-violet-400 bg-violet-500/10 border-violet-500/20' };

export function SupsasSportsPage() {
  const { sports, isLoading, edition } = useSupsas();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'team' | 'individual'>('all');

  const filtered = sports.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || s.category === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-12 pt-8 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-none">Sukan Dipertandingkan</h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">{edition?.name}</p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari sukan..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-amber-500/40 focus:bg-white/8 transition-all"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'team', 'individual'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all',
                    filter === f
                      ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                      : 'bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                  )}
                >
                  {f === 'all' ? 'Semua' : f === 'team' ? 'Berpasukan' : 'Individu'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 sm:px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-48 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <Trophy className="w-10 h-10 text-white/10 mx-auto mb-4" />
              <p className="text-white/30 font-black uppercase tracking-widest text-sm">Tiada sukan dijumpai</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {filtered.map((sport, i) => {
                const IconComponent = (LucideIcons as any)[sport.icon] || LucideIcons.Trophy;
                return (
                  <motion.div
                    key={sport.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="group relative p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer"
                  >
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                      <IconComponent className="w-7 h-7 text-amber-400" />
                    </div>

                    {/* Name */}
                    <h3 className="text-lg font-black text-white mb-1 tracking-tight">{sport.name}</h3>

                    {/* Tags */}
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      <span className={cn('px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border', GENDER_COLOR[sport.gender])}>
                        {GENDER_LABEL[sport.gender]}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/10 text-white/30">
                        {FORMAT_LABEL[sport.format]}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/10 text-white/30">
                        {sport.category === 'team' ? `Max ${sport.max_per_team} pemain` : 'Individu'}
                      </span>
                    </div>

                    {/* Venue */}
                    {sport.venue && (
                      <p className="mt-4 text-[10px] text-white/30 font-medium flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        {sport.venue}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/20">
              {filtered.length} daripada {sports.length} sukan dipapar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
