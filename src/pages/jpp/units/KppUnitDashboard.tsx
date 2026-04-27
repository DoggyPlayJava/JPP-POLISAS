/**
 * KppUnitDashboard.tsx
 * Dashboard pengurusan unit KPP dalam JPP HQ Portal.
 * Mengandungi: Ringkasan, Rekod & Laporan, Direktori Kelab, Tetapan.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import {
  Users, Activity, FileText, Building2, CalendarRange,
  Search, CheckCheck, X, RefreshCw,
  AlertTriangle, Flag, BarChart3, BookOpen,
  Loader2, ExternalLink, Settings as SettingsIcon, PartyPopper, QrCode, Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ALL_CLUBS } from '@/types';
import { subDays, startOfMonth } from 'date-fns';
import { cn, hexToRgba } from '@/lib/utils';
import { UNIT_CFG } from '../jppConfig';

// ── Types ────────────────────────────────────────────────────────────────────
interface KppActivity {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  club_id: string;
  created_at: string;
}

interface KppReport {
  id: string;
  title: string;
  type: string;
  status: string;
  club_id: string;
  created_at: string;
  file_name?: string;
}

interface KppMembership {
  id: string;
  user_id: string;
  club_id: string;
  role: string;
  account_status: string;
  created_at: string;
  profiles: { full_name?: string; email?: string; matric_no?: string } | null;
}

interface PendingLeader {
  id: string;
  full_name?: string;
  email?: string;
  matric_no?: string;
  role: string;
  target_club_id?: string;
  source: 'profile' | 'membership' | 'both';
  membership_id?: string;
}

interface InactiveClub {
  id: string;
  name: string;
  shortName?: string;
  color?: string;
  lastActivity: string | null;
  daysSince: number;
}

// ── Status badge colors ───────────────────────────────────────────────────────
const ACTIVITY_STATUS_COLOR: Record<string, string> = {
  aktif: 'bg-emerald-100 text-emerald-700',
  perancangan: 'bg-blue-100 text-blue-700',
  selesai: 'bg-slate-100 text-slate-600',
  ditangguh: 'bg-orange-100 text-orange-700',
};
const REPORT_STATUS_COLOR: Record<string, string> = {
  Menunggu: 'bg-yellow-100 text-yellow-700',
  'Dalam Semakan': 'bg-blue-100 text-blue-700',
  Diluluskan: 'bg-emerald-100 text-emerald-700',
  Ditolak: 'bg-red-100 text-red-700',
};

const KPP_COLOR = UNIT_CFG['KPP']?.color ?? '#F87171';

// ── Sub-tab button ────────────────────────────────────────────────────────────
function SubTabBtn({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0',
        active ? 'text-white shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
      style={active ? { backgroundColor: KPP_COLOR } : {}}
    >{label}</button>
  );
}

// ── Overview stat card ────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: number; icon: any; color: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-[1.5rem] p-5 flex flex-col gap-3 hover:shadow-md transition-all"
    >
      <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: hexToRgba(color, 0.15) }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">{label}</p>
        <p className="text-3xl font-black text-foreground leading-none">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground/40 mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Aktiviti Popout Dialog ────────────────────────────────────────────────────
function AktivitiPopout({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [filter, setFilter] = useState('ALL');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('club_activities')
        .select('*, club_id')
        .eq('is_archived', false)
        .order('start_date', { ascending: false })
        .limit(60);
      if (filter !== 'ALL') q = q.eq('club_id', filter);
      const { data: d } = await q;
      setData(d || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { if (open) fetch(); }, [open, fetch]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-[2.5rem] max-w-3xl border-none shadow-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="bg-indigo-600 p-6 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black tracking-tight">Semakan Aktiviti Kelab</h2>
            <p className="text-indigo-100 text-[10px] uppercase tracking-widest font-bold mt-1">Aktiviti rentas semua kelab & persatuan</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-9 rounded-xl bg-white/20 border-white/20 text-white text-xs font-bold w-40">
                <SelectValue placeholder="Tapis Kelab" />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                <SelectItem value="ALL" className="font-bold">Semua Kelab</SelectItem>
                {ALL_CLUBS.map(c => (
                  <SelectItem key={c.id} value={c.id} className="font-medium">{c.shortName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button onClick={fetch} className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : data.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground text-sm">Tiada aktiviti ditemui.</p>
          ) : (
            data.map(a => {
              const club = ALL_CLUBS.find(c => c.id === a.club_id);
              return (
                <div key={a.id} className="flex items-center gap-4 bg-card border border-border/40 rounded-2xl px-4 py-3 hover:border-indigo-300 transition-all">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: club?.color || '#6366f1' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground">{club?.shortName || '—'} · {a.start_date ? new Date(a.start_date).toLocaleDateString('ms-MY') : 'Tiada tarikh'}</p>
                  </div>
                  <span className={cn('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl flex-shrink-0', ACTIVITY_STATUS_COLOR[a.status] || 'bg-slate-100 text-slate-600')}>{a.status}</span>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function KppUnitDashboard() {
  const { isSuperAdmin, profile } = useAuth();
  const navigate = useNavigate();

  type KppSubTab = 'ringkasan' | 'rekod' | 'kelab' | 'tetapan';
  const [kppSubTab, setKppSubTab] = useState<KppSubTab>('ringkasan');
  const [rekodView, setRekodView] = useState<'aktiviti' | 'laporan'>('aktiviti');
  const [kppClubFilter, setKppClubFilter] = useState('ALL');
  
  const [kppLoading, setKppLoading] = useState(false);

  // States
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({
    allow_auto_pdf: true, allow_add_takwim: true, max_clubs_per_student: 2,
  });
  const [allActivities, setAllActivities] = useState<KppActivity[]>([]);
  const [allReports, setAllReports] = useState<KppReport[]>([]);
  const [allMemberships, setAllMemberships] = useState<KppMembership[]>([]);
  const [inactiveClubs, setInactiveClubs] = useState<InactiveClub[]>([]);
  const [totalActiveClubs, setTotalActiveClubs] = useState(0);
  const [activitiesThisMonth, setActivitiesThisMonth] = useState(0);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);

  // Search
  const [reportSearch, setReportSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [showAktivitiPopout, setShowAktivitiPopout] = useState(false);

  // ── LAZY LOAD FETCHERS ───────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    const { data: settingsData } = await supabase.from('system_settings').select('*');
    if (settingsData) {
      const s = { ...settings };
      settingsData.forEach(item => {
        let val = item.value;
        if (val === 'true') val = true;
        if (val === 'false') val = false;
        if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) { val = val.slice(1, -1); }
        s[item.key] = val;
      });
      setSettings(s);
    }
    setSettingsLoading(false);
  }, []);

  const fetchRingkasanData = useCallback(async () => {
    setKppLoading(true);
    try {
      const monthStart = startOfMonth(new Date()).toISOString();
      const threshold30d = subDays(new Date(), 30).toISOString();

      const [activeClubsRes, monthActRes, memsRes, repsCountRes, recentActsRes] = await Promise.all([
        supabase.from('clubs').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('club_activities').select('id', { count: 'exact', head: true }).gte('created_at', monthStart).eq('is_archived', false),
        supabase.from('student_club_memberships')
          .select('id, user_id, club_id, role, account_status, created_at, profiles(full_name, email, matric_no)')
          .eq('account_status', 'PENDING')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('club_reports').select('id', { count: 'exact', head: true }).eq('is_archived', false).eq('status', 'Menunggu'),
        supabase.from('club_activities').select('club_id').gte('start_date', threshold30d).eq('is_archived', false)
      ]);

      setTotalActiveClubs(activeClubsRes.count ?? 0);
      setActivitiesThisMonth(monthActRes.count ?? 0);
      setAllMemberships((memsRes.data as any) || []);
      setPendingReportsCount(repsCountRes.count ?? 0);

      // Inactive clubs
      const activeClubIds = new Set((recentActsRes.data || []).map((a: any) => a.club_id));
      const inactive: InactiveClub[] = ALL_CLUBS
        .filter(c => !activeClubIds.has(c.id))
        .map(c => ({ id: c.id, name: c.name, shortName: c.shortName, color: c.color, lastActivity: null, daysSince: 30 }));
      setInactiveClubs(inactive);
    } catch (e) {
      console.error(e);
    } finally {
      setKppLoading(false);
    }
  }, []);

  const fetchRekodData = useCallback(async () => {
    setKppLoading(true);
    try {
      const clubEq = kppClubFilter !== 'ALL' ? kppClubFilter : undefined;
      
      if (rekodView === 'aktiviti') {
        let q = supabase.from('club_activities')
            .select('id, title, status, start_date, end_date, club_id, created_at')
            .eq('is_archived', false)
            .order('start_date', { ascending: false })
            .limit(100);
        if (clubEq) q = q.eq('club_id', clubEq);
        const { data } = await q;
        setAllActivities((data || []) as KppActivity[]);
      } else {
        let q = supabase.from('club_reports')
            .select('id, title, type, status, club_id, created_at, file_name')
            .eq('is_archived', false)
            .order('created_at', { ascending: false })
            .limit(100);
        if (clubEq) q = q.eq('club_id', clubEq);
        const { data } = await q;
        setAllReports((data || []) as KppReport[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setKppLoading(false);
    }
  }, [kppClubFilter, rekodView]);

  const fetchKelabData = useCallback(async () => {
    // Already have ALL_CLUBS, but might fetch activity count per club if needed.
    // We can fetch recent acts just to tag inactive ones if they navigate here directly.
    setKppLoading(true);
    const threshold30d = subDays(new Date(), 30).toISOString();
    const { data: recentActs } = await supabase.from('club_activities')
        .select('club_id')
        .gte('start_date', threshold30d)
        .eq('is_archived', false);
    const activeClubIds = new Set((recentActs || []).map((a: any) => a.club_id));
    const inactive: InactiveClub[] = ALL_CLUBS
      .filter(c => !activeClubIds.has(c.id))
      .map(c => ({ id: c.id, name: c.name, shortName: c.shortName, color: c.color, lastActivity: null, daysSince: 30 }));
    setInactiveClubs(inactive);
    setKppLoading(false);
  }, []);

  // UseEffect lazy loading
  useEffect(() => {
    if (kppSubTab === 'ringkasan') fetchRingkasanData();
    else if (kppSubTab === 'rekod') fetchRekodData();
    else if (kppSubTab === 'kelab') fetchKelabData();
    else if (kppSubTab === 'tetapan') fetchSettings();
  }, [kppSubTab, kppClubFilter, rekodView, fetchRingkasanData, fetchRekodData, fetchKelabData, fetchSettings]);


  // ── Actions ────────────────────────────────────────────────────────────────
  const toggleSetting = async (key: string, currentValue: boolean) => {
    const newValue = !currentValue;
    const toastId = toast.loading('Mengemaskini...');
    try {
      const { error } = await supabase.from('system_settings').update({ value: newValue }).eq('key', key);
      if (error) throw error;
      setSettings(s => ({ ...s, [key]: newValue }));
      toast.success('Berjaya dilaras.', { id: toastId });
    } catch (e: any) {
      toast.error(e.message, { id: toastId });
    }
  };

  const updateClubLimit = async (delta: number) => {
    const current = Number(settings.max_clubs_per_student ?? 2);
    const newLimit = Math.max(1, Math.min(10, current + delta));
    if (newLimit === current) return;
    const toastId = toast.loading('Mengemaskini had...');
    try {
      const { data, error } = await supabase.from('system_settings').update({ value: newLimit }).eq('key', 'max_clubs_per_student').select();
      if (error) throw error;
      if (!data || data.length === 0) await supabase.from('system_settings').insert({ key: 'max_clubs_per_student', value: newLimit });
      setSettings(s => ({ ...s, max_clubs_per_student: newLimit }));
      toast.success(`Had keahlian: ${newLimit} kelab`, { id: toastId });
    } catch (e: any) {
      toast.error(e.message || 'Gagal kemaskini had', { id: toastId });
    }
  };

  const handleMembershipAction = async (userId: string, clubId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      if (status === 'REJECTED') {
        await supabase.from('club_logs').insert({
          club_id: clubId, action_type: 'MEMBER_REJECTED', actor_id: profile?.id, actor_name: profile?.full_name,
          description: `Permohonan ditolak oleh unit KPP`, metadata: { target_user_id: userId }
        });
        await supabase.from('student_club_memberships').delete().eq('user_id', userId).eq('club_id', clubId);
        await supabase.from('profiles').update({ account_status: 'APPROVED' }).eq('id', userId);
      } else {
        await supabase.from('student_club_memberships').update({ account_status: status }).eq('user_id', userId).eq('club_id', clubId);
        await supabase.from('profiles').update({ account_status: 'APPROVED' }).eq('id', userId);

        const { data: membershipInfo } = await supabase.from('student_club_memberships')
          .select('role, is_primary').eq('user_id', userId).eq('club_id', clubId).single();
        if (membershipInfo?.is_primary && membershipInfo?.role) {
          await supabase.from('profiles').update({ role: membershipInfo.role }).eq('id', userId);
        }
      }

      const clubName = ALL_CLUBS.find(c => c.id === clubId)?.name || 'Kelab tersebut';
      const notifTitle = status === 'APPROVED' ? 'Permohonan Diluluskan' : 'Permohonan Ditolak';
      const notifMsg = status === 'APPROVED' ? `Tahniah! Permohonan anda untuk menyertai ${clubName} telah diluluskan.` : `Dukacita dimaklumkan permohonan anda untuk menyertai ${clubName} telah ditolak.`;
      await supabase.from('notifications').insert({ user_id: userId, title: notifTitle, message: notifMsg, type: 'SYSTEM', is_read: false });

      toast.success(status === 'APPROVED' ? 'Permohonan diluluskan!' : 'Permohonan ditolak.');
      fetchRingkasanData();
    } catch (e) {
      console.error(e);
      toast.error('Operasi gagal.');
    }
  };

  const pendingMembersCount = allMemberships.length;

  return (
    <div className="space-y-6">
      {/* ── Sub-navigation (Reduced to 4) ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {([
          { id: 'ringkasan', label: 'Ringkasan' },
          { id: 'rekod',     label: 'Rekod & Laporan' },
          { id: 'kelab',     label: 'Direktori Kelab' },
          { id: 'tetapan',   label: 'Tetapan KPP' },
        ] as { id: KppSubTab; label: string }[]).map(t => (
          <SubTabBtn key={t.id} id={t.id} label={t.label} active={kppSubTab === t.id} onClick={() => setKppSubTab(t.id)} />
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          SUB-TAB: RINGKASAN
      ══════════════════════════════════════════════ */}
      {kppSubTab === 'ringkasan' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Kelab Tidak Aktif Alert */}
          {inactiveClubs.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-400/30 rounded-2xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-sm font-black text-orange-700 dark:text-orange-400 flex-1">
                {inactiveClubs.length} kelab tiada aktiviti dalam 30 hari lepas.
              </p>
              <button onClick={() => setKppSubTab('kelab')} className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-800 transition-colors whitespace-nowrap">Semak →</button>
            </motion.div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Kelab Aktif" value={totalActiveClubs} icon={Flag} color="#F87171" />
            <StatCard label="Aktiviti Bulan Ini" value={activitiesThisMonth} icon={Activity} color="#60A5FA" />
            <StatCard label="Laporan Menunggu" value={pendingReportsCount} icon={FileText} color="#F59E0B" />
            <StatCard label="Keahlian Tertunggak" value={pendingMembersCount} icon={Users} color="#A78BFA" />
          </div>

          {/* Pengurusan Karnival JPP - Quick Links */}
          <div className="rounded-[2.5rem] bg-gradient-to-br from-violet-600/10 to-transparent p-6 sm:p-8 border border-violet-500/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-500 text-white rounded-2xl">
                  <PartyPopper className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-foreground">Sistem Karnival JPP</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Panel urusan tiket, gerai, dan keputusan karnival.
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate('/karnival')} variant="outline" className="h-10 rounded-xl border-violet-500/30 text-violet-500 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-xs font-black uppercase">
                Buka Portal Karnival
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Dashboard', path: '/karnival/admin', icon: BarChart3 },
                { label: 'Edisi & Kategori', path: '/karnival/admin/edition', icon: Trophy },
                { label: 'Booth & QR', path: '/karnival/admin/booths', icon: QrCode },
                { label: 'Scoreboard LCD', path: '/karnival/scoreboard', icon: Building2 },
              ].map(link => (
                <button key={link.path} onClick={() => navigate(link.path)} className="flex items-center gap-2 bg-card border border-border/40 p-3 rounded-2xl hover:border-violet-500/30 hover:bg-violet-500/5 transition-all text-left">
                  <link.icon className="w-4 h-4 text-violet-500 shrink-0" />
                  <span className="text-[11px] font-black text-foreground truncate">{link.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Kelulusan Keahlian (Merged into Ringkasan) */}
          <div className="rounded-[2rem] border border-border/50 bg-card p-6">
            <div className="flex items-center justify-between mb-6">
               <div>
                  <h3 className="font-black text-lg text-foreground">Tindakan Menunggu (Keahlian)</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">Sahkan kemasukan pendaftaran kelab baru.</p>
               </div>
               <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/30 text-orange-600 flex items-center justify-center font-black text-lg border border-orange-500/20">
                  {pendingMembersCount}
               </div>
            </div>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
              <input
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Cari nama pengguna..."
                className="w-full bg-background border border-border/50 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/30 outline-none"
              />
            </div>

            {kppLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
            ) : allMemberships.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">✅ Tiada pendaftaran baru.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {allMemberships
                  .filter(m => !memberSearch || m.profiles?.full_name?.toLowerCase().includes(memberSearch.toLowerCase()))
                  .map(m => {
                    const p = m.profiles;
                    const club = ALL_CLUBS.find(c => c.id === m.club_id);
                    return (
                      <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-background border border-border/40 rounded-2xl px-4 py-3 hover:border-orange-300 transition-all">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-sm flex-shrink-0">
                            {p?.full_name?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{p?.full_name || m.user_id}</p>
                            <p className="text-[11px] text-muted-foreground">{p?.matric_no || p?.email} · {club?.shortName || '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30">
                          <span className="text-[10px] font-black uppercase bg-orange-100 text-orange-700 px-2.5 py-1 rounded-xl flex-shrink-0">{m.role}</span>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleMembershipAction(m.user_id, m.club_id, 'APPROVED')} className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-colors">
                              <CheckCheck className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleMembershipAction(m.user_id, m.club_id, 'REJECTED')} className="flex items-center justify-center h-8 w-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          SUB-TAB: REKOD & LAPORAN
      ══════════════════════════════════════════════ */}
      {kppSubTab === 'rekod' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-card border border-border/50 rounded-2xl p-4">
             {/* Toggle */}
             <div className="flex items-center bg-background rounded-xl p-1 border border-border/40">
                <button onClick={() => setRekodView('aktiviti')} className={cn('px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all', rekodView === 'aktiviti' ? 'bg-indigo-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted')}>Aktiviti</button>
                <button onClick={() => setRekodView('laporan')} className={cn('px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all', rekodView === 'laporan' ? 'bg-violet-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted')}>Laporan</button>
             </div>

             {/* Filter Kelab */}
             <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black text-muted-foreground hidden sm:block">Tapis:</span>
                <Select value={kppClubFilter} onValueChange={setKppClubFilter}>
                  <SelectTrigger className="w-[180px] h-10 rounded-xl bg-background border-border/50 text-xs font-bold">
                    <SelectValue placeholder="Semua Kelab" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-60">
                    <SelectItem value="ALL" className="font-bold">Semua Kelab</SelectItem>
                    {ALL_CLUBS.map(c => (
                      <SelectItem key={c.id} value={c.id} className="font-medium">{c.shortName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
          </div>

          {/* VIEW: AKTIVITI */}
          {rekodView === 'aktiviti' && (
             <div className="space-y-4">
                {kppLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                ) : allActivities.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">Tiada rekod aktiviti.</div>
                ) : (
                  <div className="space-y-2">
                    {allActivities.map(a => {
                      const club = ALL_CLUBS.find(c => c.id === a.club_id);
                      return (
                        <div key={a.id} className="flex items-center gap-4 bg-card border border-border/40 rounded-2xl px-4 py-3 hover:border-indigo-300 transition-all">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: club?.color || '#6366f1' }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{a.title}</p>
                            <p className="text-[11px] text-muted-foreground">{club?.shortName || '—'} · {a.start_date ? new Date(a.start_date).toLocaleDateString('ms-MY') : 'Tiada tarikh'}</p>
                          </div>
                          <span className={cn('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl flex-shrink-0', ACTIVITY_STATUS_COLOR[a.status] || 'bg-slate-100 text-slate-600')}>{a.status}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
             </div>
          )}

          {/* VIEW: LAPORAN */}
          {rekodView === 'laporan' && (
             <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
                  <input
                    value={reportSearch}
                    onChange={e => setReportSearch(e.target.value)}
                    placeholder="Cari tajuk laporan..."
                    className="w-full bg-card border border-border/50 rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none"
                  />
                </div>
                {kppLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>
                ) : (
                  <div className="space-y-2">
                    {allReports.filter(r => !reportSearch || r.title?.toLowerCase().includes(reportSearch.toLowerCase())).map(r => {
                        const club = ALL_CLUBS.find(c => c.id === r.club_id);
                        return (
                          <div key={r.id} className="flex items-center gap-4 bg-card border border-border/40 rounded-2xl px-4 py-3 hover:border-violet-300 transition-all">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: club?.color || '#7c3aed' }} />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{r.title}</p>
                              <p className="text-[11px] text-muted-foreground">{club?.shortName || '—'} · {r.type} · {new Date(r.created_at).toLocaleDateString('ms-MY')}</p>
                            </div>
                            <span className={cn('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl flex-shrink-0', REPORT_STATUS_COLOR[r.status] || 'bg-slate-100 text-slate-600')}>{r.status}</span>
                          </div>
                        );
                      })}
                  </div>
                )}

                <button onClick={() => navigate('/semakan-laporan')} className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border border-violet-400/30 bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 transition-all group mt-6">
                  <span className="text-xs font-black text-violet-700 dark:text-violet-400">Buka Halaman Semakan Laporan Penuh</span>
                  <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
                </button>
             </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          SUB-TAB: SENARAI KELAB
      ══════════════════════════════════════════════ */}
      {kppSubTab === 'kelab' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-[2rem] bg-gradient-to-br from-teal-600 to-cyan-700 p-7 text-white relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-200 mb-1">Direktori</p>
              <h2 className="text-2xl font-black">Senarai Kelab & Persatuan</h2>
              <p className="text-teal-100/70 text-xs mt-1">{ALL_CLUBS.length} kelab berdaftar dalam sistem</p>
            </div>
            <Building2 className="absolute bottom-4 right-8 w-20 h-20 text-white/10" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ALL_CLUBS.map(c => {
              const isInactive = inactiveClubs.some(ic => ic.id === c.id);
              return (
                <div key={c.id} className={cn(
                  'bg-card border rounded-2xl p-4 hover:shadow-sm transition-all',
                  isInactive ? 'border-orange-300/50 bg-orange-50/30 dark:bg-orange-950/10' : 'border-border/40 hover:border-teal-300'
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0" style={{ backgroundColor: c.color || '#0d9488' }}>
                      {c.shortName?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{c.shortName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-lg border border-teal-500/20">{c.category}</span>
                    {isInactive && (
                      <span className="text-[9px] font-black bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-lg border border-orange-500/20 ml-auto">Tidak Aktif</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          SUB-TAB: TETAPAN KPP
      ══════════════════════════════════════════════ */}
      {kppSubTab === 'tetapan' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ background: hexToRgba(KPP_COLOR, 0.1), borderColor: hexToRgba(KPP_COLOR, 0.2), color: KPP_COLOR }}>
                  <SettingsIcon className="w-6 h-6" />
              </div>
              <div>
                  <h1 className="text-xl font-black text-foreground leading-tight">Tetapan KPP & Kelab</h1>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Konfigurasi Pengurusan Kelab & rekod</p>
              </div>
          </div>

          {settingsLoading ? (
             <div className="flex items-center justify-center py-16">
               <Loader2 className="w-8 h-8 animate-spin" style={{ color: KPP_COLOR }} />
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Laporan Auto PDF */}
                <div className="p-6 rounded-[2rem] bg-card border border-border/50 flex flex-col justify-between group hover:border-violet-500/30 transition-all">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center border border-violet-500/20">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-foreground">Laporan Auto-PDF</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Benarkan jana PDF</p>
                        </div>
                    </div>
                    <button onClick={() => toggleSetting('allow_auto_pdf', settings.allow_auto_pdf)}
                        className={cn('rounded-full font-black text-[10px] self-end w-14 h-8 transition-all shadow-md',
                            settings.allow_auto_pdf ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400')}>
                        {settings.allow_auto_pdf ? 'ON' : 'OFF'}
                    </button>
                </div>

                {/* Tambah Takwim */}
                <div className="p-6 rounded-[2rem] bg-card border border-border/50 flex flex-col justify-between group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                            <CalendarRange className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-foreground">Tambah Takwim</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Kebenaran daftar program aktiviti</p>
                        </div>
                    </div>
                    <button onClick={() => toggleSetting('allow_add_takwim', settings.allow_add_takwim)}
                        className={cn('rounded-full font-black text-[10px] self-end w-14 h-8 transition-all shadow-md',
                            settings.allow_add_takwim ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400')}>
                        {settings.allow_add_takwim ? 'ON' : 'OFF'}
                    </button>
                </div>

                {/* Had Keahlian */}
                <div className="p-6 rounded-[2rem] bg-card border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-6 md:col-span-2 group hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center gap-4 text-center sm:text-left w-full sm:w-auto flex-col sm:flex-row">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-base font-black text-foreground">Had Keahlian Kelab</p>
                            <p className="text-xs text-muted-foreground font-medium">Maksimum pendaftaran kelab untuk pelajar biasa.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-muted/50 p-2 rounded-2xl border border-border/50">
                        <button onClick={() => updateClubLimit(-1)} disabled={Number(settings.max_clubs_per_student) <= 1}
                            className="h-10 w-10 flex items-center justify-center rounded-xl font-black text-lg bg-background hover:bg-muted-foreground/10 disabled:opacity-30 transition-colors">
                            −
                        </button>
                        <span className="font-black text-3xl text-foreground w-10 text-center tabular-nums">
                            {settings.max_clubs_per_student ?? 2}
                        </span>
                        <button onClick={() => updateClubLimit(1)} disabled={Number(settings.max_clubs_per_student) >= 10}
                            className="h-10 w-10 flex items-center justify-center rounded-xl font-black text-lg bg-background hover:bg-muted-foreground/10 disabled:opacity-30 transition-colors">
                            +
                        </button>
                    </div>
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
