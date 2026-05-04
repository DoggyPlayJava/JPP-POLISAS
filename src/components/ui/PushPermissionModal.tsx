// ============================================================
// PushPermissionModal — Aggressive Push Notification Prompt
// Muncul di PortalPage setiap kali user masuk portal
// jika belum subscribe push notification.
// Snooze hanya 24 jam — akan muncul semula esok.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, X, Smartphone, Zap, Shield, ChevronRight, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushPermissionModal() {
  const { isSupported, permission, isSubscribed, requestPermission } = usePushNotifications();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'granted' | 'denied' | null>(null);

  useEffect(() => {
    // Jangan tunjuk jika:
    if (!isSupported) return;                    // Browser tak support
    if (permission === 'granted' && isSubscribed) return; // Dah subscribe ✓
    if (permission === 'denied') return;         // User dah block — tak boleh buat apa

    // Semak snooze 24 jam
    const snoozedAt = localStorage.getItem('push_prompt_snoozed');
    if (snoozedAt) {
      const elapsed = Date.now() - parseInt(snoozedAt, 10);
      if (elapsed < 24 * 60 * 60 * 1000) return; // Masih dalam tempoh snooze
    }

    // Delay 2s supaya page load dulu
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, [isSupported, permission, isSubscribed]);

  const handleEnable = useCallback(async () => {
    setLoading(true);
    try {
      const perm = await requestPermission();
      setResult(perm === 'granted' ? 'granted' : 'denied');
      if (perm === 'granted') {
        // Auto-close selepas 2s
        setTimeout(() => setShow(false), 2000);
      }
    } catch {
      setResult('denied');
    } finally {
      setLoading(false);
    }
  }, [requestPermission]);

  const handleSnooze = useCallback(() => {
    // Snooze 24 jam sahaja — akan muncul semula esok!
    localStorage.setItem('push_prompt_snoozed', Date.now().toString());
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSnooze}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="relative w-full max-w-md bg-slate-950 rounded-[2rem] shadow-2xl border border-white/[0.08] overflow-hidden"
          >
            {/* Animated Header */}
            <div className="relative h-40 overflow-hidden flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}
            >
              {/* Glowing pulse circles */}
              <div className="absolute inset-0">
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-emerald-500/20"
                />
                <motion.div
                  animate={{ scale: [1, 2.2, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-violet-500/15"
                />
              </div>

              {/* Bell icon with ring animation */}
              <motion.div
                animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                className="relative z-10 w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <BellRing className="w-10 h-10 text-white" />
              </motion.div>

              {/* Close button */}
              <button
                onClick={handleSnooze}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors z-20"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>

            {/* Content */}
            <div className="p-7 space-y-5">
              <AnimatePresence mode="wait">
                {result === 'granted' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1 }}
                      className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-4"
                    >
                      <Zap className="w-8 h-8 text-emerald-400" />
                    </motion.div>
                    <h2 className="text-xl font-black text-white mb-2">Notifikasi Diaktifkan! 🎉</h2>
                    <p className="text-sm text-slate-400">Anda akan menerima notifikasi penting secara langsung.</p>
                  </motion.div>
                ) : result === 'denied' ? (
                  <motion.div
                    key="denied"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-4"
                  >
                    <h2 className="text-lg font-black text-white mb-2">Notifikasi Dihalang</h2>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Anda perlu ke <span className="text-white font-bold">Settings &gt; Notifications</span> pada browser untuk mengaktifkan semula.
                    </p>
                    <button
                      onClick={handleSnooze}
                      className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 text-white/60 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
                    >
                      Tutup
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-black text-white mb-2 tracking-tight">
                        Jangan Terlepas Maklumat Penting!
                      </h2>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Aktifkan notifikasi untuk menerima makluman segera tentang status permohonan, merit, dan kelulusan anda.
                      </p>
                    </div>

                    {/* Feature list */}
                    <div className="space-y-3 mb-6">
                      {[
                        { icon: Bell, label: 'Status KAMSIS & merit segera', color: '#8B5CF6' },
                        { icon: Smartphone, label: 'Push notification pada Android & iOS', color: '#10b981' },
                        { icon: Shield, label: 'Kelulusan & penolakan secara real-time', color: '#f59e0b' },
                      ].map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]"
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${item.color}15` }}
                          >
                            <item.icon className="w-4 h-4" style={{ color: item.color }} />
                          </div>
                          <span className="text-xs font-bold text-slate-300">{item.label}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleEnable}
                      disabled={loading}
                      className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 shadow-xl"
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        boxShadow: '0 8px 32px rgba(16,185,129,0.25)',
                      }}
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                      ) : (
                        <><BellRing className="w-4 h-4" /> Aktifkan Notifikasi <ChevronRight className="w-4 h-4" /></>
                      )}
                    </motion.button>

                    {/* Dismiss — small, subtle, not permanent */}
                    <button
                      onClick={handleSnooze}
                      className="w-full mt-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors text-center"
                    >
                      Ingatkan saya esok
                    </button>
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
