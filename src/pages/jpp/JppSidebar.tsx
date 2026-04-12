import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, BarChart3, Crown, LogOut,
  Lock, ShieldCheck, Palette, Shield, ExternalLink, Settings, Megaphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, hexToRgba, getContrastText } from '@/lib/utils';
import { JPP_POSITION_LABELS, JPP_MT_POSITIONS } from '@/types';
import { toast } from 'react-hot-toast';
import {
  UNIT_ORDER, UNIT_CFG, JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID,
  getJppSidebarBg, JPP_COLOR_PRESETS,
} from './jppConfig';

// ── Main navigation ─────────────────────────────────────────────────────────
const MAIN_NAV = [
  { icon: LayoutDashboard, label: 'Laman Utama',    href: '/jpp',          end: true  },
  { icon: Users,           label: 'Ahli JPP',        href: '/jpp/members',  end: false },
  { icon: BarChart3,       label: 'Gambaran Sistem', href: '/jpp/overview', end: false },
  { icon: Settings,        label: 'Tetapan',         href: '/tetapan',      end: false },
];

// ── Component ────────────────────────────────────────────────────────────────
export function JppSidebar() {
  const { user, profile, signOut, isSuperAdmin } = useAuth();

  const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
  const [hexInput, setHexInput]     = useState(JPP_THEME_DEFAULT_COLOR);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [assignedUnits, setAssignedUnits] = useState<string[]>([]);

  // ── RBAC ─────────────────────────────────────────────────────────────────
  const jppPosition = profile?.jpp_position as string | undefined;
  const jppUnit     = profile?.jpp_unit as string | undefined;

  const isYDP      = jppPosition === 'YDP' || jppPosition === 'YANG_DIPERTUA' || isSuperAdmin;
  const isMT       = !isYDP && JPP_MT_POSITIONS.includes(jppPosition as any);
  const canCustomize = isYDP; // Only YDP/SuperAdmin can change color

  // ── Fetch portal theme color ───────────────────────────────────────────
  useEffect(() => {
    supabase.from('portal_settings')
      .select('color')
      .eq('exco_module', JPP_MODULE_ID)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.color) {
          setThemeColor(data.color);
          setHexInput(data.color);
        }
      });
  }, []);

  // ── Fetch MT unit assignments (non-YDP MT members only) ───────────────
  useEffect(() => {
    if (!isMT || !user?.id) return;
    supabase.from('jpp_mt_assignments')
      .select('unit')
      .eq('mt_user_id', user.id)
      .then(({ data }) => {
        if (data) setAssignedUnits(data.map((d: any) => d.unit as string));
      });
  }, [user?.id, isMT]);

  // ── Determine visible units based on RBAC ─────────────────────────────
  const visibleUnits = UNIT_ORDER.filter(code => {
    if (isYDP)  return true;
    if (isMT)   return assignedUnits.includes(code);
    return code === jppUnit;
  });

  // ── Color save ────────────────────────────────────────────────────────
  const handleColorSave = async (color: string) => {
    setSaving(true);
    const { error } = await supabase.from('portal_settings').upsert(
      { exco_module: JPP_MODULE_ID, color, is_enabled: true, updated_by: user?.id, updated_at: new Date().toISOString() },
      { onConflict: 'exco_module' }
    );
    setSaving(false);
    if (error) { toast.error('Gagal simpan warna.'); return; }
    setThemeColor(color);
    setShowPicker(false);
    toast.success('Tema JPP HQ dikemaskini! 🎨');
  };

  // ── Derived display ───────────────────────────────────────────────────
  const bg           = getJppSidebarBg(themeColor);
  const displayName  = profile?.full_name || user?.email?.split('@')[0] || '?';
  const initials     = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const posLabel     = jppPosition
    ? (JPP_POSITION_LABELS[jppPosition as keyof typeof JPP_POSITION_LABELS] ?? jppPosition)
    : isSuperAdmin ? 'Super Admin' : 'Ahli JPP';

  return (
    <aside
      className="w-72 h-screen flex flex-col select-none overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${bg.top} 0%, ${bg.bottom} 100%)` }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0"
        style={{ borderBottom: `1px solid ${hexToRgba(themeColor, 0.15)}` }}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          {/* Logo */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg"
            style={{ background: hexToRgba(themeColor, 0.15), border: `1px solid ${hexToRgba(themeColor, 0.3)}` }}
          >
            <img src="/jpp-logo.png" alt="JPP" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <p className="font-black text-sm text-white tracking-tight leading-none">JPP HQ</p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-0.5"
              style={{ color: hexToRgba(themeColor, 0.7) }}>
              Politeknik Polisas
            </p>
          </div>
          {/* Controls */}
          <div className="ml-auto flex items-center gap-1">
            {canCustomize && (
              <button
                onClick={() => setShowPicker(v => !v)}
                className="p-2 rounded-xl transition-all hover:bg-white/10 text-white/30 hover:text-white/70"
                title="Tukar warna tema"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Color picker (YDP / SuperAdmin) */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden px-4 pb-4"
            >
              <div className="space-y-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
                    <input
                      type="color"
                      value={hexInput}
                      onChange={e => setHexInput(e.target.value)}
                      className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer"
                    />
                  </div>
                  <input
                    value={hexInput}
                    onChange={e => setHexInput(e.target.value)}
                    maxLength={7}
                    className="flex-1 bg-transparent text-xs font-mono text-white/70 outline-none tracking-wider uppercase"
                  />
                  <button
                    onClick={() => handleColorSave(hexInput)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-95"
                    style={{ background: hexToRgba(themeColor, 0.5) }}
                  >
                    {saving ? '...' : 'Simpan'}
                  </button>
                </div>
                {/* Presets */}
                <div className="flex gap-2">
                  {JPP_COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      onClick={() => setHexInput(c)}
                      className="w-7 h-7 rounded-lg flex-shrink-0 border-2 transition-all hover:scale-110"
                      style={{ background: c, borderColor: hexInput === c ? 'white' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── User identity ───────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{ borderBottom: `1px solid ${hexToRgba(themeColor, 0.08)}` }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/5 border border-white/[0.07]">
          <Avatar className="h-9 w-9 rounded-xl ring-2 ring-white/10 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
            <AvatarFallback
              className="font-black text-xs rounded-xl"
              style={{ background: themeColor, color: getContrastText(themeColor) }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white truncate leading-tight">{displayName}</p>
            <p className="text-[10px] font-black uppercase tracking-widest truncate mt-0.5"
              style={{ color: hexToRgba(themeColor, 0.7) }}>
              {posLabel}
            </p>
          </div>
          {isYDP && (
            <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: hexToRgba(themeColor, 0.3) }}>
              <Crown className="w-3 h-3" style={{ color: themeColor }} />
            </div>
          )}
          {isSuperAdmin && !isYDP && (
            <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center bg-amber-500/20">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">

        {/* Main nav items */}
        <p className="px-3 mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-white/25">Navigasi</p>
        {MAIN_NAV.map(item => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
              isActive
                ? 'text-white'
                : 'text-white/40 hover:text-white/80 hover:bg-white/5'
            )}
            style={({ isActive }) => ({
              background: isActive ? hexToRgba(themeColor, 0.2) : undefined,
            })}
          >
            {({ isActive }) => (
              <>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: isActive ? hexToRgba(themeColor, 0.3) : 'transparent' }}
                >
                  <item.icon
                    className="w-3.5 h-3.5"
                    style={{ color: isActive ? themeColor : undefined }}
                  />
                </div>
                <span className="text-xs font-bold tracking-tight flex-1">{item.label}</span>
                {isActive && (
                  <div
                    className="w-1 h-4 rounded-full flex-shrink-0"
                    style={{ background: themeColor, boxShadow: `0 0 8px 2px ${hexToRgba(themeColor, 0.5)}` }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* ── Unit Exco Shortcuts ─── */}
        {visibleUnits.length > 0 && (
          <>
            <div className="pt-4 pb-1.5">
              <p className="px-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/25">
                Unit Exco
                {isMT && <span className="ml-1.5 opacity-60">(Assigned)</span>}
              </p>
            </div>

            {visibleUnits.map(code => {
              const cfg = UNIT_CFG[code];
              if (!cfg) return null;
              const isOwn = code === jppUnit;
              const hasAccess = isYDP || isOwn || assignedUnits.includes(code);
              const unitPath = `/jpp/unit/${code.toLowerCase()}`;

              return (
                <div key={code}>
                  {hasAccess ? (
                    <NavLink
                      to={unitPath}
                      className={({ isActive }) => cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group text-left',
                        isActive
                          ? 'text-white'
                          : 'text-white/50 hover:text-white/85 hover:bg-white/5'
                      )}
                      style={({ isActive }) => ({
                        background: isActive ? hexToRgba(cfg.color, 0.15) : undefined,
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                            style={{ background: isActive ? hexToRgba(cfg.color, 0.25) : hexToRgba(cfg.color, 0.12) }}
                          >
                            <cfg.icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                          </div>
                          <span className="text-xs font-bold tracking-tight flex-1 truncate">{cfg.shortLabel}</span>
                          {isActive && (
                            <div
                              className="w-1 h-4 rounded-full flex-shrink-0"
                              style={{ background: cfg.color, boxShadow: `0 0 6px 1px ${hexToRgba(cfg.color, 0.4)}` }}
                            />
                          )}
                          {!isActive && !cfg.isActive && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/20 flex-shrink-0">
                              Soon
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-35">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: hexToRgba(cfg.color, 0.08) }}
                      >
                        {cfg.isActive
                          ? <cfg.icon className="w-3.5 h-3.5" style={{ color: hexToRgba(cfg.color, 0.5) }} />
                          : <Lock className="w-3 h-3 text-white/20" />
                        }
                      </div>
                      <span className="text-xs font-bold tracking-tight flex-1 truncate text-white/25">{cfg.shortLabel}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/20 flex-shrink-0">
                        {cfg.isActive ? 'Pantau' : 'Akan Datang'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── Admin Tools (YDP / SuperAdmin only) ─── */}
        {(isSuperAdmin || isYDP) && (
          <>
            <div className="pt-4 pb-1.5">
              <p className="px-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/25">Pentadbiran</p>
            </div>
            <NavLink
              to="/jpp-admin"
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group border',
                isActive
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-white/[0.03] border-white/5 text-white/35 hover:bg-amber-500/10 hover:border-amber-500/15 hover:text-amber-400'
              )}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/20">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest flex-1 leading-tight">
                Admin Tools
              </span>
              <ExternalLink className="w-3 h-3 opacity-50 flex-shrink-0" />
            </NavLink>
          </>
        )}

        {/* ── Hebahan Global (YDP / SuperAdmin / Multimedia only) ─── */}
        {(isSuperAdmin || isYDP || profile?.jpp_unit === 'MULTIMEDIA') && (
          <>
            {(!isSuperAdmin && !isYDP) && (
              <div className="pt-4 pb-1.5">
                <p className="px-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/25">Pentadbiran</p>
              </div>
            )}
            <NavLink
              to="/jpp/announcements"
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/35 hover:text-white/80 hover:bg-white/5'
              )}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-500/20">
                <Megaphone className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest flex-1 leading-tight">
                Hebahan Global
              </span>
            </NavLink>
          </>
        )}
      </nav>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 p-4 space-y-1"
        style={{ borderTop: `1px solid ${hexToRgba(themeColor, 0.1)}` }}
      >
        <NavLink
            to="/portal"
            className="flex w-full items-center gap-3 h-9 px-3 font-black text-[10px] uppercase tracking-widest rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
            <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" />
            Kembali ke Portal
        </NavLink>
        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start gap-3 h-9 px-3 font-black text-[10px] uppercase tracking-widest rounded-xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-left"
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          Log Keluar
        </Button>
      </div>
    </aside>
  );
}
