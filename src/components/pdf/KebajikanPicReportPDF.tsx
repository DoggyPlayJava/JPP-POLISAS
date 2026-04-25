import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { KEBAJIKAN_CATEGORY_LABELS, KebajikanTicketCategory } from '@/types';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';

// ─── Ticket shape yang dipakai dalam laporan PIC ─────────────────────────────
export interface PicReportTicket {
  id: string;
  ticket_no: string;
  title: string;
  description: string;
  category: string;
  status: string;
  full_name: string;
  matric_no: string | null;
  created_at: string;
  image_urls: string[];    // Gambar yang dilampirkan oleh pengadu
}

export interface KebajikanPicReportProps {
  picName: string;          // Nama PIC
  picTitle: string;         // Jawatan PIC
  jabatanLabel: string;     // Nama Jabatan / Kemudahan
  picEmail?: string;
  picPhone?: string;
  tickets: PicReportTicket[];
  monthLabel: string;       // "April 2026"
  generatedAt: string;      // Tarikh jana
  generatedBy: string;      // Nama Exco yang jana
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Diterima', IN_PROGRESS: 'Dalam Tindakan', WAITING_INFO: 'Menunggu Maklumat',
  PENDING_EXTERNAL: 'Menunggu Pihak Lain',
  DELEGATED: 'Didelegasikan', ESCALATED: 'Diescalate', RESOLVED: 'Selesai',
  CLOSED: 'Ditutup', CANCELLED: 'Dibatal', REOPENED: 'Dibuka Semula',
};

const styles = StyleSheet.create({
  page: { padding: 50, backgroundColor: '#ffffff', fontFamily: 'Helvetica', fontSize: 10 },

  // ─── Letterhead ─────────────────────────────────────────────────────────────
  letterhead: { marginBottom: 24, borderBottomWidth: 1.5, borderBottomColor: '#0f172a', paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  orgBlock: { flex: 1 },
  orgName: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
  orgSub: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  refBlock: { alignItems: 'flex-end' },
  refText: { fontSize: 8, color: '#64748b', marginBottom: 2 },
  refBadge: { fontSize: 9, fontWeight: 'bold', color: '#2DD4BF', backgroundColor: '#f0fdfa', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },

  // ─── Recipient block ─────────────────────────────────────────────────────────
  recipientBox: { marginBottom: 20 },
  recipientLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 },
  recipientName: { fontSize: 12, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
  recipientTitle: { fontSize: 9, color: '#475569', marginBottom: 1 },
  recipientDept: { fontSize: 9, color: '#475569', marginBottom: 1 },
  recipientContact: { fontSize: 8, color: '#94a3b8' },

  // ─── Subject ─────────────────────────────────────────────────────────────────
  subjectBox: { marginBottom: 20, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#f8fafc', borderLeftWidth: 3, borderLeftColor: '#2DD4BF' },
  subjectLabel: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 3 },
  subjectText: { fontSize: 11, fontWeight: 'bold', color: '#0f172a' },

  // ─── Opening paragraph ───────────────────────────────────────────────────────
  para: { fontSize: 9.5, color: '#334155', lineHeight: 1.7, marginBottom: 14 },
  bold: { fontWeight: 'bold', color: '#0f172a' },

  // ─── Table ───────────────────────────────────────────────────────────────────
  tableWrapper: { marginBottom: 20 },
  tableTitle: { fontSize: 9, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  table: { borderWidth: 1, borderColor: '#cbd5e1' },
  thead: { flexDirection: 'row', backgroundColor: '#f1f5f9' },
  th: { padding: 6, fontSize: 8, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  trEscalated: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff7ed' },
  td: { padding: 6, fontSize: 8.5, color: '#334155', lineHeight: 1.5 },
  statusBadge: { fontSize: 7.5, fontWeight: 'bold', textTransform: 'uppercase', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  statusEscalated: { color: '#dc2626', backgroundColor: '#fee2e2' },
  statusResolved: { color: '#16a34a', backgroundColor: '#dcfce7' },
  statusDefault: { color: '#475569', backgroundColor: '#f1f5f9' },

  // ─── Summary stats ───────────────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statBox: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 3 },
  statLabel: { fontSize: 7.5, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' },

  // ─── Closing / Signature ─────────────────────────────────────────────────────
  closing: { marginTop: 30 },
  closingPara: { fontSize: 9.5, color: '#334155', lineHeight: 1.7, marginBottom: 30 },
  sigBlock: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  sigSide: { width: '45%' },
  sigLabel: { fontSize: 8, color: '#94a3b8', marginBottom: 30 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: '#334155', marginBottom: 6 },
  sigName: { fontSize: 9, fontWeight: 'bold', color: '#0f172a' },
  sigTitle: { fontSize: 8, color: '#475569' },

  // ─── Footer ──────────────────────────────────────────────────────────────────
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7.5, color: '#94a3b8' },

  // ─── Images ──────────────────────────────────────────────────────────────────
  imagesSection: { paddingTop: 4, paddingBottom: 2 },
  imagesLabel: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  imgBox: { width: '48%', borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  imgThumb: { width: '100%', height: 100, objectFit: 'cover' },
});

// ─── Column widths ────────────────────────────────────────────────────────────
const COL = { no: '5%', ticketNo: '13%', date: '10%', category: '15%', title: '35%', status: '12%', matric: '10%' };

export function KebajikanPicReportPDF({
  picName, picTitle, jabatanLabel,
  picEmail, picPhone,
  tickets, monthLabel, generatedAt, generatedBy,
}: KebajikanPicReportProps) {
  const today = format(new Date(), "d MMMM yyyy", { locale: ms });
  const escalatedCount = tickets.filter(t => t.status === 'ESCALATED').length;
  const resolvedCount  = tickets.filter(t => t.status === 'RESOLVED').length;

  return (
    <Document title={`Laporan Aduan — ${picName} (${monthLabel})`} author="JPP POLISAS" creator="Sistem E-Kebajikan JPP POLISAS">
      <Page size="A4" style={styles.page}>

        {/* ── Letterhead ─────────────────────────────────────────────────────── */}
        <View style={styles.letterhead}>
          <View style={styles.orgBlock}>
            <Text style={styles.orgName}>JAWATANKUASA PERWAKILAN PELAJAR (JPP)</Text>
            <Text style={styles.orgSub}>Politeknik Sultan Haji Ahmad Shah (POLISAS)</Text>
          </View>
          <View style={styles.refBlock}>
            <Text style={styles.refText}>Tarikh: {today}</Text>
            <Text style={styles.refText}>Sistem: E-Kebajikan JPP</Text>
            <View style={styles.refBadge}>
              <Text>LAPORAN RASMI</Text>
            </View>
          </View>
        </View>

        {/* ── Recipient ──────────────────────────────────────────────────────── */}
        <View style={styles.recipientBox}>
          <Text style={styles.recipientLabel}>Kepada:</Text>
          <Text style={styles.recipientName}>{picName || '(Nama PIC)'}</Text>
          {picTitle   && <Text style={styles.recipientTitle}>{picTitle}</Text>}
          {jabatanLabel && <Text style={styles.recipientDept}>{jabatanLabel}</Text>}
          {(picEmail || picPhone) && (
            <Text style={styles.recipientContact}>
              {[picEmail, picPhone].filter(Boolean).join('  ·  ')}
            </Text>
          )}
        </View>

        {/* ── Subject ────────────────────────────────────────────────────────── */}
        <View style={styles.subjectBox}>
          <Text style={styles.subjectLabel}>Perkara:</Text>
          <Text style={styles.subjectText}>
            Laporan Aduan Pelajar — {jabatanLabel} ({monthLabel})
          </Text>
        </View>

        {/* ── Opening paragraph ──────────────────────────────────────────────── */}
        <Text style={styles.para}>
          Dengan hormatnya perkara di atas dirujuk.{'\n'}
          {'\n'}
          Sukacita dimaklumkan bahawa terdapat <Text style={styles.bold}>{tickets.length} aduan pelajar</Text> yang berkaitan
          dengan bidang tanggungjawab pihak tuan/puan bagi tempoh <Text style={styles.bold}>{monthLabel}</Text>.
          {escalatedCount > 0
            ? ` Daripada jumlah tersebut, sebanyak ${escalatedCount} aduan telah diescalate dan memerlukan perhatian segera.`
            : ''}
          {' '}Senarai terperinci aduan-aduan tersebut adalah seperti berikut:
        </Text>

        {/* ── Summary Stats ──────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { value: tickets.length, label: 'Jumlah Aduan' },
            { value: escalatedCount, label: 'Diescalate' },
            { value: resolvedCount,  label: 'Selesai' },
            { value: tickets.length - resolvedCount - escalatedCount, label: 'Dalam Proses' },
          ].map(s => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Ticket Table ───────────────────────────────────────────────────── */}
        <View style={styles.tableWrapper}>
          <Text style={styles.tableTitle}>Senarai Aduan Pelajar</Text>
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.thead}>
              <Text style={[styles.th, { width: COL.no }]}>#</Text>
              <Text style={[styles.th, { width: COL.ticketNo }]}>No. Tiket</Text>
              <Text style={[styles.th, { width: COL.date }]}>Tarikh</Text>
              <Text style={[styles.th, { width: COL.category }]}>Kategori</Text>
              <Text style={[styles.th, { width: COL.title, flexGrow: 1 }]}>Tajuk & Penerangan</Text>
              <Text style={[styles.th, { width: COL.status }]}>Status</Text>
            </View>

            {/* Rows */}
            {tickets.map((t, idx) => (
              <View key={t.id} wrap={false}>
                {/* ── Main data row ── */}
                <View style={t.status === 'ESCALATED' ? styles.trEscalated : styles.tr}>
                  <Text style={[styles.td, { width: COL.no, color: '#94a3b8' }]}>{idx + 1}</Text>
                  <Text style={[styles.td, { width: COL.ticketNo, fontWeight: 'bold', color: '#0f766e' }]}>{t.ticket_no}</Text>
                  <Text style={[styles.td, { width: COL.date }]}>{format(new Date(t.created_at), 'dd/MM/yyyy')}</Text>
                  <Text style={[styles.td, { width: COL.category }]}>
                    {KEBAJIKAN_CATEGORY_LABELS[t.category as KebajikanTicketCategory] || t.category}
                  </Text>
                  <View style={[styles.td, { width: COL.title, flexGrow: 1 }]}>
                    <Text style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: 2 }}>{t.title}</Text>
                    <Text style={{ color: '#64748b', fontSize: 7.5, lineHeight: 1.5 }}>
                      {t.description.length > 200 ? t.description.slice(0, 200) + '...' : t.description}
                    </Text>
                    {t.matric_no && (
                      <Text style={{ color: '#94a3b8', fontSize: 7, marginTop: 2 }}>Pengadu: {t.full_name} ({t.matric_no})</Text>
                    )}
                  </View>
                  <View style={[styles.td, { width: COL.status }]}>
                    <Text style={[styles.statusBadge, t.status === 'ESCALATED' ? styles.statusEscalated : t.status === 'RESOLVED' ? styles.statusResolved : styles.statusDefault]}>
                      {STATUS_LABEL[t.status] || t.status}
                    </Text>
                  </View>
                </View>

                {/* ── Image row (only if ticket has images) ── */}
                {t.image_urls && t.image_urls.length > 0 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      borderTopWidth: 0,
                      paddingHorizontal: 8,
                      paddingVertical: 8,
                      backgroundColor: t.status === 'ESCALATED' ? '#fffbeb' : '#fafafa',
                      borderBottomWidth: 1,
                      borderBottomColor: '#e2e8f0',
                    }}
                  >
                    {/* Left indent spacer to align with description column */}
                    <View style={{ width: '5%' }} />
                    <View style={{ width: '8%' }} />
                    <View style={{ width: '10%' }} />
                    <View style={{ flexGrow: 1 }}>
                      <Text style={styles.imagesLabel}>
                        📷 Gambar Dilampirkan ({t.image_urls.length} gambar)
                      </Text>
                      <View style={styles.imagesGrid}>
                        {/* Max 6 images to keep PDF manageable */}
                        {t.image_urls.slice(0, 6).map((url, imgIdx) => (
                          <View key={imgIdx} style={styles.imgBox}>
                            <Image
                              src={url}
                              style={styles.imgThumb}
                              cache={true}
                            />
                            <Text style={{ fontSize: 6.5, color: '#94a3b8', padding: 2, textAlign: 'center' }}>
                              Gambar {imgIdx + 1}
                            </Text>
                          </View>
                        ))}
                        {t.image_urls.length > 6 && (
                          <View style={[styles.imgBox, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }]}>
                            <Text style={{ fontSize: 9, color: '#64748b', fontWeight: 'bold' }}>+{t.image_urls.length - 6}</Text>
                            <Text style={{ fontSize: 7, color: '#94a3b8' }}>gambar lagi</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>


        {/* ── Closing paragraph ──────────────────────────────────────────────── */}
        <View style={styles.closing}>
          <Text style={styles.closingPara}>
            Pihak tuan/puan dimohon untuk mengambil maklum dan mengambil tindakan yang sewajarnya terhadap aduan-aduan yang tersenarai.
            Kerjasama pihak tuan/puan dalam memastikan setiap aduan diselesaikan dengan segera amat dihargai.{'\n'}
            {'\n'}
            Sekian, terima kasih.
          </Text>

          {/* Signature blocks */}
          <View style={styles.sigBlock}>
            <View style={styles.sigSide}>
              <Text style={styles.sigLabel}>Dihantar oleh:</Text>
              <View style={styles.sigLine} />
              <Text style={styles.sigName}>{generatedBy || '____________________'}</Text>
              <Text style={styles.sigTitle}>Exco Kebajikan & Pengaduan Awam</Text>
              <Text style={styles.sigTitle}>Jawatankuasa Perwakilan Pelajar (JPP)</Text>
              <Text style={styles.sigTitle}>POLISAS</Text>
            </View>
            <View style={styles.sigSide}>
              <Text style={styles.sigLabel}>Disahkan penerimaan oleh:</Text>
              <View style={styles.sigLine} />
              <Text style={styles.sigName}>{picName || '____________________'}</Text>
              {picTitle && <Text style={styles.sigTitle}>{picTitle}</Text>}
              {jabatanLabel && <Text style={styles.sigTitle}>{jabatanLabel}</Text>}
            </View>
          </View>
        </View>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Sistem E-Kebajikan JPP POLISAS — SULIT</Text>
          <Text style={styles.footerText}>Dijana: {generatedAt}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Muka surat ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
