import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { getContrastColor, formatDateDMY } from '@/lib/color-utils';
import { TAKWIM_JENIS } from '@/config/takwim-constants';
import type { TakwimItem } from '@/config/takwim-constants';

// ── Column Widths ──
const COL = {
  BIL: '5%',
  JENIS: '12%',
  TAJUK: '28%',
  TARIKH: '18%',
  MINGGU: '7%',
  CATATAN: '30%',
};

// ── Styles ──
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
  watermark: { width: 380, height: 380, opacity: 0.06, objectFit: 'contain' },

  // ── LOGO: POLISAS centered ──
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  logo: { width: 260, height: 100, objectFit: 'contain' },

  // ── TITLE ──
  titleWrap: { textAlign: 'center', marginBottom: 8 },
  titleMain: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#000000', marginBottom: 2 },
  titleSub: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#000000' },

  // ── TABLE ──
  table: { borderWidth: 1, borderColor: '#000', borderStyle: 'solid', marginBottom: 30 },
  row: { flexDirection: 'row' },

  // ── SIGNATURE ──
  footer: { paddingHorizontal: 30 },
  sigBlock: { flexDirection: 'column', alignItems: 'flex-start', width: 260 },
  sigLabel: { fontFamily: 'Helvetica', fontSize: 9, marginBottom: 55 },
  sigLine: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#000', marginBottom: 5 },
  sigRole: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  sigOrg: { fontFamily: 'Helvetica', fontSize: 9 },
});

// ── Props ──
interface TakwimPusatPDFTemplateProps {
  data: TakwimItem[];
  themeColor: string;
  session: string;
  filterLabel: string;
  logoPolisas?: string;
}

// ── Component ──
export default function TakwimPusatPDFTemplate({
  data, themeColor, session, filterLabel,
  logoPolisas,
}: TakwimPusatPDFTemplateProps) {
  const textColor = getContrastColor(themeColor);
  let bilCounter = 0;

  return (
    <Document>
      <Page size="A4" style={s.page} orientation="landscape">

        {/* Watermark — repeats on every page */}
        {logoPolisas && (
          <View fixed style={s.watermarkWrap}>
            <Image src={logoPolisas} style={s.watermark} />
          </View>
        )}

        {/* ── LOGO POLISAS — centered, page 1 only ── */}
        <View style={s.logoWrap}>
          {logoPolisas && <Image src={logoPolisas} style={s.logo} />}
        </View>

        {/* Title — page 1 only (no fixed) */}
        <View style={s.titleWrap}>
          <Text style={s.titleMain}>
            TAKWIM POLISAS BERPUSAT — {filterLabel.toUpperCase()} SESI {session}
          </Text>
          <Text style={s.titleSub}>JAWATANKUASA PERWAKILAN PELAJAR</Text>
          <Text style={s.titleSub}>POLITEKNIK SULTAN HAJI AHMAD SHAH (INSTITUSI B)</Text>
        </View>

        {/* Table */}
        <View style={s.table}>
          {/* Table header — fixed on every page so table stays readable */}
          <View style={[s.row, { backgroundColor: themeColor }]} fixed>
            <HeaderCell w={COL.BIL} label="BIL" color={textColor} />
            <HeaderCell w={COL.JENIS} label="JENIS" color={textColor} />
            <HeaderCell w={COL.TAJUK} label="TAJUK / AKTIVITI" color={textColor} />
            <HeaderCell w={COL.TARIKH} label="TARIKH" color={textColor} />
            <HeaderCell w={COL.MINGGU} label="MINGGU" color={textColor} />
            <HeaderCell w={COL.CATATAN} label="CATATAN" color={textColor} isLast />
          </View>

          {/* Data rows — wrap={false} prevents mid-row page splits */}
          {data.map((item) => {
            const isHoliday = item.type === 'holiday' || item.jenis === 'CUTI_UMUM';

            if (isHoliday) {
              const label = `${formatDateDMY(item.tarikh_mula)}   ${item.tajuk.toUpperCase()}`;
              return (
                <View key={`${item.type}-${item.id}`} style={[s.row, { backgroundColor: themeColor }]} wrap={false}>
                  <View style={{
                    width: '100%', borderBottomWidth: 1, borderBottomColor: '#000',
                    paddingVertical: 5, paddingHorizontal: 8,
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: textColor, textAlign: 'center' }}>
                      {label}
                    </Text>
                  </View>
                </View>
              );
            }

            bilCounter++;
            const jenisLabel = TAKWIM_JENIS[item.jenis]?.shortLabel || item.jenis;
            const tarikh = item.tarikh_tamat && item.tarikh_tamat !== item.tarikh_mula
              ? `${formatDateDMY(item.tarikh_mula)} - ${formatDateDMY(item.tarikh_tamat)}`
              : formatDateDMY(item.tarikh_mula);
            const minggu = item.bil_minggu ? String(item.bil_minggu) : '-';
            const catatan = [item.catatan, item.club_name, item.status && item.status !== 'CONFIRMED' ? `[${item.status}]` : ''].filter(Boolean).join(' · ');

            return (
              <View key={`${item.type}-${item.id}`} style={s.row} wrap={false} minPresenceAhead={20}>
                <DataCell w={COL.BIL} text={`${bilCounter}.`} center bold />
                <DataCell w={COL.JENIS} text={jenisLabel.toUpperCase()} center />
                <DataCell w={COL.TAJUK} text={item.tajuk.toUpperCase()} />
                <DataCell w={COL.TARIKH} text={tarikh} center />
                <DataCell w={COL.MINGGU} text={minggu} center />
                <DataCell w={COL.CATATAN} text={catatan || '-'} isLast />
              </View>
            );
          })}
        </View>

        {/* Signature */}
        <View style={s.footer} wrap={false}>
          <View style={s.sigBlock}>
            <Text style={s.sigLabel}>Disediakan oleh:</Text>
            <View style={s.sigLine} />
            <Text style={s.sigRole}>Exco Akademik & Pembangunan Mahasiswa</Text>
            <Text style={s.sigOrg}>Jawatankuasa Perwakilan Pelajar</Text>
            <Text style={s.sigOrg}>POLISAS</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}

// ── Sub-components ──
function HeaderCell({ w, label, color, isLast }: { w: string; label: string; color: string; isLast?: boolean }) {
  return (
    <View style={{
      width: w, borderRightWidth: isLast ? 0 : 1, borderRightColor: '#000',
      borderBottomWidth: 1, borderBottomColor: '#000',
      paddingVertical: 6, paddingHorizontal: 4,
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function DataCell({ w, text, center, bold, isLast }: { w: string; text: string; center?: boolean; bold?: boolean; isLast?: boolean }) {
  return (
    <View style={{
      width: w, borderRightWidth: isLast ? 0 : 1, borderRightColor: '#000',
      borderBottomWidth: 1, borderBottomColor: '#000',
      paddingVertical: 5, paddingHorizontal: 4, justifyContent: 'center',
    }}>
      <Text style={{ fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica', fontSize: 9, color: '#000', textAlign: center ? 'center' : 'left' }}>{text}</Text>
    </View>
  );
}
