// ============================================================
// KamsisApplicationModal — Modal Permohonan Asrama KAMSIS
// Muncul jika kamsis_application_open = true dan pelajar belum isi
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ArrowRight, Loader2, X, CheckCircle2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useKamsisDynamicFields } from '@/hooks/useKamsisDynamicFields';
import { KamsisDynamicFieldRenderer } from '@/components/kamsis/KamsisDynamicFieldRenderer';
import { useAcademicSession } from '@/contexts/AcademicSessionContext';

export function KamsisApplicationModal() {
  const { profile, user } = useAuth();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<'choice' | 'form' | 'done'>('choice');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [appOpen, setAppOpen] = useState(false);

  // Form state
  const [extraData, setExtraData] = useState<Record<string, string>>({});

  // Dynamic fields
  const { fields: dynamicFields } = useKamsisDynamicFields();
  const { activeSession, semesterString } = useAcademicSession();

  const checkShouldShow = useCallback(async () => {
    if (!profile || !user) { setChecking(false); return; }

    // Admin / Staff dikecualikan
    const role = profile.role;
    if (role === 'SUPER_ADMIN_JPP' || role === 'STAFF') {
      setChecking(false); return;
    }

    try {
      // 1. Semak adakah permohonan dibuka
      const { data: setting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'kamsis_application_open')
        .single();

      if (setting?.value !== true && setting?.value !== 'true') {
        setChecking(false); return;
      }
      setAppOpen(true);

      // 2. Semak jika dah mohon untuk sesi semasa
      const { data, error } = await supabase
        .from('kamsis_applications')
        .select('id')
        .eq('user_id', user.id)
        .eq('session', activeSession)
        .eq('semester', semesterString)
        .maybeSingle();

      if (error && error.code === '42P01') {
        setChecking(false); return; // table not created yet
      }

      if (!data) setShow(true); // Belum mohon
    } catch {
      // Fail gracefully
    }
    setChecking(false);
  }, [profile, user, activeSession, semesterString]);

  useEffect(() => { checkShouldShow(); }, [checkShouldShow]);

  // Jika dismiss, kita insert rekod dengan status 'REJECTED' atau 'OPT_OUT' supaya tak pop up lagi
  // Tetapi untuk permohonan asrama, mungkin kita tak create rekod if dismiss, biar je.
  // Tapi requirement kata: "Jika pangkah, sistem rekod supaya tidak ditanya lagi".
  // Mari kita buat record status 'OPT_OUT' dalam `kamsis_applications` kalau pangkah.
  const handleOptOut = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from('kamsis_applications').insert({
        user_id: user.id,
        session: activeSession,
        semester: semesterString,
        status: 'OPT_OUT',
        extra_data: {}
      });
      setShow(false);
    } catch {
      setShow(false); // hide anyway
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    // Validate
    for (const f of dynamicFields) {
      if (f.is_required && !extraData[f.field_key]?.trim()) {
        toast.error(`Sila isi: ${f.label}`); return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('kamsis_applications').insert({
        user_id: user.id,
        session: activeSession,
        semester: semesterString,
        status: 'PENDING',
        extra_data: Object.keys(extraData).length > 0 ? extraData : {},
      });

      if (error && error.code !== '42P01') throw error;

      // --- Trigger Push Notification ---
      try {
        const { sendNotificationToKamsisAdmin } = await import('@/lib/notifications');
        await sendNotificationToKamsisAdmin({
          title: 'Permohonan Asrama Baru',
          message: `Pelajar ${profile?.full_name || ''} telah menghantar permohonan asrama.`,
          type: 'INFO',
          module: 'KAMSIS',
          link: '/kamsis/senarai-permohonan'
        });
      } catch (e) {
        console.error("Gagal menghantar notifikasi push", e);
      }

      setStep('done');
      toast.success('Permohonan asrama berjaya dihantar!');
      setTimeout(() => setShow(false), 2000);
    } catch (e: any) {
      toast.error('Gagal menghantar permohonan. Sila cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (checking || !show) return null;

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-lg bg-slate-900 rounded-[2rem] shadow-2xl border border-white/[0.07] overflow-hidden"
          >
            {/* Header */}
            <div
              className="h-28 relative overflow-hidden flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 60%, #3b0764 100%)' }}
            >
              <div className="absolute inset-0 opacity-30"
                style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #8B5CF633 0%, transparent 60%), radial-gradient(circle at 80% 20%, #A78BFA33 0%, transparent 50%)' }}
              />
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center relative z-10"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
              >
                <Building2 className="w-7 h-7 text-white" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-7">
              <AnimatePresence mode="wait">

                {/* Step 1 — Pilihan */}
                {step === 'choice' && (
                  <motion.div key="choice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <h2 className="text-xl font-black text-white mb-1 tracking-tight">
                      Permohonan Asrama KAMSIS Kini Buka
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mb-6">
                      Bagi sesi {activeSession}. Adakah anda ingin memohon tempat di asrama? Jika ya, sila isi borang permohonan.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Mohon */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setStep('form')}
                        className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-violet-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-violet-300">Ya, Mohon</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Duduk Asrama</p>
                        </div>
                      </motion.button>

                      {/* Tolak */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleOptOut}
                        disabled={loading}
                        className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-slate-500/20 bg-slate-500/5 hover:bg-slate-500/10 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-slate-500/15 flex items-center justify-center">
                          <Home className="w-6 h-6 text-slate-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-slate-300">Tidak Perlu</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Luar Kampus</p>
                        </div>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2 — Form Permohonan */}
                {step === 'form' && (
                  <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="flex items-center gap-3 mb-5">
                      <button
                        onClick={() => setStep('choice')}
                        className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                      <div>
                        <h2 className="text-lg font-black text-white tracking-tight">Borang Permohonan</h2>
                        <p className="text-[11px] text-slate-500">Isi maklumat tambahan yang diperlukan</p>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 max-h-[55dvh] overflow-y-auto pr-1 scrollbar-hide">

                      {dynamicFields.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm font-medium">
                          Tiada soalan tambahan diperlukan. Teruskan memohon.
                        </div>
                      ) : (
                        <KamsisDynamicFieldRenderer
                          fields={dynamicFields}
                          values={extraData}
                          onChange={(key, val) => setExtraData(prev => ({ ...prev, [key]: val }))}
                          theme="dark"
                        />
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', boxShadow: '0 8px 24px rgba(139,92,246,0.25)' }}
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Menghantar...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Hantar Permohonan <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </form>
                  </motion.div>
                )}

                {/* Step 3 — Done */}
                {step === 'done' && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-6 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1 }}
                      className="w-16 h-16 rounded-2xl bg-violet-500/15 flex items-center justify-center mx-auto mb-4"
                    >
                      <CheckCircle2 className="w-8 h-8 text-violet-400" />
                    </motion.div>
                    <h2 className="text-xl font-black text-white mb-2">Terima Kasih!</h2>
                    <p className="text-sm text-slate-400">Permohonan asrama anda sedang diproses.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
