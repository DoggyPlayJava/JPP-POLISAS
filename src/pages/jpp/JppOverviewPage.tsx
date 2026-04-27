import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Users, Flag, BarChart3, FileText, Loader2,
  Store, ShoppingBag, Heart, Trophy, Shield, CalendarDays
} from 'lucide-react';
import { hexToRgba } from '@/lib/utils';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subDays, isAfter, parseISO } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SystemStats {
  totalJpp: number;
  totalClubs: number;
  activeClubs: number;
  totalActivities: number;
  totalReports: number;
  totalStudents: number;
  totalBusinesses: number;
  totalProducts: number;
  totalTickets: number;
  totalSports: number;
}

// ── Stat block ────────────────────────────────────────────────────────────────
function BigStatCard({
  label, value, icon: Icon, color, sub, delay,
}: {
  label: string; value: number | string; icon: React.ElementType;
  color: string; sub?: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] p-5 hover:bg-white/[0.05] transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: hexToRgba(color, 0.15) }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
          Sistem
        </span>
      </div>
      <p className="text-3xl font-black text-white leading-none">{value}</p>
      <p className="text-xs font-black uppercase tracking-widest text-white/35 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-white/20 mt-1">{sub}</p>}
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function JppOverviewPage() {
  const { isSuperAdmin } = useAuth();

  const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
  const [stats, setStats]           = useState<SystemStats | null>(null);
  const [loading, setLoading]       = useState(true);

  // Chart states
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('30d');
  const [rawProfiles, setRawProfiles] = useState<{ created_at: string }[]>([]);
  const [ticketStats, setTicketStats] = useState<{ name: string; value: number; color: string }[]>([]);

  // Fetch theme color
  useEffect(() => {
    supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
      .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
  }, []);

  // Fetch system stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const [
        jppRes, studRes, allClubRes, actClubRes, actRes, repRes, 
        bizRes, prodRes, tickRes, sportRes, profRes, ticketStatusRes
      ] = await Promise.all([
        // Total JPP members
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'JPP'),
        // Total registered students
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        // Total clubs
        supabase.from('clubs').select('id', { count: 'exact', head: true }),
        // Active clubs
        supabase.from('clubs').select('id', { count: 'exact', head: true }).eq('is_active', true),
        // Total activities
        supabase.from('club_activities').select('id', { count: 'exact', head: true }),
        // Total reports
        supabase.from('club_reports').select('id', { count: 'exact', head: true }),
        // Additional modules
        supabase.from('keusahawanan_businesses').select('id', { count: 'exact', head: true }),
        supabase.from('business_products').select('id', { count: 'exact', head: true }),
        supabase.from('kebajikan_tickets').select('id', { count: 'exact', head: true }),
        supabase.from('supsas_sports').select('id', { count: 'exact', head: true }),
        // Raw Profiles for chart
        supabase.from('profiles').select('created_at'),
        // Kebajikan for pie chart
        supabase.from('kebajikan_tickets').select('status')
      ]);

      setStats({
        totalJpp:        jppRes.count ?? 0,
        totalStudents:   studRes.count ?? 0,
        totalClubs:      allClubRes.count ?? 0,
        activeClubs:     actClubRes.count ?? 0,
        totalActivities: actRes.count ?? 0,
        totalReports:    repRes.count ?? 0,
        totalBusinesses: bizRes.count ?? 0,
        totalProducts:   prodRes.count ?? 0,
        totalTickets:    tickRes.count ?? 0,
        totalSports:     sportRes.count ?? 0,
      });

      if (profRes.data) {
        setRawProfiles(profRes.data);
      }

      if (ticketStatusRes.data) {
        let open = 0;
        let resolved = 0;
        ticketStatusRes.data.forEach(t => {
          if (t.status === 'RESOLVED' || t.status === 'CLOSED') resolved++;
          else if (t.status !== 'CANCELLED') open++;
        });
        setTicketStats([
          { name: 'Terbuka', value: open, color: '#EF4444' }, // Red
          { name: 'Selesai', value: resolved, color: '#10B981' } // Green
        ]);
      }

      setLoading(false);
    };
    fetchStats();
  }, []);

  const chartData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : 30;
    const startDate = subDays(new Date(), days - 1);
    
    // Initialize map
    const dateMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), 'MMM dd');
      dateMap.set(d, 0);
    }

    rawProfiles.forEach(p => {
      if (!p.created_at) return;
      const d = parseISO(p.created_at);
      if (isAfter(d, startDate) || format(d, 'MMM dd') === format(startDate, 'MMM dd')) {
        const key = format(d, 'MMM dd');
        if (dateMap.has(key)) {
          dateMap.set(key, dateMap.get(key)! + 1);
        }
      }
    });

    return Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }));
  }, [rawProfiles, timeRange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-3 shadow-xl backdrop-blur-md">
          <p className="text-white/60 text-xs font-bold mb-1">{label}</p>
          <p className="text-white font-black text-lg">
            {payload[0].value} <span className="text-xs font-medium text-white/50">pelajar</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-[10%] right-[10%] w-[40vw] h-[40vw] rounded-full blur-3xl opacity-5"
          style={{ background: themeColor }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: hexToRgba(themeColor, 0.15), border: `1px solid ${hexToRgba(themeColor, 0.25)}` }}
            >
              <BarChart3 className="w-5 h-5" style={{ color: themeColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">Gambaran Sistem</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                Data keseluruhan portal JPP
              </p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-white/20" />
          </div>
        ) : (
          <>
            {/* ── Main Stats Grid ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BigStatCard label="Ahli JPP"         value={stats?.totalJpp ?? 0}        icon={Shield}    color={themeColor} delay={0.05} />
              <BigStatCard label="Pelajar Berdaftar" value={stats?.totalStudents ?? 0}   icon={Users}     color="#60A5FA"    delay={0.10} />
              <BigStatCard label="Jumlah Kelab"      value={stats?.totalClubs ?? 0}      icon={Flag}      color="#4ADE80" delay={0.15} />
              <BigStatCard label="Bisnes"            value={stats?.totalBusinesses ?? 0} icon={Store}     color="#F59E0B"    delay={0.20} />
              <BigStatCard label="Produk PolyMart"   value={stats?.totalProducts ?? 0}   icon={ShoppingBag} color="#EC4899" delay={0.25} />
              <BigStatCard label="Aduan Kebajikan"   value={stats?.totalTickets ?? 0}    icon={Heart}     color="#EF4444"    delay={0.30} />
              <BigStatCard label="Acara Sukan"       value={stats?.totalSports ?? 0}     icon={Trophy}    color="#EAB308"    delay={0.35} />
              <BigStatCard label="Laporan"           value={stats?.totalReports ?? 0}    icon={FileText}  color="#A78BFA"    delay={0.40} />
            </div>

            {/* ── Charts Grid ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Registration Trend Area Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="lg:col-span-2 rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] p-6 flex flex-col"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white/40 mb-1">
                      Trend Pendaftaran Pelajar
                    </h2>
                    <p className="text-2xl font-black text-white">
                      {chartData.reduce((acc, curr) => acc + curr.count, 0)} <span className="text-xs text-white/30 font-medium">baru mendaftar</span>
                    </p>
                  </div>
                  <div className="flex items-center bg-white/5 rounded-xl p-1 shrink-0">
                    <button
                      onClick={() => setTimeRange('7d')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                        timeRange === '7d' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                      }`}
                    >
                      7 Hari
                    </button>
                    <button
                      onClick={() => setTimeRange('30d')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                        timeRange === '30d' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                      }`}
                    >
                      30 Hari
                    </button>
                  </div>
                </div>

                <div className="h-64 w-full mt-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={themeColor} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={themeColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                        minTickGap={20}
                      />
                      <YAxis 
                        hide 
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke={themeColor} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorCount)" 
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Kebajikan Tickets Pie Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] p-6 flex flex-col"
              >
                <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white/40 mb-2">
                  Status Tiket Kebajikan
                </h2>
                
                <div className="flex-1 min-h-[200px] w-full flex items-center justify-center relative mt-4">
                  {ticketStats.every(t => t.value === 0) ? (
                    <div className="text-center">
                      <Heart className="w-8 h-8 text-white/10 mx-auto mb-2" />
                      <p className="text-xs text-white/30 font-medium">Tiada tiket kebajikan</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ticketStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                          animationDuration={1500}
                        >
                          {ticketStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0a0a0f', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontWeight: 800 }}
                          itemStyle={{ color: 'white' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  {/* Center Text for Donut */}
                  {!ticketStats.every(t => t.value === 0) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black text-white leading-none">
                        {stats?.totalTickets ?? 0}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest font-black text-white/30 mt-1">
                        Tiket
                      </span>
                    </div>
                  )}
                </div>

                {/* Custom Legend */}
                {!ticketStats.every(t => t.value === 0) && (
                  <div className="flex justify-center gap-6 mt-6">
                    {ticketStats.map(stat => (
                      <div key={stat.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                        <span className="text-xs font-black text-white/50">{stat.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
            
          </>
        )}
      </div>
    </div>
  );
}
