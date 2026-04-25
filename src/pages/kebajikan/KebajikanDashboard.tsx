import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox, AlertTriangle, Clock, CheckCircle2, TrendingUp,
  Users, ArrowUpRight, ChevronRight, Bell, HeartHandshake,
  Zap, AlertCircle,
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
  KEBAJIKAN_CATEGORY_LABELS, KEBAJIKAN_THEME_COLOR,
} from '@/types';
import { cn } from '@/lib/utils';
import { hexToRgba } from '@/lib/utils';

const TEAL = KEBAJIKAN_THEME_COLOR;

export function KebajikanDashboard() {
  const { user, profile } = useAuth();
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const notifs = useNotificationStore(state => state.notifs);
  const markRead = useNotificationStore(state => state.markRead);
  const [stats, setStats]     = useState<KebajikanPublicStats | null>(null);
  const [monthly, setMonthly] = useState<KebajikanMonthlyStats[]>([]);
  const [recent, setRecent]   = useState<KebajikanTicket[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="p-8 max-w-7xl mx-auto min-h-screen relative">
      {/* Greeting */}
      <div className="mb-10 relative z-10">
        <motion.h1 initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl font-black text-slate-50 mb-2 tracking-tight">
          Selamat {getGreeting()},{name}! 👋
        </motion.h1>
        <p className="text-sm text-slate-400 font-medium">Berikut adalah ringkasan sistem aduan pelajar hari ini.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.07 }}>
            <Link to={s.href} className="block group">
              <div
                className="rounded-3xl p-6 border transition-all duration-300 hover:scale-[1.02] cursor-pointer shadow-2xl backdrop-blur-xl relative overflow-hidden"
                style={{ background: `rgba(${hexToRgbStr(s.color)}, 0.03)`, borderColor: `rgba(${hexToRgbStr(s.color)}, 0.15)` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" style={{ backgroundImage: `linear-gradient(to bottom right, rgba(${hexToRgbStr(s.color)}, 0.5), transparent)` }} />
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner" style={{ background: `rgba(${hexToRgbStr(s.color)}, 0.15)` }}>
                    <s.icon className="w-6 h-6" style={{ color: s.color }} />
                  </div>
                  <ArrowUpRight className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: s.color }} />
                </div>
                <p className="text-3xl font-black text-slate-50 mb-1 relative z-10">{loading ? '—' : typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 relative z-10">{s.label}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8 relative z-10">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-3xl p-8 border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h2 className="font-black text-lg text-slate-100">Trend Aduan Bulanan</h2>
              <p className="text-xs text-slate-500 font-medium">Diterima vs Diselesaikan — 6 bulan</p>
            </div>
            <Link to="/kebajikan/laporan" className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: TEAL }}>
              Laporan Penuh <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month_label" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }} labelStyle={{ color: 'white', fontWeight: 700 }} />
                <Bar dataKey="received" name="Diterima" fill="rgba(99,102,241,0.7)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Diselesaikan" fill={TEAL} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-white/20">Belum ada data</div>
          )}
        </div>

        {/* Notif panel */}
        <div className="rounded-3xl p-6 border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl shadow-2xl relative overflow-hidden leading-relaxed">
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" style={{ color: TEAL }} />
              <h2 className="font-black text-lg text-slate-100">Notifikasi</h2>
              {unreadCount > 0 && <span className="text-[9px] font-black bg-red-500 text-white rounded-full px-1.5 py-0.5">{unreadCount}</span>}
            </div>
            {unreadCount > 0 && (
              <button onClick={() => notifs.filter(n => !n.is_read).forEach(n => markRead(n.id))} className="text-[9px] font-black uppercase tracking-wider text-white/30 hover:text-white/60 transition-colors">
                Baca Semua
              </button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="w-10 h-10 mx-auto mb-3 text-white/10" />
              <p className="text-xs text-slate-500 font-medium">Tiada notifikasi baharu</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-hide relative z-10">
              {notifs.slice(0, 6).map(n => (
                <motion.div
                  key={n.id} layout
                  className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors"
                  style={{ borderLeft: `3px solid ${n.type === 'ESCALATION' ? '#EF4444' : n.type === 'WARNING' ? '#F59E0B' : TEAL}`, opacity: n.is_read ? 0.5 : 1 }}
                  onClick={() => markRead(n.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white leading-tight truncate">{n.title}</p>
                    <p className="text-[10px] text-white/40 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
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
        <div className="mt-8 rounded-3xl p-8 border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl shadow-2xl relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-black text-lg text-slate-100 mb-1">Tiket Memerlukan Tindakan</h2>
              <p className="text-xs text-slate-500 font-medium">Baru, Diescalate & Dibuka Semula</p>
            </div>
            <Link to="/kebajikan/tiket" className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:text-teal-400 transition-colors bg-white/5 px-4 py-2 rounded-xl" style={{ color: TEAL }}>
              Semua Tiket <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {recent.slice(0, 5).map(t => (
              <Link key={t.id} to={`/kebajikan/tiket/${t.id}`} className="flex items-center gap-5 px-6 py-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:shadow-lg transition-all group overflow-hidden">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-200 truncate mb-1">{t.title}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.ticket_no}</span>
                    <span className="text-[10px] font-bold text-slate-700 opacity-50">·</span>
                    <span className="text-[10px] font-medium text-slate-500">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ms })}</span>
                  </div>
                </div>
                <span className={cn('text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide flex-shrink-0', KEBAJIKAN_STATUS_COLORS[t.status])}>
                  {KEBAJIKAN_STATUS_LABELS[t.status]}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}
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
