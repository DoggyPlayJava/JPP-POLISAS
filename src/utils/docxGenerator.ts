import { AlignmentType, BorderStyle, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, UnderlineType, WidthType, ImageRun, VerticalAlign, HeightRule, PageBreak, TabStopType, TabStopPosition } from 'docx';
import { KertasKerjaData } from '../components/ai/KertasKerjaRenderer';
import { MinitMesyuaratData } from '../components/ai/MinitMesyuaratRenderer';
import { Buffer } from 'buffer';
import i18n from '@/lib/i18n';

const t = (key: string, fallback: string, options?: Record<string, unknown>): string => {
  if (i18n && typeof i18n.t === 'function' && i18n.isInitialized) {
    return i18n.t(key, fallback, options);
  }
  return fallback;
};

const fRM = (v: number) => `RM ${v.toFixed(2)}`;
const hitungSub = (items: any[]) => items.reduce((s, i) => s + i.harga_seunit * i.kuantiti, 0);
const hitungJumlah = (kat: any[]) => kat.reduce((s, k) => s + hitungSub(k.items), 0);

type DocElement = Paragraph | Table;

const SPACING_1_5 = { line: 360, lineRule: "auto" as const, after: 120 };
const SPACING_SINGLE = { line: 240, lineRule: "auto" as const };

// Helper for empty lines
const emptyLine = (size = 22) => new Paragraph({ text: "", spacing: SPACING_SINGLE, children: [new TextRun({ text: "", size })] });

// Front page (Title) paragraph
const frontP = (text: string) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: SPACING_SINGLE,
  children: [new TextRun({ text, bold: true, font: "Arial", size: 28 })] // 14pt Front Page
});

const frontTableP = (text: string, bold = false) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: SPACING_SINGLE,
  children: [new TextRun({ text, bold, font: "Arial", size: 18 })] // 9pt for approval box to fit well
});

// Hanging Header Section (e.g. "1.0    PENDAHULUAN")
const headerP = (num: string, title: string) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: SPACING_1_5,
  indent: { left: 720, hanging: 720 },
  tabStops: [{ type: TabStopType.LEFT, position: 720 }],
  children: [new TextRun({ text: `${num}\t${title}`, bold: true, font: "Arial", size: 22 })]
});

// Normal justified body paragraph with 1.5 spacing, indented to align with Header's Title
const bodyP = (text: string, bold = false) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: SPACING_1_5,
  indent: { left: 720 }, // 0.5 inch indent to align body text perfectly under title
  children: [new TextRun({ text, bold, font: "Arial", size: 22 })]
});

// Numbered List inside a section (e.g. 1. 2. 3. under 4.0 MATLAMAT)
const listP = (num: string, text: string) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: SPACING_1_5,
  indent: { left: 1440, hanging: 360 }, // Intended further inside (1.0 inch left), hanging 0.25 inch
  tabStops: [{ type: TabStopType.LEFT, position: 1440 }],
  children: [new TextRun({ text: `${num}\t${text}`, font: "Arial", size: 22 })] 
});

// Table Cell Creators
const createCompactCell = (content: Paragraph | Paragraph[], opts?: { 
  bg?: string, width?: number, align?: any, vAlign?: any, colSpan?: number, noBorder?: boolean 
}) => {
  const children = Array.isArray(content) ? content : [content];
  const borders = opts?.noBorder ? {
    top: { style: BorderStyle.NONE, size: 0, color: "auto" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  } : undefined;

  return new TableCell({
    children, columnSpan: opts?.colSpan, shading: opts?.bg ? { fill: opts.bg } : undefined,
    verticalAlign: opts?.vAlign || VerticalAlign.CENTER, borders,
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 0, bottom: 0, left: 100, right: 100 } // Tightly packed!
  });
};

const createSpacedCell = (content: Paragraph | Paragraph[], opts?: { 
  bg?: string, width?: number, align?: any, vAlign?: any, colSpan?: number, noBorder?: boolean 
}) => {
  const children = Array.isArray(content) ? content : [content];
  const borders = opts?.noBorder ? {
    top: { style: BorderStyle.NONE, size: 0, color: "auto" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  } : undefined;

  return new TableCell({
    children, columnSpan: opts?.colSpan, shading: opts?.bg ? { fill: opts.bg } : undefined,
    verticalAlign: opts?.vAlign || VerticalAlign.TOP, borders,
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 150, bottom: 150, left: 150, right: 150 } // Enough breathing room for Executive Summary/Cover
  });
};

// Text helpers for compact/spaced cells
const createCompactTextCell = (text: string, opts?: { bg?: string, bold?: boolean, width?: number, align?: any, color?: string, colSpan?: number, size?: number }) => {
  return createCompactCell(new Paragraph({
    alignment: opts?.align || AlignmentType.LEFT,
    spacing: SPACING_SINGLE,
    children: [new TextRun({ text, bold: opts?.bold, color: opts?.color, font: "Arial", size: opts?.size || 22 })]
  }), opts);
}

const createSpacedTextCell = (text: string, opts?: { bg?: string, bold?: boolean, width?: number, align?: any, color?: string, colSpan?: number, size?: number }) => {
  return createSpacedCell(new Paragraph({
    alignment: opts?.align || AlignmentType.LEFT,
    spacing: SPACING_SINGLE,
    children: [new TextRun({ text, bold: opts?.bold, color: opts?.color, font: "Arial", size: opts?.size || 22 })]
  }), opts);
}

export const generateKertasKerjaDocx = async (data: KertasKerjaData, logoBase64: string | null, isoLogoBase64?: string | null): Promise<Blob> => {
  const hm = data.halaman_muka;
  const re = data.ringkasan_eksekutif;
  const ik = data.isi_kandungan;
  const co = data.carta_organisasi;
  const bel = data.belanjawan;
  const ttd = data.tandatangan;

  // Approval Table (Cover Page)
  const approvalTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createSpacedCell(frontTableP(t('portal:docx_objek', "OBJEK"), true), { bg: "4472C4" }),
          createSpacedCell(frontTableP("OS21", true), { bg: "4472C4" }),
          createSpacedCell(frontTableP("O24", true), { bg: "4472C4" }),
          createSpacedCell(frontTableP("OS26", true), { bg: "4472C4" }),
          createSpacedCell(frontTableP("OS27", true), { bg: "4472C4" }),
          createSpacedCell(frontTableP("OS29", true), { bg: "4472C4" }),
          createSpacedCell(frontTableP("OS29\nIEEP", true), { bg: "4472C4" }),
          createSpacedCell(frontTableP("OS42", true), { bg: "4472C4" }),
          createSpacedCell(frontTableP(t('portal:docx_lain_lain', "Lain-Lain"), true), { bg: "4472C4" }),
        ]
      }),
      new TableRow({ children: [createSpacedCell(frontTableP(t('portal:docx_tick', "Tick (√)"), true), { bg: "FFFF00" }), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP(""))] }),
      new TableRow({ children: [createSpacedCell(frontTableP(t('portal:docx_no_waran', "No.\nWaran"), true), { bg: "FFFF00" }), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP(""))] }),
      new TableRow({ children: [createSpacedCell(frontTableP("WP10.9", true), { bg: "FFFF00" }), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP(""))] }),
      new TableRow({
        height: { value: 600, rule: HeightRule.ATLEAST }, // taller class for writing kelulusan
        children: [createSpacedCell(frontTableP(t('portal:docx_kelulusan', "Kelulusan"), true), { bg: "FFFF00", vAlign: VerticalAlign.CENTER }), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP(""))] 
      }),
      new TableRow({ 
        height: { value: 600, rule: HeightRule.ATLEAST }, // taller class for cop/tandatangan
        children: [createSpacedCell(frontTableP(t('portal:docx_ttangan_pelulus', "T.Tangan\nPelulus"), true), { bg: "FFFF00", vAlign: VerticalAlign.CENTER }), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP("")), createSpacedCell(frontTableP(""))] 
      }),
    ]
  });

  // Halaman Muka Elements
  const frontPageElems: DocElement[] = [];
  if (logoBase64) {
    try {
      const base64Data = logoBase64.split("base64,")[1];
      frontPageElems.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: SPACING_SINGLE,
        children: [new ImageRun({ 
          data: Buffer.from(base64Data, 'base64'), 
          transformation: { width: 140, height: 140 },
          type: "png"
        })] 
      }));
    } catch(e) { console.error("Logo error", e); }
  }
  
  frontPageElems.push(
    emptyLine(28),
    emptyLine(28),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: SPACING_SINGLE,
      children: [new TextRun({ text: t('portal:docx_kertas_kerja', "KERTAS KERJA"), bold: true, font: "Arial", size: 28 })]
    }),
    frontP(hm.tajuk_program.toUpperCase()),
    
    emptyLine(28), emptyLine(28), emptyLine(28), // Large space
    
    frontP(t('portal:docx_date_day_upper', `${hm.tarikh} (${hm.hari.toUpperCase()})`, { tarikh: hm.tarikh, hari: hm.hari.toUpperCase() })),
    frontP(hm.tempat.toUpperCase()),
    
    emptyLine(28), emptyLine(28), emptyLine(28), // Large space
    
    frontP(t('portal:docx_anjuran_colon', "ANJURAN:")),
    frontP(hm.penganjur.toUpperCase()),
    frontP("POLITEKNIK SULTAN HAJI AHMAD SHAH"),
    
    emptyLine(28), emptyLine(28),
    approvalTable
  );

  // Inject ISO Logos if available
  if (isoLogoBase64) {
    try {
      const base64Data = isoLogoBase64.split("base64,")[1];
      frontPageElems.push(
        emptyLine(28),
        emptyLine(28),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: SPACING_SINGLE,
          children: [new ImageRun({ 
            data: Buffer.from(base64Data, 'base64'), 
            transformation: { width: 480, height: 60 },
            type: "png"
          })] 
        })
      );
    } catch(e) { console.error("ISO Logo error", e); }
  }

  frontPageElems.push(
    new Paragraph({ children: [new PageBreak()] }) // Force next page
  );

  // Ringkasan Eksekutif
  const reMatlamat = re.matlamat.map((m, i) => new Paragraph({ 
    children: [new TextRun({ text: `${i+1}.\t${m}`, font: "Arial", size: 22 })],
    indent: { left: 480, hanging: 240 }, // Small indents for inside the table
    tabStops: [{ type: TabStopType.LEFT, position: 480 }],
    spacing: SPACING_SINGLE // Keep table compact 11pt
  }));
  
  const execSummaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [createSpacedTextCell(t('portal:docx_ipta', "IPTA"), { bold: true, width: 35, size: 22 }), createSpacedTextCell(t('portal:docx_polisas_full', "Politeknik Sultan Haji Ahmad Shah"), { size: 22 })] }),
      new TableRow({ children: [createSpacedTextCell(t('portal:docx_tajuk_program', "TAJUK PROGRAM"), { bold: true, size: 22 }), createSpacedTextCell(hm.tajuk_program, { size: 22 })] }),
      new TableRow({ children: [createSpacedTextCell(t('portal:docx_jenis_program', "JENIS PROGRAM"), { bold: true, size: 22 }), createSpacedTextCell(re.jenis_program, { size: 22 })] }),
      new TableRow({ children: [createSpacedTextCell(t('portal:docx_matlamat_pencapaian_program', "MATLAMAT/ PENCAPAIAN PROGRAM"), { bold: true, size: 22 }), createSpacedCell(reMatlamat)] }),
      new TableRow({ children: [createSpacedTextCell(t('portal:docx_anjuran', "ANJURAN"), { bold: true, size: 22 }), createSpacedTextCell(t('portal:docx_penganjur_kerjasama_detail', `${hm.penganjur} dengan kerjasama Jabatan Hal Ehwal Pelajar (JHEP) POLISAS serta kelab-kelab di POLISAS`, { penganjur: hm.penganjur }), { size: 22 })] }),
      new TableRow({ children: [createSpacedTextCell(t('portal:docx_tarikh_dan_tempat', "TARIKH DAN TEMPAT"), { bold: true, size: 22 }), createSpacedTextCell(t('portal:docx_tarikh_tempat_val', `${hm.tarikh}, ${hm.tempat}`, { tarikh: hm.tarikh, tempat: hm.tempat }), { size: 22 })] }),
      new TableRow({ children: [
        createSpacedTextCell(t('portal:docx_bilangan_peserta', "BILANGAN PESERTA"), { bold: true, size: 22 }), 
        createSpacedCell([
          new Paragraph({ spacing: SPACING_SINGLE, children: [new TextRun({ text: t('portal:docx_peserta_count', `Peserta: ${re.bilangan_peserta} orang`, { count: re.bilangan_peserta }), font: "Arial", size: 22 })] }), 
          new Paragraph({ spacing: SPACING_SINGLE, children: [new TextRun({ text: t('portal:docx_pegawai_count', `Pegawai: ${re.bilangan_pegawai} orang`, { count: re.bilangan_pegawai }), font: "Arial", size: 22 })] })
        ])
      ]}),
      new TableRow({ children: [createSpacedTextCell(t('portal:docx_anggaran_kos', "ANGGARAN KOS"), { bold: true, size: 22 }), createSpacedTextCell(fRM(re.anggaran_kos), { size: 22 })] }),
    ]
  });

  const ikElems: DocElement[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: t('portal:docx_ringkasan_eksekutif', "RINGKASAN EKSEKUTIF"), bold: true, font: "Arial", size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: hm.tajuk_program, bold: true, font: "Arial", size: 22 })] }),
    execSummaryTable,
    new Paragraph({ children: [new PageBreak()] }),

    headerP("1.0", t('portal:docx_pendahuluan', "PENDAHULUAN")),
    bodyP(ik.pendahuluan),
    
    emptyLine(22),
    headerP("2.0", t('portal:docx_nama_program', "NAMA PROGRAM")),
    bodyP(ik.nama_program),
    
    emptyLine(22),
    headerP("3.0", t('portal:docx_tujuan', "TUJUAN")),
    bodyP(ik.tujuan),
    
    emptyLine(22),
    headerP("4.0", t('portal:docx_matlamat', "MATLAMAT")),
    ...ik.matlamat.map((m, i) => listP(`${i+1}.`, m)),
    
    emptyLine(22),
    headerP("5.0", t('portal:docx_penganjur', "PENGANJUR")),
    bodyP(t('portal:docx_penganjur_kerjasama_simple', `${hm.penganjur} dengan kerjasama Jabatan Hal Ehwal Pelajar (JHEP) POLISAS.`, { penganjur: hm.penganjur })),
    
    emptyLine(22),
    headerP("6.0", t('portal:docx_tarikh_masa_tempat', "TARIKH, MASA DAN TEMPAT")),
    // Manually pushing tab to match body indent for these
    new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: SPACING_1_5, indent: { left: 720 }, children: [new TextRun({ text: t('portal:docx_tarikh_label_val', `Tarikh : ${hm.tarikh}`, { tarikh: hm.tarikh }), font: "Arial", size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: SPACING_1_5, indent: { left: 720 }, children: [new TextRun({ text: t('portal:docx_masa_default', `Masa   : 8:00 Pagi - 5:00 Petang`), font: "Arial", size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: SPACING_1_5, indent: { left: 720 }, children: [new TextRun({ text: t('portal:docx_tempat_label_val', `Tempat : ${hm.tempat}`, { tempat: hm.tempat }), font: "Arial", size: 22 })] }),
    
    emptyLine(22),
    headerP("7.0", t('portal:docx_penyertaan_sasaran', "PENYERTAAN / SASARAN")),
    bodyP(t('portal:docx_peserta_total_desc', `${re.bilangan_peserta} orang peserta.`, { count: re.bilangan_peserta })),
    
    emptyLine(22),
    headerP("8.0", t('portal:docx_bentuk_program', "BENTUK PROGRAM")),
    bodyP(ik.bentuk_program),
    
    emptyLine(22),
    headerP("9.0", t('portal:docx_carta_organisasi', "CARTA ORGANISASI")),
    bodyP(t('portal:docx_rujuk_lampiran_1', "Rujuk Lampiran I.")),
    
    emptyLine(22),
    headerP("10.0", t('portal:docx_tentatif_program', "TENTATIF PROGRAM")),
    bodyP(t('portal:docx_rujuk_lampiran_2', "Rujuk Lampiran II.")),
    
    emptyLine(22),
    headerP("11.0", t('portal:docx_anggaran_belanjawan', "ANGGARAN BELANJAWAN")),
    bodyP(t('portal:docx_rujuk_lampiran_3', "Rujuk Lampiran III.")),
    
    emptyLine(22),
    headerP("12.0", t('portal:docx_penutup', "PENUTUP")),
    bodyP(t('portal:docx_penutup_kertas_kerja_desc', `Berdasarkan kertas kerja ini, maka dipohon agar pihak pengurusan POLISAS dapat memberi komitmen dan sokongan bagi menjayakan program ini. Semoga yang dirancang ini dapat berjalan dengan lancar dan memenuhi matlamat dan objektif program serta memberi manfaat kepada semua siswa/siswi Politeknik Sultan Haji Ahmad Shah.`)),
    
    new Paragraph({ children: [new PageBreak()] }) // Isolated Signature Page
  ];

  // Tandatangan Signatures - Vertical Layout per Official standard
  const signatureSpace = () => new Paragraph({ spacing: SPACING_SINGLE, children: [new TextRun({ text: "\n\n\n\n\n", font: "Arial", size: 22 })] });
  const sigTextP = (text: string, bold = false) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: SPACING_SINGLE, children: [new TextRun({ text, bold, font: "Arial", size: 22})] });

  ikElems.push(
    sigTextP(t('portal:docx_disediakan_oleh', "Disediakan oleh:")),
    signatureSpace(),
    sigTextP("_____________________"),
    sigTextP(ttd.pengarah_program.toUpperCase(), true),
    sigTextP(t('portal:docx_pengarah_program_title', `Pengarah Program\n${hm.tajuk_program}`, { title: hm.tajuk_program })),
    
    emptyLine(22), emptyLine(22),
    
    sigTextP(t('portal:docx_disemak_oleh', "Disemak oleh:")),
    signatureSpace(),
    sigTextP("_____________________"),
    sigTextP(ttd.penasihat_jpp.toUpperCase(), true),
    sigTextP(t('portal:docx_penasihat_jpp_full', "Penasihat\nJawatankuasa Perwakilan Pelajar\nPoliteknik Sultan Haji Ahmad Shah")),

    emptyLine(22), emptyLine(22),
    
    sigTextP(t('portal:docx_disokong_oleh', "Disokong oleh:")),
    signatureSpace(),
    sigTextP("_____________________"),
    sigTextP(ttd.ketua_jabatan_hep.toUpperCase(), true),
    sigTextP(t('portal:docx_ketua_jabatan_hep_full', "Ketua Jabatan\nHal Ehwal Pelajar\nPoliteknik Sultan Haji Ahmad Shah")),

    emptyLine(22), emptyLine(22),
    
    sigTextP(t('portal:docx_diluluskan_oleh', "Diluluskan oleh:")),
    signatureSpace(),
    sigTextP("_____________________"),
    sigTextP(ttd.timbalan_pengarah.toUpperCase(), true),
    sigTextP(t('portal:docx_timbalan_pengarah_full', "Timbalan Pengarah (Sokongan Akademik)\nPoliteknik Sultan Haji Ahmad Shah")),

    new Paragraph({ children: [new PageBreak()] })
  );

  // Lampiran Headings (Right aligned, Bold, Italic)
  const lampiranHeaderP = (text: string) => new Paragraph({ 
    alignment: AlignmentType.RIGHT, 
    spacing: SPACING_SINGLE,
    children: [new TextRun({ text, bold: true, italics: true, font: "Arial", size: 22 })] 
  });

  const pI = (text: string, bold = false) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: SPACING_SINGLE, children: [new TextRun({text, bold, font:"Arial", size:22})] });
  const pIu = (text: string) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: SPACING_SINGLE, children: [new TextRun({text, bold:true, underline: { type: UnderlineType.SINGLE }, font:"Arial", size:22})] });
  
  const lampiranIElems: DocElement[] = [
    lampiranHeaderP(t('portal:docx_lampiran_1', "LAMPIRAN I")),
    pI(t('portal:docx_ahli_jawatankuasa_pelaksana', "AHLI JAWATANKUASA PELAKSANA"), true),
    pI(hm.tajuk_program.toUpperCase(), true),
    emptyLine(),
    pIu(t('portal:docx_jawatankuasa_induk', "JAWATANKUASA INDUK")),
    emptyLine(),
    pI(t('portal:docx_penaung', "PENAUNG"), true), pI(co.jawatankuasa_induk.penaung.nama.toUpperCase(), true), pI(co.jawatankuasa_induk.penaung.jawatan), emptyLine(),
    pI(t('portal:docx_penasihat', "PENASIHAT"), true),
    ...co.jawatankuasa_induk.penasihat.flatMap(p => [pI(p.nama.toUpperCase(), true), pI(p.jawatan), emptyLine()]),
    pI(t('portal:docx_pengerusi', "PENGERUSI"), true), pI(co.jawatankuasa_induk.pengerusi.nama.toUpperCase(), true), pI(co.jawatankuasa_induk.pengerusi.jawatan), emptyLine(),
    
    emptyLine(),
    pIu(t('portal:docx_jawatankuasa_majlis_tertinggi', "JAWATANKUASA MAJLIS TERTINGGI")),
    emptyLine(),
    ...co.jawatankuasa_majlis_tertinggi.flatMap(p => [pI(p.nama.toUpperCase(), true), pI(p.jawatan.toUpperCase(), true), emptyLine()]),
    
    new Paragraph({ children: [new PageBreak()] }),
    lampiranHeaderP(t('portal:docx_lampiran_1', "LAMPIRAN I")),
    pIu(t('portal:docx_jawatankuasa_pelaksana_unit', "JAWATANKUASA PELAKSANA UNIT")),
    emptyLine(),
    ...co.unit_pelaksana.flatMap(u => [pI(t('portal:docx_jk_unit_format', `JK ${u.nama_unit.toUpperCase()}`, { unit: u.nama_unit.toUpperCase() }), true), ...u.ahli.map(a => pI(a.toUpperCase(), true)), emptyLine()]),
    new Paragraph({ children: [new PageBreak()] })
  ];

  // Lampiran II (Tentatif)
  const lampiranIIElems: DocElement[] = [
    lampiranHeaderP(t('portal:docx_lampiran_2', "LAMPIRAN II")),
    pI(t('portal:docx_tentatif_program', "TENTATIF PROGRAM"), true),
    pI(hm.tajuk_program.toUpperCase(), true),
    emptyLine()
  ];
  
  data.tentatif.forEach(tItem => {
    lampiranIIElems.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [createCompactTextCell(t('portal:docx_tentatif_tarikh_hari', `${tItem.tarikh} (${tItem.hari})`, { tarikh: tItem.tarikh, hari: tItem.hari }), { bg: "e8e8e8", bold: true, align: AlignmentType.CENTER, colSpan: 2, size: 22 })] }),
        new TableRow({ children: [createCompactTextCell(t('portal:docx_masa_header', "MASA"), { bold: true, align: AlignmentType.CENTER, width: 30, size: 22 }), createCompactTextCell(t('portal:docx_aktiviti_header', "AKTIVITI"), { bold: true, align: AlignmentType.CENTER, size: 22 })] }),
        ...tItem.slot.map(s => 
          new TableRow({ children: [createCompactTextCell(t('portal:docx_slot_masa_range', `${s.masa_mula} - ${s.masa_tamat}`, { start: s.masa_mula, end: s.masa_tamat }), { align: AlignmentType.CENTER, size: 22 }), createCompactTextCell(s.aktiviti, { size: 22 })] })
        )
      ]
    }), emptyLine());
  });
  lampiranIIElems.push(new Paragraph({ children: [new PageBreak()] }));

  // Lampiran III (Belanjawan)
  const lampiranIIIElems: DocElement[] = [
    lampiranHeaderP(t('portal:docx_lampiran_3', "LAMPIRAN III")),
    pI(t('portal:docx_anggaran_perbelanjaan', "ANGGARAN PERBELANJAAN"), true),
    pI(hm.tajuk_program.toUpperCase(), true),
    emptyLine()
  ];

  const belanjawanRows: TableRow[] = [];
  belanjawanRows.push(new TableRow({
    children: [
      createCompactTextCell(t('portal:docx_bil_no', "BIL"), { bold: true, align: AlignmentType.CENTER, width: 5 }),
      createCompactTextCell(t('portal:docx_perkara', "PERKARA"), { bold: true, align: AlignmentType.CENTER, width: 45 }),
      createCompactTextCell(t('portal:docx_harga', "HARGA"), { bold: true, align: AlignmentType.CENTER, width: 15 }),
      createCompactTextCell(t('portal:docx_kuantiti', "KUANTITI"), { bold: true, align: AlignmentType.CENTER, width: 15 }),
      createCompactTextCell(t('portal:docx_jumlah', "JUMLAH"), { bold: true, align: AlignmentType.CENTER, width: 20 }),
    ]
  }));

  const jumlahKeseluruhan = hitungJumlah(bel.kategori);

  bel.kategori.forEach((kat, ki) => {
    const sub = hitungSub(kat.items);
    belanjawanRows.push(new TableRow({
      children: [
        createCompactTextCell(`${ki + 1}.`, { bold: true, align: AlignmentType.CENTER }),
        createCompactTextCell(kat.nama_kategori, { bold: true, colSpan: 4 }),
      ]
    }));
    
    kat.items.forEach(item => {
      const j = item.harga_seunit * item.kuantiti;
      belanjawanRows.push(new TableRow({
        children: [
          createCompactTextCell(""),
          createCompactTextCell(item.perkara),
          createCompactTextCell(fRM(item.harga_seunit), { align: AlignmentType.CENTER }),
          createCompactTextCell(`${item.kuantiti}`, { align: AlignmentType.CENTER }),
          createCompactTextCell(fRM(j), { align: AlignmentType.RIGHT }),
        ]
      }));
    });
    
    belanjawanRows.push(new TableRow({
      children: [
        createCompactTextCell("", { colSpan: 3 }),
        createCompactTextCell(t('portal:docx_jumlah', "JUMLAH"), { bold: true, align: AlignmentType.RIGHT }),
        createCompactTextCell(fRM(sub), { bold: true, align: AlignmentType.RIGHT }),
      ]
    }));
  });

  belanjawanRows.push(new TableRow({
    children: [
      createCompactTextCell(t('portal:docx_jumlah_keseluruhan_colon', "JUMLAH KESELURUHAN:"), { bold: true, align: AlignmentType.RIGHT, colSpan: 4 }),
      createCompactTextCell(fRM(jumlahKeseluruhan), { bold: true, align: AlignmentType.RIGHT })
    ]
  }));

  const belanjawanTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: belanjawanRows });
  lampiranIIIElems.push(belanjawanTable, emptyLine(), new Paragraph({ children: [new TextRun({ text: t('portal:docx_pendapatan_colon', "PENDAPATAN:"), bold: true, font: "Arial", size: 22 })] }));
  
  bel.pendapatan.forEach((p, i) => {
    lampiranIIIElems.push(listP(`${i + 1}.`, `${p.sumber} = ${fRM(p.jumlah)}`));
  });

  // Combine into document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch margins
        }
      },
      children: [
        ...frontPageElems,
        ...ikElems,
        ...lampiranIElems,
        ...lampiranIIElems,
        ...lampiranIIIElems
      ]
    }]
  });

  return await Packer.toBlob(doc);
};

// ─── MINIT MESYUARAT DOCX GENERATOR ─────────────────────────────────────────

const MINIT_FONT = 'Times New Roman';
const MINIT_SIZE = 21; // 10.5pt in half-points
const MINIT_SPACING = { line: 276, lineRule: 'auto' as const, after: 0, before: 0 };

/** Simple cell helper for minit mesyuarat tables */
const minitCell = (
  paragraphs: Paragraph | Paragraph[],
  opts?: { width?: number; bold?: boolean; align?: any; colSpan?: number; vAlign?: any; bg?: string }
) => {
  const children = Array.isArray(paragraphs) ? paragraphs : [paragraphs];
  return new TableCell({
    children,
    columnSpan: opts?.colSpan,
    verticalAlign: opts?.vAlign || VerticalAlign.TOP,
    shading: opts?.bg ? { fill: opts.bg } : undefined,
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
  });
};

const minitP = (text: string, bold = false, align?: (typeof AlignmentType)[keyof typeof AlignmentType], size?: number) =>
  new Paragraph({
    alignment: align || AlignmentType.LEFT,
    spacing: MINIT_SPACING,
    children: [new TextRun({ text, bold, font: MINIT_FONT, size: size || MINIT_SIZE })],
  });

/** Header paragraph for table column */
const minitHeaderP = (text: string) => minitP(text, true, AlignmentType.CENTER);

const minitEmpty = () => new Paragraph({ spacing: MINIT_SPACING, children: [new TextRun({ text: '', size: MINIT_SIZE })] });

export const generateMinitMesyuaratDocx = async (data: MinitMesyuaratData): Promise<Blob> => {

  // ── SECTION 1: METADATA ──────────────────────────────────────────────────

  const headerElems: (Paragraph | Table)[] = [
    minitP(t('portal:docx_minit_mesyuarat', 'MINIT MESYUARAT'), true, AlignmentType.CENTER, 24),
    minitP(data.tajuk_mesyuarat.toUpperCase(), true, AlignmentType.CENTER, 22),
    minitEmpty(),
    minitP(t('portal:docx_bil_colon', 'BIL:'), true),
    minitEmpty(),
    new Paragraph({ spacing: MINIT_SPACING, children: [new TextRun({ text: t('portal:docx_tarikh_label', 'TARIKH'), bold: true, font: MINIT_FONT, size: MINIT_SIZE }), new TextRun({ text: t('portal:docx_tab_tarikh', `\t: ${data.tarikh}`, { tarikh: data.tarikh }), font: MINIT_FONT, size: MINIT_SIZE })] }),
    new Paragraph({ spacing: MINIT_SPACING, children: [new TextRun({ text: t('portal:docx_masa_label', 'MASA  '), bold: true, font: MINIT_FONT, size: MINIT_SIZE }), new TextRun({ text: t('portal:docx_tab_masa', `\t: ${data.masa}`, { masa: data.masa }), font: MINIT_FONT, size: MINIT_SIZE })] }),
    new Paragraph({ spacing: MINIT_SPACING, children: [new TextRun({ text: t('portal:docx_platform_label', 'PLATFORM'), bold: true, font: MINIT_FONT, size: MINIT_SIZE }), new TextRun({ text: t('portal:docx_tab_platform', `\t: ${data.platform}`, { platform: data.platform }), font: MINIT_FONT, size: MINIT_SIZE })] }),
    minitEmpty(),
    new Paragraph({ spacing: MINIT_SPACING, children: [new TextRun({ text: t('portal:docx_kehadiran_colon', 'KEHADIRAN : '), bold: true, font: MINIT_FONT, size: MINIT_SIZE }), new TextRun({ text: t('portal:docx_kehadiran_orang', `${data.kehadiran} Orang`, { count: data.kehadiran }), font: MINIT_FONT, size: MINIT_SIZE })] }),
    minitEmpty(),
  ];

  // ── ATTENDANCE TABLE ─────────────────────────────────────────────────────

  const hadirRows: TableRow[] = [
    new TableRow({
      children: [
        minitCell(minitHeaderP(t('portal:docx_bil_no', 'BIL')), { width: 12 }),
        minitCell(minitHeaderP(t('portal:docx_nama_header', 'NAMA'))),
      ]
    }),
    ...data.ahli_hadir.map(a => new TableRow({
      children: [
        minitCell(minitP(`${a.bil}`, false, AlignmentType.CENTER), { width: 12 }),
        minitCell(minitP(a.nama)),
      ]
    }))
  ];

  const hadirTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: hadirRows,
  });

  // ── AGENDA TABLE ─────────────────────────────────────────────────────────

  const agendaRows: TableRow[] = [
    new TableRow({
      children: [
        minitCell(minitHeaderP(t('portal:docx_bil_dot', 'BIL.')), { width: 8 }),
        minitCell(minitHeaderP(t('portal:docx_agenda', 'AGENDA'))),
        minitCell(minitHeaderP(t('portal:docx_tindakan', 'TINDAKAN')), { width: 16 }),
      ]
    }),
    ...data.agenda.map(item => {
      // Build agenda cell paragraphs
      const agendaContent: Paragraph[] = [
        minitP(item.tajuk, true),
      ];

      if (item.sub_perkara) {
        item.sub_perkara.forEach(sub => {
          agendaContent.push(
            new Paragraph({
              spacing: { ...MINIT_SPACING, before: 40 },
              children: [
                new TextRun({ text: `${sub.bil_sub}  `, font: MINIT_FONT, size: MINIT_SIZE }),
                new TextRun({ text: sub.teks, font: MINIT_FONT, size: MINIT_SIZE }),
              ],
            })
          );

          if (sub.bullet_points && sub.bullet_points.length > 0) {
            sub.bullet_points.forEach(bp => {
              // strip any *bold* markdown markers for plain text
              const plainBp = bp.replace(/\*(.*?)\*/g, '$1');
              agendaContent.push(
                new Paragraph({
                  spacing: MINIT_SPACING,
                  indent: { left: 360 },
                  children: [new TextRun({ text: `- ${plainBp}`, font: MINIT_FONT, size: MINIT_SIZE })],
                })
              );
            });
          }
        });
      }

      return new TableRow({
        children: [
          minitCell(minitP(`${item.bil}`, false, AlignmentType.CENTER)),
          minitCell(agendaContent),
          minitCell(minitP(item.tindakan || '', false, AlignmentType.CENTER)),
        ]
      });
    })
  ];

  const agendaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: agendaRows,
  });

  // ── SIGNATURE BLOCK ───────────────────────────────────────────────────────

  const sigSpace = () => new Paragraph({ spacing: { line: 1200, lineRule: 'exact' as const }, children: [new TextRun({ text: '', size: MINIT_SIZE })] });
  const sigLine = () => new Paragraph({ spacing: MINIT_SPACING, children: [new TextRun({ text: '_______________________________', font: MINIT_FONT, size: MINIT_SIZE })] });
  const sigP = (text: string, bold = false) => new Paragraph({ spacing: MINIT_SPACING, children: [new TextRun({ text, bold, font: MINIT_FONT, size: MINIT_SIZE })] });

  const buildSigCell = (label: string, pihak: { nama: string; jawatan: string }) => {
    const jawatanLines = pihak.jawatan.split('\n');
    return minitCell(
      [
        sigP(label),
        sigSpace(),
        sigLine(),
        sigP(pihak.nama, true),
        ...jawatanLines.map(l => sigP(l)),
      ],
      { vAlign: VerticalAlign.TOP }
    );
  };

  const sigTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          buildSigCell(t('portal:docx_disediakan_oleh', 'Disediakan oleh:'), data.tandatangan.disediakan_oleh),
          buildSigCell(t('portal:docx_disahkan_oleh', 'Disahkan oleh:'), data.tandatangan.disahkan_oleh),
        ]
      })
    ],
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    }
  });

  // ── BUILD DOCUMENT ───────────────────────────────────────────────────────

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch
        }
      },
      children: [
        ...headerElems,
        hadirTable,
        new Paragraph({ children: [new PageBreak()] }),
        agendaTable,
        new Paragraph({ children: [new PageBreak()] }),
        minitEmpty(),
        sigTable,
      ]
    }]
  });

  return await Packer.toBlob(doc);
};

