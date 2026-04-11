import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { supabase } from '@/lib/supabase';
import { hexToRgba, getContrastText, cn, getMalaysianNickname } from '@/lib/utils';
import {
  Store, Calendar, Wallet, ShieldOff,
  Clock, ChevronLeft, ChevronRight, Plus, RotateCcw,
  Lock, Unlock, TrendingUp, Users,
  CheckSquare, Square, AlertCircle, RefreshCcw, X,
  ArrowLeftRight, Check, DollarSign, Activity,
  MessageSquare, Bell, ThumbsUp, ThumbsDown, Repeat2,
} from 'lucide-react';
import { type GeraiSession, type GeraiShift, type GeraiShiftSwap } from '@/types';
import { useJppExcoUnits } from '@/hooks/useJppExcoUnits';
import { toast } from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SHIFT_HOURS = Array.from({ length: 9 }, (_, i) => i + 8); // [8,9,...,16]
const fmt = (h: number) => `${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00`;
const fmtRM = (v: number | null | undefined) =>
  v != null ? `RM ${v.toFixed(2)}` : '—';
const today = () => new Date().toISOString().split('T')[0];

function weekDates(offset: number): Date[] {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
const DAY_SHORT = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];
const isoDate = (d: Date) => d.toISOString().split('T')[0];

// ─── Role Guard ───────────────────────────────────────────────────────────────

function GeraiAccessDenied({ color }: { color: string }) {
  return (
    <div className="min-h-full flex items-center justify-center p-8 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 bg-muted"
          style={{ border: `2px solid ${hexToRgba(color, 0.2)}` }}>
          <ShieldOff className="w-9 h-9 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-black mb-2 text-foreground">Akses Ditolak</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Halaman ini <span className="font-bold text-foreground">khusus untuk Exco Keusahawanan</span> dan MT JPP yang
          bertanggungjawab ke atas unit ini.
        </p>
        <div className="mt-6 px-4 py-3 rounded-2xl bg-muted/50 border border-border">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
            Hubungi Ketua Exco Keusahawanan untuk mendapatkan akses.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Tab: Jadual Syif ─────────────────────────────────────────────────────────

function GeraiJadual({
  color, canManage, currentUserId,
}: { color: string; canManage: boolean; currentUserId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [shifts, setShifts]         = useState<GeraiShift[]>([]);
  const [jppMembers, setJppMembers] = useState<any[]>([]);
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  // Assign modal (manager)
  const [assignModal, setAssignModal]     = useState<{ date: string; hour: number } | null>(null);
  const [selectedMember, setSelectedMember] = useState('');

  // Swap modal (member → request)
  const [swapModal, setSwapModal]   = useState<GeraiShift | null>(null);
  const [swapTarget, setSwapTarget] = useState('');
  const [swapReason, setSwapReason] = useState('');

  const [saving, setSaving] = useState(false);
  const [mobileDate, setMobileDate] = useState(today());

  const { unitColors } = useJppExcoUnits();

  const days        = weekDates(weekOffset);
  const dateStrings = days.map(isoDate);
  const startDate   = dateStrings[0];
  const endDate     = dateStrings[6];

  // Auto-init mobileDate to today if in current week, else first day of week
  useEffect(() => {
    const t = today();
    const currentDays = weekDates(weekOffset).map(isoDate);
    if (currentDays.includes(t)) setMobileDate(t);
    else setMobileDate(currentDays[0]);
  }, [weekOffset]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: shiftData }, { data: members }, { data: swaps }] = await Promise.all([
      supabase
        .from('gerai_shifts')
        .select('*, assignee:assigned_to(id, full_name, avatar_url)')
        .gte('shift_date', startDate)
        .lte('shift_date', endDate),
      supabase
        .from('profiles')
        .select('id, full_name, jpp_position, jpp_unit')
        .in('role', ['JPP', 'SUPER_ADMIN_JPP']),
      supabase
        .from('gerai_shift_swaps')
        .select(`
          *,
          requester:requested_by(id, full_name),
          target:swap_with(id, full_name),
          shift:shift_id(shift_date, shift_hour)
        `)
        .in('status', ['PENDING'])
        .or(`requested_by.eq.${currentUserId},swap_with.eq.${currentUserId}`),
    ]);
    setShifts(shiftData || []);
    setJppMembers(members || []);
    setSwapRequests(swaps || []);
    setLoading(false);
  }, [startDate, endDate, currentUserId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getShift = (date: string, hour: number) =>
    shifts.find(s => s.shift_date === date && s.shift_hour === hour);

  // ════ HANDLERS ════

  const handleAssign = async () => {
    if (!assignModal || !selectedMember) return;
    setSaving(true);
    const existing = getShift(assignModal.date, assignModal.hour);
    const payload  = { shift_date: assignModal.date, shift_hour: assignModal.hour, assigned_to: selectedMember, status: 'SCHEDULED' as const };
    const { error } = existing
      ? await supabase.from('gerai_shifts').update(payload).eq('id', existing.id)
      : await supabase.from('gerai_shifts').insert(payload);
    if (error) toast.error('Gagal simpan: ' + error.message);
    else { toast.success('Syif disimpan!'); setAssignModal(null); setSelectedMember(''); fetchData(); }
    setSaving(false);
  };

  const handleRemove = async (shift: GeraiShift) => {
    const { error } = await supabase.from('gerai_shifts').delete().eq('id', shift.id);
    if (error) toast.error('Gagal padam.');
    else { toast.success('Syif dipadamkan.'); fetchData(); }
  };

  const handleSwapRequest = async () => {
    if (!swapModal || !swapTarget || !swapReason.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('gerai_shift_swaps').insert({
      shift_id:     swapModal.id,
      requested_by: currentUserId,
      swap_with:    swapTarget || null,
      reason:       swapReason.trim(),
      status:       'PENDING',
    });
    if (error) toast.error('Gagal hantar request: ' + error.message);
    else { toast.success('Permintaan tukar syif dihantar! 🔄'); setSwapModal(null); setSwapTarget(''); setSwapReason(''); fetchData(); }
    setSaving(false);
  };

  const handleSwapRespond = async (swapId: string, accept: boolean) => {
    const { error } = await supabase.from('gerai_shift_swaps').update({
      status:       accept ? 'ACCEPTED' : 'REJECTED',
      responded_by: currentUserId,
      responded_at: new Date().toISOString(),
    }).eq('id', swapId);
    if (error) { toast.error(error.message); return; }
    if (accept) {
      // Find the swap to get shift and requester info for actual shift update
      const sw = swapRequests.find(r => r.id === swapId);
      if (sw?.shift_id) {
        await supabase.from('gerai_shifts').update({ assigned_to: currentUserId }).eq('id', sw.shift_id);
      }
      toast.success('Tukar syif diterima! ✅');
    } else {
      toast.success('Permintaan ditolak.');
    }
    fetchData();
  };

  const todayStr      = today();
  const isCurrentWeek = weekOffset === 0;

  // Per-member shift count this week
  const memberShiftCount: Record<string, number> = {};
  shifts.forEach(s => {
    if (s.assigned_to) memberShiftCount[s.assigned_to] = (memberShiftCount[s.assigned_to] || 0) + 1;
  });

  // My pending swap requests
  const myPendingReceived = swapRequests.filter(r => r.swap_with?.id === currentUserId && r.status === 'PENDING');
  const myPendingSent     = swapRequests.filter(r => r.requester?.id === currentUserId && r.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Pending Swap Notification Banner */}
      {myPendingReceived.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-black uppercase tracking-widest text-amber-600">
              {myPendingReceived.length} Permintaan Tukar Syif Menunggu
            </p>
          </div>
          {myPendingReceived.map(sw => (
            <div key={sw.id} className="flex items-center gap-3 flex-wrap bg-background rounded-xl px-4 py-3 border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black">{sw.requester?.full_name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {sw.shift?.shift_date} · {sw.shift?.shift_hour != null ? fmt(sw.shift.shift_hour) : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground italic mt-0.5">"{sw.reason}"</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleSwapRespond(sw.id, false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 text-[10px] font-black hover:bg-rose-500/20 transition-colors">
                  <ThumbsDown className="w-3 h-3" /> Tolak
                </button>
                <button onClick={() => handleSwapRespond(sw.id, true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[10px] font-black transition-colors"
                  style={{ background: color }}>
                  <ThumbsUp className="w-3 h-3" /> Terima
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sent swap requests tracking */}
      {myPendingSent.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/40 border border-border/50">
          <Repeat2 className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            Awak ada <span className="font-black text-foreground">{myPendingSent.length}</span> permintaan tukar syif yang sedang menunggu respons.
          </p>
        </div>
      )}

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Minggu</p>
          <p className="text-sm font-black">
            {days[0].toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })} –{' '}
            {days[6].toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {!isCurrentWeek && (
        <button onClick={() => setWeekOffset(0)}
          className="mx-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCcw className="w-3 h-3" /> Kembali ke minggu ini
        </button>
      )}

      {/* Calendar Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center animate-pulse text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
          Memuatkan jadual...
        </div>
      ) : (
        <>
          {/* Mobile View: Day Selector + Vertical List */}
          <div className="block md:hidden space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {days.map(d => {
                const ds = isoDate(d);
                const isActive = mobileDate === ds;
                const isToday = ds === todayStr;
                return (
                  <button
                    key={ds}
                    onClick={() => {
                      console.log('Mobile date selected:', ds);
                      setMobileDate(ds);
                    }}
                    className={cn(
                      "flex-shrink-0 w-14 py-3 rounded-2xl border transition-all snap-start relative z-10 cursor-pointer touch-action-manipulation active:scale-[0.85]",
                      isActive ? "shadow-lg scale-105" : "bg-card border-border/50 opacity-60"
                    )}
                    style={isActive ? { background: color, borderColor: color, color: getContrastText(color) } : {}}
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">{DAY_SHORT[d.getDay()]}</p>
                    <p className="text-lg font-black">{d.getDate()}</p>
                    {isToday && !isActive && <div className="w-1 h-1 rounded-full mx-auto mt-1" style={{ background: color }} />}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              {SHIFT_HOURS.map(hour => {
                const shift = getShift(mobileDate, hour);
                const isMyShift = shift?.assigned_to === currentUserId;
                const mColor = shift?.assigned_to ? (unitColors[(jppMembers.find(m => m.id === shift.assigned_to)?.jpp_unit) || ''] || color) : color;

                return (
                  <div key={hour} className="flex items-center gap-4">
                    <div className="w-20 text-[10px] font-black text-muted-foreground/40 uppercase whitespace-nowrap">
                      {fmt(hour).split('–')[0]}
                    </div>
                    {shift?.assignee ? (
                      <div 
                        onClick={() => {
                          if (canManage) setAssignModal({ date: mobileDate, hour });
                          else if (isMyShift) setSwapModal(shift);
                        }}
                        className="flex-1 flex items-center gap-3 p-3 rounded-2xl border relative transition-all active:scale-[0.98]"
                        style={{ background: hexToRgba(mColor, 0.08), borderColor: hexToRgba(mColor, 0.2) }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: mColor }}>
                          {shift.assignee.full_name.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black truncate text-foreground">{shift.assignee.full_name}</p>
                          <p className="text-[9px] font-bold uppercase tracking-widest opacity-50" style={{ color: mColor }}>
                            {jppMembers.find(m => m.id === shift.assigned_to)?.jpp_position || 'Exco'}
                          </p>
                        </div>
                        {isMyShift && <Repeat2 className="w-3.5 h-3.5 opacity-40" style={{ color: mColor }} />}
                        {canManage && (
                          <button onClick={e => { e.stopPropagation(); handleRemove(shift); }} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                             <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : canManage ? (
                      <button 
                        onClick={() => setAssignModal({ date: mobileDate, hour })}
                        className="flex-1 h-12 rounded-2xl border border-dashed border-border/40 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 hover:bg-muted/30"
                      >
                        <Plus className="w-3 h-3" /> Tugaskan
                      </button>
                    ) : (
                      <div className="flex-1 h-12 rounded-2xl bg-muted/10 border border-dashed border-border/10" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop View: Full Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 w-28">Slot</th>
                  {days.map(d => {
                    const ds      = isoDate(d);
                    const isToday = ds === todayStr;
                    return (
                      <th key={ds} className="text-center pb-2 px-1">
                        <div className={cn('px-2 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider',
                          isToday ? 'text-white' : 'text-muted-foreground/60')}
                          style={isToday ? { background: color } : {}}>
                          <p>{DAY_SHORT[d.getDay()]}</p>
                          <p className="text-[11px]">{d.getDate()}</p>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {SHIFT_HOURS.map(hour => (
                  <tr key={hour} className="border-t border-border/30">
                    <td className="py-1.5 pr-3 text-[10px] font-black text-muted-foreground/50 whitespace-nowrap">
                      {fmt(hour)}
                    </td>
                    {days.map(d => {
                      const ds      = isoDate(d);
                      const shift   = getShift(ds, hour);
                      const isToday = ds === todayStr;
                      const isMyShift = shift?.assigned_to === currentUserId;
                      const memberColor = shift?.assigned_to ? (unitColors[(jppMembers.find(m => m.id === shift.assigned_to)?.jpp_unit) || ''] || color) : color;

                      return (
                        <td key={ds} className="px-1 py-1">
                          {shift?.assignee ? (
                            <div
                              className="rounded-lg px-2 py-1.5 text-center cursor-pointer group relative"
                              style={{ background: hexToRgba(memberColor, 0.12), border: `1px solid ${hexToRgba(memberColor, 0.3)}` }}
                              onClick={() => {
                                if (canManage) setAssignModal({ date: ds, hour });
                                else if (isMyShift) setSwapModal(shift);
                              }}
                            >
                              <p className="font-black text-[10px] truncate" style={{ color: memberColor }}>
                                {getMalaysianNickname(shift.assignee.full_name)}
                              </p>
                              {isMyShift && !canManage && (
                                <Repeat2 className="w-2.5 h-2.5 mx-auto mt-0.5 opacity-40" style={{ color: memberColor }} />
                              )}
                              {canManage && (
                                <button
                                  onClick={e => { e.stopPropagation(); handleRemove(shift); }}
                                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          ) : canManage ? (
                            <button
                              onClick={() => setAssignModal({ date: ds, hour })}
                              className={cn('w-full rounded-lg px-2 py-1.5 text-center border border-dashed transition-all',
                                isToday ? 'border-border/60 hover:bg-muted/50' : 'border-transparent hover:border-border/40 hover:bg-muted/30')}
                            >
                              <Plus className="w-3 h-3 mx-auto text-muted-foreground/30" />
                            </button>
                          ) : (
                            <div className="h-7 rounded-lg bg-muted/20 border border-dashed border-border/20" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Member Roster ── */}
      {!loading && jppMembers.length > 0 && (
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
            <Users className="w-3 h-3" /> Ahli JPP ({jppMembers.length} orang)
          </p>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5">
            {jppMembers.map(m => {
              const mc = unitColors[m.jpp_unit] || '#6366f1';
              const shiftCount = memberShiftCount[m.id] || 0;
              const hasPendingSwap = swapRequests.some(r => r.requester?.id === m.id && r.status === 'PENDING');
              return (
                <div key={m.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-border bg-card hover:shadow-sm transition-all"
                  style={{ borderLeftColor: mc, borderLeftWidth: 3 }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                    style={{ background: mc }}>
                    {m.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black truncate leading-tight">{getMalaysianNickname(m.full_name)}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                      {shiftCount > 0 ? `${shiftCount} syif` : 'tiada syif'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal: Tugaskan (Manager) ── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {assignModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setAssignModal(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative w-full max-w-sm mx-auto rounded-3xl p-6 bg-card border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
              >
                <h3 className="font-black text-sm mb-0.5">Tugaskan Ahli</h3>
                <p className="text-[11px] text-muted-foreground mb-4">
                  {assignModal.date} · {fmt(assignModal.hour)}
                </p>
                <div className="space-y-2 max-h-56 overflow-y-auto mb-4">
                  {jppMembers.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-4">
                      Tiada ahli JPP dalam sistem lagi.
                    </p>
                  ) : jppMembers.map(m => {
                    const mc = unitColors[m.jpp_unit] || color;
                    return (
                      <button key={m.id} onClick={() => setSelectedMember(m.id)}
                        className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                          selectedMember === m.id ? 'border-transparent text-white' : 'border-border bg-muted/30 hover:border-border/60')}
                        style={selectedMember === m.id ? { background: mc } : {}}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
                          style={{ background: selectedMember === m.id ? 'rgba(255,255,255,0.25)' : mc }}>
                          {m.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black truncate">{m.full_name}</p>
                          <p className="text-[10px] opacity-60">{m.jpp_position ?? 'Exco'} · {memberShiftCount[m.id] || 0} syif minggu ini</p>
                        </div>
                        {selectedMember === m.id && <Check className="w-4 h-4 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setAssignModal(null)}
                    className="flex-1 h-10 rounded-xl border border-border text-[11px] font-black uppercase">Batal</button>
                  <button onClick={handleAssign} disabled={!selectedMember || saving}
                    className="flex-1 h-10 rounded-xl text-[11px] font-black uppercase transition-opacity disabled:opacity-40"
                    style={{ background: color, color: getContrastText(color) }}>
                    {saving ? 'Menyimpan...' : 'Tugaskan'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      , document.body)}leAs      {/* ── Modal: Minta Tukar Syif (Member) ── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {swapModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setSwapModal(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative w-full max-w-sm mx-auto rounded-3xl p-6 bg-card border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-500/10">
                    <Repeat2 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">Minta Tukar Syif</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {swapModal.shift_date} · {fmt(swapModal.shift_hour)}
                    </p>
                  </div>
                  <button onClick={() => setSwapModal(null)} className="ml-auto w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Pilih siapa nak swap dengan */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">
                      Tukar Dengan <span className="text-muted-foreground/40 normal-case">(pilihan)</span>
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      <button onClick={() => setSwapTarget('')}
                        className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black transition-all text-left',
                          swapTarget === '' ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-border bg-muted/30 text-muted-foreground hover:border-border/60')}>
                        <Users className="w-3.5 h-3.5" /> Sesiapa sahaja (buka kepada semua)
                      </button>
                      {jppMembers.filter(m => m.id !== currentUserId).map(m => {
                        const mc = unitColors[m.jpp_unit] || '#6366f1';
                        return (
                          <button key={m.id} onClick={() => setSwapTarget(m.id)}
                            className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-left',
                              swapTarget === m.id ? 'border-transparent text-white' : 'border-border bg-muted/30 hover:border-border/60')}
                            style={swapTarget === m.id ? { background: mc } : {}}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
                              style={{ background: swapTarget === m.id ? 'rgba(255,255,255,0.25)' : mc }}>
                              {m.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <p className="text-[10px] font-black flex-1 truncate">{m.full_name}</p>
                            {swapTarget === m.id && <Check className="w-3 h-3 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sebab */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1.5">Sebab / Alasan</p>
                    <textarea
                      value={swapReason} onChange={e => setSwapReason(e.target.value)}
                      placeholder="cth: Ada kelas pada masa tersebut, ujian, dll..."
                      className="w-full h-20 px-4 py-3 rounded-2xl border border-border bg-muted/30 text-xs font-medium resize-none outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={() => setSwapModal(null)}
                    className="flex-1 h-11 rounded-2xl border border-border text-[11px] font-black uppercase">Batal</button>
                  <button onClick={handleSwapRequest} disabled={!swapReason.trim() || saving}
                    className="flex-1 h-11 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black uppercase transition-colors disabled:opacity-40">
                    {saving ? 'Menghantar...' : '🔄 Hantar Request'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      , document.body)}
    </div>
  );
}

// ─── Tab: Sesi Buka/Tutup ─────────────────────────────────────────────────────

const OPENING_CHECKLIST = [
  'Semua produk/minuman telah disediakan',
  'Peralatan dalam keadaan baik',
  'Tempat gerai bersih & kemas',
  'Duit baki (float) telah dikira',
];

function GeraiSesi({ color, profile }: { color: string; profile: any }) {
  const [todaySession, setTodaySession] = useState<GeraiSession | null>(null);
  const [pastSessions, setPastSessions] = useState<GeraiSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);

  // Open form state
  const [openingCash, setOpeningCash] = useState('');
  const [checklist, setChecklist] = useState<boolean[]>(OPENING_CHECKLIST.map(() => false));
  const [openNotes, setOpenNotes] = useState('');

  // Close form state
  const [closingCash, setClosingCash] = useState('');
  const [totalSales, setTotalSales] = useState('');
  const [expenses, setExpenses] = useState('0');
  const [closeNotes, setCloseNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const t = today();
    const [{ data: todayData }, { data: past }] = await Promise.all([
      supabase.from('gerai_sessions').select('*, opener:opened_by(full_name), closer:closed_by(full_name)')
        .eq('session_date', t).maybeSingle(),
      supabase.from('gerai_sessions').select('*, opener:opened_by(full_name), closer:closed_by(full_name)')
        .neq('session_date', t).order('session_date', { ascending: false }).limit(30),
    ]);
    setTodaySession(todayData);
    setPastSessions(past || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const allChecked = checklist.every(Boolean);

  const handleOpen = async () => {
    if (!openingCash || !allChecked) return;
    setSaving(true);
    const { error } = await supabase.from('gerai_sessions').insert({
      session_date: today(),
      opened_by: profile?.id,
      opening_cash: parseFloat(openingCash),
      opening_time: new Date().toISOString(),
      opening_notes: openNotes || null,
      status: 'OPEN',
    });
    if (error) toast.error('Gagal buka kedai: ' + error.message);
    else { toast.success('Kedai berjaya dibuka! 🏪'); setOpenModal(false); fetchSessions(); }
    setSaving(false);
  };

  const handleClose = async () => {
    if (!todaySession || !closingCash || !totalSales) return;
    setSaving(true);
    const { error } = await supabase.from('gerai_sessions').update({
      closed_by: profile?.id,
      closing_cash: parseFloat(closingCash),
      total_sales: parseFloat(totalSales),
      total_expenses: parseFloat(expenses) || 0,
      closing_time: new Date().toISOString(),
      closing_notes: closeNotes || null,
      status: 'CLOSED',
    }).eq('id', todaySession.id);
    if (error) toast.error('Gagal tutup kedai: ' + error.message);
    else { toast.success('Kedai ditutup. Rekod disimpan! ✅'); setCloseModal(false); fetchSessions(); }
    setSaving(false);
  };

  const netProfit = (s: GeraiSession) => {
    if (s.closing_cash == null || s.total_sales == null) return null;
    return s.closing_cash - s.opening_cash - (s.total_expenses || 0);
  };

  if (loading) {
    return <div className="h-40 flex items-center justify-center animate-pulse text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Memuatkan...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Status Card Hari Ini */}
      <div className="rounded-[2rem] overflow-hidden border border-border shadow-sm bg-card">
        <div className="px-5 py-6 sm:px-6 sm:py-5" style={{ background: hexToRgba(color, 0.08) }}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
            Status Hari Ini — {new Date().toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {todaySession ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-3 h-3 rounded-full',
                    todaySession.status === 'OPEN' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'
                  )} />
                  <p className="text-xl font-black tracking-tight">
                    Kedai {todaySession.status === 'OPEN' ? 'BUKA' : 'TUTUP'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
                  <p>Modal: <span className="font-bold text-foreground">{fmtRM(todaySession.opening_cash)}</span></p>
                  <p>Staf: <span className="font-bold text-foreground">{getMalaysianNickname((todaySession as any).opener?.full_name)}</span></p>
                </div>
                {todaySession.status === 'CLOSED' && (
                  <div className="inline-flex px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">
                      Untung: {fmtRM(netProfit(todaySession))}
                    </p>
                  </div>
                )}
              </div>
              {todaySession.status === 'OPEN' && (
                <button onClick={() => setCloseModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-rose-500/10"
                  style={{ background: '#f43f5e', color: '#fff' }}>
                  <Lock className="w-4 h-4" /> Tutup Kedai
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                  <p className="text-xl font-black tracking-tight text-muted-foreground/60">Belum Dibuka</p>
                </div>
                <p className="text-xs text-muted-foreground font-medium italic">Tiada rekod sesi untuk hari ini.</p>
              </div>
              <button onClick={() => setOpenModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-indigo-500/10"
                style={{ background: color, color: getContrastText(color) }}>
                <Unlock className="w-4 h-4" /> Buka Kedai
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rekod Sesi Lepas */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Rekod Sesi Lepas</p>
        {pastSessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground/40">
            <Activity className="w-8 h-8 mx-auto mb-2" />
            <p className="text-[11px] font-bold uppercase tracking-widest">Tiada rekod lagi</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pastSessions.map(s => {
              const profit = netProfit(s);
              return (
                <div key={s.id} className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-card border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black">
                      {new Date(s.session_date).toLocaleDateString('ms-MY', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Dibuka: {(s as any).opener?.full_name ?? '—'}
                      {s.status === 'CLOSED' && ` · Ditutup: ${(s as any).closer?.full_name ?? '—'}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      'text-xs font-black',
                      profit == null ? 'text-muted-foreground' :
                        profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                    )}>
                      {profit == null ? '—' : fmtRM(profit)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.status === 'OPEN' ? '🔴 Belum tutup' : '✅ Selesai'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Buka Kedai */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {openModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpenModal(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative w-full max-w-sm mx-auto rounded-3xl p-6 bg-card border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: hexToRgba(color, 0.15) }}>
                    <Unlock className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">Buka Kedai</h3>
                    <p className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block mb-1.5">
                      Modal Awal / Float (RM)
                    </label>
                    <input
                      type="number" step="0.01" min="0"
                      value={openingCash} onChange={e => setOpeningCash(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-11 px-4 rounded-xl border border-border bg-muted/30 text-sm font-bold outline-none focus:border-border/60"
                    />
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Checklist Pembukaan</p>
                    <div className="space-y-2">
                      {OPENING_CHECKLIST.map((item, i) => (
                        <button key={i} onClick={() => setChecklist(c => c.map((v, j) => j === i ? !v : v))}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-border/40 hover:border-border transition-colors text-left">
                          {checklist[i]
                            ? <CheckSquare className="w-4 h-4 flex-shrink-0" style={{ color }} />
                            : <Square className="w-4 h-4 flex-shrink-0 text-muted-foreground/30" />}
                          <span className={cn('text-xs font-medium', checklist[i] ? 'text-foreground' : 'text-muted-foreground')}>{item}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block mb-1.5">Nota (Pilihan)</label>
                    <textarea
                      value={openNotes} onChange={e => setOpenNotes(e.target.value)}
                      placeholder="Nota tambahan..."
                      className="w-full h-16 px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-xs font-medium resize-none outline-none"
                    />
                  </div>

                  {!allChecked && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Sila lengkapkan semua checklist dahulu.</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-5">
                  <button onClick={() => setOpenModal(false)}
                    className="flex-1 h-11 rounded-2xl border border-border text-[11px] font-black uppercase">Batal</button>
                  <button onClick={handleOpen} disabled={!openingCash || !allChecked || saving}
                    className="flex-1 h-11 rounded-2xl text-[11px] font-black uppercase disabled:opacity-40 transition-opacity"
                    style={{ background: color, color: getContrastText(color) }}>
                    {saving ? 'Membuka...' : '🔓 Buka Sekarang'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      , document.body)}

      {/* Modal: Tutup Kedai */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {closeModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCloseModal(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative w-full max-w-sm mx-auto rounded-3xl p-6 bg-card border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: hexToRgba(color, 0.15) }}>
                    <Lock className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">Tutup Kedai</h3>
                    <p className="text-[10px] text-muted-foreground">Isi rekod penutupan hari ini</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Duit Dalam Till (RM)', value: closingCash, set: setClosingCash, placeholder: '0.00' },
                    { label: 'Jumlah Jualan (RM)', value: totalSales, set: setTotalSales, placeholder: '0.00' },
                    { label: 'Perbelanjaan/Stok (RM)', value: expenses, set: setExpenses, placeholder: '0.00' },
                  ].map(({ label, value, set, placeholder }) => (
                    <div key={label}>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block mb-1">{label}</label>
                      <input
                        type="number" step="0.01" min="0"
                        value={value} onChange={e => set(e.target.value)}
                        placeholder={placeholder}
                        className="w-full h-10 px-4 rounded-xl border border-border bg-muted/30 text-sm font-bold outline-none"
                      />
                    </div>
                  ))}

                  {/* Auto-kira untung */}
                  {closingCash && todaySession && (
                    <div className="px-4 py-3 rounded-2xl border"
                      style={{ background: hexToRgba(color, 0.06), borderColor: hexToRgba(color, 0.2) }}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Anggaran Untung Bersih</p>
                      <p className="text-lg font-black" style={{ color }}>
                        {fmtRM(parseFloat(closingCash) - todaySession.opening_cash - (parseFloat(expenses) || 0))}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Till ({fmtRM(parseFloat(closingCash))}) − Float ({fmtRM(todaySession.opening_cash)}) − Perbelanjaan ({fmtRM(parseFloat(expenses) || 0)})
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block mb-1">Nota Penutupan</label>
                    <textarea
                      value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
                      placeholder="Nota..., isu yang berlaku, dll."
                      className="w-full h-16 px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-xs font-medium resize-none outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button onClick={() => setCloseModal(false)}
                    className="flex-1 h-11 rounded-2xl border border-border text-[11px] font-black uppercase">Batal</button>
                  <button onClick={handleClose} disabled={!closingCash || !totalSales || saving}
                    className="flex-1 h-11 rounded-2xl text-[11px] font-black uppercase disabled:opacity-40"
                    style={{ background: color, color: getContrastText(color) }}>
                    {saving ? 'Menyimpan...' : '🔒 Tutup & Simpan'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      , document.body)}
    </div>
  );
}

// ─── Tab: Kewangan ────────────────────────────────────────────────────────────

function GeraiKewangan({ color }: { color: string }) {
  const [sessions, setSessions] = useState<GeraiSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('gerai_sessions')
      .select('*, opener:opened_by(full_name), closer:closed_by(full_name)')
      .eq('status', 'CLOSED')
      .order('session_date', { ascending: false })
      .then(({ data }) => { setSessions(data || []); setLoading(false); });
  }, []);

  const netProfit = (s: GeraiSession) =>
    s.closing_cash != null ? s.closing_cash - s.opening_cash - (s.total_expenses || 0) : 0;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthSessions = sessions.filter(s => s.session_date.startsWith(thisMonth));
  const totalSalesMonth = monthSessions.reduce((a, s) => a + (s.total_sales || 0), 0);
  const totalProfitMonth = monthSessions.reduce((a, s) => a + netProfit(s), 0);
  const bestDay = sessions.reduce<GeraiSession | null>((best, s) =>
    best == null || netProfit(s) > netProfit(best) ? s : best, null);

  const stats = [
    { label: 'Jualan Bulan Ini', value: fmtRM(totalSalesMonth), icon: DollarSign, up: true },
    { label: 'Untung Bersih', value: fmtRM(totalProfitMonth), icon: TrendingUp, up: totalProfitMonth >= 0 },
    { label: 'Sesi Ditutup', value: `${monthSessions.length} hari`, icon: Activity, up: true },
    { label: 'Terbaik Pernah', value: bestDay ? fmtRM(netProfit(bestDay)) : '—', icon: TrendingUp, up: true },
  ];

  if (loading) return (
    <div className="h-40 flex items-center justify-center animate-pulse text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Memuatkan...</div>
  );

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4 bg-card border border-border">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
              style={{ background: hexToRgba(color, 0.1) }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-lg font-black leading-none">{value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">{label}</p>
          </div>
        ))}
      </div>

      {/* Rekod Table */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Rekod Sesi Selesai</p>
        {sessions.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground/40">
            <TrendingUp className="w-8 h-8 mx-auto mb-2" />
            <p className="text-[11px] font-bold uppercase tracking-widest">Tiada rekod lagi</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => {
              const profit = netProfit(s);
              return (
                <div key={s.id} className="px-4 py-3 rounded-2xl bg-card border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black">
                        {new Date(s.session_date).toLocaleDateString('ms-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Jualan: {fmtRM(s.total_sales)} · Float: {fmtRM(s.opening_cash)} · Perbelanjaan: {fmtRM(s.total_expenses)}
                      </p>
                    </div>
                    <p className={cn(
                      'text-sm font-black flex-shrink-0',
                      profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                    )}>
                      {profit >= 0 ? '+' : ''}{fmtRM(profit)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main GeraiPage ───────────────────────────────────────────────────────────

type Tab = 'jadual' | 'sesi' | 'kewangan';

export function GeraiPage() {
  const { profile } = useAuth();
  const { color } = useExcoTheme();
  const [activeTab, setActiveTab] = useState<Tab>('jadual');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const role = profile.role as string;
    const pos = (profile as any).jpp_position as string | null;
    const unit = (profile as any).jpp_unit as string | null;
    if (role === 'SUPER_ADMIN_JPP' || role === 'ADMIN') {
      setHasAccess(true); setCanManage(true); return;
    }
    if (role === 'JPP' && unit === 'KEUSAHAWANAN') {
      setHasAccess(true);
      setCanManage(pos === 'KETUA_EXCO' || pos === 'TIMBALAN_EXCO');
      return;
    }
    // MT yang oversee Keusahawanan — semak melalui jpp_mt_assignments
    if (role === 'JPP') {
      supabase.from('jpp_mt_assignments')
        .select('id').eq('mt_user_id', profile.id).eq('unit', 'KEUSAHAWANAN').maybeSingle()
        .then(({ data }) => {
          if (data) { setHasAccess(true); setCanManage(true); return; }
          setHasAccess(false);
        });
      return;
    }
    setHasAccess(false);
  }, [profile]);

  if (hasAccess === null) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!hasAccess) return <GeraiAccessDenied color={color} />;

  const tabs: { id: Tab; label: string; icon: typeof Store }[] = [
    { id: 'jadual',   label: 'Jadual Syif', icon: Calendar },
    { id: 'sesi',     label: 'Sesi Kedai',  icon: Store },
    { id: 'kewangan', label: 'Kewangan',    icon: Wallet },
  ];

  return (
    <div className="min-h-full p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 rounded-full" style={{ background: color }} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">e-Keusahawanan</p>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Store className="w-6 h-6" style={{ color }} />
              Gerai JPP
            </h1>
            <p className="text-sm mt-0.5 text-muted-foreground">Pengurusan operasi gerai minuman JPP Polisas</p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border"
              style={{ background: hexToRgba(color, 0.08), borderColor: hexToRgba(color, 0.25), color }}>
              <Users className="w-3 h-3" /> Mode Pengurusan
            </div>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-muted/50 border border-border">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
              activeTab === id ? 'shadow-sm text-white' : 'text-muted-foreground hover:text-foreground'
            )}
            style={activeTab === id ? { background: color } : {}}>
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'jadual'   && <GeraiJadual color={color} canManage={canManage} currentUserId={profile?.id ?? ''} />}
          {activeTab === 'sesi'     && <GeraiSesi color={color} profile={profile} />}
          {activeTab === 'kewangan' && <GeraiKewangan color={color} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
