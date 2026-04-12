import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Trophy, Users, Settings, Home, LayoutDashboard, Flag, CalendarDays, ShieldCheck, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const EKPP_ROUTES = [
  '/dashboard', '/kelab', '/sertai-kelab', '/aktiviti', '/ahli',
  '/tetapan', '/carian', '/laporan', '/urus-kelab', '/semakan-laporan',
  '/leaderboard', '/logs', '/karnival', '/nexus',
];

function detectActiveExco(pathname: string): string | null {
  if (EKPP_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) return 'ekpp';
  if (pathname.startsWith('/kebajikan')) return 'kebajikan';
  if (pathname.startsWith('/keusahawanan')) return 'keusahawanan';
  if (pathname.startsWith('/sukan')) return 'sukan';
  return null;
}

export function BottomNav() {
  const { isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeExco = detectActiveExco(location.pathname);

  // Nav e-KPP — ahli biasa
  const ekppItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Utama' },
    { to: '/kelab',     icon: Flag,            label: 'Kelab' },
    { to: '/aktiviti',  icon: CalendarDays,    label: 'Aktiviti' },
    { to: '/ahli',      icon: Users,           label: 'Ahli' },
    { to: '/tetapan',   icon: Settings,        label: 'Tetapan' },
  ];

  // Nav e-KPP — Super Admin JPP
  const adminItems = [
    { to: '/jpp',               icon: Home,         label: 'Pusat' },
    { to: '/kelab',             icon: LayoutGrid,   label: 'Kelab' },
    { to: '/semakan-laporan',   icon: ShieldCheck,  label: 'Semakan' },
    { to: '/tetapan',           icon: Settings,     label: 'Tetapan' },
  ];

  // Pilih nav mengikut exco & role
  let items = activeExco === 'ekpp'
    ? (isSuperAdmin ? adminItems : ekppItems)
    : ekppItems; // Default fallback

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-background/90 backdrop-blur-3xl border-t border-border/50 dark:border-t-white/10 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transform-gpu translate-z-0 will-change-transform">
      {/* Butang balik ke Portal (sentiasa ada di mobile) */}
      <div className="flex items-center justify-center py-1.5 border-b border-white/5">
        <button
          onClick={() => navigate('/portal')}
          className="flex items-center gap-1.5 text-white/25 hover:text-white/60 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Portal JPP</span>
        </button>
      </div>

      {/* Nav items */}
      <div className="px-6 pt-3 pb-3 flex justify-between items-center">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-1.5 transition-all duration-300 relative pb-1',
              isActive ? 'text-primary scale-110' : 'text-muted-foreground/60 hover:text-foreground'
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'relative p-1.5 rounded-xl transition-all duration-500',
                  isActive ? 'bg-primary/10 shadow-[0_0_20px_rgba(139,26,26,0.15)]' : ''
                )}>
                  <item.icon size={19} strokeWidth={isActive ? 3 : 2} className={cn(
                    'transition-all',
                    isActive ? 'drop-shadow-[0_0_8px_rgba(139,26,26,0.5)]' : ''
                  )} />
                </div>
                <span className={cn(
                  'text-[9px] font-black uppercase tracking-widest transition-all',
                  isActive ? 'opacity-100' : 'opacity-40'
                )}>{item.label}</span>

                {isActive && (
                  <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_2px_rgba(139,26,26,0.8)] animate-pulse" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
