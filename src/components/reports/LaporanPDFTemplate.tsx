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

  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  table: { width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#000', marginBottom: 20 },
  tableRow: { flexDirection: 'row' },
  tableColHeader: { width: '33.33%', borderStyle: 'solid', borderWidth: 1, borderColor: '#000', backgroundColor: '#e2e8f0', padding: 8 },
  tableCol: { width: '33.33%', borderStyle: 'solid', borderWidth: 1, borderColor: '#000', padding: 8 },
  tableCellHeader: { fontSize: 10, fontWeight: 'bold' },
  tableCell: { fontSize: 10, textAlign: 'justify' },

  lampiranTitle: { fontSize: 12, fontWeight: 'bold', marginTop: 10, textDecoration: 'underline' },
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

// ─── Helper: lebar GARISAN (ikut nama sahaja — 11pt Bold Helvetica ≈ 9.2pt/char) ─
const calcLineWidth = (name: string): number =>
  Math.min(400, Math.max(200, Math.round(name.length * 9.2 + 10)));

// ─── Helper: lebar KOTAK (ikut teks TERPANJANG — pastikan semua baris muat) ────
// Role/unit texts adalah 10pt Regular ≈ 7pt/char; nama 11pt Bold ≈ 7.8pt/char
// Ambil yang terbesar supaya tiada teks yang terpaksa wrap
const calcBoxWidth = (lineWidth: number, ...otherTexts: (string | undefined | null)[]): number => {
  const maxRoleWidth = otherTexts
    .filter(Boolean)
    .map(t => Math.round((t as string).length * 7.0 + 10))
    .reduce((a, b) => Math.max(a, b), 0);
  return Math.min(480, Math.max(lineWidth, maxRoleWidth));
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

            <Text style={styles.sectionTitle}>{index + 1}. PERINCIAN AKTIVITI</Text>

            <View style={styles.table}>
              <View style={styles.tableRow}>
                <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>TARIKH</Text></View>
                <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>AKTIVITI</Text></View>
                <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>TINDAKAN</Text></View>
              </View>
              <View style={styles.tableRow}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {act.start_date ? format(new Date(act.start_date), 'd MMMM yyyy', { locale: ms }) : '-'}
                  </Text>
                </View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{act.title}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{act.tindakan || '-'}</Text></View>
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
                <Text style={isExco ? styles.signRoleBold : styles.signText}>{reviewerRole.toUpperCase()}</Text>
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
                    <Text style={styles.signText}>JAWATANKUASA PERWAKILAN PELAJAR</Text>
                    <Text style={styles.signText}>POLITEKNIK SULTAN HAJI AHMAD SHAH</Text>
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