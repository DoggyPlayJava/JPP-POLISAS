import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Settings, 
  LogOut, 
  Crown, 
  ChevronRight,
  X,
  LayoutGrid
} from 'lucide-react';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { useAuth } from '@/contexts/AuthContext';
import { EXCO_MODULES, getExcoColor } from '@/config/excoModules';
import { cn, getMalaysianNickname, hexToRgba } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PortalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  settings?: any[]; // For colors
}

export function PortalSidebar({ isOpen, onClose, onOpen, settings = [] }: PortalSidebarProps) {
  const { profile, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isJPPMode = profile?.role === 'JPP' || isSuperAdmin;
  const displayName = getMalaysianNickname(profile?.full_name) || 'Student';
  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';

  // Desktop Hover Logic
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      onOpen();
    }, 150); // 150ms delay to prevent accidental triggers
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    onClose();
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Lock body scroll apabila sidebar terbuka di mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* ── 1. HOVER TRIGGER ZONE (DESKTOP) ── */}
      <div 
        className="fixed inset-y-0 left-0 w-4 z-[150] hidden lg:block"
        onMouseEnter={handleMouseEnter}
      />

      {/* ── 2. BACKDROP ── */}
      <div
        className={cn(
          "fixed inset-0 bg-slate-950/60 z-[190] transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* ── 3. SIDEBAR DRAWER ── */}
      <aside
        onMouseLeave={handleMouseLeave}
        className={cn(
          "fixed inset-y-0 left-0 w-80 z-[200] bg-white/80 dark:bg-slate-900/95 backdrop-blur-xl border-r border-black/5 dark:border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out will-change-transform",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header / Logo */}
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black/[0.03] dark:bg-white/5 flex items-center justify-center p-2 border border-black/5 dark:border-white/10 shadow-inner">
              <img src="/jpp-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-black text-xs tracking-[0.2em] uppercase text-slate-400 dark:text-white/30">Portal Hub</h3>
              <p className="font-black text-sm tracking-tighter dark:text-white">JPP POLISAS</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Profile Section */}
        <div className="p-6">
          <div className="relative group cursor-pointer" onClick={() => navigate('/tetapan')}>
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <div className="relative p-4 rounded-[1.75rem] bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center gap-4 transition-all group-hover:scale-[1.02]">
              <Avatar className="h-12 w-12 rounded-2xl shadow-xl ring-2 ring-black/5 dark:ring-white/10">
                <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
                <AvatarFallback className="bg-emerald-500 text-white font-black">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800 dark:text-white truncate">{displayName}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 truncate mt-0.5">{profile?.matric_no}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 px-4 space-y-8 overflow-y-auto scrollbar-hide">
          {/* Primary Nav */}
          <div className="space-y-1">
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-white/20 mb-3">Utama</p>
            <SidebarLink icon={Home} label="Laman Utama" to="/portal" onClick={onClose} />
            <SidebarLink icon={Settings} label="Tetapan Profil" to="/tetapan" onClick={onClose} />
          </div>

          {/* JPP HQ Shortcut */}
          {isJPPMode && (
            <div className="space-y-1">
              <p className="px-4 text-[9px] font-black uppercase tracking-[0.3em] text-amber-500/50 mb-3">Khas JPP</p>
              <NavLink
                to="/jpp"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 group"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Crown className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest">JPP HQ Portal</span>
                <Badge className="ml-auto bg-amber-500/20 text-amber-500 text-[8px] border-none font-black h-5">EXCLUSIVE</Badge>
              </NavLink>
            </div>
          )}

          {/* Module Shortcuts Grid */}
          <div className="space-y-3">
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-white/20 mb-3">Modul Pantas</p>
            <div className="grid grid-cols-2 gap-2 px-2 pb-4">
              {EXCO_MODULES.map((mod) => {
                const IconComp = (() => {
                  // Lazy icon resolution via DynamicIcon
                  return (props: any) => <DynamicIcon name={mod.icon} fallback="LayoutGrid" {...props} />;
                })();
                return (
                  <button
                    key={mod.id}
                    onClick={() => { navigate(mod.basePath); onClose(); }}
                    className="flex flex-col items-center justify-center p-4 rounded-3xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:bg-black/[0.05] dark:hover:bg-white/10 transition-all group"
                  >
                    <div 
                      className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2 shadow-inner transition-transform group-hover:scale-110"
                      style={{ 
                        background: hexToRgba(getExcoColor(mod.id, settings), 0.15),
                        color: getExcoColor(mod.id, settings)
                      }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tighter text-center opacity-60 group-hover:opacity-100">{mod.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-black/5 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Sistem Aktif</span>
            </div>
            {isSuperAdmin && (
               <span className="text-[9px] font-black bg-slate-800 text-white px-2 py-0.5 rounded-full">ADMIN</span>
            )}
          </div>
          <button 
            onClick={signOut}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all font-black text-xs uppercase tracking-[0.15em]"
          >
            <LogOut className="w-4 h-4" />
            Log Keluar
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({ icon: Icon, label, to, onClick }: { icon: any, label: string, to: string, onClick: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => cn(
        "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group",
        isActive 
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
          : "text-slate-500 dark:text-white/40 hover:bg-black/[0.03] dark:hover:bg-white/5"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center transition-all group-hover:scale-110",
        "bg-black/[0.03] dark:bg-white/10"
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-[11px] font-black uppercase tracking-[0.1em]">{label}</span>
      <ChevronRight className="ml-auto w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
    </NavLink>
  );
}
