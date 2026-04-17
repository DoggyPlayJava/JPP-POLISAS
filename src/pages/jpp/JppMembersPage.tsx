import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Users, Crown, Search, Pencil, Shield,
  Loader2, UserCheck, CheckSquare, Square,
} from 'lucide-react';
import { cn, hexToRgba, getContrastText } from '@/lib/utils';
import { JPP_POSITION_LABELS, JPP_MT_POSITIONS, JPP_UNIT_LABELS, JPP_UNITS } from '@/types';
import type { JppPosition, JppUnit } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID, UNIT_CFG, UNIT_ORDER } from './jppConfig';

// ── Types ─────────────────────────────────────────────────────────────────────
interface JppMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  jpp_position: JppPosition | null;
  jpp_unit: JppUnit | null;
}

// ── Member Card ─────────────────────────────────────────────────────────────
function MemberCard({
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
  const [editing, setEditing]           = useState(false);
  const [position, setPosition]         = useState<string>(member.jpp_position ?? '');
  const [unit, setUnit]                 = useState<string>(member.jpp_unit ?? '');
  const [overseeUnits, setOverseeUnits] = useState<string[]>([]);
  const [loadingOversee, setLoadingOversee] = useState(false);
  const [saving, setSaving]             = useState(false);

  const initials = (member.full_name ?? member.email ?? '?')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const isMTPosition = JPP_MT_POSITIONS.includes(member.jpp_position as any);
  // After editing, derive from new position state
  const willBeMT     = JPP_MT_POSITIONS.includes(position as any);
  const unitCfg = member.jpp_unit ? UNIT_CFG[member.jpp_unit] : null;

  // Load existing MT assignments when edit opens
  const handleOpenEdit = async () => {
    setEditing(true);
    if (JPP_MT_POSITIONS.includes(member.jpp_position as any)) {
      setLoadingOversee(true);
      const { data } = await supabase
        .from('jpp_mt_assignments')
        .select('unit')
        .eq('mt_user_id', member.id);
      if (data) setOverseeUnits(data.map((d: any) => d.unit as string));
      setLoadingOversee(false);
    } else {
      setOverseeUnits([]);
    }
  };

  const toggleOverseeUnit = (code: string) => {
    setOverseeUnits(prev =>
      prev.includes(code) ? prev.filter(u => u !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update profiles (jawatan + unit exco sendiri)
      const patch: Record<string, any> = { jpp_position: position || null, jpp_unit: unit || null };
      const { error } = await supabase.from('profiles').update(patch).eq('id', member.id);
      if (error) throw error;

      // 2. Jika jawatan MT — sync jpp_mt_assignments (multi-unit oversee)
      const newIsMT = JPP_MT_POSITIONS.includes(position as any);
      if (newIsMT) {
        // Padam semua assignment lama dulu
        await supabase.from('jpp_mt_assignments').delete().eq('mt_user_id', member.id);
        // Insert yang baharu (multi-unit)
        if (overseeUnits.length > 0) {
          await supabase.from('jpp_mt_assignments').insert(
            overseeUnits.map(u => ({
              mt_user_id: member.id,
              unit: u,
              assigned_by: null,
            }))
          );
        }
      } else {
        // Bukan MT — kosongkan semua assignment
        await supabase.from('jpp_mt_assignments').delete().eq('mt_user_id', member.id);
      }

      onUpdate(member.id, patch);
      setEditing(false);
      toast.success('Maklumat ahli dikemaskini.');
    } catch (err: any) {
      toast.error('Gagal simpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      layout
      className="relative flex flex-col p-4 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all group overflow-hidden"
    >
      {/* Background Glow based on unit/MT */}
      <div 
        className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-[40px] opacity-20 pointer-events-none transition-all group-hover:opacity-30" 
        style={{ background: unitCfg?.color || (isMTPosition ? themeColor : 'rgba(255,255,255,0.1)') }} 
      />

      <div className="flex items-start justify-between mb-3 z-10 relative">
        <Avatar className="h-12 w-12 rounded-xl ring-1 ring-white/10 shadow-lg">
          <AvatarFallback
            className="font-black text-sm rounded-xl"
            style={{ background: hexToRgba(themeColor, 0.2), color: 'white' }}
          >
            {initials}
          </AvatarFallback>
          <AvatarImage src={member.avatar_url || ''} className="object-cover" />
        </Avatar>

        {(!editing && canEdit) && (
          <button
            onClick={handleOpenEdit}
            className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-white/30 hover:text-white/80 hover:bg-white/10 transition-all focus:opacity-100"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mb-4 z-10 relative">
        <p className="text-sm font-bold text-white/90 leading-tight line-clamp-1" title={member.full_name ?? ''}>
          {member.full_name ?? '—'}
        </p>
        <p className="text-[10px] text-white/40 truncate mt-0.5">{member.email ?? '—'}</p>
      </div>

      <div className="mt-auto pt-3 border-t border-white/[0.05] flex flex-col gap-2 z-10 relative">
        {!editing ? (
          <div className="flex flex-wrap items-center gap-1.5 min-h-[48px] content-start">
            {member.jpp_position ? (
              <span
                className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg"
                style={{ background: hexToRgba(themeColor, isMTPosition ? 0.2 : 0.1), color: isMTPosition ? themeColor : 'rgba(255,255,255,0.6)' }}
              >
                {JPP_POSITION_LABELS[member.jpp_position] ?? member.jpp_position}
              </span>
            ) : (
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-white/5 text-white/30">
                Tiada Jawatan
              </span>
            )}

            {unitCfg && (
              <span
                className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg"
                style={{ background: hexToRgba(unitCfg.color, 0.15), color: unitCfg.color }}
              >
                {unitCfg.shortLabel}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Jawatan */}
            <select
              value={position}
              onChange={e => {
                setPosition(e.target.value);
                // Reset oversee list bila tukar jawatan
                if (!JPP_MT_POSITIONS.includes(e.target.value as any)) setOverseeUnits([]);
              }}
              className="text-xs font-semibold bg-black/40 border border-white/10 text-white rounded-xl px-2 py-1.5 outline-none custom-scrollbar"
            >
              <option value="">— Pilih Jawatan —</option>
              {Object.entries(JPP_POSITION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            {/* Unit Exco Sendiri (untuk Exco biasa — bukan MT) */}
            {!willBeMT && (
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="text-xs font-semibold bg-black/40 border border-white/10 text-white rounded-xl px-2 py-1.5 outline-none custom-scrollbar"
              >
                <option value="">— Pilih Unit Exco —</option>
                {JPP_UNITS.map(u => (
                  <option key={u} value={u}>{JPP_UNIT_LABELS[u] ?? u}</option>
                ))}
              </select>
            )}

            {/* MT Oversees — Multi-Checkbox (hanya untuk jawatan MT) */}
            {willBeMT && (
              <div className="rounded-xl border border-white/10 bg-black/30 p-2.5 space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">
                  🎯 Unit Diawasi (boleh pilih banyak)
                </p>
                {loadingOversee ? (
                  <div className="flex items-center gap-2 text-white/30 text-[10px]">
                    <Loader2 className="w-3 h-3 animate-spin" /> Memuatkan...
                  </div>
                ) : (
                  UNIT_ORDER.map(code => {
                    const cfg = UNIT_CFG[code];
                    if (!cfg) return null;
                    const checked = overseeUnits.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleOverseeUnit(code)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left',
                          checked ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/70'
                        )}
                      >
                        {checked
                          ? <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" style={{ color: cfg.color }} />
                          : <Square className="w-3.5 h-3.5 flex-shrink-0 text-white/20" />
                        }
                        <span className="text-[10px] font-bold truncate">{cfg.shortLabel}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Butang simpan/batal */}
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all text-xs font-bold"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 flex items-center justify-center py-1.5 rounded-xl bg-white/10 text-white/50 hover:bg-white/15 hover:text-white transition-all text-xs font-bold"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Group Section ─────────────────────────────────────────────────────────────
function GroupSection({
  title, members, canEdit, themeColor,
  onUpdate,
}: {
  title: string; members: JppMember[]; canEdit: boolean;
  themeColor: string; onUpdate: (id: string, patch: Partial<JppMember>) => void;
}) {
  if (members.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-black text-white/80 uppercase tracking-widest">{title}</h2>
        <div className="h-px flex-1 bg-white/[0.06]" />
        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest bg-white/[0.05] px-2 py-0.5 rounded-full">
          {members.length} Ahli
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {members.map(m => (
          <MemberCard
            key={m.id}
            member={m}
            canEdit={canEdit}
            themeColor={themeColor}
            onUpdate={onUpdate}
          />
        ))}
      </div>
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
                to="/jpp/users"
                className="flex flex-shrink-0 items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all w-fit group"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-white/80 transition-colors">
                  Pangkalan Data Pelajar
                </span>
              </Link>
            </div>
          )}
        </motion.div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.05] flex flex-col justify-center relative overflow-hidden">
            <Crown className="absolute -right-4 -bottom-4 w-20 h-20 text-white/5 pointer-events-none" />
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">MT JPP</p>
            <p className="text-3xl font-black text-white">{mtMembers.length}</p>
          </div>
          <div className="p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.05] flex flex-col justify-center relative overflow-hidden">
            <Users className="absolute -right-4 -bottom-4 w-20 h-20 text-white/5 pointer-events-none" />
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Exco & Unit</p>
            <p className="text-3xl font-black text-white">{filtered.length - unassigned.length - mtMembers.length}</p>
          </div>
          <div className="p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.05] flex flex-col justify-center relative overflow-hidden">
            <Shield className="absolute -right-4 -bottom-4 w-20 h-20 text-white/5 pointer-events-none" />
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Belum Set</p>
            <p className="text-3xl font-black text-white">{unassigned.length}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau emel ahli..."
            className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/[0.04] border border-transparent hover:border-white/[0.07] focus:bg-white/[0.06] text-sm text-white/80 placeholder-white/20 outline-none focus:border-white/15 transition-all font-medium"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-white/30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/[0.02] rounded-[2rem] border border-white/[0.05]">
            <UserCheck className="w-10 h-10 text-white/10 mb-4" />
            <p className="text-sm font-black text-white/30 uppercase tracking-widest">Tiada ahli ditemui</p>
            <p className="text-xs text-white/20 mt-2 font-medium">Sila cuba carian yang lain.</p>
          </div>
        ) : (
          <div className="space-y-10">
            <GroupSection
              title="Majlis Tertinggi (MT)"
              members={mtMembers}
              canEdit={canEdit}
              themeColor={themeColor}
              onUpdate={handleUpdate}
            />

            {/* Loop through all unit groups combined but separated by title */}
            {JPP_UNITS.map(u => {
              const grpMembers = unitGroups[u] ?? [];
              if (grpMembers.length === 0) return null;
              return (
                <GroupSection
                  key={u}
                  title={`Unit ${JPP_UNIT_LABELS[u] ?? u}`}
                  members={grpMembers}
                  canEdit={canEdit}
                  themeColor={themeColor}
                  onUpdate={handleUpdate}
                />
              );
            })}

            <GroupSection
              title="Belum Ditetapkan"
              members={unassigned}
              canEdit={canEdit}
              themeColor="#f43f5e" 
              onUpdate={handleUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
