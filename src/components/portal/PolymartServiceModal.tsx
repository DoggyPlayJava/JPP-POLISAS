import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Store, Bike, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PolymartServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PolymartServiceModal({ isOpen, onClose }: PolymartServiceModalProps) {
  const navigate = useNavigate();

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
                  Pilih Perkhidmatan
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Ke manakah arah tuju anda hari ini?
                </p>
              </div>

              <div className="p-6 pt-2 space-y-4">
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

                {/* PolyRider Option */}
                <button
                  onClick={() => handleSelect('/polyrider')}
                  className="w-full group relative flex flex-row items-center p-4 sm:p-5 rounded-2xl border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 transition-all text-left overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-orange-400/10 to-orange-400/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                  
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                    <Bike className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0 ml-4">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">PolyRider</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Servis Penghantaran Pantas</p>
                  </div>

                  <ArrowRight className="w-5 h-5 text-orange-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
