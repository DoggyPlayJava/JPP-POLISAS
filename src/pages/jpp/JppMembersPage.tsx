import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Users, Crown, Search, Pencil, Check, X, ChevronDown, Shield,
  Loader2, UserCheck,
} from 'lucide-react';
import { cn, hexToRgba, getContrastText } from '@/lib/utils';
import { JPP_POSITION_LABELS, JPP_MT_POSITIONS, JPP_UNIT_LABELS, JPP_UNITS } from '@/types';
import type { JppPosition, JppUnit } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID, UNIT_CFG } from './jppConfig';

// ── Types ─────────────────────────────────────────────────────────────────────
interface JppMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  jpp_position: JppPosition | null;
  jpp_unit: JppUnit | null;
}

// ── Member row ────────────────────────────────────────────────────────────────
function MemberRow({
  member,
  canEdit,
  themeColor,
  onUpdate,
}: {
  member: JppMember;
  canEdit: boolean;
  themeColor: string;
  onUpdate: (id: string, patch: Partial<JppMember>) => void;
}) {
  const [editing, setEditing]       = useState(false);
  const [position, setPosition]     = useState<string>(member.jpp_position ?? '');
  const [unit, setUnit]             = useState<string>(member.jpp_unit ?? '');
  const [saving, setSaving]         = useState(false);

  const initials = (member.full_name ?? member.email ?? '?')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const isMT = JPP_MT_POSITIONS.includes(member.jpp_position as any);
  const unitCfg = member.jpp_unit ? UNIT_CFG[member.jpp_unit] : null;

  const handleSave = async () => {
    setSaving(true);
    const patch: Record<string, any> = { jpp_position: position || null, jpp_unit: unit || null };
    const { error } = await supabase.from('profiles').update(patch).eq('id', member.id);
    setSaving(false);
    if (error) { toast.error('Gagal simpan perubahan.'); return; }
    onUpdate(member.id, patch);
    setEditing(false);
    toast.success('Maklumat ahli dikemaskini.');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all group"
    >
      {/* Avatar */}
      <Avatar className="h-9 w-9 rounded-xl flex-shrink-0 ring-1 ring-white/10">
        <AvatarFallback
          className="font-black text-xs rounded-xl"
          style={{ background: hexToRgba(themeColor, 0.3), color: 'white' }}
        >
          {initials}
        </AvatarFallback>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-white/85 leading-tight truncate">
          {member.full_name ?? '—'}
        </p>
        <p className="text-[10px] text-white/30 truncate mt-0.5">{member.email ?? '—'}</p>
      </div>

      {/* Position + Unit badges */}
      {!editing ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          {member.jpp_position && (
            <span
              className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full hidden sm:block"
              style={{ background: hexToRgba(themeColor, isMT ? 0.2 : 0.1), color: isMT ? themeColor : 'rgba(255,255,255,0.4)' }}
            >
              {JPP_POSITION_LABELS[member.jpp_position] ?? member.jpp_position}
            </span>
          )}
          {unitCfg && (
            <span
              className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full hidden md:block"
              style={{ background: hexToRgba(unitCfg.color, 0.15), color: unitCfg.color }}
            >
              {unitCfg.shortLabel}
            </span>
          )}
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-all"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        /* Edit controls */
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Position selector */}
          <select
            value={position}
            onChange={e => setPosition(e.target.value)}
            className="text-[10px] font-black bg-white/10 border border-white/15 text-white rounded-lg px-2 py-1 outline-none"
          >
            <option value="">— Jawatan —</option>
            {Object.entries(JPP_POSITION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {/* Unit selector */}
          <select
            value={unit}
            onChange={e => setUnit(e.target.value)}
            className="text-[10px] font-black bg-white/10 border border-white/15 text-white rounded-lg px-2 py-1 outline-none"
          >
            <option value="">— Unit —</option>
            {JPP_UNITS.map(u => (
              <option key={u} value={u}>{JPP_UNIT_LABELS[u] ?? u}</option>
            ))}
          </select>
          {/* Save / Cancel */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="p-1.5 rounded-lg bg-white/10 text-white/40 hover:bg-white/15 transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── Group section ─────────────────────────────────────────────────────────────
function MemberGroup({
  title, members, canEdit, themeColor, unitColor, onUpdate,
}: {
  title: string; members: JppMember[]; canEdit: boolean;
  themeColor: string; unitColor?: string; onUpdate: (id: string, patch: Partial<JppMember>) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const color = unitColor ?? themeColor;

  return (
    <div className="rounded-[1.5rem] border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.03] transition-all"
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
        <span className="text-xs font-black text-white/70 tracking-wide flex-1 text-left">{title}</span>
        <span className="text-[10px] font-black text-white/25 mr-2">{members.length} ahli</span>
        <ChevronDown className={cn(
          'w-4 h-4 text-white/25 transition-transform',
          collapsed && '-rotate-90'
        )} />
      </button>

      {/* Members */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-0.5">
              {members.length === 0 ? (
                <p className="text-center text-[10px] font-black uppercase tracking-widest py-6 text-white/15">
                  Tiada ahli
                </p>
              ) : members.map(m => (
                <MemberRow
                  key={m.id}
                  member={m}
                  canEdit={canEdit}
                  themeColor={color}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function JppMembersPage() {
  const { user, profile, isSuperAdmin } = useAuth();

  const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
  const [members, setMembers]       = useState<JppMember[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');

  const jppPosition = profile?.jpp_position as string | undefined;
  const isYDP = jppPosition === 'YDP' || jppPosition === 'YANG_DIPERTUA' || isSuperAdmin;
  const canEdit = isYDP;

  // Fetch theme color
  useEffect(() => {
    supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
      .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
  }, []);

  // Fetch members
  useEffect(() => {
    setLoading(true);
    supabase.from('profiles')
      .select('id, full_name, email, avatar_url, jpp_position, jpp_unit')
      .eq('role', 'JPP')
      .order('full_name')
      .then(({ data }) => {
        setMembers((data ?? []) as JppMember[]);
        setLoading(false);
      });
  }, []);

  const handleUpdate = useCallback((id: string, patch: Partial<JppMember>) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  }, []);

  // Filter by search
  const filtered = members.filter(m =>
    !search ||
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Group members
  const mtMembers  = filtered.filter(m => JPP_MT_POSITIONS.includes(m.jpp_position as any));
  const unitGroups = Object.fromEntries(
    JPP_UNITS.map(u => [u, filtered.filter(m => m.jpp_unit === u && !JPP_MT_POSITIONS.includes(m.jpp_position as any))])
  );
  const unassigned = filtered.filter(m =>
    !JPP_MT_POSITIONS.includes(m.jpp_position as any) &&
    !m.jpp_unit
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[5%] w-[40vw] h-[40vw] rounded-full blur-3xl opacity-8"
          style={{ background: themeColor }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: hexToRgba(themeColor, 0.15), border: `1px solid ${hexToRgba(themeColor, 0.25)}` }}
            >
              <Users className="w-5 h-5" style={{ color: themeColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">Ahli JPP</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                {members.length} ahli didaftarkan
              </p>
            </div>
          </div>
          {canEdit && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 w-fit">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  Mod Edit Aktif — Anda boleh ubah jawatan & unit ahli
                </span>
              </div>
              <Link 
                to="/jpp-admin?tab=jpp"
                className="flex flex-shrink-0 items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all w-fit group"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-white/80 transition-colors">
                  Sunting Ahli Lanjut (Tetapan JPP)
                </span>
              </Link>
            </div>
          )}
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau emel ahli..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-sm text-white/80 placeholder-white/20 outline-none focus:border-white/15 transition-all font-medium"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserCheck className="w-8 h-8 text-white/10 mb-3" />
            <p className="text-xs font-black text-white/20 uppercase tracking-widest">Tiada ahli ditemui</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* MT */}
            {mtMembers.length > 0 && (
              <MemberGroup
                title="Majlis Tertinggi (MT)"
                members={mtMembers}
                canEdit={canEdit}
                themeColor={themeColor}
                onUpdate={handleUpdate}
              />
            )}

            {/* Unit groups */}
            {JPP_UNITS.map(u => {
              const grpMembers = unitGroups[u] ?? [];
              if (grpMembers.length === 0 && !canEdit) return null;
              const unitCfg = UNIT_CFG[u];
              return (
                <MemberGroup
                  key={u}
                  title={JPP_UNIT_LABELS[u] ?? u}
                  members={grpMembers}
                  canEdit={canEdit}
                  themeColor={themeColor}
                  unitColor={unitCfg?.color}
                  onUpdate={handleUpdate}
                />
              );
            })}

            {/* Unassigned */}
            {unassigned.length > 0 && (
              <MemberGroup
                title="Belum Di-assign"
                members={unassigned}
                canEdit={canEdit}
                themeColor={themeColor}
                onUpdate={handleUpdate}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
