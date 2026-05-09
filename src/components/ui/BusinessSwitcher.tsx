import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSwitcher } from '@/contexts/BusinessSwitcherContext';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Store, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * BusinessSwitcher — papar jika pengguna mempunyai akses kepada > 1 perniagaan.
 * Menggunakan BusinessSwitcherContext.
 */
export function BusinessSwitcher() {
  const { isSuperAdmin } = useAuth();
  const { allBusinesses, selectedBusinessId, setSelectedBusinessId, canSwitch, isLoading } = useBusinessSwitcher();
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Papar tooltip jika pengguna (isSuperAdmin ATAU allBusinesses > 1) DAN belum klik "Jangan tunjuk lagi"
    const hideTooltip = localStorage.getItem('hide_business_switcher_tooltip');
    if (!hideTooltip && canSwitch && allBusinesses.length > 1 && !isLoading) {
      // Delay sikit supaya nampak lebih natural
      const timer = setTimeout(() => setShowTooltip(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [canSwitch, allBusinesses, isLoading]);

  const handleDismissForever = () => {
    localStorage.setItem('hide_business_switcher_tooltip', 'true');
    setShowTooltip(false);
  };

  if (!canSwitch || allBusinesses.length <= 1) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="w-7 h-7 rounded-xl bg-emerald-500/15 hidden sm:flex items-center justify-center shrink-0">
          <Store className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 shrink-0 hidden sm:inline-block">
          Perniagaan:
        </span>
        <Select value={selectedBusinessId ?? ''} onValueChange={setSelectedBusinessId}>
          <SelectTrigger className="h-9 w-full sm:w-[160px] flex-1 rounded-xl border-none bg-emerald-500/10 text-emerald-700 font-black text-xs focus:ring-emerald-500/20 min-w-0">
            <SelectValue placeholder="Pilih perniagaan..." />
          </SelectTrigger>
          <SelectContent className="rounded-2xl shadow-2xl border-border/60">
            {allBusinesses.map(biz => (
              <SelectItem
                key={biz.id}
                value={biz.id}
                className="rounded-xl font-bold text-xs cursor-pointer"
              >
                {biz.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute top-[120%] left-0 md:left-auto md:right-0 z-[100] w-[240px]"
          >
            <motion.div 
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 relative"
            >
              {/* Arrow */}
              <div className="absolute -top-2 left-6 md:left-auto md:right-10 w-4 h-4 bg-slate-900 border-t border-l border-slate-700 rotate-45" />
              
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold leading-tight">
                    Anda boleh menukar paparan perniagaan anda di sini.
                  </p>
                  <button 
                    onClick={() => setShowTooltip(false)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0"
                  >
                    <X className="w-3 h-3 text-slate-400 hover:text-white" />
                  </button>
                </div>
                <button 
                  onClick={handleDismissForever}
                  className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 w-fit mt-1 transition-colors"
                >
                  Jangan tunjuk lagi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
