import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import {
  Store, CheckCircle, XCircle, Clock, Eye, RefreshCw,
  Building2, TrendingUp, Filter, Users, ShieldCheck, UserPlus, Trash2, Logs, LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPortal } from 'react-dom';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { hexToRgba } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
// DB enum: PENDING_INTERVIEW | ACTIVE | REJECTED
type BusinessStatus = 'PENDING_INTERVIEW' | 'ACTIVE' | 'REJECTED';

interface Business {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  status: BusinessStatus;
  created_at: string;
  interview_date: string | null;
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  owner_matric?: string;
  staff_count: number;
}

// ─── Status Meta ──────────────────────────────────────────────────────────────
const STATUS_META: Record<BusinessStatus, { label: string; dotColor: string; badgeCls: string }> = {
  PENDING_INTERVIEW: {
    label: 'Menunggu Temuduga',
    dotColor: '#f59e0b',
    badgeCls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  ACTIVE: {
    label: 'Aktif',
    dotColor: '#22c55e',
    badgeCls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  REJECTED: {
    label: 'Ditolak',
    dotColor: '#ef4444',
    badgeCls: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  },
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function BusinessDetailModal({
  business,
  onClose,
  onApprove,
  onReject,
}: {
  business: Business;
  onClose: () => void;
  onApprove: (b: Business) => Promise<void>;
  onReject: (b: Business) => Promise<void>;
}) {
  const [acting, setActing] = useState(false);
  const sm = STATUS_META[business.status];

  const act = async (fn: () => Promise<void>) => {
    setActing(true);
    try { await fn(); }
    finally { setActing(false); onClose(); }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="bg-[#0f0f13] border border-white/10 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative h-28 bg-gradient-to-br from-emerald-500/80 to-teal-700 p-6 flex items-end gap-3">
          <div className="absolute top-4 right-4">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${sm.badgeCls}`}>
              {sm.label}
            </span>
          </div>
          {business.logo_url ? (
            <img src={business.logo_url} className="w-14 h-14 rounded-2xl border-2 border-white/20 object-cover" alt="" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Store className="w-7 h-7 text-white/80" />
            </div>
          )}
          <div className="text-white">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Perniagaan Pelajar</p>
            <h2 className="text-lg font-black leading-tight text-white">{business.name}</h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] rounded-2xl p-3 border border-white/[0.04]">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Pemilik</p>
              <p className="text-sm font-black text-white truncate">{business.owner_name ?? '—'}</p>
              <p className="text-[10px] text-white/50">{business.owner_matric ?? ''}</p>
            </div>
            <div className="bg-white/[0.03] rounded-2xl p-3 border border-white/[0.04]">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Email</p>
              <p className="text-[11px] font-bold text-white break-all">{business.owner_email ?? '—'}</p>
            </div>
          </div>

          {business.description && (
            <div className="bg-white/[0.03] rounded-2xl p-3 border border-white/[0.04]">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Penerangan</p>
              <p className="text-sm text-white/70 leading-relaxed">{business.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] rounded-2xl p-3 flex items-center gap-2 border border-white/[0.04]">
              <Users className="w-4 h-4 text-white/30" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Bilangan Staf</p>
                <p className="text-sm font-black text-white">{business.staff_count} orang</p>
              </div>
            </div>
            {business.interview_date && (
              <div className="bg-white/[0.03] rounded-2xl p-3 border border-white/[0.04]">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Tarikh Temuduga</p>
                <p className="text-sm font-black text-white">
                  {new Date(business.interview_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>

          <p className="text-[10px] text-white/30 text-right">
            Didaftar: {new Date(business.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Actions */}
        <div className="border-t border-white/10 bg-white/[0.02] px-6 py-4 flex gap-3">
          {business.status === 'PENDING_INTERVIEW' && (
            <>
              <Button disabled={acting} variant="outline"
                className="flex-1 rounded-xl border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-black text-xs uppercase bg-transparent"
                onClick={() => act(() => onReject(business))}>
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Tolak
              </Button>
              <Button disabled={acting}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase border-none"
                onClick={() => act(() => onApprove(business))}>
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Luluskan
              </Button>
            </>
          )}
          {business.status === 'ACTIVE' && (
            <>
              <Button disabled={acting} variant="outline"
                className="flex-1 rounded-xl border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-black text-xs uppercase bg-transparent"
                onClick={() => act(() => onReject(business))}>
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Tolak / Buang Aktif
              </Button>
              <Button onClick={onClose} variant="ghost" className="flex-1 rounded-xl font-black text-xs hover:bg-white/10 text-white hover:text-white">Tutup</Button>
            </>
          )}
          {business.status === 'REJECTED' && (
            <>
              <Button disabled={acting}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase border-none"
                onClick={() => act(() => onApprove(business))}>
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Aktifkan Semula
              </Button>
              <Button onClick={onClose} variant="ghost" className="flex-1 rounded-xl font-black text-xs hover:bg-white/10 text-white hover:text-white">Tutup</Button>
            </>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export function KeusahawananAdminPanel() {
  const { profile, isSuperAdmin } = useAuth();
  const { color } = useExcoTheme();
  
  const [activeTab, setActiveTab] = useState<'perniagaan' | 'unit'>('perniagaan');
  
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BusinessStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Business | null>(null);

  // Unit admin states
  const [unitAdmins, setUnitAdmins]     = useState<any[]>([]);
  const [searchUser, setSearchUser]     = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch businesses with owner profile info
      const { data: bizData, error: bizErr } = await supabase
        .from('keusahawanan_businesses')
        .select(`
          id,
          name,
          description,
          logo_url,
          status,
          created_at,
          interview_date,
          owner_id,
          profiles:owner_id (
            full_name,
            email,
            matric_no
          )
        `)
        .order('created_at', { ascending: false });

      if (bizErr) throw bizErr;

      // 2. Count staff per business (from student_business_memberships)
      const { data: staffData } = await supabase
        .from('student_business_memberships')
        .select('business_id');

      const staffCount: Record<string, number> = {};
      staffData?.forEach((s: any) => {
        staffCount[s.business_id] = (staffCount[s.business_id] ?? 0) + 1;
      });

      const mapped: Business[] = (bizData ?? []).map((b: any) => ({
        id: b.id,
        name: b.name,
        description: b.description ?? null,
        logo_url: b.logo_url ?? null,
        status: b.status as BusinessStatus,
        created_at: b.created_at,
        interview_date: b.interview_date ?? null,
        owner_id: b.owner_id,
        owner_name:   b.profiles?.full_name  ?? undefined,
        owner_email:  b.profiles?.email      ?? undefined,
        owner_matric: b.profiles?.matric_no  ?? undefined,
        staff_count:  staffCount[b.id] ?? 0,
      }));

      setBusinesses(mapped);
    } catch (e: any) {
      toast.error('Gagal memuatkan data perniagaan: ' + (e.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnitAdmins = useCallback(async () => {
    const { data } = await supabase
      .from('keusahawanan_unit_admins')
      .select('*, user:user_id(id, full_name, avatar_url, matric_no)')
      .order('created_at', { ascending: false });
    setUnitAdmins(data || []);
  }, []);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);
  useEffect(() => { if (isSuperAdmin) fetchUnitAdmins(); }, [isSuperAdmin, fetchUnitAdmins]);

  // ── Unit Admin Actions ───────────────────────────────────────────────────────
  const handleSearchUser = async (q: string) => {
    setSearchUser(q);
    if (q.length < 2) { setSearchResults([]); return; }
    let query = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, matric_no')
      .ilike('full_name', `%${q}%`)
      .limit(6);
    if (unitAdmins.length > 0) {
      query = query.not('id', 'in', `(${unitAdmins.map(a => a.user_id).join(',')})`);
    }
    const { data } = await query;
    setSearchResults(data || []);
  };

  const handleAddUnitAdmin = async (userId: string, userName: string) => {
    const { error } = await supabase
      .from('keusahawanan_unit_admins')
      .insert({ user_id: userId, assigned_by: profile?.id, notes: 'Ditugaskan melalui panel Admin' });
    if (error) { toast.error('Gagal: ' + error.message); return; }
    toast.success(`${userName} ditambah sebagai Unit Keusahawanan!`);
    setSearchUser(''); setSearchResults([]);
    fetchUnitAdmins();
  };

  const handleRemoveUnitAdmin = async (adminId: string, userName: string) => {
    if (!window.confirm(`Buang ${userName} dari Unit Keusahawanan?`)) return;
    await supabase.from('keusahawanan_unit_admins').delete().eq('id', adminId);
    toast.success(`${userName} dibuang.`);
    fetchUnitAdmins();
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleApprove = async (b: Business) => {
    const toastId = toast.loading('Meluluskan perniagaan...');
    try {
      const { error } = await supabase
        .from('keusahawanan_businesses')
        .update({ status: 'ACTIVE' })
        .eq('id', b.id);
      if (error) throw error;

      // Update owner's membership status to ACTIVE
      const { error: memError } = await supabase
        .from('student_business_memberships')
        .update({ status: 'ACTIVE' })
        .eq('business_id', b.id)
        .eq('user_id', b.owner_id);
      if (memError) throw memError;

      // Notify owner
      await supabase.from('notifications').insert({
        user_id: b.owner_id,
        title: '🎉 Perniagaan Anda Diluluskan!',
        message: `Tahniah! Perniagaan "${b.name}" telah diluluskan oleh JPP. Anda kini boleh mengakses sistem POS dan mula beroperasi.`,
        type: 'STATUS_UPDATE',
        module: 'KEUSAHAWANAN',
        link: '/keusahawanan',
        is_read: false,
      });

      // Audit log
      await supabase.from('keusahawanan_logs').insert({
        action_type: 'BUSINESS_APPROVED',
        description: `Perniagaan "${b.name}" telah diluluskan.`,
        business_id: b.id,
        actor_id: profile?.id ?? null,
      });

      toast.success('Perniagaan berjaya diluluskan!', { id: toastId });
      await fetchBusinesses();
    } catch (e: any) {
      toast.error(e.message ?? 'Terdapat ralat.', { id: toastId });
    }
  };

  const handleReject = async (b: Business) => {
    const reason = window.prompt('Nyatakan sebab penolakan (pilihan):') ?? '';
    const toastId = toast.loading('Memproses...');
    try {
      const { error } = await supabase
        .from('keusahawanan_businesses')
        .update({ status: 'REJECTED' })
        .eq('id', b.id);
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: b.owner_id,
        title: '❌ Permohonan Perniagaan Ditolak',
        message: `Perniagaan "${b.name}" telah ditolak${reason ? `. Sebab: ${reason}` : '. Sila hubungi JPP untuk maklumat lanjut.'}`,
        type: 'STATUS_UPDATE',
        module: 'KEUSAHAWANAN',
        link: '/keusahawanan',
        is_read: false,
      });

      await supabase.from('keusahawanan_logs').insert({
        action_type: 'BUSINESS_REJECTED',
        description: `Perniagaan "${b.name}" ditolak${reason ? `. Sebab: ${reason}` : ''}.`,
        business_id: b.id,
        actor_id: profile?.id ?? null,
      });

      toast.success('Permohonan ditolak.', { id: toastId });
      await fetchBusinesses();
    } catch (e: any) {
      toast.error(e.message ?? 'Terdapat ralat.', { id: toastId });
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const pending  = businesses.filter(b => b.status === 'PENDING_INTERVIEW').length;
  const active   = businesses.filter(b => b.status === 'ACTIVE').length;
  const rejected = businesses.filter(b => b.status === 'REJECTED').length;

  const filtered = businesses.filter(b => {
    const matchStatus = filter === 'ALL' || b.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || b.name.toLowerCase().includes(q)
      || (b.owner_name ?? '').toLowerCase().includes(q)
      || (b.owner_matric ?? '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const STATUS_FILTERS: { id: BusinessStatus | 'ALL'; label: string }[] = [
    { id: 'ALL',               label: 'Semua'       },
    { id: 'PENDING_INTERVIEW', label: 'Menunggu'    },
    { id: 'ACTIVE',            label: 'Aktif'       },
    { id: 'REJECTED',          label: 'Ditolak'     },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Tabs */}
      {isSuperAdmin && (
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.05] p-1 rounded-2xl overflow-x-auto">
          <button onClick={() => setActiveTab('perniagaan')}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all"
            style={activeTab === 'perniagaan' ? { background: color, color: '#fff' } : { color: 'rgba(255,255,255,0.4)' }}>
            <LayoutGrid className="w-3.5 h-3.5" /> Senarai Perniagaan
          </button>
          <button onClick={() => setActiveTab('unit')}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all"
            style={activeTab === 'unit' ? { background: color, color: '#fff' } : { color: 'rgba(255,255,255,0.4)' }}>
            <ShieldCheck className="w-3.5 h-3.5" /> Unit Keusahawanan
          </button>
        </div>
      )}

      {activeTab === 'perniagaan' && (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <AnimatePresence>
          {selected && (
            <BusinessDetailModal
              key={selected.id}
              business={selected}
              onClose={() => setSelected(null)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </AnimatePresence>

        {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Building2,   label: 'Jumlah Perniagaan', value: businesses.length, color: '#6366f1' },
          { icon: Clock,       label: 'Menunggu Kelulusan', value: pending,           color: '#f59e0b' },
          { icon: TrendingUp,  label: 'Aktif',              value: active,            color: '#22c55e' },
          { icon: XCircle,     label: 'Ditolak',            value: rejected,          color: '#ef4444' },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="relative bg-white/[0.03] border border-white/[0.05] rounded-[1.5rem] p-5 overflow-hidden hover:bg-white/[0.06] transition-all"
          >
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-[40px] opacity-20 pointer-events-none"
              style={{ background: s.color }} />
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: s.color + '22' }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">{s.label}</p>
            <p className="text-2xl font-black text-white">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Pending alert banner */}
      {pending > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 bg-amber-500/[0.03] border border-amber-500/15 rounded-2xl px-4 py-3">
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm font-black text-amber-400 flex-1">
            {pending} permohonan perniagaan menunggu kelulusan.
          </p>
          <button
            onClick={() => setFilter('PENDING_INTERVIEW')}
            className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-800 transition-colors whitespace-nowrap"
          >
            Semak →
          </button>
        </motion.div>
      )}

      {/* Search + Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          <Input
            placeholder="Cari nama perniagaan, pemilik, no. matric..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-2xl bg-white/[0.03] border-white/10 text-white placeholder:text-white/40 focus:border-white/20 text-sm"
          />
        </div>
        <div className="flex gap-1 bg-white/[0.03] p-1 border border-white/[0.05] rounded-2xl shrink-0">
          {STATUS_FILTERS.map(sf => (
            <button key={sf.id} onClick={() => setFilter(sf.id as any)}
              className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
              style={
                filter === sf.id
                  ? { background: color, color: '#fff' }
                  : { color: 'rgba(255,255,255,0.4)' }
              }>
              {sf.label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchBusinesses}
          className="h-11 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] transition-colors flex items-center gap-2 text-xs font-black text-white/60 shrink-0 border border-white/[0.05]"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Muat Semula
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Store className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-black text-sm">
            {search || filter !== 'ALL' ? 'Tiada padanan ditemui.' : 'Belum ada perniagaan didaftarkan.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b, i) => {
            const sm = STATUS_META[b.status];
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.035 }}
                className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer group"
                onClick={() => setSelected(b)}
              >
                {/* Logo */}
                {b.logo_url ? (
                  <img src={b.logo_url} className="w-11 h-11 rounded-2xl object-cover border border-white/10 shrink-0" alt="" />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-white/30" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-white truncate">{b.name}</p>
                    {b.status === 'PENDING_INTERVIEW' && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-white/40 truncate">
                    {b.owner_name ?? '—'} · {b.owner_matric ?? 'Tiada matric'} · {b.staff_count} staf
                  </p>
                </div>

                {/* Status badge */}
                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${sm.badgeCls}`}>
                  {sm.label}
                </span>

                {/* Arrow indicator */}
                <Eye className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors shrink-0" />
              </motion.div>
            );
          })}
        </div>
      )}
      </motion.div>
      )}

      {activeTab === 'unit' && isSuperAdmin && (
        <motion.div key="unit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header info */}
          <div className="rounded-[2rem] p-5 border border-amber-500/20 bg-amber-500/[0.03] space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-black text-amber-500 uppercase tracking-widest">Unit Keusahawanan — Akses Penuh</p>
            </div>
            <p className="text-xs text-amber-500/70">
              Pengguna yang disenaraikan di sini mendapat akses penuh ke **semua perniagaan** dalam ekosistem e-Keusahawanan 
              tanpa perlu ditetapkan sebagai staf untuk setiap satu perniagaan. 
              Kuasa mereka setaraf dengan Exco Keusahawanan. Sesuai untuk Pegawai / Pemantau Unit Keusahawanan.
            </p>
          </div>

          {/* Search + add */}
          <div className="rounded-[2rem] bg-white/[0.02] border border-white/10 p-6 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
              <UserPlus className="w-3.5 h-3.5" /> Tambah Pegawai Unit Keusahawanan
            </p>
            <div className="relative">
              <input
                value={searchUser}
                onChange={e => handleSearchUser(e.target.value)}
                placeholder="Cari nama pengguna..."
                className="w-full h-11 px-4 rounded-2xl text-sm font-medium outline-none bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 transition-all"
              />
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-2xl bg-[#0f0f13] border border-white/10 shadow-xl overflow-hidden">
                  {searchResults.map(u => (
                     <button key={u.id} onClick={() => handleAddUnitAdmin(u.id, u.full_name)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                        style={{ background: color }}>
                        {u.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{u.full_name}</p>
                        <p className="text-[10px] text-white/50">{u.matric_no || 'Tiada No. Matrik'}</p>
                      </div>
                      <span className="ml-auto text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                        style={{ background: hexToRgba(color, 0.1), color }}>
                        + Tambah
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Current unit admins */}
            <div className="space-y-2 pt-2">
              {unitAdmins.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-6">Tiada pegawai unit keusahawanan ditetapkan.</p>
              ) : unitAdmins.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                    style={{ background: color }}>
                    {a.user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white">{a.user?.full_name}</p>
                    <p className="text-[10px] text-white/50 flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-amber-500" /> Unit Keusahawanan · Akses Penuh
                    </p>
                  </div>
                  <button onClick={() => handleRemoveUnitAdmin(a.id, a.user?.full_name)}
                    className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
