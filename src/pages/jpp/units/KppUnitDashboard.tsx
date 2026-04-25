/**
 * KppUnitDashboard.tsx
 * Dashboard pengurusan unit KPP dalam JPP HQ Portal.
 * Mengandungi: Overview, Aktiviti, Laporan, Keahlian, Senarai Kelab.
 * Diextract dari JppAdminPage.tsx dan dibina sebagai komponen berdikari.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import {
  Users, Activity, FileText, Building2, CalendarRange,
  Search, CheckCheck, X, ChevronRight, RefreshCw,
  AlertTriangle, Flag, BarChart3, Clock, BookOpen,
  Loader2, ExternalLink, Settings as SettingsIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ALL_CLUBS } from '@/types';
import { format, subDays, startOfMonth } from 'date-fns';
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

// ── KPP theme color ──────────────────────────────────────────────────────────
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
            <Select value={filter} onValueChange={(v) => { setFilter(v); }}>
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

  type KppSubTab = 'overview' | 'aktiviti' | 'laporan' | 'keahlian' | 'kelab' | 'tetapan';
  const [kppSubTab, setKppSubTab] = useState<KppSubTab>('overview');
  const [kppClubFilter, setKppClubFilter] = useState('ALL');
  const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | 'kepimpinan' | 'ahli'>('all');
  const [kppLoading, setKppLoading] = useState(false);

  // Settings states
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({
    allow_auto_pdf: true,
    allow_add_takwim: true,
    max_clubs_per_student: 2,
  });

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

  // Action Handler
  const handleMembershipAction = async (userId: string, clubId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      if (status === 'REJECTED') {
        // Tulis log keselamatan
        await supabase.from('club_logs').insert({
          club_id: clubId,
          action_type: 'MEMBER_REJECTED',
          actor_id: profile?.id,
          actor_name: profile?.full_name,
          description: `Permohonan ditolak oleh unit KPP`,
          metadata: { target_user_id: userId }
        });
        
        // Padam keahlian terus jika dibuang atau direject permohonan baru
        const { error: delErr } = await supabase.from('student_club_memberships')
          .delete()
          .eq('user_id', userId)
          .eq('club_id', clubId);
        if (delErr) throw delErr;

        // Buka semula akaun sebagai ahli biasa jika direject
        await supabase.from('profiles').update({ account_status: 'APPROVED' }).eq('id', userId);
      } else {
        // Luluskan
        const { error: updErr } = await supabase.from('student_club_memberships')
          .update({ account_status: status })
          .eq('user_id', userId)
          .eq('club_id', clubId);
        if (updErr) throw updErr;
          
        // Buka pintu untuk pengguna
        await supabase.from('profiles').update({ account_status: 'APPROVED' }).eq('id', userId);

        // Sync profiles.role jika kelab ini adalah primary club user
        const { data: membershipInfo } = await supabase
          .from('student_club_memberships')
          .select('role, is_primary')
          .eq('user_id', userId)
          .eq('club_id', clubId)
          .single();
        
        if (membershipInfo?.is_primary && membershipInfo?.role) {
          await supabase.from('profiles')
            .update({ role: membershipInfo.role })
            .eq('id', userId);
        }
      }

      // Hantar Notifikasi kepada Pengguna Sendiri
      const clubName = ALL_CLUBS.find(c => c.id === clubId)?.name || 'Kelab tersebut';
      const notifTitle = status === 'APPROVED' ? 'Permohonan Diluluskan' : 'Permohonan Ditolak';
      const notifMsg = status === 'APPROVED' 
          ? `Tahniah! Permohonan anda untuk menyertai ${clubName} telah diluluskan.`
          : `Dukacita dimaklumkan permohonan anda untuk menyertai ${clubName} telah ditolak.`;

      await supabase.from('notifications').insert({
          user_id: userId,
          title: notifTitle,
          message: notifMsg,
          type: 'SYSTEM',
          is_read: false
      });

      toast.success(status === 'APPROVED' ? 'Permohonan diluluskan!' : 'Permohonan ditolak.');
      fetchKppData();
      fetchOverviewData();
    } catch (e) {
      console.error(e);
      toast.error('Operasi gagal.');
    }
  };

  // Data states
  const [allActivities, setAllActivities] = useState<KppActivity[]>([]);
  const [allReports, setAllReports] = useState<KppReport[]>([]);
  const [allMemberships, setAllMemberships] = useState<KppMembership[]>([]);
  const [pendingLeaders, setPendingLeaders] = useState<PendingLeader[]>([]);
  const [inactiveClubs, setInactiveClubs] = useState<InactiveClub[]>([]);

  // Overview extra stats
  const [totalActiveClubs, setTotalActiveClubs] = useState(0);
  const [activitiesThisMonth, setActivitiesThisMonth] = useState(0);

  // Search
  const [reportSearch, setReportSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  // Dialog
  const [showAktivitiPopout, setShowAktivitiPopout] = useState(false);

  // ── Fetch KPP data (aktiviti, laporan, keahlian) ─────────────────────────
  const fetchKppData = useCallback(async () => {
    setKppLoading(true);
    try {
      const clubEq = kppClubFilter !== 'ALL' ? kppClubFilter : undefined;
      const [acts, reps, mems] = await Promise.all([
        (() => {
          let q = supabase.from('club_activities')
            .select('id, title, status, start_date, end_date, club_id, created_at')
            .eq('is_archived', false)
            .order('start_date', { ascending: false })
            .limit(100);
          if (clubEq) q = q.eq('club_id', clubEq);
          return q;
        })(),
        (() => {
          let q = supabase.from('club_reports')
            .select('id, title, type, status, club_id, created_at, file_name')
            .eq('is_archived', false)
            .order('created_at', { ascending: false })
            .limit(100);
          if (clubEq) q = q.eq('club_id', clubEq);
          return q;
        })(),
        (() => {
          let q = supabase.from('student_club_memberships')
            .select('id, user_id, club_id, role, account_status, created_at, profiles(full_name, email, matric_no)')
            .eq('account_status', 'PENDING')
            .order('created_at', { ascending: false })
            .limit(100);
          if (clubEq) q = q.eq('club_id', clubEq);
          return q;
        })(),
      ]);
      setAllActivities((acts.data || []) as KppActivity[]);
      setAllReports((reps.data || []) as KppReport[]);
      setAllMemberships((mems.data as any) || []);
    } catch (e) {
      console.error('KPP fetch error:', e);
    } finally {
      setKppLoading(false);
    }
  }, [kppClubFilter]);

  // ── Fetch overview extras: pending leaders, inactive clubs, stats ─────────
  const fetchOverviewData = useCallback(async () => {
    try {
      const monthStart = startOfMonth(new Date()).toISOString();
      const threshold30d = subDays(new Date(), 30).toISOString();

      const [pendingProfilesRes, pendingMembershipsRes, activeClubsRes, monthActRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, matric_no, role')
          .eq('account_status', 'PENDING')
          .in('role', ['CLUB_PRESIDENT', 'CLUB_ADVISOR', 'PRESIDEN', 'PENASIHAT']),
        supabase.from('student_club_memberships').select('id, user_id, club_id, role, profiles(full_name, email, matric_no)')
          .eq('account_status', 'PENDING')
          .in('role', ['CLUB_PRESIDENT', 'CLUB_ADVISOR', 'PRESIDEN', 'PENASIHAT']),
        supabase.from('clubs').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('club_activities').select('id', { count: 'exact', head: true })
          .gte('created_at', monthStart).eq('is_archived', false),
      ]);

      // Merge pending leaders (sama macam JppAdminPage)
      const combined: PendingLeader[] = [...(pendingProfilesRes.data || []).map((p: any) => ({ ...p, source: 'profile' as const }))];
      (pendingMembershipsRes.data || []).forEach((m: any) => {
        const existing = combined.find(c => c.id === m.user_id);
        if (existing) {
          existing.source = 'both';
          existing.membership_id = m.id;
          existing.target_club_id = m.club_id;
        } else if (m.profiles) {
          combined.push({
            ...m.profiles,
            id: m.user_id,
            role: m.role,
            source: 'membership',
            membership_id: m.id,
            target_club_id: m.club_id,
          });
        }
      });
      setPendingLeaders(combined);
      setTotalActiveClubs(activeClubsRes.count ?? 0);
      setActivitiesThisMonth(monthActRes.count ?? 0);

      // Inactive clubs: kelab yang tiada aktiviti > 30 hari
      const { data: recentActs } = await supabase.from('club_activities')
        .select('club_id')
        .gte('start_date', threshold30d)
        .eq('is_archived', false);
      const activeClubIds = new Set((recentActs || []).map((a: any) => a.club_id));
      const inactive: InactiveClub[] = ALL_CLUBS
        .filter(c => !activeClubIds.has(c.id))
        .map(c => ({ id: c.id, name: c.name, shortName: c.shortName, color: c.color, lastActivity: null, daysSince: 30 }));
      setInactiveClubs(inactive);
    } catch (e) {
      console.error('KPP overview fetch error:', e);
    }
  }, []);

  useEffect(() => { fetchKppData(); }, [fetchKppData]);
  useEffect(() => { fetchOverviewData(); }, [fetchOverviewData]);
  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Derived stats for quick display in overview
  const pendingMembersCount = allMemberships.length;
  const pendingReportsCount = allReports.filter(r => r.status === 'Menunggu').length;
  const pendingLeadershipCount = allMemberships.filter(m => ['CLUB_PRESIDENT', 'CLUB_ADVISOR', 'PRESIDEN', 'PENASIHAT'].includes(m.role)).length;
  const pendingAhliCount = allMemberships.length - pendingLeadershipCount;

  return (
    <div className="space-y-6">
      {/* ── Sub-navigation ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'aktiviti', label: 'Semua Aktiviti' },
          { id: 'laporan', label: 'Semua Laporan' },
          { id: 'keahlian', label: 'Keahlian Menunggu' },
          { id: 'kelab', label: 'Senarai Kelab' },
          { id: 'tetapan', label: 'Tetapan KPP' },
        ] as { id: KppSubTab; label: string }[]).map(t => (
          <SubTabBtn key={t.id} id={t.id} label={t.label} active={kppSubTab === t.id} onClick={() => setKppSubTab(t.id)} />
        ))}
      </div>

      {/* ── Club filter (Aktiviti, Laporan, Keahlian only) ── */}
      {['aktiviti', 'laporan', 'keahlian'].includes(kppSubTab) && (
        <div className="flex flex-wrap items-center gap-3 bg-card border border-border/50 rounded-2xl px-4 py-3">
          <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Tapis Kelab:</span>
          <div className="flex flex-wrap gap-2 flex-1">
            <button
              onClick={() => setKppClubFilter('ALL')}
              className={cn('px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
                kppClubFilter === 'ALL' ? 'text-white shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
              style={kppClubFilter === 'ALL' ? { backgroundColor: KPP_COLOR } : {}}
            >Semua Kelab</button>
            {ALL_CLUBS.slice(0, 12).map(c => (
              <button key={c.id}
                onClick={() => setKppClubFilter(c.id)}
                className={cn('px-3 py-1.5 rounded-xl text-[11px] font-black transition-all',
                  kppClubFilter === c.id ? 'text-white shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
                style={kppClubFilter === c.id ? { backgroundColor: c.color || KPP_COLOR } : {}}
              >{c.shortName}</button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          SUB-TAB: OVERVIEW
      ══════════════════════════════════════════════ */}
      {kppSubTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Alert: Kelab Tidak Aktif */}
          {inactiveClubs.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-400/30 rounded-2xl px-4 py-3"
            >
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-sm font-black text-orange-700 dark:text-orange-400 flex-1">
                {inactiveClubs.length} kelab tiada aktiviti dalam 30 hari lepas.
              </p>
              <button
                onClick={() => setKppSubTab('kelab')}
                className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-800 transition-colors whitespace-nowrap"
              >
                Semak →
              </button>
            </motion.div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Kelab Aktif" value={totalActiveClubs} icon={Flag} color="#F87171" />
            <StatCard label="Aktiviti Bulan Ini" value={activitiesThisMonth} icon={Activity} color="#60A5FA" />
            <StatCard label="Laporan Menunggu" value={pendingReportsCount} icon={FileText} color="#F59E0B" />
            <StatCard label="Keahlian Tertunggak" value={pendingMembersCount} icon={Users} color="#A78BFA" />
          </div>

          {/* Pending Leaders card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border/50 rounded-[2rem] p-6">
               <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg bg-orange-500">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Akaun Tertunggak: Kepimpinan</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-3xl font-black text-foreground">
                  {pendingLeadershipCount}
                </span>
                <Button size="sm" onClick={() => { setKppSubTab('keahlian'); setMemberRoleFilter('kepimpinan'); }} className="rounded-xl px-4 text-[10px] uppercase font-black">
                  Urus Kepimpinan
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border/50 rounded-[2rem] p-6">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg bg-blue-500">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Akaun Tertunggak: Ahli Biasa</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-3xl font-black text-foreground">
                  {pendingAhliCount}
                </span>
                <Button size="sm" onClick={() => { setKppSubTab('keahlian'); setMemberRoleFilter('ahli'); }}
                  className="rounded-xl px-4 text-[10px] uppercase font-black bg-blue-500 hover:bg-blue-600">
                  Urus Ahli Biasa
                </Button>
              </div>
            </div>
          </div>

          {/* CTA: Semakan Aktiviti Popout */}
          <div className="rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 to-transparent p-8 border border-indigo-500/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500 text-white rounded-2xl">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-foreground">Semakan Pantas Aktiviti Kelab</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Pantau aktiviti yang dianjurkan oleh setiap kelab secara terus.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowAktivitiPopout(true)}
                className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs"
              >
                Papar Aktiviti
              </Button>
            </div>
          </div>

          {/* Quick link to e-KPP */}
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border border-border/40 bg-card/60 hover:bg-card hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-muted-foreground/40" />
              <span className="text-xs font-black text-muted-foreground/60 group-hover:text-foreground transition-colors">Buka Modul Pengurusan Kelab</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          SUB-TAB: AKTIVITI
      ══════════════════════════════════════════════ */}
      {kppSubTab === 'aktiviti' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-blue-700 p-7 text-white relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-1">Pemantauan Rentas-Kelab</p>
              <h2 className="text-2xl font-black">Semua Aktiviti Kelab</h2>
              <p className="text-indigo-100/70 text-xs mt-1">
                {allActivities.length} aktiviti {kppClubFilter !== 'ALL' ? `— ${ALL_CLUBS.find(c => c.id === kppClubFilter)?.name || ''}` : '— semua kelab'}
              </p>
            </div>
            <CalendarRange className="absolute bottom-4 right-8 w-20 h-20 text-white/10" />
          </div>
          {kppLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : allActivities.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Tiada aktiviti ditemui.</div>
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

      {/* ══════════════════════════════════════════════
          SUB-TAB: LAPORAN
      ══════════════════════════════════════════════ */}
      {kppSubTab === 'laporan' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-[2rem] bg-gradient-to-br from-violet-600 to-purple-700 p-7 text-white relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-200 mb-1">Semakan Laporan</p>
              <h2 className="text-2xl font-black">Semua Laporan Kelab</h2>
              <p className="text-violet-100/70 text-xs mt-1">{allReports.length} laporan</p>
            </div>
            <FileText className="absolute bottom-4 right-8 w-20 h-20 text-white/10" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
            <input
              value={reportSearch}
              onChange={e => setReportSearch(e.target.value)}
              placeholder="Cari laporan..."
              className="w-full bg-card border border-border/50 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/30 outline-none"
            />
          </div>
          {kppLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : (
            <div className="space-y-2">
              {allReports
                .filter(r => !reportSearch || r.title?.toLowerCase().includes(reportSearch.toLowerCase()))
                .map(r => {
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
              {allReports.filter(r => !reportSearch || r.title?.toLowerCase().includes(reportSearch.toLowerCase())).length === 0 && (
                <div className="text-center py-16 text-muted-foreground text-sm">Tiada laporan ditemui.</div>
              )}
            </div>
          )}
          {/* Semak Laporan CTA */}
          <button
            onClick={() => navigate('/semakan-laporan')}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border border-violet-400/30 bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-950/30 transition-all group"
          >
            <span className="text-xs font-black text-violet-700 dark:text-violet-400">Buka Halaman Semakan Laporan Penuh</span>
            <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          SUB-TAB: KEAHLIAN
      ══════════════════════════════════════════════ */}
      {kppSubTab === 'keahlian' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-[2rem] bg-gradient-to-br from-orange-500 to-amber-600 p-7 text-white relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-100 mb-1">Permohonan Keahlian</p>
              <h2 className="text-2xl font-black">Keahlian Menunggu Kelulusan</h2>
              <p className="text-orange-100/70 text-xs mt-1">{allMemberships.length} permohonan tertunggak</p>
            </div>
            <Users className="absolute bottom-4 right-8 w-20 h-20 text-white/10" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
            <input
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              placeholder="Cari nama / matrik..."
              className="w-full bg-card border border-border/50 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/30 outline-none"
            />
          </div>

          <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
            <button onClick={() => setMemberRoleFilter('all')} className={cn('px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap', memberRoleFilter === 'all' ? 'bg-orange-500 text-white shadow-md' : 'bg-card border border-border/50 text-muted-foreground hover:bg-muted/80')}>Semua</button>
            <button onClick={() => setMemberRoleFilter('kepimpinan')} className={cn('px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap', memberRoleFilter === 'kepimpinan' ? 'bg-orange-500 text-white shadow-md' : 'bg-card border border-border/50 text-muted-foreground hover:bg-muted/80')}>Kepimpinan</button>
            <button onClick={() => setMemberRoleFilter('ahli')} className={cn('px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap', memberRoleFilter === 'ahli' ? 'bg-orange-500 text-white shadow-md' : 'bg-card border border-border/50 text-muted-foreground hover:bg-muted/80')}>Ahli Biasa</button>
          </div>

          {kppLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : allMemberships.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">✅ Tiada permohonan tertunggak.</div>
          ) : (
            <div className="space-y-2">
              {allMemberships
                .filter(m => {
                  const p = m.profiles;
                  const isLeadership = ['CLUB_PRESIDENT', 'CLUB_ADVISOR', 'PRESIDEN', 'PENASIHAT'].includes(m.role);
                  if (memberRoleFilter === 'kepimpinan' && !isLeadership) return false;
                  if (memberRoleFilter === 'ahli' && isLeadership) return false;
                  if (!memberSearch) return true;
                  return p?.full_name?.toLowerCase().includes(memberSearch.toLowerCase())
                    || p?.matric_no?.toLowerCase().includes(memberSearch.toLowerCase());
                })
                .map(m => {
                  const p = m.profiles;
                  const club = ALL_CLUBS.find(c => c.id === m.club_id);
                  return (
                    <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-card border border-border/40 rounded-2xl px-4 py-3 hover:border-orange-300 transition-all">
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

          {/* Inactive clubs alert */}
          {inactiveClubs.length > 0 && (
            <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-400/30 rounded-2xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-orange-700 dark:text-orange-400">
                  Kelab berikut tiada aktiviti dalam 30 hari:
                </p>
                <p className="text-[11px] text-orange-600/70 mt-1">
                  {inactiveClubs.slice(0, 5).map(c => c.shortName || c.name).join(', ')}
                  {inactiveClubs.length > 5 && ` dan ${inactiveClubs.length - 5} lagi`}
                </p>
              </div>
            </div>
          )}

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
                    <span className="text-[10px] font-black bg-teal-50 text-teal-700 px-2 py-0.5 rounded-lg">{c.category}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {allActivities.filter(a => a.club_id === c.id).length} aktiviti
                    </span>
                    {isInactive && (
                      <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg">Tidak Aktif</span>
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
                  <h1 className="text-xl font-black text-white leading-tight">Tetapan KPP & Kelab</h1>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">Konfigurasi Pengurusan Kelab & rekod</p>
              </div>
          </div>

          {settingsLoading ? (
             <div className="flex items-center justify-center py-16">
               <Loader2 className="w-8 h-8 animate-spin" style={{ color: KPP_COLOR }} />
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Laporan Auto PDF */}
                <div className="p-6 rounded-[2rem] bg-card border border-border/50 flex flex-col justify-between group hover:border-white/20 transition-all">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-white">Laporan Auto-PDF</p>
                            <p className="text-[10px] text-white/50 font-medium uppercase tracking-tight">Benarkan jana PDF</p>
                        </div>
                    </div>
                    <button onClick={() => toggleSetting('allow_auto_pdf', settings.allow_auto_pdf)}
                        className={cn('rounded-full font-black text-[10px] self-end w-14 h-8 transition-all shadow-md',
                            settings.allow_auto_pdf ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400')}>
                        {settings.allow_auto_pdf ? 'ON' : 'OFF'}
                    </button>
                </div>

                {/* Tambah Takwim */}
                <div className="p-6 rounded-[2rem] bg-card border border-border/50 flex flex-col justify-between group hover:border-white/20 transition-all">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                            <CalendarRange className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-white">Tambah Takwim</p>
                            <p className="text-[10px] text-white/50 font-medium uppercase tracking-tight">Kebenaran daftar program aktiviti</p>
                        </div>
                    </div>
                    <button onClick={() => toggleSetting('allow_add_takwim', settings.allow_add_takwim)}
                        className={cn('rounded-full font-black text-[10px] self-end w-14 h-8 transition-all shadow-md',
                            settings.allow_add_takwim ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400')}>
                        {settings.allow_add_takwim ? 'ON' : 'OFF'}
                    </button>
                </div>

                {/* Had Keahlian */}
                <div className="p-6 rounded-[2rem] bg-card border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-6 md:col-span-2 group hover:border-white/20 transition-all">
                    <div className="flex items-center gap-4 text-center sm:text-left w-full sm:w-auto flex-col sm:flex-row">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-base font-black text-white">Had Keahlian Kelab</p>
                            <p className="text-xs text-white/50 font-medium">Maksimum pendaftaran kelab untuk pelajar biasa.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/5">
                        <button onClick={() => updateClubLimit(-1)} disabled={Number(settings.max_clubs_per_student) <= 1}
                            className="h-10 w-10 flex items-center justify-center rounded-xl font-black text-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors">
                            −
                        </button>
                        <span className="font-black text-3xl text-white w-10 text-center tabular-nums">
                            {settings.max_clubs_per_student ?? 2}
                        </span>
                        <button onClick={() => updateClubLimit(1)} disabled={Number(settings.max_clubs_per_student) >= 10}
                            className="h-10 w-10 flex items-center justify-center rounded-xl font-black text-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors">
                            +
                        </button>
                    </div>
                </div>
            </div>
          )}
        </div>
      )}

      {/* Aktiviti Popout Dialog */}
      <AktivitiPopout open={showAktivitiPopout} onClose={() => setShowAktivitiPopout(false)} />
    </div>
  );
}
