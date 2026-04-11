import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  UserPlus,
  Star,
  Trophy,
  Sparkles,
  Ticket,
  LayoutGrid,
  ChevronLeft,
  Crown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, ALL_CLUBS } from '@/types';
import { useAiSettings } from '@/contexts/AiSettingsContext';
import { useKarnival } from '@/contexts/KarnivalContext';
import { EXCO_MODULES, getExcoModule } from '@/config/excoModules';
import { ChevronDown } from 'lucide-react';



// ─────────────────────────────────────────────────────────────────────────────
// Jenis nav item
// ─────────────────────────────────────────────────────────────────────────────
type NavItem = {
  icon: React.ElementType;
  label: string;
  href: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Fungsi detect exco aktif dari pathname
// Setiap exco ada basePath, dan route-routenya bermula dengan prefix tersebut.
// e-KPP adalah kes khas — routenya TIDAK ada prefix /ekpp/ (konvensyen lama).
// ─────────────────────────────────────────────────────────────────────────────
const EKPP_ROUTES = [
  '/dashboard', '/kelab', '/sertai-kelab', '/aktiviti', '/ahli',
  '/tetapan', '/carian', '/laporan', '/urus-kelab', '/semakan-laporan',
  '/jpp-admin', '/leaderboard', '/logs', '/karnival', '/nexus',
];

function detectActiveExco(pathname: string): string | null {
  // Semak e-KPP (route tanpa prefix — konvensyen sedia ada)
  if (EKPP_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return 'ekpp';
  }
  // Semak modul lain berdasarkan basePath prefix
  for (const mod of EXCO_MODULES) {
    if (mod.id === 'ekpp') continue;
    if (pathname.startsWith(mod.basePath)) {
      return mod.id;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Konfigurasi nav per exco — TAMBAH di sini bila modul baru dibina
// ─────────────────────────────────────────────────────────────────────────────
const EKPP_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: 'Papan Pemuka', href: '/dashboard' },
  { icon: Flag,            label: 'Kelab & Persatuan', href: '/kelab' },
  { icon: CalendarDays,    label: 'Aktiviti', href: '/aktiviti' },
  { icon: Users,           label: 'Ahli Jawatankuasa', href: '/ahli' },
  { icon: FileText,        label: 'Laporan Kelab', href: '/laporan' },
  { icon: Settings,        label: 'Tetapan', href: '/tetapan' },
];

const EKPP_PRESIDENT_NAV: NavItem[] = [
  { icon: Settings2, label: 'Urus Profil Kelab', href: '/urus-kelab' },
];

const EKPP_ADMIN_NAV: NavItem[] = [
  { icon: ClipboardCheck, label: 'Semakan Laporan', href: '/semakan-laporan' },
  { icon: ShieldCheck,    label: 'JPP Admin', href: '/jpp-admin' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SubKomponen: NavItem generik
// ─────────────────────────────────────────────────────────────────────────────
function SidebarNavItem({ item, accentColor = 'amber' }: { item: NavItem; accentColor?: string }) {
  const colorMap: Record<string, { active: string; dot: string; iconBg: string }> = {
    amber: {
      active: 'bg-white/12 text-white shadow-inner',
      dot: 'bg-amber-400 shadow-[0_0_6px_2px_rgba(212,160,23,0.4)]',
      iconBg: 'bg-amber-500/25 shadow-lg',
    },
    rose: {
      active: 'bg-rose-500/20 text-rose-300 shadow-inner',
      dot: 'bg-rose-400 shadow-[0_0_6px_2px_rgba(244,63,94,0.4)]',
      iconBg: 'bg-rose-500/30 shadow-lg',
    },
    emerald: {
      active: 'bg-emerald-500/20 text-emerald-300 shadow-inner',
      dot: 'bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.4)]',
      iconBg: 'bg-emerald-500/30 shadow-lg',
    },
    indigo: {
      active: 'bg-indigo-500/20 text-indigo-300 shadow-inner',
      dot: 'bg-indigo-400',
      iconBg: 'bg-indigo-500/30 shadow-lg',
    },
  };
  const c = colorMap[accentColor] ?? colorMap.amber;

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
        isActive ? c.active : 'text-white/50 hover:bg-white/7 hover:text-white/85'
      )}
    >
      {({ isActive }) => (
        <>
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
            isActive ? c.iconBg : 'group-hover:bg-white/8'
          )}>
            <item.icon className={cn('w-3.5 h-3.5', isActive ? `text-${accentColor}-400` : '')} />
          </div>
          <span className="text-xs font-bold tracking-tight">{item.label}</span>
          {isActive && <div className={cn('ml-auto w-1 h-4 rounded-full', c.dot)} />}
        </>
      )}
    </NavLink>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SubKomponen: e-KPP Sidebar Content
// ─────────────────────────────────────────────────────────────────────────────
function EkppSidebarContent() {
  const { isSuperAdmin, isPresident, effectiveRole, isJppMember, hasKppAccess } = useAuth();
  const { allowAiBudget } = useAiSettings();
  const { showKarnival } = useKarnival();
  const isMemberOnly = !isSuperAdmin && !isPresident;

  return (
    <nav className="flex-1 py-6 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
      {/* Menu Utama */}
      <p className="px-3 mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-white/25">Menu Utama</p>
      {EKPP_NAV.map(item => (
        <SidebarNavItem key={item.href} item={item} accentColor="amber" />
      ))}

      {/* Nexus AI */}
      {allowAiBudget && (
        <>
          <div className="pt-4 pb-2">
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400/50">Kepintaran Buatan</p>
          </div>
          <NavLink
            to="/nexus"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
              isActive
                ? 'bg-indigo-500/20 text-indigo-300 shadow-inner'
                : 'text-indigo-400/50 hover:bg-indigo-500/10 hover:text-indigo-300'
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
                  isActive ? 'bg-indigo-500/30 shadow-lg' : 'group-hover:bg-indigo-500/15'
                )}>
                  <Sparkles className={cn('w-3.5 h-3.5', isActive ? 'text-indigo-400' : 'text-indigo-400/60')} />
                </div>
                <span className="text-xs font-bold tracking-tight">Nexus Hub</span>
                <Badge className="ml-auto text-[8px] bg-indigo-500/20 text-indigo-400 px-1 py-0 border-indigo-500/20">AI</Badge>
              </>
            )}
          </NavLink>
        </>
      )}

      {/* Sertai Kelab — ahli biasa sahaja */}
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

      {/* Pentadbiran Kelab — Presiden */}
      {isPresident && (
        <>
          <div className="pt-6 pb-2">
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.25em] text-amber-400/50">Pentadbiran Kelab</p>
          </div>
          {EKPP_PRESIDENT_NAV.map(item => (
            <SidebarNavItem key={item.href} item={item} accentColor="amber" />
          ))}
        </>
      )}

      {/* Admin JPP */}
      {(isSuperAdmin || isJppMember) && (
        <>
          <div className="pt-6 pb-2">
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.25em] text-rose-400/50">Admin JPP</p>
          </div>
          {EKPP_ADMIN_NAV.filter(item => {
            if (item.href === '/semakan-laporan') return hasKppAccess;
            return true; // JPP Admin Dashboard logic is handled internally
          }).map(item => (
            <SidebarNavItem key={item.href} item={item} accentColor="rose" />
          ))}
        </>
      )}

      {/* Karnival */}
      {showKarnival && (
        <>
          <div className="pt-6 pb-2">
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.25em] text-amber-400/70">🎪 Karnival JPP</p>
          </div>
          <NavLink
            to="/karnival"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-300 group relative overflow-hidden',
              isActive
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                : 'text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500'
            )}
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Ticket className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-xs font-bold tracking-tight">Pengundian Karnival</span>
            <span className="ml-auto text-[8px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">LIVE</span>
          </NavLink>
        </>
      )}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder untuk exco lain yang akan datang
// Bila e-Kebajikan siap, buat KebajikanSidebarContent() dsb.
// ─────────────────────────────────────────────────────────────────────────────
function PlaceholderSidebarContent({ excoId }: { excoId: string }) {
  const mod = getExcoModule(excoId);
  return (
    <nav className="flex-1 py-6 px-3 overflow-y-auto scrollbar-hide">
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <span className="text-4xl">{mod?.icon ?? '🔧'}</span>
        <p className="text-xs font-black text-white/30 uppercase tracking-widest">{mod?.name ?? excoId}</p>
        <p className="text-[10px] text-white/20 leading-relaxed px-4">Modul ini sedang dalam pembangunan.</p>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Komponen Dropdown Khas untuk Kelab (Custom Select)
// Mengelakkan masalah native OS select & isu klik Shadcn
// ─────────────────────────────────────────────────────────────────────────────
function CustomClubSelect({ value, onChange, clubs }: { value: string | null, onChange: (val: string | null) => void, clubs: typeof ALL_CLUBS }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedClub = clubs.find(c => c.id === value);

  return (
    <div className="relative mt-2.5 z-[9999]" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white/5 border border-white/10 border-dashed hover:bg-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black text-white/80 uppercase tracking-widest transition-all backdrop-blur-md shadow-sm"
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedClub ? (
            <>
              <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: selectedClub.color || '#6366f1' }} />
              <span className="truncate">{selectedClub.shortName}</span>
            </>
          ) : (
             <span className="truncate">— PILIH KELAB —</span>
          )}
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 text-white/40 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1.5 max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          <button
            onClick={() => { onChange(null); setIsOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors text-left"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            <span className="truncate">Semua Kelab</span>
          </button>
          <div className="my-1.5 border-t border-white/5" />
          {clubs.map(c => (
            <button
              key={c.id}
              onClick={() => { onChange(c.id); setIsOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-colors group",
                value === c.id 
                  ? "bg-white/10 text-white" 
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full shadow-sm shrink-0 transition-transform", value === c.id ? "scale-125" : "group-hover:scale-125")} style={{ backgroundColor: c.color || '#6366f1' }} />
              <div className="truncate flex flex-col justify-center">
                <span className="truncate leading-tight mb-0.5">{c.shortName}</span>
                <span className="block text-[8px] text-white/30 font-bold truncate lowercase max-w-[150px]">{c.name}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Komponen Sidebar utama
// ─────────────────────────────────────────────────────────────────────────────
export function Sidebar() {
  const { user, profile, signOut, isSuperAdmin, isPresident, effectiveRole, selectedClubId, setSelectedClubId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeExco = detectActiveExco(location.pathname);
  const excoModule = activeExco ? getExcoModule(activeExco) : null;

  // Warna accent berdasarkan exco aktif
  const excoAccentStyle = excoModule
    ? { color: excoModule.defaultColor }
    : {};

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

      {/* ── Header: Logo + Brand + Balik ke Portal ── */}
      <div className="h-auto flex flex-col border-b border-white/10">
        {/* Butang balik ke Portal */}
        <button
          onClick={() => navigate('/portal')}
          className="flex items-center gap-2 px-5 pt-4 pb-2 text-white/30 hover:text-white/70 transition-colors group"
        >
          <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Portal JPP</span>
          <LayoutGrid className="w-3 h-3 ml-0.5" />
        </button>

        {/* Brand — nama exco aktif */}
        <div className="flex items-center gap-3 px-5 pb-4 pt-1">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shadow-lg ring-1 ring-white/20">
            {excoModule ? (
              <span className="text-lg">{excoModule.icon}</span>
            ) : (
              <img src="/jpp-logo.png" alt="JPP" className="w-8 h-8 object-contain" />
            )}
          </div>
          <div className="leading-tight">
            <p className="font-black text-white text-sm tracking-tight">
              {excoModule?.name ?? 'JPP Portal'}
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400/80">
              JPP Polisas
            </p>
          </div>
        </div>
      </div>



      {/* ── Club / Role Badge ── */}
      <div className="mx-4 mt-2">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/6 border border-white/10">
          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', clubColorClass)} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Status</p>
            <p className="text-xs font-black text-white truncate">{clubName}</p>
          </div>
          {(isSuperAdmin || isPresident) && effectiveRole !== 'CLUB_MEMBER' && effectiveRole !== 'AHLI' && (
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-none font-black">
              ADMIN
            </Badge>
          )}
          {profile?.jpp_unit === 'KPP' && !isSuperAdmin && (
            <Badge className="text-[10px] px-1.5 py-0 bg-indigo-500/20 text-indigo-300 border-none font-black">
              KPP
            </Badge>
          )}
        </div>

        {/* KPP Club Switcher — tukar kelab untuk pemantauan */}
        {(profile?.jpp_unit === 'KPP' || isSuperAdmin) && ALL_CLUBS.length > 0 && (
          <CustomClubSelect 
            value={selectedClubId} 
            onChange={setSelectedClubId} 
            clubs={ALL_CLUBS} 
          />
        )}


      </div>


      {/* ── Nav Content — bertukar mengikut exco aktif ── */}
      {activeExco === 'ekpp' && <EkppSidebarContent />}
      {activeExco === 'kebajikan' && <PlaceholderSidebarContent excoId="kebajikan" />}
      {activeExco === 'keusahawanan' && <PlaceholderSidebarContent excoId="keusahawanan" />}
      {activeExco === 'sukan' && <PlaceholderSidebarContent excoId="sukan" />}
      {activeExco === null && <EkppSidebarContent />}

      {/* ── Global JPP Dashboard Link (Pinned) ── */}
      {(isSuperAdmin || profile?.role === 'JPP') && (
        <div className="px-3 py-2 mt-auto pb-4">
            <NavLink
                to="/jpp-admin"
                className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20',
                    isActive ? 'shadow-inner ring-1 ring-rose-500/50' : ''
                )}
            >
                <div className="w-7 h-7 rounded-lg bg-rose-500/30 flex items-center justify-center shadow-lg">
                    <Crown className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest leading-tight">Global JPP<br/>Dashboard</span>
            </NavLink>
        </div>
      )}

      {/* ── User Footer ── */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/6 transition-colors cursor-pointer">
          <Avatar className="h-8 w-8 rounded-xl ring-2 ring-white/15 shadow-md">
            <AvatarImage
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=8B1A1A&textColor=FFF8F0`}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white truncate leading-tight">{displayName}</p>
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