import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Image as ImageIcon,
  KeyRound,
  LogOut,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  Star,
  User,
  UserCheck,
  X,
  Eye,
  ChevronRight,
  Send,
} from 'lucide-react';
import { verifyJuryCode, submitJuryScore } from '@/lib/ems';
import { supabase } from '@/lib/supabase';
import type { EmsEvent, EmsJuryCode, EmsParticipant, EmsRubricCriteria, EmsScore } from '@/types';

interface JurySession {
  code: string;
  jury_name: string;
  organization: string;
  event_id: string;
}

export function EmsJuryPortalPage() {
  // Session & Auth State
  const [session, setSession] = useState<JurySession | null>(null);
  const [juryCodeData, setJuryCodeData] = useState<EmsJuryCode | null>(null);
  const [eventData, setEventData] = useState<EmsEvent | null>(null);
  const [rubrics, setRubrics] = useState<EmsRubricCriteria[]>([]);

  // Page Load / Verification State
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [inputCode, setInputCode] = useState<string>('');

  // Code verification Step 2 (Name & Org details)
  const [pendingJuryCode, setPendingJuryCode] = useState<{
    juryCode: EmsJuryCode;
    event: EmsEvent;
    rubrics: EmsRubricCriteria[];
  } | null>(null);
  const [inputJuryName, setInputJuryName] = useState<string>('');
  const [inputOrganization, setInputOrganization] = useState<string>('');

  // Dashboard Data State
  const [participants, setParticipants] = useState<EmsParticipant[]>([]);
  const [scores, setScores] = useState<EmsScore[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNSCORED' | 'SCORED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modal / Evaluation Drawer State
  const [evalParticipant, setEvalParticipant] = useState<EmsParticipant | null>(null);
  const [criterionScores, setCriterionScores] = useState<Record<string, number>>({});
  const [generalComments, setGeneralComments] = useState<string>('');
  const [isSubmittingScores, setIsSubmittingScores] = useState<boolean>(false);

  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Initial session check on mount
  useEffect(() => {
    async function loadSavedSession() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlCode = searchParams.get('code');
        if (urlCode) {
          setInputCode(urlCode.toUpperCase());
        }

        const savedRaw = localStorage.getItem('ems_jury_session');
        if (savedRaw) {
          const parsedSession: JurySession = JSON.parse(savedRaw);
          if (parsedSession && parsedSession.code) {
            const verified = await verifyJuryCode(parsedSession.code);
            if (verified) {
              setSession(parsedSession);
              setJuryCodeData(verified.juryCode);
              setEventData(verified.event);
              setRubrics(verified.rubrics);
              await fetchDashboardData(verified.event.id, verified.juryCode.id);
            } else {
              localStorage.removeItem('ems_jury_session');
              toast.error('Sesi juri telah tamat atau kod tidak sah lagi.');
            }
          }
        }
      } catch (err) {
        console.error('Error reading ems_jury_session:', err);
        localStorage.removeItem('ems_jury_session');
      } finally {
        setIsInitializing(false);
      }
    }
    loadSavedSession();
  }, []);

  // Fetch Dashboard Participants & Scores
  const fetchDashboardData = async (eventId: string, juryCodeId: string) => {
    setIsLoadingDashboard(true);
    try {
      const [participantsRes, scoresRes] = await Promise.all([
        supabase
          .from('ems_participants')
          .select('*')
          .eq('event_id', eventId)
          .order('booth_no', { ascending: true }),
        supabase
          .from('ems_scores')
          .select('*')
          .eq('jury_code_id', juryCodeId),
      ]);

      if (participantsRes.error) throw participantsRes.error;
      if (scoresRes.error) throw scoresRes.error;

      setParticipants(participantsRes.data || []);
      setScores(scoresRes.data || []);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      toast.error(`Gagal memuatkan maklumat peserta: ${err.message || 'Ralat rangkaian'}`);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Handle Code Submission (Step 1)
  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Sila masukkan Kod Jemputan Juri.');
      return;
    }

    setIsVerifying(true);
    try {
      const verified = await verifyJuryCode(cleanCode);
      if (!verified) {
        toast.error('Kod Jemputan Juri tidak sah atau tidak wujud.');
        setIsVerifying(false);
        return;
      }

      const { juryCode, event, rubrics: fetchedRubrics } = verified;

      // Check if jury_name and organization are already registered in the jury code record
      if (juryCode.jury_name && juryCode.organization) {
        const newSession: JurySession = {
          code: juryCode.code,
          jury_name: juryCode.jury_name,
          organization: juryCode.organization,
          event_id: event.id,
        };
        localStorage.setItem('ems_jury_session', JSON.stringify(newSession));
        setSession(newSession);
        setJuryCodeData(juryCode);
        setEventData(event);
        setRubrics(fetchedRubrics);
        toast.success(`Selamat datang, ${juryCode.jury_name}!`);
        await fetchDashboardData(event.id, juryCode.id);
      } else {
        // Prompt for missing jury name/organization in Step 2
        setPendingJuryCode(verified);
        setInputJuryName(juryCode.jury_name || '');
        setInputOrganization(juryCode.organization || '');
      }
    } catch (err: any) {
      toast.error(`Ralat pengesahan: ${err.message || 'Sila cuba lagi'}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Details Submission (Step 2)
  const handleSaveJuryDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingJuryCode) return;

    const name = inputJuryName.trim();
    const org = inputOrganization.trim();

    if (!name) {
      toast.error('Sila masukkan nama penuh anda.');
      return;
    }
    if (!org) {
      toast.error('Sila masukkan organisasi atau jawatan anda.');
      return;
    }

    setIsVerifying(true);
    try {
      const { juryCode, event, rubrics: fetchedRubrics } = pendingJuryCode;

      // Update jury code details in DB
      await supabase
        .from('ems_jury_codes')
        .update({ jury_name: name, organization: org })
        .eq('id', juryCode.id);

      const updatedJuryCode = { ...juryCode, jury_name: name, organization: org };
      const newSession: JurySession = {
        code: updatedJuryCode.code,
        jury_name: name,
        organization: org,
        event_id: event.id,
      };

      localStorage.setItem('ems_jury_session', JSON.stringify(newSession));
      setSession(newSession);
      setJuryCodeData(updatedJuryCode);
      setEventData(event);
      setRubrics(fetchedRubrics);
      setPendingJuryCode(null);

      toast.success(`Selamat datang, ${name}!`);
      await fetchDashboardData(event.id, updatedJuryCode.id);
    } catch (err: any) {
      toast.error(`Gagal menyimpan maklumat juri: ${err.message || 'Ralat sistem'}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('ems_jury_session');
    setSession(null);
    setJuryCodeData(null);
    setEventData(null);
    setRubrics([]);
    setParticipants([]);
    setScores([]);
    setInputCode('');
    setPendingJuryCode(null);
    toast.success('Anda telah log keluar daripada sesi juri.');
  };

  // Filter participants according to jury code assignments (categories & booths)
  const assignedParticipants = useMemo(() => {
    if (!participants || !juryCodeData) return [];

    const assignedCats = juryCodeData.assigned_categories;
    const assignedBooths = juryCodeData.assigned_booths;

    return participants.filter((p) => {
      // Category filter match
      let matchCat = true;
      if (assignedCats && assignedCats.length > 0 && !assignedCats.includes('ALL')) {
        const pCategory = p.category_name || p.custom_responses?.category || '';
        matchCat = assignedCats.some(
          (c) => c.toLowerCase() === pCategory.toLowerCase()
        );
      }

      // Booth filter match
      let matchBooth = true;
      if (assignedBooths && assignedBooths.length > 0 && !assignedBooths.includes('ALL')) {
        const pBooth = p.booth_no || '';
        matchBooth = assignedBooths.some(
          (b) => b.toLowerCase() === pBooth.toLowerCase()
        );
      }

      return matchCat && matchBooth;
    });
  }, [participants, juryCodeData]);

  // Categories list for category tab filter
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    assignedParticipants.forEach((p) => {
      const cat = p.category_name || p.custom_responses?.category;
      if (cat) cats.add(cat);
    });
    return Array.from(cats);
  }, [assignedParticipants]);

  // Further filter participants based on search query, status filter, and category tab
  const filteredParticipants = useMemo(() => {
    return assignedParticipants.filter((p) => {
      // Category tab
      if (categoryFilter !== 'ALL') {
        const cat = p.category_name || p.custom_responses?.category || '';
        if (cat.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const booth = (p.booth_no || '').toLowerCase();
        const team = (p.team_name || '').toLowerCase();
        const leader = (p.leader_name || '').toLowerCase();
        const title = (
          p.custom_responses?.product_title ||
          p.custom_responses?.title ||
          p.custom_responses?.nama_produk ||
          ''
        ).toLowerCase();

        const match =
          booth.includes(q) || team.includes(q) || leader.includes(q) || title.includes(q);
        if (!match) return false;
      }

      // Status filter
      const pScores = scores.filter((s) => s.participant_id === p.id);
      const isScored = pScores.length > 0;
      if (statusFilter === 'SCORED' && !isScored) return false;
      if (statusFilter === 'UNSCORED' && isScored) return false;

      return true;
    });
  }, [assignedParticipants, categoryFilter, searchQuery, statusFilter, scores]);

  // Calculate overall maximum possible rubric score
  const maxPossibleTotal = useMemo(() => {
    return rubrics.reduce((acc, r) => acc + Number(r.max_score || 0), 0);
  }, [rubrics]);

  // Open Evaluation Modal for a Participant
  const openEvaluationModal = (participant: EmsParticipant) => {
    setEvalParticipant(participant);

    // Populate existing scores if present
    const existingScores = scores.filter((s) => s.participant_id === participant.id);
    const initialScores: Record<string, number> = {};
    let initialComment = '';

    rubrics.forEach((r) => {
      const matchScore = existingScores.find((s) => s.rubric_id === r.id);
      if (matchScore) {
        initialScores[r.id] = Number(matchScore.score);
        if (matchScore.comments && !initialComment) {
          initialComment = matchScore.comments;
        }
      } else {
        initialScores[r.id] = 0;
      }
    });

    setCriterionScores(initialScores);
    setGeneralComments(initialComment);
  };

  // Submit Rubric Evaluation
  const handleRubricSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalParticipant || !juryCodeData || !eventData) return;

    setIsSubmittingScores(true);
    try {
      const scoresPayload = rubrics.map((r) => ({
        event_id: eventData.id,
        participant_id: evalParticipant.id,
        jury_code_id: juryCodeData.id,
        rubric_id: r.id,
        score: Number(criterionScores[r.id] || 0),
        comments: generalComments.trim(),
      }));

      await submitJuryScore(scoresPayload);
      toast.success(`Pemarkahan untuk ${evalParticipant.team_name || evalParticipant.leader_name} berjaya disimpan!`);

      // Refresh scores from DB
      await fetchDashboardData(eventData.id, juryCodeData.id);
      setEvalParticipant(null);
    } catch (err: any) {
      console.error('Failed to submit scores:', err);
      toast.error(`Gagal menyimpan pemarkahan: ${err.message || 'Ralat sistem'}`);
    } finally {
      setIsSubmittingScores(false);
    }
  };

  // Helper to extract media images for media gallery preview
  const getParticipantImages = (p: EmsParticipant) => {
    const images: { url: string; label: string }[] = [];

    if (p.media_urls && Array.isArray(p.media_urls)) {
      p.media_urls.forEach((url, idx) => {
        if (url && typeof url === 'string') {
          images.push({ url, label: `Foto ${idx + 1}` });
        }
      });
    }

    if (p.custom_responses) {
      const cr = p.custom_responses;
      if (cr.booth_photo_url) images.push({ url: cr.booth_photo_url, label: 'Foto Booth' });
      if (cr.poster_photo_url) images.push({ url: cr.poster_photo_url, label: 'Poster Inovasi' });
      if (cr.poster_url && !cr.poster_photo_url) images.push({ url: cr.poster_url, label: 'Poster' });
      if (cr.image_url) images.push({ url: cr.image_url, label: 'Gambar Inovasi' });
    }

    return images;
  };

  // Calculation helper for current live total score in evaluation modal
  const liveModalTotalScore = useMemo(() => {
    return rubrics.reduce((acc, r) => acc + (criterionScores[r.id] || 0), 0);
  }, [rubrics, criterionScores]);

  // Loading indicator for initial load
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Menghubungkan ke Portal Juri EMS...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // SCREEN 1: CODE VERIFICATION ENTRY (Guest/Jury Access)
  // ---------------------------------------------------------------------------
  if (!session || !eventData || !juryCodeData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 pb-28 md:pb-8 relative overflow-hidden">
        {/* Background glow graphics */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
              <Award className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Portal Penilaian Juri</h1>
            <p className="text-sm text-slate-400 mt-1.5">
              Event Management System (EMS) POLISAS
            </p>
          </div>

          {/* STEP 1: Enter Invitation Code */}
          {!pendingJuryCode ? (
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Kod Jemputan Juri
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: JURI-2026-X"
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-600 placeholder:font-sans placeholder:tracking-normal uppercase"
                    required
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Kod jemputan diberikan oleh Pengarah Program atau Urusetia Penilaian.
                </p>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Menyemak Kod...</span>
                  </>
                ) : (
                  <>
                    <span>Sahkan Kod & Teruskan</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: Fill Jury Name & Organization if not pre-populated */
            <form onSubmit={handleSaveJuryDetailsSubmit} className="space-y-5">
              <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 mb-2 text-xs text-indigo-200 flex items-start gap-2.5">
                <BadgeCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">Kod Disahkan: {pendingJuryCode.juryCode.code}</span>
                  <span className="text-slate-300">Acara: {pendingJuryCode.event.title}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Penuh Juri <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={inputJuryName}
                    onChange={(e) => setInputJuryName(e.target.value)}
                    placeholder="Contoh: Dr. Norazlan Bin Ahmad"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Organisasi / Jabatan / Jawatan <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={inputOrganization}
                    onChange={(e) => setInputOrganization(e.target.value)}
                    placeholder="Contoh: Universiti Malaysia Pahang / Pensyarah Kanan"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPendingJuryCode(null)}
                  className="w-1/3 py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-all"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-2/3 py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isVerifying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Masuk Portal</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-500">
              Hak Cipta Terpelihara &copy; {new Date().getFullYear()} POLISAS EMS
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // SCREEN 2: JURY EVALUATION DASHBOARD
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-28 md:pb-8">
      {/* Event Header Banner */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Event Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold rounded-full uppercase tracking-wider">
                  EMS Portal Juri
                </span>
                {eventData.category && (
                  <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-xs font-medium rounded-full">
                    {eventData.category}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {eventData.title}
              </h1>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
                {eventData.event_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{new Date(eventData.event_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
                {eventData.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{eventData.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Jury Profile & Logout */}
            <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-800 self-start md:self-auto">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shrink-0">
                {session.jury_name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white leading-tight">
                    {session.jury_name}
                  </span>
                  <span className="text-[10px] font-mono bg-indigo-900/60 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-700/50">
                    {session.code}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate max-w-[180px] sm:max-w-[220px]">
                  {session.organization}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Log Keluar Sesi Juri"
                className="ml-2 p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Filters & Search Controls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari booth #, pasukan, ketua atau tajuk inovasi..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto shrink-0">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua ({assignedParticipants.length})
              </button>
              <button
                onClick={() => setStatusFilter('UNSCORED')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === 'UNSCORED'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Belum Dinilai ({assignedParticipants.filter((p) => !scores.some((s) => s.participant_id === p.id)).length})
              </button>
              <button
                onClick={() => setStatusFilter('SCORED')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === 'SCORED'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Telah Dinilai ({assignedParticipants.filter((p) => scores.some((s) => s.participant_id === p.id)).length})
              </button>
            </div>
          </div>

          {/* Category Tabs (if multiple categories present) */}
          {availableCategories.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-800/80 no-scrollbar">
              <span className="text-xs text-slate-500 font-medium shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Kategori:
              </span>
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-all shrink-0 ${
                  categoryFilter === 'ALL'
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                Semua Kategori
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-slate-700 text-white border border-slate-600'
                      : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Participant Cards Grid */}
        {isLoadingDashboard ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
            <p>Memuatkan senarai peserta & pemarkahan...</p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
            <UserCheck className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-300">Tiada Peserta Ditemui</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                ? 'Tiada peserta yang sepadan dengan tapisan atau kata kunci carian anda.'
                : 'Tiada peserta yang diagihkan di bawah kategori / booth kod juri anda.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredParticipants.map((participant) => {
              const pScores = scores.filter((s) => s.participant_id === participant.id);
              const isScored = pScores.length > 0;

              // Calculate total score given by jury
              const awardedScore = rubrics.reduce((acc, r) => {
                const s = pScores.find((sc) => sc.rubric_id === r.id);
                return acc + (s ? Number(s.score || 0) : 0);
              }, 0);

              const mediaImages = getParticipantImages(participant);
              const productTitle =
                participant.custom_responses?.product_title ||
                participant.custom_responses?.title ||
                participant.custom_responses?.nama_produk ||
                participant.team_name ||
                'Inovasi Peserta';

              return (
                <div
                  key={participant.id}
                  className={`bg-slate-900/90 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-slate-700 shadow-lg ${
                    isScored ? 'border-emerald-500/30' : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Row: Booth Badge & Category & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {participant.booth_no ? (
                          <span className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-mono text-xs font-bold rounded-lg shadow-sm">
                            BOOTH #{participant.booth_no}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-xs font-medium rounded-lg">
                            TIADA BOOTH
                          </span>
                        )}
                        {(participant.category_name || participant.custom_responses?.category) && (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[11px] font-medium rounded-md truncate max-w-[120px]">
                            {participant.category_name || participant.custom_responses?.category}
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      {isScored ? (
                        <span className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold rounded-full flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            Telah Dinilai ({awardedScore}/{maxPossibleTotal})
                          </span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-semibold rounded-full flex items-center gap-1 shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Belum Dinilai</span>
                        </span>
                      )}
                    </div>

                    {/* Team & Product Title */}
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2">
                        {productTitle}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>
                          {participant.team_name ? (
                            <>
                              <strong className="text-slate-200">{participant.team_name}</strong> ({participant.leader_name})
                            </>
                          ) : (
                            participant.leader_name
                          )}
                        </span>
                      </p>
                    </div>

                    {/* Media Gallery Preview Thumbnails */}
                    {mediaImages.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                          Pratonton Galeri Media
                        </span>
                        <div className="flex items-center gap-2 overflow-x-auto">
                          {mediaImages.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setLightboxImage({ url: img.url, title: `${productTitle} - ${img.label}` })}
                              className="relative group w-16 h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 hover:border-indigo-500 transition-all"
                            >
                              <img
                                src={img.url}
                                alt={img.label}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                              <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[9px] text-slate-300 text-center py-0.5 truncate px-0.5">
                                {img.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80">
                    <button
                      onClick={() => openEvaluationModal(participant)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md ${
                        isScored
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/20'
                      }`}
                    >
                      <Sliders className="w-4 h-4" />
                      <span>{isScored ? 'Kemaskini Markah Rubrik' : 'Penilaian Rubrik'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ----------------------------------------------------------------------- */}
      {/* SCREEN 3: RUBRIC EVALUATION MODAL / DRAWER */}
      {/* ----------------------------------------------------------------------- */}
      {evalParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-center items-end sm:items-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 border-b border-slate-800 flex items-start justify-between gap-4 sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {evalParticipant.booth_no && (
                    <span className="px-2.5 py-0.5 bg-indigo-600 text-white font-mono text-xs font-bold rounded-md">
                      BOOTH #{evalParticipant.booth_no}
                    </span>
                  )}
                  {(evalParticipant.category_name || evalParticipant.custom_responses?.category) && (
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs font-medium rounded-md">
                      {evalParticipant.category_name || evalParticipant.custom_responses?.category}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  {evalParticipant.custom_responses?.product_title ||
                    evalParticipant.custom_responses?.title ||
                    evalParticipant.custom_responses?.nama_produk ||
                    evalParticipant.team_name ||
                    'Inovasi Peserta'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ketua / Pasukan: <span className="text-slate-200 font-medium">{evalParticipant.leader_name}</span>
                  {evalParticipant.team_name && ` (${evalParticipant.team_name})`}
                </p>
              </div>

              <button
                onClick={() => setEvalParticipant(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleRubricSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Rubric Criteria List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>Kriteria Penilaian ({rubrics.length})</span>
                  </h3>
                  <span className="text-xs font-mono font-semibold text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-800/50">
                    Jumlah Semasa: {liveModalTotalScore} / {maxPossibleTotal}
                  </span>
                </div>

                {rubrics.length === 0 ? (
                  <div className="p-6 bg-slate-950/60 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
                    Tiada kriteria penilaian rubrik ditetap oleh Pengarah Program untuk acara ini.
                  </div>
                ) : (
                  rubrics.map((r, index) => {
                    const currentScore = criterionScores[r.id] ?? 0;
                    const maxScore = Number(r.max_score || 10);
                    const weight = Number(r.weight || 1);

                    // Preset rating options
                    const presets = [
                      { label: '0%', val: 0 },
                      { label: '25%', val: Math.round(maxScore * 0.25) },
                      { label: '50%', val: Math.round(maxScore * 0.5) },
                      { label: '75%', val: Math.round(maxScore * 0.75) },
                      { label: '100%', val: maxScore },
                    ];

                    return (
                      <div
                        key={r.id}
                        className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-slate-700 transition-all"
                      >
                        {/* Criterion Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <h4 className="text-sm font-semibold text-white">
                                {r.criteria_name}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 pl-8">
                              Markah Maksimum: <strong className="text-slate-200">{maxScore}</strong> | Pemberat: <strong className="text-slate-200">x{weight}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl">
                            <span className="text-xs text-slate-400">Markah:</span>
                            <input
                              type="number"
                              min={0}
                              max={maxScore}
                              step={1}
                              value={currentScore}
                              onChange={(e) => {
                                const val = Math.min(maxScore, Math.max(0, Number(e.target.value) || 0));
                                setCriterionScores((prev) => ({ ...prev, [r.id]: val }));
                              }}
                              className="w-14 bg-transparent text-right font-mono font-bold text-indigo-400 focus:outline-none text-sm"
                            />
                            <span className="text-xs text-slate-500">/ {maxScore}</span>
                          </div>
                        </div>

                        {/* Interactive Controls: Range Slider */}
                        <div className="space-y-2">
                          <input
                            type="range"
                            min={0}
                            max={maxScore}
                            step={1}
                            value={currentScore}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setCriterionScores((prev) => ({ ...prev, [r.id]: val }));
                            }}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />

                          {/* Quick Rating Preset Buttons */}
                          <div className="flex items-center justify-between gap-1 pt-1">
                            {presets.map((p) => {
                              const isActive = currentScore === p.val;
                              return (
                                <button
                                  key={p.label}
                                  type="button"
                                  onClick={() =>
                                    setCriterionScores((prev) => ({ ...prev, [r.id]: p.val }))
                                  }
                                  className={`flex-1 py-1 text-[11px] font-medium rounded-lg border transition-all ${
                                    isActive
                                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                                  }`}
                                >
                                  {p.label} ({p.val})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* General Comments */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>Ulasan & Cadangan Penambahbaikan (Pilihan)</span>
                </label>
                <textarea
                  rows={3}
                  value={generalComments}
                  onChange={(e) => setGeneralComments(e.target.value)}
                  placeholder="Berikan maklum balas atau ulasan ringkas mengenai inovasi/projek ini..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4 sticky bottom-0 bg-slate-900 py-3 z-10">
                <button
                  type="button"
                  onClick={() => setEvalParticipant(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Batal
                </button>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Jumlah Markah</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {liveModalTotalScore} / {maxPossibleTotal}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingScores}
                    className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSubmittingScores ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Hantar Pemarkahan Juri</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* IMAGE LIGHTBOX MODAL */}
      {/* ----------------------------------------------------------------------- */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white truncate pr-4">{lightboxImage.title}</h3>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
