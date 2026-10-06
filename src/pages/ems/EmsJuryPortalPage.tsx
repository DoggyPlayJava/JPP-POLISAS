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
  User,
  UserCheck,
  X,
  Eye,
  ChevronRight,
  Send,
  ArrowRight,
  Check,
  AlertCircle,
  HelpCircle,
  FileText,
  ExternalLink,
  Mic,
  Package,
  Video,
  Rocket,
  XCircle,
  MinusCircle,
  ThumbsUp,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  verifyJuryCode,
  submitJuryScore,
  createJuryDraftKey,
  serializeJuryDraft,
  deserializeJuryDraft,
  findNextUnscoredParticipant,
} from '@/lib/ems';
import { supabase } from '@/lib/supabase';
import type { EmsEvent, EmsJuryCode, EmsParticipant, EmsRubricCriteria, EmsScore } from '@/types';

export interface JurySession {
  code: string;
  jury_name: string;
  organization: string;
  event_id: string;
}

export interface RubricSection {
  id: string;
  name: string;
  weight: number;
  rubrics: EmsRubricCriteria[];
}

export interface LikertOptionItem {
  value: number;
  label: string;
  shortText: string;
  icon: React.ComponentType<{ className?: string }>;
  iconName: string;
  badgeColor: string;
  activeBg: string;
  defaultDescriptor: string;
}

export const LIKERT_OPTIONS: LikertOptionItem[] = [
  {
    value: 5,
    label: '5 - Cemerlang',
    shortText: 'Cemerlang (5/5)',
    icon: Sparkles,
    iconName: 'Sparkles',
    badgeColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
    activeBg: 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/60 shadow-lg shadow-emerald-600/30',
    defaultDescriptor: 'Cemerlang - Prestasi luar biasa, sangat kreatif, inovatif dan memenuhi semua kriteria kualiti tertinggi.',
  },
  {
    value: 4,
    label: '4 - Baik',
    shortText: 'Baik (4/5)',
    icon: ThumbsUp,
    iconName: 'ThumbsUp',
    badgeColor: 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-500/50 hover:bg-blue-100 dark:hover:bg-blue-900/50',
    activeBg: 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/60 shadow-lg shadow-blue-600/30',
    defaultDescriptor: 'Baik - Memenuhi kriteria dengan kualiti tinggi, kemas dan penyampaian yang meyakinkan.',
  },
  {
    value: 3,
    label: '3 - Memuaskan',
    shortText: 'Memuaskan (3/5)',
    icon: MinusCircle,
    iconName: 'MinusCircle',
    badgeColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/50 hover:bg-amber-100 dark:hover:bg-amber-900/50',
    activeBg: 'bg-amber-600 text-white border-amber-400 ring-2 ring-amber-500/60 shadow-lg shadow-amber-600/30',
    defaultDescriptor: 'Memuaskan - Memenuhi kriteria asas pada tahap yang memuaskan dan wajar diterima.',
  },
  {
    value: 2,
    label: '2 - Sederhana',
    shortText: 'Sederhana (2/5)',
    icon: AlertCircle,
    iconName: 'AlertCircle',
    badgeColor: 'bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-500/50 hover:bg-orange-100 dark:hover:bg-orange-900/50',
    activeBg: 'bg-orange-600 text-white border-orange-400 ring-2 ring-orange-500/60 shadow-lg shadow-orange-600/30',
    defaultDescriptor: 'Sederhana - Memerlukan penambahbaikan pada beberapa aspek penting.',
  },
  {
    value: 1,
    label: '1 - Lemah',
    shortText: 'Lemah (1/5)',
    icon: XCircle,
    iconName: 'XCircle',
    badgeColor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/50 hover:bg-rose-100 dark:hover:bg-rose-900/50',
    activeBg: 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-500/60 shadow-lg shadow-rose-600/30',
    defaultDescriptor: 'Lemah - Tidak memenuhi kriteria asas atau terdapat kelemahan ketara.',
  },
];

export const getParticipantCategory = (p: EmsParticipant): string => {
  return (
    p.category_name?.trim() ||
    (p.custom_responses as Record<string, any>)?.category?.toString().trim() ||
    (p.custom_responses as Record<string, any>)?.category_name?.toString().trim() ||
    (p.custom_responses as Record<string, any>)?.kategori?.toString().trim() ||
    ''
  );
};

export const getCategoryIcon = (categoryName: string): React.ComponentType<{ className?: string }> => {
  const name = categoryName.toLowerCase();
  if (name.includes('pitch') || name.includes('persembahan') || name.includes('pembentangan')) return Mic;
  if (name.includes('showcase') || name.includes('pameran') || name.includes('booth')) return Package;
  if (name.includes('poster') || name.includes('grafik')) return ImageIcon;
  if (name.includes('video') || name.includes('media')) return Video;
  if (name.includes('inovasi') || name.includes('produk') || name.includes('projek')) return Rocket;
  return Award;
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
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal / Seamless Touch Feed Evaluation State
  const [evalParticipant, setEvalParticipant] = useState<EmsParticipant | null>(null);
  const [isDraftSaved, setIsDraftSaved] = useState<boolean>(false);
  const [criterionScores, setCriterionScores] = useState<Record<string, number>>({});
  const [hoveredScores, setHoveredScores] = useState<Record<string, number | null>>({});
  const [generalComments, setGeneralComments] = useState<string>('');
  const [isSubmittingScores, setIsSubmittingScores] = useState<boolean>(false);

  // Post-Scoring Celebration & Next Booth Transition Drawer State
  const [celebrationModal, setCelebrationModal] = useState<{
    participant: EmsParticipant;
    weightedScore: number;
    nextParticipant: EmsParticipant | null;
  } | null>(null);

  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Compute active participant category for evaluation
  const activeParticipantCategory = evalParticipant
    ? getParticipantCategory(evalParticipant) || (selectedCategory !== 'ALL' ? selectedCategory : '')
    : selectedCategory !== 'ALL'
    ? selectedCategory
    : '';

  // Filter participants according to jury code assignments (categories & booths)
  const assignedParticipants = useMemo(() => {
    if (!participants || !juryCodeData) return [];

    const assignedCats = juryCodeData.assigned_categories;
    const assignedBooths = juryCodeData.assigned_booths;

    return participants.filter((p) => {
      let matchCat = true;
      if (assignedCats && assignedCats.length > 0 && !assignedCats.includes('ALL')) {
        const assignedCatsClean = assignedCats.map((c) => c.trim().toLowerCase());
        const pCategory = getParticipantCategory(p).trim().toLowerCase();

        const hasMatchingParticipantCategory = participants.some((part) =>
          assignedCatsClean.includes(getParticipantCategory(part).trim().toLowerCase())
        );

        if (hasMatchingParticipantCategory) {
          matchCat = assignedCatsClean.includes(pCategory);
        } else {
          matchCat = true;
        }
      }

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

  // Extract unique available categories
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

  // Set of rubric category names
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

    const selCat = activeParticipantCategory?.trim().toLowerCase();
    if (selCat && rubricCategoryNames.has(selCat)) {
      const filtered = rubrics.filter((r) => {
        const rCat = r.category_name?.trim().toLowerCase();
        return !rCat || rCat === 'umum' || rCat === selCat;
      });
      return filtered.length > 0 ? filtered : rubrics;
    }

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

  // Group active rubrics by section_name
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

  // Completion metrics for sticky bottom action bar
  const totalCriteriaCount = participantRubrics.length;
  const completedCriteriaCount = useMemo(() => {
    return participantRubrics.filter((r) => (criterionScores[r.id] || 0) > 0).length;
  }, [participantRubrics, criterionScores]);

  const isAllCriteriaCompleted = totalCriteriaCount > 0 && completedCriteriaCount >= totalCriteriaCount;
  const progressPercentage = totalCriteriaCount > 0 ? Math.round((completedCriteriaCount / totalCriteriaCount) * 100) : 0;

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
    setSelectedCategory('ALL');
    setCelebrationModal(null);
    toast.success('Anda telah log keluar daripada sesi juri.');
  };

  // Further filter participants based on selectedCategory, search query, and status filter
  const filteredParticipants = useMemo(() => {
    return assignedParticipants.filter((p) => {
      const pCat = getParticipantCategory(p);

      // Selected Category Pill Filter
      if (selectedCategory !== 'ALL') {
        const selCatClean = selectedCategory.trim().toLowerCase();
        const hasSpecificParticipants = assignedParticipants.some(
          (part) => getParticipantCategory(part).trim().toLowerCase() === selCatClean
        );

        if (hasSpecificParticipants) {
          if (pCat.trim().toLowerCase() !== selCatClean) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const booth = (p.booth_no || '').toLowerCase();
        const team = (p.team_name || '').toLowerCase();
        const leader = (p.leader_name || '').toLowerCase();
        const title = (
          (p.custom_responses as Record<string, any>)?.product_title ||
          (p.custom_responses as Record<string, any>)?.title ||
          (p.custom_responses as Record<string, any>)?.nama_produk ||
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
  }, [assignedParticipants, selectedCategory, searchQuery, statusFilter, scores]);

  // Calculate overall maximum possible rubric score sum
  const maxPossibleTotal = useMemo(() => {
    return rubrics.reduce((acc, r) => acc + Number(r.max_score || 0), 0);
  }, [rubrics]);

  // Save current evaluation state to localStorage draft
  const saveDraftToStorage = (scoresMap: Record<string, number>, comments: string, participantId: string) => {
    if (!eventData || !session) return;
    const draftKey = createJuryDraftKey(eventData.id, session.code, participantId);
    localStorage.setItem(draftKey, serializeJuryDraft(scoresMap, comments));
    setIsDraftSaved(true);
  };

  // Open Evaluation Modal for a Participant (seamless touch feed)
  const openEvaluationModal = (participant: EmsParticipant) => {
    setEvalParticipant(participant);
    setHoveredScores({});

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

    // Restore draft if saved
    if (eventData && session) {
      const draftKey = createJuryDraftKey(eventData.id, session.code, participant.id);
      const savedDraft = deserializeJuryDraft(localStorage.getItem(draftKey));
      if (savedDraft && savedDraft.scores && Object.keys(savedDraft.scores).length > 0) {
        rubrics.forEach((r) => {
          if (typeof savedDraft.scores[r.id] === 'number') {
            initialScores[r.id] = savedDraft.scores[r.id];
          }
        });
        if (savedDraft.comments) {
          initialComment = savedDraft.comments;
        }
        setIsDraftSaved(true);
      } else {
        setIsDraftSaved(existingScores.length > 0);
      }
    } else {
      setIsDraftSaved(existingScores.length > 0);
    }

    setCriterionScores(initialScores);
    setGeneralComments(initialComment);
  };

  // Select score for a criterion
  const handleScoreSelect = (criterionId: string, val: number) => {
    if (!evalParticipant) return;
    const updated = { ...criterionScores, [criterionId]: val };
    setCriterionScores(updated);
    saveDraftToStorage(updated, generalComments, evalParticipant.id);
  };

  // Change general comments
  const handleCommentsChange = (text: string) => {
    if (!evalParticipant) return;
    setGeneralComments(text);
    saveDraftToStorage(criterionScores, text, evalParticipant.id);
  };

  // Submit Rubric Evaluation & Trigger Celebration Transition Drawer
  const handleRubricSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!evalParticipant || !juryCodeData || !eventData) return;

    if (!isAllCriteriaCompleted) {
      toast.error('Sila lengkapkan semua kriteria penilaian sebelum menghantar markah.');
      return;
    }

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
      toast.success(`Pemarkahan untuk ${evalParticipant.team_name || evalParticipant.leader_name} berjaya disimpan!`);

      // Clear local draft upon successful submission
      if (session) {
        const draftKey = createJuryDraftKey(eventData.id, session.code, evalParticipant.id);
        localStorage.removeItem(draftKey);
      }

      // Update local scores list
      const updatedScores = [
        ...scores.filter((s) => s.participant_id !== evalParticipant.id),
        ...scoresPayload,
      ];
      setScores(updatedScores);

      // Refresh DB in background
      fetchDashboardData(eventData.id, juryCodeData.id);

      // Check if there is a next unscored participant
      const nextBooth = findNextUnscoredParticipant(
        assignedParticipants,
        updatedScores,
        evalParticipant.id,
        activeParticipantCategory
      );

      const completedParticipant = evalParticipant;
      const awardedScore = liveTotalWeightedScore;

      // Close evaluation feed
      setEvalParticipant(null);

      // Open Post-Scoring Celebration Drawer
      setCelebrationModal({
        participant: completedParticipant,
        weightedScore: awardedScore,
        nextParticipant: nextBooth,
      });
    } catch (err: any) {
      console.error('Failed to submit scores:', err);
      toast.error(`Gagal menyimpan pemarkahan: ${err.message || 'Ralat sistem'}`);
    } finally {
      setIsSubmittingScores(false);
    }
  };

  // Transition to next booth from celebration drawer
  const handleStartNextBooth = () => {
    if (!celebrationModal?.nextParticipant) return;
    const nextP = celebrationModal.nextParticipant;
    setCelebrationModal(null);
    openEvaluationModal(nextP);
  };

  // Helper to extract media images for gallery preview
  const getParticipantImages = (p: EmsParticipant) => {
    const images: { url: string; label: string }[] = [];

    if (p.media_urls && Array.isArray(p.media_urls)) {
      p.media_urls.forEach((url, idx) => {
        if (url && typeof url === 'string') {
          const isPdf = url.toLowerCase().endsWith('.pdf');
          images.push({ url, label: isPdf ? `Dokumen PDF ${idx + 1}` : `Foto ${idx + 1}` });
        }
      });
    }

    if (p.custom_responses) {
      const cr = p.custom_responses as Record<string, any>;
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-400 font-medium animate-pulse">Menghubungkan ke Portal Juri EMS...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // SCREEN 1: CODE VERIFICATION ENTRY (Guest/Jury Access)
  // ---------------------------------------------------------------------------
  if (!session || !eventData || !juryCodeData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 pb-28 md:pb-8 relative overflow-hidden transition-colors">
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 dark:bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 text-slate-900 dark:text-white">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30 mb-4">
              <Award className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Portal Penilaian Juri</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              Event Management System (EMS) POLISAS
            </p>
          </div>

          {!pendingJuryCode ? (
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Kod Jemputan Juri
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: JURI-2026-X"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-center tracking-widest rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-sans placeholder:tracking-normal uppercase"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                  Kod jemputan diberikan oleh Pengarah Program atau Urusetia Penilaian.
                </p>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
            <form onSubmit={handleSaveJuryDetailsSubmit} className="space-y-5">
              <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 rounded-xl p-3.5 mb-2 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
                <BadgeCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-purple-950 dark:text-white block">Kod Disahkan: {pendingJuryCode.juryCode.code}</span>
                  <span className="text-purple-800 dark:text-slate-300">Acara: {pendingJuryCode.event.title}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Penuh Juri <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={inputJuryName}
                    onChange={(e) => setInputJuryName(e.target.value)}
                    placeholder="Contoh: Dr. Norazlan Bin Ahmad"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Organisasi / Jabatan / Jawatan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={inputOrganization}
                    onChange={(e) => setInputOrganization(e.target.value)}
                    placeholder="Contoh: Universiti Malaysia Pahang / Pensyarah Kanan"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPendingJuryCode(null)}
                  className="w-1/3 py-3 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl transition-all"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-2/3 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hak Cipta Terpelihara &copy; {new Date().getFullYear()} POLISAS EMS
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals for navigation header
  const totalAssignedCount = assignedParticipants.length;
  const totalScoredCount = assignedParticipants.filter((p) =>
    scores.some((s) => s.participant_id === p.id)
  ).length;

  // ---------------------------------------------------------------------------
  // SCREEN 2: JURY EVALUATION DASHBOARD
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-28 md:pb-8 transition-colors">
      {/* Event Header Banner */}
      <header className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Event Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-bold rounded-full uppercase tracking-wider">
                  EMS Portal Juri
                </span>
                {eventData.category && (
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium rounded-full">
                    {eventData.category}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {eventData.title}
              </h1>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                {eventData.event_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>{new Date(eventData.event_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
                {eventData.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>{eventData.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Jury Profile, ThemeToggle & Logout */}
            <div className="flex items-center gap-3 bg-slate-100/80 dark:bg-slate-950/60 p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 self-start md:self-auto">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                {session.jury_name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                    {session.jury_name}
                  </span>
                  <span className="text-[10px] font-mono bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-700/50">
                    {session.code}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-[220px]">
                  {session.organization}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-1">
                <ThemeToggle />
                <button
                  onClick={handleLogout}
                  title="Log Keluar Sesi Juri"
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Participant Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Sticky Segmented Category Pills Navigation */}
        <div className="sticky top-18 z-20 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-3 -my-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Pill [Semua] */}
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                selectedCategory === 'ALL'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Semua ({totalAssignedCount})</span>
              {totalScoredCount >= totalAssignedCount && totalAssignedCount > 0 && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              )}
            </button>

            {/* Dynamic Category Pills */}
            {availableCategories.map((cat) => {
              const CatIcon = getCategoryIcon(cat);
              const catLower = cat.trim().toLowerCase();
              const hasSpecific = assignedParticipants.some(
                (part) => getParticipantCategory(part).trim().toLowerCase() === catLower
              );
              const catParts = assignedParticipants.filter((p) => {
                const pCat = getParticipantCategory(p).trim().toLowerCase();
                return hasSpecific ? pCat === catLower : true;
              });
              const catTotal = catParts.length;
              const catScored = catParts.filter((p) =>
                scores.some((s) => s.participant_id === p.id)
              ).length;
              const isComplete = catTotal > 0 && catScored >= catTotal;
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <CatIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-purple-700 text-purple-100'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isComplete ? `${catScored}/${catTotal} Selesai` : `${catScored}/${catTotal}`}
                  </span>
                  {isComplete && (
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-300' : 'text-emerald-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters & Search Controls */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari booth #, pasukan, ketua atau tajuk inovasi..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto shrink-0">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Semua ({assignedParticipants.length})
              </button>
              <button
                onClick={() => setStatusFilter('UNSCORED')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === 'UNSCORED'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Belum Dinilai ({assignedParticipants.filter((p) => !scores.some((s) => s.participant_id === p.id)).length})
              </button>
              <button
                onClick={() => setStatusFilter('SCORED')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === 'SCORED'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Telah Dinilai ({assignedParticipants.filter((p) => scores.some((s) => s.participant_id === p.id)).length})
              </button>
            </div>
          </div>
        </div>

        {/* Participant Cards Grid */}
        {isLoadingDashboard ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-600 dark:text-indigo-400" />
            <p>Memuatkan senarai peserta & pemarkahan...</p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-12 text-center space-y-3 shadow-sm">
            <UserCheck className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-300">Tiada Peserta Ditemui</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'ALL' || selectedCategory !== 'ALL'
                ? 'Tiada peserta yang sepadan dengan tapisan atau kata kunci carian anda.'
                : 'Tiada peserta yang diagihkan di bawah kategori / booth kod juri anda.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredParticipants.map((participant) => {
              const pScores = scores.filter((s) => s.participant_id === participant.id);
              const isScored = pScores.length > 0;

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

              const weightedPercentage =
                totalWeightSum > 0 && Math.abs(totalWeightSum - 100) > 0.01
                  ? (rawWeighted / totalWeightSum) * 100
                  : rawWeighted;

              const mediaImages = getParticipantImages(participant);
              const productTitle =
                (participant.custom_responses as Record<string, any>)?.product_title ||
                (participant.custom_responses as Record<string, any>)?.title ||
                (participant.custom_responses as Record<string, any>)?.nama_produk ||
                participant.team_name ||
                'Inovasi Peserta';

              const pCategory = getParticipantCategory(participant);

              return (
                <div
                  key={participant.id}
                  className={`bg-white dark:bg-slate-900/90 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-purple-300 dark:hover:border-slate-700 shadow-sm hover:shadow-md text-slate-900 dark:text-white ${
                    isScored ? 'border-emerald-300 dark:border-emerald-500/30' : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Row: Booth Badge & Category & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {participant.booth_no ? (
                          <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-mono text-xs font-bold rounded-lg shadow-sm">
                            BOOTH #{participant.booth_no}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-lg">
                            TIADA BOOTH
                          </span>
                        )}
                        {pCategory && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium rounded-md truncate max-w-[120px]">
                            {pCategory}
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      {isScored ? (
                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold rounded-full flex items-center gap-1 shrink-0 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{weightedPercentage.toFixed(1)}% ({awardedScore}/{maxPossibleTotal})</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-semibold rounded-full flex items-center gap-1 shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Belum Dinilai</span>
                        </span>
                      )}
                    </div>

                    {/* Team & Product Title */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                        {productTitle}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-purple-600 dark:text-indigo-400 shrink-0" />
                        <span>
                          {participant.team_name ? (
                            <>
                              <strong className="text-slate-900 dark:text-slate-200">{participant.team_name}</strong> ({participant.leader_name})
                            </>
                          ) : (
                            participant.leader_name
                          )}
                        </span>
                      </p>
                    </div>

                    {/* Media Gallery Preview Thumbnails */}
                    {mediaImages.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                          Pratonton Dokumen & Media
                        </span>
                        <div className="flex items-center gap-2 overflow-x-auto">
                          {mediaImages.map((img, idx) => {
                            const isPdf = img.url.toLowerCase().endsWith('.pdf');
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  if (isPdf) {
                                    window.open(img.url, '_blank');
                                  } else {
                                    setLightboxImage({ url: img.url, title: `${productTitle} - ${img.label}` });
                                  }
                                }}
                                className="relative group w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0 hover:border-purple-500 transition-all flex flex-col items-center justify-center"
                                title={isPdf ? 'Buka fail PDF di tab baru' : 'Klik untuk besarkan imej'}
                              >
                                {isPdf ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-rose-50 dark:bg-rose-950/40 p-1">
                                    <FileText className="w-5 h-5 text-rose-500 mb-0.5" />
                                    <span className="text-[8px] font-bold text-rose-600 dark:text-rose-400">PDF</span>
                                  </div>
                                ) : (
                                  <>
                                    <img
                                      src={img.url}
                                      alt={img.label}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <Eye className="w-4 h-4 text-white" />
                                    </div>
                                  </>
                                )}
                                <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[8px] text-slate-300 text-center py-0.5 truncate px-0.5">
                                  {img.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                    <button
                      onClick={() => openEvaluationModal(participant)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
                        isScored
                          ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/20 font-bold'
                      }`}
                    >
                      <Sliders className="w-4 h-4" />
                      <span>{isScored ? 'Kemaskini Markah' : 'Nilai Booth Sekarang'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ----------------------------------------------------------------------- */}
      {/* SCREEN 3: SEAMLESS TOUCH FEED EVALUATION MODAL */}
      {/* ----------------------------------------------------------------------- */}
      {evalParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 dark:bg-slate-950/85 backdrop-blur-md flex flex-col justify-end sm:justify-center sm:p-4">
          <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-purple-500/30 w-full max-w-4xl sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col h-[94vh] sm:h-[90vh] overflow-hidden text-slate-900 dark:text-white">
            {/* Modal Header: Candidate Summary & Draft Badge */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {evalParticipant.booth_no && (
                    <span className="px-2.5 py-0.5 bg-purple-600 text-white font-mono text-xs font-bold rounded-md shadow-sm">
                      BOOTH #{evalParticipant.booth_no}
                    </span>
                  )}
                  {getParticipantCategory(evalParticipant) && (
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-medium rounded-md">
                      {getParticipantCategory(evalParticipant)}
                    </span>
                  )}
                  {isDraftSaved && (
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium rounded-md flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Draf Disimpan</span>
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {(evalParticipant.custom_responses as Record<string, any>)?.product_title ||
                    (evalParticipant.custom_responses as Record<string, any>)?.title ||
                    (evalParticipant.custom_responses as Record<string, any>)?.nama_produk ||
                    evalParticipant.team_name ||
                    'Inovasi Peserta'}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Ketua / Pasukan: <span className="text-slate-900 dark:text-slate-200 font-semibold">{evalParticipant.leader_name}</span>
                  {evalParticipant.team_name && ` (${evalParticipant.team_name})`}
                </p>

                {/* Candidate Attachments */}
                {evalParticipant.media_urls && evalParticipant.media_urls.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 mr-1">
                      Lampiran Calon:
                    </span>
                    {evalParticipant.media_urls.map((url, idx) => {
                      const isPdf = url.toLowerCase().endsWith('.pdf');
                      return (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 border border-slate-300 dark:border-slate-700 hover:border-purple-400 transition-colors shrink-0 shadow-xs"
                          title="Buka lampiran dalam tab baru"
                        >
                          {isPdf ? <FileText className="w-3.5 h-3.5 text-rose-500" /> : <Eye className="w-3.5 h-3.5 text-indigo-500" />}
                          <span>{isPdf ? `Dokumen PDF ${idx + 1}` : `Foto ${idx + 1}`}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => setEvalParticipant(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shrink-0"
                title="Tutup Penilaian"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Continuous Touch Feed Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 sm:pb-32 space-y-6">
              {participantRubrics.length === 0 ? (
                <div className="p-8 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-600 dark:text-slate-400 text-sm space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-500 dark:text-amber-400 mx-auto" />
                  <p>Tiada kriteria penilaian rubrik ditetap untuk kategori ini.</p>
                </div>
              ) : (
                <>
                  {sections.map((sec, secIdx) => (
                    <div key={sec.id} className="space-y-4">
                      {/* Sticky Section Header */}
                      <div className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                            {secIdx + 1}
                          </span>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                              {sec.name}
                            </h4>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {sec.rubrics.length} Kriteria Penilaian
                            </span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700 text-xs font-bold font-mono rounded-lg shrink-0">
                          Wajaran: {sec.weight}%
                        </span>
                      </div>

                      {/* Criteria Cards */}
                      <div className="space-y-4">
                        {sec.rubrics.map((r, rIdx) => {
                          const selectedVal = criterionScores[r.id] || 0;
                          const hoveredVal = hoveredScores[r.id];
                          const activeDisplayVal = hoveredVal || selectedVal;
                          const maxScore = Number(r.max_score || 5);
                          const weight = Number(r.weight || 0);

                          const activeOption = LIKERT_OPTIONS.find((opt) => opt.value === activeDisplayVal);
                          const activeDescriptorText =
                            (activeDisplayVal > 0 && r.descriptors?.[String(activeDisplayVal)]) ||
                            activeOption?.defaultDescriptor ||
                            'Sila pilih salah satu skor di atas.';

                          return (
                            <div
                              key={r.id}
                              className="bg-slate-50 dark:bg-[#14151f] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-purple-300 dark:hover:border-slate-600 transition-all shadow-sm"
                            >
                              {/* Criterion Title & Weight */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                                <div className="flex items-start gap-2.5">
                                  <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {rIdx + 1}
                                  </span>
                                  <div>
                                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                      {r.criteria_name}
                                    </h4>
                                    {r.category_name && (
                                      <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold block">
                                        Sub-Kategori: {r.category_name}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                  <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700 text-xs font-semibold rounded-lg font-mono">
                                    Pemberat: {weight}%
                                  </span>
                                  {selectedVal > 0 && (
                                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold rounded-lg font-mono flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5" />
                                      <span>
                                        {selectedVal}/{maxScore} ({((selectedVal / maxScore) * weight).toFixed(1)}%)
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Ergonomic 1-5 Likert Buttons */}
                              <div className="space-y-3">
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                  Pilih Skor Likert (1 - 5):
                                </label>
                                <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
                                  {[...LIKERT_OPTIONS]
                                    .sort((a, b) => a.value - b.value)
                                    .map((option) => {
                                      const isSelected = selectedVal === option.value;
                                      const IconComp = option.icon;
                                      return (
                                        <button
                                          key={option.value}
                                          type="button"
                                          onClick={() => handleScoreSelect(r.id, option.value)}
                                          onMouseEnter={() =>
                                            setHoveredScores((prev) => ({ ...prev, [r.id]: option.value }))
                                          }
                                          onMouseLeave={() =>
                                            setHoveredScores((prev) => ({ ...prev, [r.id]: null }))
                                          }
                                          className={`min-h-[48px] sm:min-h-[54px] py-2 px-1 sm:px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 text-center select-none touch-manipulation active:scale-95 ${
                                            isSelected
                                              ? option.activeBg
                                              : `${option.badgeColor} hover:scale-[1.02]`
                                          }`}
                                        >
                                          <IconComp className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isSelected ? 'text-white' : ''}`} />
                                          <span className="leading-tight text-[11px] sm:text-xs">
                                            {option.shortText}
                                          </span>
                                        </button>
                                      );
                                    })}
                                </div>

                                {/* Live Descriptor Box */}
                                {activeDisplayVal > 0 ? (
                                  <div className="mt-3 p-3.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1 animate-in fade-in duration-150">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        <span>Deskriptor Skor {activeDisplayVal}: {activeOption?.shortText}</span>
                                      </span>
                                      {hoveredVal && hoveredVal !== selectedVal && (
                                        <span className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/20 font-medium">
                                          Pratonton
                                        </span>
                                      )}
                                      {selectedVal === activeDisplayVal && !hoveredVal && (
                                        <span className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/20 font-medium">
                                          Pilihan Semasa
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-800 dark:text-slate-100 font-semibold leading-relaxed pl-5 italic">
                                      "{activeDescriptorText}"
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 italic pt-1">
                                    Sila klik salah satu butang di atas untuk memberikan pemarkahan.
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* General Comments Textarea at Feed Bottom */}
                  <div className="bg-slate-50 dark:bg-[#14151f] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-600 dark:text-indigo-400" />
                      <span>Ulasan & Cadangan Penambahbaikan (Pilihan Juri)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={generalComments}
                      onChange={(e) => handleCommentsChange(e.target.value)}
                      placeholder="Masukkan ulasan keseluruhan, pujian, atau cadangan penambahbaikan untuk calon ini..."
                      className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xl">
              <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Progress & Live Weighted % Score */}
                <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {completedCriteriaCount}/{totalCriteriaCount} Kriteria Dilengkapkan
                      </span>
                      <span className="text-[10px] font-mono font-semibold text-purple-600 dark:text-purple-400">
                        ({progressPercentage}%)
                      </span>
                    </div>
                    <div className="w-32 sm:w-40 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right sm:text-left pl-3 border-l border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-semibold">
                      Skor Wajaran
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-purple-700 dark:text-emerald-400">
                      {liveTotalWeightedScore.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Primary & Exit Buttons */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setEvalParticipant(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all"
                  >
                    Batal / Tutup
                  </button>

                  <button
                    type="button"
                    onClick={handleRubricSubmit}
                    disabled={!isAllCriteriaCompleted || isSubmittingScores}
                    className="flex-1 sm:flex-initial py-2.5 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    {isSubmittingScores ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Sahkan & Hantar Markah</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* SCREEN 4: POST-SCORING CELEBRATION & NEXT BOOTH TRANSITION DRAWER */}
      {/* ----------------------------------------------------------------------- */}
      {celebrationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-purple-500/30 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/25">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 rounded-full text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Pemarkahan Berjaya Disimpan</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white pt-1">
                Tahniah & Terima Kasih!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Markah untuk booth ini telah direkodkan ke pangkalan data.
              </p>
            </div>

            {/* Score & Participant Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Booth Dinilai:</span>
                {celebrationModal.participant.booth_no ? (
                  <span className="px-2 py-0.5 bg-purple-600 text-white font-mono text-xs font-bold rounded">
                    BOOTH #{celebrationModal.participant.booth_no}
                  </span>
                ) : (
                  <span className="text-xs text-slate-600 dark:text-slate-400">Tiada Booth</span>
                )}
              </div>
              <div className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                {(celebrationModal.participant.custom_responses as Record<string, any>)?.product_title ||
                  (celebrationModal.participant.custom_responses as Record<string, any>)?.title ||
                  (celebrationModal.participant.custom_responses as Record<string, any>)?.nama_produk ||
                  celebrationModal.participant.team_name ||
                  celebrationModal.participant.leader_name}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/80">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Skor Wajaran:</span>
                <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {celebrationModal.weightedScore.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Next Booth Transition Options */}
            {celebrationModal.nextParticipant ? (
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 rounded-xl text-left text-xs">
                  <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 block uppercase tracking-wide">
                    Booth Seterusnya Tersedia:
                  </span>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                    <span className="px-1.5 py-0.5 bg-purple-600 text-white rounded font-mono text-[11px]">
                      #{celebrationModal.nextParticipant.booth_no || '-'}
                    </span>
                    <span className="truncate">
                      {celebrationModal.nextParticipant.team_name || celebrationModal.nextParticipant.leader_name}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartNextBooth}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  <span>Nilai Booth Seterusnya: #{celebrationModal.nextParticipant.booth_no || ''}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCelebrationModal(null)}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Kembali ke Senarai Booth
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Tahniah! Semua booth dalam kategori ini telah selesai dinilai.</span>
                </div>

                <button
                  type="button"
                  onClick={() => setCelebrationModal(null)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all"
                >
                  Kembali ke Senarai
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* IMAGE LIGHTBOX MODAL */}
      {/* ----------------------------------------------------------------------- */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 dark:bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate pr-4">{lightboxImage.title}</h3>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950">
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
