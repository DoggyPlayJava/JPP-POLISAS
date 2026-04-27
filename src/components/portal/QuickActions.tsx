import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export interface QuickActionsProps {
  isSuperAdmin: boolean;
  isModuleEnabled: (id: string) => boolean;
  polyMartStats: any;
  hasKebajikanAccess: boolean;
  kbStats: any;
  isJPPMode: boolean;
}

export function QuickActions({
  isSuperAdmin,
  isModuleEnabled,
  polyMartStats,
  hasKebajikanAccess,
  kbStats,
  isJPPMode
}: QuickActionsProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto w-full relative z-10"
    >
      {/* ── BENTO 1: Kebajikan (Large / Wide) ── */}
      {hasKebajikanAccess ? (
        // E-Kebajikan Live Stats Widget (EXCO ONLY)
        <div
          onClick={() => {
            if (!isModuleEnabled('kebajikan') && !isSuperAdmin) {
              toast('Modul E-Kebajikan sedang dikemas kini!', { icon: '🚧' });
              return;
            }
            navigate('/kebajikan');
          }}
          className={cn(
            "col-span-2 md:col-span-2 row-span-2 rounded-[2rem] border overflow-hidden shadow-2xl transition-all duration-500 bg-white dark:bg-slate-900/40 backdrop-blur-xl relative group flex flex-col justify-between",
            (!isModuleEnabled('kebajikan') && !isSuperAdmin)
              ? "opacity-60 grayscale-[0.8] cursor-not-allowed"
              : "cursor-pointer hover:scale-[1.02] hover:shadow-[0_20px_50px_-12px_rgba(45,212,191,0.25)] dark:hover:shadow-[0_20px_50px_-12px_rgba(45,212,191,0.15)]"
          )}
          style={{ borderColor: 'rgba(45,212,191,0.15)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-teal-500/0 opacity-50 group-hover:opacity-100 transition-opacity" />
          
          <div className="p-6 relative z-10 flex-1">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.3)' }}>
              <LucideIcons.HeartHandshake className="w-6 h-6" style={{ color: '#2DD4BF' }} />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight tracking-tight">E-Kebajikan<br/>Live Stats</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 tracking-wide">Pusat Urusan & Resolusi Tiket</p>
          </div>

          <div className="grid grid-cols-3 relative z-10 bg-teal-500/5 dark:bg-teal-500/10 border-t border-teal-500/10 p-4">
            <div className="flex flex-col items-center">
              <p className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-none">{kbStats ? kbStats.open : '—'}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Aktif</p>
            </div>
            <div className="flex flex-col items-center border-l border-teal-500/10">
              <p className="text-xl md:text-2xl font-black text-emerald-500 dark:text-emerald-400 leading-none">{kbStats ? kbStats.resolved : '—'}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Selesai</p>
            </div>
            <div className="flex flex-col items-center border-l border-teal-500/10">
              <p className="text-xl md:text-2xl font-black text-amber-500 dark:text-amber-400 leading-none">{kbStats?.rating != null ? kbStats.rating.toFixed(1) : '—'}</p>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Rating</p>
            </div>
          </div>
        </div>
      ) : (
        // Buat Aduan (User)
        <button
          onClick={() => {
            if (!isModuleEnabled('kebajikan') && !isSuperAdmin) {
              toast('Modul E-Kebajikan sedang dikemas kini!', { icon: '🚧' });
              return;
            }
            navigate('/kebajikan/buat-aduan');
          }}
          className={cn(
            "col-span-2 md:col-span-2 row-span-2 group relative rounded-[2rem] overflow-hidden text-left transition-all duration-500 border border-teal-500/20 bg-white dark:bg-slate-900/40 backdrop-blur-xl flex flex-col justify-between p-6",
            (!isModuleEnabled('kebajikan') && !isSuperAdmin)
              ? "opacity-60 grayscale-[0.8] cursor-not-allowed"
              : "hover:scale-[1.02] active:scale-[0.98] shadow-[0_20px_50px_-12px_rgba(45,212,191,0.2)] dark:shadow-[0_20px_50px_-12px_rgba(45,212,191,0.1)] hover:bg-slate-50 dark:hover:bg-slate-900/60"
          )}
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <LucideIcons.MessageSquarePlus className="w-24 h-24 text-teal-500" />
          </div>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 shadow-inner mb-4 group-hover:scale-110 transition-transform">
              <LucideIcons.MessageSquarePlus className="w-6 h-6" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight tracking-tight">Suarakan<br/>Aduan Anda</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-[200px] leading-relaxed">Salurkan masalah atau cadangan anda terus ke Exco Kebajikan JPP.</p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-teal-600 dark:text-teal-400 text-sm font-bold uppercase tracking-widest">
            <span>Buat Aduan</span>
            <LucideIcons.ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      )}

      {/* ── BENTO 2: PolyMart (Wide on Desktop) ── */}
      {isModuleEnabled('keusahawanan') || isSuperAdmin ? (
        <button
          onClick={() => {
            if (!isModuleEnabled('keusahawanan') && !isSuperAdmin) {
              toast('PolyMart tidak aktif ketika ini!', { icon: '🚧' });
              return;
            }
            navigate('/polymart');
          }}
          className={cn(
            "col-span-2 md:col-span-2 group relative rounded-[2rem] text-left transition-all duration-500 overflow-hidden border p-5 sm:p-6 flex flex-row items-center gap-4",
            "bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-amber-500/15 dark:to-orange-500/5 backdrop-blur-xl border-amber-500/20 dark:border-amber-500/25",
            (!isModuleEnabled('keusahawanan') && !isSuperAdmin)
              ? "opacity-60 grayscale-[0.8] cursor-not-allowed"
              : "hover:scale-[1.02] active:scale-[0.98] shadow-[0_20px_50px_-12px_rgba(245,158,11,0.25)] dark:shadow-[0_20px_50px_-12px_rgba(245,158,11,0.15)] hover:border-amber-500/40"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/15 to-amber-400/0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
          
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden group-hover:scale-110 transition-transform">
            <LucideIcons.ShoppingBag className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-slate-800 dark:text-white tracking-tight">PolyMart</span>
              <span className="text-[9px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full uppercase tracking-widest">BETA</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-0.5">
              {polyMartStats ? `${polyMartStats.listings} produk • ${polyMartStats.businesses} peniaga` : 'Marketplace Pelajar'}
            </span>
          </div>

          <div className="hidden sm:flex w-10 h-10 rounded-full bg-amber-500/10 dark:bg-amber-500/15 items-center justify-center flex-shrink-0">
            <LucideIcons.ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      ) : null}

      {/* ── BENTO 3: QR Merit (Small Square) ── */}
      <button
        onClick={() => {
          if (!isModuleEnabled('akademik') && !isSuperAdmin) {
            toast('Modul E-Akademik sedang dikemas kini!', { icon: '🚧' });
            return;
          }
          navigate('/akademik/qr');
        }}
        className={cn(
          "group relative p-5 sm:p-6 rounded-[2rem] text-left overflow-hidden transition-all duration-500",
          "bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/10",
          isJPPMode 
            ? "col-span-1 md:col-span-1 flex flex-col justify-between" 
            : "col-span-2 md:col-span-2 flex flex-row items-center gap-4",
          (!isModuleEnabled('akademik') && !isSuperAdmin)
            ? "opacity-60 grayscale-[0.8] cursor-not-allowed"
            : "hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.25)] dark:hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.15)]"
        )}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className={cn(
          "rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform relative z-10 border border-emerald-500/20 shrink-0",
          isJPPMode ? "w-12 h-12 mb-4" : "w-14 h-14"
        )}>
          <LucideIcons.QrCode className={isJPPMode ? "w-6 h-6" : "w-7 h-7"} />
        </div>
        <div className="relative z-10 flex-1">
          <h3 className={cn(
            "font-black leading-tight text-slate-800 dark:text-white tracking-tight",
            isJPPMode ? "text-base" : "text-lg"
          )}>Scan QR</h3>
          <p className={cn(
            "text-slate-500 dark:text-slate-400 mt-1",
            isJPPMode ? "text-[10px]" : "text-[11px] font-medium tracking-wide"
          )}>Kumpul Merit</p>
        </div>
        {!isJPPMode && (
          <div className="hidden sm:flex w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 items-center justify-center flex-shrink-0 relative z-10">
            <LucideIcons.ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </div>
        )}
      </button>

      {/* ── BENTO 4: JPP HQ (Small Square) ── */}
      {isJPPMode && (
        <button
          onClick={() => navigate('/jpp')}
          className="col-span-1 md:col-span-1 group relative flex flex-col justify-between p-5 sm:p-6 rounded-[2rem] bg-indigo-600 dark:bg-indigo-500/20 text-white text-left overflow-hidden border border-indigo-500/30 dark:border-indigo-500/30 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[0_20px_50px_-12px_rgba(79,70,229,0.4)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-indigo-900/40 dark:from-indigo-500/0 dark:to-indigo-500/10" />
          <div className="w-12 h-12 rounded-2xl bg-white/20 dark:bg-indigo-500/30 flex items-center justify-center text-white dark:text-indigo-300 mb-4 group-hover:scale-110 transition-transform relative z-10">
            <LucideIcons.Crown className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <h3 className="text-base font-black leading-tight text-white dark:text-indigo-100">JPP HQ</h3>
            <p className="text-[10px] text-indigo-200 dark:text-indigo-300/70 mt-1 tracking-wide">Portal Rasmi</p>
          </div>
        </button>
      )}
    </motion.div>
  );
}
