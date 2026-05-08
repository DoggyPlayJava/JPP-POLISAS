import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_CLUBS } from '@/types';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Flag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ClubSwitcher — hanya papar jika pengguna adalah ahli LEBIH DARI 1 kelab.
 * Menggunakan AuthContext.selectedClubId + setSelectedClubId untuk tukar paparan.
 */
export function ClubSwitcher() {
  const { userClubIds, selectedClubId, setSelectedClubId, isSuperAdmin } = useAuth();
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Papar tooltip jika pengguna (isSuperAdmin ATAU kelab > 1) DAN belum klik "Jangan tunjuk lagi"
    const hideTooltip = localStorage.getItem('hide_club_switcher_tooltip');
    if (!hideTooltip && (isSuperAdmin || (userClubIds && userClubIds.length > 1))) {
      // Delay sikit supaya nampak lebih natural
      const timer = setTimeout(() => setShowTooltip(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuperAdmin, userClubIds]);

  const handleDismissForever = () => {
    localStorage.setItem('hide_club_switcher_tooltip', 'true');
    setShowTooltip(false);
  };

  // Jika Super Admin JPP, papar kelab untuk Admin pilih.
  // Jika biasa, papar hanya jika multi-kelab.
  if (!isSuperAdmin && (!userClubIds || userClubIds.length <= 1)) return null;

  const clubs = isSuperAdmin 
    ? ALL_CLUBS 
    : userClubIds
        .map(id => ALL_CLUBS.find(c => c.id === id))
        .filter(Boolean) as typeof ALL_CLUBS;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-indigo-500/8 border border-indigo-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="w-7 h-7 rounded-xl bg-indigo-500/15 hidden sm:flex items-center justify-center shrink-0">
          <Flag className="w-3.5 h-3.5 text-indigo-500" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 shrink-0 hidden sm:inline-block">
          Kelab:
        </span>
        <Select value={selectedClubId ?? ''} onValueChange={setSelectedClubId}>
          <SelectTrigger className="h-9 w-full sm:w-[160px] flex-1 rounded-xl border-none bg-indigo-500/10 text-indigo-700 font-black text-xs focus:ring-indigo-500/20 min-w-0">
            <SelectValue placeholder="Pilih kelab..." />
          </SelectTrigger>
          <SelectContent className="rounded-2xl shadow-2xl border-border/60">
            {clubs.map(club => (
              <SelectItem
                key={club.id}
                value={club.id}
                className="rounded-xl font-bold text-xs cursor-pointer"
              >
                {club.name}
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
                    Anda boleh menukar paparan kelab anda di sini.
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
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 w-fit mt-1 transition-colors"
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
