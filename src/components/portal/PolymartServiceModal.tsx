import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Store, Bike, X, ArrowRight, MapPin, PhoneCall, Briefcase, Ghost, Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

import { queryCache } from '@/lib/cache';

interface PolymartServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PolymartServiceModal({ isOpen, onClose }: PolymartServiceModalProps) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      const CACHE_KEY = 'portal_settings_cache';
      const cached = queryCache.get(CACHE_KEY);
      if (cached) {
        setSettings(cached);
        return;
      }

      supabase.from('portal_settings').select('exco_module, is_enabled').then(({ data }) => {
        if (data) {
          const map: Record<string, boolean> = {};
          data.forEach(d => { map[d.exco_module] = d.is_enabled; });
          setSettings(map);
          queryCache.set(CACHE_KEY, map, 10 * 60 * 1000); // 10 minutes cache per guideline
        }
      });
    }
  }, [isOpen]);

  const handleSelect = (path: string) => {
    onClose();
    // Allow modal exit animation to start before navigating
    setTimeout(() => {
      navigate(path);
    }, 150);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[200]"
          />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[201] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden pointer-events-auto"
            >
              <div className="p-6 pb-4 relative">
                <button
                  onClick={onClose}
                  className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                  PolyServices
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Pilih perkhidmatan yang anda perlukan.
                </p>
              </div>

              <div className="p-6 pt-2 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* PolyMart Option */}
                <button
                  onClick={() => handleSelect('/polymart')}
                  className="w-full group relative flex flex-row items-center p-4 sm:p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 transition-all text-left overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/10 to-amber-400/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                  
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                    <Store className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0 ml-4">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">PolyMart</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Beli & Jual di Marketplace</p>
                  </div>

                  <ArrowRight className="w-5 h-5 text-amber-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>

                {/* PolyTask Option */}
                {settings['polytask'] !== false && (
                  <button
                    onClick={() => handleSelect('/polytask')}
                    className="w-full group relative flex flex-row items-center p-4 sm:p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 transition-all text-left overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-400/0 via-violet-400/10 to-violet-400/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    
                    <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                      <Briefcase className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0 ml-4">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">PolyTask</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Selesaikan Tugas, Jana Pendapatan</p>
                    </div>

                    <ArrowRight className="w-5 h-5 text-violet-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                )}

                {/* PolyMaps Option */}
                <button
                  onClick={() => handleSelect('/polymaps')}
                  className="w-full group relative flex flex-row items-center p-4 sm:p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 transition-all text-left overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/0 via-indigo-400/10 to-indigo-400/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                  
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                    <MapPin className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0 ml-4">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">PolyMaps</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pemetaan Fasiliti Kampus</p>
                  </div>

                  <ArrowRight className="w-5 h-5 text-indigo-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>

                {/* PolySuara Option */}
                {settings['polysuara'] !== false && (
                  <button
                    onClick={() => handleSelect('/polysuara')}
                    className="w-full group relative flex flex-row items-center p-4 sm:p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-all text-left overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-400/0 via-rose-400/10 to-rose-400/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    
                    <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                      <Ghost className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0 ml-4">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">PolySuara</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ruang Luahan & Komuniti Anon</p>
                    </div>

                    <ArrowRight className="w-5 h-5 text-rose-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                )}

                {/* PolyMatch Option */}
                {settings['polymatch'] !== false && (
                  <button
                    onClick={() => handleSelect('/polymatch')}
                    className="w-full group relative flex flex-row items-center p-4 sm:p-5 rounded-2xl border border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 transition-all text-left overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-400/0 via-teal-400/10 to-teal-400/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    
                    <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                      <Puzzle className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0 ml-4">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">PolyMatch</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pencari Geng Projek & Housemate</p>
                    </div>

                    <ArrowRight className="w-5 h-5 text-teal-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                )}

              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

