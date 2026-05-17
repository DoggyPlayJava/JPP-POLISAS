import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { X, Star, Briefcase, Award, ShieldCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatMaskedName } from '@/lib/utils';

interface TaskerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskerId: string;
  isAccepted?: boolean;
}

export function TaskerProfileModal({ isOpen, onClose, taskerId, isAccepted = false }: TaskerProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    completedJobs: 0,
    cancellations: 0,
    averageRating: 0,
    totalReviews: 0,
  });

  useEffect(() => {
    if (isOpen && taskerId) {
      fetchTaskerData();
    }
  }, [isOpen, taskerId]);

  const fetchTaskerData = async () => {
    setLoading(true);

    // 1. Fetch Profile Info (including cancellation metrics)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, program, semester, polytask_cancellations')
      .eq('id', taskerId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // 2. Fetch Completed Jobs via Bids
    const { data: bidsData } = await supabase
      .from('polytask_bids')
      .select('id, job:polytask_jobs!inner(status)')
      .eq('tasker_id', taskerId)
      .eq('status', 'ACCEPTED')
      .eq('polytask_jobs.status', 'COMPLETED');

    const completedCount = bidsData ? bidsData.length : 0;

    // 3. Fetch Reviews
    const { data: reviewsData } = await supabase
      .from('polytask_reviews')
      .select('rating')
      .eq('reviewee_id', taskerId);

    let avgRating = 0;
    let totalReviews = 0;
    if (reviewsData && reviewsData.length > 0) {
      totalReviews = reviewsData.length;
      const sum = reviewsData.reduce((acc, curr) => acc + curr.rating, 0);
      avgRating = sum / totalReviews;
    }

    setStats({
      completedJobs: completedCount,
      cancellations: profileData?.polytask_cancellations || 0,
      averageRating: avgRating,
      totalReviews,
    });

    setLoading(false);
  };

  const totalAccepted = stats.completedJobs + stats.cancellations;
  const cancellationRate = totalAccepted > 0 ? (stats.cancellations / totalAccepted) * 100 : 0;
  
  // To be a Top Tasker: Min 5 completed jobs, rating >= 4.5, and cancellation rate <= 20%
  const isTopTasker = stats.completedJobs >= 5 && stats.averageRating >= 4.5 && cancellationRate <= 20;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 md:p-8"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

            {loading ? (
              <div className="animate-pulse flex flex-col items-center py-8">
                <div className="w-24 h-24 bg-slate-800 rounded-full mb-4" />
                <div className="w-40 h-6 bg-slate-800 rounded mb-2" />
                <div className="w-24 h-4 bg-slate-800 rounded" />
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {/* Avatar with Glow if Top Tasker */}
                <div className="relative mb-4">
                  {isTopTasker && (
                    <div className="absolute inset-0 bg-yellow-500 blur-xl opacity-30 rounded-full" />
                  )}
                  <div className={`relative w-24 h-24 rounded-full overflow-hidden border-4 ${isTopTasker ? 'border-yellow-400' : 'border-slate-800'} bg-slate-800 flex items-center justify-center`}>
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Tasker" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-slate-500" />
                    )}
                  </div>
                  {isTopTasker && (
                    <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-yellow-400 to-amber-600 text-white p-1.5 rounded-full shadow-lg border border-yellow-200">
                      <Award className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Name & Badge */}
                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                  {isAccepted ? (profile?.full_name || 'Pelajar POLISAS') : formatMaskedName(profile?.full_name)}
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </h2>
                
                {isTopTasker ? (
                  <span className="text-sm font-bold text-yellow-400 uppercase tracking-widest mb-6">Top Tasker</span>
                ) : (
                  <span className="text-sm text-slate-400 mb-6">Tasker Disahkan</span>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 w-full mb-6">
                  <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-3 flex flex-col items-center text-center hover:bg-slate-800/50 transition-colors">
                    <Star className={`w-5 h-5 mb-1 ${stats.averageRating >= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-500'}`} />
                    <span className="text-xl font-black text-white">{stats.averageRating.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400">Rating</span>
                  </div>
                  
                  <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-3 flex flex-col items-center text-center hover:bg-slate-800/50 transition-colors">
                    <Briefcase className="w-5 h-5 mb-1 text-indigo-400" />
                    <span className="text-xl font-black text-white">{stats.completedJobs}</span>
                    <span className="text-[10px] text-slate-400">Selesai</span>
                  </div>

                  <div className={`border rounded-2xl p-3 flex flex-col items-center text-center transition-colors ${
                    cancellationRate > 20 ? 'bg-rose-950/30 border-rose-500/20 hover:bg-rose-900/30' : 'bg-slate-950/50 border-white/5 hover:bg-slate-800/50'
                  }`}>
                    <X className={`w-5 h-5 mb-1 ${cancellationRate > 20 ? 'text-rose-400' : 'text-slate-500'}`} />
                    <span className={`text-xl font-black ${cancellationRate > 20 ? 'text-rose-400' : 'text-white'}`}>
                      {cancellationRate.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-slate-400">Batal</span>
                  </div>
                </div>

                <div className="w-full bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
                  <p className="text-sm text-indigo-300 text-center">
                    "Saya berdedikasi membantu memudahkan urusan anda dengan penuh amanah."
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
