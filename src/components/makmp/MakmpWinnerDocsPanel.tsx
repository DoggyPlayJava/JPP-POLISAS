import React, { useMemo, useState } from 'react';
import { Download, FileImage, IdCard, ImageDown, Loader2, CheckCircle2, AlertCircle, FolderArchive, FileSpreadsheet, Mail, Trophy, Phone } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type ExcelJS from 'exceljs';
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

  // ── Export XLSX: group mengikut anugerah ───────────────────────────────────
  // - Sheet "Senarai Penuh": anugerah → 1) 2) 3) (numbering = rank sebenar).
  // - Sheet "Rawak (Pendaftaran)": anugerah → i) ii) iii) (nama di-shuffle,
  //   numbering TIDAK mewakili rank supaya pendaftaran tak tahu pemenang).
  // - No. IC / matrik / telefon diset TEXT (elak scientific notation).
  // - Gambar passport diwakili LINK Storage Supabase (bukan embed).
  const [exportingXlsx, setExportingXlsx] = useState(false);

  // Bina senarai pemenang dikumpulkan mengikut anugerah.
  // Setiap pemenang = submission (winner_status DIJEMPUT) dengan salah satu
  // application award yang menang (final_rank <= 3 atau is_finalized && menang).
  // Urutan dalam group: final_rank ASC, fallback total_merit_granted DESC.
  const buildAwardGroups = () => {
    // Map award name -> list of {sub, final_rank, merit}
    const byAward = new Map<string, { sub: MakmpSubmission; rank: number; merit: number }[]>();

    for (const sub of winners) {
      const awards = sub.awards || [];
      for (const sa of awards) {
        if (!sa.is_finalized) continue;
        const rank = typeof sa.final_rank === 'number' && sa.final_rank >= 1 ? sa.final_rank : 0;
        const merit = sa.total_merit_granted || 0;
        // Hanya masukkan jika pelajar ini MENANG anugerah ini (rank <= 3) ATAU
        // winner_status DIJEMPUT (tidak ada final_rank kerana finalized lama).
        // Untuk finalized lama, semua DIJEMPUT adalah pemenang.
        const isWinner = rank > 0 ? rank <= 3 : sub.winner_status === 'DIJEMPUT';
        if (!isWinner) continue;
        const name = sa.award?.name || 'Anugerah';
        if (!byAward.has(name)) byAward.set(name, []);
        byAward.get(name)!.push({ sub, rank, merit });
      }
    }

    // Urutkan setiap group ikut rank (fallback merit DESC)
    const groups: { name: string; members: { sub: MakmpSubmission; rank: number; merit: number }[] }[] = [];
    for (const [name, members] of byAward) {
      members.sort((a, b) => {
        if (a.rank > 0 && b.rank > 0) return a.rank - b.rank;
        if (a.rank > 0) return -1;
        if (b.rank > 0) return 1;
        return b.merit - a.merit;
      });
      groups.push({ name, members });
    }
    // Urutkan group ikut nama anugerah (stabil)
    groups.sort((a, b) => a.name.localeCompare(b.name));
    return groups;
  };

  const exportXlsxFile = async () => {
    if (exportingXlsx) return;
    setExportingXlsx(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'JPP POLISAS';
      wb.created = new Date();

      const groups = buildAwardGroups();

      // Kolum tetap: No. | Nama | No. Matrik | No. Telefon | No. IC | Emel | Jabatan | Gambar
      const HEADERS = ['No.', 'Nama', 'No. Matrik', 'No. Telefon', 'No. IC', 'Emel', 'Jabatan', 'Gambar (Link)'];
      const WIDTHS = [8, 30, 16, 16, 16, 26, 22, 40];
      const TEXT_COLS = [2, 3, 4, 7]; // 0-indexed: No. Matrik, No. Telefon, No. IC, Gambar(link)

      const roman = (n: number) => {
        const map = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
        return map[n - 1] || String(n);
      };

      // Helper: isi satu sheet mengikut sama ada penuh (rank) atau rawak (shuffle)
      const fillSheet = (ws: ExcelJS.Worksheet, randomize: boolean) => {
        // Header row
        const hdr = ws.addRow(HEADERS);
        hdr.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });
        hdr.height = 22;
        HEADERS.forEach((_, i) => {
          ws.getColumn(i + 1).width = WIDTHS[i];
        });

        for (const group of groups) {
          // Baris header anugerah (bold, berwarna, merge)
          const awardRow = ws.addRow([group.name]);
          awardRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF0D9488' } };
          awardRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF6F5' } };
          ws.mergeCells(awardRow.number, 1, awardRow.number, HEADERS.length);
          awardRow.height = 20;

          // Susunan ahli: rank sebenar ATAU shuffle (Fisher-Yates)
          let members = [...group.members];
          if (randomize) {
            for (let i = members.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [members[i], members[j]] = [members[j], members[i]];
            }
          }

          members.forEach((m, idx) => {
            const no = randomize ? `${roman(idx + 1)})` : `${idx + 1})`;
            const s = m.sub;
            const row = ws.addRow([
              no,
              s.full_name,
              s.matric_no || '',
              s.phone || '',
              s.winner_ic_no || '',
              s.email || '',
              s.department || '',
              s.winner_photo_url || '',
            ]);
            // Tebalkan No. & Nama
            row.getCell(1).font = { bold: true };
            row.getCell(2).font = { bold: true };
            // Zebra
            if (idx % 2 === 0) {
              row.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
              });
            }
          });

          // Baris kosong pemisah antara group
          ws.addRow([]);
        }

        // Paksa kolum sensitif (No. Matrik, Telefon, IC, Gambar link) sebagai TEXT
        TEXT_COLS.forEach((colIdx) => {
          const col = ws.getColumn(colIdx + 1);
          col.eachCell((cell, rowNumber) => {
            if (rowNumber > 1 && cell.value !== null && cell.value !== undefined && cell.value !== '') {
              cell.numFmt = '@';
              cell.value = String(cell.value);
            }
          });
        });

        // Gambar link → hyperlink (klik buka terus)
        const linkCol = 8;
        ws.getColumn(linkCol).eachCell((cell, rowNumber) => {
          if (rowNumber > 1 && typeof cell.value === 'string' && cell.value.startsWith('http')) {
            const url = cell.value as string;
            cell.value = { text: 'Buka Gambar', hyperlink: url };
            cell.font = { color: { argb: 'FF2563EB' }, underline: true };
          }
        });

        ws.views = [{ state: 'frozen', ySplit: 1 }];
      };

      const wsFull = wb.addWorksheet('Senarai Penuh');
      fillSheet(wsFull, false);

      const wsRawak = wb.addWorksheet('Rawak (Pendaftaran)');
      fillSheet(wsRawak, true);

      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `MAKMP_Dokumen_Pemenang_${Date.now()}.xlsx`);
    } catch (err: any) {
      alert('Ralat: ' + (err.message || 'Gagal menghasilkan XLSX'));
    } finally {
      setExportingXlsx(false);
    }
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
          onClick={exportXlsxFile}
          disabled={stats.total === 0 || exportingXlsx}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {exportingXlsx ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          Export Dokumen Pemenang (XLSX)
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
