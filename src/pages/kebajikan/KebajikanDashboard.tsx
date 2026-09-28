import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox, AlertTriangle, CheckCircle2, TrendingUp,
  ArrowUpRight, ChevronRight, Bell, HelpCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationStore } from '@/store/useNotificationStore';
import {
  KebajikanTicket, KebajikanPublicStats,
  KebajikanMonthlyStats, KEBAJIKAN_STATUS_LABELS, KEBAJIKAN_STATUS_COLORS,
  KEBAJIKAN_THEME_COLOR,
} from '@/types';
import { cn } from '@/lib/utils';
import { SystemTour } from '@/components/ui/SystemTour';
import { useTour } from '@/hooks/useTour';
import { useTheme } from '@/contexts/ThemeContext';

const TEAL = KEBAJIKAN_THEME_COLOR;

export function KebajikanDashboard() {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const notifs = useNotificationStore(state => state.notifs);
  const markRead = useNotificationStore(state => state.markRead);
  const [stats, setStats]     = useState<KebajikanPublicStats | null>(null);
  const [monthly, setMonthly] = useState<KebajikanMonthlyStats[]>([]);
  const [recent, setRecent]   = useState<KebajikanTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const { runTour, startTour, closeTour } = useTour('KEBAJIKAN_DASHBOARD', !!profile);

  const name = profile?.full_name?.split(' ')[0] || 'Exco';

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [statsRes, monthlyRes, recentRes] = await Promise.all([
      supabase.from('kebajikan_public_stats').select('*').single(),
      supabase.rpc('get_kebajikan_monthly_stats', { months_back: 6 }),
      supabase.from('kebajikan_tickets').select('*').in('status', ['NEW', 'ESCALATED', 'REOPENED']).order('created_at', { ascending: false }).limit(8),
    ]);
    if (statsRes.data)   setStats(statsRes.data as KebajikanPublicStats);
    if (monthlyRes.data) setMonthly(monthlyRes.data as KebajikanMonthlyStats[]);
    if (recentRes.data)  setRecent(recentRes.data as KebajikanTicket[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();

    // Listen to changes in tickets (new tickets, closed tickets, ratings)
    const ticketChannel = supabase
      .channel('dashboard_tickets_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kebajikan_tickets' }, () => {
        fetchAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
    };
  }, [fetchAll]);

  const statCards = [
    { label: 'Tiket Baru', value: stats?.total_active ?? 0,    icon: Inbox,         color: '#6366F1', href: '/kebajikan/tiket?status=NEW' },
    { label: 'Diescalate', value: stats?.total_escalated ?? 0,        icon: AlertTriangle, color: '#EF4444', href: '/kebajikan/tiket?status=ESCALATED' },
    { label: 'Kes Selesai', value: stats?.total_resolved ?? 0, icon: CheckCircle2,  color: '#10B981', href: '/kebajikan/tiket?status=RESOLVED' },
    { label: 'Rating Pelajar', value: stats?.avg_rating ? `${stats.avg_rating}⭐` : 'N/A', icon: TrendingUp, color: '#F59E0B', href: '/kebajikan/laporan' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen relative transition-colors">
      {/* Greeting */}
      <div className="mb-8 md:mb-10 relative z-10 flex justify-between items-start">
        <div>
          <motion.h1 initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
            Selamat {getGreeting()},{name}! 👋
          </motion.h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Berikut adalah ringkasan sistem aduan pelajar hari ini.</p>
        </div>
        <button
          onClick={startTour}
          className="w-10 h-10 rounded-full bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-all"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="tour-kebajikan-metrics grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 md:mb-10 relative z-10">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.07 }}>
            <Link to={s.href} className="block group">
              <div
                className="rounded-3xl p-5 sm:p-6 border transition-all duration-300 hover:scale-[1.02] cursor-pointer shadow-sm hover:shadow-md bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" style={{ backgroundImage: `linear-gradient(to bottom right, rgba(${hexToRgbStr(s.color)}, 0.4), transparent)` }} />
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner" style={{ background: isDark ? `rgba(${hexToRgbStr(s.color)}, 0.15)` : `rgba(${hexToRgbStr(s.color)}, 0.1)` }}>
                    <s.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: s.color }} />
                  </div>
                  <ArrowUpRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: s.color }} />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1 relative z-10">{loading ? '—' : typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 relative z-10">{s.label}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 relative z-10">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h2 className="font-black text-lg text-slate-900 dark:text-white">Trend Aduan Bulanan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Diterima vs Diselesaikan — 6 bulan</p>
            </div>
            <Link to="/kebajikan/laporan" className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-opacity hover:opacity-70 text-teal-600 dark:text-teal-400">
              Laporan Penuh <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"} />
                <XAxis dataKey="month_label" tick={{ fontSize: 9, fill: isDark ? 'rgba(255,255,255,0.5)' : '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: isDark ? '#0f172a' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', borderRadius: 12, fontSize: 11, color: isDark ? '#ffffff' : '#0f172a', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} labelStyle={{ color: isDark ? 'white' : '#0f172a', fontWeight: 700 }} />
                <Bar dataKey="received" name="Diterima" fill="rgba(99,102,241,0.7)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Diselesaikan" fill={TEAL} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 dark:text-white/20">Belum ada data</div>
          )}
        </div>

        {/* Notif panel */}
        <div className="rounded-3xl p-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden leading-relaxed">
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h2 className="font-black text-lg text-slate-900 dark:text-white">Notifikasi</h2>
              {unreadCount > 0 && <span className="text-[9px] font-black bg-red-500 text-white rounded-full px-1.5 py-0.5">{unreadCount}</span>}
            </div>
            {unreadCount > 0 && (
              <button onClick={() => notifs.filter(n => !n.is_read).forEach(n => markRead(n.id))} className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 transition-colors">
                Baca Semua
              </button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-white/10" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tiada notifikasi baharu</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-hide relative z-10">
              {notifs.slice(0, 6).map(n => (
                <motion.div
                  key={n.id} layout
                  className="flex items-start gap-3 p-3 rounded-xl cursor-pointer bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors border border-slate-100 dark:border-transparent"
                  style={{ borderLeft: `3px solid ${n.type === 'ESCALATION' ? '#EF4444' : n.type === 'WARNING' ? '#F59E0B' : TEAL}`, opacity: n.is_read ? 0.6 : 1 }}
                  onClick={() => markRead(n.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate">{n.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                  </div>
                  {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1" />}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent tickets — action needed */}
      {recent.length > 0 && (
        <div className="mt-8 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-black text-lg text-slate-900 dark:text-white mb-1">Tiket Memerlukan Tindakan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Baru, Diescalate & Dibuka Semula</p>
            </div>
            <Link to="/kebajikan/tiket" className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 transition-colors bg-teal-50 dark:bg-teal-500/10 px-4 py-2 rounded-xl border border-teal-200/60 dark:border-teal-500/20">
              Semua Tiket <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {recent.slice(0, 5).map(t => (
              <Link key={t.id} to={`/kebajikan/tiket/${t.id}`} className="flex items-center gap-4 sm:gap-5 px-5 sm:px-6 py-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:shadow-sm transition-all group overflow-hidden">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-slate-200 truncate mb-1">{t.title}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.ticket_no}</span>
                    <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ms })}</span>
                  </div>
                </div>
                <span className={cn('text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide flex-shrink-0', KEBAJIKAN_STATUS_COLORS[t.status])}>
                  {KEBAJIKAN_STATUS_LABELS[t.status]}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-white/20 group-hover:text-slate-700 dark:group-hover:text-white/50 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <SystemTour run={runTour} onClose={closeTour} tourKey="KEBAJIKAN_DASHBOARD" />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'pagi';
  if (h < 15) return 'tengah hari';
  if (h < 19) return 'petang';
  return 'malam';
}

function hexToRgbStr(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
