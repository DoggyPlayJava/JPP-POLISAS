import React, { useMemo, useState } from 'react';
import { Download, FileImage, IdCard, ImageDown, Loader2, CheckCircle2, AlertCircle, FolderArchive, FileSpreadsheet, Mail, Trophy, Phone } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { MakmpSubmission } from '@/types';

interface MakmpWinnerDocsPanelProps {
  submissions: MakmpSubmission[];
}

// ── Helper: ambil nama anugerah yang pelajar DIJEMPUT (winner) ──────────────
// Satu submission boleh masuk >1 anugerah. winner_status='DIJEMPUT' adalah
// ground-truth (ditetapkan oleh finalize RPC). Kita papar anugerah yang
// submission ini sertai & telah finalized, dengan rank (final_rank jika ada).
function getWinnerAwards(sub: MakmpSubmission): string[] {
  const names: string[] = [];
  const awards = sub.awards || [];
  for (const sa of awards) {
    if (!sa.is_finalized) continue;
    const label = sa.award?.name || 'Anugerah';
    if (typeof sa.final_rank === 'number' && sa.final_rank >= 1) {
      names.push(`${label} (#${sa.final_rank})`);
    } else {
      names.push(label);
    }
  }
  return names;
}

export default function MakmpWinnerDocsPanel({ submissions }: MakmpWinnerDocsPanelProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadIdx, setDownloadIdx] = useState<string | null>(null);
  const [zipProgress, setZipProgress] = useState<string>('');

  // Senarai pemenang (DIJEMPUT) sahaja
  const winners = useMemo(() => {
    return submissions.filter((s) => s.winner_status === 'DIJEMPUT');
  }, [submissions]);

  // Statistik ringkas
  const stats = useMemo(() => {
    const total = winners.length;
    const withPhoto = winners.filter((s) => s.winner_photo_url).length;
    const withIc = winners.filter((s) => s.winner_ic_no && s.winner_ic_no.trim() !== '').length;
    return { total, withPhoto, withIc };
  }, [winners]);

  // ── Muat turun satu gambar passport ────────────────────────────────────────
  const downloadPhoto = async (sub: MakmpSubmission) => {
    if (!sub.winner_photo_url) return;
    setDownloadIdx(sub.id);
    try {
      const res = await fetch(sub.winner_photo_url);
      if (!res.ok) throw new Error('Gagal muat turun imej (status ' + res.status + ')');
      const blob = await res.blob();
      const ext = (sub.winner_photo_url.split('.').pop() || 'jpg').split('?')[0];
      const cleanName = (sub.full_name || 'pelajar').replace(/[^a-zA-Z0-9]/g, '_');
      saveAs(blob, `${cleanName}_${sub.matric_no}_passport.${ext}`);
    } catch (err: any) {
      alert('Ralat: ' + (err.message || 'Gagal muat turun'));
    } finally {
      setDownloadIdx(null);
    }
  };

  // ── Muat turun SEMUA gambar sebagai ZIP ────────────────────────────────────
  const downloadAllZip = async () => {
    const withPhoto = winners.filter((s) => s.winner_photo_url);
    if (withPhoto.length === 0) {
      alert('Tiada gambar untuk dimuat turun.');
      return;
    }
    setDownloading(true);
    setZipProgress('Menyediakan...');
    try {
      const zip = new JSZip();
      const folder = zip.folder('makmp_pemenang')!;
      for (let i = 0; i < withPhoto.length; i++) {
        const sub = withPhoto[i];
        setZipProgress(`Memuat turun ${i + 1}/${withPhoto.length}: ${sub.full_name}`);
        const res = await fetch(sub.winner_photo_url!);
        if (!res.ok) continue;
        const blob = await res.blob();
        const ext = (sub.winner_photo_url!.split('.').pop() || 'jpg').split('?')[0];
        const cleanName = (sub.full_name || 'pelajar').replace(/[^a-zA-Z0-9]/g, '_');
        folder.file(`${cleanName}_${sub.matric_no}.${ext}`, blob);
      }
      setZipProgress('Menghasilkan ZIP...');
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `MAKMP_Pemenang_Passport_${Date.now()}.zip`);
      setZipProgress('');
    } catch (err: any) {
      alert('Ralat: ' + (err.message || 'Gagal menghasilkan ZIP'));
      setZipProgress('');
    } finally {
      setDownloading(false);
    }
  };

  // ── Export CSV (nama, matrik, telefon, no IC, email, anugerah, URL gambar) ─
  const exportCsv = () => {
    const rows = winners.map((s) => {
      const awardLabel = getWinnerAwards(s).join('; ') || '-';
      return [
        s.full_name,
        s.matric_no,
        s.phone || '',
        s.winner_ic_no || '',
        s.email || '',
        s.department || '',
        awardLabel,
        s.winner_photo_url || '',
      ];
    });
    const header = ['Nama', 'No. Matrik', 'No. Telefon', 'No. IC', 'Emel', 'Jabatan', 'Anugerah', 'URL Gambar'];
    const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `MAKMP_Senarai_IC_Pemenang_${Date.now()}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header + statistik */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <IdCard className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Dokumen Pemenang (Dicalonkan 3 Teratas)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Senarai nombor IC, gambar passport & muat turun untuk multimedia & urus setia.
          </p>
        </div>

        {/* Statistik */}
        <div className="flex flex-wrap gap-2">
          <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Jumlah:</span>{' '}
            <span className="font-bold text-slate-900 dark:text-white">{stats.total}</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Ada Gambar:</span>{' '}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.withPhoto}</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Ada IC:</span>{' '}
            <span className="font-bold text-blue-600 dark:text-blue-400">{stats.withIc}</span>
          </div>
        </div>
      </div>

      {/* Butang tindakan */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={downloadAllZip}
          disabled={downloading || stats.withPhoto === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderArchive className="w-4 h-4" />}
          Muat Turun Semua Gambar (ZIP)
        </button>
        <button
          onClick={exportCsv}
          disabled={stats.total === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Senarai IC (CSV)
        </button>
      </div>

      {zipProgress && (
        <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 rounded-xl px-4 py-2 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
          {zipProgress}
        </div>
      )}

      {/* Table */}
      {winners.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-500 text-sm shadow-sm">
          Tiada pemenang (Dicalonkan 3 Teratas) untuk edisi yang dipilih.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Gambar</th>
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Nama</th>
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">No. Matrik</th>
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">No. Telefon</th>
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">No. IC</th>
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Anugerah</th>
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {winners.map((sub) => {
                const awards = getWinnerAwards(sub);
                const hasPhoto = !!sub.winner_photo_url;
                const hasIc = !!sub.winner_ic_no && sub.winner_ic_no.trim() !== '';
                return (
                  <tr key={sub.id} className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    {/* Gambar thumbnail */}
                    <td className="px-4 py-3">
                      {hasPhoto ? (
                        <img
                          src={sub.winner_photo_url!}
                          alt={sub.full_name}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400">
                          <FileImage className="w-5 h-5" />
                        </div>
                      )}
                    </td>
                    {/* Nama */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{sub.full_name}</div>
                      {sub.email && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {sub.email}
                        </div>
                      )}
                    </td>
                    {/* Matrik */}
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{sub.matric_no}</td>
                    {/* Telefon */}
                    <td className="px-4 py-3">
                      {sub.phone ? (
                        <span className="font-mono text-slate-700 dark:text-slate-300">{sub.phone}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 italic">-</span>
                      )}
                    </td>
                    {/* IC */}
                    <td className="px-4 py-3 font-mono">
                      {hasIc ? (
                        <span className="text-slate-900 dark:text-white font-semibold tracking-wider">{sub.winner_ic_no}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 italic">Belum diisi</span>
                      )}
                    </td>
                    {/* Anugerah */}
                    <td className="px-4 py-3">
                      {awards.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {awards.map((a, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                              <Trophy className="w-3 h-3" /> {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      {hasPhoto && hasIc ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Lengkap
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" /> Belum lengkap
                        </span>
                      )}
                    </td>
                    {/* Tindakan */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => downloadPhoto(sub)}
                        disabled={!hasPhoto || downloadIdx === sub.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {downloadIdx === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageDown className="w-3.5 h-3.5" />}
                        Muat Turun
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
