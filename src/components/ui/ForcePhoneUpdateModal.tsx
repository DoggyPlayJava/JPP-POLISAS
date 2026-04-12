import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Check, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function ForcePhoneUpdateModal() {
  const { profile, user, refetchProfile } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Jika dah ada phone, tak perlu tunjuk
  if (!profile || profile.phone) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Sila masukkan nombor telefon yang sah.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: phone.trim() })
        .eq('id', user?.id);

      if (error) throw error;

      await refetchProfile();
      toast.success('Nombor telefon berjaya dikemaskini!');
    } catch (error: any) {
      toast.error(error.message || 'Ralat menyimpan nombor telefon.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop (Solid and Blurred to completely block) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden"
        >
          {/* Header Graphic */}
          <div className="h-32 bg-gradient-to-br from-amber-500 to-rose-500 relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)]" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -right-10 -top-10 opacity-30"
            >
              <Sparkles className="w-40 h-40 text-white" />
            </motion.div>
            
            <div className="w-16 h-16 bg-white shadow-xl rounded-2xl flex items-center justify-center relative z-10">
              <Phone className="w-8 h-8 text-rose-500" />
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                Tindakan Diperlukan
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Lengkapkan profil anda dengan nombor telefon bimbit untuk mengaktifkan akses penuh ke portal.
              </p>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                Sistem perlukan nombor telefon ini bagi tujuan notifikasi WhatsApp masa hadapan (contoh: kelulusan perniagaan/laporan).
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                  No Telefon Bimbit
                </Label>
                <div className="relative group">
                  <Input 
                    type="tel"
                    placeholder="Contoh: 0123456789" 
                    required 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="h-14 pl-5 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 font-bold text-lg tracking-wide focus-visible:ring-amber-500/50"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {phone.length > 9 ? (
                      <Check className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Phone className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              <Button 
                type="submit"
                disabled={loading || phone.length < 9}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-500/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...
                  </span>
                ) : 'Simpan & Teruskan'}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
