/**
 * generateLaporanDocx.ts  (v4)
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixes vs v3:
 *  ✅ Logo size  : 110px → 185px wide (proportional)
 *  ✅ Divider    : removed garisan bawah logo (no more dividerPara)
 *  ✅ noBorders  : tambah insideH + insideV supaya Word tak letak border dalaman
 *  ✅ Image table: pakai DXA width eksplisit (bukan PERCENTAGE) untuk FIXED layout
 *  ✅ Image size : 260×195px seunit (2-per-row, A4 margin 1.25")
 *  ✅ Font       : Times New Roman dikuatkuasakan di docDefaults DAN Normal style
 *  ✅ Line spacing: 276 (single) untuk teks badan, space between paras
 * ─────────────────────────────────────────────────────────────────────────────
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, BorderStyle, WidthType, ShadingType,
  UnderlineType, TableLayoutType, convertInchesToTwip, VerticalAlign,
} from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';

// ── Public interface ──────────────────────────────────────────────────────────

export interface LaporanDocxOptions {
  clubName:       string;
  monthYear:      string;   // "APRIL 2026"
  activities:     any[];
  submitterName?: string;
  submitterRole?: string;
  submitterUnit?: string;
  presidenName?:  string;
  reviewerRole?:  string;
  reviewerUnit?:  string;
  clubLogoUrl?:   string;  // base64 atau URL logo kelab / JPP-Laporan
  fileName?:      string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT  = 'Times New Roman';
const BLACK = '000000';

/** pt → half-points (docx internal unit for text size) */
const pt = (n: number) => n * 2;

/**
 * A4 usable content width at 1.25" L+R margins:
 *   A4 width  = 8.268" = 11906 twips
 *   L+R margin= 2.50"  = 3600 twips
 *   Usable    = 8306 twips  ≈ 5.768"
 */
const USABLE_TWIPS = 8306;

// ── Border presets ─────────────────────────────────────────────────────────────

const B_NONE: any = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const B_THIN: any = { style: BorderStyle.SINGLE, size: 4, color: BLACK };

/** Use this everywhere you want a cell/table with NO visible borders at all. */
const noBorders = {
  top: B_NONE, bottom: B_NONE, left: B_NONE, right: B_NONE,
  // Crucial: without these Word adds its default inner dividers
  insideH: B_NONE, insideV: B_NONE,
};

const tableBorders = {
  top: B_THIN, bottom: B_THIN, left: B_THIN, right: B_THIN,
  insideH: B_THIN, insideV: B_THIN,
};

// ── Text helpers ──────────────────────────────────────────────────────────────

interface RunOpts {
  bold?:     boolean;
  italics?:  boolean;
  size?:     number;        // in half-points already (use pt() helper)
  underline?: boolean;
}

function tr(text: string, opts: RunOpts = {}): TextRun {
  return new TextRun({
    text,
    font:    FONT,
    color:   BLACK,
    bold:    opts.bold    ?? false,
    italics: opts.italics ?? false,
    size:    opts.size    ?? pt(12),
    ...(opts.underline
      ? { underline: { type: UnderlineType.SINGLE, color: BLACK } }
      : {}),
  } as any);
}

function p(
  runs:  TextRun | TextRun[],
  align: keyof typeof AlignmentType = 'LEFT',
  spacingBefore = 0,
  spacingAfter  = 0,
  pageBreak     = false,
): Paragraph {
  const sp = { before: spacingBefore, after: spacingAfter, line: 276, lineRule: 'auto' as any };
  return new Paragraph({
    alignment: AlignmentType[align],
    spacing: sp,
    ...(pageBreak ? { pageBreakBefore: true } : {}),
    children: Array.isArray(runs) ? runs : [runs],
  } as any);
}

const blank = (before = 0, after = 0) => p(tr(''), 'LEFT', before, after);

// ── Image helpers ─────────────────────────────────────────────────────────────

async function fetchBuf(url: string): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    return r.ok ? await r.arrayBuffer() : null;
  } catch { return null; }
}

function b64ToBuf(dataUrl: string): ArrayBuffer {
  const b64    = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const bin    = atob(b64);
  const buf    = new ArrayBuffer(bin.length);
  const view   = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

async function resolveImg(src?: string): Promise<ArrayBuffer | null> {
  if (!src) return null;
  if (src.startsWith('data:')) return b64ToBuf(src);
  return fetchBuf(src);
}

function imgType(buf: ArrayBuffer): 'jpg' | 'png' | 'gif' {
  const v = new Uint8Array(buf);
  if (v[0] === 0x89 && v[1] === 0x50) return 'png';
  if (v[0] === 0x47 && v[1] === 0x49) return 'gif';
  return 'jpg';
}

function mkImg(buf: ArrayBuffer, w: number, h: number): ImageRun {
  return new ImageRun({ data: buf, transformation: { width: w, height: h }, type: imgType(buf) });
}

// ── Cover: logo table ─────────────────────────────────────────────────────────

function logoTable(leftBuf: ArrayBuffer | null, rightBuf: ArrayBuffer | null): Table {
  /* Logo 185×75 px — visually prominent on A4 */
  const LOGO_W = 185;
  const LOGO_H = 75;
  const HALF   = Math.floor(USABLE_TWIPS / 2);        // 4153 twips per column

  const logoCell = (buf: ArrayBuffer | null, align: keyof typeof AlignmentType) =>
    new TableCell({
      width:   { size: HALF, type: WidthType.DXA },
      borders: noBorders,
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: AlignmentType[align],
          spacing:   { before: 0, after: 0 },
          children:  buf ? [mkImg(buf, LOGO_W, LOGO_H)] : [tr('')],
        } as any),
      ],
    });

  return new Table({
    layout:       TableLayoutType.FIXED,
    width:        { size: USABLE_TWIPS, type: WidthType.DXA },
    borders:      noBorders,
    columnWidths: [HALF, HALF],
    rows: [
      new TableRow({
        height:   { value: convertInchesToTwip(1.1), rule: 'atLeast' as any },
        children: [logoCell(leftBuf, 'LEFT'), logoCell(rightBuf, 'RIGHT')],
      }),
    ],
  });
}

// ── Activity: data table ──────────────────────────────────────────────────────

function activityTable(act: any, idx: number): Table {
  const dateStr = act.start_date
    ? format(new Date(act.start_date), 'd MMMM yyyy', { locale: ms })
    : '-';

  // Column widths (twips): Date 1.5" | Activity 3" | Action 1.27"
  const W1 = convertInchesToTwip(1.5);
  const W2 = convertInchesToTwip(3.0);
  const W3 = USABLE_TWIPS - W1 - W2;   // remainder

  const hCell = (text: string, w: number) =>
    new TableCell({
      width:         { size: w, type: WidthType.DXA },
      borders:       tableBorders,
      shading:       { fill: 'D9D9D9', type: ShadingType.CLEAR, color: 'auto' },
      verticalAlign: VerticalAlign.CENTER,
      margins:       { top: 80, bottom: 80, left: 100, right: 100 },
      children:      [p(tr(text, { bold: true, size: pt(11) }), 'CENTER')],
    });

  const dCell = (text: string, w: number) =>
    new TableCell({
      width:         { size: w, type: WidthType.DXA },
      borders:       tableBorders,
      verticalAlign: VerticalAlign.CENTER,
      margins:       { top: 80, bottom: 80, left: 100, right: 100 },
      children:      [p(tr(text || '-', { size: pt(11) }))],
    });

  return new Table({
    layout:       TableLayoutType.FIXED,
    width:        { size: USABLE_TWIPS, type: WidthType.DXA },
    columnWidths: [W1, W2, W3],
    borders:      tableBorders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [hCell('TARIKH', W1), hCell('AKTIVITI', W2), hCell('TINDAKAN', W3)],
      }),
      new TableRow({
        children: [dCell(dateStr, W1), dCell(act.title || '-', W2), dCell(act.tindakan || '-', W3)],
      }),
    ],
  });
}

// ── Activity: image grid (2 per row) ─────────────────────────────────────────

async function imageGrid(urls: string[]): Promise<(Paragraph | Table)[]> {
  if (!urls.length) {
    return [p(tr('[ Tiada gambar dilampirkan ]', { italics: true, size: pt(10) }))];
  }

  const bufs   = await Promise.all(urls.slice(0, 8).map(fetchBuf));
  const valid  = bufs.filter((b): b is ArrayBuffer => b !== null);

  if (!valid.length) {
    return [p(tr('[ Gambar tidak dapat dimuatkan ]', { italics: true, size: pt(10) }))];
  }

  /**
   * Page usable = 8306 twips (5.768")
   * 2-col grid, 6 twips padding per side in each cell:
   *   cell width each = 4153 twips  (2.884")
   *   image width     = (4153 - 2×80) twips → pixels: (3993/1440)*96 ≈ 266px
   * Use 260px wide, 195px tall (4:3 ratio) — fits perfectly without overflow
   */
  const CELL_W = Math.floor(USABLE_TWIPS / 2);   // 4153 twips
  const IMG_W  = 255;
  const IMG_H  = 191;                             // 4:3 ratio

  const imgCell = (buf: ArrayBuffer) =>
    new TableCell({
      width:   { size: CELL_W, type: WidthType.DXA },
      borders: noBorders,
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
      children: [
        new Paragraph({
          spacing:  { before: 0, after: 80 },
          children: [mkImg(buf, IMG_W, IMG_H)],
        } as any),
      ],
    });

  const emptyCell = () =>
    new TableCell({
      width:   { size: CELL_W, type: WidthType.DXA },
      borders: noBorders,
      children: [new Paragraph({ children: [tr('')] } as any)],
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
      width:        { size: USABLE_TWIPS, type: WidthType.DXA },
      columnWidths: [CELL_W, CELL_W],
      borders:      noBorders,
      rows,
    }),
  ];
}

// ── Signature block ───────────────────────────────────────────────────────────

function signBlock(
  label: string,
  name:  string,
  role?: string,
  unit?: string,
  before = convertInchesToTwip(0.6),
): Paragraph[] {
  const out: Paragraph[] = [];
  out.push(p(tr(label, { size: pt(12) }), 'LEFT', before, convertInchesToTwip(0.05)));
  out.push(p(tr('_'.repeat(40), { size: pt(12) }), 'LEFT', 0, convertInchesToTwip(0.05)));
  out.push(p(tr(name.toUpperCase(), { bold: true, size: pt(12) })));
  if (role) out.push(p(tr(role.toUpperCase(), { size: pt(12) })));
  if (unit) out.push(p(tr(unit.toUpperCase(), { size: pt(12) })));
  return out;
}

// ── Document-level styles: force Times New Roman black throughout ──────────────

const DOC_STYLES: any = {
  default: {
    document: {
      run: {
        font:  FONT,   // sets <w:docDefaults> with Times New Roman
        color: BLACK,
        size:  pt(12),
      },
    },
  },
  // Override Normal paragraph style to use explicit TNR (not Calibri theme font)
  paragraphStyles: [
    {
      id:   'Normal',
      name: 'Normal',
      run:  { font: FONT, color: BLACK, size: pt(12) },
      paragraph: {
        spacing: { line: 276, lineRule: 'auto' },
      },
    },
  ],
  // Override character styles to prevent Word's red/blue theme colouring
  characterStyles: [
    {
      id:      'DefaultParagraphFont',
      name:    'Default Paragraph Font',
      run:     { color: BLACK, font: FONT },
    },
    {
      id:      'Emphasis',
      name:    'Emphasis',
      basedOn: 'DefaultParagraphFont',
      run:     { color: BLACK, italics: true },
    },
    {
      id:      'Strong',
      name:    'Strong',
      basedOn: 'DefaultParagraphFont',
      run:     { color: BLACK, bold: true },
    },
  ],
};

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateLaporanDocx(opts: LaporanDocxOptions): Promise<void> {
  const {
    clubName,
    monthYear,
    activities,
    submitterName,
    submitterRole,
    submitterUnit,
    presidenName  = '( Tiada Maklumat )',
    reviewerRole  = 'PRESIDEN',
    reviewerUnit,
    clubLogoUrl,
    fileName,
  } = opts;

  const [monthStr = '', yearStr = ''] = monthYear.toUpperCase().split(' ');

  // ── Load logos ──────────────────────────────────────────────────────────────
  const [polisasBuf, clubBuf] = await Promise.all([
    fetchBuf('/polisas-logo.png'),
    resolveImg(clubLogoUrl),
  ]);

  // ── Content array ───────────────────────────────────────────────────────────
  const children: (Paragraph | Table)[] = [];

  // ════════════════════════════════════════════════════════════════════════════
  //  PAGE 1  ·  COVER
  // ════════════════════════════════════════════════════════════════════════════

  // Logo bar — POLISAS kiri, Kelab/JPP kanan
  children.push(logoTable(polisasBuf, clubBuf));

  // Vertical space before title (~1.5 inch gap)
  children.push(blank(convertInchesToTwip(1.4)));

  // "LAPORAN BULANAN"
  children.push(p(
    tr('LAPORAN BULANAN', { bold: true, size: pt(26) }),
    'CENTER', 0, convertInchesToTwip(0.3),
  ));

  // Month
  children.push(p(
    tr(monthStr, { bold: true, size: pt(20) }),
    'CENTER', 0, convertInchesToTwip(0.1),
  ));

  // Year
  children.push(p(
    tr(yearStr, { bold: true, size: pt(18) }),
    'CENTER',
  ));

  // Gap to push club info toward bottom
  children.push(blank(convertInchesToTwip(2.2)));

  // Club name
  children.push(p(
    tr(clubName.toUpperCase(), { bold: true, size: pt(13) }),
    'CENTER', 0, convertInchesToTwip(0.1),
  ));

  // Institution
  children.push(p(
    tr('POLITEKNIK SULTAN HAJI AHMAD SHAH', { bold: true, size: pt(13) }),
    'CENTER',
  ));

  // ════════════════════════════════════════════════════════════════════════════
  //  ACTIVITY PAGES
  // ════════════════════════════════════════════════════════════════════════════

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];

    // Page break
    children.push(p(tr(''), 'LEFT', 0, 0, true));

    // Heading: "1.   NAMA AKTIVITI"
    children.push(p(
      tr(`${i + 1}.   ${(act.title || 'Aktiviti').toUpperCase()}`, { bold: true, size: pt(13) }),
      'LEFT', 0, convertInchesToTwip(0.2),
    ));

    // Activity table
    children.push(activityTable(act, i));
    children.push(blank(convertInchesToTwip(0.25)));

    // "LAMPIRAN"
    children.push(p(
      tr('LAMPIRAN', { bold: true, size: pt(12), underline: true }),
      'LEFT', 0, convertInchesToTwip(0.15),
    ));

    // Images (2-per-row grid)
    const imgUrls: string[] = Array.isArray(act.image_urls)
      ? act.image_urls.filter((u: any): u is string => typeof u === 'string' && u.trim() !== '')
      : [];

    const imgEls = await imageGrid(imgUrls);
    children.push(...imgEls);

    // Description / catatan
    if (act.description?.trim()) {
      children.push(p(
        tr(act.description, { size: pt(12) }),
        'LEFT', convertInchesToTwip(0.1),
      ));
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  SIGNATURE PAGE
  // ════════════════════════════════════════════════════════════════════════════

  children.push(p(tr(''), 'LEFT', 0, 0, true));

  // Disediakan oleh
  children.push(...signBlock(
    'Disediakan oleh:',
    submitterName || 'Setiausaha',
    submitterRole,
    submitterUnit ?? clubName,
    convertInchesToTwip(0.3),
  ));

  // Disemak oleh
  children.push(...signBlock(
    'Disemak oleh:',
    presidenName,
    reviewerRole,
    reviewerUnit,
  ));

  // Disahkan oleh
  children.push(...signBlock(
    'Disahkan oleh:',
    'YANG DIPERTUA',
    'JAWATANKUASA PERWAKILAN PELAJAR',
    'POLITEKNIK SULTAN HAJI AHMAD SHAH',
  ));

  // ── Assemble ────────────────────────────────────────────────────────────────
  const doc = new Document({
    creator: 'JPP POLISAS',
    title:   `Laporan Bulanan - ${clubName} - ${monthYear}`,
    styles:  DOC_STYLES,
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
  saveAs(blob, fileName ? `${fileName}.docx` : `Laporan_${clubName}_${monthYear}.docx`);
}
