import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { ALL_CLUBS } from '@/types';
import { getContrastColor, formatDateDMY, formatDateRange } from '@/lib/color-utils';

// ══════════════════════════════════════════════════════════════
// COLUMN WIDTHS
// ══════════════════════════════════════════════════════════════
const COL = {
  BIL: '5%',
  PROGRAM: '22%',
  TARIKH_C: '13%',
  TARIKH_P: '13%',
  PENGARAH: '25%',
  KELAB: '12%',
  KOS: '10%',
};

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 25,
    fontFamily: 'Helvetica',
    fontSize: 9,
    position: 'relative',
  },
  watermarkWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  watermark: {
    width: 380,
    height: 380,
    opacity: 0.06,
    objectFit: 'contain',
  },
  // ── HEADER: 3 logos in a row ──
  // POLISAS(70) = JPP(70) → sejajar | KPT(80) tinggi sedikit (ada teks bawah lambang)
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  // Kiri: POLISAS — rapat ke kanan (ke arah KPT)
  logoColLeft: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 40,
  },
  // Tengah: KPT
  logoColCenter: {
    alignItems: 'center',
  },
  // Kanan: JPP — rapat ke KIRI (bermula terus selepas KPT, bukan ke hujung kanan)
  logoColRight: {
    flex: 1,
    alignItems: 'flex-start',  // ← flex-start = logo bermula dari tepi KPT, bukan tepi kanan
    paddingLeft: 8,
  },
  // POLISAS — tinggi 70
  logoLeft: {
    width: 145,
    height: 70,
    objectFit: 'contain',
  },
  // KPT — tinggi 80 (lambang + teks "JABATAN..." di bawah)
  logoCenter: {
    width: 190,
    height: 100,
    objectFit: 'contain',
  },
  // JPP — lebar kerana logo "JPP | teks" horizontal, SAMA tinggi dengan POLISAS
  logoRight: {
    width: 230,
    height: 130,
    objectFit: 'contain',
    marginTop: 20,   // ← turunkan JPP logo sikit
  },
  // ── TITLE ──
  titleWrap: {
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  titleMain: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#000000',          // BLACK as per user request
    marginBottom: 2,
  },
  titleSub: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#000000',          // BLACK
  },
  // ── TABLE ──
  table: {
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
    marginBottom: 30,
  },
  row: {
    flexDirection: 'row',
  },
  // ── FOOTER — single block only ──
  footer: {
    paddingHorizontal: 30,
  },
  sigBlock: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: 260,
  },
  sigLabel: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    marginBottom: 55,
  },
  sigLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom: 5,
  },
  sigRole: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  sigOrg: {
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
});

// ══════════════════════════════════════════════════════════════
// PROPS
// ══════════════════════════════════════════════════════════════
interface TakwimJPPPDFTemplateProps {
  data: any[];
  themeColor: string;
  session: string;        // e.g. "2025/2026"
  logoPolisas?: string;   // base64 data URL
  logoKpt?: string;       // base64 data URL
  logoJpp?: string;       // base64 data URL
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════
export default function TakwimJPPPDFTemplate({
  data, themeColor, session,
  logoPolisas, logoKpt, logoJpp,
}: TakwimJPPPDFTemplateProps) {
  const textColor = getContrastColor(themeColor);
  let bilCounter = 0;

  return (
    <Document>
      <Page size="A4" style={s.page} orientation="landscape">

        {/* ── WATERMARK ── */}
        {logoJpp && (
          <View fixed style={s.watermarkWrap}>
            <Image src={logoJpp} style={s.watermark} />
          </View>
        )}

        {/* ── LOGOS — 3 equal columns, each centered ── */}
        <View style={s.logoRow}>
          {/* Left col: POLISAS — aligned RIGHT toward center */}
          <View style={s.logoColLeft}>
            {logoPolisas
              ? <Image src={logoPolisas} style={s.logoLeft} />
              : <Text style={{ fontSize: 7, color: '#999' }}>POLISAS</Text>}
          </View>

          {/* Center col: KPT */}
          <View style={s.logoColCenter}>
            {logoKpt
              ? <Image src={logoKpt} style={s.logoCenter} />
              : <Text style={{ fontSize: 7, color: '#999' }}>KPT</Text>}
          </View>

          {/* Right col: JPP — aligned LEFT toward center */}
          <View style={s.logoColRight}>
            {logoJpp
              ? <Image src={logoJpp} style={s.logoRight} />
              : <Text style={{ fontSize: 7, color: '#999' }}>JPP</Text>}
          </View>
        </View>

        {/* ── TITLE — BLACK ── */}
        <View style={s.titleWrap}>
          <Text style={s.titleMain}>
            TAKWIM PROGRAM KELAB SESI {session}
          </Text>
          <Text style={s.titleSub}>JAWATANKUASA PERWAKILAN PELAJAR</Text>
          <Text style={s.titleSub}>POLITEKNIK SULTAN HAJI AHMAD SHAH</Text>
        </View>

        {/* ── TABLE ── */}
        <View style={s.table}>

          {/* HEADER ROW */}
          <View style={[s.row, { backgroundColor: themeColor }]} fixed>
            <HeaderCell w={COL.BIL} label="BIL" color={textColor} />
            <HeaderCell w={COL.PROGRAM} label="PROGRAM" color={textColor} />
            <HeaderCell w={COL.TARIKH_C} label={'TARIKH\nCADANGAN'} color={textColor} />
            <HeaderCell w={COL.TARIKH_P} label={'TARIKH\nPELAKSANAAN'} color={textColor} />
            <HeaderCell w={COL.PENGARAH} label="PENGARAH PROGRAM" color={textColor} />
            <HeaderCell w={COL.KELAB} label="KELAB" color={textColor} />
            <HeaderCell w={COL.KOS} label={'KOS\n(RM)'} color={textColor} isLast />
          </View>

          {/* DATA ROWS */}
          {data.map((item) => {
            const isHoliday = item.type === 'holiday';

            if (isHoliday) {
              const label = `${formatDateDMY(item.tarikh_mula)}   ${(item.nama_cuti || item.nama_program || '').toUpperCase()}`;
              return (
                <View key={item.id} style={[s.row, { backgroundColor: themeColor }]}>
                  <View style={{
                    width: '100%',
                    borderBottomWidth: 1,
                    borderBottomColor: '#000',
                    paddingVertical: 5,
                    paddingHorizontal: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 9,
                      color: textColor,
                      textAlign: 'center',
                    }}>
                      {label}
                    </Text>
                  </View>
                </View>
              );
            }

            bilCounter++;
            const clubShort = ALL_CLUBS.find(c => c.id === item.club_id)?.shortName || '-';
            const kos = item.budget ? Math.round(Number(item.budget)).toString() : '-';
            const tarikhC = formatDateRange(item.tarikh_mula, item.tarikh_tamat);
            const tarikhP = formatDateDMY(item.tarikh_mula);

            return (
              <View key={item.id} style={s.row}>
                <DataCell w={COL.BIL} text={`${bilCounter}.`} center bold />
                <DataCell w={COL.PROGRAM} text={(item.nama_program || '').toUpperCase()} />
                <DataCell w={COL.TARIKH_C} text={tarikhC} center />
                <DataCell w={COL.TARIKH_P} text={tarikhP} center />
                <DataCell w={COL.PENGARAH} text={(item.pengarah_program || 'TBA').toUpperCase()} />
                <DataCell w={COL.KELAB} text={clubShort.toUpperCase()} center />
                <DataCell w={COL.KOS} text={kos} center isLast />
              </View>
            );
          })}
        </View>

        {/* ── SIGNATURE — single block only ── */}
        <View style={s.footer} wrap={false}>
          <View style={s.sigBlock}>
            <Text style={s.sigLabel}>Disediakan oleh:</Text>
            <View style={s.sigLine} />
            <Text style={s.sigRole}>Exco Kelab, Persatuan dan Perpaduan</Text>
            <Text style={s.sigOrg}>Jawatankuasa Perwakilan Pelajar</Text>
            <Text style={s.sigOrg}>POLISAS</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}

// ── Sub-components ──
function HeaderCell({ w, label, color, isLast }: {
  w: string; label: string; color: string; isLast?: boolean;
}) {
  return (
    <View style={{
      width: w,
      borderRightWidth: isLast ? 0 : 1,
      borderRightColor: '#000',
      borderBottomWidth: 1,
      borderBottomColor: '#000',
      paddingVertical: 6,
      paddingHorizontal: 4,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Text style={{
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        color,
        textAlign: 'center',
      }}>
        {label}
      </Text>
    </View>
  );
}

function DataCell({ w, text, center, bold, isLast }: {
  w: string; text: string; center?: boolean; bold?: boolean; isLast?: boolean;
}) {
  return (
    <View style={{
      width: w,
      borderRightWidth: isLast ? 0 : 1,
      borderRightColor: '#000',
      borderBottomWidth: 1,
      borderBottomColor: '#000',
      paddingVertical: 5,
      paddingHorizontal: 4,
      justifyContent: 'center',
    }}>
      <Text style={{
        fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica',
        fontSize: 9,
        color: '#000',
        textAlign: center ? 'center' : 'left',
      }}>
        {text}
      </Text>
    </View>
  );
}
