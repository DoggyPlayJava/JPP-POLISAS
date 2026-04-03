import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Flag,
  CalendarDays,
  ShieldCheck,
  FileText,
  ClipboardCheck,
  Settings2,
  HelpCircle,
  UserPlus,
  Star,
  Trophy,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, ALL_CLUBS } from '@/types';

const navItems = [
  { icon: LayoutDashboard, label: 'Papan Pemuka', href: '/dashboard' },
  { icon: Flag, label: 'Kelab & Persatuan', href: '/kelab' },
  { icon: CalendarDays, label: 'Aktiviti', href: '/aktiviti' },
  { icon: Users, label: 'Ahli Jawatankuasa', href: '/ahli' },
  { icon: FileText, label: 'Laporan Kelab', href: '/laporan' },
  { icon: Settings, label: 'Tetapan', href: '/tetapan' },
];

// 🎨 Menu Khas Presiden
const presidentItems = [
  { icon: Settings2, label: 'Urus Profil Kelab', href: '/urus-kelab' },
];

// 🚩 Menu Khas Super Admin
const adminItems = [
  { icon: ClipboardCheck, label: 'Semakan Laporan', href: '/semakan-laporan' },
  { icon: ShieldCheck, label: 'JPP Admin', href: '/jpp-admin' },
];

export function Sidebar() {
  const { user, profile, signOut, isSuperAdmin, isPresident, effectiveRole, selectedClubId } = useAuth();

  // isPresident kini dari junction table (berubah mengikut kelab yang dipilih)
  const isMemberOnly = !isSuperAdmin && !isPresident;

  const displayName = profile?.full_name || user?.email?.split('@')[0] || '?';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const activeClubId = selectedClubId ?? profile?.club_id;
  const clubName = activeClubId
    ? (ALL_CLUBS.find(c => c.id === activeClubId)?.name ?? activeClubId.replace('club_', '').toUpperCase())
    : isSuperAdmin
      ? 'JPP Admin'
      : '—';

  // Generate random but deterministic color based on activeClubId
  const getClubColor = (id: string | undefined) => {
    if (!id || id.startsWith('jpp')) return 'bg-rose-500 shadow-[0_0_6px_2px_rgba(244,63,94,0.5)]';
    const sum = id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const colors = [
      'bg-blue-400 shadow-[0_0_6px_2px_rgba(96,165,250,0.5)]',
      'bg-indigo-400 shadow-[0_0_6px_2px_rgba(129,140,248,0.5)]',
      'bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]',
      'bg-fuchsia-400 shadow-[0_0_6px_2px_rgba(232,121,249,0.5)]',
      'bg-sky-400 shadow-[0_0_6px_2px_rgba(56,189,248,0.5)]',
    ];
    return colors[sum % colors.length];
  };

  const clubColorClass = getClubColor(activeClubId);

  return (
    <aside className="w-64 h-screen flex flex-col z-50 select-none sidebar-jpp">

      {/* Header — Logo + Brand */}
      <div className="h-20 flex items-center px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shadow-lg ring-1 ring-white/20">
            <img src="/jpp-logo.png" alt="JPP" className="w-8 h-8 object-contain" />
          </div>
          <div className="leading-tight">
            <p className="font-black text-white text-sm tracking-tight">e-KPP</p>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400/80">JPP Polisas</p>
          </div>
        </div>
      </div>

      {/* Club / role badge */}
      <div className="mx-4 mt-4">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/6 border border-white/10">
          <div className={cn("w-2 h-2 rounded-full", clubColorClass)} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Status</p>
            <p className="text-xs font-black text-white truncate">{clubName}</p>
          </div>
          {/* Sembunyikan badge ADMIN jika role semasa BUKAN SuperAdmin/Presiden/Advisor di kelab ini */}
          {(isSuperAdmin || isPresident) && effectiveRole !== 'CLUB_MEMBER' && effectiveRole !== 'AHLI' && (
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-none font-black">
              ADMIN
            </Badge>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        <p className="px-3 mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-white/25">Menu Utama</p>
        {navItems.map(navItem => (
          <NavLink
            key={navItem.href}
            to={navItem.href}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
              isActive
                ? 'bg-white/12 text-white shadow-inner'
                : 'text-white/50 hover:bg-white/7 hover:text-white/85'
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
                  isActive ? 'bg-amber-500/25 shadow-lg' : 'group-hover:bg-white/8'
                )}>
                  <navItem.icon className={cn('w-3.5 h-3.5', isActive ? 'text-amber-400' : '')} />
                </div>
                <span className="text-xs font-bold tracking-tight">{navItem.label}</span>
                {isActive && <div className="ml-auto w-1 h-4 rounded-full bg-amber-400 shadow-[0_0_6px_2px_rgba(212,160,23,0.4)]" />}
              </>
            )}
          </NavLink>
        ))}

        {/* ── SERTAI KELAB — hanya untuk ahli biasa ── */}
        {isMemberOnly && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400/50">Keanggotaan</p>
            </div>
            <NavLink
              to="/sertai-kelab"
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-inner'
                  : 'text-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-300'
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
                    isActive ? 'bg-emerald-500/30 shadow-lg' : 'group-hover:bg-emerald-500/15'
                  )}>
                    <UserPlus className={cn('w-3.5 h-3.5', isActive ? 'text-emerald-400' : 'text-emerald-400/60')} />
                  </div>
                  <span className="text-xs font-bold tracking-tight">Sertai Kelab</span>
                  {isActive && <div className="ml-auto w-1 h-4 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.4)]" />}
                </>
              )}
            </NavLink>
          </>
        )}

        {/* ── SECTION KHAS PRESIDEN ── */}
        {isPresident && (
          <>
            <div className="pt-6 pb-2">
              <p className="px-3 text-[10px] font-black uppercase tracking-[0.25em] text-amber-400/50">Pentadbiran Kelab</p>
            </div>
            {presidentItems.map(navItem => (
              <NavLink
                key={navItem.href}
                to={navItem.href}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 shadow-inner'
                    : 'text-amber-400/50 hover:bg-amber-500/10 hover:text-amber-300'
                )}
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
                      isActive ? 'bg-amber-500/30 shadow-lg' : 'group-hover:bg-amber-500/15'
                    )}>
                      <navItem.icon className={cn('w-3.5 h-3.5', isActive ? 'text-amber-400' : 'text-amber-400/60')} />
                    </div>
                    <span className="text-xs font-bold tracking-tight">{navItem.label}</span>
                    {isActive && <div className="ml-auto w-1 h-4 rounded-full bg-amber-400 shadow-[0_0_6px_2px_rgba(212,160,23,0.4)]" />}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}

        {/* ── SECTION KHAS JPP ── */}
        {isSuperAdmin && (
          <>
            <div className="pt-6 pb-2">
              <p className="px-3 text-[10px] font-black uppercase tracking-[0.25em] text-rose-400/50">Admin JPP</p>
            </div>
            {adminItems.map(navItem => (
              <NavLink
                key={navItem.href}
                to={navItem.href}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                  isActive
                    ? 'bg-rose-500/20 text-rose-300 shadow-inner'
                    : 'text-rose-400/50 hover:bg-rose-500/10 hover:text-rose-300'
                )}
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
                      isActive ? 'bg-rose-500/30 shadow-lg' : 'group-hover:bg-rose-500/15'
                    )}>
                      <navItem.icon className={cn('w-3.5 h-3.5', isActive ? 'text-rose-400' : 'text-rose-400/60')} />
                    </div>
                    <span className="text-xs font-bold tracking-tight">{navItem.label}</span>
                    {isActive && <div className="ml-auto w-1 h-4 rounded-full bg-rose-400 shadow-[0_0_6px_2px_rgba(244,63,94,0.4)]" />}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}

        {/* ── SECTION KARNIVAL — khas untuk semua pengguna ── */}
        <>
          <div className="pt-6 pb-2">
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.25em] text-amber-400/70">🎪 Karnival JPP</p>
          </div>
          <NavLink
            to="/karnival"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
              isActive
                ? 'bg-amber-500/20 text-amber-300 shadow-inner'
                : 'text-amber-400/60 hover:bg-amber-500/10 hover:text-amber-300'
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
                  isActive ? 'bg-amber-500/30 shadow-lg shadow-amber-500/20' : 'group-hover:bg-amber-500/15'
                )}>
                  <Star className={cn('w-3.5 h-3.5', isActive ? 'text-amber-400' : 'text-amber-400/60')} />
                </div>
                <span className="text-xs font-bold tracking-tight">Pengundian Karnival</span>
                <span className="ml-auto text-[8px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">LIVE</span>
              </>
            )}
          </NavLink>
        </>

        {/* ── SECTION SOKONGAN ── */}
        <div className="pt-6 pb-2">
          <p className="px-3 text-[10px] font-black uppercase tracking-[0.25em] text-white/20">Sokongan</p>
        </div>
        <NavLink
            to="/tetapan?tab=help"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
              isActive
                ? 'bg-white/12 text-white shadow-inner'
                : 'text-white/40 hover:bg-white/7 hover:text-white/80'
            )}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:bg-white/8 transition-all">
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold tracking-tight">Bantuan & Isu</span>
        </NavLink>
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/6 transition-colors cursor-pointer">
          <Avatar className="h-8 w-8 rounded-xl ring-2 ring-white/15 shadow-md">
            <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=8B1A1A&textColor=FFF8F0`} className="object-cover" />
            <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white truncate leading-tight">
              {displayName}
            </p>
            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest truncate">
              {effectiveRole ? ROLE_LABELS[effectiveRole] || effectiveRole : 'Pengguna'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start gap-3 h-9 px-3 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Keluar</span>
        </Button>
      </div>
    </aside>
  );
}