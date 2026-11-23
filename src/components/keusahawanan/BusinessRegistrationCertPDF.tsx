import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Circle,
  Path,
  Line,
  Rect,
  Font,
} from '@react-pdf/renderer';
import {
  type BusinessCertificateData,
  deriveEntityStructure,
  formatMalayDate,
  formatMalayDateTime,
  getRegistrationAuthorityMeta,
} from '@/lib/businessCertificate';

// Disable automatic hyphenation so formal Malay words never split mid-syllable.
Font.registerHyphenationCallback((word) => [word]);

export type PdfImageSource = string | Buffer | null | undefined;

export interface BusinessRegistrationCertPDFProps {
  data: BusinessCertificateData;
  qrDataUrl?: string | null;
  polisasLogoSrc?: PdfImageSource;
  jppLandscapeLogoSrc?: PdfImageSource;
  jppCrestSrc?: PdfImageSource;
  businessLogoSrc?: PdfImageSource;
}

const s = StyleSheet.create({
  // ── Page 1: Statutory Perakuan Pendaftaran (Borang P-D) ─────────────────────
  page1: {
    padding: 18,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    color: '#0F172A',
  },
  borderOuter: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#831010',
    padding: 2.5,
    backgroundColor: '#FFFFFF',
  },
  borderInner: {
    flex: 1,
    borderWidth: 0.75,
    borderColor: '#B8860B',
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
    position: 'relative',
  },

  // Corner ornaments
  cornerTL: { position: 'absolute', top: 5, left: 5, width: 16, height: 16 },
  cornerTR: { position: 'absolute', top: 5, right: 5, width: 16, height: 16 },
  cornerBL: { position: 'absolute', bottom: 5, left: 5, width: 16, height: 16 },
  cornerBR: { position: 'absolute', bottom: 5, right: 5, width: 16, height: 16 },

  // Crest watermark
  watermarkWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkImg: {
    width: 230,
    height: 230,
    objectFit: 'contain',
    opacity: 0.032,
  },

  // Draft / Inactive overlay
  draftOverlayWrap: {
    position: 'absolute',
    top: '57%',
    left: 32,
    right: 32,
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'rotate(-10deg)',
  },
  draftStampBox: {
    borderWidth: 2.5,
    borderColor: '#B91C1C',
    backgroundColor: 'transparent',
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 4,
    opacity: 0.42,
  },
  draftStampText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: '#991B1B',
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // Masthead
  mastheadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  mastheadLeft: {
    width: 102,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  mastheadLogoLeft: {
    width: 98,
    height: 42,
    objectFit: 'contain',
  },
  mastheadCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  instTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.2,
    color: '#0F172A',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  puskepTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.8,
    color: '#831010',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginTop: 1.5,
  },
  jppSubTitle: {
    fontFamily: 'Helvetica',
    fontSize: 6.8,
    color: '#334155',
    textAlign: 'center',
    marginTop: 1.5,
  },
  addressSubTitle: {
    fontFamily: 'Helvetica',
    fontSize: 6.3,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },
  mastheadRight: {
    width: 96,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  mastheadLogoRight: {
    width: 90,
    height: 40,
    objectFit: 'contain',
  },
  ruleHeavy: {
    height: 1.5,
    backgroundColor: '#831010',
    width: '100%',
  },
  ruleGold: {
    height: 0.6,
    backgroundColor: '#B8860B',
    width: '100%',
    marginTop: 1.5,
    marginBottom: 6,
  },

  // Form bar
  formBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formCodeText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.8,
    color: '#475569',
    letterSpacing: 0.4,
  },
  docRefText: {
    fontFamily: 'Courier-Bold',
    fontSize: 7.2,
    color: '#0F172A',
  },

  // Title block
  titleWrap: {
    alignItems: 'center',
    marginBottom: 7,
  },
  certTitleMalay: {
    fontFamily: 'Times-Bold',
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: 0.9,
    textAlign: 'center',
  },
  certTitleEnglish: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.2,
    color: '#64748B',
    letterSpacing: 1.0,
    textAlign: 'center',
    marginTop: 2,
  },
  goldAccentBar: {
    width: 84,
    height: 1.5,
    backgroundColor: '#B8860B',
    marginTop: 5,
  },

  // Proclamation & Hero Box
  proclamationLead: {
    fontFamily: 'Times-Italic',
    fontSize: 9,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 5,
  },
  bizHeroIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  bizLogoThumb: {
    width: 26,
    height: 26,
    borderRadius: 4,
    objectFit: 'contain',
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
  },
  bizNameHero: {
    fontFamily: 'Times-Bold',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  regBox: {
    backgroundColor: '#FDFBF7',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginVertical: 6,
    borderRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  regBoxLeft: {
    flexDirection: 'column',
    flex: 1,
    paddingRight: 10,
  },
  regLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.3,
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  regCodeValue: {
    fontFamily: 'Courier-Bold',
    fontSize: 13.5,
    color: '#0F172A',
    letterSpacing: 0.7,
  },
  regPrevText: {
    fontFamily: 'Helvetica',
    fontSize: 6.6,
    color: '#475569',
    marginTop: 2,
  },
  regBadgePill: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 2,
  },
  regBadgeText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  statutoryClause: {
    fontFamily: 'Times-Roman',
    fontSize: 8.2,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 1.38,
    paddingHorizontal: 6,
    marginBottom: 9,
  },

  // Particulars Table
  ledgerTable: {
    borderWidth: 0.75,
    borderColor: '#CBD5E1',
    marginBottom: 8,
  },
  ledgerRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#CBD5E1',
    alignItems: 'stretch',
  },
  ledgerRowLast: {
    borderBottomWidth: 0,
  },
  ledgerLabelCell: {
    width: '34%',
    backgroundColor: '#F8FAFC',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRightWidth: 0.5,
    borderRightColor: '#CBD5E1',
    justifyContent: 'center',
  },
  ledgerLabelText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.1,
    color: '#334155',
    letterSpacing: 0.3,
  },
  ledgerValCell: {
    width: '66%',
    paddingVertical: 5,
    paddingHorizontal: 9,
    justifyContent: 'center',
  },
  ledgerValText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.8,
    color: '#0F172A',
    lineHeight: 1.3,
  },
  ledgerValRegular: {
    fontFamily: 'Helvetica',
    fontSize: 7.6,
    color: '#1E293B',
    lineHeight: 1.3,
  },
  statusPillInline: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    borderWidth: 0.5,
  },
  statusPillText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    letterSpacing: 0.4,
  },

  // Footer authentication 3-col
  authFooter: {
    marginTop: 'auto',
    paddingTop: 8,
    borderTopWidth: 0.75,
    borderTopColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  authLeft: {
    width: '36%',
    paddingRight: 6,
  },
  authMetaRow: {
    marginBottom: 3,
  },
  authMetaLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 5.8,
    color: '#64748B',
    letterSpacing: 0.4,
  },
  authMetaValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.7,
    color: '#0F172A',
    marginTop: 0.5,
  },
  authDigestValue: {
    fontFamily: 'Courier-Bold',
    fontSize: 6.8,
    color: '#831010',
    marginTop: 0.5,
  },
  authCenter: {
    width: '38%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },
  sealWrap: {
    marginBottom: 4,
  },
  sigRule: {
    width: 122,
    borderBottomWidth: 0.75,
    borderBottomColor: '#0F172A',
    marginBottom: 3,
  },
  sigTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.8,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  sigOrg: {
    fontFamily: 'Helvetica',
    fontSize: 6.1,
    color: '#475569',
    textAlign: 'center',
    marginTop: 1,
  },
  sigInst: {
    fontFamily: 'Helvetica',
    fontSize: 5.8,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 0.5,
  },
  authRight: {
    width: '26%',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  qrBox: {
    padding: 3,
    borderWidth: 0.75,
    borderColor: '#CBD5E1',
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  qrImage: {
    width: 56,
    height: 56,
  },
  qrPlaceholder: {
    width: 56,
    height: 56,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCaption: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 5.6,
    color: '#0F172A',
    textAlign: 'right',
    marginTop: 2.5,
  },
  qrSubCaption: {
    fontFamily: 'Helvetica',
    fontSize: 5.2,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 0.5,
  },

  // Bottom statutory disclaimer
  disclaimerBar: {
    marginTop: 7,
    paddingTop: 5,
    paddingHorizontal: 4,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  disclaimerText: {
    fontFamily: 'Helvetica',
    fontSize: 5.6,
    color: '#64748B',
    width: '84%',
    lineHeight: 1.32,
  },
  pageNumBadge: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    color: '#475569',
    width: '14%',
    textAlign: 'right',
  },

  // ── Page 2+: Maklumat Perniagaan, Pemilik & Mentor ──────────────────────────
  page2: {
    paddingTop: 24,
    paddingBottom: 42,
    paddingHorizontal: 28,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    color: '#0F172A',
  },
  p2HeaderFixed: {
    borderTopWidth: 2,
    borderTopColor: '#831010',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingTop: 8,
    paddingBottom: 8,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  p2HeaderLogo: {
    width: 70,
    height: 30,
    objectFit: 'contain',
  },
  p2HeaderCenter: {
    flex: 1,
    paddingHorizontal: 10,
  },
  p2HeaderTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    color: '#0F172A',
    letterSpacing: 0.4,
  },
  p2HeaderSub: {
    fontFamily: 'Helvetica',
    fontSize: 7.2,
    color: '#475569',
    marginTop: 1.5,
  },
  p2HeaderRefBox: {
    alignItems: 'flex-end',
  },
  p2HeaderRefLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  p2HeaderRefVal: {
    fontFamily: 'Courier-Bold',
    fontSize: 7.5,
    color: '#831010',
    marginTop: 1,
  },

  sectionBanner: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#831010',
    borderTopWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderTopColor: '#CBD5E1',
    borderRightColor: '#CBD5E1',
    borderBottomColor: '#CBD5E1',
    paddingVertical: 5,
    paddingHorizontal: 9,
    marginBottom: 7,
    marginTop: 4,
  },
  sectionBannerTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.2,
    color: '#0F172A',
    letterSpacing: 0.5,
  },

  kvBox: {
    borderWidth: 0.6,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  kvRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  kvLabelCell: {
    width: '32%',
    backgroundColor: '#F8FAFC',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRightWidth: 0.5,
    borderRightColor: '#E2E8F0',
    justifyContent: 'center',
  },
  kvLabelText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.2,
    color: '#334155',
  },
  kvValCell: {
    width: '68%',
    paddingVertical: 5,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  kvValText: {
    fontFamily: 'Helvetica',
    fontSize: 7.8,
    color: '#0F172A',
    lineHeight: 1.35,
  },
  kvValBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.8,
    color: '#0F172A',
    lineHeight: 1.35,
  },

  // Data tables
  dataTable: {
    borderWidth: 0.6,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  dtHeadRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingVertical: 5.5,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  dtHeadText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.8,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  dtRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  dtRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  dtCellText: {
    fontFamily: 'Helvetica',
    fontSize: 7.4,
    color: '#1E293B',
    paddingRight: 4,
  },
  dtCellBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.4,
    color: '#0F172A',
    paddingRight: 4,
  },
  dtCellMono: {
    fontFamily: 'Courier-Bold',
    fontSize: 7.2,
    color: '#0F172A',
    paddingRight: 4,
  },

  // Verification panel
  verifyPanel: {
    borderWidth: 0.75,
    borderColor: '#B8860B',
    backgroundColor: '#FDFBF7',
    borderRadius: 3,
    padding: 10,
    marginTop: 2,
  },
  verifyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  verifyItem: {
    width: '48%',
  },
  verifyItemFull: {
    width: '100%',
  },
  verifyLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.3,
    color: '#64748B',
    letterSpacing: 0.4,
    marginBottom: 1.5,
  },
  verifyValueMono: {
    fontFamily: 'Courier-Bold',
    fontSize: 7.3,
    color: '#0F172A',
  },
  verifyNote: {
    fontFamily: 'Helvetica',
    fontSize: 6.8,
    color: '#475569',
    lineHeight: 1.38,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 5,
  },

  // Fixed footer for Page 2+
  p2FooterFixed: {
    position: 'absolute',
    bottom: 18,
    left: 28,
    right: 28,
    borderTopWidth: 0.75,
    borderTopColor: '#CBD5E1',
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  p2FooterLeft: {
    fontFamily: 'Helvetica',
    fontSize: 6.3,
    color: '#64748B',
  },
  p2FooterRight: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: '#334155',
  },
});

function CornerBracket({ flipX = false, flipY = false }: { flipX?: boolean; flipY?: boolean }) {
  const x1 = flipX ? 16 : 0;
  const x2 = flipX ? 0 : 16;
  const y1 = flipY ? 16 : 0;
  const y2 = flipY ? 0 : 16;
  const insetX = flipX ? 12 : 4;
  const insetY = flipY ? 12 : 4;

  return (
    <Svg viewBox="0 0 16 16" style={{ width: 16, height: 16 }}>
      <Line x1={x1} y1={y1} x2={x2} y2={y1} stroke="#831010" strokeWidth="1.6" />
      <Line x1={x1} y1={y1} x2={x1} y2={y2} stroke="#831010" strokeWidth="1.6" />
      <Line x1={insetX} y1={insetY} x2={x2} y2={insetY} stroke="#B8860B" strokeWidth="0.9" />
      <Line x1={insetX} y1={insetY} x2={insetX} y2={y2} stroke="#B8860B" strokeWidth="0.9" />
      <Rect
        x={flipX ? 11.5 : 2.5}
        y={flipY ? 11.5 : 2.5}
        width="2"
        height="2"
        fill="#B8860B"
      />
    </Svg>
  );
}

function InstitutionalSealSvg() {
  return (
    <Svg viewBox="0 0 100 100" style={{ width: 46, height: 46 }}>
      <Circle cx="50" cy="50" r="46" stroke="#831010" strokeWidth="2.8" fill="#FDFBF7" />
      <Circle
        cx="50"
        cy="50"
        r="39"
        stroke="#B8860B"
        strokeWidth="1.6"
        strokeDasharray="3,2"
        fill="none"
      />
      <Circle cx="50" cy="50" r="29" stroke="#831010" strokeWidth="1.2" fill="#FFFFFF" />
      {/* Top & bottom compass markers */}
      <Circle cx="50" cy="14" r="2.2" fill="#831010" />
      <Circle cx="50" cy="86" r="2.2" fill="#831010" />
      <Circle cx="14" cy="50" r="2.2" fill="#B8860B" />
      <Circle cx="86" cy="50" r="2.2" fill="#B8860B" />
      {/* Center official shield */}
      <Path
        d="M50 28 L66 34 V49 C66 60 58.5 68 50 72 C41.5 68 34 60 34 49 V34 Z"
        fill="#831010"
        stroke="#B8860B"
        strokeWidth="1.6"
      />
      {/* Verified checkmark inside shield */}
      <Path
        d="M42.5 50.5 L47.8 55.8 L58.5 43.5"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function getHeroNameFontSize(name: string): number {
  const len = name.trim().length;
  if (len <= 30) return 16;
  if (len <= 48) return 13.5;
  return 11.5;
}

function getStatusDisplay(status: string, isActive: boolean) {
  if (status === 'ACTIVE' && isActive) {
    return {
      label: 'AKTIF & DISAHKAN',
      bg: '#DCFCE7',
      border: '#16A34A',
      text: '#166534',
      draftWatermark: null,
    };
  }
  if (status === 'PENDING_INTERVIEW') {
    return {
      label: 'MENUNGGU TEMUDUGA / KELULUSAN',
      bg: '#FEF3C7',
      border: '#D97706',
      text: '#92400E',
      draftWatermark: 'DRAF SEMAKAN — BELUM DILULUSKAN',
    };
  }
  return {
    label: 'TIDAK AKTIF / DITOLAK',
    bg: '#FEE2E2',
    border: '#DC2626',
    text: '#991B1B',
    draftWatermark: 'TIDAK AKTIF — BUKAN SIJIL SAHIH',
  };
}

export const BusinessRegistrationCertPDF: React.FC<BusinessRegistrationCertPDFProps> = ({
  data,
  qrDataUrl,
  polisasLogoSrc,
  jppLandscapeLogoSrc,
  jppCrestSrc,
  businessLogoSrc,
}) => {
  const meta = getRegistrationAuthorityMeta(data.registrationType);
  const entity = deriveEntityStructure(data.members.length);
  const statusInfo = getStatusDisplay(data.status, data.isActive);
  const latestHistory =
    data.registrationHistory.length > 0
      ? data.registrationHistory[data.registrationHistory.length - 1]
      : null;

  const regCodeDisplay = data.hasRegistrationNumber
    ? data.registrationNumber
    : 'BELUM DINYATAKAN';

  return (
    <Document
      title={`Perakuan Pendaftaran Perniagaan - ${data.businessName}`}
      author="Jawatankuasa Perwakilan Pelajar (JPP) POLISAS"
      subject={`Sijil Pendaftaran ${data.registrationType} - ${regCodeDisplay}`}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          PAGE 1: BORANG P-D — PERAKUAN PENDAFTARAN PERNIAGAAN (GAYA RASMI SSM)
          ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" orientation="portrait" style={s.page1}>
        <View style={s.borderOuter}>
          <View style={s.borderInner}>
            {/* Corner ornaments */}
            <View style={s.cornerTL}>
              <CornerBracket />
            </View>
            <View style={s.cornerTR}>
              <CornerBracket flipX />
            </View>
            <View style={s.cornerBL}>
              <CornerBracket flipY />
            </View>
            <View style={s.cornerBR}>
              <CornerBracket flipX flipY />
            </View>

            {/* Centered Crest Watermark */}
            {jppCrestSrc ? (
              <View style={s.watermarkWrap}>
                <Image src={jppCrestSrc as any} style={s.watermarkImg} />
              </View>
            ) : null}

            {/* Official Masthead */}
            <View style={s.mastheadRow}>
              <View style={s.mastheadLeft}>
                {polisasLogoSrc ? (
                  <Image src={polisasLogoSrc as any} style={s.mastheadLogoLeft} />
                ) : null}
              </View>
              <View style={s.mastheadCenter}>
                <Text style={s.instTitle}>POLITEKNIK SULTAN HAJI AHMAD SHAH</Text>
                <Text style={s.puskepTitle}>PUSAT KEUSAHAWANAN POLITEKNIK (PUSKEP)</Text>
                <Text style={s.jppSubTitle}>JAWATANKUASA PERWAKILAN PELAJAR (JPP-POLISAS)</Text>
                <Text style={s.addressSubTitle}>Semambu, 25350 Kuantan, Pahang Darul Makmur</Text>
              </View>
              <View style={s.mastheadRight}>
                {jppLandscapeLogoSrc ? (
                  <Image src={jppLandscapeLogoSrc as any} style={s.mastheadLogoRight} />
                ) : null}
              </View>
            </View>

            <View style={s.ruleHeavy} />
            <View style={s.ruleGold} />

            {/* Form Identifier & Document Reference Bar */}
            <View style={s.formBar}>
              <Text style={s.formCodeText}>{meta.formCode}</Text>
              <Text style={s.docRefText}>NO. RUJUKAN: {data.documentRef}</Text>
            </View>

            {/* Statutory Certificate Title */}
            <View style={s.titleWrap}>
              <Text style={s.certTitleMalay}>PERAKUAN PENDAFTARAN PERNIAGAAN</Text>
              <Text style={s.certTitleEnglish}>CERTIFICATE OF BUSINESS REGISTRATION</Text>
              <View style={s.goldAccentBar} />
            </View>

            {/* Statutory Proclamation & Hero Business Name */}
            <Text style={s.proclamationLead}>
              Dengan ini diperakui bahawa perniagaan yang dijalankan di bawah nama
            </Text>

            <View style={s.bizHeroIdentity}>
              {businessLogoSrc ? (
                <Image src={businessLogoSrc as any} style={s.bizLogoThumb} />
              ) : null}
              <Text
                style={[
                  s.bizNameHero,
                  { fontSize: getHeroNameFontSize(data.businessName) },
                ]}
              >
                {data.businessName.toUpperCase()}
              </Text>
            </View>

            {/* Registration Number Highlight Banner */}
            <View style={[s.regBox, { borderColor: meta.accentColor }]}>
              <View style={s.regBoxLeft}>
                <Text style={s.regLabel}>NO. KOD PENDAFTARAN / REGISTRATION NO.</Text>
                <Text style={s.regCodeValue}>{regCodeDisplay}</Text>
                {latestHistory ? (
                  <Text style={s.regPrevText}>
                    No. Terdahulu: {latestHistory.type} ({latestHistory.number})
                  </Text>
                ) : null}
              </View>
              <View style={[s.regBadgePill, { backgroundColor: meta.accentColor }]}>
                <Text style={s.regBadgeText}>{meta.badgeLabel}</Text>
              </View>
            </View>

            {/* Statutory Clause */}
            <Text style={s.statutoryClause}>{meta.statutoryClause}</Text>

            {/* Statutory Particulars Ledger (8 compact hairline rows) */}
            <View style={s.ledgerTable}>
              <View style={s.ledgerRow}>
                <View style={s.ledgerLabelCell}>
                  <Text style={s.ledgerLabelText}>JENIS PENDAFTARAN</Text>
                </View>
                <View style={s.ledgerValCell}>
                  <Text style={s.ledgerValText}>{meta.shortLabel.toUpperCase()}</Text>
                </View>
              </View>

              <View style={s.ledgerRow}>
                <View style={s.ledgerLabelCell}>
                  <Text style={s.ledgerLabelText}>BENTUK ENTITI</Text>
                </View>
                <View style={s.ledgerValCell}>
                  <Text style={s.ledgerValText}>{entity.labelMs}</Text>
                </View>
              </View>

              <View style={s.ledgerRow}>
                <View style={s.ledgerLabelCell}>
                  <Text style={s.ledgerLabelText}>SEKTOR / KATEGORI</Text>
                </View>
                <View style={s.ledgerValCell}>
                  <Text style={s.ledgerValText}>{data.categoryName.toUpperCase()}</Text>
                </View>
              </View>

              <View style={s.ledgerRow}>
                <View style={s.ledgerLabelCell}>
                  <Text style={s.ledgerLabelText}>PEMILIK UTAMA</Text>
                </View>
                <View style={s.ledgerValCell}>
                  <Text style={s.ledgerValText}>
                    {data.owner.fullName.toUpperCase()}
                    {data.owner.matricNo
                      ? `  |  NO. MATRIK: ${data.owner.matricNo.toUpperCase()}`
                      : ''}
                  </Text>
                </View>
              </View>

              <View style={s.ledgerRow}>
                <View style={s.ledgerLabelCell}>
                  <Text style={s.ledgerLabelText}>TARIKH PENDAFTARAN</Text>
                </View>
                <View style={s.ledgerValCell}>
                  <Text style={s.ledgerValText}>
                    {formatMalayDate(data.createdAt)}
                    {data.approvedAt
                      ? `   |   DILULUSKAN: ${formatMalayDate(data.approvedAt)}`
                      : ''}
                  </Text>
                </View>
              </View>

              <View style={s.ledgerRow}>
                <View style={s.ledgerLabelCell}>
                  <Text style={s.ledgerLabelText}>STATUS PENDAFTARAN</Text>
                </View>
                <View style={s.ledgerValCell}>
                  <View
                    style={[
                      s.statusPillInline,
                      {
                        backgroundColor: statusInfo.bg,
                        borderColor: statusInfo.border,
                      },
                    ]}
                  >
                    <Text style={[s.statusPillText, { color: statusInfo.text }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={s.ledgerRow}>
                <View style={s.ledgerLabelCell}>
                  <Text style={s.ledgerLabelText}>TEMPAT UTAMA PERNIAGAAN</Text>
                </View>
                <View style={s.ledgerValCell}>
                  <Text style={s.ledgerValRegular}>
                    POLITEKNIK SULTAN HAJI AHMAD SHAH (POLISAS), SEMAMBU, 25350 KUANTAN, PAHANG DARUL MAKMUR
                  </Text>
                </View>
              </View>

              <View style={[s.ledgerRow, s.ledgerRowLast]}>
                <View style={s.ledgerLabelCell}>
                  <Text style={s.ledgerLabelText}>SALURAN & CAWANGAN</Text>
                </View>
                <View style={s.ledgerValCell}>
                  <Text style={s.ledgerValRegular}>
                    TIADA CAWANGAN • OPERASI KAMPUS POLISAS
                    {data.polymartIsActive ? ' & POLYMART DIGITAL' : ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Draft Watermark Stamp (only when unapproved or inactive) */}
            {statusInfo.draftWatermark ? (
              <View style={s.draftOverlayWrap}>
                <View style={s.draftStampBox}>
                  <Text style={s.draftStampText}>{statusInfo.draftWatermark}</Text>
                </View>
              </View>
            ) : null}

            {/* Official 3-Column Authentication Footer */}
            <View style={s.authFooter}>
              <View style={s.authLeft}>
                <View style={s.authMetaRow}>
                  <Text style={s.authMetaLabel}>BERTARIKH DI</Text>
                  <Text style={s.authMetaValue}>POLISAS, KUANTAN, PAHANG</Text>
                </View>
                <View style={s.authMetaRow}>
                  <Text style={s.authMetaLabel}>TARIKH JANAAN DOKUMEN</Text>
                  <Text style={s.authMetaValue}>{formatMalayDate(data.generatedAt)}</Text>
                </View>
                <View style={s.authMetaRow}>
                  <Text style={s.authMetaLabel}>DIJANA OLEH</Text>
                  <Text style={s.authMetaValue}>{data.generatedBy.toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={s.authMetaLabel}>KOD INTEGRITI</Text>
                  <Text style={s.authDigestValue}>{data.integrityHash}</Text>
                </View>
              </View>

              <View style={s.authCenter}>
                <View style={s.sealWrap}>
                  <InstitutionalSealSvg />
                </View>
                <View style={s.sigRule} />
                <Text style={s.sigTitle}>PENDAFTAR PERNIAGAAN SISWA</Text>
                <Text style={s.sigOrg}>Unit Keusahawanan (PUSKEP) / JPP POLISAS</Text>
                <Text style={s.sigInst}>Politeknik Sultan Haji Ahmad Shah</Text>
              </View>

              <View style={s.authRight}>
                <View style={s.qrBox}>
                  {qrDataUrl ? (
                    <Image src={qrDataUrl} style={s.qrImage} />
                  ) : (
                    <View style={s.qrPlaceholder}>
                      <Text style={{ fontSize: 6, color: '#64748B' }}>QR</Text>
                    </View>
                  )}
                </View>
                <Text style={s.qrCaption}>IMBAS UNTUK PENGESAHAN</Text>
                <Text style={s.qrSubCaption}>e-Keusahawanan JPP-POLISAS</Text>
              </View>
            </View>

            {/* Bottom Disclaimer Strip */}
            <View style={s.disclaimerBar}>
              <Text style={s.disclaimerText}>
                Perakuan ini dijana secara elektronik melalui Portal Rasmi e-Keusahawanan JPP-POLISAS. Kesahihan dokumen boleh disahkan melalui imbasan Kod QR di atas. Tiada tandatangan basah diperlukan.
              </Text>
              <Text
                style={s.pageNumBadge}
                render={({ pageNumber, totalPages }) =>
                  `Halaman ${pageNumber} / ${totalPages}`
                }
              />
            </View>
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════
          PAGE 2+: MAKLUMAT PERNIAGAAN, PEMILIK TERKINI & MENTOR PENASIHAT
          ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" orientation="portrait" style={s.page2}>
        {/* Fixed Header */}
        <View style={s.p2HeaderFixed} fixed>
          {polisasLogoSrc ? (
            <Image src={polisasLogoSrc as any} style={s.p2HeaderLogo} />
          ) : null}
          <View style={s.p2HeaderCenter}>
            <Text style={s.p2HeaderTitle}>MAKLUMAT PERNIAGAAN & PEMILIK TERKINI</Text>
            <Text style={s.p2HeaderSub}>
              LAMPIRAN BORANG P-D • {data.businessName.toUpperCase()} ({regCodeDisplay})
            </Text>
          </View>
          <View style={s.p2HeaderRefBox}>
            <Text style={s.p2HeaderRefLabel}>NO. RUJUKAN</Text>
            <Text style={s.p2HeaderRefVal}>{data.documentRef}</Text>
          </View>
        </View>

        {/* Bahagian A: Butiran Am & Bidang Perniagaan */}
        <View style={s.sectionBanner}>
          <Text style={s.sectionBannerTitle}>BAHAGIAN A : BUTIRAN AM & BIDANG PERNIAGAAN</Text>
        </View>
        <View style={s.kvBox}>
          <View style={s.kvRow}>
            <View style={s.kvLabelCell}>
              <Text style={s.kvLabelText}>NAMA PERNIAGAAN</Text>
            </View>
            <View style={s.kvValCell}>
              <Text style={s.kvValBold}>{data.businessName.toUpperCase()}</Text>
            </View>
          </View>
          <View style={s.kvRow}>
            <View style={s.kvLabelCell}>
              <Text style={s.kvLabelText}>NO. & JENIS PENDAFTARAN</Text>
            </View>
            <View style={s.kvValCell}>
              <Text style={s.kvValBold}>
                {regCodeDisplay} ({meta.badgeLabel})
              </Text>
            </View>
          </View>
          <View style={s.kvRow}>
            <View style={s.kvLabelCell}>
              <Text style={s.kvLabelText}>SEKTOR / KATEGORI</Text>
            </View>
            <View style={s.kvValCell}>
              <Text style={s.kvValText}>{data.categoryName.toUpperCase()}</Text>
            </View>
          </View>
          <View style={s.kvRow}>
            <View style={s.kvLabelCell}>
              <Text style={s.kvLabelText}>BENTUK ENTITI & KEAHLIAN</Text>
            </View>
            <View style={s.kvValCell}>
              <Text style={s.kvValText}>
                {entity.labelMs} — {data.members.length} ORANG AHLI AKTIF
              </Text>
            </View>
          </View>
          <View style={s.kvRow}>
            <View style={s.kvLabelCell}>
              <Text style={s.kvLabelText}>NO. TELEFON PERNIAGAAN</Text>
            </View>
            <View style={s.kvValCell}>
              <Text style={s.kvValText}>
                {data.businessPhone?.trim() || 'Tidak Dinyatakan'}
              </Text>
            </View>
          </View>
          <View style={s.kvRow}>
            <View style={s.kvLabelCell}>
              <Text style={s.kvLabelText}>SALURAN OPERASI</Text>
            </View>
            <View style={s.kvValCell}>
              <Text style={s.kvValText}>
                {data.polymartIsActive
                  ? 'Aktif di PolyMart Digital & Operasi POS Kampus'
                  : 'Operasi POS & Perniagaan Kampus POLISAS'}
              </Text>
            </View>
          </View>
          <View style={[s.kvRow, { borderBottomWidth: 0 }]}>
            <View style={s.kvLabelCell}>
              <Text style={s.kvLabelText}>JENIS PERNIAGAAN / KETERANGAN</Text>
            </View>
            <View style={s.kvValCell}>
              <Text style={s.kvValText}>
                {data.description || 'Tiada keterangan tambahan didaftarkan.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Conditional Registration History */}
        {data.registrationHistory.length > 0 ? (
          <View>
            <View style={s.sectionBanner}>
              <Text style={s.sectionBannerTitle}>REKOD PENDAFTARAN TERDAHULU</Text>
            </View>
            <View style={s.dataTable}>
              <View style={s.dtHeadRow}>
                <Text style={[s.dtHeadText, { width: '10%' }]}>BIL</Text>
                <Text style={[s.dtHeadText, { width: '25%' }]}>JENIS</Text>
                <Text style={[s.dtHeadText, { width: '35%' }]}>NO. PENDAFTARAN LAMA</Text>
                <Text style={[s.dtHeadText, { width: '30%' }]}>TARIKH PERTUKARAN</Text>
              </View>
              {data.registrationHistory.map((h, idx) => (
                <View
                  key={`${h.type}-${h.number}-${idx}`}
                  style={[s.dtRow, idx % 2 === 1 ? s.dtRowAlt : {}]}
                  wrap={false}
                >
                  <Text style={[s.dtCellText, { width: '10%' }]}>{idx + 1}</Text>
                  <Text style={[s.dtCellBold, { width: '25%' }]}>{h.type}</Text>
                  <Text style={[s.dtCellMono, { width: '35%' }]}>{h.number}</Text>
                  <Text style={[s.dtCellText, { width: '30%' }]}>
                    {formatMalayDate(h.changed_at)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Bahagian B: Maklumat Pemilik & Ahli Pasukan Terkini */}
        <View style={s.sectionBanner}>
          <Text style={s.sectionBannerTitle}>
            BAHAGIAN B : MAKLUMAT PEMILIK & AHLI PASUKAN TERKINI
          </Text>
        </View>
        <View style={s.dataTable}>
          <View style={s.dtHeadRow} fixed>
            <Text style={[s.dtHeadText, { width: '6%' }]}>BIL</Text>
            <Text style={[s.dtHeadText, { width: '33%' }]}>NAMA PENUH</Text>
            <Text style={[s.dtHeadText, { width: '16%' }]}>NO. MATRIK</Text>
            <Text style={[s.dtHeadText, { width: '19%' }]}>JABATAN / PROGRAM</Text>
            <Text style={[s.dtHeadText, { width: '13%' }]}>PERANAN</Text>
            <Text style={[s.dtHeadText, { width: '13%' }]}>TARIKH MULA</Text>
          </View>
          {data.members.map((mem, idx) => (
            <View
              key={mem.id || `${mem.fullName}-${idx}`}
              style={[s.dtRow, idx % 2 === 1 ? s.dtRowAlt : {}]}
              wrap={false}
            >
              <Text style={[s.dtCellText, { width: '6%' }]}>{idx + 1}</Text>
              <Text style={[s.dtCellBold, { width: '33%' }]}>
                {mem.fullName.toUpperCase()}
              </Text>
              <Text style={[s.dtCellMono, { width: '16%' }]}>
                {mem.matricNo ? mem.matricNo.toUpperCase() : '—'}
              </Text>
              <Text style={[s.dtCellText, { width: '19%' }]}>
                {mem.department ? mem.department.toUpperCase() : '—'}
              </Text>
              <Text
                style={[
                  s.dtCellBold,
                  {
                    width: '13%',
                    color: mem.role === 'OWNER' ? '#831010' : '#334155',
                  },
                ]}
              >
                {mem.role === 'OWNER' ? 'PEMILIK' : 'AHLI AKTIF'}
              </Text>
              <Text style={[s.dtCellText, { width: '13%' }]}>
                {formatMalayDate(mem.joinedAt)}
              </Text>
            </View>
          ))}
        </View>

        {/* Bahagian C: Maklumat Mentor Penasihat */}
        <View style={s.sectionBanner}>
          <Text style={s.sectionBannerTitle}>BAHAGIAN C : MAKLUMAT MENTOR PENASIHAT</Text>
        </View>
        <View style={s.dataTable}>
          <View style={s.dtHeadRow} fixed>
            <Text style={[s.dtHeadText, { width: '8%' }]}>BIL</Text>
            <Text style={[s.dtHeadText, { width: '52%' }]}>NAMA MENTOR PENASIHAT</Text>
            <Text style={[s.dtHeadText, { width: '40%' }]}>JABATAN / UNIT</Text>
          </View>
          {data.mentors.length === 0 ? (
            <View style={s.dtRow}>
              <Text
                style={[
                  s.dtCellText,
                  { width: '100%', textAlign: 'center', color: '#64748B', paddingVertical: 4 },
                ]}
              >
                Tiada mentor penasihat didaftarkan buat masa ini.
              </Text>
            </View>
          ) : (
            data.mentors.map((mentor, idx) => (
              <View
                key={`${mentor.name}-${idx}`}
                style={[s.dtRow, idx % 2 === 1 ? s.dtRowAlt : {}]}
                wrap={false}
              >
                <Text style={[s.dtCellText, { width: '8%' }]}>{idx + 1}</Text>
                <Text style={[s.dtCellBold, { width: '52%' }]}>
                  {mentor.name.toUpperCase()}
                </Text>
                <Text style={[s.dtCellText, { width: '40%' }]}>
                  {mentor.department ? mentor.department.toUpperCase() : 'POLISAS'}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Bahagian D: Maklumat Verifikasi & Integriti Digital */}
        <View wrap={false}>
          <View style={s.sectionBanner}>
            <Text style={s.sectionBannerTitle}>
              BAHAGIAN D : MAKLUMAT VERIFIKASI & INTEGRITI DIGITAL
            </Text>
          </View>
          <View style={s.verifyPanel}>
            <View style={s.verifyGrid}>
              <View style={s.verifyItemFull}>
                <Text style={s.verifyLabel}>PAUTAN PENGESAHAN RASMI</Text>
                <Text style={s.verifyValueMono}>{data.verificationUrl}</Text>
              </View>
              <View style={s.verifyItem}>
                <Text style={s.verifyLabel}>NO. RUJUKAN DOKUMEN</Text>
                <Text style={s.verifyValueMono}>{data.documentRef}</Text>
              </View>
              <View style={s.verifyItem}>
                <Text style={s.verifyLabel}>CAP JARI INTEGRITI (DIGEST)</Text>
                <Text style={[s.verifyValueMono, { color: '#831010' }]}>
                  {data.integrityHash}
                </Text>
              </View>
              <View style={s.verifyItem}>
                <Text style={s.verifyLabel}>MASA JANAAN</Text>
                <Text style={s.verifyValueMono}>{formatMalayDateTime(data.generatedAt)}</Text>
              </View>
              <View style={s.verifyItem}>
                <Text style={s.verifyLabel}>STATUS SEMASA DALAM SISTEM</Text>
                <Text style={s.verifyValueMono}>{statusInfo.label}</Text>
              </View>
            </View>
            <Text style={s.verifyNote}>
              Pegawai penilai, pentadbir HEP/PUSKEP, atau pihak penganjur boleh menyemak ketulenan rekod ini dengan mengimbas Kod QR pada Halaman 1 atau memasukkan nombor pendaftaran ({regCodeDisplay}) di pautan pengesahan rasmi di atas.
            </Text>
          </View>
        </View>

        {/* Fixed Running Footer */}
        <View style={s.p2FooterFixed} fixed>
          <Text style={s.p2FooterLeft}>
            PORTAL RASMI E-KEUSAHAWANAN JPP-POLISAS • PUSKEP POLITEKNIK SULTAN HAJI AHMAD SHAH
          </Text>
          <Text
            style={s.p2FooterRight}
            render={({ pageNumber, totalPages }) =>
              `Halaman ${pageNumber} daripada ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export default BusinessRegistrationCertPDF;
