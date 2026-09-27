import { useEffect, useState, useCallback } from 'react';
import {
  Trophy,
  Medal,
  Crown,
  ArrowUp,
  ArrowDown,
  Save,
  CheckCircle2,
  Lock,
  Loader2,
  Users,
} from 'lucide-react';
import {
  fetchMakmpAwardRanking,
  saveMakmpAwardRanking,
  finalizeMakmpAward,
  type MakmpRankingEntry,
} from '@/lib/makmp';
import { sendNotificationToUser } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import type { MakmpAwardDefinition } from '@/types';

interface MakmpRankingPanelProps {
  award: MakmpAwardDefinition;
  pinCode?: string | null; // untuk juri (PIN); admin guna session auth
  isAdmin?: boolean; // admin boleh finalize; juri cuma laras + lihat
  onChanged?: () => void;
}

const RANK_MEDALS = [
  { bg: 'from-amber-400 to-yellow-600', icon: Crown, label: 'Tempat Pertama' },
  { bg: 'from-slate-300 to-slate-500', icon: Medal, label: 'Tempat Kedua' },
  { bg: 'from-amber-700 to-amber-900', icon: Medal, label: 'Tempat Ketiga' },
];

export default function MakmpRankingPanel({
  award,
  pinCode,
  isAdmin = false,
  onChanged,
}: MakmpRankingPanelProps) {
  const [ranking, setRanking] = useState<MakmpRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRank, setSavingRank] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchMakmpAwardRanking(award.id);
    setRanking(data);
    setDirty(false);
    setLoading(false);
  }, [award.id]);

  useEffect(() => {
    load();
  }, [load]);

  const isLocked = ranking.some((r) => r.is_finalized);

  // Laras ranking: tukar kedudukan dua item bersebelahan
  const moveRank = (index: number, dir: -1 | 1) => {
    setRanking((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  };

  const handleSaveRanking = async () => {
    setSavingRank(true);
    setError(null);
    setMessage(null);
    const payload = ranking.map((r, i) => ({
      award_application_id: r.id,
      rank: i + 1,
    }));
    const res = await saveMakmpAwardRanking(pinCode || null, award.id, payload, note);
    setSavingRank(false);
    if (!res.success) {
      setError(res.message || 'Gagal menyimpan ranking.');
      return;
    }
    setMessage('Kedudukan ranking disimpan.');
    setDirty(false);
    onChanged?.();
    setTimeout(() => setMessage(null), 2500);
  };

  const handleFinalize = async () => {
    if (!isAdmin) return;
    const ok = window.confirm(
      `Sahkan keputusan untuk "${award.name}"?\n\nTindakan ini akan KUNCI ranking dan menghantar notifikasi kepada pemenang (Top 3).`
    );
    if (!ok) return;
    setFinalizing(true);
    setError(null);
    const res = await finalizeMakmpAward(award.id, 3);
    setFinalizing(false);
    if (!res.success) {
      setError(res.message || 'Gagal mengesahkan keputusan.');
      return;
    }
    setMessage(`Keputusan disahkan! ${res.winner_count ?? 0} pemenang dijemput.`);

    // Hantar notifikasi (in-app + push) + email kepada pemenang
    try {
      const winners = ranking.filter((_, i) => i < 3);
      for (const w of winners) {
        const userId = w.submission?.user_id;
        const link = `/makmp/status?code=${w.submission?.tracking_code || ''}`;

        // In-app + push notification
        if (userId) {
          await sendNotificationToUser(userId, {
            title: 'Tahniah! Anda Dijemput ke MAKMP 2026 🎉',
            message: `Anda terpilih sebagai pemenang "${award.name}". Sila lengkapkan maklumat IC & gambar passport anda.`,
            type: 'MAKMP_WINNER',
            module: 'JPP',
            link,
            reference_id: w.submission_id,
            actor_name: 'Panel Penilai MAKMP',
          });
        }

        // Email via Resend
        if (w.submission?.email) {
          const html = `
            <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
              <h2 style="color:#059669">Tahniah, ${w.submission.full_name}! 🎉</h2>
              <p>Anda telah <strong>dijemput ke Majlis Anugerah Kecemerlangan Mahasiswa (MAKMP) 2026</strong> sebagai pemenang anugerah:</p>
              <p style="font-size:18px;font-weight:bold;color:#d97706">${award.name}</p>
              <p>Sila log masuk ke portal dan lengkapkan <strong>nombor IC</strong> serta <strong>gambar passport</strong> anda.</p>
              <p>Kod rujukan anda: <code>${w.submission.tracking_code}</code></p>
              <p style="color:#888">— Panel Penilai MAKMP POLISAS</p>
            </div>`;
          sendEmail({ to: w.submission.email, subject: 'Tahniah! Anda Dijemput ke MAKMP 2026', html }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('[finalize] notifikasi pemenang gagal:', e);
    }

    onChanged?.();
    await load();
  };

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Memuat ranking...</span>
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-sm">
        <Users className="w-6 h-6 mx-auto mb-2 text-slate-600" />
        Tiada peserta yang disahkan lagi untuk anugerah ini.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      {/* Header panel */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {award.category_group}
            </div>
            <h4 className="font-bold text-sm text-white">{award.name}</h4>
          </div>
        </div>

        {isLocked && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <Lock className="w-3.5 h-3.5" />
            Keputusan Disahkan
          </span>
        )}
      </div>

      {/* Podium Top 3 */}
      <div className="px-5 pt-5">
        <div className="grid grid-cols-3 gap-3 items-end">
          {[1, 0, 2].map((orderIdx) => {
            const entry = ranking[orderIdx];
            const medal = RANK_MEDALS[orderIdx];
            const Icon = medal.icon;
            const isTop = orderIdx === 0;
            return (
              <div key={orderIdx} className="flex flex-col items-center">
                {entry ? (
                  <>
                    <div
                      className={`w-full flex flex-col items-center justify-end rounded-xl bg-gradient-to-b ${medal.bg} ${
                        isTop ? 'py-5' : 'py-3.5'
                      } shadow-lg`}
                    >
                      <Icon className={`text-slate-950 ${isTop ? 'w-8 h-8' : 'w-6 h-6'} mb-1.5`} />
                      <div className="text-slate-950 font-black text-2xl leading-none">
                        #{orderIdx + 1}
                      </div>
                    </div>
                    <div className="text-center mt-2">
                      <div className="font-bold text-white text-xs truncate max-w-[120px]">
                        {entry.submission?.full_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                        {entry.submission?.matric_no}
                      </div>
                      <div className="text-[11px] font-bold text-amber-400 mt-0.5">
                        +{entry.total_merit_granted} Merit
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full rounded-xl bg-slate-800/50 border border-dashed border-slate-700 py-6 text-center text-slate-600 text-xs">
                    —
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Senarai penuh ranking */}
      <div className="px-5 py-5 space-y-2">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Senarai Kedudukan Penuh
        </div>
        {ranking.map((entry, idx) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              idx < 3 ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800 bg-slate-950/50'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                idx === 0
                  ? 'bg-amber-400 text-slate-950'
                  : idx === 1
                  ? 'bg-slate-300 text-slate-900'
                  : idx === 2
                  ? 'bg-amber-700 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {idx + 1}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm truncate">
                {entry.submission?.full_name}
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">
                {entry.submission?.matric_no} • {entry.submission?.department}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-bold text-amber-400 text-sm">+{entry.total_merit_granted}</div>
              <div className="text-[10px] text-slate-500">merit</div>
            </div>

            {/* Butang laras (sembunyi bila locked) */}
            {!isLocked && (
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveRank(idx, -1)}
                  disabled={idx === 0}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition"
                  title="Naik kedudukan"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveRank(idx, 1)}
                  disabled={idx === ranking.length - 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition"
                  title="Turun kedudukan"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer aksi */}
      {!isLocked && (
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/60 space-y-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota sebab laras kedudukan (pilihan)"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 transition"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSaveRanking}
              disabled={!dirty || savingRank}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              {savingRank ? 'Menyimpan...' : 'Simpan Kedudukan'}
            </button>

            {isAdmin && (
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-60"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {finalizing ? 'Mengesahkan...' : 'Sahkan Keputusan'}
              </button>
            )}
          </div>

          {message && (
            <div className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {message}
            </div>
          )}
          {error && <div className="text-xs text-rose-400">{error}</div>}
        </div>
      )}
    </div>
  );
}
