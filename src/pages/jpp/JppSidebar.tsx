import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, BarChart3, Crown, LogOut,
  Lock, ShieldCheck, Palette, Settings, Megaphone,
  Briefcase, CalendarDays, FileWarning, Sparkles,
  Zap, FileText, ClipboardCheck, ChevronDown, ExternalLink, Store,
  ChevronLeft, LayoutGrid, Building2, QrCode,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, hexToRgba, getContrastText } from '@/lib/utils';
import { JPP_MT_POSITIONS } from '@/types';
import { toast } from 'react-hot-toast';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID, getJppSidebarBg, JPP_COLOR_PRESETS } from './jppConfig';
import { useJppConfig } from '@/contexts/JppConfigContext';

// ── Component ────────────────────────────────────────────────────────────────
export function JppSidebar() {
  const { user, profile, signOut, isSuperAdmin, hasKediamanAccess } = useAuth();
  const { positionLabels, unitConfig, unitOrder } = useJppConfig();

  const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
  const [hexInput, setHexInput]     = useState(JPP_THEME_DEFAULT_COLOR);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [assignedUnits, setAssignedUnits] = useState<string[]>([]);
  // ── Collapsible sub-nav ───────────────────────────────────────────────────
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const toggleUnit = (code: string) =>
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });

  // ── RBAC ─────────────────────────────────────────────────────────────────
  const jppPosition = profile?.jpp_position as string | undefined;
  const jppUnit     = profile?.jpp_unit as string | undefined;

  const isYDP      = jppPosition === 'YDP' || jppPosition === 'YANG_DIPERTUA' || isSuperAdmin;
  const isMT       = !isYDP && JPP_MT_POSITIONS.includes(jppPosition as any);
  const canCustomize = isYDP;

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

  // ── Fetch MT unit assignments (non-YDP MT only) ───────────────────────
  useEffect(() => {
    if (!isMT || !user?.id) return;
    supabase.from('jpp_mt_assignments')
      .select('unit')
      .eq('mt_user_id', user.id)
      .then(({ data }) => {
        if (data) setAssignedUnits(data.map((d: any) => d.unit as string));
      });
  }, [user?.id, isMT]);

  // Unit Asrama staff — bukan JPP Exco, tapi ada hasKediamanAccess
  const isUnitAsramaOnly = hasKediamanAccess && !isYDP && !isMT && !jppUnit;

  // ── Determine visible units based on RBAC ─────────────────────────────
  const visibleUnits = unitOrder.filter(code => {
    if (isYDP) return true;
    if (isMT)  return assignedUnits.includes(code);
    if (isUnitAsramaOnly) return false; // Mereka ada section sendiri
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
  const bg          = getJppSidebarBg(themeColor);
  const displayName = profile?.full_name || user?.email?.split('@')[0] || '?';
  const initials    = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const posLabel    = jppPosition
    ? (positionLabels[jppPosition] ?? jppPosition)
    : isSuperAdmin ? 'Super Admin' : 'Ahli JPP';

  const isNormalExco = !isYDP && !isMT && !!jppUnit;

  return (
    <aside
      className="w-72 h-screen flex flex-col select-none overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${bg.top} 0%, ${bg.bottom} 100%)` }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex flex-col"
        style={{ borderBottom: `1px solid ${hexToRgba(themeColor, 0.15)}` }}
      >
        {/* Butang balik ke Portal */}
        <NavLink
          to="/portal"
          className="flex items-center gap-2 px-5 pt-4 pb-2 text-white/30 hover:text-white/70 transition-colors group"
        >
          <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em]">Portal JPP</span>
          <LayoutGrid className="w-3 h-3 ml-0.5" />
        </NavLink>

        <div className="flex items-center gap-3 px-5 pb-4 pt-1">
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

        {/* Color picker */}
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

        {/* Main nav */}
        <p className="px-3 mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-white/25">Navigasi</p>
        {[
          { 
            icon: LayoutDashboard, 
            label: isNormalExco && jppUnit && unitConfig[jppUnit] ? `Dashboard ${unitConfig[jppUnit].shortLabel}` : 'Laman Utama',    
            href: isNormalExco && jppUnit ? `/jpp/unit/${jppUnit.toLowerCase()}` : '/jpp',          
            end: !isNormalExco  
          },
          { icon: Users,           label: 'Ahli JPP',        href: '/jpp/members',  end: false },
          { icon: BarChart3,       label: 'Gambaran Sistem', href: '/jpp/overview', end: false },
          { icon: CalendarDays,    label: 'Takwim Global',   href: '/jpp/takwim',   end: false },
        ].map(item => (
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

        {/* ── Pentadbiran Portal (Admin) ─── */}
        {(isYDP || isSuperAdmin) && (
          <>
            <div className="pt-4 pb-1.5">
              <p className="px-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/25">
                Pentadbiran Portal
              </p>
            </div>
            {[
              { icon: Briefcase,   label: 'Pelajar',   href: '/jpp/users' },
              { icon: Sparkles,    label: 'Nexus Hub', href: '/jpp/nexus' },
              { icon: FileWarning, label: 'Log Audit', href: '/jpp/logs' },
              { icon: Settings,    label: 'Tetapan',   href: '/jpp/settings' },
            ].map(item => (
              <NavLink
                key={item.href}
                to={item.href}
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
          </>
        )}

        {/* ── Unit Pengurusan Asrama (bukan JPP Exco) ─── */}
        {isUnitAsramaOnly && (
          <>
            <div className="pt-4 pb-1.5">
              <p className="px-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/25">
                Pengurusan Asrama
              </p>
            </div>
            <NavLink
              to="/jpp/asrama"
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                isActive ? 'text-white' : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              )}
              style={({ isActive }) => ({
                background: isActive ? hexToRgba('#E879F9', 0.18) : undefined,
              })}
            >
              {({ isActive }) => (
                <>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ background: isActive ? hexToRgba('#E879F9', 0.3) : hexToRgba('#E879F9', 0.1) }}
                  >
                    <Building2 className="w-3.5 h-3.5" style={{ color: '#E879F9' }} />
                  </div>
                  <span className="text-xs font-bold tracking-tight flex-1">Rujukan Asrama</span>
                  {isActive && (
                    <div
                      className="w-1 h-4 rounded-full flex-shrink-0"
                      style={{ background: '#E879F9', boxShadow: '0 0 8px 2px rgba(232,121,249,0.5)' }}
                    />
                  )}
                </>
              )}
            </NavLink>
          </>
        )}

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
              const cfg = unitConfig[code];
              if (!cfg) return null;
              const isOwn      = code === jppUnit;
              const hasAccess  = isYDP || isOwn || assignedUnits.includes(code);
              const unitPath   = `/jpp/unit/${code.toLowerCase()}`;
              const unitLower  = code.toLowerCase();
              const isExpanded = expandedUnits.has(code);

              // ── Sub-nav logic ─────────────────────────────────────────────
              // SEMUA unit JPP adalah unit exco — semua dapat Aktiviti + Laporan
              const isOwnExco  = isOwn && !isYDP;
              const isMTOfUnit = isMT && assignedUnits.includes(code);
              const canReview  = hasAccess && !isOwnExco && (isYDP || isMTOfUnit);

              // Build sub-nav list based on unit type + role
              const subItems: { icon: any; label: string; href: string }[] = [];

              if (isOwnExco) {
                // Exco unit sendiri: Aktiviti + Laporan (universal)
                subItems.push(
                  { icon: Zap,      label: 'Aktiviti', href: `/exco/${unitLower}/aktiviti` },
                  { icon: FileText, label: 'Laporan',  href: `/exco/${unitLower}/laporan` },
                );
                // KPP tambahan: semak laporan kelab
                if (code === 'KPP')
                  subItems.push({ icon: ClipboardCheck, label: 'Semak Laporan Kelab', href: '/semakan-laporan' });
                // Keusahawanan tambahan: portal modul
                if (code === 'KEUSAHAWANAN') {
                  subItems.push({ icon: Store, label: 'Portal Dashboard', href: '/keusahawanan/dashboard' });
                  subItems.push({ icon: Zap,   label: 'Portal Program',   href: '/keusahawanan/program' });
                }
                // KK tambahan: rujukan asrama & qr merit
                if (code === 'KK') {
                  subItems.push({ icon: Building2, label: 'Rujukan Asrama', href: '/jpp/asrama' });
                  subItems.push({ icon: QrCode,    label: 'Jana QR Merit',  href: '/jpp/unit/kk?tab=qr' });
                }
                // KEBAJIKAN tambahan: dashboard tiket + laporan
                if (code === 'KEBAJIKAN') {
                  subItems.push({ icon: LayoutDashboard, label: 'Dashboard Tiket',  href: '/kebajikan' });
                  subItems.push({ icon: ClipboardCheck,  label: 'Senarai Tiket',    href: '/kebajikan/tiket' });
                  subItems.push({ icon: FileText,         label: 'Laporan Bulanan',  href: '/kebajikan/laporan' });
                }
                // SUPSAS shortcuts untuk SRK
                if (code === 'SRK') {
                  subItems.push({ icon: ExternalLink,    label: 'SUPSAS Admin',     href: '/supsas/admin' });
                  subItems.push({ icon: BarChart3,        label: 'Papan Markah',     href: '/supsas/scoreboard' });
                  subItems.push({ icon: CalendarDays,     label: 'Jadual SUPSAS',    href: '/supsas/jadual' });
                }
              } else if (canReview) {
                // MT / YDP menyemak laporan unit ini
                if (isYDP) {
                  // YDP boleh tengok semua
                  subItems.push(
                    { icon: Zap,      label: 'Aktiviti', href: `/exco/${unitLower}/aktiviti` },
                    { icon: FileText, label: 'Laporan',  href: `/exco/${unitLower}/laporan` },
                  );
                  if (code === 'KPP')
                    subItems.push({ icon: ClipboardCheck, label: 'Semak Laporan Kelab', href: '/semakan-laporan' });
                  if (code === 'KEUSAHAWANAN')
                    subItems.push({ icon: Store, label: 'Portal Dashboard', href: '/keusahawanan/dashboard' });
                  // YDP boleh tengok Rujukan Asrama dan QR Merit melalui KK
                  if (code === 'KK') {
                    subItems.push({ icon: Building2, label: 'Rujukan Asrama', href: '/jpp/asrama' });
                    subItems.push({ icon: QrCode,    label: 'QR Merit',       href: '/jpp/unit/kk?tab=qr' });
                  }
                }
                // Semak laporan exco unit ini (universal)
                subItems.push({ icon: ClipboardCheck, label: 'Semak Laporan', href: `/jpp/semak-laporan-exco/${unitLower}` });
              }


              const hasSubNav = hasAccess && subItems.length > 0;

              return (
                <div key={code}>
                  {/* ── Unit header row ── */}
                  {hasAccess ? (
                    <div className="flex items-center gap-1">
                      <NavLink
                        to={unitPath}
                        className={({ isActive }) => cn(
                          'flex-1 flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 min-w-0',
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
                          </>
                        )}
                      </NavLink>

                      {/* Chevron toggle */}
                      {hasSubNav && (
                        <button
                          onClick={() => toggleUnit(code)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white/50 bg-white/5 hover:text-white hover:bg-white/20 transition-all mr-1 ml-1"
                          title={isExpanded ? 'Tutup' : 'Buka'}
                        >
                          <ChevronDown
                            className="w-4 h-4 transition-transform duration-200"
                            style={{ transform: isExpanded ? 'rotate(-180deg)' : 'rotate(0deg)' }}
                          />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-35">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: hexToRgba(cfg.color, 0.08) }}
                      >
                        <Lock className="w-3 h-3 text-white/20" />
                      </div>
                      <span className="text-xs font-bold tracking-tight flex-1 truncate text-white/25">{cfg.shortLabel}</span>
                    </div>
                  )}

                  {/* ── Collapsible sub-nav ── */}
                  <AnimatePresence initial={false}>
                    {hasSubNav && isExpanded && (
                      <motion.div
                        key="subnav"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 pl-3 border-l border-white/[0.06] space-y-0.5 mt-0.5 mb-1">
                          {subItems.map(sub => (
                            <NavLink
                              key={sub.href}
                              to={sub.href}
                              className={({ isActive }) => cn(
                                'flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all',
                                isActive ? 'text-white' : 'text-white/30 hover:text-white/60'
                              )}
                              style={({ isActive }) => ({
                                background: isActive ? hexToRgba(cfg.color, 0.12) : undefined,
                              })}
                            >
                              {({ isActive }) => (
                                <>
                                  <sub.icon className="w-3 h-3 flex-shrink-0" style={{ color: isActive ? cfg.color : undefined }} />
                                  <span style={{ color: isActive ? cfg.color : undefined }}>{sub.label}</span>
                                </>
                              )}
                            </NavLink>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </>
        )}


        {/* ── Hebahan Global ─── */}
        {(isSuperAdmin || isYDP || profile?.jpp_unit === 'MULTIMEDIA') && (
          <>
            <div className="pt-4 pb-1.5">
              <p className="px-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/25">Hebahan / Lain-Lain</p>
            </div>
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
