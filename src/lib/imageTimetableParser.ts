// ============================================================
// imageTimetableParser.ts
// Convert a timetable screenshot/photo into the SAME PdfTextItem[]
// format used by the existing PDF parser, then reuse
// extractTimetableFromItems() untouched.
//
// Pipeline:
//   1. classify  -> screenshot vs physical photo (4 geometric signals)
//   2. upscale   -> 3x NEAREST (crisp edges; tesseract fails at 1x)
//   3. ocr       -> tesseract.js word boxes (flattened from blocks)
//   4. dayfix    -> dedicated left-column crop + extra upscale for day labels
//   5. normalize -> word boxes -> PdfTextItem[] (PDF-style coords)
//   6. reuse     -> extractTimetableFromItems()
// ============================================================

import { extractTimetableFromItems, DAY_NAMES } from './timetableParser';
import type { PdfTextItem, RoomLocationLookup } from './timetableParser';
import type { ImapsRoomMapping, StudentTimetableEntry } from '@/types';

export type ImageQualityLabel = 'SCREENSHOT' | 'FOTO_FIZIKAL' | 'KUALITI_RENDAH';

export interface ImageQualitySignals {
  grid: number;        // 0-100
  sharpness: number;   // 0-100
  lighting: number;    // 0-100
  resolution: number;  // 0-100
}

export interface ImageQualityReport {
  score: number;             // 0-100 overall
  label: ImageQualityLabel;
  signals: ImageQualitySignals;
  geoScore: number;          // 0-100 blended geometry (35% weight)
  ocrConfidence: number;     // 0-100 mean word confidence (45% weight)
  daysDetected: number;      // 0-5 (20% weight)
}

export interface ImageTimetableResult {
  quality: ImageQualityReport;
  metadata: { session: string; effectiveDate: string; className: string; department: string };
  entries: Omit<StudentTimetableEntry, 'id' | 'user_id'>[];
}

// ── canonical coordinate space (PDF-like) ─────────────────────
// Parser assumes PDF coords: x in page points (~595 A4 width), y bottom-up.
// We normalize image coords into this space so extractTimetableFromItems()
// behaves identically to its PDF path.
const CANON_W = 595;
const CANON_H = 842;

// OCR upscale factor. Measured (real timetable screenshots):
//   NEAREST 3x -> 2-3 entries, day conf ~88 (glyphs too chunky for dense tables)
//   BILINEAR 4x -> 12 entries, day conf 89-92, ISNIN+KHAMIS readable
// BILINEAR interpolation is what makes dense subject codes (DEE30163) survive.
const BASE_UPSCALE = 4;
// ponytail: canvas.toBlob() returns null once canvas AREA exceeds the browser
// limit (iOS Safari ~16.7M px, some Android lower) -> tesseract worker calls
// readAsArrayBuffer(null) and throws. Long-edge caps are NOT enough (a 4x
// 2312px screenshot is 40M px). Cap by AREA so every device stays under limit.
const MAX_CANVAS_AREA = 16_000_000;

// Left day-column crop: fraction of image width + extra upscale for legibility.
// Day labels (ISNIN..JUMAAT) sit in the left ~13%; upscaling them 2x more
// lets tesseract read all 5 reliably where full-table OCR misses 1-2.
const DAY_COL_FRAC = 0.13;
const DAY_COL_EXTRA = 2;

interface OcrWord {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  conf: number;
}

// ── 1. classification (pixel-level geometry) ──────────────────
// Reads an HTMLImageElement/ImageBitmap, downsamples, and computes 4 signals
// that cleanly separate a digital screenshot from a photo of paper.
export function computeImageQuality(
  source: CanvasImageSource,
  width: number,
  height: number,
): ImageQualitySignals {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  // downsample to max ~800px on long edge for speed
  const maxDim = 800;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(source, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const N = w * h;

  // grayscale
  const gray = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  }

  // -- lighting uniformity: std of block means (photo paper = high variance)
  const block = Math.max(4, Math.round(w / 20));
  const bw = Math.floor(w / block);
  const bh = Math.floor(h / block);
  const means: number[] = [];
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let s = 0;
      for (let y = by * block; y < (by + 1) * block; y++) {
        for (let x = bx * block; x < (bx + 1) * block; x++) {
          s += gray[y * w + x];
        }
      }
      means.push(s / (block * block));
    }
  }
  const mean = means.reduce((a, b) => a + b, 0) / means.length;
  const variance = means.reduce((a, b) => a + (b - mean) * (b - mean), 0) / means.length;
  const lightingStd = Math.sqrt(variance);

  // -- sharpness: laplacian variance (approx 3x3)
  let lapSum = 0;
  let lapSq = 0;
  let lapN = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = gray[y * w + x];
      const l =
        4 * c -
        gray[(y - 1) * w + x] -
        gray[(y + 1) * w + x] -
        gray[y * w + (x - 1)] -
        gray[y * w + (x + 1)];
      lapSum += l;
      lapSq += l * l;
      lapN++;
    }
  }
  const lapMean = lapSum / lapN;
  const lapVar = lapSq / lapN - lapMean * lapMean;

  // -- grid detection: count long horizontal/vertical dark lines
  const binary = new Uint8Array(N);
  for (let i = 0; i < N; i++) binary[i] = gray[i] < 140 ? 1 : 0;
  const rowSum = new Float32Array(h);
  const colSum = new Float32Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) rowSum[y] += binary[y * w + x];
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) colSum[x] += binary[y * w + x];
  }
  const countLines = (sums: Float32Array) => {
    const mx = Math.max(...sums);
    if (mx <= 0) return 0;
    const th = mx * 0.15;
    let n = 0;
    let last = -10;
    for (let i = 0; i < sums.length; i++) {
      if (sums[i] > th && i - last > 6) {
        n++;
        last = i;
      }
    }
    return n;
  };
  const hLines = countLines(rowSum);
  const vLines = countLines(colSum);

  // -- resolution
  const resScore = Math.min(1, (width * height) / (1500 * 1100));

  // -- convert raw metrics to 0-100 sub-scores
  const gridScore = hLines >= 5 && vLines >= 6 ? 100 : hLines >= 3 && vLines >= 4 ? 55 : 12;
  const sharpScore = lapVar > 1500 ? 100 : lapVar > 600 ? 60 : 15;
  const lightScore = lightingStd < 25 ? 100 : lightingStd < 45 ? 55 : 15;
  const resScore100 = resScore * 100;

  return {
    grid: gridScore,
    sharpness: sharpScore,
    lighting: lightScore,
    resolution: Math.round(resScore100),
  };
}

export function qualityScore(signals: ImageQualitySignals): number {
  return Math.round(
    0.4 * signals.grid + 0.25 * signals.sharpness + 0.2 * signals.lighting + 0.15 * signals.resolution,
  );
}

export function qualityLabel(score: number): ImageQualityLabel {
  if (score >= 75) return 'SCREENSHOT';
  if (score >= 40) return 'FOTO_FIZIKAL';
  return 'KUALITI_RENDAH';
}

// ── 3. OCR via tesseract.js (lazy-loaded) ──────────────────────
let _workerPromise: Promise<any> | null = null;

async function getWorker() {
  if (!_workerPromise) {
    // ponytail: uses default CDN for wasm + traineddata. If offline OCR is ever
    // required, bundle tesseract core + eng.traineddata locally and set workerPath.
    _workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: () => {},
      });
      return worker;
    })();
  }
  return _workerPromise;
}

// Render a source bitmap to an upscaled canvas (BILINEAR for legible glyphs).
function renderUpscaled(
  source: CanvasImageSource,
  width: number,
  height: number,
  scale: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const clamp = Math.min(1, Math.sqrt(MAX_CANVAS_AREA / (width * height * scale * scale)));
  canvas.width = Math.max(1, Math.round(width * scale * clamp));
  canvas.height = Math.max(1, Math.round(height * scale * clamp));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true; // BILINEAR — NEAREST makes dense codes chunky
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Flatten tesseract v7 blocks -> paragraphs -> lines -> words.
// NOTE: `data.words` is NOT populated by tesseract.js v7 — words only exist
// nested under blocks. Request { blocks: true } and flatten here.
async function ocrWords(canvas: HTMLCanvasElement): Promise<{ words: OcrWord[]; confidence: number }> {
  const worker = await getWorker();
  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  const words: OcrWord[] = [];
  for (const b of data.blocks || []) {
    for (const p of b.paragraphs || []) {
      for (const l of p.lines || []) {
        for (const w of l.words || []) {
          if (!w.text || !w.text.trim()) continue;
          words.push({
            text: w.text.trim(),
            x0: w.bbox.x0,
            y0: w.bbox.y0,
            x1: w.bbox.x1,
            y1: w.bbox.y1,
            conf: w.confidence,
          });
        }
      }
    }
  }
  return { words, confidence: data.confidence ?? 0 };
}

// ── 5. normalize word boxes -> PdfTextItem[] ───────────────────
// OCR garbles class-type suffixes: (PM)->(P), (TY)/(TV)->(TU), (M)->(L).
// Normalize before feeding to the parser so course codes aren't dropped.
function normalizeOcrText(raw: string): string {
  return raw
    .replace(/\(PM\)/gi, '(P)')
    .replace(/\(TY\)|\(TV\)|\(T\)/gi, '(TU)')
    .replace(/\(M\)/gi, '(L)');
}

function toPdfItems(words: OcrWord[], imgW: number, imgH: number): PdfTextItem[] {
  return words.map((w) => ({
    str: normalizeOcrText(w.text),
    x: (w.x0 / imgW) * CANON_W,
    y: ((imgH - w.y0) / imgH) * CANON_H, // flip y: image top-down -> PDF bottom-up
    width: ((w.x1 - w.x0) / imgW) * CANON_W,
    height: ((w.y1 - w.y0) / imgH) * CANON_H,
  }));
}

// ── legend extraction (course name from the KOD/NAMA KURSUS table) ──
// JKE timetables carry a legend below the 5-day grid: [KOD] NAMA KURSUS JAM.
// Full-table OCR garbles the bracket codes, but a tight column crop at 6x
// BILINEAR reads both columns cleanly (verified: 8/8 exact matches). We OCR
// the two columns from the NATIVE bitmap (not the 4x canvas — BILINEAR there
// blurs the small glyphs) and fuzzy-match each code against the grid codes.

const LEGEND_TOP = 0.6;    // legend starts ~60% down the page (below 5 day rows)
const LEGEND_BOT = 0.9;
const LEGEND_CODE_X0 = 0.094;
const LEGEND_CODE_X1 = 0.122;
const LEGEND_NAME_X0 = 0.123;
const LEGEND_NAME_X1 = 0.282;
const LEGEND_EXTRA = 6;    // total upscale for legible column glyphs

function foldCode(s: string): string {
  const map: Record<string, string> = { O: '0', Q: '0', D: '0', I: '1', L: '1', Z: '2', S: '5', G: '6', B: '8', T: '7', A: '4' };
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '').split('').map((c) => map[c] ?? c).join('');
}

function levDistance(a: string, b: string): number {
  a = a.toUpperCase().replace(/[^A-Z0-9]/g, '');
  b = b.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!a || !b) return 99;
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = old;
    }
  }
  return dp[b.length];
}

async function ocrColumnLines(
  src: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  extra: number,
): Promise<string[]> {
  const c = document.createElement('canvas');
  const clamp = Math.min(1, Math.sqrt(MAX_CANVAS_AREA / (sw * sh * extra * extra)));
  c.width = Math.max(1, Math.round(sw * extra * clamp));
  c.height = Math.max(1, Math.round(sh * extra * clamp));
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
  const worker = await getWorker();
  await worker.setParameters({ tessedit_pageseg_mode: '6' }); // single column -> one line per row
  try {
    const { data } = await worker.recognize(c, {}, { blocks: true });
    const lines: string[] = [];
    for (const b of data.blocks || []) {
      for (const p of b.paragraphs || []) {
        for (const l of p.lines || []) {
          const t = (l.text || '').trim();
          if (t) lines.push(t);
        }
      }
    }
    return lines;
  } finally {
    await worker.setParameters({ tessedit_pageseg_mode: '3' });
  }
}

async function extractLegendNames(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  rotated: boolean,
): Promise<Map<string, string>> {
  const cw = rotated ? height : width;
  const ch = rotated ? width : height;
  const full = document.createElement('canvas');
  full.width = cw;
  full.height = ch;
  const fctx = full.getContext('2d')!;
  if (rotated) {
    fctx.translate(cw, 0);
    fctx.rotate(Math.PI / 2);
    fctx.drawImage(bitmap, 0, 0, ch, cw);
  } else {
    fctx.drawImage(bitmap, 0, 0, cw, ch);
  }

  const y0 = Math.round(ch * LEGEND_TOP);
  const y1 = Math.round(ch * LEGEND_BOT);
  const codes = await ocrColumnLines(full, Math.round(cw * LEGEND_CODE_X0), y0, Math.round(cw * (LEGEND_CODE_X1 - LEGEND_CODE_X0)), y1 - y0, LEGEND_EXTRA);
  const names = await ocrColumnLines(full, Math.round(cw * LEGEND_NAME_X0), y0, Math.round(cw * (LEGEND_NAME_X1 - LEGEND_NAME_X0)), y1 - y0, LEGEND_EXTRA);

  const map = new Map<string, string>(); // folded code -> name
  const n = Math.min(codes.length, names.length);
  for (let i = 0; i < n; i++) {
    const code = codes[i].toUpperCase().replace(/[^A-Z0-9]/g, '');
    const name = names[i].trim();
    if (!code || code === 'KOD') continue;
    if (/^(NAMA|JUMLAH|JAM)/i.test(name)) continue;
    if (name) map.set(foldCode(code), name);
  }
  return map;
}

function lookupLegendName(map: Map<string, string>, courseCode: string): string | undefined {
  if (map.size === 0) return undefined;
  const f = foldCode(courseCode);
  if (map.has(f)) return map.get(f);
  for (const [k, v] of map) {
    if (levDistance(k, f) <= 1) return v;
  }
  return undefined;
}

// Find day labels in a set of words and return canonical Y per day.
function detectDays(
  words: OcrWord[],
  imgW: number,
  imgH: number,
): Map<string, number> {
  const found = new Map<string, number>();
  for (const w of words) {
    const upper = w.text.toUpperCase().replace(/[^A-Z]/g, '');
    for (const day of DAY_NAMES) {
      if (found.has(day)) continue;
      if (upper === day || (upper.length >= 2 && upper.includes(day))) {
        // canonical Y = bottom-up, using word center
        const centerY = (w.y0 + w.y1) / 2;
        const canonY = ((imgH - centerY) / imgH) * CANON_H;
        found.set(day, canonY);
      }
    }
  }
  return found;
}

// ── main entry ─────────────────────────────────────────────────
// Minimum long-edge resolution for OCR to be reliable. Measured on real
// uploads: native screenshots (~2312px) read codes at 74-91% confidence,
// while WhatsApp/Telegram-compressed images (~1179px) collapse glyphs to
// ~4px and OCR returns garbage. Below this we reject early with a clear
// hint instead of shipping a fuzzy (wrong) timetable.
const RESOLUTION_GATE = 1500;

export async function parseTimetableImage(
  file: File | Blob,
  roomMappings: ImapsRoomMapping[] = [],
  locations: RoomLocationLookup[] = [],
): Promise<ImageTimetableResult> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const upscale = Math.min(BASE_UPSCALE, Math.sqrt(MAX_CANVAS_AREA / (width * height)));

  const longEdge = Math.max(width, height);
  if (longEdge < RESOLUTION_GATE) {
    throw new Error('RESOLUTION_RENDAH');
  }

  // classify on original
  const signals = computeImageQuality(bitmap, width, height);
  const geoScore = qualityScore(signals);

  // A timetable is WIDE (more time columns than day rows). A portrait upload
  // (height > width) is a screenshot taken sideways — auto-rotate 90° CW.
  // We OCR the candidate orientation, then fall back to the rotated one if
  // day-label coverage is poor (a sideways image reads garbage at ~30% conf).
  const isPortrait = height > width;

  const ocrOrientation = async (rotated: boolean) => {
    const cw = rotated ? height : width;
    const ch = rotated ? width : height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cw * upscale);
    canvas.height = Math.round(ch * upscale);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true; // BILINEAR
    ctx.imageSmoothingQuality = 'high';
    if (rotated) {
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2); // 90° CW: portrait -> landscape
      ctx.drawImage(bitmap, 0, 0, canvas.height, canvas.width);
    } else {
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    }
    return ocrWords(canvas);
  };

  let ocrResult = await ocrOrientation(false);
  let ocrW = Math.round(width * upscale);
  let ocrH = Math.round(height * upscale);

  // Retry rotated if portrait and day coverage is poor.
  if (isPortrait) {
    const days0 = detectDays(ocrResult.words, ocrW, ocrH).size;
    if (days0 < 3) {
      const rotResult = await ocrOrientation(true);
      const days1 = detectDays(rotResult.words, Math.round(height * upscale), Math.round(width * upscale)).size;
      if (days1 > days0 || rotResult.confidence > ocrResult.confidence + 20) {
        ocrResult = rotResult;
        ocrW = Math.round(height * upscale);
        ocrH = Math.round(width * upscale);
      }
    }
  }

  const words = ocrResult.words;
  const confidence = ocrResult.confidence;

  // Day column: crop left DAY_COL_FRAC of the upscaled image, upscale more.
  const dayColW = Math.round(ocrW * DAY_COL_FRAC);
  const daySrc = document.createElement('canvas');
  daySrc.width = dayColW;
  daySrc.height = ocrH;
  {
    const ctx = daySrc.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // re-render the final orientation into a temp canvas for cropping
    const src = document.createElement('canvas');
    src.width = ocrW;
    src.height = ocrH;
    const sctx = src.getContext('2d')!;
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';
    if (ocrW !== Math.round(width * upscale)) {
      // rotated orientation was chosen
      sctx.translate(src.width, 0);
      sctx.rotate(Math.PI / 2);
      sctx.drawImage(bitmap, 0, 0, src.height, src.width);
    } else {
      sctx.drawImage(bitmap, 0, 0, src.width, src.height);
    }
    ctx.drawImage(src, 0, 0, dayColW, ocrH, 0, 0, dayColW, ocrH);
  }
  const dayCrop = renderUpscaled(daySrc, dayColW, ocrH, DAY_COL_EXTRA);
  const dayResult = await ocrWords(dayCrop);

  const daysFromCol = detectDays(dayResult.words, dayColW * DAY_COL_EXTRA, ocrH * DAY_COL_EXTRA);
  const daysFromFull = detectDays(words, ocrW, ocrH);

  // Merge: full-table first, fill gaps from day column.
  const dayY = new Map<string, number>();
  for (const [d, y] of daysFromFull) dayY.set(d, y);
  for (const [d, y] of daysFromCol) if (!dayY.has(d)) dayY.set(d, y);

  // Geometric interpolation for missing days. Day rows are evenly spaced in
  // every timetable grid; if KHAMIS (or ISNIN) label is too faint to OCR,
  // derive its Y from the two nearest detected neighbours instead of dropping
  // the whole row.
  if (dayY.size >= 2) {
    for (let i = 0; i < DAY_NAMES.length; i++) {
      const d = DAY_NAMES[i];
      if (dayY.has(d)) continue;
      let above: number | null = null;
      let below: number | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (dayY.has(DAY_NAMES[j])) { above = dayY.get(DAY_NAMES[j])!; break; }
      }
      for (let j = i + 1; j < DAY_NAMES.length; j++) {
        if (dayY.has(DAY_NAMES[j])) { below = dayY.get(DAY_NAMES[j])!; break; }
      }
      if (above !== null && below !== null) {
        dayY.set(d, (above + below) / 2);
      } else {
        // extrapolate one row using the average detected spacing
        const ys = Array.from(dayY.values()).sort((a, b) => b - a);
        let spacing = 75;
        if (ys.length >= 2) {
          const gaps: number[] = [];
          for (let k = 1; k < ys.length; k++) gaps.push(ys[k - 1] - ys[k]);
          spacing = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        }
        dayY.set(d, above !== null ? above - spacing : (below as number) + spacing);
      }
    }
  }

  const daysDetected = dayY.size;

  // Build items from full-table OCR.
  let items = toPdfItems(words, ocrW, ocrH);

  // Inject any day labels the full-table OCR missed (ISNIN/KHAMIS often dropped).
  const presentText = items.map((i) => i.str).join(' ').toUpperCase();
  for (const [day, y] of dayY) {
    if (!presentText.includes(day)) {
      items.push({ str: day, x: 20, y, width: 60, height: 20 });
    }
  }

  // mean OCR confidence weighted toward longer tokens
  let confSum = 0;
  let confN = 0;
  for (const w of words) {
    confSum += w.conf * Math.min(w.text.length, 10);
    confN += Math.min(w.text.length, 10);
  }
  const ocrConfidence = confN > 0 ? Math.round(confSum / confN) : 0;

  // final accuracy = blend geometry + OCR + day coverage
  const dayCoverage = Math.round((daysDetected / 5) * 100);
  const finalScore = Math.round(0.35 * geoScore + 0.45 * ocrConfidence + 0.2 * dayCoverage);

  const quality: ImageQualityReport = {
    score: finalScore,
    label: qualityLabel(geoScore),
    signals,
    geoScore,
    ocrConfidence,
    daysDetected,
  };

  const { metadata, entries } = extractTimetableFromItems(items, roomMappings, locations);

  // Fill course_name from the legend (KOD/NAMA KURSUS table below the grid).
  // If OCR can't read the legend, leave course_name = code (parser default).
  try {
    const legendMap = await extractLegendNames(bitmap, width, height, isPortrait && ocrW !== Math.round(width * upscale));
    for (const e of entries) {
      const name = lookupLegendName(legendMap, e.course_code);
      if (name) e.course_name = name;
    }
  } catch (err) {
    console.warn('[imageTimetableParser] legend extraction failed, keeping code as name:', err);
  }

  return { quality, metadata, entries };
}
