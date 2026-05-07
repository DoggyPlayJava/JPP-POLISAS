/**
 * generateLaporanDocx.ts  — v5 (fresh start)
 *
 * Rujukan format: Laporan Bulan Februari 2026, Sports & Recreation Club (SRC)
 * docx library: v9.6.1
 *
 * Strategi warna/font:
 *   • STYLES const → override docDefaults + Normal + Emphasis + Strong
 *   • Setiap TextRun → eksplisit color:'000000' + font:'Times New Roman'
 *   → defense-in-depth: warna hitam dijamin pada semua peringkat
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  TableLayoutType,
  convertInchesToTwip,
  VerticalAlign,
} from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LaporanDocxOptions {
  clubName: string;
  /** e.g. "APRIL 2026" */
  monthYear: string;
  activities: any[];
  submitterName?: string;
  submitterRole?: string;
  /** Nama kelab sahaja (tanpa tahun) */
  submitterUnit?: string;
  presidenName?: string;
  reviewerRole?: string;
  reviewerUnit?: string;
  /** base64 atau URL logo kelab / Logo-JPP-Laporan bagi exco */
  clubLogoUrl?: string;
  fileName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FONT  = 'Times New Roman';
const BLACK = '000000';
const GRAY  = 'D9D9D9';

/** Convert pt to half-points (docx internal font size unit) */
const hp = (pt: number) => pt * 2;

/**
 * Usable content width for A4 with 1.25" L+R margins:
 *   A4 width   = 11,906 twips
 *   L+R margin = 2 × 1800 = 3,600 twips
 *   Usable     = 8,306 twips  (~6.0 inches)
 * We round to 8640 for cleaner column math (tiny rounding won't matter).
 */
const TW = 8640; // total usable width in twips

/** Border presets */
const B0: any = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const B1: any = { style: BorderStyle.SINGLE, size: 2, color: BLACK };

const NO_BORDERS  = { top: B0, bottom: B0, left: B0, right: B0, insideH: B0, insideV: B0 };
const ALL_BORDERS = { top: B1, bottom: B1, left: B1, right: B1, insideH: B1, insideV: B1 };

// ─────────────────────────────────────────────────────────────────────────────
// Document-level Styles  (override Word's built-in coloring)
// ─────────────────────────────────────────────────────────────────────────────

const STYLES: any = {
  default: {
    document: {
      run: { font: FONT, color: BLACK, size: hp(12) },
    },
    // Bluish "Strong" style → force black
    strong: {
      run: { font: FONT, color: BLACK, bold: true },
    },
  },
  paragraphStyles: [
    // Normal: ensure no Calibri/theme-font bleed-through
    {
      id: 'Normal', name: 'Normal',
      run: { font: FONT, color: BLACK, size: hp(12) },
      paragraph: { spacing: { line: 240, lineRule: 'auto' } },
    },
  ],
  characterStyles: [
    { id: 'DefaultParagraphFont', name: 'Default Paragraph Font',
      run: { font: FONT, color: BLACK } },
    // Emphasis → italic red in Word → override to black
    { id: 'Emphasis', name: 'Emphasis', basedOn: 'DefaultParagraphFont',
      run: { font: FONT, color: BLACK, italics: true } },
    // Strong → bold blue in Word → override to black
    { id: 'Strong', name: 'Strong', basedOn: 'DefaultParagraphFont',
      run: { font: FONT, color: BLACK, bold: true } },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Image helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchBuf(url: string): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    return r.ok ? r.arrayBuffer() : null;
  } catch {
    return null;
  }
}

function b64ToArr(dataUrl: string): ArrayBuffer {
  const b64  = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const bin  = atob(b64);
  const buf  = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

async function resolveImg(src?: string): Promise<ArrayBuffer | null> {
  if (!src) return null;
  return src.startsWith('data:') ? b64ToArr(src) : fetchBuf(src);
}

function imgType(buf: ArrayBuffer): 'jpg' | 'png' | 'gif' {
  const h = new Uint8Array(buf);
  if (h[0] === 0x89 && h[1] === 0x50) return 'png';
  if (h[0] === 0x47 && h[1] === 0x49) return 'gif';
  return 'jpg';
}

function mkImgRun(buf: ArrayBuffer, w: number, h: number): ImageRun {
  return new ImageRun({ data: buf, transformation: { width: w, height: h }, type: imgType(buf) });
}

// ─────────────────────────────────────────────────────────────────────────────
// Text helpers  (all black, all Times New Roman)
// ─────────────────────────────────────────────────────────────────────────────

interface RunOpts {
  bold?: boolean;
  size?: number;   // half-points
}

function mkRun(text: string, { bold = false, size = hp(12) }: RunOpts = {}): TextRun {
  return new TextRun({ text, font: FONT, color: BLACK, bold, size } as any);
}

function mkPara(
  runs: TextRun | TextRun[],
  opts: {
    align?: keyof typeof AlignmentType;
    before?: number;
    after?: number;
    pageBreak?: boolean;
  } = {}
): Paragraph {
  return new Paragraph({
    alignment: AlignmentType[opts.align ?? 'LEFT'],
    spacing: {
      before: opts.before ?? 0,
      after:  opts.after  ?? 0,
      line: 240,
      lineRule: 'auto',
    },
    ...(opts.pageBreak ? { pageBreakBefore: true } : {}),
    children: Array.isArray(runs) ? runs : [runs],
  } as any);
}

/** Empty spacer paragraph */
const blank = (before = 0, after = 0) => mkPara(mkRun(''), { before, after });

// ─────────────────────────────────────────────────────────────────────────────
// Cover — Logo table  (POLISAS kiri, Kelab/JPP kanan)
// ─────────────────────────────────────────────────────────────────────────────

function buildLogoTable(
  leftBuf:  ArrayBuffer | null,
  rightBuf: ArrayBuffer | null,
): Table {
  const LOGO_W = 180;
  const LOGO_H = 70;
  const HALF   = TW / 2; // 4320 twips per column

  const logoCell = (buf: ArrayBuffer | null, align: keyof typeof AlignmentType) =>
    new TableCell({
      width:         { size: HALF, type: WidthType.DXA },
      borders:       NO_BORDERS,
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType[align],
          spacing:   { before: 0, after: 0 },
          children:  buf ? [mkImgRun(buf, LOGO_W, LOGO_H)] : [mkRun('')],
        } as any),
      ],
    });

  return new Table({
    layout:       TableLayoutType.FIXED,
    width:        { size: TW, type: WidthType.DXA },
    borders:      NO_BORDERS,
    columnWidths: [HALF, HALF],
    rows: [
      new TableRow({
        height:   { value: convertInchesToTwip(1.0), rule: 'atLeast' as any },
        children: [logoCell(leftBuf, 'LEFT'), logoCell(rightBuf, 'RIGHT')],
      }),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity — 3-column table
// ─────────────────────────────────────────────────────────────────────────────

function buildActivityTable(act: any): Table {
  const dateStr = act.start_date
    ? format(new Date(act.start_date), 'd MMMM yyyy', { locale: ms })
    : '-';

  // Lebar kolum (jumlah = 8640 twips = 6.0 inci)
  const W_DATE  = convertInchesToTwip(1.3);   // 1872
  const W_ACT   = convertInchesToTwip(3.0);   // 4320
  const W_ACT2  = TW - W_DATE - W_ACT;        // baki ~2448

  const CELL_PAD = { top: 40, bottom: 40, left: 60, right: 60 };

  const headerCell = (text: string, w: number) =>
    new TableCell({
      width:         { size: w, type: WidthType.DXA },
      borders:       ALL_BORDERS,
      margins:       CELL_PAD,
      shading:       { fill: GRAY, type: ShadingType.CLEAR, color: 'auto' },
      verticalAlign: VerticalAlign.CENTER,
      children: [mkPara(mkRun(text, { bold: true, size: hp(12) }), { align: 'CENTER' })],
    });

  const dataCell = (text: string, w: number) =>
    new TableCell({
      width:         { size: w, type: WidthType.DXA },
      borders:       ALL_BORDERS,
      margins:       CELL_PAD,
      verticalAlign: VerticalAlign.TOP,
      children: [mkPara(mkRun(text || '-', { size: hp(12) }))],
    });

  return new Table({
    layout:       TableLayoutType.FIXED,
    width:        { size: TW, type: WidthType.DXA },
    columnWidths: [W_DATE, W_ACT, W_ACT2],
    borders:      ALL_BORDERS,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell('TARIKH',   W_DATE),
          headerCell('AKTIVITI', W_ACT),
          headerCell('TINDAKAN', W_ACT2),
        ],
      }),
      new TableRow({
        children: [
          dataCell(dateStr,          W_DATE),
          dataCell(act.title || '-', W_ACT),
          dataCell(act.tindakan || '-', W_ACT2),
        ],
      }),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity — LAMPIRAN  (bold, NO underline — matching reference)
// ─────────────────────────────────────────────────────────────────────────────

function buildLampiranHeading(): Paragraph {
  return mkPara(
    mkRun('BUKTI ATAU GAMBAR', { bold: true, size: hp(12) }),
    { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.1) },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity — Image grid  (2 per row, DXA-fixed table)
// ─────────────────────────────────────────────────────────────────────────────

async function buildImageGrid(urls: string[]): Promise<(Paragraph | Table)[]> {
  if (!urls.length) {
    return [mkPara(mkRun('[ Tiada gambar dilampirkan ]'))];
  }

  const bufs  = await Promise.all(urls.slice(0, 6).map(fetchBuf));
  const valid = bufs.filter((b): b is ArrayBuffer => b !== null);

  if (!valid.length) {
    return [mkPara(mkRun('[ Gambar tidak dapat dimuatkan ]'))];
  }

  /**
   * Setiap sel = TW/2 = 4320 twips = 3 inci
   * Padding 80 twips setiap sisi → baki 4160 twips untuk gambar
   * 4160 twips / 1440 × 96 dpi ≈ 277 px  →  guna 260px untuk breathing room
   */
  const HALF   = TW / 2;   // 4320 twips
  const IMG_W  = 260;
  const IMG_H  = 195;      // 4:3 ratio

  const imgCell = (buf: ArrayBuffer) =>
    new TableCell({
      width:   { size: HALF, type: WidthType.DXA },
      borders: NO_BORDERS,
      margins: { top: 0, bottom: 80, left: 0, right: 80 },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [mkImgRun(buf, IMG_W, IMG_H)],
        } as any),
      ],
    });

  const emptyCell = () =>
    new TableCell({
      width:   { size: HALF, type: WidthType.DXA },
      borders: NO_BORDERS,
      children: [mkPara(mkRun(''))],
    });

  const rows: TableRow[] = [];
  for (let i = 0; i < valid.length; i += 2) {
    rows.push(new TableRow({
      children: [imgCell(valid[i]), valid[i + 1] ? imgCell(valid[i + 1]) : emptyCell()],
    }));
  }

  return [
    new Table({
      layout:       TableLayoutType.FIXED,
      width:        { size: TW, type: WidthType.DXA },
      columnWidths: [HALF, HALF],
      borders:      NO_BORDERS,
      rows,
    }),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Signature block
// Struktur ikut rujukan SRC:
//   [blok 1]  garis pendek → nama (bold) → jawatan → unit → institusi
//   [label "Disemak oleh:"]
//   [blok 2]  garis pendek → nama → jawatan → unit → institusi
//   [label "Disahkan oleh:"]
//   [blok 3]  garis pendek → nama → jawatan → unit → institusi
// ─────────────────────────────────────────────────────────────────────────────

function buildSignBlock(
  name:   string,
  role:   string | undefined,
  unit1:  string | undefined,
  unit2?: string,
): Paragraph[] {
  const out: Paragraph[] = [];

  // Garis pendek (15 watak) — bukan full-width
  out.push(mkPara(mkRun('_'.repeat(15), { size: hp(12) }), { after: convertInchesToTwip(0.08) }));

  // Nama — bold, ALL CAPS
  out.push(mkPara(mkRun(name.toUpperCase(), { bold: true, size: hp(12) }), { after: convertInchesToTwip(0.04) }));

  if (role)  out.push(mkPara(mkRun(role,  { size: hp(12) })));
  if (unit1) out.push(mkPara(mkRun(unit1, { size: hp(12) })));
  if (unit2) out.push(mkPara(mkRun(unit2, { size: hp(12) })));

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main function
// ─────────────────────────────────────────────────────────────────────────────

export async function generateLaporanDocx(opts: LaporanDocxOptions): Promise<void> {
  const {
    clubName,
    monthYear,
    activities,
    submitterName = 'SETIAUSAHA',
    submitterRole,
    submitterUnit,
    presidenName  = '( Tiada Maklumat )',
    reviewerRole  = 'PRESIDEN',
    reviewerUnit,
    clubLogoUrl,
    fileName,
  } = opts;

  // "APRIL 2026" → month="APRIL", year="2026"
  const parts     = monthYear.toUpperCase().split(/\s+/);
  const monthStr  = parts[0] ?? '';
  const yearStr   = parts[1] ?? '';

  // ── Muat turun logo ─────────────────────────────────────────────────────────
  const [polisasBuf, clubBuf] = await Promise.all([
    fetchBuf('/polisas-logo.jpg'),
    resolveImg(clubLogoUrl),
  ]);

  // ── Koleksi elemen ───────────────────────────────────────────────────────────
  const children: (Paragraph | Table)[] = [];

  // ════════════════════════════════════════════════════════════
  // MUKA DEPAN
  // ════════════════════════════════════════════════════════════

  // Logo bar (POLISAS kiri, Kelab/JPP kanan) — TIADA divider line
  children.push(buildLogoTable(polisasBuf, clubBuf));

  // Ruang antara logo dan tajuk (~2.8 inci ≈ jarak tengah muka A4)
  children.push(blank(convertInchesToTwip(2.6)));

  // "LAPORAN BULAN"
  children.push(mkPara(
    mkRun('LAPORAN BULAN', { bold: true, size: hp(28) }),
    { align: 'CENTER', after: convertInchesToTwip(0.05) },
  ));

  // Bulan
  children.push(mkPara(
    mkRun(monthStr, { bold: true, size: hp(28) }),
    { align: 'CENTER', after: convertInchesToTwip(0.05) },
  ));

  // Tahun
  children.push(mkPara(
    mkRun(yearStr, { bold: true, size: hp(24) }),
    { align: 'CENTER' },
  ));

  // Tolak ke bawah untuk nama kelab
  children.push(blank(convertInchesToTwip(2.4)));

  // Nama kelab (ALL CAPS, bold)
  children.push(mkPara(
    mkRun(clubName.toUpperCase(), { bold: true, size: hp(13) }),
    { align: 'CENTER', after: convertInchesToTwip(0.05) },
  ));

  // Institusi
  children.push(mkPara(
    mkRun('POLITEKNIK SULTAN HAJI AHMAD SHAH', { bold: true, size: hp(13) }),
    { align: 'CENTER' },
  ));

  // ════════════════════════════════════════════════════════════
  // SETIAP AKTIVITI
  // ════════════════════════════════════════════════════════════

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];

    // Page break
    children.push(mkPara(mkRun(''), { pageBreak: true }));

    // Nombor aktiviti sahaja (e.g. "1.")
    children.push(mkPara(
      mkRun(`${i + 1}.`, { bold: true, size: hp(13) }),
      { after: convertInchesToTwip(0.1) },
    ));

    // Jadual aktiviti
    children.push(buildActivityTable(act));

    // Lampiran heading
    children.push(buildLampiranHeading());

    // Grid gambar (Dihadkan kepada 2 sahaja mengikut template PDF)
    const imgUrls: string[] = Array.isArray(act.image_urls)
      ? (act.image_urls as unknown[])
          .filter((u): u is string => typeof u === 'string' && u.trim() !== '')
          .slice(0, 2)
      : [];

    const imgElements = await buildImageGrid(imgUrls);
    children.push(...imgElements);

    // Penerangan / catatan
    const desc = (act.description ?? act.notes ?? '').trim();
    if (desc) {
      children.push(mkPara(mkRun(desc, { size: hp(12) }), {
        before: convertInchesToTwip(0.15),
      }));
    }
  }

  // ════════════════════════════════════════════════════════════
  // HALAMAN TANDATANGAN
  // ════════════════════════════════════════════════════════════

  children.push(mkPara(mkRun(''), { pageBreak: true }));

  // Blok 1: Disediakan oleh — TIADA label sebelum garis (ikut rujukan SRC)
  children.push(
    blank(convertInchesToTwip(0.6)),
    ...buildSignBlock(
      submitterName,
      submitterRole,
      submitterUnit ?? clubName,
      'POLITEKNIK SULTAN HAJI AHMAD SHAH',
    ),
  );

  // Label sebelum blok 2
  children.push(mkPara(
    mkRun('Disemak oleh:', { size: hp(12) }),
    { before: convertInchesToTwip(0.8) },
  ));

  // Blok 2: Presiden / Disemak oleh
  children.push(
    blank(convertInchesToTwip(0.3)),
    ...buildSignBlock(
      presidenName,
      reviewerRole,
      reviewerUnit ?? clubName,
      'POLITEKNIK SULTAN HAJI AHMAD SHAH',
    ),
  );

  // Label sebelum blok 3
  children.push(mkPara(
    mkRun('Disahkan oleh:', { size: hp(12) }),
    { before: convertInchesToTwip(0.8) },
  ));

  // Blok 3: Yang Dipertua JPP
  children.push(
    blank(convertInchesToTwip(0.3)),
    ...buildSignBlock(
      'YANG DIPERTUA',
      'JAWATANKUASA PERWAKILAN PELAJAR',
      'POLITEKNIK SULTAN HAJI AHMAD SHAH',
    ),
  );

  // ── Jana dokumen ────────────────────────────────────────────────────────────

  const doc = new Document({
    creator: 'JPP POLISAS',
    title:   `Laporan Bulanan – ${clubName} – ${monthYear}`,
    styles:  STYLES,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    convertInchesToTwip(1.0),
              bottom: convertInchesToTwip(1.0),
              left:   convertInchesToTwip(1.25),
              right:  convertInchesToTwip(1.25),
            },
          },
        },
        children,
      },
    ],
  } as any);

  const blob = await Packer.toBlob(doc);
  const name  = fileName
    ? `${fileName}.docx`
    : `Laporan_${clubName}_${monthYear}.docx`;

  saveAs(blob, name);
}
