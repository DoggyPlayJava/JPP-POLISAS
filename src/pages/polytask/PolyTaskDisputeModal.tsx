import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['gig', 'common']);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error(t('gig:error_specify_dispute_reason', 'Sila nyatakan sebab anda melaporkan tugasan ini.'));
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
      toast.error(t('gig:error_submit_dispute', 'Gagal menghantar aduan. Sila cuba lagi.'));
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
      toast.error(t('gig:error_dispute_status_update', 'Aduan dihantar, tetapi status tugasan gagal dikemaskini.'));
    } else {
      toast.success(t('gig:dispute_submitted_success', 'Aduan berjaya dihantar. Admin JPP akan menyemak kes ini.'));
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
            className="absolute inset-0 bg-slate-950/80 "
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md p-6 overflow-hidden shadow-2xl text-slate-900 dark:text-slate-100"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t('gig:dispute_modal_title', 'Lapor Pertikaian')}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                {t('gig:dispute_modal_desc', 'Adakah berlaku masalah seperti bayaran tidak diterima, atau tugasan tidak disiapkan? Aduan anda akan dihantar kepada Admin JPP.')}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('gig:dispute_reason_label', 'Sebab Aduan / Pertikaian')}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('gig:dispute_reason_placeholder', 'Cth: Tasker sudah lari dan kerja tidak siap / Peminta enggan membayar upah...')}
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-rose-500/50 outline-none resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> {t('gig:sending_report', 'Sedang Menghantar...')}
                </>
              ) : (
                t('gig:send_report_btn', 'Hantar Laporan')
              )}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
