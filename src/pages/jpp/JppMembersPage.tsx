import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Users, Crown, Search, Pencil, Shield,
  Loader2, UserCheck, CheckSquare, Square, Plus, X, Trash, AlertTriangle
} from 'lucide-react';
import { cn, hexToRgba, getContrastText } from '@/lib/utils';
import { JPP_MT_POSITIONS } from '@/types';
import type { JppPosition, JppUnit } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { useJppConfig } from '@/contexts/JppConfigContext';
import { logAuditAction } from '@/lib/auditLogger';

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
  onRemove,
}: {
  member: JppMember;
  canEdit: boolean;
  themeColor: string;
  onUpdate: (id: string, patch: Partial<JppMember>) => void;
  onRemove: (id: string) => void;
}) {
  const { positionLabels, unitLabels, unitConfig, unitOrder } = useJppConfig();
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
  const unitCfg = member.jpp_unit ? unitConfig[member.jpp_unit] : null;

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
      // 1. Update profiles via RPC (enforces server-side auth: hanya YDP/SuperAdmin)
      const patch: Record<string, any> = { jpp_position: position || null, jpp_unit: unit || null };
      const { error } = await supabase.rpc('update_jpp_member_profile', {
        p_target_id:    member.id,
        p_jpp_position: position || '',
        p_jpp_unit:     unit || '',
      });
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
      logAuditAction({ actionType: 'JPP_MEMBER_UPDATED', module: 'JPP Admin', entityId: member.id, description: `Maklumat ahli ${member.full_name} dikemaskini (Jawatan: ${position || '-'}, Unit: ${unit || '-'})`, actorId: member.id, metadata: { position, unit, overseeUnits } });
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
            className="opacity-50 md:opacity-0 md:group-hover:opacity-100 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all focus:opacity-100 bg-white/[0.05] md:bg-transparent"
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
                {positionLabels[member.jpp_position as string] ?? member.jpp_position}
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
              <option value="" className="bg-[#0f0f13] text-white">— Pilih Jawatan —</option>
              {Object.entries(positionLabels).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#0f0f13] text-white">{v}</option>
              ))}
            </select>

            {/* Unit Exco Sendiri (untuk Exco biasa — bukan MT) */}
            {!willBeMT && (
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="text-xs font-semibold bg-black/40 border border-white/10 text-white rounded-xl px-2 py-1.5 outline-none custom-scrollbar"
              >
                <option value="" className="bg-[#0f0f13] text-white">— Pilih Unit Exco —</option>
                {Object.keys(unitLabels).map(u => (
                  <option key={u} value={u} className="bg-[#0f0f13] text-white">{unitLabels[u] ?? u}</option>
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
                  unitOrder.map(code => {
                    const cfg = unitConfig[code];
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
                onClick={() => {
                  if (confirm(`Adakah anda pasti ingin membuang ${member.full_name} dari JPP?`)) {
                    onRemove(member.id);
                  }
                }}
                disabled={saving}
                className="flex-shrink-0 flex items-center justify-center px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all text-xs font-bold"
                title="Buang Ahli"
              >
                <Trash className="w-3.5 h-3.5" />
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
  onUpdate, onRemove
}: {
  title: string; members: JppMember[]; canEdit: boolean;
  themeColor: string; onUpdate: (id: string, patch: Partial<JppMember>) => void;
  onRemove: (id: string) => void;
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
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}

// ── Add Member Modal ──────────────────────────────────────────────────────────
function AddMemberModal({
  themeColor,
  isOpen,
  onClose,
  onSuccess
}: {
  themeColor: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMember: JppMember) => void;
}) {
  const { positionLabels, unitLabels, unitConfig, unitOrder } = useJppConfig();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  const [position, setPosition] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [overseeUnits, setOverseeUnits] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  const willBeMT = JPP_MT_POSITIONS.includes(position as any);

  // Auto search when query changes
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .ilike('full_name', `%${searchQuery}%`)
        .limit(10);
      if (!error && data) setSearchResults(data);
      setSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      // Gunakan RPC untuk enforce server-side authorization (K-1 security fix)
      const { error } = await supabase.rpc('assign_jpp_member', {
        p_target_id:    selectedUser.id,
        p_jpp_position: position || '',
        p_jpp_unit:     unit || '',
      });
      if (error) throw error;

      const patch: Record<string, any> = {
        role: 'JPP',
        jpp_position: position || null,
        jpp_unit: unit || null
      };

      if (willBeMT && overseeUnits.length > 0) {
        // Padam jika ada overlap, tambah baharu
        await supabase.from('jpp_mt_assignments').delete().eq('mt_user_id', selectedUser.id);
        await supabase.from('jpp_mt_assignments').insert(
          overseeUnits.map(u => ({
            mt_user_id: selectedUser.id,
            unit: u,
            assigned_by: null,
          }))
        );
      }

      toast.success('Ahli berjaya ditambah ke JPP.');
      logAuditAction({ actionType: 'JPP_MEMBER_ADDED', module: 'JPP Admin', entityId: selectedUser.id, description: `${selectedUser.full_name} ditambah ke JPP (Jawatan: ${position || '-'})`, actorId: selectedUser.id, metadata: { position, unit, overseeUnits } });
      onSuccess({
        id: selectedUser.id,
        full_name: selectedUser.full_name,
        email: selectedUser.email,
        avatar_url: selectedUser.avatar_url,
        jpp_position: position as any || null,
        jpp_unit: unit as any || null
      });
      onClose();
      // Reset state for next use
      setSelectedUser(null);
      setSearchQuery('');
      setPosition('');
      setUnit('');
      setOverseeUnits([]);
    } catch (err: any) {
      toast.error('Gagal tambah ahli: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#0a0a0f] border border-white/[0.08] shadow-2xl rounded-[2rem] p-6 relative flex flex-col max-h-[85vh] overflow-y-auto custom-scrollbar"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10">
            <Plus className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-lg font-black text-white">Tambah Ahli JPP</h3>
        </div>
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-6 ml-11">
          Cari pelajar dan tetapkan jawatan
        </p>

        {!selectedUser ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama penuh pelajar..."
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/30 focus:bg-white/[0.05] hover:border-white/[0.1] transition-all font-medium"
              />
            </div>
            
            <div className="space-y-2 min-h-[150px]">
              {searching ? (
                <div className="flex justify-center py-6 text-white/30 text-xs gap-2 font-medium bg-white/[0.02] rounded-xl border border-white/[0.03]"><Loader2 className="w-4 h-4 animate-spin text-emerald-400"/>Mencari rekod...</div>
              ) : searchQuery.length > 0 && searchQuery.length < 3 ? (
                <div className="text-center py-6 text-white/30 text-[10px] uppercase tracking-widest font-bold bg-white/[0.02] rounded-xl border border-white/[0.03]">Taip 3 aksara untuk carian</div>
              ) : searchResults.length === 0 && searchQuery.length >= 3 ? (
                <div className="text-center py-6 text-white/30 text-[10px] uppercase tracking-widest font-bold bg-white/[0.02] rounded-xl border border-white/[0.03]">Tiada pelajar dijumpai</div>
              ) : (
                searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 text-left border border-white/[0.03] hover:border-white/10 transition-all group bg-white/[0.01]"
                  >
                    <Avatar className="w-10 h-10 rounded-xl shadow-lg border border-white/[0.05]">
                      <AvatarFallback className="bg-white/10 text-xs text-white/80 font-black">{u.full_name?.substring(0,2).toUpperCase()}</AvatarFallback>
                      <AvatarImage src={u.avatar_url || ''} className="object-cover" />
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-white/90 truncate group-hover:text-white transition-colors">{u.full_name}</p>
                      <p className="text-[10px] text-white/30 truncate mt-0.5">{u.email}</p>
                    </div>
                    {u.role === 'JPP' && <Crown className="w-4 h-4 text-amber-500/50" />}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* User Info header */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 shadow-inner">
              <Avatar className="w-10 h-10 rounded-xl shadow-lg border border-emerald-500/20">
                <AvatarImage src={selectedUser.avatar_url || ''} className="object-cover" />
                <AvatarFallback className="bg-white/10 text-xs font-black">{selectedUser.full_name?.substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-black text-white truncate">{selectedUser.full_name}</p>
                <p className="text-[10px] text-white/40 truncate mt-0.5">{selectedUser.email}</p>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-[9px] uppercase tracking-widest font-black text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 px-2 py-1.5 rounded-lg transition-colors"
              >
                Tukar
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-2">Jawatan JPP</label>
                <select
                  value={position}
                  onChange={e => {
                    setPosition(e.target.value);
                    if (!JPP_MT_POSITIONS.includes(e.target.value as any)) setOverseeUnits([]);
                  }}
                  className="w-full text-xs font-semibold bg-black/40 border border-white/[0.08] text-white rounded-xl px-3 py-3 outline-none custom-scrollbar focus:border-emerald-500/30 focus:bg-white/[0.02] transition-colors"
                >
                  <option value="" className="bg-[#0f0f13] text-white">— Pilih Jawatan —</option>
                  {Object.entries(positionLabels).map(([k, v]) => (
                    <option key={k} value={k} className="bg-[#0f0f13] text-white">{v}</option>
                  ))}
                </select>
              </div>

              {!willBeMT && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-2">Unit Exco (Pilihan)</label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full text-xs font-semibold bg-black/40 border border-white/[0.08] text-white rounded-xl px-3 py-3 outline-none custom-scrollbar focus:border-emerald-500/30 focus:bg-white/[0.02] transition-colors"
                  >
                    <option value="" className="bg-[#0f0f13] text-white">— Pilih Unit Exco —</option>
                    {Object.keys(unitLabels).map(u => (
                      <option key={u} value={u} className="bg-[#0f0f13] text-white">{unitLabels[u] ?? u}</option>
                    ))}
                  </select>
                </div>
              )}

              {willBeMT && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-2 flex items-center gap-2">Penyeliaan Unit (MT) <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md text-[8px]">PILIHAN RAWAK</span></label>
                  <div className="rounded-xl border border-white/[0.08] bg-black/30 p-2 max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                    {unitOrder.map(code => {
                      const cfg = unitConfig[code];
                      if (!cfg) return null;
                      const checked = overseeUnits.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setOverseeUnits(prev =>
                            prev.includes(code) ? prev.filter(u => u !== code) : [...prev, code]
                          )}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left bg-white/[0.01] hover:bg-white/[0.03]',
                            checked ? 'bg-white/[0.06] border border-white/10 text-white' : 'text-white/40 border border-transparent'
                          )}
                        >
                          {checked
                            ? <CheckSquare className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
                            : <Square className="w-4 h-4 flex-shrink-0 text-white/20" />
                          }
                          <span className="text-[11px] font-bold truncate">{cfg.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving || !position}
                className={cn(
                  "w-full py-3.5 rounded-[1rem] text-[11px] font-black uppercase tracking-widest transition-all shadow-xl",
                  saving || !position ? "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed" : "bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20 hover:scale-[1.02]"
                )}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Simpan Ahli JPP'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Reset Kohort Modal ────────────────────────────────────────────────────────
function ResetKohortModal({
  isOpen,
  onClose,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset text bila buka/tutup
  useEffect(() => {
    if (isOpen) setConfirmText('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (confirmText !== 'RESET KOHORT') return;
    setIsSubmitting(true);
    await onConfirm();
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-[#0a0a0f] border border-rose-500/30 shadow-2xl shadow-rose-500/10 rounded-[2rem] p-6 relative flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/20">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Reset Kohort JPP</h3>
            <p className="text-[10px] text-rose-400/80 uppercase tracking-widest font-bold">Tindakan tidak boleh dipulihkan</p>
          </div>
        </div>

        <p className="text-sm text-white/70 mb-4 leading-relaxed">
          Tindakan ini akan <b>melucutkan peranan JPP</b> daripada kesemua ahli sedia ada dan mengosongkan semua jawatan serta unit. 
          Lakukan ini hanya jika anda ingin melantik kohort/barisan ahli yang baharu.
        </p>

        <div className="space-y-3 mb-6">
          <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block">
            Sila taip <span className="text-rose-400 bg-rose-400/10 px-1 rounded">RESET KOHORT</span> untuk mengesahkan:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESET KOHORT"
            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-rose-500/50 font-mono text-center tracking-widest uppercase transition-all"
          />
        </div>

        <button
          onClick={handleConfirm}
          disabled={confirmText !== 'RESET KOHORT' || isSubmitting}
          className={cn(
            "w-full py-3.5 rounded-[1rem] text-[11px] font-black uppercase tracking-widest transition-all shadow-xl",
            confirmText !== 'RESET KOHORT' || isSubmitting
              ? "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
              : "bg-rose-500 text-white hover:bg-rose-400 shadow-rose-500/20 hover:scale-[1.02]"
          )}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sahkan & Reset'}
        </button>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function JppMembersPage() {
  const { user, profile, isSuperAdmin } = useAuth();
  const { unitLabels, unitOrder } = useJppConfig();

  const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
  const [members, setMembers]       = useState<JppMember[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const jppPosition = profile?.jpp_position as string | undefined;
  const isYDP = jppPosition === 'YDP' || jppPosition === 'YANG_DIPERTUA' || isSuperAdmin;
  const canEdit = isYDP;

  // Fetch theme color
  useEffect(() => {
    supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
      .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
  }, []);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, jpp_position, jpp_unit')
      .eq('role', 'JPP')
      .order('full_name');
    setMembers((data ?? []) as JppMember[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleUpdate = useCallback((id: string, patch: Partial<JppMember>) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  }, []);

  const handleRemove = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.rpc('remove_jpp_member', { p_target_id: id });
      if (error) throw error;
      const removed = members.find(m => m.id === id);
      setMembers(prev => prev.filter(m => m.id !== id));
      toast.success('Ahli berjaya dibuang dari JPP.');
      logAuditAction({ actionType: 'JPP_MEMBER_REMOVED', module: 'JPP Admin', entityId: id, description: `${removed?.full_name || 'Ahli'} dibuang dari JPP`, actorId: user!.id });
    } catch (err: any) {
      toast.error('Gagal membuang ahli: ' + err.message);
    }
  }, []);

  const handleResetKohort = useCallback(async () => {
    try {
      const { error } = await supabase.rpc('reset_jpp_cohort');
      if (error) throw error;
      toast.success('Berjaya reset kohort JPP. Semua ahli telah dikeluarkan.');
      logAuditAction({ actionType: 'JPP_KOHORT_RESET', module: 'JPP Admin', description: `Kohort JPP direset — ${members.length} ahli dikeluarkan`, actorId: user!.id, metadata: { total_removed: members.length } });
      fetchMembers(); // Refresh senarai ahli
    } catch (err: any) {
      toast.error('Gagal mereset kohort: ' + err.message);
    }
  }, [fetchMembers]);

  // Filter by search
  const filtered = members.filter(m =>
    !search ||
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Group members
  const mtMembers  = filtered.filter(m => JPP_MT_POSITIONS.includes(m.jpp_position as any));
  const unitGroups = Object.fromEntries(
    Object.keys(unitLabels).map(u => [u, filtered.filter(m => m.jpp_unit === u && !JPP_MT_POSITIONS.includes(m.jpp_position as any))])
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
              <button
                onClick={() => setShowResetModal(true)}
                className="flex flex-shrink-0 items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all w-fit group"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                  Reset Kohort
                </span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex flex-shrink-0 items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all w-fit group"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Tambah Ahli
                </span>
              </button>
              <Link 
                to="/jpp/users"
                className="flex flex-shrink-0 items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all w-fit group"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-white/80 transition-colors">
                  Pangkalan Data Pelajar
                </span>
              </Link>
              <Link 
                to="/jpp/settings"
                className="flex flex-shrink-0 items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all w-fit group"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  Urus Struktur JPP
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
              onRemove={handleRemove}
            />

            {/* Loop through all unit groups combined but separated by title */}
            {unitOrder.map(u => {
              const grpMembers = unitGroups[u] ?? [];
              if (grpMembers.length === 0) return null;
              return (
                <GroupSection
                  key={u}
                  title={`Unit ${unitLabels[u] ?? u}`}
                  members={grpMembers}
                  canEdit={canEdit}
                  themeColor={themeColor}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                />
              );
            })}

            <GroupSection
              title="Belum Ditetapkan"
              members={unassigned}
              canEdit={canEdit}
              themeColor="#f43f5e" 
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          </div>
        )}
      </div>

      <AddMemberModal 
        themeColor={themeColor}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(newMember) => {
          // Hanya tambah jika belum wujud
          setMembers(prev => {
            if (prev.some(m => m.id === newMember.id)) {
              return prev.map(m => m.id === newMember.id ? newMember : m);
            }
            return [...prev, newMember].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
          });
        }}
      />

      <ResetKohortModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetKohort}
      />
    </div>
  );
}
