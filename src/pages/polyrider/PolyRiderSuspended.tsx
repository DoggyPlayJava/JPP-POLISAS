import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, FileText, Send, Info, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { BottomNav } from '@/components/layout/BottomNav';

interface PolyRiderSuspendedProps {
  suspendedUntil: string;
}

export function PolyRiderSuspended({ suspendedUntil }: PolyRiderSuspendedProps) {
  const { user } = useAuth();
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [klkPhone, setKlkPhone] = useState<string>('');

  React.useEffect(() => {
    const checkExistingAppeal = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('polyrider_appeals')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'PENDING')
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setAppealSubmitted(true);
      }
      setCheckingExisting(false);
    };

    const fetchPhone = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'klk_emergency_phone').single();
      if (data?.value) {
        try { setKlkPhone(JSON.parse(data.value)); } catch { setKlkPhone(data.value); }
      }
    };

    checkExistingAppeal();
    fetchPhone();
  }, [user]);

  const suspensionDate = new Date(suspendedUntil);
  const formattedDate = suspensionDate.toLocaleDateString('ms-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = suspensionDate.toLocaleTimeString('ms-MY', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    const { error } = await supabase.from('polyrider_appeals').insert({
      user_id: user?.id,
      reason: reason
    });

    setIsSubmitting(false);

    if (error) {
      toast.error('Gagal menghantar rayuan: ' + error.message);
    } else {
      toast.success('Rayuan berjaya dihantar!');
      setAppealSubmitted(true);
      setShowAppealModal(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-red-50 dark:bg-zinc-950 after:content-[''] after:block after:h-32 after:shrink-0">
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-red-100 dark:border-red-900/30 overflow-hidden relative"
        >
          {/* Danger background effect */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-24 h-24 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
            <AlertOctagon className="w-12 h-12 text-red-600 dark:text-red-500" />
          </div>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 relative z-10">Akaun Digantung</h1>
          
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 relative z-10 leading-relaxed font-medium">
            Akaun PolyRider anda telah digantung kerana melanggar terma & syarat perkhidmatan (cth: Terlalu kerap membatalkan pesanan atau khianat SOS).
          </p>

          <div className="bg-red-50 dark:bg-red-950/50 rounded-2xl p-4 mb-6 relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-1">Penggantungan Tamat Pada</p>
            <p className="text-lg font-black text-red-700 dark:text-red-400">{formattedDate}</p>
            <p className="text-md font-bold text-red-600 dark:text-red-300">{formattedTime}</p>
          </div>

          {checkingExisting ? (
            <div className="py-4 text-slate-400 dark:text-white/40 text-sm font-bold flex items-center justify-center gap-2 relative z-10">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              Menyemak status rayuan...
            </div>
          ) : !appealSubmitted ? (
            <button
              onClick={() => setShowAppealModal(true)}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors relative z-10 shadow-lg shadow-slate-900/20 dark:shadow-white/10"
            >
              <FileText className="w-5 h-5" /> Buat Rayuan
            </button>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-sm font-bold p-4 rounded-xl flex flex-col items-center gap-2 relative z-10">
              <Info className="w-6 h-6" />
              Rayuan telah dihantar dan sedang diproses oleh Exco KLK.
            </div>
          )}

          {klkPhone && (() => {
            let cleanPhone = klkPhone.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) cleanPhone = '6' + cleanPhone;
            else if (!cleanPhone.startsWith('6')) cleanPhone = '60' + cleanPhone;
            
            return (
              <a 
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors relative z-10"
              >
                <Phone className="w-5 h-5" /> Hubungi Exco KLK (WhatsApp)
              </a>
            );
          })()}
        </motion.div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>

      {/* Appeal Modal */}
      <AnimatePresence>
        {showAppealModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowAppealModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-zinc-800"
              >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" /> Borang Rayuan
                </h2>
                <form onSubmit={handleSubmitAppeal}>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Sila nyatakan sebab mengapa akaun anda harus diaktifkan semula. Berikan penjelasan yang kukuh untuk pertimbangan pihak pentadbir.
                  </p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mb-4 resize-none"
                    placeholder="Saya ingin merayu kerana..."
                    required
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAppealModal(false)}
                      className="flex-1 py-3 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !reason.trim()}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Menghantar...' : <><Send className="w-4 h-4" /> Hantar</>}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
