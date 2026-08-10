import React, { useState, useMemo } from 'react';
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
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Percent,
} from 'lucide-react';
import type { EmsParticipant, EmsJuryCode, EmsRubricCriteria, EmsScore } from '@/types';
import { overrideJuryScore } from '@/lib/ems';

export interface EmsJuryAuditMatrixProps {
  eventId: string;
  participants: EmsParticipant[];
  juryCodes: EmsJuryCode[];
  rubrics: EmsRubricCriteria[];
  scores: EmsScore[];
  onRefresh: () => void;
}

/**
 * Checks whether a participant is assigned to a specific jury code.
 * Keys: assigned_categories boleh jadi KATEGORI RUBRIK (cth "Best Showcase Award")
 * atau KATEGORI PESERTA (cth "Makanan"). Kalau kategori rubrik — semua peserta
 * dinilai oleh juri tu (wizard juri pilih kategori masa menilai).
 */
function isParticipantAssignedToJury(participant: EmsParticipant, jury: EmsJuryCode, rubrics: EmsRubricCriteria[]): boolean {
  const assignedCats = jury.assigned_categories;
  const assignedBooths = jury.assigned_booths;

  const rubricCatNames = new Set(
    rubrics
      .map((r) => r.category_name?.trim().toLowerCase())
      .filter(Boolean)
  );

  let matchCat = true;
  if (assignedCats && assignedCats.length > 0 && !assignedCats.includes('ALL')) {
    const catSet = assignedCats.map((c) => c.trim().toLowerCase()).filter(Boolean);
    const isRubricScope = catSet.some((c) => rubricCatNames.has(c));

    if (isRubricScope) {
      // Kategori RUBRIK: kalau peserta sendiri ber-kategori rubrik (cth iFAMB ada
      // baris berasingan Best Showcase / Best Pitching) — padan ikut makna.
      // Kalau peserta kategori biasa (food/booth, cth Siswapreneur) — semua assigned.
      const pCat = (participant.category_name || '').trim().toLowerCase();
      if (pCat && rubricCatNames.has(pCat)) {
        matchCat = catSet.includes(pCat);
      }
    } else {
      const pCat = participant.category_name || '';
      matchCat = catSet.some((c) => c === pCat.toLowerCase());
    }
  }

  let matchBooth = true;
  if (assignedBooths && assignedBooths.length > 0 && !assignedBooths.includes('ALL')) {
    const pBooth = participant.booth_no || '';
    matchBooth = assignedBooths.some((b) => b.toLowerCase() === pBooth.toLowerCase());
  }

  return matchCat && matchBooth;
}

/**
 * Gets rubrics applicable to a participant based on the JURY's assigned category.
 * Kalau juri di-assign kategori RUBRIK → scope ikut rubrik kategori tu (umum/empty included).
 * Fallback lama: kategori peserta.
 */
function getApplicableRubrics(participant: EmsParticipant, jury: EmsJuryCode, rubrics: EmsRubricCriteria[]): EmsRubricCriteria[] {
  const rubricCatNames = new Set(
    rubrics
      .map((r) => r.category_name?.trim().toLowerCase())
      .filter(Boolean)
  );

  const assignedCats = jury.assigned_categories;
  if (assignedCats && assignedCats.length > 0 && !assignedCats.includes('ALL')) {
    const catSet = assignedCats.map((c) => c.trim().toLowerCase()).filter(Boolean);
    const rubricScope = catSet.filter((c) => rubricCatNames.has(c));
    if (rubricScope.length > 0) {
      const scoped = rubrics.filter((r) => {
        const rCat = r.category_name?.trim().toLowerCase();
        return !rCat || rCat === 'umum' || rubricScope.includes(rCat);
      });
      return scoped.length > 0 ? scoped : rubrics;
    }
  }

  const pCat = participant.category_name?.trim().toLowerCase() || '';
  if (!pCat) return rubrics;

  const filtered = rubrics.filter((r) => {
    if (!r.category_name || !r.category_name.trim()) return true;
    return r.category_name.trim().toLowerCase() === pCat;
  });

  return filtered.length > 0 ? filtered : rubrics;
}

/**
 * Computes status & weighted score percentage for a participant scored by a jury.
 */
function getJuryParticipantScoreInfo(
  participant: EmsParticipant,
  jury: EmsJuryCode,
  rubrics: EmsRubricCriteria[],
  scores: EmsScore[]
) {
  const applicableRubrics = getApplicableRubrics(participant, jury, rubrics);
  const pJuryScores = scores.filter(
    (s) => s.participant_id === participant.id && s.jury_code_id === jury.id
  );

  const submittedCount = pJuryScores.length;
  const totalRequired = applicableRubrics.length;

  if (submittedCount === 0) {
    return {
      status: 'NOT_STARTED' as const,
      submittedCount: 0,
      totalRequired,
      percentage: 0,
    };
  }

  const totalWeightSum = applicableRubrics.reduce(
    (acc, r) => acc + (Number(r.weight) || 0),
    0
  );

  const rawWeighted = applicableRubrics.reduce((acc, r) => {
    const s = pJuryScores.find((sc) => sc.rubric_id === r.id);
    const scoreVal = s ? Number(s.score) : 0;
    const maxVal = Number(r.max_score) || 5;
    const weightVal = Number(r.weight) || 0;
    return acc + (maxVal > 0 ? (scoreVal / maxVal) * weightVal : 0);
  }, 0);

  let percentage = 0;
  if (totalWeightSum > 0 && Math.abs(totalWeightSum - 100) > 0.01) {
    percentage = (rawWeighted / totalWeightSum) * 100;
  } else {
    percentage = rawWeighted;
  }

  const isCompleted = totalRequired > 0 && submittedCount >= totalRequired;

  return {
    status: isCompleted ? ('COMPLETED' as const) : ('PARTIAL' as const),
    submittedCount,
    totalRequired,
    percentage: Number(percentage.toFixed(1)),
  };
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

  // State for matrix filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // State for Director Score Override Modal
  const [editingCell, setEditingCell] = useState<{
    participant: EmsParticipant;
    jury: EmsJuryCode;
  } | null>(null);
  const [modalScores, setModalScores] = useState<Record<string, number>>({});
  const [auditComment, setAuditComment] = useState<string>('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // State for ignored imbalance warnings
  const [ignoredFlags, setIgnoredFlags] = useState<Record<string, boolean>>({});

  // Toggle ignore flag for jury imbalance anomaly
  const toggleIgnoreFlag = (participantId: string) => {
    setIgnoredFlags((prev) => {
      const isCurrentlyIgnored = !!prev[participantId];
      const nextState = { ...prev, [participantId]: !isCurrentlyIgnored };
      if (!isCurrentlyIgnored) {
        toast.success('Amaran ketidakseimbangan juri diabaikan.');
      } else {
        toast.success('Amaran ketidakseimbangan juri dinyahabaikan.');
      }
      return nextState;
    });
  };

  // Filter active jury codes
  const activeJuries = useMemo(() => {
    return juryCodes.filter((j) => j.is_active !== false);
  }, [juryCodes]);

  // Compute average juries count across all active participants
  const avgJuriesCount = useMemo(() => {
    if (participants.length === 0) return 0;
    const totalScored = participants.reduce((sum, p) => {
      const count = activeJuries.filter((j) => {
        const info = getJuryParticipantScoreInfo(p, j, rubrics, scores);
        return info.status === 'COMPLETED';
      }).length;
      return sum + count;
    }, 0);
    return Math.round(totalScored / participants.length);
  }, [participants, activeJuries, rubrics, scores]);

  // Extract unique categories for filtering
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    participants.forEach((p) => {
      if (p.category_name && p.category_name.trim()) {
        cats.add(p.category_name.trim());
      }
    });
    return Array.from(cats);
  }, [participants]);

  // Filter participants for matrix view
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchCat =
        selectedCategory === 'ALL' ||
        (p.category_name || '').toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.booth_no || '').toLowerCase().includes(q) ||
        (p.team_name || '').toLowerCase().includes(q) ||
        (p.leader_name || '').toLowerCase().includes(q) ||
        (p.category_name || '').toLowerCase().includes(q);

      return matchCat && matchSearch;
    });
  }, [participants, selectedCategory, searchQuery]);

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

  // Handle saving score override
  const handleSaveScoreOverride = async () => {
    if (!editingCell) return;

    try {
      setIsSubmittingOverride(true);
      const applicable = getApplicableRubrics(editingCell.participant, editingCell.jury, rubrics);

      const payload = applicable.map((r) => ({
        event_id: eventId,
        participant_id: editingCell.participant.id,
        jury_code_id: editingCell.jury.id,
        rubric_id: r.id,
        score: Number(modalScores[r.id] ?? 0),
        comments: auditComment.trim() || undefined,
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

  // Copy WhatsApp invitation link
  const handleCopyWhatsApp = (j: EmsJuryCode) => {
    const portalUrl = `${window.location.origin}/ems/juri?code=${encodeURIComponent(j.code)}`;
    const juryName = j.jury_name || 'Dato\'/Dr./Tuan/Puan';
    const org = j.organization ? ` (${j.organization})` : '';

    const waMsg = `🏛️ *JEMPUTAN PENJURIAN EMS POLISAS*\n\nSalam Sejahtera *${juryName}*${org},\n\nAnda dijemput sebagai *Juri Penilai Rasmi* bagi acara ini.\n\nMaklumat Akses Penjurian Anda:\n👤 *Nama Juri:* ${j.jury_name || '-'}\n🏢 *Organisasi:* ${j.organization || '-'}\n🔑 *Kod Jemputan Juri:* \`${j.code}\` \n\nSila layari Portal Juri Penilai melalui pautan rasmi di bawah untuk memulakan pemarkahan:\n🔗 ${portalUrl}\n\nTerima kasih atas sumbangan & sokongan anda!\n— *Jawatankuasa Perwakilan Pelajar (JPP) POLISAS*`;

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Kad Prestasi Juri
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Status kemajuan dan bilangan booth yang dinilai oleh setiap juri rasmi
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold rounded-full">
            {activeJuries.length} Juri Aktif
          </span>
        </div>

        {activeJuries.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">Tiada Kod Juri Aktif Ditemui</p>
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                  <Clock className="w-3 h-3" />
                  Belum Mula
                </span>
              );

              if (completedCount === assignedCount && assignedCount > 0) {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    Selesai Semua
                  </span>
                );
              } else if (completedCount > 0) {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Clock className="w-3 h-3 text-amber-400" />
                    Sedang Menilai
                  </span>
                );
              }

              return (
                <div
                  key={j.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all duration-200 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Jury Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-100 truncate flex items-center gap-1.5">
                          {j.jury_name || 'Juri Tanpa Nama'}
                        </h3>
                        <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                          {j.organization || 'Tiada Organisasi'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                        {j.code}
                      </span>
                    </div>

                    {/* Progress Bar & Counter */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Prestasi Penjurian</span>
                        <span className="font-bold text-slate-200">
                          {completedCount}/{assignedCount} Booth Dinilai
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            progressPct === 100
                              ? 'bg-emerald-500'
                              : progressPct > 0
                              ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                              : 'bg-slate-700'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between pt-1">
                      {statusBadge}
                      <span className="text-[11px] font-bold text-slate-400">{progressPct}%</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-4 border-t border-slate-800/80 mt-4">
                    <button
                      onClick={() => handleCopyWhatsApp(j)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-500/30 transition-all shadow-sm"
                      title="Salin Pautan & Mesej WhatsApp Jemputan"
                    >
                      {copiedJuryId === j.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
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
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              Matriks Status Penjurian Audit
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Grid perbandingan markah booth x juri. Klik mana-mana sel untuk pindaan Pengarah Program.
            </p>
          </div>

          {/* Controls & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold rounded-xl flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Purata Juri Se-Booth: {avgJuriesCount} Juri
            </span>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari Booth / Peserta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
              />
            </div>

            {availableCategories.length > 0 && (
              <div className="relative">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
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

        {/* Matrix Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-xs font-semibold text-slate-300">
                  <th className="p-3.5 sticky left-0 bg-slate-950/95 z-10 border-r border-slate-800 min-w-[180px]">
                    No. Booth & Peserta
                  </th>
                  <th className="p-3.5 border-r border-slate-800 min-w-[130px]">Kategori</th>

                  {activeJuries.map((j) => (
                    <th
                      key={j.id}
                      className="p-3.5 text-center border-r border-slate-800/80 min-w-[120px]"
                    >
                      <div className="flex flex-col items-center">
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-mono text-[11px] font-bold">
                          {j.code}
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal truncate max-w-[110px] mt-1">
                          {j.jury_name || 'Juri'}
                        </span>
                      </div>
                    </th>
                  ))}

                  <th className="p-3.5 text-center min-w-[140px]">Jumlah Juri Menilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeJuries.length + 3}
                      className="p-8 text-center text-slate-400 font-medium"
                    >
                      Tiada peserta atau booth yang sepadan dengan carian.
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
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Sticky Booth & Participant info column */}
                        <td className="p-3.5 sticky left-0 bg-slate-900 group-hover:bg-slate-800/90 z-10 border-r border-slate-800">
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 text-[11px] font-mono">
                              {p.booth_no || '-'}
                            </span>
                            <span className="truncate max-w-[160px]">
                              {p.team_name || p.leader_name}
                            </span>
                          </div>
                          {p.team_name && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {p.leader_name}
                            </p>
                          )}
                        </td>

                        {/* Category Column */}
                        <td className="p-3.5 text-slate-300 border-r border-slate-800">
                          <span className="inline-block px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700/60 rounded-md text-[11px]">
                            {p.category_name || 'Umum'}
                          </span>
                        </td>

                        {/* Jury Score Columns */}
                        {activeJuries.map((j) => {
                          const isAssigned = isParticipantAssignedToJury(p, j, rubrics);
                          const info = getJuryParticipantScoreInfo(p, j, rubrics, scores);

                          return (
                            <td
                              key={j.id}
                              className="p-2 text-center border-r border-slate-800/60 align-middle"
                            >
                              {info.status === 'COMPLETED' ? (
                                <button
                                  onClick={() => handleOpenOverrideModal(p, j)}
                                  className="w-full py-1.5 px-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1 group/btn"
                                  title="Selesai Dinilai - Klik untuk pinda markah"
                                >
                                  <span>{info.percentage}%</span>
                                  <Edit3 className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                </button>
                              ) : info.status === 'PARTIAL' ? (
                                <button
                                  onClick={() => handleOpenOverrideModal(p, j)}
                                  className="w-full py-1.5 px-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer font-medium text-xs transition-all flex items-center justify-center gap-1 group/btn"
                                  title={`Separuh (${info.submittedCount}/${info.totalRequired}) - Klik untuk pinda`}
                                >
                                  <span>Separuh</span>
                                  <Edit3 className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                </button>
                              ) : isAssigned ? (
                                <button
                                  onClick={() => handleOpenOverrideModal(p, j)}
                                  className="w-full py-1.5 px-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 cursor-pointer text-xs font-semibold transition-all flex items-center justify-center gap-1 group/btn"
                                  title="Belum mula dinilai - Klik untuk masuk markah"
                                >
                                  <span>Belum</span>
                                  <Edit3 className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenOverrideModal(p, j)}
                                  className="w-full py-1.5 px-2 rounded-lg bg-slate-800/60 text-slate-500 border border-slate-700/40 hover:bg-slate-700/50 hover:text-slate-300 cursor-pointer text-xs transition-all flex items-center justify-center"
                                  title="Tidak Ditugaskan - Klik untuk masuk markah secara manual"
                                >
                                  <span>-</span>
                                </button>
                              )}
                            </td>
                          );
                        })}

                        {/* Summary Column */}
                        <td className="p-3.5 text-center align-middle">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="font-bold text-slate-100">
                              {scoredJuriesCount} Juri Menilai
                            </span>
                            {isIgnored ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                [Amaran Diabaikan 👁️]
                              </span>
                            ) : scoredJuriesCount < avgJuriesCount ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                🚨 Terkurang Juri ({scoredJuriesCount} vs Purata {avgJuriesCount})
                              </span>
                            ) : scoredJuriesCount > avgJuriesCount ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                ⚠️ Terlebih Juri ({scoredJuriesCount} vs Purata {avgJuriesCount})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                🟢 Seimbang ({scoredJuriesCount} Juri)
                              </span>
                            )}

                            {isFlagged && !isIgnored && (
                              <button
                                type="button"
                                onClick={() => toggleIgnoreFlag(p.id)}
                                className="mt-1 text-[10px] font-semibold px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors cursor-pointer"
                              >
                                👁️ Abaikan Amaran
                              </button>
                            )}
                            {isIgnored && (
                              <button
                                type="button"
                                onClick={() => toggleIgnoreFlag(p.id)}
                                className="mt-1 text-[10px] font-semibold px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors cursor-pointer"
                              >
                                🔔 Nyahabaikan
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

      {/* SECTION C: MODAL PINDAAN MARKAH PENGARAH PROGRAM (Director Score Override Modal) */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  Pindaan Markah Juri (Pengarah Program)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Pinda atau masukkan markah secara langsung mengikut kriteria rubrik acara.
                </p>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Information Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">No. Booth</span>
                <span className="font-bold text-amber-400 font-mono text-sm">
                  {editingCell.participant.booth_no || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Nama Peserta / Pasukan</span>
                <span className="font-semibold text-slate-100 truncate block">
                  {editingCell.participant.team_name || editingCell.participant.leader_name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Kategori</span>
                <span className="font-semibold text-slate-200 truncate block">
                  {editingCell.participant.category_name || 'Umum'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Juri Penilai</span>
                <span className="font-semibold text-indigo-300 truncate block">
                  {editingCell.jury.jury_name || editingCell.jury.code} ({editingCell.jury.code})
                </span>
              </div>
            </div>

            {/* Rubrics Scoring List */}
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {getApplicableRubrics(editingCell.participant, editingCell.jury, rubrics).map((r, index) => {
                const maxScore = Number(r.max_score) || 5;
                const currentVal = modalScores[r.id] ?? 0;

                return (
                  <div
                    key={r.id}
                    className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                          Kriteria {index + 1} {r.section_name ? `• ${r.section_name}` : ''}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-100 mt-0.5">
                          {r.criteria_name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[11px] rounded font-medium">
                          Wajaran: {r.weight}%
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[11px] rounded font-bold border border-indigo-500/30">
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
                        className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
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
                        className="w-20 px-2.5 py-1.5 text-center text-sm font-bold bg-slate-900 border border-slate-700 rounded-xl text-indigo-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Total Percentage Preview */}
            <div className="flex items-center justify-between p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-indigo-400" />
                Anggaran Jumlah Markah Wajaran:
              </span>
              <span className="text-base font-extrabold text-indigo-300">
                {modalLivePercentage}%
              </span>
            </div>

            {/* Audit Comment Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                Catatan Audit / Sebab Pindaan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Cth: Pelarasan markah oleh Pengarah Program akibat ralat juri..."
                value={auditComment}
                onChange={(e) => setAuditComment(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingOverride}
                onClick={handleSaveScoreOverride}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
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
