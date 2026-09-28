import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useTheme } from '@/contexts/ThemeContext';
import type {
  KebajikanPublicStats, KebajikanMonthlyStats, KebajikanCategoryStats,
} from '@/types';
import {
  KEBAJIKAN_CATEGORY_LABELS, KEBAJIKAN_THEME_COLOR,
} from '@/types';

const TEAL = KEBAJIKAN_THEME_COLOR;

const CATEGORY_COLORS: Record<string, string> = {
  FASILITI_JABATAN: '#6366F1',
  FASILITI_SUKAN:   '#F59E0B',
  KAFETERIA:        '#EF4444',
  WIFI_KAMSIS:      TEAL,
  LAIN_LAIN:        '#8B5CF6',
};

export function KebajikanStatsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [stats, setStats]       = useState<KebajikanPublicStats | null>(null);
  const [monthly, setMonthly]   = useState<KebajikanMonthlyStats[]>([]);
  const [categories, setCategories] = useState<KebajikanCategoryStats[]>([]);
  const [ratings, setRatings]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 relative overflow-hidden transition-colors">
      {/* Glow Effects */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2" />
      
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl transition-colors">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20 text-center relative z-10">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
            <div
              className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full mb-8 shadow-sm backdrop-blur-md bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-300"
            >
              <HeartHandshake className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span className="text-[11px] font-black uppercase tracking-[0.25em]">
                Exco Kebajikan JPP POLISAS
              </span>
            </div>
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-900 dark:text-slate-50 mb-6 leading-tight tracking-tight"
          >
            Kami Sentiasa{' '}
            <span className="text-teal-600 dark:text-teal-400">Membantu Anda</span>
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed font-normal"
          >
            Statistik prestasi pengurusan aduan pelajar oleh Exco Kebajikan JPP POLISAS.
            Data dikemaskini secara masa nyata.
          </motion.p>

          {/* This Month Chip */}
          {!loading && stats && (
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <div
                className="inline-flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-full shadow-sm bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05]"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                <span className="font-semibold">Bulan ini:</span> {stats.this_month_received} aduan kes · <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stats.this_month_resolved} diselesaikan</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-12 sm:space-y-16 relative z-10">
        {/* CTA Section */}
        <div
          className="rounded-3xl p-8 sm:p-10 text-center border border-teal-200/80 dark:border-teal-500/15 bg-white dark:bg-slate-900/80 shadow-sm dark:shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-transparent to-indigo-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
          <HeartHandshake className="relative z-10 w-16 h-16 mx-auto mb-6 text-teal-600 dark:text-teal-400" />
          <h3 className="relative z-10 font-black text-2xl text-slate-900 dark:text-slate-50 mb-3">Ada Masalah? Biar Kami Bantu</h3>
          <p className="relative z-10 text-sm text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
            Aduan anda penting kepada kami. Log masuk ke portal JPP POLISAS untuk melaporkan masalah dan kami akan cuba menyelesaikannya secepat mungkin.
          </p>
          <button
            onClick={() => {
              sessionStorage.setItem('post_login_redirect', '/kebajikan/buat-aduan');
              navigate('/login?redirect=/kebajikan/buat-aduan');
            }}
            className="relative z-10 inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm text-slate-950 bg-teal-400 hover:bg-teal-300 shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Buat Aduan Sekarang <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-3xl p-5 sm:p-6 text-center border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-2xl bg-white dark:bg-slate-900/80 backdrop-blur-xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" style={{ backgroundImage: `linear-gradient(to bottom right, rgba(${hexColorToRgb(card.color)}, 0.4), transparent)` }} />
              <div className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner" style={{ background: isDark ? `rgba(${hexColorToRgb(card.color)}, 0.15)` : `rgba(${hexColorToRgb(card.color)}, 0.1)` }}>
                <card.icon className="w-6 h-6" style={{ color: card.color }} />
              </div>
              <p className="relative z-10 text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 mb-1">{String(card.value)}</p>
              <p className="relative z-10 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className="relative z-10 text-[10px] text-slate-400 dark:text-slate-500 mt-2">{card.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* Bar Chart — Monthly */}
          <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/[0.05] bg-white dark:bg-slate-900/80 backdrop-blur-xl shadow-sm dark:shadow-2xl">
            <h2 className="font-black text-lg text-slate-900 dark:text-slate-100 mb-1">Aduan Bulanan</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 font-medium">Diterima vs Diselesaikan — 6 bulan lepas</p>
            {monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthly} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"} />
                  <XAxis dataKey="month_label" tick={{ fontSize: 9, fill: isDark ? 'rgba(255,255,255,0.5)' : '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: isDark ? '#1e293b' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', borderRadius: 12, fontSize: 11, color: isDark ? '#ffffff' : '#0f172a' }}
                    labelStyle={{ color: isDark ? 'white' : '#0f172a', fontWeight: 700 }}
                    itemStyle={{ color: isDark ? 'rgba(255,255,255,0.7)' : '#334155' }}
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
          <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/[0.05] bg-white dark:bg-slate-900/80 backdrop-blur-xl shadow-sm dark:shadow-2xl flex flex-col">
            <h2 className="font-black text-lg text-slate-900 dark:text-slate-100 mb-1">Pecahan Kategori</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 font-medium">Peratus setiap kategori aduan keseluruhan</p>
            {categories.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full">
                <div className="w-full sm:w-[55%] h-[180px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categories} dataKey="total" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} startAngle={90} endAngle={-270}>
                        {categories.map((cat) => (
                          <Cell key={cat.category} fill={CATEGORY_COLORS[cat.category] ?? '#666'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: isDark ? '#1e293b' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', borderRadius: 10, fontSize: 11, color: isDark ? '#ffffff' : '#0f172a' }}
                        formatter={(v: any, _n: any, props: any) => [v, KEBAJIKAN_CATEGORY_LABELS[props.payload.category as keyof typeof KEBAJIKAN_CATEGORY_LABELS] ?? props.payload.category]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3 w-full sm:w-auto">
                  {categories.slice(0, 5).map((cat) => (
                    <div key={cat.category} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-inner" style={{ background: CATEGORY_COLORS[cat.category] ?? '#666' }} />
                      <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate font-medium">{KEBAJIKAN_CATEGORY_LABELS[cat.category] ?? cat.category}</span>
                      <span className="text-xs font-black text-slate-900 dark:text-slate-200">{cat.percentage}%</span>
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
        <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/[0.05] bg-white dark:bg-slate-900/80 backdrop-blur-xl shadow-sm dark:shadow-2xl">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="font-black text-xl text-slate-900 dark:text-slate-100 mb-2">Penilaian Pelajar</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Penilaian kepuasan terhadap perkhidmatan kami</p>
            </div>
            {!loading && avgStars > 0 && (
              <div className="text-right">
                <p className="text-3xl font-black text-teal-600 dark:text-teal-400">{avgStars.toFixed(1)}</p>
                <div className="flex gap-0.5 justify-end mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className="w-3.5 h-3.5"
                      fill={s <= Math.round(avgStars) ? '#F59E0B' : 'transparent'}
                      style={{ color: s <= Math.round(avgStars) ? '#F59E0B' : isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1' }}
                    />
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 dark:text-white/30 mt-0.5">daripada 5 bintang</p>
              </div>
            )}
          </div>

          {ratings.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
              {ratings.slice(0, 6).map((r, i) => (
                <div key={i} className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition-all shadow-sm group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-3 h-3" fill={s <= r.rating ? '#F59E0B' : 'transparent'} style={{ color: s <= r.rating ? '#F59E0B' : isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1' }} />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-200/70 dark:bg-white/5 px-2 py-0.5 rounded-full">{KEBAJIKAN_CATEGORY_LABELS[r.category as keyof typeof KEBAJIKAN_CATEGORY_LABELS] ?? r.category}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">"{r.rating_comment}"</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-slate-400 dark:text-white/30 py-8">Tiada penilaian lagi. Baharu mulai!</p>
          )}
        </div>

      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[180px] flex flex-col items-center justify-center">
      <BarChart3 className="w-10 h-10 text-slate-300 dark:text-white/10 mb-2" />
      <p className="text-[10px] text-slate-400 dark:text-white/20">Belum ada data yang mencukupi</p>
    </div>
  );
}

function hexColorToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
