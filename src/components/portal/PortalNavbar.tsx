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
  // Determine merit tier for Dynamic Avatar Aura
  const meritPoints = profile?.merit_points || profile?.merit || 0;
  let auraClass = "";
  if (meritPoints > 100) {
    auraClass = "shadow-[0_0_20px_rgba(251,191,36,0.8)] border-yellow-400"; // Legendary (Gold)
  } else if (meritPoints > 50) {
    auraClass = "shadow-[0_0_15px_rgba(168,85,247,0.7)] border-purple-500"; // Epic (Purple)
  } else if (meritPoints > 0) {
    auraClass = "shadow-[0_0_10px_rgba(56,189,248,0.6)] border-sky-400"; // Rare (Blue)
  } else {
    auraClass = "border-black/5 dark:border-white/10 group-hover:border-emerald-500/30"; // Base
  }

  return (
    <nav className={cn(
      "fixed top-0 inset-x-0 z-[100] transition-all duration-700 px-4 md:px-8 py-4 flex items-center justify-between",
      karnivalActive
        ? isScrolled
          ? 'bg-[#0a0018]/80 backdrop-blur-3xl border-b border-pink-500/30 py-3 shadow-[0_4px_40px_rgba(236,72,153,0.3)]'
          : 'bg-transparent backdrop-blur-sm'
        : supsasActive
          ? isScrolled
            ? 'bg-[#0a0500]/80 backdrop-blur-3xl border-b border-amber-500/30 py-3 shadow-[0_4px_40px_rgba(245,158,11,0.3)]'
            : 'bg-transparent backdrop-blur-sm'
          : isScrolled
            ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-black/5 dark:border-white/10 py-3 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]'
            : 'bg-transparent'
    )}>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(true)}
          className={cn(
            "rounded-xl transition-all",
            karnivalActive ? "hover:bg-pink-500/20 text-pink-100" :
            supsasActive ? "hover:bg-amber-500/20 text-amber-100" :
            "hover:bg-black/5 dark:hover:bg-white/10"
          )}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div
          className="flex items-center gap-4 cursor-pointer group"
          onClick={() => setIsSidebarOpen(true)}
        >
          <motion.div
            whileHover={{ scale: 1.05, rotate: 2 }}
            className={cn(
              "w-10 h-10 md:w-11 md:h-11 rounded-2xl flex items-center justify-center p-1.5 shadow-2xl border backdrop-blur-xl transition-all",
              karnivalActive ? "bg-pink-500/10 border-pink-500/30 group-hover:border-pink-400 group-hover:shadow-[0_0_20px_rgba(236,72,153,0.5)]" :
              supsasActive ? "bg-amber-500/10 border-amber-500/30 group-hover:border-amber-400 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.5)]" :
              "bg-black/[0.03] dark:bg-white/5 border-black/5 dark:border-white/10 group-hover:border-emerald-500/30"
            )}
          >
            <img src="/jpp-logo.png" alt="JPP" className="w-full h-full object-contain drop-shadow-md" />
          </motion.div>
          <div className="flex flex-col">
            <span className={cn(
              "text-sm md:text-base font-black tracking-tighter leading-none transition-colors",
              karnivalActive ? "text-pink-100 drop-shadow-[0_0_5px_rgba(236,72,153,0.8)]" :
              supsasActive ? "text-amber-100 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]" :
              "text-slate-800 dark:text-white"
            )}>JPP PORTAL</span>
            <span className={cn(
              "text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
              karnivalActive ? "text-pink-300/70" :
              supsasActive ? "text-amber-300/70" :
              "text-slate-500 dark:text-white/50"
            )}>Politeknik Polisas</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <ThemeToggle />
        <NotificationBell />

        <div
          className={cn(
            "flex items-center gap-3 pl-4 border-l cursor-pointer group transition-colors",
            karnivalActive ? "border-pink-500/30" : supsasActive ? "border-amber-500/30" : "border-black/5 dark:border-white/10"
          )}
          onClick={() => setIsSidebarOpen(true)}
        >
          <div className="hidden sm:block text-right">
            <p className={cn(
              "text-[10px] font-black transition-colors uppercase tracking-widest leading-none mb-0.5",
              karnivalActive ? "text-pink-100 group-hover:text-pink-400 drop-shadow-[0_0_2px_rgba(236,72,153,0.8)]" :
              supsasActive ? "text-amber-100 group-hover:text-amber-400 drop-shadow-[0_0_2px_rgba(245,158,11,0.8)]" :
              "text-slate-800 dark:text-white group-hover:text-emerald-500"
            )}>{profile?.full_name?.split(' ')[0]}</p>
            <div className="flex items-center justify-end gap-1.5 opacity-60">
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", karnivalActive ? "bg-pink-500" : supsasActive ? "bg-amber-500" : "bg-emerald-500")} />
              <span className={cn(
                "text-[8px] font-black uppercase tracking-[0.2em]",
                karnivalActive ? "text-pink-200" : supsasActive ? "text-amber-200" : "text-slate-500 dark:text-white/70"
              )}>{profile?.role || 'STUDENT'}</span>
            </div>
          </div>
          
          {/* Dynamic Avatar Aura */}
          <div className="relative">
            {meritPoints > 100 && (
              <div className="absolute -inset-2 rounded-full bg-yellow-400/20 blur-md animate-pulse pointer-events-none" />
            )}
            <div className={cn(
              "relative w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-500",
              karnivalActive ? "bg-pink-500/10 border border-pink-500/30" :
              supsasActive ? "bg-amber-500/10 border border-amber-500/30" :
              "bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10",
              auraClass
            )}>
              <Avatar className="w-full h-full rounded-none">
                <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
                <AvatarFallback className="bg-transparent text-slate-400 dark:text-white/50 text-xs font-black">
                  {profile?.full_name?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
