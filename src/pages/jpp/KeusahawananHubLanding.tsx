import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Briefcase, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function KeusahawananHubLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full w-full bg-slate-950 p-6 md:p-12 relative overflow-hidden flex flex-col justify-center items-center">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-4xl z-10">
        <Button 
          variant="ghost" 
          className="mb-8 text-white/50 hover:text-white hover:bg-white/10 rounded-full"
          onClick={() => navigate('/jpp')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Induk
        </Button>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Hab <span className="text-emerald-400">Keusahawanan</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            Pilih modul kawalan utama untuk pemantauan aktiviti perniagaan pelajar dan tugasan bebas (Ekonomi Gig).
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: PolyMart / Keusahawanan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate('/keusahawanan/dashboard')}
            className="group relative bg-slate-900/50 border border-white/10 rounded-3xl p-8 hover:bg-slate-800/50 hover:border-emerald-500/50 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">e-Keusahawanan</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8 h-10">
                Urus platform perniagaan, kedai rasmi PolyMart, pengesahan vendor, dan program keusahawanan pelajar.
              </p>
              <div className="flex items-center text-emerald-400 font-semibold text-sm">
                Buka Modul <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>

          {/* Card 2: PolyTask */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/polytask/admin')}
            className="group relative bg-slate-900/50 border border-white/10 rounded-3xl p-8 hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <Briefcase className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">PolyTask (Ekonomi Gig)</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8 h-10">
                Pantau senarai tugasan bebas, selesaikan pertikaian bidaan, dan urus keselamatan transaksi Tasker.
              </p>
              <div className="flex items-center text-indigo-400 font-semibold text-sm">
                Buka Modul <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
