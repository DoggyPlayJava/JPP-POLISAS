import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Image, Font
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';
import jppLogoLandscape from '@/assets/Logo-JPP-Laporan.jpeg';

// Pendaftaran Font (Helvetica)
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' }
  ]
});

// Matikan hyphenation automatik
Font.registerHyphenationCallback(word => [word]);

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 90,  // ≈ 1.25 inci — Exco only
    paddingVertical: 56,
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: '#000000',
    lineHeight: 1.5,
    position: 'relative'
  },
  // Laporan Kelab: margin asal (40pt) — tidak diubah
  pageClub: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: '#000000',
    lineHeight: 1.5,
    position: 'relative'
  },
  // Halaman tandatangan: kekal margin asal (40pt)
  pageSignature: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: '#000000',
    lineHeight: 1.5,
    position: 'relative'
  },

  // ── WATERMARK ──
  watermarkContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  watermarkImage: {
    width: 420,
    opacity: 0.15,
  },

  // ── HEADER ROW: fixed height, kedua logo bottom-aligned ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',   // bottom-align: base kedua logo rata
    height: 90,               // fixed height supaya alignment konsisten
    marginBottom: 20,
  },
  // POLISAS logo: kiri, landscape
  logoLeftWrapper: {
    flex: 1,
    height: 90,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  logoLeft: {
    width: 190,
    height: 80,
    objectFit: 'contain',
  },
  // JPP/Kelab logo: kanan
  // isExco → landscape JPP (142×80, sama tinggi dengan POLISAS)
  // Kelab  → ikut styles.logoRight (90×78)
  logoRightWrapper: {
    height: 90,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  logoRight: {
    width: 90,
    height: 78,
    objectFit: 'contain',
  },

  coverCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -80,
  },
  // 3 baris berasingan — semua saiz sama
  coverTitleLine: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 1.2,
    color: '#000000',
  },

  coverBottom: {
    position: 'absolute',
    bottom: 100,
    left: 90,
    right: 90,
    alignItems: 'center'
  },
  coverClubName: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, color: '#000000' },
  coverInstitution: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#000000' },

  sectionTitle: { fontSize: 12, marginBottom: 10, marginTop: 10, color: '#000000' },
  // border luar jadual nipis (0.5)
  table: { width: '100%', borderStyle: 'solid', borderWidth: 0.5, borderColor: '#000', marginBottom: 20 },
  tableRow: { flexDirection: 'row' },
  // garisan dalam cell pun nipis
  tableColHeader: { borderStyle: 'solid', borderWidth: 0.5, borderColor: '#000', padding: 2 },
  tableCol: { borderStyle: 'solid', borderWidth: 0.5, borderColor: '#000', padding: 2 },
  tableCellHeader: { fontSize: 12, textAlign: 'center', color: '#000000' },
  tableCell: { fontSize: 12, textAlign: 'left', color: '#000000' },

  lampiranTitle: { fontSize: 12, marginTop: 10, color: '#000000' },
  imageContainer: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 15,
    marginBottom: 15,
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  imageWrapper: { width: '45%', height: 230 },
  image: { width: '100%', height: '100%', objectFit: 'contain' },
  lampiranDesc: { fontSize: 12, textAlign: 'justify', marginTop: 10, color: '#000000' },

  signatureSection: {
    marginTop: 40,
    flexDirection: 'column',
    gap: 70,                  // lebih ruang antara blok tandatangan
  },
  signBox: {},
  signRoleTitle: { fontSize: 12, marginBottom: 50, color: '#000000' }, // lebih ruang untuk tandatangan
  signLine: { borderBottomWidth: 1, borderBottomColor: '#000000', marginBottom: 8 },
  signText: { fontSize: 12, fontWeight: 'bold', color: '#000000', marginBottom: 4 },
  signRole: { fontSize: 12, color: '#000000', marginBottom: 4 },       // sedikit ruang antara role/unit
  signRoleBold: { fontSize: 12, color: '#000000', marginBottom: 4 }
});

interface LaporanPDFProps {
  clubName: string;
  monthYear: string;
  activities: any[];
  /** Nama orang yang disediakan laporan (penjana laporan) */
  submitterName?: string;
  /** Jawatan penjana laporan (contoh: KETUA EXCO KELAB, PERSATUAN DAN PERPADUAN) */
  submitterRole?: string;
  /** Unit/Kelab penjana (contoh: Exco KPP) */
  submitterUnit?: string;
  /** Nama orang yang menandatangani slot 'Disemak oleh' */
  presidenName?: string;
  /** Jawatan untuk slot 'Disemak oleh' (default: PRESIDEN) */
  reviewerRole?: string;
  /** Label tambahan bawah nama 'Disemak' (default: clubName) */
  reviewerUnit?: string;
  clubLogoUrl?: string;
  /** Aktifkan layout khusus Exco JPP (logo sizing, signature penuh JPP+Politeknik) */
  isExco?: boolean;
  /** Nama organisasi JPP (default: JAWATANKUASA PERWAKILAN PELAJAR) */
  jppOrgName?: string;
  /** Nama politeknik (default: POLITEKNIK SULTAN HAJI AHMAD SHAH) */
  polytechnicName?: string;
}

// ─── Exact Helvetica-Bold glyph widths (units per 1000em) ─────────────────────
// Sumber: Adobe/PDF spec Helvetica-Bold character widths
// Ini SAMA dengan yang PDFKit gunakan dalam react-pdf — so lebar yang dikira = lebar yang dirender
const HB: Record<string, number> = {
  ' ': 278, '!': 333, '"': 474, '#': 556, '$': 556, '%': 889, '&': 722, "'": 238,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556,
  '8': 556, '9': 556, ':': 333, ';': 333, '<': 584, '=': 584, '>': 584, '?': 611,
  'A': 722, 'B': 722, 'C': 667, 'D': 778, 'E': 667, 'F': 611, 'G': 778, 'H': 778,
  'I': 278, 'J': 556, 'K': 722, 'L': 611, 'M': 833, 'N': 778, 'O': 778, 'P': 667,
  'Q': 778, 'R': 722, 'S': 667, 'T': 667, 'U': 778, 'V': 722, 'W': 1000, 'X': 722,
  'Y': 722, 'Z': 667,
};
// Helvetica Regular glyph widths (untuk role/unit 10pt)
const HR: Record<string, number> = {
  ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667, "'": 222,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556,
  '8': 556, '9': 556, ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556,
  'A': 667, 'B': 667, 'C': 722, 'D': 722, 'E': 667, 'F': 611, 'G': 778, 'H': 722,
  'I': 278, 'J': 500, 'K': 667, 'L': 556, 'M': 833, 'N': 722, 'O': 778, 'P': 667,
  'Q': 778, 'R': 722, 'S': 667, 'T': 611, 'U': 722, 'V': 667, 'W': 944, 'X': 667,
  'Y': 667, 'Z': 611,
};

/** Kira lebar teks yang TEPAT berdasarkan glyph metrics Helvetica */
const textWidth = (text: string, fontSize: number, bold: boolean): number => {
  const table = bold ? HB : HR;
  const upper = text.toUpperCase(); // PDF renders uppercase
  let units = 0;
  for (const ch of upper) {
    units += table[ch] ?? 556; // fallback to average if char not in table
  }
  return (units / 1000) * fontSize;
};

// ─── Helper: lebar GARISAN — ikut saiz font 12pt Bold yang sebenar dirender ──
const calcLineWidth = (name: string): number =>
  Math.ceil(textWidth(name, 12, true) * 1.1); // 1.1x safety buffer supaya nama tak wrap

// ─── Helper: lebar KOTAK — pastikan semua baris (role/unit 12pt) muat tanpa wrap ──
const calcBoxWidth = (lineWidth: number, ...otherTexts: (string | undefined | null)[]): number => {
  const maxRoleWidth = otherTexts
    .filter(Boolean)
    .map(t => Math.ceil(textWidth(t as string, 12, false) * 1.1))
    .reduce((a, b) => Math.max(a, b), 0);
  // Tiada cap 500 — biar ikut lebar sebenar nama
  return Math.max(lineWidth, maxRoleWidth);
};


// ─── HARDCODED YDP (JPP POLISAS 2026) ────────────────────────────────────────

const YDP_NAME = 'MUHAMAD AMIRUL HAKIMI BIN MOHD ZAWAWI';
const YDP_TITLE = 'YANG DI-PERTUA';
const DEFAULT_JPP = 'JAWATANKUASA PERWAKILAN PELAJAR';
const DEFAULT_POLI = 'POLITEKNIK SULTAN HAJI AHMAD SHAH';

export const LaporanPDFTemplate: React.FC<LaporanPDFProps> = ({
  clubName,
  monthYear,
  activities,
  submitterName,
  submitterRole,
  submitterUnit,
  presidenName = "NAMA PRESIDEN KELAB",
  reviewerRole = "PRESIDEN",
  reviewerUnit,
  clubLogoUrl,
  isExco = false,
  jppOrgName = DEFAULT_JPP,
  polytechnicName = DEFAULT_POLI,
}) => {
  const poliLogo = "/polisas-logo.jpg";

  // Tahun semasa untuk label JPP
  const currentYear = new Date().getFullYear();
  const jppLabel = `${jppOrgName} ${currentYear}`;

  // Pisah monthYear kepada bulan dan tahun (e.g. "APRIL 2026" → ["APRIL", "2026"])
  const parts = monthYear.toUpperCase().trim().split(/\s+/);
  const coverMonth = parts[0] ?? '';
  const coverYear = parts[1] ?? '';

  return (
    <Document>
      {/* ── MUKA DEPAN ── */}
      <Page size="A4" style={isExco ? styles.page : styles.pageClub}>
        {/* Watermark pada cover — logo kelab/JPP samar di belakang tajuk */}
        <View style={styles.watermarkContainer}>
          {clubLogoUrl && <Image src={clubLogoUrl} style={styles.watermarkImage} />}
        </View>

        {/* isExco → JPP landscape hardcoded (142×80 = sama tinggi POLISAS, alignment sempurna)
            Kelab  → clubLogoUrl dengan saiz asal */}
        <View style={styles.headerRow}>
          {/* POLISAS: kiri */}
          <View style={styles.logoLeftWrapper}>
            <Image src={poliLogo} style={styles.logoLeft} />
          </View>
          {/* Kanan: JPP landscape (Exco) atau logo kelab */}
          {isExco ? (
            <View style={styles.logoRightWrapper}>
              <Image src={jppLogoLandscape} style={{ width: 142, height: 80, objectFit: 'contain' }} />
            </View>
          ) : (
            clubLogoUrl && (
              <View style={styles.logoRightWrapper}>
                <Image src={clubLogoUrl} style={styles.logoRight} />
              </View>
            )
          )}
        </View>

        <View style={styles.coverCenter}>
          {/* 3 baris berasingan, semua saiz sama (40pt bold) */}
          <Text style={styles.coverTitleLine}>LAPORAN BULAN</Text>
          <Text style={styles.coverTitleLine}>{coverMonth}</Text>
          <Text style={styles.coverTitleLine}>{coverYear}</Text>
        </View>

        <View style={[
          styles.coverBottom,
          { left: isExco ? 90 : 40, right: isExco ? 90 : 40 }
        ]}>
          {isExco ? (
            <>
              {/* Exco: "EXCO [NAMA UNIT]" + "JAWATANKUASA PERWAKILAN PELAJAR 2026" */}
              <Text style={styles.coverClubName}>EXCO {clubName.toUpperCase()}</Text>
              <Text style={styles.coverInstitution}>{jppLabel.toUpperCase()}</Text>
            </>
          ) : (
            <>
              <Text style={styles.coverClubName}>{clubName.toUpperCase()}</Text>
              <Text style={styles.coverInstitution}>{polytechnicName.toUpperCase()}</Text>
            </>
          )}
        </View>
      </Page>

      {/* ── ISI LAPORAN ── */}
      {activities.map((act, index) => {
        // Logik mendapatkan gambar yang sah, dihadkan kepada 2 gambar sahaja
        const validImages = Array.isArray(act.image_urls)
          ? act.image_urls.filter((url: any) => typeof url === 'string' && url.trim() !== '').slice(0, 2)
          : [];

        return (
          <Page key={index} size="A4" style={isExco ? styles.page : styles.pageClub}>
            <View style={styles.watermarkContainer} fixed>
              {clubLogoUrl && <Image src={clubLogoUrl} style={styles.watermarkImage} />}
            </View>

            <Text style={styles.sectionTitle}>{index + 1}.</Text>

            <View style={styles.table}>
              <View style={styles.tableRow}>
                <View style={[styles.tableColHeader, { width: '22%' }]}><Text style={styles.tableCellHeader}>TARIKH</Text></View>
                <View style={[styles.tableColHeader, { width: '39%' }]}><Text style={styles.tableCellHeader}>AKTIVITI</Text></View>
                <View style={[styles.tableColHeader, { width: '39%' }]}><Text style={styles.tableCellHeader}>TINDAKAN</Text></View>
              </View>
              <View style={styles.tableRow}>
                <View style={[styles.tableCol, { width: '22%' }]}>
                  <Text style={[styles.tableCell, { textAlign: 'center' }]}>
                    {act.start_date ? format(new Date(act.start_date), 'd MMMM yyyy', { locale: ms }) : '-'}
                  </Text>
                </View>
                <View style={[styles.tableCol, { width: '39%' }]}><Text style={styles.tableCell}>{act.title}</Text></View>
                <View style={[styles.tableCol, { width: '39%' }]}><Text style={styles.tableCell}>{act.tindakan || '-'}</Text></View>
              </View>
            </View>

            {/* ── BUKTI ATAU GAMBAR ── */}
            <Text style={styles.lampiranTitle}>BUKTI ATAU GAMBAR</Text>

            {validImages.length > 0 ? (
              <View style={styles.imageContainer}>
                {validImages.map((img: string, i: number) => (
                  <View key={i} style={styles.imageWrapper}>
                    <Image src={img} style={styles.image} />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 10, marginTop: 10, color: '#666' }}>[ Tiada gambar dilampirkan ]</Text>
            )}

            {/* Huraiam / Deskripsi Lampiran */}
            {act.description && (
              <Text style={styles.lampiranDesc}>{act.description}</Text>
            )}

          </Page>
        );
      })}

      {/* ── MUKA SURAT PENGESAHAN ── */}
      <Page size="A4" style={styles.pageSignature}>
        <View style={styles.watermarkContainer} fixed>
          {clubLogoUrl && <Image src={clubLogoUrl} style={styles.watermarkImage} />}
        </View>

        <View style={styles.signatureSection}>

          {/* ── Disediakan oleh ─── */}
          {(() => {
            const primaryName = (submitterName || 'SETIAUSAHA').toUpperCase();
            return (
              <View>
                <Text style={styles.signRoleTitle}>Disediakan oleh:</Text>
                {/* Wrapper shrink ke lebar nama — garisan auto ikut tepat */}
                <View style={{ alignSelf: 'flex-start' }}>
                  <View style={styles.signLine} />
                  <Text style={styles.signText}>{primaryName}</Text>
                </View>
                {submitterName ? (
                  <>
                    {submitterRole && <Text style={styles.signRole}>{submitterRole.toUpperCase()}</Text>}
                    {isExco && <Text style={styles.signRole}>{jppLabel.toUpperCase()}</Text>}
                    {isExco && <Text style={styles.signRole}>{polytechnicName.toUpperCase()}</Text>}
                    {!isExco && submitterUnit && <Text style={styles.signRole}>{submitterUnit.toUpperCase()}</Text>}
                  </>
                ) : (
                  <Text style={styles.signRole}>{clubName.toUpperCase()}</Text>
                )}
              </View>
            );
          })()}

          {/* ── Disemak oleh ─── */}
          {(() => {
            return (
              <View>
                <Text style={styles.signRoleTitle}>Disemak oleh:</Text>
                <View style={{ alignSelf: 'flex-start' }}>
                  <View style={styles.signLine} />
                  <Text style={styles.signText}>{presidenName.toUpperCase()}</Text>
                </View>
                <Text style={styles.signRole}>{reviewerRole.toUpperCase()}</Text>
                {isExco ? (
                  <>
                    <Text style={styles.signRole}>{jppLabel.toUpperCase()}</Text>
                    <Text style={styles.signRole}>{polytechnicName.toUpperCase()}</Text>
                  </>
                ) : (
                  reviewerUnit && <Text style={styles.signRole}>{reviewerUnit.toUpperCase()}</Text>
                )}
              </View>
            );
          })()}

          {/* ── Disahkan oleh ─── */}
          {(() => {
            const ydpDisplayName = isExco ? YDP_NAME : 'YANG DIPERTUA';
            return (
              <View>
                <Text style={styles.signRoleTitle}>Disahkan oleh:</Text>
                <View style={{ alignSelf: 'flex-start' }}>
                  <View style={styles.signLine} />
                  {isExco ? (
                    <Text style={styles.signText}>{YDP_NAME}</Text>
                  ) : (
                    <Text style={styles.signText}>{ydpDisplayName}</Text>
                  )}
                </View>
                {isExco ? (
                  <>
                    <Text style={styles.signRoleBold}>{YDP_TITLE}</Text>
                    <Text style={styles.signRole}>{jppLabel.toUpperCase()}</Text>
                    <Text style={styles.signRole}>{polytechnicName.toUpperCase()}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.signRole}>JAWATANKUASA PERWAKILAN PELAJAR</Text>
                    <Text style={styles.signRole}>POLITEKNIK SULTAN HAJI AHMAD SHAH</Text>
                  </>
                )}
              </View>
            );
          })()}



        </View>
      </Page>
    </Document>
  );
};