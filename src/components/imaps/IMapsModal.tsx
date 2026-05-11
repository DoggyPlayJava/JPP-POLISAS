import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Map, MapPin, Navigation, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getSemesterInfo } from '@/types';

export function IMapsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    // Only show for Sem 1 users
    if (profile?.intake_year) {
      const semInfo = getSemesterInfo(profile.intake_year, profile.intake_period as 1 | 2, profile.programme_code === 'FTV', 7, 1, profile.semester_override);
      if (semInfo.semester !== 1) return;
    }

    const hasSeen = localStorage.getItem('has_seen_imaps_intro');
    if (!hasSeen) {
      // Delay slightly for better UX after login
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('has_seen_imaps_intro', 'true');
  };

  const handleGoToMaps = () => {
    handleClose();
    navigate('/imaps');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Illustration */}
        <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center relative shadow-2xl"
          >
            <div className="absolute inset-0 bg-white/40 rounded-3xl animate-ping opacity-20" />
            <Map className="w-12 h-12 text-white" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <MapPin className="w-4 h-4 text-amber-900" />
            </div>
          </motion.div>
        </div>

        <div className="p-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
              Sesat Cari Kelas? 😅
            </h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
              Khas untuk pelajar Semester 1, kini anda boleh menggunakan <span className="font-bold text-blue-500">POLISAS iMaps</span>. Taip sahaja kod kelas (Contoh: A301), sistem akan tunjukkan laluan luar dan panduan dron bangunan tersebut!
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <button
              onClick={handleGoToMaps}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-colors shadow-lg shadow-blue-500/30"
            >
              <Navigation className="w-4 h-4" />
              Cuba iMaps Sekarang
            </button>
            <button
              onClick={handleClose}
              className="w-full sm:w-auto px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
            >
              Lain Kali
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
