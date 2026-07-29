import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, PDFDownloadLink } from '@react-pdf/renderer';

export interface EmsCertData {
  id: string;
  cert_serial: string;
  cert_type: 'PARTICIPANT' | 'WINNER' | 'JURY' | string;
  recipient_name: string;
  recipient_subtext?: string | null;
  event_title: string;
  event_date?: string | null;
  award_title?: string | null;
  qr_code_url?: string | null;
  verification_url?: string | null;
}

export interface EmsCertificateDocumentProps {
  certData: EmsCertData;
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    backgroundColor: '#0F172A', // Deep Royal Navy Frame
    fontFamily: 'Helvetica',
  },
  borderOuter: {
    borderWidth: 2,
    borderColor: '#D4AF37', // Gold Accent Border
    borderRadius: 6,
    padding: 3,
    height: '100%',
    backgroundColor: '#0B1329',
  },
  borderInner: {
    borderWidth: 1.5,
    borderColor: '#C5A059',
    borderRadius: 4,
    padding: 24,
    height: '100%',
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // ─── Header ─────────────────────────────────────────────────────────────
  headerContainer: {
    alignItems: 'center',
    marginBottom: 4,
    width: '100%',
  },
  institutionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  subHeaderTitle: {
    fontSize: 8.5,
    color: '#475569',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
  },
  goldDivider: {
    width: '50%',
    height: 1.5,
    backgroundColor: '#D4AF37',
    marginTop: 6,
    marginBottom: 6,
  },

  // ─── Certificate Title & Type ──────────────────────────────────────────
  certTypeTitle: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  awardBadge: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#B45309', // Warm Amber/Gold
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 4,
    letterSpacing: 1,
  },

  // ─── Body Content ──────────────────────────────────────────────────────
  bodyContainer: {
    alignItems: 'center',
    marginVertical: 4,
    width: '100%',
  },
  certifyText: {
    fontSize: 9.5,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 21,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
    letterSpacing: 1,
  },
  recipientSubtext: {
    fontSize: 9.5,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 8,
  },
  participationLeadText: {
    fontSize: 9.5,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1E3A8A', // Rich Blue
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  eventDate: {
    fontSize: 8.5,
    color: '#64748B',
    textAlign: 'center',
  },

  // ─── Footer Section ────────────────────────────────────────────────────
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '30%',
  },
  serialLabel: {
    fontSize: 7.5,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  serialValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginTop: 1,
  },
  statusBadge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginTop: 4,
  },

  footerCenter: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '40%',
  },
  signatureLine: {
    width: 120,
    borderBottomWidth: 1,
    borderBottomColor: '#94A3B8',
    marginBottom: 4,
  },
  signatoryTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    textAlign: 'center',
  },
  signatorySub: {
    fontSize: 7,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },

  footerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    width: '30%',
  },
  qrCodeImage: {
    width: 44,
    height: 44,
  },
  verifyText: {
    fontSize: 6,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'right',
  },
});

export const EmsCertificateDocument: React.FC<EmsCertificateDocumentProps> = ({ certData }) => {
  const isWinner = certData.cert_type === 'WINNER';
  const isJury = certData.cert_type === 'JURY';

  const certTitle = isWinner
    ? 'SIJIL PENGHARGAAN & ANUGERAH PEMENANG'
    : isJury
    ? 'SIJIL PENGHARGAAN JURI PENILAI'
    : 'SIJIL PENYERTAAN';

  const actionText = isWinner
    ? 'telah mencapai kejayaan cemerlang dalam program / acara:'
    : isJury
    ? 'telah memberikan sumbangan dan khidmat bakti sebagai Juri Penilai bagi program / acara:'
    : 'telah menyertai dengan jayanya program / acara:';

  return (
    <Document title={`Sijil_${certData.cert_serial}`} author="JPP POLISAS EMS">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.borderOuter}>
          <View style={styles.borderInner}>
            {/* Header Block */}
            <View style={styles.headerContainer}>
              <Text style={styles.institutionTitle}>POLITEKNIK SULTAN HAJI AHMAD SHAH</Text>
              <Text style={styles.subHeaderTitle}>Jawatankuasa Perwakilan Pelajar (JPP-POLISAS)</Text>
              <View style={styles.goldDivider} />
            </View>

            {/* Title & Type */}
            <Text style={styles.certTypeTitle}>{certTitle}</Text>

            {isWinner && certData.award_title && (
              <Text style={styles.awardBadge}>{certData.award_title}</Text>
            )}

            {/* Body */}
            <View style={styles.bodyContainer}>
              <Text style={styles.certifyText}>Dengan ini disahkan bahawa</Text>
              <Text style={styles.recipientName}>{certData.recipient_name}</Text>
              
              {certData.recipient_subtext && (
                <Text style={styles.recipientSubtext}>{certData.recipient_subtext}</Text>
              )}

              <Text style={styles.participationLeadText}>{actionText}</Text>
              <Text style={styles.eventTitle}>{certData.event_title}</Text>

              {certData.event_date && (
                <Text style={styles.eventDate}>Tarikh: {certData.event_date}</Text>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footerRow}>
              {/* Left: Serial & Status */}
              <View style={styles.footerLeft}>
                <Text style={styles.serialLabel}>NO. SIRI SIJIL</Text>
                <Text style={styles.serialValue}>{certData.cert_serial}</Text>
                <Text style={styles.statusBadge}>✓ SAH & BERDAFTAR</Text>
              </View>

              {/* Center: Signatory */}
              <View style={styles.footerCenter}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatoryTitle}>PENGERUSI JPP POLISAS</Text>
                <Text style={styles.signatorySub}>Sistem Pengurusan Acara JPP-POLISAS</Text>
              </View>

              {/* Right: QR Verification */}
              <View style={styles.footerRight}>
                {certData.qr_code_url ? (
                  <Image src={certData.qr_code_url} style={styles.qrCodeImage} />
                ) : null}
                <Text style={styles.verifyText}>Imbas untuk Pengesahan Digital</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export interface EmsCertificateDownloadLinkProps {
  certData: EmsCertData;
  fileName?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: (props: { loading: boolean; error: Error | null }) => React.ReactNode;
}

export const EmsCertificateDownloadLink: React.FC<EmsCertificateDownloadLinkProps> = ({
  certData,
  fileName,
  className,
  style,
  children,
}) => {
  const name = fileName || `Sijil_${certData.cert_serial || 'POLISAS'}.pdf`;

  return (
    <PDFDownloadLink
      document={<EmsCertificateDocument certData={certData} />}
      fileName={name}
      className={className}
      style={style}
    >
      {/* @ts-ignore */}
      {({ loading, error }) =>
        children
          ? children({ loading, error })
          : loading
          ? 'Menjana PDF...'
          : 'Muat Turun Sijil (PDF)'
      }
    </PDFDownloadLink>
  );
};
