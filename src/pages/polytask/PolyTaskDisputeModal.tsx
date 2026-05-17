import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface PolyTaskDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  reporterId: string;
  onDisputeSubmitted: () => void;
}

export function PolyTaskDisputeModal({ isOpen, onClose, jobId, reporterId, onDisputeSubmitted }: PolyTaskDisputeModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Sila nyatakan sebab anda melaporkan tugasan ini.');
      return;
    }

    setSubmitting(true);
    
    // 1. Insert into polytask_disputes
    const { error: disputeError } = await supabase.from('polytask_disputes').insert({
      job_id: jobId,
      reporter_id: reporterId,
      reason: reason.trim()
    });

    if (disputeError) {
      console.error(disputeError);
      toast.error('Gagal menghantar aduan. Sila cuba lagi.');
      setSubmitting(false);
      return;
    }

    // 2. Update job status to DISPUTED
    const { error: jobError } = await supabase.from('polytask_jobs').update({
      status: 'DISPUTED'
    }).eq('id', jobId);

    setSubmitting(false);

    if (jobError) {
      console.error(jobError);
      toast.error('Aduan dihantar, tetapi status tugasan gagal dikemaskini.');
    } else {
      toast.success('Aduan berjaya dihantar. Admin JPP akan menyemak kes ini.');
      onDisputeSubmitted();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="relative bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-6 overflow-hidden shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-2xl font-black text-white">Lapor Pertikaian</h2>
              <p className="text-sm text-slate-400 mt-2">
                Adakah berlaku masalah seperti bayaran tidak diterima, atau tugasan tidak disiapkan? Aduan anda akan dihantar kepada Admin JPP.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sebab Aduan / Pertikaian
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Cth: Tasker sudah lari dan kerja tidak siap / Peminta enggan membayar upah..."
                rows={4}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-rose-500/50 outline-none resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Sedang Menghantar...
                </>
              ) : (
                'Hantar Laporan'
              )}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
