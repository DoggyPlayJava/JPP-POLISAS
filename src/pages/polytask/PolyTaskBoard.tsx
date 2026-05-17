import React, { useState, useEffect } from 'react';
import { formatMaskedName } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Search, MapPin, Clock, Loader2, User, Briefcase, Zap, ShieldCheck, Laptop, Bike, Wrench, Palette, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ms } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { PolyTaskSkeletonCard } from './PolyTaskSkeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useTour } from '@/hooks/useTour';
import { SystemTour } from '@/components/ui/SystemTour';
import { HelpCircle } from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'Semua', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { id: 'AKADEMIK', label: 'Akademik', icon: Laptop, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  { id: 'RUNNER', label: 'Runner', icon: Bike, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { id: 'TEKNIKAL', label: 'Teknikal', icon: Wrench, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { id: 'KREATIF', label: 'Kreatif', icon: Palette, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
  { id: 'LAIN-LAIN', label: 'Lain-lain', icon: MoreHorizontal, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
];

export function PolyTaskBoard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('LATEST');
  const [moduleEnabled, setModuleEnabled] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { runTour, startTour, closeTour } = useTour('POLYTASK_BOARD', !!user);

  useEffect(() => {
    checkModuleStatus();
    const cachedJobs = sessionStorage.getItem('polytask_cached_jobs');
    if (cachedJobs) {
      try {
        setJobs(JSON.parse(cachedJobs));
        setLoading(false);
      } catch (e) {
        console.error('Failed to parse cached jobs', e);
      }
    }
    fetchJobs();
  }, []);

  const checkModuleStatus = async () => {
    const { data } = await supabase.from('portal_settings').select('is_enabled').eq('exco_module', 'polytask').maybeSingle();
    if (data && data.is_enabled === false) {
      setModuleEnabled(false);
    }
  };

  const fetchJobs = async () => {
    if (jobs.length === 0) setLoading(true);
    
    const { data, error } = await supabase
      .from('polytask_jobs')
      .select('*, requester:profiles!requester_id(full_name, avatar_url, phone)')
      .eq('status', 'OPEN')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJobs(data);
      sessionStorage.setItem('polytask_cached_jobs', JSON.stringify(data));
    }
    setLoading(false);
  };

  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase()) || 
                            job.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'ALL' || job.category === activeCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'LATEST') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'HIGHEST_PAY') {
        return b.budget - a.budget;
      } else if (sortBy === 'URGENT') {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-24 font-sans">
      
      {/* ── HERO SECTION (Fiverr / TaskRabbit Vibe) ── */}
      <div className="relative pt-12 pb-20 px-4 md:px-8 overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
        {/* Background Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[150%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[150%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        {/* Help Button */}
        <button 
          onClick={startTour} 
          className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all backdrop-blur-md border border-white/10"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center max-w-2xl w-full"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-6 text-xs font-bold text-indigo-300 tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% Khidmat Pelajar ke Pelajar
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500 tracking-tight leading-[1.1] mb-6">
            Cari Peluang,<br /> Jana Pendapatan.
          </h1>
          
          {/* Main Search Bar */}
          <div className="relative group max-w-xl mx-auto w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="relative flex items-center bg-slate-900/80 border border-white/10 rounded-2xl p-2 backdrop-blur-xl shadow-2xl">
              <Search className="w-6 h-6 text-slate-400 ml-4 shrink-0" />
              <input 
                type="text"
                placeholder="Cari tugasan (Cth: Format Laptop, Beli Makanan...)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-transparent border-none px-4 py-3 text-white focus:outline-none focus:ring-0 text-base md:text-lg placeholder:text-slate-500"
              />
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] shrink-0">
                Cari
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {!moduleEnabled ? (
          <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-16 text-center flex flex-col items-center mt-8 mb-16">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
              <ShieldCheck className="w-10 h-10 text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Modul Ditutup Sementara</h3>
            <p className="text-slate-400 max-w-md">Sistem PolyTask sedang diselenggara atau ditutup sementara oleh pihak pentadbir JPP. Sila kembali semula nanti.</p>
          </div>
        ) : (
          <>
            {/* ── CATEGORY PILLS ── */}
            <div className="mb-10 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
              <div className="flex gap-3 min-w-max">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-300 font-bold text-sm border ${
                      activeCategory === cat.id 
                        ? 'bg-slate-800 border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.2)] text-white' 
                        : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${cat.bg} ${cat.color}`}>
                      <cat.icon className="w-3.5 h-3.5" />
                    </div>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── JOB BOARD GRID ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 tour-step-board-main">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                Tugasan Tersedia 
                <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-md">{filteredJobs.length}</span>
              </h2>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Susunan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-900/80 border border-white/10 text-slate-200 text-sm font-semibold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <option value="LATEST">Paling Baru</option>
                  <option value="HIGHEST_PAY">Upah Tertinggi</option>
                  <option value="URGENT">Masa Terdekat</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <PolyTaskSkeletonCard key={i} />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="bg-slate-900/30 border border-dashed border-white/10 rounded-3xl p-16 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                  <Briefcase className="w-10 h-10 text-slate-600" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Tiada Hasil Ditemui</h3>
                <p className="text-slate-400 max-w-md">Cuba gunakan kata kunci yang berbeza atau pilih kategori lain.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredJobs.map((job, idx) => {
                    const daysLeft = differenceInDays(new Date(job.deadline), new Date());
                    const isUrgent = daysLeft <= 1;
                    const catInfo = CATEGORIES.find(c => c.id === job.category) || CATEGORIES[5];

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        key={job.id}
                        onClick={() => navigate(`/polytask/job/${job.id}`)}
                        className={`group relative bg-slate-900 border border-white/5 rounded-3xl p-6 cursor-pointer hover:bg-slate-800/50 transition-all flex flex-col ${idx === 0 ? 'tour-step-bid' : ''}`}
                      >
                        {/* Hover Glow Effect */}
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        
                        {/* Header: Requester Info & Price */}
                        <div className="flex justify-between items-start mb-5 relative z-10 gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-white/10 shrink-0">
                              {job.requester?.avatar_url ? (
                                <img src={job.requester.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-slate-500 m-2.5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-200 truncate">{formatMaskedName(job.requester?.full_name)}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold truncate">
                                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ms })}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <span className="text-emerald-400 font-black tracking-tight whitespace-nowrap">RM {job.budget.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Job Title */}
                        <h3 className="text-xl font-bold text-white leading-tight mb-4 group-hover:text-indigo-300 transition-colors line-clamp-2 relative z-10">
                          {job.title}
                        </h3>

                        {/* Meta Data */}
                        <div className="mt-auto pt-4 flex flex-wrap gap-2 relative z-10">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${catInfo.bg} ${catInfo.color} ${catInfo.border}`}>
                            <catInfo.icon className="w-3.5 h-3.5" />
                            {catInfo.label}
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-800/50 border border-white/5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span className="truncate max-w-[100px]">{job.location}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isUrgent 
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                              : 'bg-slate-800/50 border-white/5 text-slate-400'
                          }`}>
                            <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-500' : 'text-slate-500'}`} />
                            {isUrgent ? 'Segera' : `${daysLeft} Hari Lagi`}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      <SystemTour run={runTour} onClose={closeTour} tourKey="POLYTASK_BOARD" />
    </div>
  );
}
