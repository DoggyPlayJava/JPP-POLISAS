import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Users, Layers, Calendar, Medal, Activity,
  TrendingUp, Plus, ArrowRight, Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSupsas } from '@/contexts/SupsasContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function SupsasAdminHome() {
  const { edition, kontingen, sports, medalTally, fixtures, isLive } = useSupsas();
  const navigate = useNavigate();

  const liveFixtures = fixtures.filter(f => f.status === 'live').length;
  const completedFixtures = fixtures.filter(f => f.status === 'completed').length;
  const totalMedals = medalTally.reduce((a, k) => a + k.total_medals, 0);
  const topKontingen = medalTally[0];

  const STAT_CARDS = [
    { label: 'Kontinjen',       value: kontingen.length, icon: Users,    color: 'violet', sub: 'jabatan berdaftar',    path: '/supsas/admin/kontinjen' },
    { label: 'Sukan Aktif',     value: sports.length,    icon: Trophy,   color: 'amber',  sub: 'acara dipertandingkan', path: '/supsas/admin/sukan' },
    { label: 'Perlawanan Live', value: liveFixtures,     icon: Activity, color: 'red',    sub: 'sedang berlangsung',    path: '/supsas/admin/jadual' },
    { label: 'Medal Diraih',    value: totalMedals,      icon: Medal,    color: 'emerald',sub: 'emas + perak + gangsa', path: '/supsas/admin/keputusan' },
  ];

  const colorMap: Record<string, string> = {
    violet:  'from-violet-500/10  border-violet-500/20  text-violet-400',
    amber:   'from-amber-500/10   border-amber-500/20   text-amber-400',
    red:     'from-red-500/10     border-red-500/20     text-red-400',
    emerald: 'from-emerald-500/10 border-emerald-500/20 text-emerald-400',
  };

  const QUICK_ACTIONS = [
    { label: 'Input Keputusan',  desc: 'Rekod medal & kedudukan',        path: '/supsas/admin/keputusan', icon: Layers,   urgent: liveFixtures > 0 },
    { label: 'Tambah Sukan',     desc: 'Daftar sukan baru ke edisi ini', path: '/supsas/admin/sukan',     icon: Plus,     urgent: false },
    { label: 'Urus Kontinjen',   desc: 'Jana kod jemputan ketua',        path: '/supsas/admin/kontinjen', icon: Users,    urgent: false },
    { label: 'Tetapkan Jadual',  desc: 'Setup perlawanan & masa',       path: '/supsas/admin/jadual',    icon: Calendar, urgent: false },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-400/60 mb-2">Panel Admin</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {edition?.name ?? 'SUPSAS Dashboard'}
          </h1>
          {edition?.tagline && (
            <p className="text-white/30 font-medium mt-1">{edition.tagline}</p>
          )}
        </div>
        {isLive && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500/15 border border-red-500/25">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="text-xs font-black uppercase tracking-widest text-red-400">Acara Sedang Berlangsung</span>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, sub, path }, i) => {
          const cls = colorMap[color];
          const [, borderCls, textCls] = cls.split(' ');
          return (
            <motion.button
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => navigate(path)}
              className={cn(
                'group relative p-5 rounded-3xl bg-gradient-to-br to-transparent border text-left transition-all hover:scale-[1.03] active:scale-[0.98]',
                cls
              )}
            >
              <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110', `bg-${color}-500/10`, `border border-${color}-500/20`)}>
                <Icon className={cn('w-5 h-5', textCls)} />
              </div>
              <p className="text-3xl font-black text-white mb-1">{value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40">{sub}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mt-0.5">{label}</p>
              <ArrowRight className={cn('absolute bottom-5 right-5 w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5', textCls)} />
            </motion.button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-black text-white mb-4">Tindakan Pantas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_ACTIONS.map(({ label, desc, path, icon: Icon, urgent }, i) => (
            <motion.button
              key={path}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
              onClick={() => navigate(path)}
              className={cn(
                'group flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] text-left',
                urgent
                  ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/30'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
                urgent ? 'bg-red-500/15 border border-red-500/25' : 'bg-amber-500/10 border border-amber-500/20'
              )}>
                <Icon className={cn('w-5 h-5', urgent ? 'text-red-400' : 'text-amber-400')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('font-black text-sm leading-none mb-0.5', urgent ? 'text-red-300' : 'text-white')}>{label}</p>
                <p className="text-[10px] text-white/30 font-medium">{desc}</p>
              </div>
              {urgent && <Zap className="w-4 h-4 text-red-400 flex-shrink-0 animate-pulse" />}
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Top Kontingen */}
      {topKontingen && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-black uppercase tracking-widest text-amber-400">Pemimpin Sementara</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-4 h-12 rounded-full" style={{ backgroundColor: topKontingen.color }} />
            <div>
              <p className="text-2xl font-black text-white">{topKontingen.name}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-0.5">
                🥇 {topKontingen.gold} · 🥈 {topKontingen.silver} · 🥉 {topKontingen.bronze}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No edition warning */}
      {!edition && (
        <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/20 text-center">
          <Trophy className="w-10 h-10 text-amber-400/30 mx-auto mb-3" />
          <p className="text-amber-400 font-black text-sm uppercase tracking-widest mb-2">Tiada Edisi Aktif</p>
          <p className="text-white/30 text-sm mb-4">Pergi ke Tetapan Edisi untuk mencipta dan mengaktifkan edisi SUPSAS.</p>
          <button
            onClick={() => navigate('/supsas/admin/tetapan')}
            className="px-6 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all"
          >
            Setup Edisi
          </button>
        </div>
      )}
    </div>
  );
}
