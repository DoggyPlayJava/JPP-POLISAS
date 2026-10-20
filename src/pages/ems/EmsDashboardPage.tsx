import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Edit3, QrCode, Key, Trophy, Scan, Award, ShieldCheck, Calendar, MapPin,
  User, RefreshCw, AlertCircle, HelpCircle, CheckCircle2, Gift, UserPlus, MoreVertical,
  Flame, Search, X, ArrowLeft
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import { ms } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { EmsLuckyDrawModal } from '@/components/ems/EmsLuckyDrawModal';
import { EmsQrCodeModal } from '@/components/ems/modals/EmsQrCodeModal';
import { EmsJuryCodeModal } from '@/components/ems/modals/EmsJuryCodeModal';
import { EmsTieBreakerModal } from '@/components/ems/modals/EmsTieBreakerModal';
import { EmsManualRegModal } from '@/components/ems/modals/EmsManualRegModal';
import { EmsEventCertsModal } from '@/components/ems/modals/EmsEventCertsModal';
import { EmsCompleteConfirmModal } from '@/components/ems/modals/EmsCompleteConfirmModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  fetchEmsEvents,
  generateEmsCertificates,
  completeEmsEvent,
} from '@/lib/ems';
import { supabase } from '@/lib/supabase';
import { provisionEmsSiswapreneurBusiness } from '@/lib/keusahawanan';
import type { EmsEvent } from '@/types';

export function EmsDashboardPage() {
  const { t } = useTranslation(['ems', 'common']);
  const navigate = useNavigate();
  const {
    isSuperAdmin,
    isJppMember,
    isPresident,
    isMT: isClubMt,
    isAdvisor: isClubAdvisor,
    profile,
    user,
  } = useAuth();

  const isStaff = profile?.role === 'STAFF' || profile?.role === 'PENSYARAH';
  const canCreateEvent = isSuperAdmin || isJppMember || isPresident || isClubMt || isClubAdvisor || isStaff;

  const [events, setEvents] = useState<(EmsEvent & { creator?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('APPROVED');
  const [syncingBizId, setSyncingBizId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [qrModalEvent, setQrModalEvent] = useState<EmsEvent | null>(null);
  const [juryModalEvent, setJuryModalEvent] = useState<EmsEvent | null>(null);
  const [tieModalEvent, setTieModalEvent] = useState<EmsEvent | null>(null);
  const [manualRegModalEvent, setManualRegModalEvent] = useState<EmsEvent | null>(null);
  const [certModalEvent, setCertModalEvent] = useState<EmsEvent | null>(null);
  const [confirmCompleteEvent, setConfirmCompleteEvent] = useState<EmsEvent | null>(null);

  // Lucky Draw Modal State
  const [luckyDrawModalOpen, setLuckyDrawModalOpen] = useState(false);
  const [selectedLuckyDrawEvent, setSelectedLuckyDrawEvent] = useState<EmsEvent | null>(null);

  // Cert generation & Completion loading state per event
  const [generatingCertId, setGeneratingCertId] = useState<string | null>(null);
  const [completingCertId, setCompletingCertId] = useState<string | null>(null);

  // Resolve user id daripada matric/email (guna session admin - boleh nampak semua profile)
  const resolveProfileId = async (
    matrixNo?: string | null,
    email?: string | null
  ): Promise<string | null> => {
    if (matrixNo && matrixNo.trim()) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('matric_no', matrixNo.trim())
        .maybeSingle();
      if (data?.id) return data.id;
    }
    if (email && email.trim()) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email.trim().toLowerCase())
        .maybeSingle();
      if (data?.id) return data.id;
    }
    return null;
  };

  // Sync semua peserta EMS event ke e-Keusahawanan (create business + membership yang hilang)
  const handleSyncEmsBusiness = async (event: EmsEvent) => {
    setSyncingBizId(event.id);
    try {
      const { data: participants, error: pErr } = await supabase
        .from('ems_participants')
        .select('id, event_id, participant_type, team_name, leader_name, matrix_no, email, members_list')
        .eq('event_id', event.id);
      if (pErr) throw pErr;

      const { data: businesses, error: bErr } = await supabase
        .from('keusahawanan_businesses')
        .select('id, name')
        .eq('ems_event_id', event.id)
        .eq('is_ems_siswapreneur', true);
      if (bErr) throw bErr;

      const byName = new Map<string, { id: string }>();
      (businesses || []).forEach((b: any) => {
        const key = (b.name || '').trim().toLowerCase();
        if (key) byName.set(key, b);
      });

      let created = 0;
      let membershipsFixed = 0;

      for (const p of participants || []) {
        const bizName = (p.team_name || '').trim();
        const key = bizName.toLowerCase();
        const existing = key ? byName.get(key) : null;

        if (!existing) {
          const res = await provisionEmsSiswapreneurBusiness({
            eventId: event.id,
            teamName: bizName || undefined,
            leaderName: p.leader_name || '',
            leaderEmail: p.email || undefined,
            leaderMatrixNo: p.participant_type === 'STUDENT' ? p.matrix_no || undefined : undefined,
            members: p.members_list || [],
          });
          if (res.success && res.businessId) {
            created++;
            byName.set(key, { id: res.businessId });
          }
          continue;
        }

        const { data: mems } = await supabase
          .from('student_business_memberships')
          .select('user_id')
          .eq('business_id', existing.id);
        const have = new Set((mems || []).map((m: any) => m.user_id));

        const want = new Set<string>();
        const leaderId = await resolveProfileId(
          p.participant_type === 'STUDENT' ? p.matrix_no : null,
          p.email
        );
        if (leaderId) want.add(leaderId);
        for (const m of p.members_list || []) {
          const mid = await resolveProfileId(m?.matrix_no_or_ic, m?.email);
          if (mid) want.add(mid);
        }

        const toAdd = Array.from(want).filter((uid) => !have.has(uid));
        if (toAdd.length > 0) {
          const { error: mErr } = await supabase
            .from('student_business_memberships')
            .insert(
              toAdd.map((uid) => ({
                business_id: existing.id,
                user_id: uid,
                role: 'OWNER' as const,
                status: 'ACTIVE' as const,
              }))
            );
          if (!mErr) membershipsFixed += toAdd.length;
        }
      }

      toast.success(
        t('ems:sync_keusahawanan_done', 'Sync siap: {{created}} perniagaan baharu, {{memberships}} keahlian ditambah.', {
          created,
          memberships: membershipsFixed,
        }),
        { duration: 6000 }
      );
    } catch (err: any) {
      console.error('Sync EMS business error:', err);
      toast.error(err?.message || t('ems:sync_keusahawanan_failed', 'Gagal sync e-Keusahawanan.'));
    } finally {
      setSyncingBizId(null);
    }
  };

  const handleGenerateCertificates = async (eventId: string) => {
    try {
      setGeneratingCertId(eventId);
      const certs = await generateEmsCertificates(eventId);
      toast.success(t('ems:generate_certs_success', 'Berjaya menjana {{count}} e-sijil secara automatik!', { count: certs.length }));
    } catch (err: any) {
      toast.error(err?.message || t('ems:generate_certs_failed', 'Gagal menjana e-sijil.'));
    } finally {
      setGeneratingCertId(null);
    }
  };

  const handleCompleteEvent = async (eventId: string) => {
    try {
      setCompletingCertId(eventId);
      await completeEmsEvent(eventId);
      toast.success(t('ems:complete_event_success', 'Acara ditanda SELESAI & e-sijil berjaya dijana!'));
      loadEvents();
    } catch (err: any) {
      toast.error(err?.message || t('ems:complete_event_failed', 'Gagal menandakan acara selesai.'));
    } finally {
      setCompletingCertId(null);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchEmsEvents();
      setEvents(data);
    } catch (err: any) {
      console.error('[EMS] Error loading events:', err);
      toast.error(t('ems:failed_load_event_err', 'Gagal memuatkan acara: {{error}}', { error: err?.message || t('ems:unknown_error', 'Ralat tidak diketahui') }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const displayedEvents = events.filter((e) => {
    const isOwner = user?.id && e.created_by === user.id;
    const isManagerOrCreator = canCreateEvent || isOwner;

    // Status Tab check
    let matchesTab = false;
    if (isManagerOrCreator) {
      if (activeTab === 'ALL') matchesTab = true;
      else if (activeTab === 'APPROVED') matchesTab = e.status === 'APPROVED' || e.status === 'ACTIVE';
      else matchesTab = e.status === activeTab;
    } else {
      if (activeTab === 'COMPLETED') matchesTab = e.status === 'COMPLETED';
      else matchesTab = e.status === 'APPROVED' || e.status === 'ACTIVE';
    }

    if (!matchesTab) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = e.title?.toLowerCase().includes(q);
      const matchLoc = e.location?.toLowerCase().includes(q);
      const matchCat = e.category?.toLowerCase().includes(q);
      const matchCreator = e.creator?.full_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchCat && !matchCreator) return false;
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">{t('ems:status_draft', 'Draf')}</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 animate-pulse">{t('ems:status_pending_approval', 'Menunggu Kelulusan')}</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">{t('ems:status_approved', 'Diluluskan')}</span>;
      case 'ACTIVE':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">{t('ems:status_in_progress', 'Sedang Berlangsung')}</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">{t('ems:status_completed', 'Selesai')}</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">{t('ems:status_rejected', 'Ditolak')}</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 pb-28 md:pb-8 space-y-6 transition-colors">
      {/* Wayfinding Breadcrumb back to Portal */}
      <div>
        <button
          onClick={() => navigate('/portal')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('ems:back_to_campus_portal', 'Kembali ke Portal Kampus')}</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('event_hub')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('module_subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCreateEvent && (
            <button
              onClick={() => {
                setSelectedLuckyDrawEvent(null);
                setLuckyDrawModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-semibold transition-all shadow-xs active:scale-[0.98] text-xs"
            >
              <Gift className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Cabutan Bertuah</span>
            </button>
          )}
          {canCreateEvent && (
            <button
              onClick={() => navigate('/ems/event/new')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 font-bold transition-all shadow-sm active:scale-[0.98] text-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('ems:create_new_event', 'Cipta Acara Baharu')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Super Admin Approval Access Banner */}
      {isSuperAdmin && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{t('ems:hq_event_approval_review', 'Semakan Kelulusan Acara HQ')}</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">Super Admin</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('ems:hq_event_approval_desc', 'Akses pentadbir mutlak untuk meneliti permohonan dan meluluskan borang acara baharu.')}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/ems/approvals')}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 font-bold text-xs transition-all shadow-xs shrink-0 active:scale-[0.98]"
          >
            {t('ems:hq_approval_review_btn', 'Semakan Kelulusan HQ')}
          </button>
        </div>
      )}

      {/* Search Bar & Instant Filtering */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder={t('ems:search_event_placeholder', 'Cari acara mengikut nama acara, lokasi atau penganjur...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t('ems:clear_search', 'Kosongkan Carian')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Tabs & Schedule Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {(canCreateEvent
            ? [
                { key: 'APPROVED', label: t('ems:tab_approved_active', 'Diluluskan / Aktif') },
                { key: 'PENDING_APPROVAL', label: t('ems:tab_pending_approval', 'Pending Kelulusan') },
                { key: 'DRAFT', label: t('ems:status_draft', 'Draf') },
                { key: 'COMPLETED', label: t('ems:status_completed', 'Selesai') },
              ]
            : [
                { key: 'ALL', label: t('ems:tab_ongoing_upcoming', 'Acara Berlangsung & Akan Datang'), icon: Flame },
                { key: 'COMPLETED', label: t('ems:tab_completed_results', 'Acara Selesai & Keputusan'), icon: Trophy },
              ]
          ).map((tab) => {
            const Icon = 'icon' in tab ? tab.icon : null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border inline-flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 inline mr-1" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0 px-1 py-1">
          <Calendar className="w-3.5 h-3.5 text-amber-500" />
          <span>{t('event_schedule')}</span>
        </div>
      </div>

      {/* Event Cards Grid / Skeleton Loaders */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4 animate-pulse"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
                </div>
                <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-4 w-1/3 bg-amber-500/20 rounded-md" />
                <div className="space-y-1.5 pt-1">
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/60 rounded" />
                  <div className="h-3 w-4/5 bg-slate-100 dark:bg-slate-800/60 rounded" />
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="h-3.5 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3.5 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex gap-2">
                <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            {searchQuery ? t('ems:no_matching_search', 'Tiada Carian Sepadan') : t('ems:no_events_found', 'Tiada Acara Dijumpai')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6">
            {searchQuery
              ? t('ems:no_events_match_search', 'Tiada acara yang sepadan dengan carian "{{query}}". Sila cuba kata kunci lain.', { query: searchQuery })
              : t('ems:no_events_for_status', 'Belum ada acara yang didaftarkan untuk status ini. Sila cipta acara baharu untuk memulakan pengurusan pertandingan.')}
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all shadow-sm"
            >
              {t('ems:clear_search', 'Kosongkan Carian')}
            </button>
          ) : (
            canCreateEvent && (
              <button
                onClick={() => navigate('/ems/event/new')}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 font-bold text-xs transition-all shadow-sm active:scale-[0.98]"
              >
                {t('ems:btn_create_new_event', '+ Cipta Acara Baharu')}
              </button>
            )
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 dark:hover:border-slate-700 rounded-3xl p-6 flex flex-col h-full transition-all shadow-sm hover:shadow-md text-slate-900 dark:text-white"
            >
              <div className="flex-1 flex flex-col">
                {/* Status & Mode */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {getStatusBadge(event.status)}
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {event.event_mode === 'TEAM' ? 'Pasukan / Booth' : 'Individu'}
                  </span>
                </div>

                {/* Title & Category */}
                <h2 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2 mb-1 [text-wrap:balance]">{event.title}</h2>
                {event.category && (
                  <span className="inline-block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-3">
                    {event.category}
                  </span>
                )}

                {/* Description */}
                {event.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {event.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-auto mb-4">
                  {event.event_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{t('event_schedule')}:</span>
                      <span>{(() => {
                        try {
                          const d = new Date(event.event_date);
                          return isValid(d) ? format(d, 'd MMM yyyy, h:mm a', { locale: ms }) : event.event_date;
                        } catch {
                          return event.event_date;
                        }
                      })()}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.creator?.full_name && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                      <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>Anjuran: {event.creator.full_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-auto">
                {(canCreateEvent || (!!user?.id && event.created_by === user.id)) ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {/* Primary Action Button: Leaderboard & Management */}
                      <button
                        onClick={() => navigate(`/ems/leaderboard/${event.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 font-bold text-xs transition-all shadow-xs active:scale-[0.98]"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-400 dark:text-slate-950" />
                        <span>{t('ems:manage_event_and_scores', 'Urus Acara & Skor')}</span>
                      </button>

                      {/* Quick Action: QR Pendaftaran */}
                      <button
                        onClick={() => setQrModalEvent(event)}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 transition-all active:scale-[0.98] shrink-0"
                        title={t('ems:registration_qr_and_link', 'Pautan & QR Pendaftaran')}
                      >
                        <QrCode className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </button>

                      {/* Dropdown Menu for secondary management actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 transition-all active:scale-[0.98] shrink-0"
                            title={t('ems:event_management_options', 'Pilihan Pengurusan Acara')}
                          >
                            <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-50">
                          {(isSuperAdmin || isJppMember || (user?.id && event.created_by === user.id)) && (
                            <DropdownMenuItem
                              onClick={() => navigate(`/ems/event/${event.id}/edit`)}
                              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                              <span>{t('ems:edit_event_info', 'Sunting Maklumat Acara')}</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => setJuryModalEvent(event)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            <Key className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            <span>{t('ems:generate_jury_code', 'Jana Kod Juri')}</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => navigate(`/ems/checkin/${event.id}`)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            <Scan className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            <span>{t('ems:checkin_counter', 'Kaunter Check-In')}</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => setTieModalEvent(event)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            <span>{t('ems:check_tie_breaker_results', 'Semak Keputusan Seri')}</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => setManualRegModalEvent(event)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            <span>{t('ems:register_participant_manual', '+ Daftar Peserta Manual')}</span>
                          </DropdownMenuItem>

                          {event.is_siswapreneur && (
                            <DropdownMenuItem
                              onClick={() => handleSyncEmsBusiness(event)}
                              disabled={syncingBizId === event.id}
                              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              <RefreshCw className={cn("w-3.5 h-3.5 text-slate-400 dark:text-slate-500", syncingBizId === event.id && "animate-spin")} />
                              <span>{t('ems:sync_to_keusahawanan', 'Sync ke e-Keusahawanan')}</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLuckyDrawEvent(event);
                              setLuckyDrawModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            <Gift className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            <span>Roda Cabutan Bertuah</span>
                          </DropdownMenuItem>

                          {(isSuperAdmin || isJppMember || (!!user?.id && event.created_by === user.id)) && (
                            <>
                              <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />
                              <DropdownMenuItem
                                onClick={() => navigate(`/ems/leaderboard/${event.id}?tab=audit`)}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                <span>Audit Penjurian</span>
                              </DropdownMenuItem>
                            </>
                          )}

                          {event.status === 'APPROVED' && (
                            <>
                              <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />
                              <DropdownMenuItem
                                onClick={() => setConfirmCompleteEvent(event)}
                                disabled={completingCertId === event.id}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t('ems:mark_event_completed', 'Tanda Acara Selesai')}</span>
                              </DropdownMenuItem>
                            </>
                          )}

                          {event.status === 'COMPLETED' && (
                            <>
                              <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />
                              <DropdownMenuItem
                                onClick={() => setCertModalEvent(event)}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                <Award className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                <span>{t('ems:ecert_list', 'Senarai E-Sijil')}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleGenerateCertificates(event.id)}
                                disabled={generatingCertId === event.id}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                <RefreshCw className={cn("w-3.5 h-3.5 text-slate-400 dark:text-slate-500", generatingCertId === event.id && "animate-spin")} />
                                <span>{t('ems:regenerate_ecerts', 'Jana Semula E-Sijil')}</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Secondary summary badges if event completed */}
                    {event.status === 'COMPLETED' && (
                      <div className="flex items-center justify-between pt-1 text-[11px] text-teal-600 dark:text-teal-400">
                        <button
                          onClick={() => setCertModalEvent(event)}
                          className="hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{t('ems:generated_ecerts_list', 'Senarai E-Sijil Dijana')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(`/ems/e/${event.id}/register`)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all shadow-sm active:scale-98"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('ems:register_participant_btn', 'Daftar Peserta')}</span>
                    </button>

                    <button
                      onClick={() => navigate(`/ems/leaderboard/${event.id}`)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-all active:scale-98"
                    >
                      <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      <span>{t('ems:view_results_btn', 'Lihat Keputusan')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Completing Event */}
      <EmsCompleteConfirmModal
        event={confirmCompleteEvent}
        onClose={() => setConfirmCompleteEvent(null)}
        onConfirm={handleCompleteEvent}
      />

      {/* 5 Modularized EMS Modals */}
      <EmsQrCodeModal
        event={qrModalEvent}
        onClose={() => setQrModalEvent(null)}
      />

      <EmsJuryCodeModal
        event={juryModalEvent}
        onClose={() => setJuryModalEvent(null)}
      />

      <EmsTieBreakerModal
        event={tieModalEvent}
        onClose={() => setTieModalEvent(null)}
        onTieResolved={loadEvents}
      />

      <EmsManualRegModal
        event={manualRegModalEvent}
        onClose={() => setManualRegModalEvent(null)}
        onRegistered={loadEvents}
      />

      <EmsEventCertsModal
        event={certModalEvent}
        onClose={() => setCertModalEvent(null)}
      />

      {/* Lucky Draw Wheel Modal */}
      <EmsLuckyDrawModal
        isOpen={luckyDrawModalOpen}
        onClose={() => {
          setLuckyDrawModalOpen(false);
          setSelectedLuckyDrawEvent(null);
        }}
        eventId={selectedLuckyDrawEvent?.id}
        eventTitle={selectedLuckyDrawEvent?.title}
      />
    </div>
  );
}
