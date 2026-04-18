import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { KEBAJIKAN_CATEGORY_LABELS, KebajikanTicketCategory } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Diterima', IN_PROGRESS: 'Dalam Tindakan', WAITING_INFO: 'Menunggu',
  DELEGATED: 'Didelegasikan', ESCALATED: 'Diescalate', RESOLVED: 'Selesai',
  CLOSED: 'Ditutup', CANCELLED: 'Dibatal', REOPENED: 'Dibuka Semula',
};

// Custom Stylesheet for Corporate Layout
const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  
  // Header
  headerContainer: { marginBottom: 30, borderBottomWidth: 2, borderBottomColor: '#334155', paddingBottom: 15 },
  docTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  docSubtitle: { fontSize: 10, color: '#64748b', textTransform: 'uppercase' },

  // Sections
  section: { marginBottom: 25 },
  sectionTitleBox: { backgroundColor: '#f8fafc', padding: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#2DD4BF' },
  sectionTitleText: { fontSize: 12, fontWeight: 'bold', color: '#0f172a' },
  sectionSubtitleText: { fontSize: 9, color: '#64748b', marginTop: 2 },

  // Metrics Grid
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  metricBox: { width: '23%', padding: 10, backgroundColor: '#f1f5f9', borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  metricValue: { fontSize: 18, color: '#0f172a', fontWeight: 'bold', marginBottom: 4 },
  metricLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase' },

  // Three Column Metrics
  metricsRowThree: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  metricBoxThree: { width: '31%', padding: 10, backgroundColor: '#f1f5f9', borderRadius: 4, borderWidth: 1, borderColor: '#e2e8f0', textAlign: 'center' },

  // Table Styles
  table: { display: 'flex', flexDirection: 'column', width: '100%', borderWidth: 1, borderColor: '#cbd5e1' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  tableRowLast: { flexDirection: 'row' },
  tableHeaderItem: { backgroundColor: '#f8fafc', padding: 6, fontSize: 9, color: '#475569' },
  tableCell: { padding: 6, fontSize: 9, color: '#334155' },

  // Typography
  textSm: { fontSize: 9, color: '#475569', marginBottom: 4 },
  textBase: { fontSize: 10, color: '#334155', lineHeight: 1.5 },
  italic: { fontStyle: 'italic', color: '#64748b' },
  bold: { fontWeight: 'bold', color: '#0f172a' },

  // Footer
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#94a3b8' }
});

export interface ReportDataParams {
  total_received: number; total_resolved: number; total_cancelled: number; total_pending: number;
  resolution_rate: number; avg_hours: number; escalated_count: number; sla_breach_count: number;
  avg_rating: number | null; satisfied_count: number; neutral_count: number; unsatisfied_count: number;
  by_category: { category: string; total: number; resolved: number }[];
  by_assignee: { name: string; assigned: number; resolved: number; avg_hours: number }[];
  escalated_tickets: { ticket_no: string; category: string; hours_open: number; status: string }[];
  pending_tickets: { ticket_no: string; category: string; days_open: number; status: string; assigned_to: string }[];
  top_comments: { comment: string; rating: number }[];
}

interface Props {
  data: ReportDataParams;
  monthLabel: string;
  generatedAt: string;
}

export function KebajikanReportPDF({ data, monthLabel, generatedAt }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Document Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.docTitle}>Laporan Prestasi E-Kebajikan</Text>
          <Text style={styles.docSubtitle}>Edisi: {monthLabel}   |   Dijana pada: {generatedAt}</Text>
        </View>

        {/* 1. Ringkasan Eksekutif */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitleText}>1. Ringkasan Eksekutif</Text>
            <Text style={styles.sectionSubtitleText}>Keseluruhan aduan bagi bulan {monthLabel}</Text>
          </View>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.total_received}</Text>
              <Text style={styles.metricLabel}>Diterima</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.total_resolved}</Text>
              <Text style={styles.metricLabel}>Selesai</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.total_pending}</Text>
              <Text style={styles.metricLabel}>Tertunggak</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.resolution_rate}%</Text>
              <Text style={styles.metricLabel}>Kadar Selesai</Text>
            </View>
          </View>

          <View style={styles.metricsRowThree}>
            <View style={styles.metricBoxThree}>
              <Text style={styles.metricValue}>{data.avg_hours} j</Text>
              <Text style={styles.metricLabel}>Purata Masa Selesai</Text>
            </View>
            <View style={styles.metricBoxThree}>
              <Text style={styles.metricValue}>{data.escalated_count}</Text>
              <Text style={styles.metricLabel}>Kes Diescalate</Text>
            </View>
            <View style={styles.metricBoxThree}>
              <Text style={styles.metricValue}>{data.total_cancelled}</Text>
              <Text style={styles.metricLabel}>Dibatal</Text>
            </View>
          </View>
        </View>

        {/* 2. Prestasi SLA (Service Level Agreement) */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitleText}>2. Prestasi SLA (Service Level Agreement)</Text>
            <Text style={styles.sectionSubtitleText}>Analisis had masa penyelesaian (Sasaran: {'<'} 48 jam)</Text>
          </View>
          <View style={styles.metricsRowThree}>
            <View style={styles.metricBoxThree}>
              <Text style={styles.metricValue}>
                {data.total_resolved > 0 ? Math.round(((data.total_resolved - data.sla_breach_count) / data.total_resolved) * 100) : 0}%
              </Text>
              <Text style={styles.metricLabel}>Dalam Sasaran Masa</Text>
            </View>
            <View style={styles.metricBoxThree}>
              <Text style={styles.metricValue}>{data.sla_breach_count}</Text>
              <Text style={styles.metricLabel}>Melebihi SLA (Lambat)</Text>
            </View>
            <View style={styles.metricBoxThree}>
              <Text style={styles.metricValue}>{data.escalated_count}</Text>
              <Text style={styles.metricLabel}>Diescalate Kpd MT</Text>
            </View>
          </View>
        </View>

        {/* 3. Analisis Mengikut Kategori */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitleText}>3. Analisis Kategori Aduan</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableHeaderItem, { flex: 3, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>Kategori</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>Diterima</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>Selesai</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1, textAlign: 'center' }]}><Text>Peratusan</Text></View>
            </View>
            {data.by_category.sort((a,b) => b.total - a.total).map((c, i, arr) => (
              <View key={c.category} style={i === arr.length - 1 ? styles.tableRowLast : styles.tableRow}>
                <View style={[styles.tableCell, { flex: 3, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}>
                  <Text>{KEBAJIKAN_CATEGORY_LABELS[c.category as KebajikanTicketCategory] || c.category}</Text>
                </View>
                <View style={[styles.tableCell, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>{c.total}</Text></View>
                <View style={[styles.tableCell, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>{c.resolved}</Text></View>
                <View style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                  <Text>{Math.round((c.total / data.total_received) * 100)}%</Text>
                </View>
              </View>
            ))}
            {data.by_category.length === 0 && (
              <View style={styles.tableRowLast}><View style={styles.tableCell}><Text>Tiada Data</Text></View></View>
            )}
          </View>
        </View>

        {/* 4. Prestasi Tanggungjawab (Assignees) */}
        <View style={styles.section} wrap={false}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitleText}>4. Prestasi Ahli Bertugas</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableHeaderItem, { flex: 3, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>Nama Staf/Exco</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>Di-assign</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>Selesai</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1.5, textAlign: 'center' }]}><Text>Purata Masa</Text></View>
            </View>
            {data.by_assignee.sort((a,b) => b.resolved - a.resolved).map((a, i, arr) => (
              <View key={a.name} style={i === arr.length - 1 ? styles.tableRowLast : styles.tableRow}>
                <View style={[styles.tableCell, { flex: 3, borderRightWidth: 1, borderRightColor: '#cbd5e1', fontWeight: 'bold' }]}><Text>{a.name}</Text></View>
                <View style={[styles.tableCell, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>{a.assigned}</Text></View>
                <View style={[styles.tableCell, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>{a.resolved}</Text></View>
                <View style={[styles.tableCell, { flex: 1.5, textAlign: 'center' }]}><Text>{a.avg_hours > 0 ? `${a.avg_hours} j` : '-'}</Text></View>
              </View>
            ))}
            {data.by_assignee.length === 0 && (
              <View style={styles.tableRowLast}><View style={styles.tableCell}><Text>Tiada Tugasan Rekod</Text></View></View>
            )}
          </View>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        {/* Document Header Page 2 */}
        <View style={styles.headerContainer}>
          <Text style={styles.docTitle}>Laporan Prestasi E-Kebajikan (Sambungan)</Text>
          <Text style={styles.docSubtitle}>Edisi: {monthLabel}</Text>
        </View>

        {/* 5. Kepuasan Pelajar */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitleText}>5. Penilaian Pelajar</Text>
            <Text style={styles.sectionSubtitleText}>Kadar kepuasan setelah aduan/tiket ditutup</Text>
          </View>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.avg_rating ?? '-'}/5</Text>
              <Text style={styles.metricLabel}>Purata Rating</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.satisfied_count}</Text>
              <Text style={styles.metricLabel}>Puas Hati</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.neutral_count}</Text>
              <Text style={styles.metricLabel}>Neutral</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.unsatisfied_count}</Text>
              <Text style={styles.metricLabel}>Tidak Puas</Text>
            </View>
          </View>

          {data.top_comments.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.textSm}>Ulasan Terpilih:</Text>
              {data.top_comments.map((c, i) => (
                <View key={i} style={{ padding: 6, backgroundColor: '#f8fafc', marginBottom: 4, borderRadius: 4 }}>
                  <Text style={[styles.textBase, styles.italic]}>"{c.comment}" — ({c.rating} Bintang)</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 6. Isu Kritikal: Tertunggak / Escalated */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitleText}>6. Senarai Tiket Masih Tertunggak (Pending)</Text>
            <Text style={styles.sectionSubtitleText}>Aduan yang memerlukan perhatian dalam bulan seterusnya</Text>
          </View>
          
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableHeaderItem, { flex: 1.5, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>No. Tiket</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 2, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>Kategori</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>Masa Dibuka</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1.5, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>Status</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 2 }]}><Text>Staf Bertugas</Text></View>
            </View>
            {data.pending_tickets.map((t, i, arr) => (
              <View key={t.ticket_no} style={i === arr.length - 1 ? styles.tableRowLast : styles.tableRow}>
                <View style={[styles.tableCell, { flex: 1.5, borderRightWidth: 1, borderRightColor: '#cbd5e1', fontWeight: 'bold' }]}><Text>{t.ticket_no}</Text></View>
                <View style={[styles.tableCell, { flex: 2, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>{KEBAJIKAN_CATEGORY_LABELS[t.category as KebajikanTicketCategory] || t.category}</Text></View>
                <View style={[styles.tableCell, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>{t.days_open} hari</Text></View>
                <View style={[styles.tableCell, { flex: 1.5, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>{STATUS_LABEL[t.status] || t.status}</Text></View>
                <View style={[styles.tableCell, { flex: 2 }]}><Text>{t.assigned_to}</Text></View>
              </View>
            ))}
            {data.pending_tickets.length === 0 && (
              <View style={styles.tableRowLast}><View style={styles.tableCell}><Text>Tahniah! Tiada tiket yang tertunggak.</Text></View></View>
            )}
          </View>
        </View>

        {/* Footer info across pages */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Jawatankuasa Perwakilan Pelajar (JPP) Politeknik Sultan Haji Ahmad Shah</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Muka Surat ${pageNumber} daripada ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
