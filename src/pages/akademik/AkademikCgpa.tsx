import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { hexToRgba } from '@/lib/utils';
import { uploadPdfToDrive } from '@/lib/driveUpload';
import {
  BookOpen, Upload, AlertCircle, CheckCircle, Loader2,
  FileText, Sparkles, Trash2, TrendingUp, TrendingDown, Minus,
  XCircle, MessageCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

const THEME = '#818CF8';
const HPNM_COLOR = '#818CF8';
const PNM_COLOR  = '#34D399';

// ─── Grade helper ─────────────────────────────────────────────
function gradeInfo(val: number) {
  // POLISAS grading: Cemerlang >= 3.5 (not 3.7)
  if (val >= 3.5) return { label: 'Cemerlang',  color: '#10B981', bg: 'rgba(16,185,129,0.12)' };
  if (val >= 3.0) return { label: 'Kepujian',   color: THEME,     bg: 'rgba(129,140,248,0.12)' };
  if (val >= 2.0) return { label: 'Lulus',      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
  return           { label: 'Gagal',            color: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
}

// ─── Semester label builder ───────────────────────────────────
function semLabel(semester: number, tahun: string) {
  return `Sem ${semester}${tahun ? ` · ${tahun}` : ''}`;
}

// ─── Custom Recharts Tooltip ──────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const hpnm = payload.find((p: any) => p.dataKey === 'hpnm')?.value;
  const pnm  = payload.find((p: any) => p.dataKey === 'pnm')?.value;
  return (
    <div className="px-4 py-3 rounded-2xl border border-white/10 bg-[#0F1629]/95 backdrop-blur-xl shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">{label}</p>
      {hpnm != null && (
        <p className="text-sm font-black" style={{ color: HPNM_COLOR }}>
          HPNM <span className="text-base">{Number(hpnm).toFixed(2)}</span>
        </p>
      )}
      {pnm != null && (
        <p className="text-sm font-black mt-0.5" style={{ color: PNM_COLOR }}>
          PNM <span className="text-base">{Number(pnm).toFixed(2)}</span>
        </p>
      )}
    </div>
  );
}

// ─── Read file as ArrayBuffer (iOS-safe) ─────────────────────
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Gagal membaca fail.'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Lazy-load pdfjs ─────────────────────────────────────────
async function extractCgpaFromPdf(file: File) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const buffer = await readFileAsArrayBuffer(file);

  // Try without worker first on iOS (more reliable), with worker on desktop
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const loadPdf = async (useWorker: boolean) => {
    const opts: any = { data: buffer };
    if (!useWorker) opts.disableWorker = true;
    const promise = pdfjsLib.getDocument(opts).promise;
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PDF terlalu lama untuk dibaca (timeout).')), 15000)
    );
    return Promise.race([promise, timeout]);
  };

  let pdf: any;
  if (isIOS) {
    // iOS: always use no-worker (worker .mjs often fails on WebKit)
    pdf = await loadPdf(false);
  } else {
    try {
      pdf = await loadPdf(true);
    } catch (workerErr) {
      console.warn('[cgpa-scan] Worker failed, retrying without worker:', workerErr);
      pdf = await loadPdf(false);
    }
  }

  let fullText = '';
  for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
  }

  // Empty text guard — PDF mungkin scan/gambar
  if (fullText.trim().length < 20) {
    console.warn('[cgpa-scan] PDF text terlalu pendek, mungkin scan/gambar:', fullText);
    return { hpnm: null, pnm: null, semester: null, tahun: null, rawText: fullText, scanFailed: true };
  }

  // ── Normalize: fix split decimals ("3 . 77" → "3.77") ──────
  let text = fullText.replace(/\s+/g, ' ').toUpperCase();
  text = text.replace(/(\d)\s+\.\s*(\d)/g, '$1.$2');
  text = text.replace(/(\d)\.\s+(\d)/g, '$1.$2');

  console.log('[cgpa-scan] Normalized text (first 800):', text.substring(0, 800));

  // ── Semester detection ─────────────────────────────────────
  const semWordMap: Record<string, number> = {
    'SATU': 1, 'DUA': 2, 'TIGA': 3, 'EMPAT': 4,
    'LIMA': 5, 'ENAM': 6, 'TUJUH': 7, 'LAPAN': 8, 'SEMBILAN': 9,
  };

  let semester: number | null = null;
  for (const p of [/SEMESTER\s*[:\-]?\s*([1-9])/, /SEM(?:ESTER)?\s*[:\-]?\s*([1-9])/, /SEM\.?\s*([1-9])\b/]) {
    const m = text.match(p);
    if (m) { semester = parseInt(m[1]); break; }
  }
  if (!semester) {
    const semWordMatch = text.match(/SEMESTER\s*[:\-]?\s*(SATU|DUA|TIGA|EMPAT|LIMA|ENAM|TUJUH|LAPAN|SEMBILAN)/);
    if (semWordMatch) semester = semWordMap[semWordMatch[1]] ?? null;
  }
  if (!semester) {
    const sesiMatch = text.match(/SESI\s+(I{1,3}|IV|V?I{0,3})\s*[:\s]/);
    if (sesiMatch) {
      const roman: Record<string, number> = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6 };
      semester = roman[sesiMatch[1].trim()] ?? null;
    }
  }

  // ── Tahun ──────────────────────────────────────────────────
  let tahun: string | null = null;
  for (const p of [/SESI\s+[IVX]+\s*[:\-]?\s*(\d{4}\s*\/\s*\d{4})/, /SESI\s*(\d{4}\s*\/\s*\d{4})/, /(\d{4}\s*\/\s*\d{4})/, /(\d{4}-\d{4})/]) {
    const m = text.match(p);
    if (m) { tahun = m[1].replace(/\s/g, ''); break; }
  }

  // ── Extract KEPUTUSAN zone (after grade table) ─────────────
  const keputusanIdx = text.indexOf('KEPUTUSAN');
  const keputusanZone = keputusanIdx >= 0 ? text.slice(keputusanIdx) : '';

  console.log('[cgpa-scan] Keputusan zone:', keputusanZone.substring(0, 300));

  // ── PASS 1: High confidence — labeled patterns on full text ──
  let hpnm: number | null = null;
  let pnm: number | null = null;

  const hpnmPatterns = [
    /HPNM\s*[:\-=]?\s*(\d\.\d{2})/,
    /H\.?P\.?N\.?M\.?\s*[:\-=]?\s*(\d\.\d{2})/,
    /CGPA\s*[:\-=]?\s*(\d\.\d{2,4})/,
    /PURATA\s+NILAI\s+MATA\s+KUMULATIF\s*[:\-]?\s*(\d\.\d{2})/,
    /CUMULATIVE\s*GPA\s*[:\-=]?\s*(\d\.\d{2})/,
  ];
  const pnmPatterns = [
    /PNM\s*[:\-=]?\s*(\d\.\d{2})/,
    /P\.?N\.?M\.?\s*[:\-=]?\s*(\d\.\d{2})/,
    /GPA\s+SEMESTER\s*[:\-=]?\s*(\d\.\d{2})/,
  ];

  for (const p of hpnmPatterns) {
    const m = text.match(p);
    if (m) { const v = parseFloat(m[1]); if (v >= 0 && v <= 4.0) { hpnm = v; break; } }
  }
  for (const p of pnmPatterns) {
    const m = text.match(p);
    if (m) { const v = parseFloat(m[1]); if (v >= 0 && v <= 4.0) { pnm = v; break; } }
  }

  // ── PASS 2: Medium confidence — scan KEPUTUSAN zone only ───
  if ((!hpnm || !pnm) && keputusanZone) {
    // Look for "PNM : X.XX" and "HPNM : X.XX" specifically in keputusan zone
    if (!pnm) {
      const pm = keputusanZone.match(/PNM\s*[:\-=]?\s*(\d\.\d{2})/);
      if (pm) { const v = parseFloat(pm[1]); if (v >= 0 && v <= 4.0) pnm = v; }
    }
    if (!hpnm) {
      const hm = keputusanZone.match(/HPNM\s*[:\-=]?\s*(\d\.\d{2})/);
      if (hm) { const v = parseFloat(hm[1]); if (v >= 0 && v <= 4.0) hpnm = v; }
    }
    // Fallback: find all decimals in keputusan zone (excludes grade table!)
    if (!hpnm || !pnm) {
      const decimals = [...keputusanZone.matchAll(/\b([0-4]\.\d{2})\b/g)]
        .map(m => parseFloat(m[1]))
        .filter(v => v >= 0 && v <= 4.0);
      // POLISAS format: "PNM : X.XX   HPNM : X.XX" — first = PNM, second = HPNM
      if (decimals.length >= 2) {
        if (!pnm) pnm = decimals[0];
        if (!hpnm) hpnm = decimals[1];
      } else if (decimals.length === 1 && !hpnm) {
        hpnm = decimals[0];
      }
    }
  }

  console.log('[cgpa-scan] Result:', { hpnm, pnm, semester, tahun });

  return { hpnm, pnm, semester, tahun, rawText: text.substring(0, 600), scanFailed: false };
}

// ─── Main CGPA Page ───────────────────────────────────────────
export function AkademikCgpa() {
  const { profile } = useAuth();
  const fileRef     = useRef<HTMLInputElement>(null);

  const [records,     setRecords]     = useState<any[]>([]);
  const [scanning,    setScanning]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [draftMode,   setDraftMode]   = useState<'NONE' | 'SCAN' | 'MANUAL'>('NONE');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Form fields matching real DB schema
  const [fHpnm,    setFHpnm]    = useState('');
  const [fPnm,     setFPnm]     = useState('');
  const [fSem,     setFSem]     = useState('');       // integer 1-6
  const [fTahun,   setFTahun]   = useState('');       // e.g. "2024/2025"
  const [scanOk,   setScanOk]   = useState<boolean | null>(null);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from('akademik_cgpa_records')
      .select('id, semester, tahun, hpnm, pnm, drive_view_url, created_at')
      .eq('user_id', profile.id)
      .order('tahun', { ascending: true })
      .order('semester', { ascending: true });
    if (error) console.error('[cgpa] load error:', error.message);
    setRecords(data || []);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  const handleFile = async (file: File) => {
    // Mobile browsers sometimes report empty or wrong MIME type — fallback to extension check
    const isPdf = file.type === 'application/pdf' ||
      file.type === '' ||
      file.name?.toLowerCase().endsWith('.pdf');
    if (!isPdf) { toast.error('PDF sahaja.'); return; }
    setScanning(true);
    setScanOk(null);
    setPendingFile(file);

    try {
      let result: any = null;

      // ── Strategy A: Server-side parsing (works on ALL devices incl. iOS) ──
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const formData = new FormData();
          formData.append('file', file);
          const resp = await fetch('/api/parse-cgpa-pdf', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData,
          });
          if (resp.ok) {
            result = await resp.json();
            console.log('[cgpa-scan] Server-side result:', result);
          }
        }
      } catch (serverErr) {
        console.warn('[cgpa-scan] Server parse failed, trying client-side:', serverErr);
      }

      // ── Strategy B: Client-side pdfjs (fallback for offline/dev) ──
      if (!result) {
        try {
          result = await extractCgpaFromPdf(file);
          console.log('[cgpa-scan] Client-side result:', result);
        } catch (clientErr) {
          console.warn('[cgpa-scan] Client-side parse also failed:', clientErr);
        }
      }

      // ── Apply result ──
      if (result && !result.scanFailed) {
        setFHpnm(result.hpnm?.toString() || '');
        setFPnm(result.pnm?.toString()   || '');
        setFSem(result.semester?.toString() || '');
        setFTahun(result.tahun || '');
        setScanOk(!!result.hpnm);
        setDraftMode('SCAN');
        if (result.hpnm) {
          toast.success(`HPNM ${Number(result.hpnm).toFixed(2)} berjaya dikesan!`);
        } else {
          toast('HPNM tidak dikesan — sila isi manual atau hubungi JPP.', { icon: '⚠️', duration: 4000 });
        }
      } else {
        // Both strategies failed
        setScanOk(false);
        setDraftMode('SCAN');
        toast('PDF diterima tetapi tidak dapat dianalisis.\nSila isi HPNM secara manual di bawah.', { icon: '📝', duration: 5000 });
      }
    } catch (e: any) {
      console.error('[cgpa-scan] PDF error:', e);
      setScanOk(false);
      setDraftMode('SCAN');
      toast('PDF diterima tetapi tidak dapat dianalisis.\nSila isi HPNM secara manual di bawah.', { icon: '📝', duration: 5000 });
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    const hpnm = parseFloat(fHpnm);
    if (isNaN(hpnm) || hpnm < 0 || hpnm > 4) {
      toast.error('HPNM mestilah antara 0.00 – 4.00'); return;
    }
    const semInt = parseInt(fSem);
    if (fSem && (isNaN(semInt) || semInt < 1 || semInt > 9)) {
      toast.error('Semester mestilah 1–9'); return;
    }

    setSaving(true);
    try {
      // Try upload PDF (non-blocking)
      let driveFileId: string | null  = null;
      let driveViewUrl: string | null = null;
      if (pendingFile) {
        try {
          const url = await uploadPdfToDrive(
            pendingFile, 'akademik',
            `transcript_${profile?.id}_${Date.now()}`
          );
          driveViewUrl = url;
        } catch (uploadErr: any) {
          console.warn('[cgpa] upload non-critical:', uploadErr.message);
        }
      }

      const { error } = await supabase.from('akademik_cgpa_records').insert({
        user_id:         profile?.id,
        hpnm:            hpnm,
        pnm:             fPnm ? parseFloat(fPnm) : null,
        semester:        fSem ? semInt : null,
        tahun:           fTahun || null,
        drive_file_id:   driveFileId,
        drive_view_url:  driveViewUrl,
        is_user_verified: true,
      });

      if (error) throw error;

      toast.success('Rekod HPNM berjaya disimpan!');
      
      // --- Trigger Push Notification ---
      try {
        const { sendNotificationToAkademikExco } = await import('@/lib/notifications');
        await sendNotificationToAkademikExco({
          title: 'Muat Naik HPNM Baru',
          message: `Pelajar telah memuat naik rekod HPNM baru (${hpnm.toFixed(2)}).`,
          type: 'DOCUMENT_UPLOAD',
          module: 'AKADEMIK',
          link: '/akademik/cgpa'
        });
      } catch (e) {
        console.error("Gagal menghantar notifikasi push", e);
      }
      
      setDraftMode('NONE');
      setFHpnm(''); setFPnm(''); setFSem(''); setFTahun('');
      setScanOk(null); setPendingFile(null);
      await load();
    } catch (e: any) {
      console.error('[cgpa] save error:', e);
      toast.error(`Gagal simpan: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Padam rekod ini?')) return;
    const { error } = await supabase.from('akademik_cgpa_records').delete().eq('id', id);
    if (error) { toast.error('Gagal padam.'); return; }
    setRecords(p => p.filter(r => r.id !== id));
    toast.success('Rekod dipadam.');
  };

  const resetDraft = () => {
    setDraftMode('NONE');
    setFHpnm(''); setFPnm(''); setFSem(''); setFTahun('');
    setScanOk(null); setPendingFile(null);
  };

  // Build chart data — oldest first
  const chartData = records.map(r => ({
    name:  semLabel(r.semester, r.tahun),
    hpnm:  r.hpnm  ? Number(r.hpnm)  : null,
    pnm:   r.pnm   ? Number(r.pnm)   : null,
  }));

  const latestRecord = records[records.length - 1];
  const prevRecord   = records[records.length - 2];
  const latestHpnm   = latestRecord ? Number(latestRecord.hpnm) : null;
  const grade        = latestHpnm ? gradeInfo(latestHpnm) : null;
  const trend        = latestHpnm && prevRecord
    ? latestHpnm - Number(prevRecord.hpnm)
    : null;

  const inDraft = draftMode !== 'NONE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-1">Akademik</p>
        <h1 className="text-2xl font-black text-white">HPNM / CGPA</h1>
        <p className="text-xs text-white/40 font-medium mt-1">
          Rekod dan pantau prestasi akademik anda dari semester ke semester
        </p>
      </div>

      {/* Hero — latest HPNM */}
      {latestHpnm && grade && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] p-6 border border-white/[0.06]"
          style={{ background: `linear-gradient(135deg, ${grade.bg}, rgba(15,22,41,0.8))` }}
        >
          <div className="flex items-center gap-5">
            <div
              className="w-20 h-20 rounded-3xl flex flex-col items-center justify-center shrink-0"
              style={{ background: hexToRgba(grade.color, 0.15), border: `1px solid ${hexToRgba(grade.color, 0.3)}` }}
            >
              <span className="text-xl font-black" style={{ color: grade.color }}>
                {latestHpnm.toFixed(2)}
              </span>
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-0.5">HPNM</span>
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Terkini</p>
              <p className="text-xl font-black text-white">{grade.label}</p>
              <p className="text-[10px] font-bold text-white/40 mt-1">
                {semLabel(latestRecord.semester, latestRecord.tahun)}
              </p>
            </div>
            {/* Trend indicator */}
            {trend !== null && (
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end">
                  {trend > 0.001
                    ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                    : trend < -0.001
                    ? <TrendingDown className="w-4 h-4 text-rose-400" />
                    : <Minus className="w-4 h-4 text-white/30" />
                  }
                  <span className={`text-sm font-black ${trend > 0.001 ? 'text-emerald-400' : trend < -0.001 ? 'text-rose-400' : 'text-white/30'}`}>
                    {trend > 0 ? '+' : ''}{trend.toFixed(2)}
                  </span>
                </div>
                <p className="text-[9px] text-white/25 font-medium mt-0.5">vs semester lepas</p>
                <p className="text-xs font-black text-white/50 mt-1">
                  PNM: <span style={{ color: PNM_COLOR }}>{latestRecord.pnm ? Number(latestRecord.pnm).toFixed(2) : '—'}</span>
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── AREA CHART ──────────────────────────────────────── */}
      {chartData.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Trend HPNM</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-full" style={{ background: HPNM_COLOR }} />
                <span className="text-[9px] font-black text-white/30">HPNM</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-full" style={{ background: PNM_COLOR }} />
                <span className="text-[9px] font-black text-white/30">PNM</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradHpnm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={HPNM_COLOR} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={HPNM_COLOR} stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gradPnm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={PNM_COLOR} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={PNM_COLOR} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 4]}
                tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                tickCount={5}
              />
              {/* Reference lines for grade boundaries */}
              <ReferenceLine y={3.5} stroke="#10B981" strokeDasharray="4 4" strokeOpacity={0.3} />
              <ReferenceLine y={3.0} stroke={THEME}    strokeDasharray="4 4" strokeOpacity={0.25} />
              <ReferenceLine y={2.0} stroke="#F59E0B"  strokeDasharray="4 4" strokeOpacity={0.25} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="pnm"
                stroke={PNM_COLOR}
                strokeWidth={2}
                fill="url(#gradPnm)"
                dot={{ fill: PNM_COLOR, r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: PNM_COLOR, strokeWidth: 0 }}
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="hpnm"
                stroke={HPNM_COLOR}
                strokeWidth={2.5}
                fill="url(#gradHpnm)"
                dot={{ fill: HPNM_COLOR, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: HPNM_COLOR, strokeWidth: 0 }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
          {/* Grade bands legend */}
          <div className="flex items-center gap-4 mt-3 justify-end">
            {[
              { label: '≥3.50 Cemerlang', color: '#10B981' },
              { label: '≥3.00 Kepujian',  color: THEME },
              { label: '≥2.00 Lulus',     color: '#F59E0B' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-1">
                <div className="w-6 border-t border-dashed" style={{ borderColor: b.color, opacity: 0.5 }} />
                <span className="text-[8px] font-black" style={{ color: b.color, opacity: 0.6 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── INPUT FORM ──────────────────────────────────────── */}
      <div className="rounded-[2rem] bg-white/[0.02] border border-white/[0.05] p-5 space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
          <Upload className="w-3.5 h-3.5" /> Tambah Rekod HPNM
        </h3>

        <input
          ref={fileRef}
          id="cgpa-pdf-upload"
          type="file"
          accept="*/*"
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            // Reset AFTER processing — iOS cancels selection if reset too early
            setTimeout(() => { if (fileRef.current) fileRef.current.value = ''; }, 500);
          }}
        />

        {!inDraft ? (
          <div className="space-y-3">
            {/* Use <label> instead of <button onClick={.click()}> — iOS Safari blocks programmatic file input clicks */}
            <label
              htmlFor={scanning ? undefined : "cgpa-pdf-upload"}
              className={`w-full py-8 rounded-2xl border-2 border-dashed border-white/[0.08] hover:border-white/[0.15] text-white/30 hover:text-white/50 transition-all flex flex-col items-center gap-3 cursor-pointer ${scanning ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {scanning ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: THEME }} />
                  <p className="text-xs font-black uppercase tracking-widest">Menganalisis PDF...</p>
                </>
              ) : (
                <>
                  <FileText className="w-8 h-8" />
                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest">Muat Naik Transkrip PDF</p>
                    <p className="text-[9px] text-white/20 mt-1">Slip peperiksaan / transkrip POLISAS — HPNM dikesan automatik</p>
                  </div>
                </>
              )}
            </label>
            <button
              onClick={() => setDraftMode('MANUAL')}
              className="flex items-center gap-1.5 mx-auto text-[10px] font-black text-white/25 hover:text-white/50 transition-colors uppercase tracking-widest"
            >
              <Sparkles className="w-3 h-3" />
              Isi secara manual (tanpa PDF)
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Scan feedback */}
            {draftMode === 'SCAN' && scanOk !== null && (
              scanOk ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs font-black text-emerald-300">HPNM berjaya dikesan daripada PDF. Semak dan sahkan di bawah.</p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <p className="text-xs font-black text-rose-300">Gagal dimuatnaik — format PDF tidak dikenali.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://wa.me/601139413699?text=Salam%2C%20saya%20ada%20masalah%20muat%20naik%20slip%20HPNM%20di%20portal%20JPP."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-black text-emerald-300 hover:bg-emerald-500/25 transition-all uppercase tracking-widest"
                    >
                      <MessageCircle className="w-3 h-3" /> Hubungi JPP
                    </a>
                    <button
                      onClick={() => setDraftMode('MANUAL')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[10px] font-black text-white/40 hover:text-white/60 transition-all uppercase tracking-widest"
                    >
                      <Sparkles className="w-3 h-3" /> Isi Manual
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Form fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5">HPNM (Kumulatif) *</label>
                <input
                  type="number" step="0.01" min="0" max="4"
                  value={fHpnm}
                  onChange={e => setFHpnm(e.target.value)}
                  placeholder="0.00 – 4.00"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 font-black"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5">PNM (Semester ini)</label>
                <input
                  type="number" step="0.01" min="0" max="4"
                  value={fPnm}
                  onChange={e => setFPnm(e.target.value)}
                  placeholder="0.00 – 4.00"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5">Semester (1–9)</label>
                <input
                  type="number" min="1" max="9" step="1"
                  value={fSem}
                  onChange={e => setFSem(e.target.value)}
                  placeholder="cth: 2"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5">Sesi Tahun</label>
                <input
                  value={fTahun}
                  onChange={e => setFTahun(e.target.value)}
                  placeholder="cth: 2024/2025"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20"
                />
              </div>
            </div>

            {/* Live preview grade */}
            {fHpnm && !isNaN(parseFloat(fHpnm)) && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: gradeInfo(parseFloat(fHpnm)).bg }}>
                <BookOpen className="w-4 h-4 shrink-0" style={{ color: gradeInfo(parseFloat(fHpnm)).color }} />
                <span className="text-xs font-black" style={{ color: gradeInfo(parseFloat(fHpnm)).color }}>
                  {parseFloat(fHpnm).toFixed(2)} — {gradeInfo(parseFloat(fHpnm)).label}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                style={{ background: THEME, color: '#fff' }}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {saving ? 'Menyimpan...' : 'Simpan Rekod'}
              </button>
              <button
                onClick={resetDraft}
                className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white/30 hover:text-white/60 bg-white/[0.04]"
              >
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── GRADE SCALE ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-3">Skala HPNM</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { range: '3.50 – 4.00', label: 'Cemerlang', color: '#10B981' },
            { range: '3.00 – 3.49', label: 'Kepujian',  color: THEME },
            { range: '2.00 – 2.99', label: 'Lulus',     color: '#F59E0B' },
            { range: '< 2.00',      label: 'Gagal',     color: '#EF4444' },
          ].map(item => (
            <div key={item.range} className="p-2.5 rounded-xl" style={{ background: hexToRgba(item.color, 0.08) }}>
              <p className="text-xs font-black" style={{ color: item.color }}>{item.label}</p>
              <p className="text-[9px] text-white/30 font-medium mt-0.5">{item.range}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SEMESTER HISTORY ─────────────────────────────────── */}
      {records.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">
            Rekod Semester ({records.length})
          </h3>
          <div className="space-y-2.5">
            {[...records].reverse().map((r, i) => {
              const hpnm  = Number(r.hpnm);
              const g     = gradeInfo(hpnm);
              const pnm   = r.pnm ? Number(r.pnm) : null;
              // Compare with next older record
              const older = records[records.length - 2 - i];
              const diff  = older ? hpnm - Number(older.hpnm) : null;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0"
                    style={{ background: g.bg, border: `1px solid ${hexToRgba(g.color, 0.2)}` }}
                  >
                    <span className="text-base font-black" style={{ color: g.color }}>{hpnm.toFixed(2)}</span>
                    <span className="text-[7px] font-black text-white/20 uppercase">HPNM</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-white">
                        {r.semester ? `Semester ${r.semester}` : 'Sem —'}
                      </p>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: hexToRgba(g.color, 0.12), color: g.color }}>
                        {g.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/30 font-bold mt-0.5">
                      {r.tahun || '—'}
                      {pnm !== null && (
                        <> · PNM: <span style={{ color: PNM_COLOR }}>{pnm.toFixed(2)}</span></>
                      )}
                      {diff !== null && (
                        <span className={`ml-3 ${diff > 0.001 ? 'text-emerald-400' : diff < -0.001 ? 'text-rose-400' : 'text-white/20'}`}>
                          {diff > 0 ? '↑' : diff < 0 ? '↓' : '='}{Math.abs(diff).toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                  {r.drive_view_url && (
                    <a href={r.drive_view_url} target="_blank" rel="noopener noreferrer"
                      className="text-[9px] font-black text-white/20 hover:text-white/50 underline shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                      Transkrip
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-2 rounded-xl text-white/15 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {records.length === 0 && !inDraft && (
        <div className="py-16 text-center space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-white/10" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Tiada rekod HPNM lagi</p>
          <p className="text-[9px] text-white/15">Muat naik transkrip atau isi manual untuk mulakan</p>
        </div>
      )}
    </div>
  );
}
