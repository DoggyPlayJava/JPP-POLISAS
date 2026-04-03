import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Trophy, Users, Settings, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function BottomNav() {
  const { isSuperAdmin } = useAuth();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/kelab', icon: LayoutGrid, label: 'Kelab' },
    { to: '/leaderboard', icon: Trophy, label: 'Ranking' },
    { to: '/ahli', icon: Users, label: 'Ahli' },
    { to: '/tetapan', icon: Settings, label: 'Tetapan' },
  ];

  // Jika Super Admin JPP, kita tukar sikit menu dia
  const adminItems = [
    { to: '/jpp-admin', icon: Home, label: 'Pusat' },
    { to: '/kelab', icon: LayoutGrid, label: 'Kelab' },
    { to: '/semakan-laporan', icon: Trophy, label: 'Semakan' },
    { to: '/tetapan', icon: Settings, label: 'Tetapan' },
  ];

  const items = isSuperAdmin ? adminItems : navItems;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-background/90 backdrop-blur-3xl border-t border-border/50 dark:border-t-white/10 px-6 pb-safe pt-3 flex justify-between items-center shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transform-gpu translate-z-0 will-change-transform">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1.5 transition-all duration-300 relative pb-1",
            isActive ? "text-primary scale-110" : "text-muted-foreground/60 hover:text-foreground"
          )}
        >
          {({ isActive }) => (
            <>
              <div className={cn(
                "relative p-1.5 rounded-xl transition-all duration-500",
                isActive ? "bg-primary/10 shadow-[0_0_20px_rgba(139,26,26,0.15)]" : ""
              )}>
                <item.icon size={19} strokeWidth={isActive ? 3 : 2} className={cn(
                  "transition-all",
                  isActive ? "drop-shadow-[0_0_8px_rgba(139,26,26,0.5)]" : ""
                )} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest transition-all",
                isActive ? "opacity-100" : "opacity-40"
              )}>{item.label}</span>
              
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_2px_rgba(139,26,26,0.8)] animate-pulse" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
