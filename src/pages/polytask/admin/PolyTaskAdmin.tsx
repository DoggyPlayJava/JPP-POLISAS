import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Loader2, Search, Briefcase, Users, AlertTriangle, Filter, MoreVertical, XCircle, Trash2 } from 'lucide-react';
import { FeatureToggle } from '@/components/ui/FeatureToggle';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

export function PolyTaskAdmin() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    // Basic protection: only JPP or SUPER_ADMIN_JPP can access
    if (profile && profile.role !== 'JPP' && profile.role !== 'SUPER_ADMIN_JPP') {
      toast.error('Akses Ditolak. Anda bukan ahli JPP.');
      navigate('/');
      return;
    }
    fetchJobs();
  }, [profile, navigate]);

  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('polytask_jobs')
      .select(`
        *,
        requester:profiles!requester_id(full_name, phone),
        polytask_bids(id, status, tasker:profiles!tasker_id(full_name, phone))
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJobs(data);
    }
    setLoading(false);
  };

  const handleCancelJob = async (id: string) => {
    if (!confirm('Adakah anda pasti mahu membatalkan tugasan ini secara paksa? (Tindakan Admin)')) return;
    
    const toastId = toast.loading('Sedang membatalkan...');
    const { error } = await supabase
      .from('polytask_jobs')
      .update({ status: 'CANCELLED' })
      .eq('id', id);

    if (error) {
      toast.error('Gagal membatalkan tugasan', { id: toastId });
    } else {
      toast.success('Tugasan berjaya dibatalkan', { id: toastId });
      fetchJobs();
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase()) || 
                          job.requester?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'OPEN': return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">DIBUKA</span>;
      case 'IN_PROGRESS': return <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20">SEDANG JALAN</span>;
      case 'COMPLETED': return <span className="px-3 py-1 bg-slate-500/10 text-slate-400 text-xs font-bold rounded-full border border-slate-500/20">SELESAI</span>;
      case 'CANCELLED': return <span className="px-3 py-1 bg-rose-500/10 text-rose-400 text-xs font-bold rounded-full border border-rose-500/20">DIBATALKAN</span>;
      default: return null;
    }
  };

  // ── Chart Data Calculations ──
  const statusChartData = useMemo(() => {
    const counts = { OPEN: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 };
    jobs.forEach(j => { if (counts[j.status as keyof typeof counts] !== undefined) counts[j.status as keyof typeof counts]++; });
    return [
      { name: 'DIBUKA', value: counts.OPEN, color: '#34d399' },
      { name: 'SEDANG JALAN', value: counts.IN_PROGRESS, color: '#818cf8' },
      { name: 'SELESAI', value: counts.COMPLETED, color: '#94a3b8' },
      { name: 'BATAL', value: counts.CANCELLED, color: '#fb7185' },
    ].filter(item => item.value > 0);
  }, [jobs]);

  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach(j => { counts[j.category] = (counts[j.category] || 0) + 1; });
    return Object.keys(counts).map(key => ({
      name: key,
      jumlah: counts[key]
    })).sort((a, b) => b.jumlah - a.jumlah).slice(0, 5); // Top 5 categories
  }, [jobs]);

  const peakHoursChartData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      jumlah: 0
    }));
    
    jobs.forEach(j => {
      const date = new Date(j.created_at);
      const h = date.getHours();
      hours[h].jumlah++;
    });
    
    return hours;
  }, [jobs]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/jpp/keusahawanan-hub')}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">Admin PolyTask</h1>
              <p className="text-xs text-indigo-400 font-bold tracking-wider uppercase">Kawalan Ekonomi Gig</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text"
                placeholder="Cari ID, Tajuk..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none w-full md:w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none appearance-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="OPEN">DIBUKA</option>
              <option value="IN_PROGRESS">SEDANG JALAN</option>
              <option value="COMPLETED">SELESAI</option>
              <option value="CANCELLED">DIBATALKAN</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Module Control */}
        <div className="mb-6 max-w-sm">
           <FeatureToggle 
             moduleId="polytask" 
             label="Modul PolyTask" 
             description="Buka atau tutup fungsi PolyTask kepada pelajar secara global." 
           />
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Jumlah Tugasan', value: jobs.length, icon: Briefcase, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'Sedang Aktif', value: jobs.filter(j => j.status === 'OPEN' || j.status === 'IN_PROGRESS').length, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Pertikaian (Akan Datang)', value: 0, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Batal', value: jobs.filter(j => j.status === 'CANCELLED').length, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 md:p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Analytics Charts Section */}
        {!loading && jobs.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 shadow-xl col-span-1">
              <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                Taburan Status Tugasan
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {statusChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name} ({item.value})
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 shadow-xl col-span-1 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                Kategori Popular
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                    />
                    <Bar dataKey="jumlah" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 shadow-xl col-span-1 lg:col-span-3 mt-4">
              <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2">
                Analitik Waktu Puncak (Heatmap Harian)
              </h3>
              <p className="text-xs text-slate-400 mb-6">Waktu yang paling banyak pelajar memuat naik / meminta tugasan dalam sistem.</p>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={peakHoursChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={20} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="jumlah" name="Tugasan Dicipta" stroke="#818cf8" strokeWidth={3} dot={{ r: 4, fill: '#818cf8', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Data Table / List */}
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-slate-500 text-sm">Memuatkan data...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-20 text-center text-slate-500">
              Tiada rekod tugasan ditemui.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-800/50 text-slate-400 border-b border-white/5">
                  <tr>
                    <th className="p-4 font-semibold">Tugasan</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Peminta</th>
                    <th className="p-4 font-semibold">Tasker</th>
                    <th className="p-4 font-semibold">Upah (RM)</th>
                    <th className="p-4 font-semibold text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredJobs.map(job => {
                    const acceptedBid = job.polytask_bids?.find((b: any) => b.status === 'ACCEPTED');
                    
                    return (
                      <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white mb-1 truncate max-w-[200px]">{job.title}</p>
                          <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ms })}</p>
                        </td>
                        <td className="p-4">{getStatusBadge(job.status)}</td>
                        <td className="p-4">
                          <p className="font-medium text-slate-300 truncate max-w-[150px]">{job.requester?.full_name}</p>
                          <p className="text-xs text-slate-500">{job.requester?.phone || '-'}</p>
                        </td>
                        <td className="p-4">
                          {acceptedBid ? (
                            <div>
                              <p className="font-medium text-indigo-300 truncate max-w-[150px]">{acceptedBid.tasker?.full_name}</p>
                              <p className="text-xs text-slate-500">{acceptedBid.tasker?.phone || '-'}</p>
                            </div>
                          ) : (
                            <span className="text-slate-600 italic text-xs">Belum ada</span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-emerald-400">
                          {job.budget.toFixed(2)}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => navigate(`/polytask/job/${job.id}`)}
                              className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors"
                              title="Lihat Butiran"
                            >
                              <Search className="w-4 h-4" />
                            </button>
                            {(job.status === 'OPEN' || job.status === 'IN_PROGRESS') && (
                              <button 
                                onClick={() => handleCancelJob(job.id)}
                                className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                                title="Batal Paksa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
