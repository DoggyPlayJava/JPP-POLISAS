import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Award,
  Medal,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  MessageSquare,
  Scale,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  X,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  Search,
  Gift,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { EmsLuckyDrawModal } from '@/components/ems/EmsLuckyDrawModal';
import { EmsJuryAuditMatrix } from '@/components/ems/EmsJuryAuditMatrix';
import {
  fetchEmsLeaderboard,
  resolveTieWinner,
  EmsLeaderboardItem,
} from '@/lib/ems';
import { supabase } from '@/lib/supabase';
import type { EmsEvent, EmsScore, EmsJuryCode, EmsRubricCriteria, EmsParticipant } from '@/types';

interface DetailedScore extends EmsScore {
  jury?: EmsJuryCode | null;
  rubric?: EmsRubricCriteria | null;
}

export function EmsLeaderboardPage({ isStageMode: isStageProp }: { isStageMode?: boolean }) {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isSuperAdmin, isJppMember, isPresident, isMT: isClubMt, isAdvisor: isClubAdvisor, profile } = useAuth();
  const isStaff = profile?.role === 'STAFF' || profile?.role === 'PENSYARAH';

  // Detect Stage Mode from prop or path
  const isStageMode = Boolean(isStageProp || location.pathname.startsWith('/ems/stage/'));

  const [event, setEvent] = useState<EmsEvent | null>(null);

  const canManageLeaderboard = Boolean(
    isSuperAdmin || isJppMember || isPresident || isClubMt || isClubAdvisor || isStaff || (!!user?.id && event?.created_by === user.id)
  );

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'LEADERBOARD' | 'STAGE' | 'AUDIT'>(
    tabParam === 'audit' ? 'AUDIT' : isStageMode ? 'STAGE' : 'LEADERBOARD'
  );

  const [leaderboard, setLeaderboard] = useState<EmsLeaderboardItem[]>([]);
  const [participants, setParticipants] = useState<EmsParticipant[]>([]);
  const [juryCodes, setJuryCodes] = useState<EmsJuryCode[]>([]);
  const [rubrics, setRubrics] = useState<EmsRubricCriteria[]>([]);
  const [scores, setScores] = useState<EmsScore[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [hasSetDefaultCategory, setHasSetDefaultCategory] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Public Visibility Toggle Loading
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  // Jury Comments Modal
  const [selectedParticipantForComments, setSelectedParticipantForComments] = useState<EmsLeaderboardItem | null>(null);
  const [participantScores, setParticipantScores] = useState<DetailedScore[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Tie Breaker Modal
  const [showTieBreakerModal, setShowTieBreakerModal] = useState(false);
  const [selectedTieWinnerId, setSelectedTieWinnerId] = useState<string>('');
  const [resolvingTie, setResolvingTie] = useState(false);

  // Stage Display State
  const [isRevealed, setIsRevealed] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lucky Draw Modal State
  const [showLuckyDrawModal, setShowLuckyDrawModal] = useState(false);

  // Fetch Event Details & Leaderboard & Audit Matrix data
  const loadData = useCallback(async (showToast = false) => {
    if (!eventId) return;

    try {
      if (showToast) setRefreshing(true);

      const [
        eventRes,
        leaderboardData,
        participantsRes,
        juryCodesRes,
        rubricsRes,
        scoresRes,
      ] = await Promise.all([
        supabase.from('ems_events').select('*').eq('id', eventId).single(),
        fetchEmsLeaderboard(eventId),
        supabase.from('ems_participants').select('*').eq('event_id', eventId),
        supabase.from('ems_jury_codes').select('*').eq('event_id', eventId),
        supabase.from('ems_rubrics').select('*').eq('event_id', eventId).order('sort_order', { ascending: true }),
        supabase.from('ems_scores').select('*').eq('event_id', eventId),
      ]);

      if (eventRes.error) {
        throw new Error(`Gagal memuatkan acara: ${eventRes.error.message}`);
      }

      setEvent(eventRes.data as EmsEvent);
      setLeaderboard(leaderboardData);
      setParticipants((participantsRes.data || []) as EmsParticipant[]);
      setJuryCodes((juryCodesRes.data || []) as EmsJuryCode[]);
      setRubrics((rubricsRes.data || []) as EmsRubricCriteria[]);
      setScores((scoresRes.data || []) as EmsScore[]);

      if (showToast) {
        toast.success('Papan pendahulu dikemas kini!');
      }
    } catch (err: any) {
      console.error('[EMS Leaderboard] Error loading data:', err);
      toast.error(err.message || 'Gagal memuatkan papan pendahulu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  const loadLeaderboard = loadData;

  // RBAC Guard: Prevent unauthorized student access to audit tab
  useEffect(() => {
    if (!loading && (activeTab === 'AUDIT' || searchParams.get('tab') === 'audit')) {
      if (!canManageLeaderboard) {
        toast.error('Akses Ditolak: Anda tidak mempunyai kebenaran untuk melihat audit juri.');
        setActiveTab('LEADERBOARD');
        setSearchParams({}, { replace: true });
      }
    }
  }, [loading, canManageLeaderboard, activeTab, searchParams, setSearchParams]);

  // Realtime Supabase Subscription
  useEffect(() => {
    if (!eventId) return;

    loadData();

    // Subscribe to ems_scores changes
    const scoreChannel = supabase
      .channel(`ems_scores_realtime_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ems_scores',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    // Subscribe to ems_events changes (e.g. is_leaderboard_public status)
    const eventChannel = supabase
      .channel(`ems_events_realtime_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ems_events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.new) {
            setEvent((prev) => (prev ? { ...prev, ...(payload.new as EmsEvent) } : (payload.new as EmsEvent)));
          }
        }
      )
      .subscribe();

    // Subscribe to ems_participants changes (tie breaker updates)
    const participantChannel = supabase
      .channel(`ems_participants_realtime_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ems_participants',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    // Clean up all subscriptions on unmount
    return () => {
      scoreChannel.unsubscribe();
      eventChannel.unsubscribe();
      participantChannel.unsubscribe();
    };
  }, [eventId, loadData]);

  // Extract Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    leaderboard.forEach((item) => {
      const cat =
        item.category_name ||
        item.participant.category_name ||
        item.participant.custom_responses?.category ||
        item.participant.custom_responses?.category_name;
      if (cat) set.add(String(cat).trim());
    });
    return Array.from(set).sort();
  }, [leaderboard]);

  // Set default category filter when categories load
  useEffect(() => {
    if (!hasSetDefaultCategory && categories.length > 0) {
      setCategoryFilter(categories[0]);
      setHasSetDefaultCategory(true);
    }
  }, [categories, hasSetDefaultCategory]);

  // Filtered Leaderboard with recalculated category ranks
  const filteredLeaderboard = useMemo(() => {
    const filtered = leaderboard.filter((item) => {
      const p = item.participant;
      const cat =
        item.category_name ||
        p.category_name ||
        p.custom_responses?.category ||
        p.custom_responses?.category_name ||
        '';

      const matchesCat = categoryFilter === 'ALL' || cat === categoryFilter;

      const booth = p.booth_no || p.custom_responses?.booth_no || p.custom_responses?.booth_number || '';
      const team = p.team_name || '';
      const leader = p.leader_name || '';

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        team.toLowerCase().includes(query) ||
        leader.toLowerCase().includes(query) ||
        booth.toLowerCase().includes(query) ||
        cat.toLowerCase().includes(query);

      return matchesCat && matchesSearch;
    });

    return filtered.map((item, index) => ({
      ...item,
      category_rank: index + 1,
    }));
  }, [leaderboard, categoryFilter, searchQuery]);

  // Check if any participants are tied
  const hasTiedParticipants = useMemo(() => {
    return leaderboard.some((item) => item.is_tied);
  }, [leaderboard]);

  // Trigger Confetti Effect
  const triggerConfetti = useCallback(() => {
    // Multi-stage confetti celebration
    const end = Date.now() + 3 * 1000;
    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  // Toggle Leaderboard Public Visibility
  const handleToggleVisibility = async () => {
    if (!event || !eventId) return;

    try {
      setTogglingVisibility(true);
      const nextState = !event.is_leaderboard_public;

      const { error } = await supabase
        .from('ems_events')
        .update({ is_leaderboard_public: nextState })
        .eq('id', eventId);

      if (error) throw error;

      setEvent({ ...event, is_leaderboard_public: nextState });
      toast.success(
        nextState
          ? 'Papan Pendahulu kini DIBUKA secara awam (Skrin Pentas Diaktifkan)!'
          : 'Papan Pendahulu kini DISEMBUNYIKAN (Skrin Pentas Ditutup)!'
      );
    } catch (err: any) {
      toast.error(`Gagal mengemaskini status paparan: ${err.message}`);
    } finally {
      setTogglingVisibility(false);
    }
  };

  // Open Jury Comments Modal
  const handleViewComments = async (item: EmsLeaderboardItem) => {
    setSelectedParticipantForComments(item);
    setLoadingComments(true);
    setParticipantScores([]);

    try {
      const { data, error } = await supabase
        .from('ems_scores')
        .select(`
          *,
          jury:ems_jury_codes(*),
          rubric:ems_rubrics(*)
        `)
        .eq('participant_id', item.participant.id);

      if (error) throw error;
      setParticipantScores((data || []) as DetailedScore[]);
    } catch (err: any) {
      toast.error(`Gagal memuatkan komen juri: ${err.message}`);
    } finally {
      setLoadingComments(false);
    }
  };

  // Handle Resolve Tie Winner
  const handleConfirmTieWinner = async () => {
    if (!eventId || !selectedTieWinnerId) {
      toast.error('Sila pilih peserta pemenang penentuan seret');
      return;
    }

    try {
      setResolvingTie(true);
      await resolveTieWinner(eventId, selectedTieWinnerId);
      toast.success('Pemenang penentuan seret berjaya dikemaskini!');
      setShowTieBreakerModal(false);
      loadData();
    } catch (err: any) {
      toast.error(`Gagal menetapkan pemenang seret: ${err.message}`);
    } finally {
      setResolvingTie(false);
    }
  };

  // Toggle Fullscreen Mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6">
        <div className="w-14 h-14 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-white/50 animate-pulse">
          Memuatkan Papan Pendahulu EMS...
        </p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-black mb-2">Acara Tidak Ditemui</h2>
        <p className="text-sm text-slate-400 mb-6">Sila pastikan ID acara adalah sah.</p>
        <button
          onClick={() => navigate('/ems/dashboard')}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
        >
          Kembali ke Papan Pemuka EMS
        </button>
      </div>
    );
  }

  // Guard private leaderboard from unauthorized students
  if (!canManageLeaderboard && !event.is_leaderboard_public) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
        {/* Ambient Background Lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl text-center space-y-8 p-8 md:p-12 rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.8)]">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-b from-amber-500/20 to-amber-500/5 border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.2)] animate-pulse">
            <Lock className="w-12 h-12 text-amber-400" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Keputusan Sedang Diproses
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-amber-200">
              Keputusan Belum Didedahkan Oleh Penganjur
            </h1>
            <p className="text-base md:text-lg text-slate-400 leading-relaxed font-medium">
              Kedudukan dan markah peserta sedang disemak dan belum didedahkan kepada awam.
            </p>
          </div>

          <div className="pt-4 flex flex-col items-center gap-3">
            <button
              onClick={() => navigate('/ems/dashboard')}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg"
            >
              Kembali ke Papan Pemuka EMS
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODE 2: STAGE PRESENTATION DISPLAY MODE (/ems/stage/:eventId)
  // =========================================================================
  if (isStageMode) {
    // Stage Curtain / Locked State when is_leaderboard_public is FALSE
    if (!event.is_leaderboard_public) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
          {/* Ambient Background Lights */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative z-10 max-w-2xl text-center space-y-8 p-8 md:p-12 rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.8)]">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-b from-amber-500/20 to-amber-500/5 border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.2)] animate-pulse">
              <Lock className="w-12 h-12 text-amber-400" />
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Keputusan Sedang Diproses
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-amber-200">
                KEPUTUSAN BELUM DIDEDAHKAN
              </h1>
              <p className="text-base md:text-lg text-slate-400 leading-relaxed font-medium">
                Panel Juri dan Pengarah Program sedang memuktamadkan skor rasmi bagi acara{' '}
                <span className="text-amber-400 font-bold">{event.title}</span>. Keputusan rasmi akan dipaparkan di skrin ini sebentar lagi.
              </p>
            </div>

            {/* Loading pulse indicator */}
            <div className="pt-4 flex flex-col items-center gap-3">
              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-amber-500 to-purple-500 animate-pulse" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40">
                MOD SKRIN PENTAS EMS — MENUNGGU ISYARAT URUS SETIA
              </span>
            </div>

            {/* Admin quick toggle button if user can manage leaderboard */}
            {canManageLeaderboard && (
              <div className="pt-6 border-t border-white/5">
                <button
                  onClick={handleToggleVisibility}
                  disabled={togglingVisibility}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition shadow-lg flex items-center gap-2 mx-auto"
                >
                  <Eye className="w-4 h-4" />
                  Buka Keputusan Pentas Sekarang
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Public / Revealed Stage Display Mode
    const top1 = filteredLeaderboard[0];
    const top2 = filteredLeaderboard[1];
    const top3 = filteredLeaderboard[2];
    const restItems = filteredLeaderboard.slice(3);

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8 pb-28 md:pb-8 relative overflow-hidden select-none font-sans">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-amber-500/15 via-purple-500/10 to-transparent blur-[140px] pointer-events-none" />

        {/* Top Navigation & Controls */}
        <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/ems/leaderboard/${eventId}`)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition border border-white/10"
              title="Keluar Mod Pentas"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  KEMAS KINI MASA-NYATA 🟢
                </span>
                <span className="text-xs text-white/50 font-bold uppercase tracking-wider">
                  EMS STAGE MODE
                </span>
              </div>
              <h1 className="text-xl md:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-400">
                {event.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Category Filter Tabs */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-md">
                <button
                  onClick={() => setCategoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    categoryFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Semua Kategori ({leaderboard.length})
                </button>
                {categories.map((cat) => {
                  const count = leaderboard.filter((item) => {
                    const p = item.participant;
                    const c =
                      item.category_name ||
                      p.category_name ||
                      p.custom_responses?.category ||
                      p.custom_responses?.category_name;
                    return c === cat;
                  }).length;

                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                        categoryFilter === cat
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Lucky Draw Wheel Button */}
            {canManageLeaderboard && (
              <button
                onClick={() => setShowLuckyDrawModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(139,92,246,0.4)] transition flex items-center gap-2"
              >
                <Gift className="w-4 h-4 text-amber-300" />
                Cabutan Bertuah 🎰
              </button>
            )}

            {/* Fireworks / Confetti Button */}
            <button
              onClick={triggerConfetti}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.4)] transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              Bunga Api 🎉
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition border border-white/10"
              title="Skrin Penuh"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Main Stage Content: Top 3 Podium */}
        <main className="relative z-10 my-8 flex-1 flex flex-col justify-center">
          {filteredLeaderboard.length === 0 ? (
            <div className="text-center py-20 text-white/40">
              <Trophy className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-bold">Tiada data keputusan peserta setakat ini.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* TOP 3 PODIUM */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-6xl mx-auto px-4">
                {/* 2ND PLACE (SILVER) - Left */}
                {top2 ? (
                  <div className="order-2 md:order-1 flex flex-col items-center">
                    <div className="w-full bg-gradient-to-b from-slate-800/80 to-slate-900/90 border-2 border-slate-400/40 rounded-3xl p-6 text-center shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-300" />
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-400/20 text-slate-300 border border-slate-400/30 mb-4 shadow-inner">
                        <Medal className="w-9 h-9" />
                      </div>
                      <span className="px-3 py-0.5 rounded-full bg-slate-400/20 text-slate-300 text-xs font-black tracking-widest uppercase mb-2 inline-block border border-slate-400/30">
                        TEMPAT KE-2 🥈
                      </span>
                      <div className="text-xs font-black text-amber-400/90 tracking-widest mb-1 uppercase">
                        STAN #{top2.participant.booth_no || top2.participant.custom_responses?.booth_no || top2.participant.custom_responses?.booth_number || '-'}
                      </div>
                      <h2 className="text-xl md:text-2xl font-black text-white leading-tight line-clamp-2 mb-2">
                        {top2.participant.team_name || top2.participant.leader_name}
                      </h2>
                      <p className="text-xs text-slate-400 font-medium mb-4 line-clamp-1">
                        {top2.participant.leader_name} {top2.participant.category_name ? `• ${top2.participant.category_name}` : ''}
                      </p>

                      {/* Score display */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Markah Terwajar:</span>
                        <span className="text-2xl font-black text-slate-200">{top2.average_score.toFixed(1)} / 100%</span>
                      </div>

                      {top2.is_tie_winner && (
                        <div className="mt-2 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Scale className="w-3 h-3" /> Penentuan Seret
                        </div>
                      )}
                    </div>
                    <div className="w-full h-12 bg-slate-800/40 rounded-b-2xl border-x border-b border-white/5 flex items-center justify-center text-xs font-black text-slate-400 tracking-widest">
                      PODIUM 2
                    </div>
                  </div>
                ) : <div className="order-2 md:order-1" />}

                {/* 1ST PLACE (GOLD) - Center / Highest */}
                {top1 ? (
                  <div className="order-1 md:order-2 flex flex-col items-center -mt-6 md:-mt-10">
                    <div className="w-full bg-gradient-to-b from-amber-950/80 via-slate-900/90 to-slate-950/95 border-2 border-amber-400/60 rounded-3xl p-8 text-center shadow-[0_0_60px_rgba(245,158,11,0.35)] backdrop-blur-2xl relative overflow-hidden transform md:scale-105 transition-transform">
                      <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 animate-pulse" />

                      {/* Crown / Trophy icon */}
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-b from-amber-500/30 to-amber-500/10 text-amber-400 border border-amber-400/50 mb-4 shadow-[0_0_30px_rgba(245,158,11,0.4)] animate-bounce">
                        <Trophy className="w-12 h-12" />
                      </div>

                      <span className="px-4 py-1 rounded-full bg-amber-500/30 text-amber-300 text-xs font-black tracking-widest uppercase mb-2 inline-block border border-amber-400/40 shadow-sm">
                        CHAMPION 🥇 JOHAN
                      </span>

                      <div className="text-xs font-black text-amber-300 tracking-widest mb-1 uppercase">
                        STAN #{top1.participant.booth_no || top1.participant.custom_responses?.booth_no || top1.participant.custom_responses?.booth_number || '-'}
                      </div>

                      <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-yellow-300 leading-tight line-clamp-2 mb-2">
                        {top1.participant.team_name || top1.participant.leader_name}
                      </h2>

                      <p className="text-xs md:text-sm text-slate-300 font-medium mb-5 line-clamp-1">
                        {top1.participant.leader_name} {top1.participant.category_name ? `• ${top1.participant.category_name}` : ''}
                      </p>

                      {/* Score display */}
                      <div className="pt-4 border-t border-amber-500/20 flex items-center justify-center gap-2">
                        <span className="text-xs font-bold text-amber-300/70 uppercase">Markah Terwajar:</span>
                        <span className="text-3xl md:text-4xl font-black text-amber-300 drop-shadow-md">
                          {top1.average_score.toFixed(1)} / 100%
                        </span>
                      </div>

                      {top1.is_tie_winner && (
                        <div className="mt-3 text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-400/30 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5" /> Penentuan Seret Pemenang
                        </div>
                      )}
                    </div>
                    <div className="w-full h-16 bg-amber-500/10 rounded-b-2xl border-x border-b border-amber-500/20 flex items-center justify-center text-xs font-black text-amber-400 tracking-widest shadow-inner">
                      PODIUM 1 — JOHAN
                    </div>
                  </div>
                ) : null}

                {/* 3RD PLACE (BRONZE) - Right */}
                {top3 ? (
                  <div className="order-3 flex flex-col items-center">
                    <div className="w-full bg-gradient-to-b from-amber-950/40 via-slate-900/90 to-slate-950/95 border-2 border-amber-700/40 rounded-3xl p-6 text-center shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-amber-700" />
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-700/20 text-amber-500 border border-amber-700/30 mb-4 shadow-inner">
                        <Award className="w-9 h-9" />
                      </div>
                      <span className="px-3 py-0.5 rounded-full bg-amber-700/20 text-amber-400 text-xs font-black tracking-widest uppercase mb-2 inline-block border border-amber-700/30">
                        TEMPAT KE-3 🥉
                      </span>
                      <div className="text-xs font-black text-amber-500/90 tracking-widest mb-1 uppercase">
                        STAN #{top3.participant.booth_no || top3.participant.custom_responses?.booth_no || top3.participant.custom_responses?.booth_number || '-'}
                      </div>
                      <h2 className="text-xl md:text-2xl font-black text-white leading-tight line-clamp-2 mb-2">
                        {top3.participant.team_name || top3.participant.leader_name}
                      </h2>
                      <p className="text-xs text-slate-400 font-medium mb-4 line-clamp-1">
                        {top3.participant.leader_name} {top3.participant.category_name ? `• ${top3.participant.category_name}` : ''}
                      </p>

                      {/* Score display */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Markah Terwajar:</span>
                        <span className="text-2xl font-black text-amber-200">{top3.average_score.toFixed(1)} / 100%</span>
                      </div>

                      {top3.is_tie_winner && (
                        <div className="mt-2 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Scale className="w-3 h-3" /> Penentuan Seret
                        </div>
                      )}
                    </div>
                    <div className="w-full h-10 bg-amber-950/20 rounded-b-2xl border-x border-b border-white/5 flex items-center justify-center text-xs font-black text-amber-600 tracking-widest">
                      PODIUM 3
                    </div>
                  </div>
                ) : <div className="order-3" />}
              </div>

              {/* REST OF RANKS (4th, 5th, 6th...) */}
              {restItems.length > 0 && (
                <div className="max-w-6xl mx-auto px-4 pt-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.25em] text-white/50 mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Kedudukan Seterusnya (Carta Keseluruhan)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {restItems.map((item) => {
                      const booth = item.participant.booth_no || item.participant.custom_responses?.booth_no || item.participant.custom_responses?.booth_number || '-';
                      return (
                        <div
                          key={item.participant.id}
                          className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition backdrop-blur-md"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-9 h-9 rounded-xl bg-slate-800 text-white font-black text-sm flex items-center justify-center border border-white/10 shrink-0">
                              #{item.category_rank || item.rank}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-amber-400 uppercase tracking-wider">
                                STAN #{booth}
                              </p>
                              <h4 className="text-sm font-bold text-white truncate">
                                {item.participant.team_name || item.participant.leader_name}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate">
                                {item.participant.leader_name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-black text-amber-400">
                              {item.average_score.toFixed(1)} / 100%
                            </div>
                            <span className="text-[10px] text-white/40 uppercase font-bold">
                              {item.jury_count} Juri
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span>JPP POLISAS — Event Management System (EMS)</span>
          <span>Dikuasa oleh Sistem Keputusan Realtime Supabase</span>
        </footer>
      </div>
    );
  }

  // =========================================================================
  // MODE 1: DASHBOARD LEADERBOARD VIEW (/ems/leaderboard/:eventId)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 sm:p-6 lg:p-8 pb-28 md:pb-8 space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/ems/dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Papan Pemuka EMS
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Masa-Nyata 🟢
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" />
            Papan Pendahulu: {event.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Penilaian masa-nyata juri, pengiraan purata markah, dan kawalan paparan skrin pentas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Lucky Draw Button */}
          {canManageLeaderboard && (
            <button
              onClick={() => setShowLuckyDrawModal(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-md transition flex items-center gap-2"
            >
              <Gift className="w-4 h-4 text-amber-300" />
              Cabutan Bertuah 🎰
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-700 dark:text-slate-300"
            title="Muat Semula Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Open Stage View Button */}
          {canManageLeaderboard && (
            <button
              onClick={() => window.open(`/ems/stage/${eventId}`, '_blank')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Buka Mod Skrin Pentas (Stage View)
            </button>
          )}
        </div>
      </div>

      {/* Main View Mode Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('LEADERBOARD');
            setSearchParams({});
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
            activeTab === 'LEADERBOARD'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          Papan Kedudukan
        </button>

        <button
          onClick={() => {
            window.open(`/ems/stage/${eventId}`, '_blank');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
            activeTab === 'STAGE'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ExternalLink className="w-4 h-4 text-amber-500" />
          Mod Pentas
        </button>

        {canManageLeaderboard && (
          <button
            onClick={() => {
              setActiveTab('AUDIT');
              setSearchParams({ tab: 'audit' });
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition ${
              activeTab === 'AUDIT'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4 text-purple-300" />
            🕵️ Audit & Pemantauan Juri
          </button>
        )}
      </div>

      {activeTab === 'AUDIT' && canManageLeaderboard ? (
        <EmsJuryAuditMatrix
          eventId={eventId!}
          participants={participants}
          juryCodes={juryCodes}
          rubrics={rubrics}
          scores={scores}
          onRefresh={loadLeaderboard}
        />
      ) : (
        <>
          {/* Director Controls Toolbar */}
          {canManageLeaderboard && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Toggle Public Leaderboard Visibility */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Visibiliti Skrin Pentas
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${event.is_leaderboard_public ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <h4 className="text-sm font-black">
                      {event.is_leaderboard_public ? 'Status Awam: Didedahkan 👁️' : 'Status Awam: Disembunyikan 🔒'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {event.is_leaderboard_public
                      ? 'Skrin pentas memaparkan kedudukan & kedudukan terkini peserta.'
                      : 'Skrin pentas memaparkan skrin kunci "Keputusan Sedang Diproses".'}
                  </p>
                </div>

                <button
                  onClick={handleToggleVisibility}
                  disabled={togglingVisibility}
                  className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-sm shrink-0 flex items-center gap-2 ${
                    event.is_leaderboard_public
                      ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                  }`}
                >
                  {event.is_leaderboard_public ? (
                    <>
                      <EyeOff className="w-4 h-4" /> Sembunyi
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" /> Buka Awam
                    </>
                  )}
                </button>
              </div>

              {/* Tie-Breaker Resolution Control */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Penentuan Seret (Tie-Breaker)
                  </span>
                  <h4 className="text-sm font-black flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-500" />
                    {hasTiedParticipants ? 'Terdapat Peserta Seret! ⚠️' : 'Tiada Keputusan Seret'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {hasTiedParticipants
                      ? 'Pengarah Program perlu menetapkan pemenang muktamad.'
                      : 'Kedudukan dikira berdasarkan purata skor juri.'}
                  </p>
                </div>

                <button
                  onClick={() => setShowTieBreakerModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition font-black text-xs uppercase tracking-wider shrink-0 flex items-center gap-1.5"
                >
                  <Scale className="w-4 h-4" /> Urus Seret
                </button>
              </div>

              {/* Stats Summary Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Jumlah Peserta & Juri
                  </span>
                  <h4 className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                    {leaderboard.length} Peserta Berdaftar
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dineka untuk {categories.length || 1} kategori penilaian.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg">
                  {leaderboard.length}
                </div>
              </div>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  categoryFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Semua Kategori ({leaderboard.length})
              </button>
              {categories.map((cat) => {
                const count = leaderboard.filter((item) => {
                  const p = item.participant;
                  const c =
                    item.category_name ||
                    p.category_name ||
                    p.custom_responses?.category ||
                    p.custom_responses?.category_name;
                  return c === cat;
                }).length;

                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      categoryFilter === cat
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Stan / Peserta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Main Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5 text-center w-16">Kedudukan</th>
                    <th className="px-4 py-3.5">Stan #</th>
                    <th className="px-4 py-3.5">Pasukan / Ketua</th>
                    <th className="px-4 py-3.5">Kategori</th>
                    <th className="px-4 py-3.5 text-center">Markah Terwajar (%)</th>
                    <th className="px-4 py-3.5 text-center">Bil. Juri</th>
                    <th className="px-4 py-3.5 text-center">Status / Lencana</th>
                    <th className="px-4 py-3.5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {filteredLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        Tiada data peserta ditemui bagi carian/kategori ini.
                      </td>
                    </tr>
                  ) : (
                    filteredLeaderboard.map((item, index) => {
                      const p = item.participant;
                      const booth = p.booth_no || p.custom_responses?.booth_no || p.custom_responses?.booth_number || '-';
                      const cat = item.category_name || p.category_name || p.custom_responses?.category || p.custom_responses?.category_name || '-';
                      const rank = item.category_rank || index + 1;

                      // Rank Badge styles
                      let rankBadge = (
                        <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black flex items-center justify-center mx-auto text-xs">
                          #{rank}
                        </span>
                      );
                      if (rank === 1) {
                        rankBadge = (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center gap-1 mx-auto text-xs shadow-md shadow-amber-500/30">
                            🥇 1
                          </span>
                        );
                      } else if (rank === 2) {
                        rankBadge = (
                          <span className="px-2.5 py-1 rounded-full bg-slate-300 text-slate-950 font-black flex items-center justify-center gap-1 mx-auto text-xs shadow-md">
                            🥈 2
                          </span>
                        );
                      } else if (rank === 3) {
                        rankBadge = (
                          <span className="px-2.5 py-1 rounded-full bg-amber-700 text-white font-black flex items-center justify-center gap-1 mx-auto text-xs shadow-md">
                            🥉 3
                          </span>
                        );
                      }

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="px-4 py-3.5 text-center">{rankBadge}</td>
                          <td className="px-4 py-3.5 font-black text-amber-600 dark:text-amber-400">
                            #{booth}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {p.team_name || p.leader_name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Ketua: {p.leader_name} {p.matrix_no ? `(${p.matrix_no})` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                              {cat}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60">
                              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                {item.average_score.toFixed(1)} / 100%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                              {item.jury_count} Juri
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {item.is_tie_winner ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                <Trophy className="w-3 h-3" /> Pemenang Seret
                              </span>
                            ) : item.is_tied ? (
                              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                <Scale className="w-3 h-3" /> Markah Seret
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleViewComments(item)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-bold text-xs transition inline-flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Lihat Markah & Komen
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: JURY COMMENTS & BREAKDOWN MODAL */}
      {/* ========================================================================= */}
      {selectedParticipantForComments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Perincian Penilaian Juri
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedParticipantForComments.participant.team_name || selectedParticipantForComments.participant.leader_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedParticipantForComments(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {loadingComments ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />
                  Memuatkan jawapan & komen juri...
                </div>
              ) : participantScores.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  Belum ada markah atau komen juri dimasukkan untuk peserta ini.
                </div>
              ) : (
                <div className="space-y-4">
                  {participantScores.map((score, idx) => (
                    <div
                      key={score.id || idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-indigo-500" />
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            Juri: {score.jury?.jury_name || score.jury?.code || 'Kod Juri'}
                          </span>
                          {score.jury?.organization && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              ({score.jury.organization})
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                          Skor Criteria: {score.score}
                        </div>
                      </div>

                      {score.rubric && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                          <span>Criteria: <strong>{score.rubric.criteria_name}</strong></span>
                          <span className="text-[10px] text-slate-400">Pemberat: {score.rubric.weight}x</span>
                        </div>
                      )}

                      {score.comments ? (
                        <div className="text-xs italic text-slate-700 dark:text-slate-300 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                          &quot;{score.comments}&quot;
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">Tiada ulasan bertulis daripada juri ini.</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedParticipantForComments(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TIE BREAKER SELECTION MODAL */}
      {/* ========================================================================= */}
      {showTieBreakerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Scale className="w-6 h-6 text-amber-500" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Penentuan Pemenang Seret
                </h3>
              </div>
              <button
                onClick={() => setShowTieBreakerModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Pilih peserta yang ditentukan sebagai Pemenang Utama bagi keputusan markah seret. Pilihan ini akan mengatasi keutamaan senarai (Tie-Breaker Badge).
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {leaderboard.map((item) => {
                  const p = item.participant;
                  const isSelected = selectedTieWinnerId === p.id;
                  return (
                    <label
                      key={p.id}
                      onClick={() => setSelectedTieWinnerId(p.id)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-300 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="tieWinner"
                          checked={isSelected}
                          onChange={() => setSelectedTieWinnerId(p.id)}
                          className="text-amber-500 focus:ring-amber-500"
                        />
                        <div>
                          <p className="text-xs font-black">
                            #{p.booth_no || p.custom_responses?.booth_no || '-'} — {p.team_name || p.leader_name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Purata Skor: {item.average_score.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {item.is_tie_winner && (
                        <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black">
                          Pemenang Semasa
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setShowTieBreakerModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmTieWinner}
                disabled={resolvingTie || !selectedTieWinnerId}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50"
              >
                {resolvingTie ? 'Menyimpan...' : 'Sahkan Pemenang Seret'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Lucky Draw Modal */}
      <EmsLuckyDrawModal
        isOpen={showLuckyDrawModal}
        onClose={() => setShowLuckyDrawModal(false)}
        eventId={eventId}
        eventTitle={event?.title}
      />
    </div>
  );
}
