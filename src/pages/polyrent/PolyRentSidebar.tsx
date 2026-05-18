import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Package, Heart, LogOut, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function PolyRentSidebar({ 
  isOpen, 
  onClose,
  onOpenMyAds,
  activeTab
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onOpenMyAds: () => void;
  activeTab?: string;
}) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleNavigate = (action: () => void) => {
    onClose();
    action();
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200]"
          />
          <motion.div
            initial={{ x: '-100%' }} // sliding from left
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-full max-w-sm bg-white dark:bg-slate-950 shadow-2xl z-[201] flex flex-col border-r border-slate-200 dark:border-white/10"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900">
              <div className="flex flex-col">
                <h3 className="font-black text-2xl text-slate-900 dark:text-white leading-tight">PolyRent</h3>
                <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest">JPP POLISAS</p>
              </div>
              <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-white/10 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 mt-2">
              
              <button 
                onClick={() => handleNavigate(() => {})}
                className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600">
                    <Home className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Cari Rumah</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-500 transition-colors" />
              </button>

              <button 
                onClick={() => handleNavigate(onOpenMyAds)}
                className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                     <span className="font-bold text-slate-700 dark:text-slate-300">Iklan Saya</span>
                     <span className="text-[10px] text-slate-400 font-medium">Urus iklan rumah anda</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </button>

            </div>

            <div className="p-6 border-t border-slate-100 dark:border-white/5">
              <button 
                onClick={() => handleNavigate(async () => {
                  await signOut();
                  navigate('/login');
                })}
                className="w-full py-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                Log Keluar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
