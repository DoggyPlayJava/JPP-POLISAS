import React from 'react';
import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface PortalNavbarProps {
  isScrolled: boolean;
  karnivalActive: boolean;
  supsasActive: boolean;
  profile: any;
  setIsSidebarOpen: (v: boolean) => void;
}

export function PortalNavbar({ isScrolled, karnivalActive, supsasActive, profile, setIsSidebarOpen }: PortalNavbarProps) {
  return (
    <nav className={cn(
      "fixed top-0 inset-x-0 z-[100] transition-all duration-700 px-4 md:px-8 py-4 flex items-center justify-between",
      karnivalActive
        ? isScrolled
          ? 'bg-violet-950/90 backdrop-blur-xl border-b border-violet-500/20 py-3 shadow-[0_4px_30px_rgba(139,92,246,0.2)]'
          : 'bg-violet-950/30 backdrop-blur-sm'
        : supsasActive
          ? isScrolled
            ? 'bg-amber-950/90 backdrop-blur-xl border-b border-amber-500/20 py-3 shadow-[0_4px_30px_rgba(245,158,11,0.15)]'
            : 'bg-amber-950/20 backdrop-blur-sm'
          : isScrolled
            ? 'bg-slate-50 dark:bg-slate-950/80 backdrop-blur-md border-b border-black/[0.03] dark:border-white/5 py-3 shadow-2xl'
            : 'bg-transparent'
    )}>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(true)}
          className="rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div
          className="flex items-center gap-4 cursor-pointer group"
          onClick={() => setIsSidebarOpen(true)}
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: 2 }}
            className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-black/[0.03] dark:bg-white/5 flex items-center justify-center p-1.5 shadow-2xl border border-black/5 dark:border-white/10 backdrop-blur-xl group-hover:border-emerald-500/30 transition-all"
          >
            <img src="/jpp-logo.png" alt="JPP" className="w-full h-full object-contain" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-sm md:text-base font-black tracking-tighter leading-none text-slate-800 dark:text-white">JPP PORTAL</span>
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate- dark:text-white/50">Politeknik Polisas</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <ThemeToggle />
        <NotificationBell />

        <div
          className="flex items-center gap-3 pl-4 border-l border-black/5 dark:border-white/10 cursor-pointer group"
          onClick={() => setIsSidebarOpen(true)}
        >
          <div className="hidden sm:block text-right">
            <p className="text-[10px] font-black text-slate-800 dark:text-white group-hover:text-emerald-500 transition-colors uppercase tracking-widest leading-none mb-0.5">{profile?.full_name?.split(' ')[0]}</p>
            <div className="flex items-center justify-end gap-1.5 opacity-40">
              <div className="w-1 h-1 rounded-full bg-emerald-500" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em]">{profile?.role || 'STUDENT'}</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center text-slate- dark:text-white/50 overflow-hidden shadow-inner group-hover:border-emerald-500/30 transition-all">
            <Avatar className="w-full h-full rounded-none">
              <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
              <AvatarFallback className="bg-transparent text-slate-400 dark:text-white/50 text-xs font-black">
                {profile?.full_name?.[0]}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </nav>
  );
}
