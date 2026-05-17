import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Clock, ChevronRight, CheckCircle, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export function PolyTaskMyBids() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchMyBids();
    }
  }, [profile]);

  const fetchMyBids = async () => {
    setLoading(true);
    // Fetch bids where user is the tasker, including job details
    const { data, error } = await supabase
      .from('polytask_bids')
      .select('*, job:polytask_jobs(*, requester:profiles!requester_id(full_name))')
      .eq('tasker_id', profile?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBids(data);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING': return <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20 flex items-center gap-1"><Clock className="w-3 h-3"/> MENUNGGU</span>;
      case 'ACCEPTED': return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> DITERIMA</span>;
      case 'REJECTED': return <span className="px-3 py-1 bg-rose-500/10 text-rose-400 text-xs font-bold rounded-full border border-rose-500/20 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> DITOLAK</span>;
      default: return null;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">Bidaan <span className="text-indigo-400">Saya</span></h1>
        <p className="text-slate-400">Pantaun status tawaran khidmat anda kepada peminta tugasan.</p>
      </div>

      {loading ? (
        <div className="space-y-4 pb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 flex flex-col sm:flex-row gap-6 animate-pulse overflow-hidden relative">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <div className="flex-1 space-y-4">
                <div className="flex justify-between">
                  <div className="h-4 w-32 bg-slate-800 rounded" />
                  <div className="h-4 w-24 bg-slate-800 rounded" />
                </div>
                <div className="h-6 w-3/4 bg-slate-800 rounded" />
                <div className="flex gap-4">
                  <div className="h-6 w-20 bg-slate-800 rounded-md" />
                  <div className="h-6 w-32 bg-slate-800 rounded-md" />
                </div>
              </div>
              <div className="sm:border-l border-white/5 sm:pl-6 flex flex-col items-center justify-center gap-3 min-w-[150px]">
                <div className="h-4 w-24 bg-slate-800 rounded" />
                <div className="h-8 w-24 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : bids.length === 0 ? (
        <div className="bg-slate-900/30 border border-dashed border-white/10 rounded-3xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Belum ada tawaran bidaan</h3>
          <p className="text-slate-400 max-w-sm mb-6">
            Anda belum menghantar bidaan untuk mana-mana tugasan. Lihat Papan Tugasan untuk cari peluang pekerjaan!
          </p>
          <button 
            onClick={() => navigate('/polytask')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
          >
            Cari Tugasan
          </button>
        </div>
      ) : (
        <div className="space-y-4 pb-12">
          {bids.map((bid, idx) => {
            const job = bid.job;
            if (!job) return null;

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={bid.id}
                onClick={() => navigate(`/polytask/job/${job.id}`)}
                className={`group bg-slate-900/60 border rounded-3xl p-6 cursor-pointer hover:bg-slate-800/80 transition-all flex flex-col sm:flex-row gap-6 ${
                  bid.status === 'ACCEPTED' ? 'border-emerald-500/30 bg-emerald-950/10' : 
                  bid.status === 'REJECTED' ? 'border-white/5 opacity-70' : 
                  'border-white/10 hover:border-indigo-500/30'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">
                      Tugasan dari <span className="font-semibold text-slate-300">{job.requester?.full_name}</span>
                    </span>
                    <span className="text-xs text-slate-500">
                      Hantar: {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true, locale: ms })}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-2">{job.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="bg-white/5 px-2 py-1 rounded-md">{job.category}</span>
                    <span>Tarikh Akhir: {new Date(job.deadline).toLocaleDateString('ms-MY')}</span>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-4 sm:border-l border-white/10 sm:pl-6 min-w-[150px] relative">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium mb-1">Tawaran Anda</p>
                    <p className="text-xl font-bold text-emerald-400">RM {bid.bid_amount.toFixed(2)}</p>
                  </div>
                  {getStatusBadge(bid.status)}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 sm:static sm:translate-y-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
