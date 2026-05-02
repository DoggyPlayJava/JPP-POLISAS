import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Building2, MapPin, BarChart3, ChevronRight, HeartHandshake, Database, Wifi
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// Lazy load map
const KlkHotspotMap = lazy(() => import('@/components/klk/KlkHotspotMap').then(m => ({ default: m.KlkHotspotMap })));

const KLS_COLOR = '#60A5FA';
const KAMSIS_COLOR = '#22C55E';
const ACCENT_COLOR = '#818CF8';

function getCurrentAcademicYear() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

const CATEGORY_COLORS = ['#60A5FA', '#818CF8', '#A78BFA', '#F472B6', '#FB923C', '#FBBF24', '#34D399'];

export function KlkPublicStats() {
  const [stats, setStats] = useState<any>(null);
  const [mapData, setMapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const academicYear = getCurrentAcademicYear();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      let finalStats = null;
      let kawasans: any[] = [];

      // Fetch coord
      const { data: kawasanRes } = await supabase.from('klk_kawasan').select('name, latitude, longitude').eq('is_active', true);
      const kawasanCoords: Record<string, { lat: number; lng: number }> = {};
      (kawasanRes ?? []).forEach((k: any) => {
        kawasanCoords[k.name] = { lat: k.latitude, lng: k.longitude };
      });

      // Try RPC first
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_klk_public_stats', { academic_year_param: academicYear });
      
      if (!rpcErr && rpcData) {
        finalStats = rpcData;
      } else {
        // Fallback to raw query (if RLS allows or if testing locally)
        const { data: allData, error: rawErr } = await supabase
          .from('klk_student_residency')
          .select('id, tinggal_luar, kawasan_kediaman, kawasan_custom, jabatan, source')
          .eq('academic_year', academicYear);
          
        if (!rawErr && allData) {
          const luarData = allData.filter((d: any) => d.tinggal_luar);
          const kamsisData = allData.filter((d: any) => !d.tinggal_luar);
          
          const kawasanMap: Record<string, number> = {};
          luarData.forEach((d: any) => {
            const k = d.kawasan_kediaman === 'LAIN_LAIN' ? (d.kawasan_custom ?? 'LAIN_LAIN') : (d.kawasan_kediaman ?? 'TIDAK DIISI');
            kawasanMap[k] = (kawasanMap[k] ?? 0) + 1;
          });
          const byKawasan = Object.entries(kawasanMap)
            .sort((a, b) => b[1] - a[1])
            .map(([kawasan, count]) => ({ kawasan, count })).slice(0, 10);

          const jabatanMap: Record<string, number> = {};
          luarData.forEach((d: any) => {
            const j = d.jabatan ?? 'TIDAK DIISI';
            jabatanMap[j] = (jabatanMap[j] ?? 0) + 1;
          });
          const byJabatan = Object.entries(jabatanMap)
            .sort((a, b) => b[1] - a[1])
            .map(([jabatan, count]) => ({ jabatan, count }));

          const bySource = {
            webapp: allData.filter((d: any) => d.source === 'WEBAPP').length,
            google_form: allData.filter((d: any) => d.source === 'GOOGLE_FORM').length,
            csv: allData.filter((d: any) => d.source === 'CSV_IMPORT').length,
          };

          finalStats = {
            total_luar: luarData.length,
            total_kamsis: kamsisData.length,
            by_kawasan: byKawasan,
            by_jabatan: byJabatan,
            by_source: bySource,
          };
        }
      }

      if (finalStats) {
        setStats(finalStats);
        // Process map data
        const mData = (finalStats.by_kawasan || []).map((k: any) => ({
          name: k.kawasan,
          count: k.count,
          latitude: kawasanCoords[k.kawasan]?.lat ?? 0,
          longitude: kawasanCoords[k.kawasan]?.lng ?? 0,
        })).filter((k: any) => k.latitude !== 0 && k.longitude !== 0);
        setMapData(mData);
      }
    } catch (err) {
      console.error('[KlkPublicStats] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const statCards = [
    { label: 'Tinggal Luar Kampus', value: loading ? '—' : stats?.total_luar ?? 0, icon: Home, color: KLS_COLOR, description: 'Menyewa di sekitar POLISAS' },
    { label: 'Tinggal Dalam KAMSIS', value: loading ? '—' : stats?.total_kamsis ?? 0, icon: Building2, color: KAMSIS_COLOR, description: 'Menetap di Kolej Kediaman' },
    { label: 'Sumber Aplikasi', value: loading ? '—' : stats?.by_source?.webapp ?? 0, icon: Database, color: ACCENT_COLOR, description: 'Rekod dikumpul melalui portal' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-slate-50 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2" />
      
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5 bg-slate-900/40 backdrop-blur-3xl">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center relative z-10">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
            <div
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full mb-8 shadow-lg backdrop-blur-md"
              style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
            >
              <MapPin className="w-5 h-5" style={{ color: KLS_COLOR }} />
              <span className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: KLS_COLOR }}>
                Exco KLK JPP POLISAS
              </span>
            </div>
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-50 mb-6 leading-tight tracking-tight"
          >
            Taburan <span style={{ color: KLS_COLOR, textShadow: `0 0 40px rgba(96,165,250,0.4)` }}>Kediaman Pelajar</span>
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-base text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Statistik awam taburan tempat tinggal pelajar Politeknik Sultan Haji Ahmad Shah bagi tahun akademik <strong className="text-white">{academicYear}</strong>.
          </motion.p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 space-y-16 relative z-10">
        
        {/* CTA Section */}
        <div
          className="rounded-3xl p-10 text-center border shadow-2xl relative overflow-hidden group"
          style={{ background: `rgba(96,165,250,0.04)`, borderColor: `rgba(96,165,250,0.15)` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-indigo-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
          <Home className="relative z-10 w-16 h-16 mx-auto mb-6" style={{ color: KLS_COLOR, opacity: 0.9 }} filter="drop-shadow(0 0 20px rgba(96,165,250,0.4))" />
          <h3 className="relative z-10 font-black text-2xl text-slate-50 mb-3">Kemaskini Status Kediaman Anda</h3>
          <p className="relative z-10 text-sm text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
            Data ini membantu Exco JPP POLISAS dan pihak pengurusan merancang program serta kemudahan untuk pelajar luar kampus. Log masuk untuk kemaskini status anda.
          </p>
          <button
            onClick={() => {
              sessionStorage.setItem('post_login_redirect', '/tetapan?tab=kediaman');
              navigate('/login?redirect=/tetapan?tab=kediaman');
            }}
            className="relative z-10 inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm text-slate-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: KLS_COLOR, boxShadow: `0 12px 40px rgba(96,165,250,0.4)` }}
          >
            Kemaskini Status Sekarang <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-3xl p-8 text-center border shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
              style={{ background: `rgba(${hexColorToRgb(card.color)}, 0.03)`, borderColor: `rgba(${hexColorToRgb(card.color)}, 0.15)` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" style={{ backgroundImage: `linear-gradient(to bottom right, rgba(${hexColorToRgb(card.color)}, 0.5), transparent)` }} />
              <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner" style={{ background: `rgba(${hexColorToRgb(card.color)}, 0.15)` }}>
                <card.icon className="w-7 h-7" style={{ color: card.color }} />
              </div>
              <p className="relative z-10 text-4xl font-black text-slate-50 mb-2">{card.value}</p>
              <p className="relative z-10 text-[11px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
              <p className="relative z-10 text-xs text-slate-500 mt-3">{card.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Top Kawasan & Map Section */}
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Peta Hotspot */}
          <div className="lg:col-span-3 rounded-3xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col" style={{ minHeight: 450 }}>
            <div className="p-6 border-b border-white/[0.04]">
              <h2 className="font-black text-lg text-slate-100 mb-1">Peta Hotspot Taburan</h2>
              <p className="text-xs text-slate-500 font-medium">Kawasan tumpuan pelajar menyewa di sekitar Kuantan</p>
            </div>
            <div className="flex-1 relative">
              <Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-slate-500 font-medium">Memuatkan peta...</div>}>
                <KlkHotspotMap data={mapData} />
              </Suspense>
              {mapData.length === 0 && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
                  <MapPin className="w-10 h-10 text-white/20 mb-3" />
                  <p className="text-xs text-white/40 font-medium">Tiada data koordinat sedia ada</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Kawasan List */}
          <div className="lg:col-span-2 rounded-3xl p-8 border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl shadow-2xl">
            <h2 className="font-black text-lg text-slate-100 mb-1">Top Kawasan</h2>
            <p className="text-xs text-slate-500 font-medium mb-8">Pilihan utama pelajar tinggal luar kampus</p>
            
            {stats?.by_kawasan && stats.by_kawasan.length > 0 ? (
              <div className="space-y-4">
                {stats.by_kawasan.map((k: any, i: number) => {
                  const maxCount = stats.by_kawasan[0]?.count ?? 1;
                  return (
                    <div key={k.kawasan} className="group cursor-default">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black bg-white/5 text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">{i + 1}</span>
                          <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors truncate max-w-[150px]">{k.kawasan}</span>
                        </div>
                        <span className="text-sm font-black text-slate-300">{k.count} <span className="text-[10px] text-slate-500 font-medium">pelajar</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(k.count / maxCount) * 100}%` }}
                          transition={{ delay: 0.2 + i * 0.05, duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ background: i === 0 ? '#EF4444' : i === 1 ? '#F59E0B' : KLS_COLOR }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>

        {/* Jabatan Charts Section */}
        <div className="rounded-3xl p-8 border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-10">
            <h2 className="font-black text-2xl text-slate-100 mb-2">Pecahan Mengikut Jabatan</h2>
            <p className="text-sm text-slate-500 font-medium">Kadar taburan pelajar luar kampus berdasarkan jabatan akademik masing-masing</p>
          </div>
          
          {stats?.by_jabatan && stats.by_jabatan.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.by_jabatan} dataKey="count" cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={4} stroke="none">
                      {stats.by_jabatan.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: 'white', fontWeight: 800 }}
                      formatter={(v: any, n: any, props: any) => [v + ' pelajar', props.payload.jabatan]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                {stats.by_jabatan.map((j: any, i: number) => (
                  <div key={j.jabatan} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/[0.05]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-inner flex-shrink-0" style={{ background: `rgba(${hexColorToRgb(CATEGORY_COLORS[i % CATEGORY_COLORS.length])}, 0.15)`, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}>
                      {j.jabatan.substring(0, 3).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-200">{j.jabatan}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(j.count / stats.total_luar) * 100}%`, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 w-8 text-right">{Math.round((j.count / stats.total_luar) * 100)}%</span>
                      </div>
                    </div>
                    <div className="text-right pl-4 border-l border-white/5">
                      <p className="text-lg font-black text-white">{j.count}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Pelajar</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>

      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <BarChart3 className="w-12 h-12 text-white/10 mb-4" />
      <p className="text-xs text-white/40 font-medium">Belum ada data yang mencukupi</p>
    </div>
  );
}

function hexColorToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
