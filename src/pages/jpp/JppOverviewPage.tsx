import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Users, Flag, BarChart3, FileText, Loader2,
  Store, ShoppingBag, Heart, Trophy, Shield, CalendarDays, BellRing,
  ClipboardList, CheckCircle2, XCircle, User
} from 'lucide-react';
import { hexToRgba, cn } from '@/lib/utils';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Smartphone, Monitor, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';


// ── Types ─────────────────────────────────────────────────────────────────────
interface SystemStats {
  totalJpp: number;
  totalClubs: number;
  activeClubs: number;
  totalActivities: number;
  totalReports: number;
  totalStudents: number;
  totalBusinesses: number;
  totalProducts: number;
  totalTickets: number;
  totalSports: number;
  pushSubscribers: number;
}

// ── Stat block ────────────────────────────────────────────────────────────────
function BigStatCard({
  label, value, icon: Icon, color, sub, delay, onClick
}: {
  label: string; value: number | string; icon: React.ElementType;
  color: string; sub?: string; delay: number; onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] p-5 transition-all ${
        onClick ? 'cursor-pointer hover:bg-white/[0.08] hover:scale-[1.02] active:scale-[0.98]' : 'hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: hexToRgba(color, 0.15) }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
          Sistem
        </span>
      </div>
      <p className="text-3xl font-black text-white leading-none">{value}</p>
      <p className="text-xs font-black uppercase tracking-widest text-white/35 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-white/20 mt-1">{sub}</p>}
    </motion.div>
  );
}

// ── Push Subscribers Modal ──────────────────────────────────────────────────────
function PushSubscribersModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { isSuperAdmin } = useAuth();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubs = async () => {
    setLoading(true);
    // Step 1: Fetch all push subscriptions
    const { data: rawSubs } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, device_hint, created_at')
      .order('created_at', { ascending: false });

    if (!rawSubs?.length) { setSubs([]); setLoading(false); return; }

    // Step 2: Fetch profiles for all unique user_ids (FK points to auth.users, not profiles, so join won't work)
    const uniqueUserIds = [...new Set(rawSubs.map(s => s.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, matric_no, role')
      .in('id', uniqueUserIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Step 3: Merge
    const merged = rawSubs.map(s => ({
      ...s,
      profiles: profileMap.get(s.user_id) || null,
    }));
    setSubs(merged);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchSubs();
  }, [isOpen]);

  const handleRevoke = async (subId: string) => {
    if (!window.confirm("Adakah anda pasti untuk batalkan langganan peranti ini?")) return;
    try {
      const { error } = await supabase.from('push_subscriptions').delete().eq('id', subId);
      if (error) throw error;
      toast.success("Langganan berjaya dibuang.");
      fetchSubs();
    } catch (e: any) {
      toast.error(e.message || "Gagal membuang langganan.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl max-h-[85vh] bg-[#0a0a0f] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white leading-tight">Senarai Langganan Notifikasi</h2>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{subs.length} peranti aktif</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-white/20" />
            </div>
          ) : subs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/30 text-sm">Tiada langganan buat masa ini.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subs.map((s) => {
                const p = s.profiles;
                const isMobile = s.device_hint?.toLowerCase().includes('ios') || s.device_hint?.toLowerCase().includes('android');
                const DeviceIcon = isMobile ? Smartphone : Monitor;
                
                return (
                  <div key={s.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 hover:bg-white/[0.08] transition-colors">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center relative">
                      <DeviceIcon className="w-5 h-5 text-white/50" />
                      {s.device_hint && (
                        <div className="absolute -bottom-1 text-[8px] font-black px-1.5 py-0.5 rounded-md bg-[#0a0a0f] border border-white/20 text-white uppercase truncate max-w-[40px]">
                          {s.device_hint}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p?.full_name || 'Pengguna Tidak Diketahui'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-white/40">{p?.matric_no}</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[10px] text-emerald-400 font-bold">{p?.role}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-white/30">Dilanggan pada</p>
                        <p className="text-xs text-white/60 font-medium">
                          {new Date(s.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      {isSuperAdmin && (
                        <button 
                          onClick={() => handleRevoke(s.id)}
                          className="w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 flex items-center justify-center transition-colors border border-rose-500/20"
                          title="Buang langganan ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ProfileEditRequestsSection — Panel semakan pindaan profil pelajar
// ═════════════════════════════════════════════════════════════════════════════
function ProfileEditRequestsSection({ themeColor }: { themeColor: string }) {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [reviewModal, setReviewModal] = useState<{ open: boolean; req: any | null; action: 'APPROVED' | 'REJECTED' | null }>({
    open: false, req: null, action: null
  });
  const [reviewNote, setReviewNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile_edit_requests')
        .select('*, requester:profiles!profile_edit_requests_user_id_fkey(full_name, matric_no, department, email), reviewer:profiles!profile_edit_requests_reviewed_by_fkey(full_name)')
        .order('submitted_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      toast.error('Gagal muatkan permintaan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const filtered = requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  const openModal = (req: any, action: 'APPROVED' | 'REJECTED') => {
    setReviewNote('');
    setReviewModal({ open: true, req, action });
  };

  const handleReview = async () => {
    if (!reviewModal.req || !reviewModal.action || !user || !profile) return;
    if (reviewModal.action === 'REJECTED' && !reviewNote.trim()) {
      toast.error('Sila masukkan sebab penolakan.');
      return;
    }
    setProcessing(true);
    const { req, action } = reviewModal;
    try {
      const { error: updateErr } = await supabase
        .from('profile_edit_requests')
        .update({ status: action, reviewed_by: user.id, review_note: reviewNote.trim() || null })
        .eq('id', req.id);
      if (updateErr) throw updateErr;

      if (action === 'APPROVED') {
        const profileUpdate: Record<string, any> = {};
        if (req.field_type === 'matric_no') profileUpdate.matric_no = req.requested_value;
        else if (req.field_type === 'semester') profileUpdate.semester_override = parseInt(req.requested_value, 10);
        const { error: profileErr } = await supabase.from('profiles').update(profileUpdate).eq('id', req.user_id);
        if (profileErr) throw profileErr;
      }

      const fieldLabel = req.field_type === 'matric_no' ? 'No. Matrik' : 'Semester';
      const isApproved = action === 'APPROVED';
      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: req.user_id,
        title: isApproved ? `✅ Permintaan Pindaan ${fieldLabel} Diluluskan` : `❌ Permintaan Pindaan ${fieldLabel} Ditolak`,
        message: isApproved
          ? `Permintaan anda untuk menukar ${fieldLabel} kepada "${req.requested_value}" telah diluluskan oleh MT JPP${reviewNote.trim() ? `. Nota: ${reviewNote.trim()}` : '.'}`
          : `Permintaan anda untuk menukar ${fieldLabel} kepada "${req.requested_value}" telah ditolak. Sebab: ${reviewNote.trim()}`,
        type: 'SYSTEM',
        module: 'EKPP',
        link: '/settings',
        actor_name: profile.full_name,
        is_read: false,
      });
      if (notifErr) console.warn('Notifikasi student gagal:', notifErr.message);

      toast.success(`Permintaan berjaya ${isApproved ? 'diluluskan' : 'ditolak'}. Audit log direkodkan.`);
      setReviewModal({ open: false, req: null, action: null });
      setReviewNote('');
      await fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa memproses.');
    } finally {
      setProcessing(false);
    }
  };

  const filterTabs: Array<{ key: 'PENDING' | 'APPROVED' | 'REJECTED'; label: string }> = [
    { key: 'PENDING', label: 'Menunggu' },
    { key: 'APPROVED', label: 'Diluluskan' },
    { key: 'REJECTED', label: 'Ditolak' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: hexToRgba(themeColor, 0.15), border: `1px solid ${hexToRgba(themeColor, 0.25)}` }}>
          <ClipboardList className="w-5 h-5" style={{ color: themeColor }} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white leading-tight">Semakan Pindaan Profil</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Kelulusan pindaan no. matrik &amp; semester pelajar</p>
        </div>
        {pendingCount > 0 && (
          <span className="ml-auto px-3 py-1.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/20">{pendingCount} PENDING</span>
        )}
      </div>

      <div className="rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] overflow-hidden">
        <div className="flex border-b border-white/[0.06]">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all',
                filter === tab.key ? 'text-white border-b-2' : 'text-white/30 hover:text-white/60'
              )}
              style={filter === tab.key ? { borderBottomColor: themeColor, color: themeColor } : {}}
            >
              {tab.label}
              {tab.key === 'PENDING' && pendingCount > 0 && <span className="ml-1.5 bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-white/30 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuatkan...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-white/10" />
              <p className="text-white/30 text-xs font-medium">Tiada rekod {filter === 'PENDING' ? 'menunggu semakan' : filter === 'APPROVED' ? 'yang telah diluluskan' : 'yang ditolak'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(req => (
                <div key={req.id} className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: hexToRgba(themeColor, 0.15) }}>
                        <User className="w-3.5 h-3.5" style={{ color: themeColor }} />
                      </div>
                      <p className="text-sm font-black text-white truncate">{req.requester?.full_name ?? '—'}</p>
                      {req.requester?.matric_no && <span className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded-lg">{req.requester.matric_no}</span>}
                    </div>
                    <div className="ml-9">
                      <p className="text-xs text-white/60 font-medium">
                        <span className="text-white/30">Pindaan:</span>{' '}
                        <span className="font-bold text-white/80">{req.field_type === 'matric_no' ? 'No. Matrik' : 'Semester'}</span>
                        {' — '}
                        <span className="line-through text-white/30 font-mono text-[11px]">{req.current_value ?? '—'}</span>
                        {' → '}
                        <span className="font-black text-white font-mono">{req.requested_value}</span>
                      </p>
                      {req.reason && <p className="text-[11px] text-white/40 mt-1">Sebab: {req.reason}</p>}
                      {req.review_note && <p className="text-[11px] text-amber-400/80 mt-1">Nota JPP: {req.review_note}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/25">
                        <span>Dihantar: {new Date(req.submitted_at).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {req.reviewed_at && <span>· Disemak: {new Date(req.reviewed_at).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                        {req.reviewer?.full_name && <span>· oleh {req.reviewer.full_name}</span>}
                      </div>
                    </div>
                  </div>

                  {req.status === 'PENDING' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => openModal(req, 'REJECTED')} className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                        <XCircle className="w-3.5 h-3.5 inline mr-1" />Tolak
                      </button>
                      <button onClick={() => openModal(req, 'APPROVED')} className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Lulus
                      </button>
                    </div>
                  )}
                  {req.status !== 'PENDING' && (
                    <div className="shrink-0">
                      {req.status === 'APPROVED'
                        ? <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" />DILULUSKAN</span>
                        : <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black bg-red-500/15 text-red-400 border border-red-500/20"><XCircle className="w-3 h-3" />DITOLAK</span>
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {reviewModal.open && reviewModal.req && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => !processing && setReviewModal({ open: false, req: null, action: null })}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-[2rem] p-6 border border-white/10 bg-[#0f0f1a] z-10"
            >
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${reviewModal.action === 'APPROVED' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    {reviewModal.action === 'APPROVED' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                  </div>
                  <div>
                    <p className="font-black text-white text-sm">{reviewModal.action === 'APPROVED' ? 'Luluskan' : 'Tolak'} Permintaan Pindaan</p>
                    <p className="text-[11px] text-white/40">
                      {reviewModal.req.field_type === 'matric_no' ? 'No. Matrik' : 'Semester'}:{' '}
                      <span className="font-mono text-white/60 line-through">{reviewModal.req.current_value}</span>
                      {' → '}<span className="font-mono text-white font-black">{reviewModal.req.requested_value}</span>
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">Pelajar: {reviewModal.req.requester?.full_name}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-white/40">
                    {reviewModal.action === 'REJECTED' ? 'Sebab Penolakan *' : 'Nota Ulasan (Pilihan)'}
                  </label>
                  <textarea
                    value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3}
                    placeholder={reviewModal.action === 'REJECTED' ? 'Nyatakan sebab penolakan...' : 'Nota tambahan (jika ada)...'}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 font-medium resize-none focus:outline-none focus:border-white/20"
                  />
                  <p className="text-[10px] text-white/25">⚙ Nota ini akan direkodkan dalam Audit Log dan dihantar kepada pelajar.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setReviewModal({ open: false, req: null, action: null })} disabled={processing}
                    className="flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-wider border border-white/10 text-white/40 hover:bg-white/5 transition-all">
                    Batal
                  </button>
                  <button onClick={handleReview} disabled={processing || (reviewModal.action === 'REJECTED' && !reviewNote.trim())}
                    className={cn('flex-1 h-11 rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-40',
                      reviewModal.action === 'APPROVED' ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-red-600 hover:bg-red-500 text-white')}>
                    {processing ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Memproses...</> : reviewModal.action === 'APPROVED' ? 'Sahkan Kelulusan' : 'Sahkan Penolakan'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function JppOverviewPage() {
  const { isSuperAdmin, isJppMember } = useAuth();

  const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
  const [stats, setStats]           = useState<SystemStats | null>(null);
  const [loading, setLoading]       = useState(true);
  const [showSubsModal, setShowSubsModal] = useState(false);

  // Chart states
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('30d');
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>([]);
  const [ticketStats, setTicketStats] = useState<{ name: string; value: number; color: string }[]>([]);

  // Fetch theme color
  useEffect(() => {
    supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
      .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
  }, []);

  // Fetch system stats — simple one-time fetch on mount
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const [
        jppRes, studRes, allClubRes, actClubRes, actRes, repRes,
        bizRes, prodRes, tickRes, sportRes, ticketStatusRes, pushSubsRes
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'JPP'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('clubs').select('id', { count: 'exact', head: true }),
        supabase.from('clubs').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('club_activities').select('id', { count: 'exact', head: true }),
        supabase.from('club_reports').select('id', { count: 'exact', head: true }),
        supabase.from('keusahawanan_businesses').select('id', { count: 'exact', head: true }),
        supabase.from('business_products').select('id', { count: 'exact', head: true }),
        supabase.from('kebajikan_tickets').select('id', { count: 'exact', head: true }),
        supabase.from('supsas_sports').select('id', { count: 'exact', head: true }),
        supabase.from('kebajikan_tickets').select('status'),
        supabase.from('push_subscriptions').select('user_id'),
      ]);

      // Count total push subscriptions (per device, matches modal count)
      const totalPushSubs = (pushSubsRes.data || []).length;

      setStats({
        totalJpp:        jppRes.count ?? 0,
        totalStudents:   studRes.count ?? 0,
        totalClubs:      allClubRes.count ?? 0,
        activeClubs:     actClubRes.count ?? 0,
        totalActivities: actRes.count ?? 0,
        totalReports:    repRes.count ?? 0,
        totalBusinesses: bizRes.count ?? 0,
        totalProducts:   prodRes.count ?? 0,
        totalTickets:    tickRes.count ?? 0,
        totalSports:     sportRes.count ?? 0,
        pushSubscribers: totalPushSubs,
      });

      if (ticketStatusRes.data) {
        let open = 0, resolved = 0;
        ticketStatusRes.data.forEach(t => {
          if (t.status === 'RESOLVED' || t.status === 'CLOSED') resolved++;
          else if (t.status !== 'CANCELLED') open++;
        });
        setTicketStats([
          { name: 'Terbuka', value: open, color: '#EF4444' },
          { name: 'Selesai', value: resolved, color: '#10B981' },
        ]);
      }

      setLoading(false);
    };

    fetchStats();
  }, []);

  // Fetch chart data from RPC (server-side grouping, Malaysia timezone)
  useEffect(() => {
    const days = timeRange === '7d' ? 7 : 30;

    // Build empty date slots for the selected range
    const buildEmptySlots = () => {
      const slots: { date: string; count: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        // Format as "Mon DD" matching what the RPC returns (e.g. "May 04")
        slots.push({
          date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'Asia/Kuala_Lumpur' }),
          count: 0,
        });
      }
      return slots;
    };

    supabase.rpc('get_registration_trend', { days_back: days })
      .then(({ data }) => {
        const slots = buildEmptySlots();
        if (data) {
          const map = new Map((data as { reg_date: string; reg_count: number }[]).map(r => [r.reg_date, Number(r.reg_count)]));
          slots.forEach(s => {
            if (map.has(s.date)) s.count = map.get(s.date)!;
          });
        }
        setChartData(slots);
      });
  }, [timeRange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-3 shadow-xl backdrop-blur-md">
          <p className="text-white/60 text-xs font-bold mb-1">{label}</p>
          <p className="text-white font-black text-lg">
            {payload[0].value} <span className="text-xs font-medium text-white/50">pelajar</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-[10%] right-[10%] w-[40vw] h-[40vw] rounded-full blur-3xl opacity-5"
          style={{ background: themeColor }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 space-y-10">

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
              <BarChart3 className="w-5 h-5" style={{ color: themeColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">Gambaran Sistem</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                Data keseluruhan portal JPP
              </p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-white/20" />
          </div>
        ) : (
          <>
            {/* ── Main Stats Grid ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BigStatCard 
                label="Push Subscribers" 
                value={stats?.pushSubscribers ?? 0}  
                icon={BellRing}  
                color={themeColor} 
                delay={0.05} 
                sub={`daripada ${stats?.totalStudents ?? 0} pelajar`}
                onClick={() => setShowSubsModal(true)} 
              />
              <BigStatCard label="Pelajar Berdaftar" value={stats?.totalStudents ?? 0}   icon={Users}     color="#60A5FA"    delay={0.10} />
              <BigStatCard label="Jumlah Kelab"      value={stats?.totalClubs ?? 0}      icon={Flag}      color="#4ADE80" delay={0.15} />
              <BigStatCard label="Bisnes"            value={stats?.totalBusinesses ?? 0} icon={Store}     color="#F59E0B"    delay={0.20} />
              <BigStatCard label="Produk PolyMart"   value={stats?.totalProducts ?? 0}   icon={ShoppingBag} color="#EC4899" delay={0.25} />
              <BigStatCard label="Aduan Kebajikan"   value={stats?.totalTickets ?? 0}    icon={Heart}     color="#EF4444"    delay={0.30} />
              <BigStatCard label="Acara Sukan"       value={stats?.totalSports ?? 0}     icon={Trophy}    color="#EAB308"    delay={0.35} />
              <BigStatCard label="Laporan"           value={stats?.totalReports ?? 0}    icon={FileText}  color="#A78BFA"    delay={0.40} />
            </div>

            {/* ── Charts Grid ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Registration Trend Area Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="lg:col-span-2 rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] p-6 flex flex-col"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white/40 mb-1">
                      Trend Pendaftaran Pelajar
                    </h2>
                    <p className="text-2xl font-black text-white">
                      {stats?.totalStudents ?? 0} <span className="text-xs text-white/30 font-medium">jumlah pelajar</span>
                    </p>
                    <p className="text-[11px] text-white/25 font-medium mt-0.5">
                      {chartData.reduce((acc, curr) => acc + curr.count, 0)} baru mendaftar dalam {timeRange === '7d' ? '7' : '30'} hari
                    </p>
                  </div>
                  <div className="flex items-center bg-white/5 rounded-xl p-1 shrink-0">
                    <button
                      onClick={() => setTimeRange('7d')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                        timeRange === '7d' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                      }`}
                    >
                      7 Hari
                    </button>
                    <button
                      onClick={() => setTimeRange('30d')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                        timeRange === '30d' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                      }`}
                    >
                      30 Hari
                    </button>
                  </div>
                </div>

                <div className="h-64 w-full mt-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={themeColor} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={themeColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                        minTickGap={20}
                      />
                      <YAxis 
                        hide 
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke={themeColor} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorCount)" 
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Kebajikan Tickets Pie Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-[1.75rem] border border-white/[0.06] bg-white/[0.03] p-6 flex flex-col"
              >
                <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white/40 mb-2">
                  Status Tiket Kebajikan
                </h2>
                
                <div className="flex-1 min-h-[200px] w-full flex items-center justify-center relative mt-4">
                  {ticketStats.every(t => t.value === 0) ? (
                    <div className="text-center">
                      <Heart className="w-8 h-8 text-white/10 mx-auto mb-2" />
                      <p className="text-xs text-white/30 font-medium">Tiada tiket kebajikan</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ticketStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                          animationDuration={1500}
                        >
                          {ticketStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0a0a0f', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontWeight: 800 }}
                          itemStyle={{ color: 'white' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  {/* Center Text for Donut */}
                  {!ticketStats.every(t => t.value === 0) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black text-white leading-none">
                        {stats?.totalTickets ?? 0}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest font-black text-white/30 mt-1">
                        Tiket
                      </span>
                    </div>
                  )}
                </div>

                {/* Custom Legend */}
                {!ticketStats.every(t => t.value === 0) && (
                  <div className="flex justify-center gap-6 mt-6">
                    {ticketStats.map(stat => (
                      <div key={stat.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                        <span className="text-xs font-black text-white/50">{stat.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
            
          </>
        )}
      </div>

      {/* ── Semakan Pindaan Profil Pelajar — semua JPP */}
      {isJppMember && !loading && (
        <div className="relative z-10 max-w-5xl mx-auto px-6 pb-10">
          <ProfileEditRequestsSection themeColor={themeColor} />
        </div>
      )}

      <PushSubscribersModal isOpen={showSubsModal} onClose={() => setShowSubsModal(false)} />
    </div>
  );
}
