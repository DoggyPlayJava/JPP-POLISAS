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
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Trophy,
  HelpCircle,
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

interface RubricSection {
  id: string;
  name: string;
  weight: number;
  rubrics: EmsRubricCriteria[];
}

const LIKERT_OPTIONS = [
  {
    value: 5,
    label: '5 - Excellent',
    icon: '🌟',
    shortText: 'Excellent (5/5)',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30',
    activeBg: 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-600/30',
    defaultDescriptor: 'Cemerlang 🌟 - Prestasi luar biasa, sangat kreatif, inovatif dan memenuhi semua kriteria kualiti tertinggi.',
  },
  {
    value: 4,
    label: '4 - Good',
    icon: '👍',
    shortText: 'Good (4/5)',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30',
    activeBg: 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/50 shadow-lg shadow-blue-600/30',
    defaultDescriptor: 'Baik 👍 - Memenuhi kriteria dengan kualiti tinggi, kemas dan penyampaian yang meyakinkan.',
  },
  {
    value: 3,
    label: '3 - Satisfactory',
    icon: '👌',
    shortText: 'Satisfactory (3/5)',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30',
    activeBg: 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-500/50 shadow-lg shadow-amber-600/30',
    defaultDescriptor: 'Memuaskan 👌 - Memenuhi kriteria asas pada tahap yang memuaskan dan wajar diterima.',
  },
  {
    value: 2,
    label: '2 - Fair',
    icon: '⚠️',
    shortText: 'Fair (2/5)',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30',
    activeBg: 'bg-orange-600 text-white border-orange-400 ring-2 ring-orange-500/50 shadow-lg shadow-orange-600/30',
    defaultDescriptor: 'Sederhana ⚠️ - Memerlukan penambahbaikan pada beberapa aspek penting.',
  },
  {
    value: 1,
    label: '1 - Poor',
    icon: '❌',
    shortText: 'Poor (1/5)',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30',
    activeBg: 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-500/50 shadow-lg shadow-rose-600/30',
    defaultDescriptor: 'Lemah ❌ - Tidak memenuhi kriteria asas atau terdapat kelemahan ketara.',
  },
];

export const getParticipantCategory = (p: EmsParticipant): string => {
  return (
    p.category_name?.trim() ||
    (p.custom_responses?.category as string)?.trim() ||
    (p.custom_responses?.category_name as string)?.trim() ||
    (p.custom_responses?.kategori as string)?.trim() ||
    ''
  );
};

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modal / Evaluation Wizard State
  const [evalParticipant, setEvalParticipant] = useState<EmsParticipant | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [criterionScores, setCriterionScores] = useState<Record<string, number>>({});
  const [hoveredScores, setHoveredScores] = useState<Record<string, number | null>>({});
  const [generalComments, setGeneralComments] = useState<string>('');
  const [isSubmittingScores, setIsSubmittingScores] = useState<boolean>(false);

  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Compute active participant category for evaluation wizard
  const activeParticipantCategory = selectedCategory
    ? selectedCategory
    : evalParticipant
    ? getParticipantCategory(evalParticipant) || ''
    : '';

  // Set of rubric category names (category_name dari ems_rubrics) — utk bezakan
  // assignment "kategori rubrik" (penilaian) vs "kategori peserta" (booth/makanan)
  const rubricCategoryNames = useMemo(() => {
    const s = new Set<string>();
    (rubrics || []).forEach((r) => {
      const n = r.category_name?.trim().toLowerCase();
      if (n && n !== 'umum') s.add(n);
    });
    return s;
  }, [rubrics]);

  // Filter rubrics strictly for the active participant category or general rubrics ('Umum' or empty category_name)
  const participantRubrics = useMemo(() => {
    if (!rubrics || rubrics.length === 0) return [];

    // 1. Kategori RUBRIK dipilih (cth "Best Showcase Award") → tunjuk rubrik kategori
    //    tu SAHAJA. Dulu juri yang di-assign 2 kategori nampak rubrik kedua-duanya
    //    bercampur + seksyen "Seksyen 1/2/3" bergabung silang kategori.
    const selCat = activeParticipantCategory?.trim().toLowerCase();
    if (selCat && rubricCategoryNames.has(selCat)) {
      const filtered = rubrics.filter((r) => {
        const rCat = r.category_name?.trim().toLowerCase();
        return !rCat || rCat === 'umum' || rCat === selCat;
      });
      return filtered.length > 0 ? filtered : rubrics;
    }

    // Jika kod juri ditugaskan kategori RUBRIK (cth "Best Pitching") → score HANYA rubrik kategori itu
    const assignedCats = juryCodeData?.assigned_categories;
    if (assignedCats && assignedCats.length > 0 && !assignedCats.includes('ALL')) {
      const catSet = assignedCats.map((c) => c.trim().toLowerCase()).filter(Boolean);
      const hasRubricScope = catSet.some((c) => rubricCategoryNames.has(c));
      if (hasRubricScope) {
        const scoped = rubrics.filter((r) => {
          const rCat = r.category_name?.trim().toLowerCase();
          return !rCat || rCat === 'umum' || catSet.includes(rCat);
        });
        return scoped.length > 0 ? scoped : rubrics;
      }
    }

    if (!activeParticipantCategory) return rubrics;

    const catClean = activeParticipantCategory.trim().toLowerCase();
    const filtered = rubrics.filter((r) => {
      const rCat = r.category_name?.trim().toLowerCase();
      return !rCat || rCat === 'umum' || rCat === catClean;
    });

    return filtered.length > 0 ? filtered : rubrics;
  }, [rubrics, activeParticipantCategory, juryCodeData, rubricCategoryNames]);

  // Group active rubrics by section_name (fallback to 'Penilaian Utama')
  const sections = useMemo<RubricSection[]>(() => {
    if (!participantRubrics || participantRubrics.length === 0) return [];
    const map = new Map<string, EmsRubricCriteria[]>();
    participantRubrics.forEach((r) => {
      const secName = r.section_name?.trim() || 'Penilaian Utama';
      if (!map.has(secName)) {
        map.set(secName, []);
      }
      map.get(secName)!.push(r);
    });

    return Array.from(map.entries()).map(([name, items], idx) => {
      const weight = items.reduce((acc, r) => acc + Number(r.weight || 0), 0);
      return {
        id: `sec-${idx}`,
        name,
        weight,
        rubrics: items,
      };
    });
  }, [participantRubrics]);

  // Compute live total weighted score (0 to 100%)
  const liveTotalWeightedScore = useMemo(() => {
    if (!participantRubrics || participantRubrics.length === 0) return 0;
    const totalWeightSum = participantRubrics.reduce((acc, r) => acc + (Number(r.weight) || 0), 0);
    const rawWeighted = participantRubrics.reduce((acc, r) => {
      const scoreVal = criterionScores[r.id] ?? 0;
      const maxVal = Number(r.max_score) || 5;
      const weightVal = Number(r.weight) || 0;
      return acc + (scoreVal / maxVal) * weightVal;
    }, 0);

    if (totalWeightSum > 0 && Math.abs(totalWeightSum - 100) > 0.01) {
      return (rawWeighted / totalWeightSum) * 100;
    }
    return rawWeighted;
  }, [participantRubrics, criterionScores]);

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
    setSelectedCategory(null);
    toast.success('Anda telah log keluar daripada sesi juri.');
  };

  // Filter participants according to jury code assignments (categories & booths)
  const assignedParticipants = useMemo(() => {
    if (!participants || !juryCodeData) return [];

    const assignedCats = juryCodeData.assigned_categories;
    const assignedBooths = juryCodeData.assigned_booths;

    return participants.filter((p) => {
      // Category filter match — HANYA utk kategori peserta (booth/makanan). Kalau
      // assigned_categories ialah kategori RUBRIK (penilaian), jangan tapis peserta —
      // juri tu score semua booth utk rubrik yang ditugaskan.
      let matchCat = true;
      if (assignedCats && assignedCats.length > 0 && !assignedCats.includes('ALL')) {
        const isRubricScope = assignedCats.some((c) =>
          rubricCategoryNames.has(c.trim().toLowerCase())
        );
        if (!isRubricScope) {
          const pCategory = getParticipantCategory(p);
          if (pCategory !== '') {
            matchCat = assignedCats.some(
              (c) => c.toLowerCase() === pCategory.toLowerCase()
            );
          }
        }
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

  // Extract unique available categories from event's rubrics (r.category_name) and participants (via getParticipantCategory)
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    if (rubrics) {
      rubrics.forEach((r) => {
        if (r.category_name && r.category_name.trim()) {
          cats.add(r.category_name.trim());
        }
      });
    }
    if (assignedParticipants) {
      assignedParticipants.forEach((p) => {
        const cat = getParticipantCategory(p);
        if (cat) cats.add(cat);
      });
    }

    let result = Array.from(cats);

    const assignedCats = juryCodeData?.assigned_categories;
    if (assignedCats && assignedCats.length > 0 && !assignedCats.includes('ALL')) {
      result = result.filter((catName) =>
        assignedCats.some((ac) => ac.trim().toLowerCase() === catName.trim().toLowerCase())
      );
    }

    return result;
  }, [rubrics, assignedParticipants, juryCodeData]);

  // Next Category switcher logic for 1-click category switching
  const nextCategory = useMemo(() => {
    if (!selectedCategory || availableCategories.length <= 1) return null;
    const currIdx = availableCategories.findIndex(
      (c) => c.toLowerCase() === selectedCategory.toLowerCase()
    );
    if (currIdx === -1) return availableCategories[0];
    const nextIdx = (currIdx + 1) % availableCategories.length;
    return availableCategories[nextIdx];
  }, [selectedCategory, availableCategories]);

  // Icon selector for category card titles
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('pitch') || name.includes('persembahan') || name.includes('pembentangan')) return '🎤';
    if (name.includes('showcase') || name.includes('pameran') || name.includes('booth')) return '📦';
    if (name.includes('poster') || name.includes('grafik')) return '🖼️';
    if (name.includes('video') || name.includes('media')) return '🎬';
    if (name.includes('inovasi') || name.includes('produk') || name.includes('projek')) return '🚀';
    return '🏆';
  };

  // Further filter participants based on selectedCategory, search query, status filter, and category tab
  const filteredParticipants = useMemo(() => {
    return assignedParticipants.filter((p) => {
      const pCat = getParticipantCategory(p);

      // Selected Category Gateway Filter
      if (selectedCategory !== null) {
        // Kategori RUBRIK (penilaian) → jangan tapis peserta ikut kategori makanan
        const isRubricCat = rubricCategoryNames.has(selectedCategory.trim().toLowerCase());
        if (!isRubricCat && pCat !== '' && pCat.toLowerCase() !== selectedCategory.trim().toLowerCase()) return false;
      } else if (categoryFilter !== 'ALL') {
        if (pCat !== '' && pCat.toLowerCase() !== categoryFilter.trim().toLowerCase()) return false;
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
  }, [assignedParticipants, selectedCategory, categoryFilter, searchQuery, statusFilter, scores]);

  // Calculate overall maximum possible rubric score sum
  const maxPossibleTotal = useMemo(() => {
    return rubrics.reduce((acc, r) => acc + Number(r.max_score || 0), 0);
  }, [rubrics]);

  // Open Evaluation Modal for a Participant
  const openEvaluationModal = (participant: EmsParticipant) => {
    setEvalParticipant(participant);
    setCurrentStepIndex(0);
    setHoveredScores({});

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
      const scoresPayload = participantRubrics.map((r) => ({
        event_id: eventData.id,
        participant_id: evalParticipant.id,
        jury_code_id: juryCodeData.id,
        rubric_id: r.id,
        score: Number(criterionScores[r.id] || 0),
        comments: generalComments.trim(),
      }));

      await submitJuryScore(scoresPayload);
      toast.success(`Pemarkahan juri untuk ${evalParticipant.team_name || evalParticipant.leader_name} berjaya disimpan!`);

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

      {/* Main Dashboard / Gateway Content */}
      {availableCategories.length > 1 && selectedCategory === null ? (
        /* HUB PEMILIHAN KATEGORI PENILAIAN JURI (Category Selection Gateway) */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
          <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Hub Pemilihan Kategori Penilaian Juri</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Pilih Kategori Penilaian Juri
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Sesi juri anda mempunyai {availableCategories.length} kategori penilaian. Sila pilih kategori di bawah untuk mula membuat penilaian peserta dan booth.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  <span>Jumlah Peserta: <strong className="text-white">{assignedParticipants.length}</strong></span>
                </span>
                <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span>Jumlah Kategori: <strong className="text-white">{availableCategories.length}</strong></span>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-400" />
              <span>Kategori Penilaian Tersedia ({availableCategories.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableCategories.map((cat) => {
                const catIcon = getCategoryIcon(cat);
                const catParticipants = assignedParticipants.filter((p) => {
                  // Kategori RUBRIK (penilaian) → semua booth dinilai, jangan tapis ikut kategori makanan
                  const isRubricCat = rubricCategoryNames.has(cat.trim().toLowerCase());
                  if (isRubricCat) return true;
                  const pCat = getParticipantCategory(p);
                  return pCat === '' || pCat.toLowerCase() === cat.trim().toLowerCase();
                });
                const catParticipantsCount = catParticipants.length;
                const catScoredCount = catParticipants.filter((p) =>
                  scores.some((s) => s.participant_id === p.id)
                ).length;

                const catRubrics = rubrics.filter(
                  (r) =>
                    !r.category_name ||
                    r.category_name.trim().toLowerCase() === cat.trim().toLowerCase()
                );
                const catRubricsCount = catRubrics.length;
                const catSectionsCount = new Set(
                  catRubrics.map((r) => r.section_name?.trim() || 'Penilaian Utama')
                ).size;

                const progressPct =
                  catParticipantsCount > 0
                    ? Math.round((catScoredCount / catParticipantsCount) * 100)
                    : 0;

                return (
                  <div
                    key={cat}
                    className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/10 group"
                  >
                    <div className="space-y-5">
                      {/* Category Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600/30 to-violet-600/30 border border-indigo-500/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                            {catIcon}
                          </div>
                          <div>
                            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">
                              Kategori Penilaian
                            </span>
                            <h4 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                              {cat}
                            </h4>
                          </div>
                        </div>
                      </div>

                      {/* Number of Participants & Rubriks/Seksyen */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Bil. Peserta / Booth</span>
                          <span className="font-bold text-white text-sm font-mono">
                            {catParticipantsCount} Peserta
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Rubrik & Seksyen</span>
                          <span className="font-bold text-indigo-300 text-sm font-mono">
                            {catRubricsCount} Rubrik ({catSectionsCount} Seksyen)
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Kemajuan Penilaian:</span>
                          <span className="font-bold font-mono text-emerald-400">
                            {catScoredCount}/{catParticipantsCount} ({progressPct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Masuk Penilaian ➔ Button */}
                    <div className="mt-6 pt-4 border-t border-slate-800/80">
                      <button
                        onClick={() => setSelectedCategory(cat)}
                        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all group-hover:gap-3"
                      >
                        <span>Masuk Penilaian ➔</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      ) : (
        /* PARTICIPANT LIST & EVALUATION DASHBOARD */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* Category Header Bar & Next Category Switcher */}
          {selectedCategory !== null && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
              <div className="flex flex-wrap items-center gap-3">
                {availableCategories.length > 1 && (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>← Tukar Kategori</span>
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Kategori Penilaian Semasa:</span>
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5">
                    <span>{getCategoryIcon(selectedCategory)}</span>
                    <span>{selectedCategory}</span>
                  </span>
                </div>
              </div>

              {nextCategory && (
                <button
                  onClick={() => setSelectedCategory(nextCategory)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all shrink-0 self-start md:self-auto hover:scale-105"
                >
                  <span>⏩ Penilaian Kategori Seterusnya: {nextCategory} ➔</span>
                </button>
              )}
            </div>
          )}

          {/* Prominent Action Button (Top) */}
          {nextCategory && selectedCategory !== null && (
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedCategory(nextCategory)}
                className="w-full sm:w-auto py-2.5 px-5 bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <span>⏩ Penilaian Kategori Seterusnya: {nextCategory} ➔</span>
              </button>
            </div>
          )}

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

            {/* Category Tabs (if multiple categories present and Gateway not active) */}
            {availableCategories.length > 1 && selectedCategory !== null && (
              <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-800/80 no-scrollbar">
                <span className="text-xs text-slate-500 font-medium shrink-0 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Tukar Kategori Cepat:
                </span>
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 text-xs rounded-full font-medium transition-all shrink-0 flex items-center gap-1 ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white border border-indigo-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span>{getCategoryIcon(cat)}</span>
                    <span>{cat}</span>
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
                {searchQuery || statusFilter !== 'ALL' || selectedCategory !== null
                  ? 'Tiada peserta yang sepadan dengan tapisan atau kata kunci carian anda.'
                  : 'Tiada peserta yang diagihkan di bawah kategori / booth kod juri anda.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredParticipants.map((participant) => {
                const pScores = scores.filter((s) => s.participant_id === participant.id);
                const isScored = pScores.length > 0;

                // Calculate total raw awarded score & weighted score %
                const awardedScore = rubrics.reduce((acc, r) => {
                  const s = pScores.find((sc) => sc.rubric_id === r.id);
                  return acc + (s ? Number(s.score || 0) : 0);
                }, 0);

                const totalWeightSum = rubrics.reduce((acc, r) => acc + (Number(r.weight) || 0), 0);
                const rawWeighted = rubrics.reduce((acc, r) => {
                  const s = pScores.find((sc) => sc.rubric_id === r.id);
                  const scoreVal = s ? Number(s.score || 0) : 0;
                  const max = Number(r.max_score || 5);
                  const weight = Number(r.weight || 0);
                  return acc + (scoreVal / max) * weight;
                }, 0);

                const weightedPercentage = totalWeightSum > 0 && Math.abs(totalWeightSum - 100) > 0.01
                  ? (rawWeighted / totalWeightSum) * 100
                  : rawWeighted;

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
                          {getParticipantCategory(participant) && (
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[11px] font-medium rounded-md truncate max-w-[120px]">
                              {getParticipantCategory(participant)}
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        {isScored ? (
                          <span className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold rounded-full flex items-center gap-1 shrink-0 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{weightedPercentage.toFixed(1)}% ({awardedScore}/{maxPossibleTotal})</span>
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
                        <span>{isScored ? 'Kemaskini Pemarkahan Wizard' : 'Buka Wizard Penilaian Juri'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Prominent Action Button (Bottom) */}
          {nextCategory && filteredParticipants.length > 0 && (
            <div className="pt-6 border-t border-slate-800/80 flex justify-center">
              <button
                onClick={() => setSelectedCategory(nextCategory)}
                className="py-3.5 px-7 bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-bold rounded-2xl shadow-xl shadow-purple-600/25 flex items-center gap-2.5 transition-all hover:scale-105"
              >
                <span>⏩ Penilaian Kategori Seterusnya: {nextCategory} ➔</span>
              </button>
            </div>
          )}
        </main>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* SCREEN 3: STEP-BY-STEP JURY EVALUATION WIZARD MODAL */}
      {/* ----------------------------------------------------------------------- */}
      {evalParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex justify-center items-end sm:items-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Modal Top Header: Participant Summary */}
            <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex items-start justify-between gap-4 sticky top-0 z-20">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {evalParticipant.booth_no && (
                    <span className="px-2.5 py-0.5 bg-indigo-600 text-white font-mono text-xs font-bold rounded-md">
                      BOOTH #{evalParticipant.booth_no}
                    </span>
                  )}
                  {getParticipantCategory(evalParticipant) && (
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs font-medium rounded-md">
                      {getParticipantCategory(evalParticipant)}
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
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
                title="Tutup Wizard"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar & Active Section Sub-Header */}
            {sections.length > 0 && (
              <div className="bg-slate-900 border-b border-slate-800 p-4 sm:px-6 space-y-3 shrink-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-mono font-bold flex items-center justify-center">
                      {currentStepIndex + 1}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
                      {currentStepIndex < sections.length ? (
                        <>
                          Langkah {currentStepIndex + 1} daripada {sections.length + 1}:{' '}
                          <span className="text-indigo-400">{sections[currentStepIndex].name}</span>{' '}
                          <span className="text-slate-400 font-normal">({sections[currentStepIndex].weight}%)</span>
                        </>
                      ) : (
                        <>
                          Langkah {sections.length + 1} daripada {sections.length + 1}:{' '}
                          <span className="text-emerald-400">Ringkasan & Pengesahan</span>
                        </>
                      )}
                    </h3>
                  </div>

                  {/* Live Total Weighted Score Badge */}
                  <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-950 to-violet-950 border border-indigo-500/30 px-3.5 py-1.5 rounded-xl shadow-inner">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-xs text-slate-300">Jumlah Markah Terkumpul:</span>
                    <span className="text-sm font-black font-mono text-emerald-400">
                      {liveTotalWeightedScore.toFixed(1)} / 100%
                    </span>
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full transition-all duration-300"
                    style={{
                      width: `${Math.round(((currentStepIndex + 1) / (sections.length + 1)) * 100)}%`,
                    }}
                  />
                </div>

                {/* Step Tabs Indicator */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
                  {sections.map((sec, idx) => {
                    const isCurrent = currentStepIndex === idx;
                    const isSecComplete = sec.rubrics.every((r) => (criterionScores[r.id] || 0) > 0);
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setCurrentStepIndex(idx)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                            : isSecComplete
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {isSecComplete ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                        )}
                        <span className="truncate max-w-[120px]">{sec.name}</span>
                      </button>
                    );
                  })}
                  {/* Summary Step Tab */}
                  <button
                    type="button"
                    onClick={() => setCurrentStepIndex(sections.length)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                      currentStepIndex === sections.length
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span>Ringkasan</span>
                  </button>
                </div>
              </div>
            )}

            {/* Modal Form Content */}
            <form onSubmit={handleRubricSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {participantRubrics.length === 0 ? (
                <div className="p-8 bg-slate-950/60 rounded-2xl border border-slate-800 text-center text-slate-400 text-sm space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p>Tiada kriteria penilaian rubrik ditetap oleh Pengarah Program untuk acara ini.</p>
                </div>
              ) : currentStepIndex < sections.length ? (
                /* SECTION STEP CONTENT */
                <div className="space-y-6">
                  {/* Section Title & Description Banner */}
                  <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-indigo-400" />
                        <span>{sections[currentStepIndex].name}</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Mengandungi {sections[currentStepIndex].rubrics.length} kriteria penilaian dalam seksyen ini.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold font-mono">
                      Pemberat Seksyen: {sections[currentStepIndex].weight}%
                    </span>
                  </div>

                  {/* Rubric Criteria Items in Active Section */}
                  <div className="space-y-6">
                    {sections[currentStepIndex].rubrics.map((r, rIndex) => {
                      const selectedVal = criterionScores[r.id] || 0;
                      const hoveredVal = hoveredScores[r.id];
                      const activeDisplayVal = hoveredVal || selectedVal;
                      const maxScore = Number(r.max_score || 5);
                      const weight = Number(r.weight || 0);

                      // Determine active descriptor text
                      const activeOption = LIKERT_OPTIONS.find((opt) => opt.value === activeDisplayVal);
                      const activeDescriptorText =
                        (activeDisplayVal > 0 && r.descriptors?.[String(activeDisplayVal)]) ||
                        activeOption?.defaultDescriptor ||
                        'Sila pilih satu skor di atas.';

                      return (
                        <div
                          key={r.id}
                          className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all shadow-md"
                        >
                          {/* Criterion Header & Weight Badge */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                            <div className="flex items-start gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {rIndex + 1}
                              </span>
                              <div>
                                <h4 className="text-sm sm:text-base font-bold text-white">
                                  {r.criteria_name}
                                </h4>
                                {r.category_name && (
                                  <span className="text-[11px] text-indigo-300 font-medium block">
                                    Sub-Kategori: {r.category_name}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <span className="px-2.5 py-1 bg-slate-900 text-indigo-300 border border-slate-800 text-xs font-semibold rounded-lg font-mono">
                                Pemberat: {weight}%
                              </span>
                              {selectedVal > 0 && (
                                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-lg font-mono flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>
                                    {selectedVal}/{maxScore} ({((selectedVal / maxScore) * weight).toFixed(1)}%)
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 5-Point Likert Rating Buttons */}
                          <div className="space-y-3">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              Pilih Skor Likert (1 - 5):
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                              {LIKERT_OPTIONS.map((option) => {
                                const isSelected = selectedVal === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                      setCriterionScores((prev) => ({ ...prev, [r.id]: option.value }))
                                    }
                                    onMouseEnter={() =>
                                      setHoveredScores((prev) => ({ ...prev, [r.id]: option.value }))
                                    }
                                    onMouseLeave={() =>
                                      setHoveredScores((prev) => ({ ...prev, [r.id]: null }))
                                    }
                                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1.5 text-center ${
                                      isSelected
                                        ? option.activeBg
                                        : `${option.badgeColor} hover:scale-[1.02]`
                                    }`}
                                  >
                                    <span className="text-lg">{option.icon}</span>
                                    <span className="leading-tight">{option.label}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Live Descriptor Box */}
                            {activeDisplayVal > 0 ? (
                              <div className="mt-3 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span>Deskriptor Skor {activeDisplayVal}: {activeOption?.shortText}</span>
                                  </span>
                                  {hoveredVal && hoveredVal !== selectedVal && (
                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                      Pratonton (Hover)
                                    </span>
                                  )}
                                  {selectedVal === activeDisplayVal && !hoveredVal && (
                                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                      Pilihan Semasa
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-200 leading-relaxed pl-5 italic">
                                  "{activeDescriptorText}"
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 italic pt-1">
                                * Sila klik salah satu butang di atas untuk memberikan pemarkahan.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Section Step Navigation Footer */}
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      disabled={currentStepIndex === 0}
                      onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Kembali</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentStepIndex((prev) => Math.min(sections.length, prev + 1))}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
                    >
                      <span>Seterusnya</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* FINAL SUMMARY STEP CONTENT */
                <div className="space-y-6">
                  {/* Hero Score Badge Card */}
                  <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-6 text-center space-y-3 relative overflow-hidden shadow-xl">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center mx-auto text-amber-400 mb-2">
                      <Trophy className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block">
                      Jumlah Markah Terkumpul Keseluruhan
                    </span>
                    <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 tracking-tight">
                      {liveTotalWeightedScore.toFixed(1)} <span className="text-2xl text-slate-400 font-normal">/ 100%</span>
                    </div>

                    {/* Status Pill */}
                    <div className="pt-1">
                      {liveTotalWeightedScore >= 80 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4" /> Pemarkahan Cemerlang 🎉
                        </span>
                      ) : liveTotalWeightedScore >= 60 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          <CheckCircle2 className="w-4 h-4" /> Pemarkahan Baik 👍
                        </span>
                      ) : liveTotalWeightedScore >= 40 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <AlertCircle className="w-4 h-4" /> Pemarkahan Sederhana ⚠️
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <AlertCircle className="w-4 h-4" /> Memerlukan Penambahbaikan ❌
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Section Breakdown Table */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      <span>Ringkasan Pecahan Pemarkahan Mengikut Seksyen</span>
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300 border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                            <th className="p-3 rounded-l-xl">Nama Seksyen</th>
                            <th className="p-3 text-center">Bil. Kriteria</th>
                            <th className="p-3 text-center">Pemberat Seksyen</th>
                            <th className="p-3 text-right">Sumbangan Markah</th>
                            <th className="p-3 text-center rounded-r-xl">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {sections.map((sec, idx) => {
                            const secWeightedScore = sec.rubrics.reduce((acc, r) => {
                              const scoreVal = criterionScores[r.id] || 0;
                              const maxVal = Number(r.max_score) || 5;
                              const weightVal = Number(r.weight) || 0;
                              return acc + (scoreVal / maxVal) * weightVal;
                            }, 0);

                            const ratedCount = sec.rubrics.filter((r) => (criterionScores[r.id] || 0) > 0).length;
                            const isComplete = ratedCount === sec.rubrics.length;

                            return (
                              <tr key={sec.id} className="hover:bg-slate-900/50 transition-colors">
                                <td className="p-3 font-semibold text-white">
                                  #{idx + 1}. {sec.name}
                                </td>
                                <td className="p-3 text-center font-mono text-slate-400">
                                  {sec.rubrics.length}
                                </td>
                                <td className="p-3 text-center font-mono font-semibold text-indigo-300">
                                  {sec.weight}%
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                  {secWeightedScore.toFixed(1)}%
                                </td>
                                <td className="p-3 text-center">
                                  {isComplete ? (
                                    <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full inline-flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Lengkap
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold rounded-full">
                                      {ratedCount}/{sec.rubrics.length} Dinilai
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* General Comments Textarea */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      <span>Ulasan & Cadangan Penambahbaikan (Pilihan Juri)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={generalComments}
                      onChange={(e) => setGeneralComments(e.target.value)}
                      placeholder="Masukkan ulasan keseluruhan, pujian, atau cadangan penambahbaikan untuk peserta ini..."
                      className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                    />
                  </div>

                  {/* Summary Step Navigation & Final Submission Footer */}
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4 sticky bottom-0 bg-slate-900 py-3 z-10">
                    <button
                      type="button"
                      onClick={() => setCurrentStepIndex(sections.length - 1)}
                      className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Kembali ke Seksyen Terakhir</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmittingScores}
                      className="py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isSubmittingScores ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Menyimpan Pemarkahan...</span>
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
              )}
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

