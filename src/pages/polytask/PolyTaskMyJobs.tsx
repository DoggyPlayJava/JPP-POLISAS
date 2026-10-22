import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Briefcase, ChevronRight, User, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { PolyTaskSkeletonCard } from './PolyTaskSkeleton';
import { useTour } from '@/hooks/useTour';
import { SystemTour } from '@/components/ui/SystemTour';

export function PolyTaskMyJobs() {
  const { t } = useTranslation(['gig', 'common']);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { runTour, startTour, closeTour } = useTour('POLYTASK_MYJOBS', !!profile);

  useEffect(() => {
    if (profile) {
      fetchMyJobs();
    }
  }, [profile]);

  const fetchMyJobs = async () => {
    setLoading(true);
    // Get jobs where the user is the requester, including bid count
    const { data, error } = await supabase
      .from('polytask_jobs')
      .select('*, polytask_bids(count)')
      .eq('requester_id', profile?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJobs(data);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'OPEN': return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">{t('gig:status_open', 'DIBUKA')}</span>;
      case 'IN_PROGRESS': return <span className="px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-full border border-purple-500/20">{t('gig:status_in_progress', 'SEDANG DIJALANKAN')}</span>;
      case 'COMPLETED': return <span className="px-3 py-1 bg-slate-500/10 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-full border border-slate-500/20">{t('gig:status_completed_task', 'SELESAI')}</span>;
      case 'CANCELLED': return <span className="px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-full border border-rose-500/20">{t('gig:status_cancelled_task', 'DIBATALKAN')}</span>;
      default: return null;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{t('gig:my_jobs_title_prefix', 'Kerja')} <span className="text-purple-600 dark:text-purple-400">{t('gig:my_jobs_title_suffix', 'Saya')}</span></h1>
          <p className="text-slate-600 dark:text-slate-400">{t('gig:my_jobs_subtitle', 'Pantau status tugasan yang anda iklankan dan pilih Tasker terbaik.')}</p>
        </div>
        <button 
          onClick={startTour} 
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-200 dark:border-white/5 shrink-0"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
          {[1, 2, 3, 4].map((i) => (
            <PolyTaskSkeletonCard key={i} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/30 border border-dashed border-slate-300 dark:border-white/10 rounded-3xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('gig:no_jobs_posted_title', 'Belum ada tugasan')}</h3>
          <p className="text-slate-600 dark:text-slate-400 max-w-sm mb-6">
            {t('gig:no_jobs_posted_desc', 'Anda belum pernah mengiklankan apa-apa tugasan setakat ini. Cipta tugasan pertama anda sekarang!')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
          {jobs.map((job, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={job.id}
              onClick={() => navigate(`/polytask/job/${job.id}`)}
              className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-3xl p-6 flex flex-col cursor-pointer hover:border-purple-300 dark:hover:border-purple-500/30 hover:shadow-xl transition-all shadow-xs"
            >
              <div className={`flex items-center justify-between mb-4 ${idx === 0 ? 'tour-myjobs-status' : ''}`}>
                {getStatusBadge(job.status)}
                <span className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ms })}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-tight">{job.title}</h3>
              
              <div className={`mt-auto pt-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between ${idx === 0 ? 'tour-myjobs-rating' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/10">
                    <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">{t('gig:bids_received_label', 'Bidaan Diterima')}</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{t('gig:bids_received_count', '{{count}} Tasker', { count: job.polytask_bids?.[0]?.count || 0 })}</p>
                  </div>
                </div>

                <button className="group flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md shadow-purple-500/25 active:scale-95">
                  {t('gig:view_bids_btn', 'Lihat Bidaan')} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <SystemTour run={runTour} onClose={closeTour} tourKey="POLYTASK_MYJOBS" />
    </div>
  );
}
