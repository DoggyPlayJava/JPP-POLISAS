import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Image, Font
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';

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
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 11,
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
    width: 350,
    opacity: 0.08,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  // Politeknik logo: kiri, flex mengambil space yang ada
  logoLeftWrapper: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  logoLeft: {
    width: 200,
    height: 110,
    objectFit: 'contain',
  },
  // JPP logo: SQUARE (imej sumber 1280x1280 — 1:1 ratio, buat box square supaya tiada whitespace)
  logoRight: {
    width: 150,
    height: 150,
    objectFit: 'contain',
  },

  coverCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -80,
  },
  reportMonthTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 1.2
  },

  coverBottom: {
    position: 'absolute',
    bottom: 100,
    left: 40,
    right: 40,
    alignItems: 'center'
  },
  coverClubName: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  coverInstitution: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },

  sectionTitle: { fontSize: 12, marginBottom: 10, marginTop: 10 },
  table: { width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#000', marginBottom: 20 },
  tableRow: { flexDirection: 'row' },
  tableColHeader: { borderStyle: 'solid', borderWidth: 1, borderColor: '#000', padding: 4 },
  tableCol: { borderStyle: 'solid', borderWidth: 1, borderColor: '#000', padding: 4 },
  tableCellHeader: { fontSize: 10, textAlign: 'center' },
  tableCell: { fontSize: 10, textAlign: 'left' },

  lampiranTitle: { fontSize: 12, marginTop: 10 },
  imageContainer: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 15,
    marginBottom: 15,
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  imageWrapper: { width: '45%', height: 180 },
  image: { width: '100%', height: '100%', objectFit: 'contain' },
  lampiranDesc: { fontSize: 11, textAlign: 'justify', marginTop: 10 },

  signatureSection: {
    marginTop: 40,
    flexDirection: 'column',
    gap: 40,
  },
  // signBox: lebar dikira secara dinamik oleh calcSignWidth()
  signBox: { },
  signRoleTitle: { fontSize: 11, marginBottom: 35 },
  signLine: { borderBottomWidth: 1, borderBottomColor: '#000', marginBottom: 5 },
  signText: { fontSize: 11, fontWeight: 'bold' },
  signRole: { fontSize: 10 },
  // signRoleBold sudah tidak bold — jawatan (MT/YDP/Exco) papar dalam saiz 10pt biasa
  signRoleBold: { fontSize: 10 }
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
  ' ':278, '!':333, '"':474, '#':556, '$':556, '%':889, '&':722, "'":238,
  '(':333, ')':333, '*':389, '+':584, ',':278, '-':333, '.':278, '/':278,
  '0':556, '1':556, '2':556, '3':556, '4':556, '5':556, '6':556, '7':556,
  '8':556, '9':556, ':':333, ';':333, '<':584, '=':584, '>':584, '?':611,
  'A':722, 'B':722, 'C':667, 'D':778, 'E':667, 'F':611, 'G':778, 'H':778,
  'I':278, 'J':556, 'K':722, 'L':611, 'M':833, 'N':778, 'O':778, 'P':667,
  'Q':778, 'R':722, 'S':667, 'T':667, 'U':778, 'V':722, 'W':1000,'X':722,
  'Y':722, 'Z':667,
};
// Helvetica Regular glyph widths (untuk role/unit 10pt)
const HR: Record<string, number> = {
  ' ':278, '!':278, '"':355, '#':556, '$':556, '%':889, '&':667, "'":222,
  '(':333, ')':333, '*':389, '+':584, ',':278, '-':333, '.':278, '/':278,
  '0':556, '1':556, '2':556, '3':556, '4':556, '5':556, '6':556, '7':556,
  '8':556, '9':556, ':':278, ';':278, '<':584, '=':584, '>':584, '?':556,
  'A':667, 'B':667, 'C':722, 'D':722, 'E':667, 'F':611, 'G':778, 'H':722,
  'I':278, 'J':500, 'K':667, 'L':556, 'M':833, 'N':722, 'O':778, 'P':667,
  'Q':778, 'R':722, 'S':667, 'T':611, 'U':722, 'V':667, 'W':944, 'X':667,
  'Y':667, 'Z':611,
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

// ─── Helper: lebar GARISAN — tepat sama dengan lebar nama dirender (11pt Bold) ──
const calcLineWidth = (name: string): number =>
  Math.ceil(textWidth(name, 11, true));

// ─── Helper: lebar KOTAK — pastikan semua baris (role/unit 10pt) muat tanpa wrap ──
const calcBoxWidth = (lineWidth: number, ...otherTexts: (string | undefined | null)[]): number => {
  const maxRoleWidth = otherTexts
    .filter(Boolean)
    .map(t => Math.ceil(textWidth(t as string, 10, false)))
    .reduce((a, b) => Math.max(a, b), 0);
  return Math.min(500, Math.max(lineWidth, maxRoleWidth));
};


// ─── HARDCODED YDP (JPP POLISAS 2026) ────────────────────────────────────────

const YDP_NAME      = 'MUHAMMAD AMIRUL HAKIMI BIN MOHD ZAWAWI';
const YDP_TITLE     = 'YANG DI-PERTUA';
const DEFAULT_JPP   = 'JAWATANKUASA PERWAKILAN PELAJAR';
const DEFAULT_POLI  = 'POLITEKNIK SULTAN HAJI AHMAD SHAH';

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
  const poliLogo = "https://ujklcxfbmmzxsqtidjtz.supabase.co/storage/v1/object/public/reports/LOGO%20POLISAS.jpeg";

  // Tahun semasa untuk label JPP
  const currentYear = new Date().getFullYear();
  const jppLabel    = `${jppOrgName} ${currentYear}`;

  return (
    <Document>
      {/* ── MUKA DEPAN ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {/* Politeknik: ambil semua space kiri supaya JPP berada di hujung kanan */}
          <View style={styles.logoLeftWrapper}>
            <Image src={poliLogo} style={styles.logoLeft} />
          </View>
          {clubLogoUrl && <Image src={clubLogoUrl} style={styles.logoRight} />}
        </View>

        <View style={styles.coverCenter}>
          <Text style={styles.reportMonthTitle}>
            LAPORAN BULANAN{'\n'}
            {monthYear.toUpperCase()}
          </Text>
        </View>

        <View style={styles.coverBottom}>
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
        // Logik mendapatkan gambar yang sah dari kod lama
        const validImages = Array.isArray(act.image_urls)
          ? act.image_urls.filter((url: any) => typeof url === 'string' && url.trim() !== '')
          : [];

        return (
          <Page key={index} size="A4" style={styles.page}>
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

            {/* ── LAMPIRAN ── */}
            <Text style={styles.lampiranTitle}>LAMPIRAN</Text>

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
      <Page size="A4" style={styles.page}>
        <View style={styles.watermarkContainer} fixed>
          {clubLogoUrl && <Image src={clubLogoUrl} style={styles.watermarkImage} />}
        </View>

        <View style={styles.signatureSection}>

          {/* ── Disediakan oleh ─── */}
          {(() => {
            // line ikut nama; box ikut teks terpanjang (supaya role/unit tak wrap)
            const primaryName = submitterName || 'SETIAUSAHA';
            const lineW = calcLineWidth(primaryName);
            const roleTexts = submitterName
              ? [submitterRole, isExco ? jppLabel : submitterUnit, isExco ? polytechnicName : undefined]
              : [clubName];
            const boxW = calcBoxWidth(lineW, ...roleTexts);
            return (
              <View style={[styles.signBox, { width: boxW }]}>
                <Text style={styles.signRoleTitle}>Disediakan oleh:</Text>
                <View style={[styles.signLine, { width: lineW }]} />
                {submitterName ? (
                  <>
                    <Text style={styles.signText}>{submitterName.toUpperCase()}</Text>
                    {submitterRole && <Text style={styles.signRole}>{submitterRole.toUpperCase()}</Text>}
                    {isExco && <Text style={styles.signRole}>{jppLabel.toUpperCase()}</Text>}
                    {isExco && <Text style={styles.signRole}>{polytechnicName.toUpperCase()}</Text>}
                    {!isExco && submitterUnit && <Text style={styles.signRole}>{submitterUnit.toUpperCase()}</Text>}
                  </>
                ) : (
                  <>
                    <Text style={styles.signText}>SETIAUSAHA</Text>
                    <Text style={styles.signRole}>{clubName.toUpperCase()}</Text>
                  </>
                )}
              </View>
            );
          })()}

          {/* ── Disemak oleh ─── */}
          {(() => {
            const lineW = calcLineWidth(presidenName);
            const roleTexts = isExco
              ? [reviewerRole, jppLabel, polytechnicName]
              : [reviewerRole, reviewerUnit];
            const boxW = calcBoxWidth(lineW, ...roleTexts);
            return (
              <View style={[styles.signBox, { width: boxW }]}>
                <Text style={styles.signRoleTitle}>Disemak oleh:</Text>
                <View style={[styles.signLine, { width: lineW }]} />
                <Text style={styles.signText}>{presidenName.toUpperCase()}</Text>
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
            const lineW = calcLineWidth(ydpDisplayName);
            const roleTexts = isExco
              ? [YDP_TITLE, jppLabel, polytechnicName]
              : ['JAWATANKUASA PERWAKILAN PELAJAR', 'POLITEKNIK SULTAN HAJI AHMAD SHAH'];
            const boxW = calcBoxWidth(lineW, ...roleTexts);
            return (
              <View style={[styles.signBox, { width: boxW }]}>
                <Text style={styles.signRoleTitle}>Disahkan oleh:</Text>
                <View style={[styles.signLine, { width: lineW }]} />
                {isExco ? (
                  <>
                    <Text style={styles.signText}>{YDP_NAME}</Text>
                    <Text style={styles.signRoleBold}>{YDP_TITLE}</Text>
                    <Text style={styles.signRole}>{jppLabel.toUpperCase()}</Text>
                    <Text style={styles.signRole}>{polytechnicName.toUpperCase()}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.signText}>YANG DIPERTUA</Text>
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