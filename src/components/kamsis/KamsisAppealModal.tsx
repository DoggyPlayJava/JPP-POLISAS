import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, X, AlertCircle, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { useAcademicSession } from '@/contexts/AcademicSessionContext';

interface KamsisAppealModalProps {
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export function KamsisAppealModal({ onClose, userId, onSuccess }: KamsisAppealModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { activeSession, semesterString } = useAcademicSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Sila nyatakan alasan rayuan anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Fetch current extra_data
      const { data: current, error: fetchErr } = await supabase
        .from('kamsis_applications')
        .select('extra_data')
        .eq('user_id', userId)
        .eq('session', activeSession)
        .eq('semester', semesterString)
        .single();

      if (fetchErr) throw fetchErr;

      const extra_data = current?.extra_data || {};
      extra_data.appeal_reason = reason.trim();

      // 2. Update status and extra_data
      const { error } = await supabase
        .from('kamsis_applications')
        .update({
          status: 'APPEALING',
          extra_data
        })
        .eq('user_id', userId)
        .eq('session', activeSession)
        .eq('semester', semesterString);

      if (error) throw error;

      // --- Trigger Push Notification ---
      try {
        const { sendNotificationToKamsisAdmin } = await import('@/lib/notifications');
        await sendNotificationToKamsisAdmin({
          title: 'Rayuan Asrama Baru',
          message: `Pelajar telah menghantar rayuan asrama baru.`,
          type: 'INFO',
          module: 'KAMSIS',
          link: '/kamsis/senarai-permohonan'
        });
      } catch (e) {
        console.error("Gagal menghantar notifikasi push", e);
      }

      toast.success('Rayuan berjaya dihantar!');
      onSuccess();
    } catch (err: any) {
      console.error('Submit appeal error:', err);
      toast.error('Gagal menghantar rayuan. Sila cuba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 leading-none mb-1">
                Rayuan Asrama KAMSIS
              </h3>
              <p className="text-xs font-bold text-slate-500">
                Sila nyatakan alasan rayuan anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex gap-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-6">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 leading-relaxed">
              Rayuan ini akan disemak semula oleh pihak pengurusan asrama. Sila berikan alasan yang kukuh berserta justifikasi mengapa anda memerlukan penginapan di asrama.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                Alasan / Justifikasi Rayuan
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Contoh: Saya memerlukan asrama kerana..."
                required
                rows={5}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-black transition-all active:scale-95 shadow-lg shadow-amber-500/20"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Hantar Rayuan</span>
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
