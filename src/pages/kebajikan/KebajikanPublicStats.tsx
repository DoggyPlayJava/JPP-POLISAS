import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Clock, TrendingUp, ListChecks,
  HeartHandshake, Star, BarChart3, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import type {
  KebajikanPublicStats, KebajikanMonthlyStats, KebajikanCategoryStats,
} from '@/types';
import {
  KEBAJIKAN_CATEGORY_LABELS, KEBAJIKAN_THEME_COLOR,
} from '@/types';
import { cn } from '@/lib/utils';

const TEAL = KEBAJIKAN_THEME_COLOR;

const CATEGORY_COLORS: Record<string, string> = {
  FASILITI_JABATAN: '#6366F1',
  FASILITI_SUKAN:   '#F59E0B',
  KAFETERIA:        '#EF4444',
  WIFI_KAMSIS:      TEAL,
  LAIN_LAIN:        '#8B5CF6',
};

export function KebajikanStatsPage() {
  const [stats, setStats]       = useState<KebajikanPublicStats | null>(null);
  const [monthly, setMonthly]   = useState<KebajikanMonthlyStats[]>([]);
  const [categories, setCategories] = useState<KebajikanCategoryStats[]>([]);
  const [ratings, setRatings]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [statsRes, monthlyRes, catRes, ratingRes] = await Promise.all([
      supabase.from('kebajikan_public_stats').select('*').single(),
      supabase.rpc('get_kebajikan_monthly_stats', { months_back: 6 }),
      supabase.rpc('get_kebajikan_category_stats'),
      supabase.rpc('get_kebajikan_recent_ratings', { limit_count: 8 }),
    ]);
    if (statsRes.data)    setStats(statsRes.data as KebajikanPublicStats);
    if (monthlyRes.data)  setMonthly(monthlyRes.data as KebajikanMonthlyStats[]);
    if (catRes.data)      setCategories(catRes.data as KebajikanCategoryStats[]);
    if (ratingRes.data)   setRatings(ratingRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statCards = [
    {
      label: 'Kes Diselesaikan',
      value: loading ? '—' : stats?.total_resolved ?? 0,
      icon: CheckCircle2,
      color: '#10B981',
      suffix: 'kes',
      description: 'Sejak sistem dilancarkan',
    },
    {
      label: 'Kadar Penyelesaian',
      value: loading ? '—' : `${stats?.resolution_rate ?? 0}%`,
      icon: TrendingUp,
      color: TEAL,
      description: 'Peratus kes berjaya diselesaikan',
    },
    {
      label: 'Purata Masa Selesai',
      value: loading ? '—' : stats?.avg_resolution_hours ? `~${stats.avg_resolution_hours}j` : 'N/A',
      icon: Clock,
      color: '#F59E0B',
      description: 'Purata masa dari aduan hingga selesai',
    },
    {
      label: 'Kes Aktif Sekarang',
      value: loading ? '—'  : stats?.total_active ?? 0,
      icon: ListChecks,
      color: '#6366F1',
      description: 'Kes yang sedang dalam pemprosesan',
    },
  ];

  const avgStars = stats?.avg_rating ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-slate-50 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2" />
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5 bg-slate-900/40 backdrop-blur-3xl">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center relative z-10">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
            <div
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full mb-8 shadow-lg backdrop-blur-md"
              style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)' }}
            >
              <HeartHandshake className="w-5 h-5" style={{ color: TEAL }} />
              <span className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: TEAL }}>
                Exco Kebajikan JPP POLISAS
              </span>
            </div>
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-slate-50 mb-6 leading-tight tracking-tight"
          >
            Kami Sentiasa{' '}
            <span style={{ color: TEAL, textShadow: `0 0 40px rgba(45,212,191,0.4)` }}>Membantu Anda</span>
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-base text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Statistik prestasi pengurusan aduan pelajar oleh Exco Kebajikan JPP POLISAS.
            Data dikemaskini secara masa nyata.
          </motion.p>

          {/* This Month Chip */}
          {!loading && stats && (
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <div
                className="inline-flex items-center gap-3 text-xs text-slate-300 px-5 py-2.5 rounded-full shadow-inner"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                <span className="font-semibold">Bulan ini:</span> {stats.this_month_received} aduan kes · <span className="text-emerald-400 font-bold">{stats.this_month_resolved} diselesaikan</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 space-y-16 relative z-10">
        {/* CTA Section (Moved to top) */}
        <div
          className="rounded-3xl p-10 text-center border shadow-2xl relative overflow-hidden group"
          style={{ background: `rgba(45,212,191,0.04)`, borderColor: `rgba(45,212,191,0.15)` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-transparent to-indigo-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
          <HeartHandshake className="relative z-10 w-16 h-16 mx-auto mb-6" style={{ color: TEAL, opacity: 0.9 }} filter="drop-shadow(0 0 20px rgba(45,212,191,0.4))" />
          <h3 className="relative z-10 font-black text-2xl text-slate-50 mb-3">Ada Masalah? Biar Kami Bantu</h3>
          <p className="relative z-10 text-sm text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
            Aduan anda penting kepada kami. Log masuk ke portal JPP POLISAS untuk melaporkan masalah dan kami akan cuba menyelesaikannya secepat mungkin.
          </p>
          <Link
            to="/kebajikan/buat-aduan"
            className="relative z-10 inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm text-slate-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: TEAL, boxShadow: `0 12px 40px rgba(45,212,191,0.4)` }}
          >
            Buat Aduan Sekarang <ChevronRight className="w-5 h-5 ml-1" />
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-3xl p-6 text-center border shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
              style={{ background: `rgba(${hexColorToRgb(card.color)}, 0.03)`, borderColor: `rgba(${hexColorToRgb(card.color)}, 0.15)` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" style={{ backgroundImage: `linear-gradient(to bottom right, rgba(${hexColorToRgb(card.color)}, 0.5), transparent)` }} />
              <div className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner" style={{ background: `rgba(${hexColorToRgb(card.color)}, 0.15)` }}>
                <card.icon className="w-6 h-6" style={{ color: card.color }} />
              </div>
              <p className="relative z-10 text-3xl font-black text-slate-50 mb-1">{String(card.value)}</p>
              <p className="relative z-10 text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
              <p className="relative z-10 text-[10px] text-slate-500 mt-2">{card.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Bar Chart — Monthly */}
          <div className="rounded-3xl p-8 border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl shadow-2xl">
            <h2 className="font-black text-lg text-slate-100 mb-1">Aduan Bulanan</h2>
            <p className="text-xs text-slate-500 mb-8 font-medium">Diterima vs Diselesaikan — 6 bulan lepas</p>
            {monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthly} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month_label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }}
                    labelStyle={{ color: 'white', fontWeight: 700 }}
                    itemStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  />
                  <Bar dataKey="received" name="Diterima" fill="rgba(99,102,241,0.7)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Diselesaikan" fill={TEAL} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>

          {/* Donut — Categories */}
          <div className="rounded-3xl p-8 border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl shadow-2xl flex flex-col">
            <h2 className="font-black text-lg text-slate-100 mb-1">Pecahan Kategori</h2>
            <p className="text-xs text-slate-500 mb-8 font-medium">Peratus setiap kategori aduan keseluruhan</p>
            {categories.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={160}>
                  <PieChart>
                    <Pie data={categories} dataKey="total" innerRadius={45} outerRadius={70} paddingAngle={3} startAngle={90} endAngle={-270}>
                      {categories.map((cat) => (
                        <Cell key={cat.category} fill={CATEGORY_COLORS[cat.category] ?? '#666'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }}
                      formatter={(v: any, n: any, props: any) => [v, KEBAJIKAN_CATEGORY_LABELS[props.payload.category as keyof typeof KEBAJIKAN_CATEGORY_LABELS] ?? props.payload.category]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {categories.slice(0, 5).map((cat) => (
                    <div key={cat.category} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-inner" style={{ background: CATEGORY_COLORS[cat.category] ?? '#666' }} />
                      <span className="text-xs text-slate-400 flex-1 truncate font-medium">{KEBAJIKAN_CATEGORY_LABELS[cat.category] ?? cat.category}</span>
                      <span className="text-xs font-black text-slate-200">{cat.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        {/* Rating Section */}
        <div className="rounded-3xl p-8 border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl shadow-2xl">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="font-black text-xl text-slate-100 mb-2">Penilaian Pelajar</h2>
              <p className="text-xs text-slate-500 font-medium">Penilaian kepuasan terhadap perkhidmatan kami</p>
            </div>
            {!loading && avgStars > 0 && (
              <div className="text-right">
                <p className="text-3xl font-black" style={{ color: TEAL }}>{avgStars.toFixed(1)}</p>
                <div className="flex gap-0.5 justify-end mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className="w-3.5 h-3.5"
                      fill={s <= Math.round(avgStars) ? '#F59E0B' : 'transparent'}
                      style={{ color: s <= Math.round(avgStars) ? '#F59E0B' : 'rgba(255,255,255,0.2)' }}
                    />
                  ))}
                </div>
                <p className="text-[9px] text-white/30 mt-0.5">daripada 5 bintang</p>
              </div>
            )}
          </div>

          {ratings.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-5">
              {ratings.slice(0, 6).map((r, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all shadow-lg group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-3 h-3" fill={s <= r.rating ? '#F59E0B' : 'transparent'} style={{ color: s <= r.rating ? '#F59E0B' : 'rgba(255,255,255,0.15)' }} />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{KEBAJIKAN_CATEGORY_LABELS[r.category as keyof typeof KEBAJIKAN_CATEGORY_LABELS] ?? r.category}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">"{r.rating_comment}"</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-white/30 py-8">Tiada penilaian lagi. Baharu mulai!</p>
          )}
        </div>

      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[180px] flex flex-col items-center justify-center">
      <BarChart3 className="w-10 h-10 text-white/10 mb-2" />
      <p className="text-[10px] text-white/20">Belum ada data yang mencukupi</p>
    </div>
  );
}

function hexColorToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
