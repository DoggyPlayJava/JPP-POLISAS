import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  Building2,
  Award,
  CheckCircle,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  Edit3,
  X,
  Sliders,
  FileText,
  Search,
  Filter,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Percent,
  EyeOff,
  Eye,
  Scale,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import type { EmsParticipant, EmsJuryCode, EmsRubricCriteria, EmsScore } from '@/types';
import {
  overrideJuryScore,
  calculateBoothAuditSummary,
  getParticipantCategory,
  isParticipantAssignedToJury,
  getApplicableRubrics,
  getJuryParticipantScoreInfo,
  type BoothAuditSummary,
} from '@/lib/ems';

// Re-export helpers so existing consumers and tests don't break
export {
  getParticipantCategory,
  isParticipantAssignedToJury,
  getApplicableRubrics,
  getJuryParticipantScoreInfo,
};

export interface EmsJuryAuditMatrixProps {
  eventId: string;
  participants: EmsParticipant[];
  juryCodes: EmsJuryCode[];
  rubrics: EmsRubricCriteria[];
  scores: EmsScore[];
  onRefresh: () => void;
}

export function EmsJuryAuditMatrix({
  eventId,
  participants,
  juryCodes,
  rubrics,
  scores,
  onRefresh,
}: EmsJuryAuditMatrixProps) {
  // State for WhatsApp copy button feedback
  const [copiedJuryId, setCopiedJuryId] = useState<string | null>(null);

  // State for matrix filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [anomalyFilter, setAnomalyFilter] = useState<'ALL' | 'DEFICIT' | 'SURPLUS' | 'UNSCORED'>('ALL');

  // State for Director Score Override Modal
  const [editingCell, setEditingCell] = useState<{
    participant: EmsParticipant;
    jury: EmsJuryCode;
  } | null>(null);
  const [modalScores, setModalScores] = useState<Record<string, number>>({});
  const [auditComment, setAuditComment] = useState<string>('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // State for ignored imbalance warnings with localStorage persistence
  const storageKey = `ems_audit_ignored_flags_${eventId}`;

  const [ignoredFlags, setIgnoredFlags] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Error reading ignored flags from localStorage', e);
      return {};
    }
  });

  // Keep localStorage synchronized if eventId changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(`ems_audit_ignored_flags_${eventId}`);
      setIgnoredFlags(saved ? JSON.parse(saved) : {});
    } catch (e) {
      console.error('Error reloading ignored flags on eventId change:', e);
    }
  }, [eventId]);

  const updateIgnoredFlags = (newFlags: Record<string, boolean>) => {
    setIgnoredFlags(newFlags);
    try {
      localStorage.setItem(`ems_audit_ignored_flags_${eventId}`, JSON.stringify(newFlags));
    } catch (e) {
      console.error('Error saving ignored flags to localStorage', e);
    }
  };

  // Toggle ignore flag for jury imbalance anomaly for a single booth
  const toggleIgnoreFlag = (participantId: string) => {
    const isCurrentlyIgnored = !!ignoredFlags[participantId];
    const nextState = { ...ignoredFlags, [participantId]: !isCurrentlyIgnored };
    updateIgnoredFlags(nextState);
    if (!isCurrentlyIgnored) {
      toast.success('Amaran ketidakseimbangan juri diabaikan.');
    } else {
      toast.success('Amaran ketidakseimbangan juri dinyahabaikan.');
    }
  };

  // Filter active jury codes
  const activeJuries = useMemo(() => {
    return juryCodes.filter((j) => j.is_active !== false);
  }, [juryCodes]);

  // Executive Telemetry KPI summary calculation
  const auditSummary: BoothAuditSummary = useMemo(() => {
    return calculateBoothAuditSummary(participants, activeJuries, rubrics, scores, ignoredFlags);
  }, [participants, activeJuries, rubrics, scores, ignoredFlags]);

  const avgJuriesCount = auditSummary.avgJuriesCount;

  // Jury progress metrics summary
  const juryProgressSummary = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    activeJuries.forEach((j) => {
      const assigned = participants.filter((p) => isParticipantAssignedToJury(p, j, rubrics));
      const completedBooths = assigned.filter((p) => {
        const info = getJuryParticipantScoreInfo(p, j, rubrics, scores);
        return info.status === 'COMPLETED';
      }).length;

      if (assigned.length > 0 && completedBooths === assigned.length) {
        completed++;
      } else if (completedBooths > 0) {
        inProgress++;
      } else {
        notStarted++;
      }
    });

    return { completed, inProgress, notStarted, total: activeJuries.length };
  }, [activeJuries, participants, rubrics, scores]);

  // Booth coverage percentage
  const coveragePct = useMemo(() => {
    if (auditSummary.totalBooths === 0) return 0;
    return Math.min(100, Math.round((auditSummary.scoredBooths / auditSummary.totalBooths) * 100));
  }, [auditSummary]);

  // Ignored flags count
  const ignoredCount = useMemo(() => {
    return Object.values(ignoredFlags).filter(Boolean).length;
  }, [ignoredFlags]);

  // Bulk Anomaly Action: Ignore all flagged booths
  const handleIgnoreAllAnomalies = () => {
    const next = { ...ignoredFlags };
    let flaggedCount = 0;
    participants.forEach((p) => {
      const scoredCount = activeJuries.filter((j) => {
        const info = getJuryParticipantScoreInfo(p, j, rubrics, scores);
        return info.status === 'COMPLETED';
      }).length;
      if (scoredCount !== avgJuriesCount) {
        next[p.id] = true;
        flaggedCount++;
      }
    });
    updateIgnoredFlags(next);
    toast.success(`${flaggedCount} amaran anomali berjaya diabaikan.`);
  };

  // Bulk Anomaly Action: Reset all ignored flags
  const handleResetAllAnomalies = () => {
    updateIgnoredFlags({});
    toast.success('Semua amaran anomali berjaya diset semula.');
  };

  // Extract unique categories for filtering
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    participants.forEach((p) => {
      const cat = getParticipantCategory(p);
      if (cat) {
        cats.add(cat);
      }
    });
    return Array.from(cats);
  }, [participants]);

  // Filter participants for matrix view (incorporating search, category, and KPI anomaly filters)
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const pCat = getParticipantCategory(p);
      const matchCat =
        selectedCategory === 'ALL' ||
        pCat.toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.booth_no || '').toLowerCase().includes(q) ||
        (p.team_name || '').toLowerCase().includes(q) ||
        (p.leader_name || '').toLowerCase().includes(q) ||
        pCat.toLowerCase().includes(q);

      if (!matchCat || !matchSearch) return false;

      if (anomalyFilter === 'ALL') return true;

      const scoredJuriesCount = activeJuries.filter((j) => {
        const info = getJuryParticipantScoreInfo(p, j, rubrics, scores);
        return info.status === 'COMPLETED';
      }).length;

      const isIgnored = Boolean(ignoredFlags[p.id]);

      if (anomalyFilter === 'DEFICIT') {
        return !isIgnored && scoredJuriesCount < avgJuriesCount;
      }
      if (anomalyFilter === 'SURPLUS') {
        return !isIgnored && scoredJuriesCount > avgJuriesCount;
      }
      if (anomalyFilter === 'UNSCORED') {
        const hasAnyScore = scoredJuriesCount > 0 || scores.some((s) => s.participant_id === p.id);
        return !hasAnyScore;
      }

      return true;
    });
  }, [participants, selectedCategory, searchQuery, anomalyFilter, activeJuries, rubrics, scores, avgJuriesCount, ignoredFlags]);

  // Handle opening Director Score Override Modal
  const handleOpenOverrideModal = (participant: EmsParticipant, jury: EmsJuryCode) => {
    const applicable = getApplicableRubrics(participant, jury, rubrics);
    const existingScores = scores.filter(
      (s) => s.participant_id === participant.id && s.jury_code_id === jury.id
    );

    const initialScores: Record<string, number> = {};
    let initialComment = '';

    applicable.forEach((r) => {
      const foundScore = existingScores.find((sc) => sc.rubric_id === r.id);
      initialScores[r.id] = foundScore ? Number(foundScore.score) : 0;
      if (foundScore?.comments && !initialComment) {
        initialComment = foundScore.comments;
      }
    });

    setEditingCell({ participant, jury });
    setModalScores(initialScores);
    setAuditComment(initialComment);
  };

  // Handle saving score override with required audit comment
  const handleSaveScoreOverride = async () => {
    if (!editingCell) return;

    if (!auditComment.trim()) {
      toast.error('Sila masukkan Catatan Audit Pengarah sebelum menyimpan pindaan markah.');
      return;
    }

    try {
      setIsSubmittingOverride(true);
      const applicable = getApplicableRubrics(editingCell.participant, editingCell.jury, rubrics);

      const payload = applicable.map((r) => ({
        event_id: eventId,
        participant_id: editingCell.participant.id,
        jury_code_id: editingCell.jury.id,
        rubric_id: r.id,
        score: Number(modalScores[r.id] ?? 0),
        comments: auditComment.trim(),
      }));

      await overrideJuryScore(payload);
      toast.success(
        `Markah bagi ${editingCell.participant.team_name || editingCell.participant.leader_name} (${editingCell.jury.code}) berjaya dipinda!`
      );
      setEditingCell(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Gagal meminda markah juri.');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Copy clean WhatsApp invitation link without raw emojis
  const handleCopyWhatsApp = (j: EmsJuryCode) => {
    const portalUrl = `${window.location.origin}/ems/juri?code=${encodeURIComponent(j.code)}`;
    const juryName = j.jury_name || 'Dato\'/Dr./Tuan/Puan';
    const org = j.organization ? ` (${j.organization})` : '';

    const waMsg = `*JEMPUTAN PENJURIAN EMS POLISAS*\n\nSalam Sejahtera *${juryName}*${org},\n\nAnda dijemput sebagai *Juri Penilai Rasmi* bagi acara ini.\n\nMaklumat Akses Penjurian Anda:\n*Nama Juri:* ${j.jury_name || '-'}\n*Organisasi:* ${j.organization || '-'}\n*Kod Jemputan Juri:* \`${j.code}\`\n\nSila layari Portal Juri Penilai melalui pautan rasmi di bawah untuk memulakan pemarkahan:\n${portalUrl}\n\nTerima kasih atas sumbangan & sokongan anda!\n- *Jawatankuasa Perwakilan Pelajar (JPP) POLISAS*`;

    navigator.clipboard.writeText(waMsg);
    setCopiedJuryId(j.id);
    toast.success(`Mesej Jemputan WhatsApp Kod ${j.code} disalin!`);
    setTimeout(() => setCopiedJuryId(null), 2500);
  };

  // Calculate live preview total score in modal
  const modalLivePercentage = useMemo(() => {
    if (!editingCell) return 0;
    const applicable = getApplicableRubrics(editingCell.participant, editingCell.jury, rubrics);
    if (applicable.length === 0) return 0;

    const totalWeightSum = applicable.reduce((acc, r) => acc + (Number(r.weight) || 0), 0);
    const rawWeighted = applicable.reduce((acc, r) => {
      const scoreVal = Number(modalScores[r.id] ?? 0);
      const maxVal = Number(r.max_score) || 5;
      const weightVal = Number(r.weight) || 0;
      return acc + (maxVal > 0 ? (scoreVal / maxVal) * weightVal : 0);
    }, 0);

    if (totalWeightSum > 0 && Math.abs(totalWeightSum - 100) > 0.01) {
      return Number(((rawWeighted / totalWeightSum) * 100).toFixed(1));
    }
    return Number(rawWeighted.toFixed(1));
  }, [editingCell, rubrics, modalScores]);

  return (
    <div className="space-y-8">
      {/* SECTION A: KAD PRESTASI JURI (Jury Performance Cards) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Kad Prestasi Juri
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Status kemajuan dan bilangan booth yang dinilai oleh setiap juri rasmi
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 text-xs font-semibold rounded-full">
            {activeJuries.length} Juri Aktif
          </span>
        </div>

        {activeJuries.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <AlertCircle className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-700 dark:text-slate-400 font-medium">Tiada Kod Juri Aktif Ditemui</p>
            <p className="text-xs text-slate-500 mt-1">Sila tambah dan aktifkan kod juri pada tetapan acara.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeJuries.map((j) => {
              const assignedForJury = participants.filter((p) =>
                isParticipantAssignedToJury(p, j, rubrics)
              );
              const assignedCount = assignedForJury.length;

              const completedCount = assignedForJury.filter((p) => {
                const info = getJuryParticipantScoreInfo(p, j, rubrics, scores);
                return info.status === 'COMPLETED';
              }).length;

              const progressPct =
                assignedCount > 0
                  ? Math.min(100, Math.round((completedCount / assignedCount) * 100))
                  : 0;

              let statusBadge = (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <Clock className="w-3 h-3" />
                  Belum Mula
                </span>
              );

              if (completedCount === assignedCount && assignedCount > 0) {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                    <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Selesai Semua
                  </span>
                );
              } else if (completedCount > 0) {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    Sedang Menilai
                  </span>
                );
              }

              return (
                <div
                  key={j.id}
                  className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/40 rounded-2xl p-4 transition-all duration-200 shadow-sm dark:shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Jury Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                          {j.jury_name || 'Juri Tanpa Nama'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                          {j.organization || 'Tiada Organisasi'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 shrink-0">
                        {j.code}
                      </span>
                    </div>

                    {/* Progress Bar & Counter */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Prestasi Penjurian</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {completedCount}/{assignedCount} Booth Dinilai
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700/50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            progressPct === 100
                              ? 'bg-emerald-500'
                              : progressPct > 0
                              ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between pt-1">
                      {statusBadge}
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{progressPct}%</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4">
                    <button
                      onClick={() => handleCopyWhatsApp(j)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-500/30 transition-all shadow-sm cursor-pointer"
                      title="Salin Pautan & Mesej WhatsApp Jemputan"
                    >
                      {copiedJuryId === j.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Mesej Disalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin WhatsApp Jemputan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION B: MATRIKS STATUS PENJURIAN (Booth x Juri Matrix Grid) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Matriks Status Penjurian Audit
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Grid perbandingan markah booth x juri. Klik mana-mana sel untuk pindaan Pengarah Program.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 text-xs font-semibold rounded-xl flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Purata Sasaran: {avgJuriesCount} Juri / Booth
            </span>
          </div>
        </div>

        {/* 4 EXECUTIVE TELEMETRY KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Liputan Penjurian Booth */}
          <div
            onClick={() => setAnomalyFilter((prev) => (prev === 'UNSCORED' ? 'ALL' : 'UNSCORED'))}
            className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
              anomalyFilter === 'UNSCORED'
                ? 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/30'
                : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/40'
            }`}
            title="Klik untuk tapis booth yang belum dinilai"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Liputan Penjurian Booth</span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {auditSummary.scoredBooths} <span className="text-sm font-semibold text-slate-500">/ {auditSummary.totalBooths}</span>
              </span>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 ml-auto">
                {coveragePct}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-purple-600 dark:bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${coveragePct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {auditSummary.unscoredBooths} booth belum dinilai sama sekali
            </p>
          </div>

          {/* Card 2: Status Kemajuan Juri */}
          <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status Kemajuan Juri</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {juryProgressSummary.completed}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                / {juryProgressSummary.total} Juri Selesai
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                {juryProgressSummary.completed} Selesai
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                {juryProgressSummary.inProgress} Menilai
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {juryProgressSummary.notStarted} Belum
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Prestasi kesemua juri rasmi yang aktif
            </p>
          </div>

          {/* Card 3: Anomali Terkurang Juri (Deficit) */}
          <div
            onClick={() => setAnomalyFilter((prev) => (prev === 'DEFICIT' ? 'ALL' : 'DEFICIT'))}
            className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
              anomalyFilter === 'DEFICIT'
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/30'
                : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/40'
            }`}
            title="Klik untuk tapis booth terkurang juri"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Anomali Terkurang Juri</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {auditSummary.deficitCount}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Booth Defisit
              </span>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                Kurang drpd purata ({avgJuriesCount} juri)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {anomalyFilter === 'DEFICIT' ? 'Menapis aktif • Klik untuk set semula' : 'Klik untuk tapis booth defisit'}
            </p>
          </div>

          {/* Card 4: Anomali Terlebih Juri (Surplus) */}
          <div
            onClick={() => setAnomalyFilter((prev) => (prev === 'SURPLUS' ? 'ALL' : 'SURPLUS'))}
            className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
              anomalyFilter === 'SURPLUS'
                ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/30'
                : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-500/40'
            }`}
            title="Klik untuk tapis booth terlebih juri"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Anomali Terlebih Juri</span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {auditSummary.surplusCount}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Booth Lebihan
              </span>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                Lebih drpd purata ({avgJuriesCount} juri)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {anomalyFilter === 'SURPLUS' ? 'Menapis aktif • Klik untuk set semula' : 'Klik untuk tapis booth lebihan'}
            </p>
          </div>
        </div>

        {/* CONTROLS & BULK ANOMALY ACTIONS TOOLBAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          {/* Bulk Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleIgnoreAllAnomalies}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
              title="Abaikan semua amaran ketidakseimbangan juri"
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Abaikan Semua Amaran</span>
            </button>

            <button
              type="button"
              onClick={handleResetAllAnomalies}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
              title="Set semula semua status amaran yang diabaikan"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Set Semula Semua Amaran</span>
            </button>

            {ignoredCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20">
                <EyeOff className="w-3.5 h-3.5 text-purple-500" />
                {ignoredCount} Amaran Diabaikan
              </span>
            )}

            {anomalyFilter !== 'ALL' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-medium">
                <span>
                  Tapisan Aktif:{' '}
                  <strong>
                    {anomalyFilter === 'DEFICIT'
                      ? 'Booth Terkurang Juri'
                      : anomalyFilter === 'SURPLUS'
                      ? 'Booth Terlebih Juri'
                      : 'Booth Belum Dinilai'}
                  </strong>
                </span>
                <button
                  onClick={() => setAnomalyFilter('ALL')}
                  className="p-0.5 hover:bg-amber-200 dark:hover:bg-amber-500/30 rounded cursor-pointer"
                  title="Kosongkan tapisan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari Booth / Peserta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-purple-500 w-44 sm:w-56"
              />
            </div>

            {availableCategories.length > 0 && (
              <div className="relative">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="ALL">Semua Kategori</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* RESPONSIVE MATRIX TABLE */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <th className="p-3.5 sticky left-0 bg-slate-50 dark:bg-slate-950/95 z-20 border-r border-slate-200 dark:border-slate-800 min-w-[190px]">
                    No. Booth & Peserta
                  </th>
                  <th className="p-3.5 border-r border-slate-200 dark:border-slate-800 min-w-[130px]">Kategori</th>

                  {activeJuries.map((j) => (
                    <th
                      key={j.id}
                      className="p-3.5 text-center border-r border-slate-200 dark:border-slate-800/80 min-w-[120px]"
                    >
                      <div className="flex flex-col items-center">
                        <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 rounded font-mono text-[11px] font-bold">
                          {j.code}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate max-w-[110px] mt-1">
                          {j.jury_name || 'Juri'}
                        </span>
                      </div>
                    </th>
                  ))}

                  <th className="p-3.5 text-center min-w-[160px]">Jumlah Juri Menilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeJuries.length + 3}
                      className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium"
                    >
                      Tiada peserta atau booth yang sepadan dengan carian atau tapisan.
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((p) => {
                    // Count scored juries count for the booth
                    const scoredJuriesCount = activeJuries.filter((j) => {
                      const info = getJuryParticipantScoreInfo(p, j, rubrics, scores);
                      return info.status === 'COMPLETED';
                    }).length;

                    const isIgnored = !!ignoredFlags[p.id];
                    const isFlagged = scoredJuriesCount !== avgJuriesCount;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Sticky Booth & Participant info column */}
                        <td className="p-3.5 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/90 z-10 border-r border-slate-200 dark:border-slate-800">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-slate-700 text-[11px] font-mono">
                              {p.booth_no || '-'}
                            </span>
                            <span className="truncate max-w-[160px]">
                              {p.team_name || p.leader_name}
                            </span>
                          </div>
                          {p.team_name && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {p.leader_name}
                            </p>
                          )}
                        </td>

                        {/* Category Column */}
                        <td className="p-3.5 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 rounded-md text-[11px]">
                            {getParticipantCategory(p) || 'Umum'}
                          </span>
                        </td>

                        {/* Jury Score Columns with Standardized Badges */}
                        {activeJuries.map((j) => {
                          const isAssigned = isParticipantAssignedToJury(p, j, rubrics);
                          const info = getJuryParticipantScoreInfo(p, j, rubrics, scores);

                          return (
                            <td
                              key={j.id}
                              className="p-2 text-center border-r border-slate-200 dark:border-slate-800/60 align-middle"
                            >
                              {info.status === 'COMPLETED' ? (
                                <button
                                  onClick={() => handleOpenOverrideModal(p, j)}
                                  className="w-full py-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 cursor-pointer font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1 group/btn"
                                  title="Selesai Dinilai - Klik untuk pinda markah"
                                >
                                  <span>{info.percentage}%</span>
                                  <Edit3 className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                </button>
                              ) : info.status === 'PARTIAL' ? (
                                <button
                                  onClick={() => handleOpenOverrideModal(p, j)}
                                  className="w-full py-1.5 px-2 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 hover:bg-amber-100 dark:hover:bg-amber-500/30 cursor-pointer font-semibold text-xs transition-all flex items-center justify-center gap-1 group/btn"
                                  title={`Separuh (${info.submittedCount}/${info.totalRequired}) - Klik untuk pinda`}
                                >
                                  <span>Separuh {info.submittedCount}/{info.totalRequired}</span>
                                  <Edit3 className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                </button>
                              ) : isAssigned ? (
                                <button
                                  onClick={() => handleOpenOverrideModal(p, j)}
                                  className="w-full py-1.5 px-2 rounded-xl bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/30 cursor-pointer text-xs font-semibold transition-all flex items-center justify-center gap-1 group/btn"
                                  title="Belum mula dinilai - Klik untuk masuk markah"
                                >
                                  <span>Belum</span>
                                  <Edit3 className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenOverrideModal(p, j)}
                                  className="w-full py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/40 hover:bg-slate-200 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer text-xs transition-all flex items-center justify-center"
                                  title="Tidak Ditugaskan - Klik untuk masuk markah secara manual"
                                >
                                  <span>-</span>
                                </button>
                              )}
                            </td>
                          );
                        })}

                        {/* Summary Column with Vector Icons */}
                        <td className="p-3.5 text-center align-middle">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {scoredJuriesCount} Juri Menilai
                            </span>
                            {isIgnored ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                <EyeOff className="w-3 h-3 text-slate-500" />
                                Amaran Diabaikan
                              </span>
                            ) : scoredJuriesCount < avgJuriesCount ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40">
                                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                Terkurang Juri ({scoredJuriesCount} vs Purata {avgJuriesCount})
                              </span>
                            ) : scoredJuriesCount > avgJuriesCount ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40">
                                <ShieldAlert className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                                Terlebih Juri ({scoredJuriesCount} vs Purata {avgJuriesCount})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40">
                                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                Seimbang ({scoredJuriesCount} Juri)
                              </span>
                            )}

                            {isFlagged && !isIgnored && (
                              <button
                                type="button"
                                onClick={() => toggleIgnoreFlag(p.id)}
                                className="mt-1 text-[11px] font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <EyeOff className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                Abaikan Amaran
                              </button>
                            )}
                            {isIgnored && (
                              <button
                                type="button"
                                onClick={() => toggleIgnoreFlag(p.id)}
                                className="mt-1 text-[11px] font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Eye className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                Nyahabaikan
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION C: MODAL PINDAAN MARKAH PENGARAH PROGRAM (Obsidian SuperApp Styling) */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-6 shadow-2xl relative my-8 ring-1 ring-white/10">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  Pindaan Markah Juri (Pengarah Program)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pinda atau selaraskan markah secara rasmi dengan catatan audit pengarah.
                </p>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Information Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">No. Booth</span>
                <span className="font-bold text-amber-400 font-mono text-base">
                  {editingCell.participant.booth_no || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Nama Peserta / Pasukan</span>
                <span className="font-semibold text-slate-200 truncate block">
                  {editingCell.participant.team_name || editingCell.participant.leader_name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Kategori</span>
                <span className="font-medium text-slate-300 truncate block">
                  {getParticipantCategory(editingCell.participant) || 'Umum'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Juri Penilai</span>
                <span className="font-semibold text-purple-300 truncate block">
                  {editingCell.jury.jury_name || editingCell.jury.code} ({editingCell.jury.code})
                </span>
              </div>
            </div>

            {/* Rubrics Criteria Scoring List */}
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {getApplicableRubrics(editingCell.participant, editingCell.jury, rubrics).map((r, index) => {
                const maxScore = Number(r.max_score) || 5;
                const currentVal = modalScores[r.id] ?? 0;

                return (
                  <div
                    key={r.id}
                    className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                          Kriteria {index + 1} {r.section_name ? `• ${r.section_name}` : ''}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-100 mt-0.5">
                          {r.criteria_name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[11px] rounded-lg font-medium">
                          Wajaran: {r.weight}%
                        </span>
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[11px] rounded-lg font-bold border border-purple-500/30">
                          Maks: {maxScore}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Slider & Number Input */}
                    <div className="flex items-center gap-4 pt-1">
                      <input
                        type="range"
                        min={0}
                        max={maxScore}
                        step={0.5}
                        value={currentVal}
                        onChange={(e) =>
                          setModalScores({
                            ...modalScores,
                            [r.id]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                      />
                      <input
                        type="number"
                        min={0}
                        max={maxScore}
                        step={0.5}
                        value={currentVal}
                        onChange={(e) => {
                          const val = Math.min(
                            maxScore,
                            Math.max(0, parseFloat(e.target.value) || 0)
                          );
                          setModalScores({ ...modalScores, [r.id]: val });
                        }}
                        className="w-20 px-2.5 py-1.5 text-center text-sm font-bold bg-slate-900 border border-slate-700 rounded-xl text-purple-300 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Total Percentage Preview */}
            <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Percent className="w-4 h-4 text-purple-400" />
                Anggaran Jumlah Markah Wajaran:
              </span>
              <span className="text-lg font-black text-purple-400">
                {modalLivePercentage}%
              </span>
            </div>

            {/* Audit Comment (Required) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                Catatan Audit Pengarah <span className="text-rose-400 font-bold">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Cth: Pelarasan markah kriteria teknikal selepas semakan rayuan panel juri..."
                value={auditComment}
                onChange={(e) => setAuditComment(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingOverride}
                onClick={handleSaveScoreOverride}
                className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingOverride ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan Pindaan Markah</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
