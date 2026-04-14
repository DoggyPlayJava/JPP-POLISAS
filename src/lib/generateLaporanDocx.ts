/**
 * generateLaporanDocx.ts  (v2 — Fixed Formatting)
 * ─────────────────────────────────────────────────────────────────────────────
 * PERUBAHAN v2:
 *  - Fix: bulan/tahun kini muncul di cover page (buang TextRun-spread bug)
 *  - Fix: semua teks kini hitam eksplisit (color: '000000')
 *  - Fix: LAMPIRAN underline guna UnderlineType.SINGLE + warna hitam
 *  - Tambah: tajuk aktiviti muncul terang di atas jadual
 *  - Tambah: sub-label & layout tandatangan lebih kemas
 * ─────────────────────────────────────────────────────────────────────────────
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, BorderStyle, WidthType, ShadingType,
  HeadingLevel, UnderlineType, TableLayoutType, convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LaporanDocxOptions {
  clubName: string;
  monthYear: string;   // e.g. "APRIL 2026"
  activities: any[];
  submitterName?: string;
  submitterRole?: string;
  submitterUnit?: string;
  presidenName?: string;
  reviewerRole?: string;
  reviewerUnit?: string;
  clubLogoUrl?: string;
  fileName?: string;
}

// ── Image utilities ────────────────────────────────────────────────────────────

async function fetchImageBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!resp.ok) return null;
    return await resp.arrayBuffer();
  } catch {
    return null;
  }
}

function base64ToBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binary = atob(base64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

async function resolveImage(src: string | undefined): Promise<ArrayBuffer | null> {
  if (!src) return null;
  if (src.startsWith('data:')) return base64ToBuffer(src);
  return fetchImageBuffer(src);
}

// Detect image type from ArrayBuffer magic bytes
function detectImageType(buf: ArrayBuffer): 'jpg' | 'png' | 'gif' {
  const view = new Uint8Array(buf);
  if (view[0] === 0x89 && view[1] === 0x50) return 'png';
  if (view[0] === 0x47 && view[1] === 0x49) return 'gif';
  return 'jpg'; // default
}

// ── Border presets ─────────────────────────────────────────────────────────────

const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as const;
const LINE = { style: BorderStyle.SINGLE, size: 6, color: '000000' } as const;
const THIN = { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' } as const;

const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideH: NONE, insideV: NONE };
const tableBorders = { top: LINE, bottom: LINE, left: LINE, right: LINE, insideH: THIN, insideV: THIN };

// ── Text helpers ───────────────────────────────────────────────────────────────

interface TRun {
  bold?: boolean;
  italics?: boolean;
  size?: number;
  color?: string;
  underline?: { type?: string; color?: string };
  break?: number;
}

interface ParagraphOpts {
  alignment?: string;
  spacing?: { before?: number; after?: number; line?: number };
  pageBreakBefore?: boolean;
  border?: any;
  indent?: any;
}

const blk = (text: string, opts: TRun = {}): TextRun =>
  new TextRun({ text, color: '000000', ...opts } as any);

const paragraph = (
  children: TextRun | TextRun[],
  opts: ParagraphOpts = {}
): Paragraph =>
  new Paragraph({ children: Array.isArray(children) ? children : [children], ...opts } as any);

// ── Cover page ─────────────────────────────────────────────────────────────────

function buildLogoRow(poliBuffer: ArrayBuffer | null, clubBuffer: ArrayBuffer | null): Table {
  const makeImage = (buf: ArrayBuffer | null, align: typeof AlignmentType.LEFT | typeof AlignmentType.RIGHT) =>
    new TableCell({
      borders: noBorders,
      verticalAlign: 'center' as any,
      children: [
        new Paragraph({
          alignment: align,
          spacing: { after: 0 },
          children: buf
            ? [new ImageRun({
                data: buf,
                transformation: { width: 130, height: 75 },
                type: detectImageType(buf),
              })]
            : [blk('')],
        }),
      ],
    });

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          makeImage(poliBuffer, AlignmentType.LEFT),
          makeImage(clubBuffer, AlignmentType.RIGHT),
        ],
      }),
    ],
  });
}

function buildCoverSection(monthYear: string, clubName: string): Paragraph[] {
  const [month = '', year = ''] = monthYear.toUpperCase().split(' ');

  return [
    // Spacing before title
    paragraph(blk(''), { spacing: { before: 2400, after: 0 } }),

    // "LAPORAN BULANAN"
    paragraph(
      blk('LAPORAN BULANAN', { bold: true, size: 64 }),
      { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 480 } }
    ),

    // Month name
    paragraph(
      blk(month, { bold: true, size: 52 }),
      { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 } }
    ),

    // Year
    paragraph(
      blk(year, { bold: true, size: 48 }),
      { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 } }
    ),

    // Vertical pusher before club info
    paragraph(blk(''), { spacing: { before: 2880, after: 0 } }),

    // Club name
    paragraph(
      blk(clubName.toUpperCase(), { bold: true, size: 28 }),
      { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 } }
    ),

    // Institution
    paragraph(
      blk('POLITEKNIK SULTAN HAJI AHMAD SHAH', { bold: true, size: 28 }),
      { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 } }
    ),
  ];
}

// ── Activity section ───────────────────────────────────────────────────────────

function buildActivityHeader(index: number, title: string): Paragraph[] {
  return [
    // Activity number + name
    paragraph(
      [
        blk(`${index + 1}.  `, { bold: true, size: 26 }),
        blk(title.toUpperCase(), { bold: true, size: 26 }),
      ],
      { spacing: { before: 0, after: 240 } }
    ),
  ];
}

function buildActivityTable(act: any): Table {
  const dateStr = act.start_date
    ? format(new Date(act.start_date), 'd MMMM yyyy', { locale: ms })
    : '-';

  const hCell = (text: string) =>
    new TableCell({
      shading: { fill: 'E2E8F0', type: ShadingType.CLEAR, color: 'auto' },
      borders: tableBorders,
      children: [paragraph(blk(text, { bold: true, size: 22 }))],
    });

  const dCell = (text: string, width?: string) =>
    new TableCell({
      borders: tableBorders,
      children: [paragraph(blk(text || '-', { size: 22 }))],
    });

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [convertInchesToTwip(1.5), convertInchesToTwip(3.5), convertInchesToTwip(2.0)],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [hCell('TARIKH'), hCell('AKTIVITI'), hCell('TINDAKAN')],
      }),
      new TableRow({
        children: [
          dCell(dateStr),
          dCell(act.title || '-'),
          dCell(act.tindakan || '-'),
        ],
      }),
    ],
  });
}

function buildLampiranHeading(): Paragraph {
  return paragraph(
    blk('LAMPIRAN', {
      bold: true,
      size: 24,
      underline: { type: UnderlineType.SINGLE, color: '000000' },
    }),
    { spacing: { before: 360, after: 200 } }
  );
}

async function buildImageTable(imageUrls: string[]): Promise<Table | Paragraph> {
  if (!imageUrls.length) {
    return paragraph(
      blk('[ Tiada gambar dilampirkan ]', { size: 20, italics: true, color: '888888' }),
      { spacing: { before: 120, after: 120 } }
    );
  }

  // Fetch max 6 images
  const buffers = await Promise.all(
    imageUrls.slice(0, 6).map(url => fetchImageBuffer(url))
  );
  const valid = buffers.filter(Boolean) as ArrayBuffer[];

  if (valid.length === 0) {
    return paragraph(
      blk('[ Gambar tidak dapat dimuatkan ]', { size: 20, italics: true, color: '888888' }),
      { spacing: { before: 120, after: 120 } }
    );
  }

  const imgCell = (buf: ArrayBuffer | null) =>
    new TableCell({
      borders: noBorders,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      children: buf
        ? [
            new Paragraph({
              spacing: { after: 0 },
              children: [
                new ImageRun({
                  data: buf,
                  transformation: { width: 240, height: 170 },
                  type: detectImageType(buf),
                }),
              ],
            }),
          ]
        : [paragraph(blk(''))],
    });

  const emptyCell = () =>
    new TableCell({
      borders: noBorders,
      children: [paragraph(blk(''))],
    });

  const rows: TableRow[] = [];
  for (let i = 0; i < valid.length; i += 2) {
    rows.push(
      new TableRow({
        children: [imgCell(valid[i]), valid[i + 1] ? imgCell(valid[i + 1]) : emptyCell()],
      })
    );
  }

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows,
  });
}

// ── Signature section ──────────────────────────────────────────────────────────

function buildSignatureBlock(
  label: string,
  name: string,
  role?: string,
  unit?: string,
  unit2?: string,
): Paragraph[] {
  const blocks: Paragraph[] = [
    // italic label "Disediakan oleh:"
    paragraph(
      blk(label, { italics: true, size: 22 }),
      { spacing: { before: 560, after: 60 } }
    ),

    // Signature line — long underscores as visual line
    paragraph(
      blk('_'.repeat(40), { size: 22 }),
      { spacing: { before: 0, after: 240 } }
    ),

    // Name (bold)
    paragraph(
      blk(name.toUpperCase(), { bold: true, size: 22 }),
      { spacing: { before: 0, after: 80 } }
    ),
  ];

  if (role) {
    blocks.push(
      paragraph(blk(role.toUpperCase(), { size: 22 }), { spacing: { before: 0, after: 60 } })
    );
  }
  if (unit) {
    blocks.push(
      paragraph(blk(unit.toUpperCase(), { size: 22 }), { spacing: { before: 0, after: 60 } })
    );
  }
  if (unit2) {
    blocks.push(
      paragraph(blk(unit2.toUpperCase(), { size: 22 }), { spacing: { before: 0, after: 0 } })
    );
  }

  return blocks;
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function generateLaporanDocx(opts: LaporanDocxOptions): Promise<void> {
  const {
    clubName,
    monthYear,
    activities,
    submitterName,
    submitterRole,
    submitterUnit,
    presidenName = '( Tiada Maklumat )',
    reviewerRole = 'PRESIDEN',
    reviewerUnit,
    clubLogoUrl,
    fileName,
  } = opts;

  // Logo URLs
  const POLI_LOGO_URL =
    'https://upload.wikimedia.org/wikipedia/ms/thumb/a/a8/Polisas_logo.png/220px-Polisas_logo.png';

  // ── Load logos ──────────────────────────────────────────────────────────────
  const [poliBuffer, clubBuffer] = await Promise.all([
    fetchImageBuffer(POLI_LOGO_URL),
    resolveImage(clubLogoUrl),
  ]);

  // ── Build document sections ─────────────────────────────────────────────────
  const children: (Paragraph | Table)[] = [];

  // ─ Cover page ──────────────────────────────────────────────────────────────
  children.push(buildLogoRow(poliBuffer, clubBuffer));
  children.push(...buildCoverSection(monthYear, clubName));

  // ─ Activities (one page-break then all activities) ─────────────────────────
  children.push(paragraph(blk(''), { pageBreakBefore: true }));

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];

    if (i > 0) {
      // Page break between activities
      children.push(paragraph(blk(''), { pageBreakBefore: true }));
    }

    // Activity number + title heading
    children.push(...buildActivityHeader(i, act.title || 'Aktiviti'));

    // 3-col table
    children.push(buildActivityTable(act));

    // LAMPIRAN
    children.push(buildLampiranHeading());

    // Images
    const imageUrls: string[] = Array.isArray(act.image_urls)
      ? act.image_urls.filter((u: any) => typeof u === 'string' && u.trim() !== '')
      : [];
    children.push(await buildImageTable(imageUrls));

    // Description / notes
    if (act.description) {
      children.push(
        paragraph(
          blk(act.description, { size: 22 }),
          { spacing: { before: 200, after: 100 } }
        )
      );
    }
  }

  // ─ Signature page ───────────────────────────────────────────────────────────
  children.push(paragraph(blk(''), { pageBreakBefore: true }));

  children.push(
    ...buildSignatureBlock(
      'Disediakan oleh:',
      submitterName || 'SETIAUSAHA',
      submitterRole,
      submitterUnit ?? clubName,
    )
  );

  children.push(
    ...buildSignatureBlock(
      'Disemak oleh:',
      presidenName,
      reviewerRole,
      reviewerUnit,
    )
  );

  children.push(
    ...buildSignatureBlock(
      'Disahkan oleh:',
      'YANG DIPERTUA',
      'JAWATANKUASA PERWAKILAN PELAJAR',
      'POLITEKNIK SULTAN HAJI AHMAD SHAH',
    )
  );

  // ── Assemble document ───────────────────────────────────────────────────────
  const doc = new Document({
    creator: 'JPP POLISAS System',
    title: `Laporan Bulanan - ${clubName} - ${monthYear}`,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25),
              right: convertInchesToTwip(1.25),
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const name = fileName ? `${fileName}.docx` : `Laporan_${clubName}_${monthYear}.docx`;
  saveAs(blob, name);
}
