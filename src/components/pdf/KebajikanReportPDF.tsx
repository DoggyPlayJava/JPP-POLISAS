import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { KEBAJIKAN_CATEGORY_LABELS, KebajikanTicketCategory } from '@/types';
import i18n from '@/lib/i18n';

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
  t?: (key: string, fallback: string, options?: any) => string;
}

export function KebajikanReportPDF({ data, monthLabel, generatedAt, t: propT }: Props) {
  const t = propT || ((k: string, fb: string, opt?: any) => (i18n.isInitialized ? i18n.t(k, fb, opt) : fb) || fb);

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      NEW: t('kebajikan:pdf_status_new', 'Diterima'),
      IN_PROGRESS: t('kebajikan:pdf_status_in_progress', 'Dalam Tindakan'),
      WAITING_INFO: t('kebajikan:pdf_status_waiting_info', 'Menunggu'),
      PENDING_EXTERNAL: t('kebajikan:pdf_status_pending_external', 'Menunggu Pihak Lain'),
      DELEGATED: t('kebajikan:pdf_status_delegated', 'Didelegasikan'),
      ESCALATED: t('kebajikan:pdf_status_escalated', 'Diescalate'),
      RESOLVED: t('kebajikan:pdf_status_resolved', 'Selesai'),
      CLOSED: t('kebajikan:pdf_status_closed', 'Ditutup'),
      CANCELLED: t('kebajikan:pdf_status_cancelled', 'Dibatal'),
      REOPENED: t('kebajikan:pdf_status_reopened', 'Dibuka Semula'),
    };
    return map[status] || status;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Document Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.docTitle}>{t('kebajikan:pdf_report_title', 'Laporan Prestasi E-Kebajikan')}</Text>
          <Text style={styles.docSubtitle}>{t('kebajikan:pdf_report_edition', 'Edisi: {{month}}   |   Dijana pada: {{date}}', { month: monthLabel, date: generatedAt })}</Text>
        </View>

        {/* 1. Ringkasan Eksekutif */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitleText}>{t('kebajikan:pdf_sec1_title', '1. Ringkasan Eksekutif')}</Text>
            <Text style={styles.sectionSubtitleText}>{t('kebajikan:pdf_sec1_subtitle', 'Keseluruhan aduan bagi bulan {{month}}', { month: monthLabel })}</Text>
          </View>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.total_received}</Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_received', 'Diterima')}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.total_resolved}</Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_resolved', 'Selesai')}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.total_pending}</Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_pending', 'Tertunggak')}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.resolution_rate}%</Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_resolution_rate', 'Kadar Selesai')}</Text>
            </View>
          </View>

          <View style={styles.metricsRowThree}>
            <View style={styles.metricBoxThree}>
              <Text style={styles.metricValue}>{data.avg_hours} j</Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_avg_resolution_time', 'Purata Masa Selesai')}</Text>
            </View>
            <View style={styles.metricBoxThree}>
              <Text style={styles.metricValue}>{data.escalated_count}</Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_escalated_cases', 'Kes Diescalate')}</Text>
            </View>
            <View style={styles.metricBoxThree}>
              <Text style={styles.metricValue}>{data.total_cancelled}</Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_cancelled', 'Dibatal')}</Text>
            </View>
          </View>
        </View>

        {/* 2. Prestasi SLA (Service Level Agreement) */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitleText}>{t('kebajikan:pdf_sec2_title', '2. Prestasi SLA (Service Level Agreement)')}</Text>
            <Text style={styles.sectionSubtitleText}>{t('kebajikan:pdf_sec2_subtitle', 'Analisis had masa penyelesaian (Sasaran: < 48 jam)')}</Text>
          </View>
          <View style={styles.metricsRowThree}>
            <View style={styles.metricBoxThree}>
              <Text style={styles.metricValue}>
                {data.total_resolved > 0 ? Math.round(((data.total_resolved - data.sla_breach_count) / data.total_resolved) * 100) : 0}%
              </Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_within_target', 'Dalam Sasaran Masa')}</Text>
            </View>
            <View style={styles.metricBoxThree}>
              <Text style={styles.metricValue}>{data.sla_breach_count}</Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_exceeded_sla', 'Melebihi SLA (Lambat)')}</Text>
            </View>
            <View style={styles.metricBoxThree}>
              <Text style={styles.metricValue}>{data.escalated_count}</Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_escalated_to_mt', 'Diescalate Kpd MT')}</Text>
            </View>
          </View>
        </View>

        {/* 3. Analisis Mengikut Kategori */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitleText}>{t('kebajikan:pdf_sec3_title', '3. Analisis Kategori Aduan')}</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableHeaderItem, { flex: 3, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>{t('kebajikan:pdf_th_category', 'Kategori')}</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>{t('kebajikan:pdf_th_received', 'Diterima')}</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>{t('kebajikan:pdf_th_resolved', 'Selesai')}</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1, textAlign: 'center' }]}><Text>{t('kebajikan:pdf_th_percentage', 'Peratusan')}</Text></View>
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
              <View style={styles.tableRowLast}><View style={styles.tableCell}><Text>{t('kebajikan:pdf_no_data', 'Tiada Data')}</Text></View></View>
            )}
          </View>
        </View>

        {/* 4. Prestasi Tanggungjawab (Assignees) */}
        <View style={styles.section} wrap={false}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitleText}>{t('kebajikan:pdf_sec4_title', '4. Prestasi Ahli Bertugas')}</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableHeaderItem, { flex: 3, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>{t('kebajikan:pdf_th_staff_name', 'Nama Staf/Exco')}</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>{t('kebajikan:pdf_th_assigned', 'Di-assign')}</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>{t('kebajikan:pdf_th_resolved', 'Selesai')}</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1.5, textAlign: 'center' }]}><Text>{t('kebajikan:pdf_th_avg_time', 'Purata Masa')}</Text></View>
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
              <View style={styles.tableRowLast}><View style={styles.tableCell}><Text>{t('kebajikan:pdf_no_assigned_records', 'Tiada Tugasan Rekod')}</Text></View></View>
            )}
          </View>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        {/* Document Header Page 2 */}
        <View style={styles.headerContainer}>
          <Text style={styles.docTitle}>{t('kebajikan:pdf_report_title_continued', 'Laporan Prestasi E-Kebajikan (Sambungan)')}</Text>
          <Text style={styles.docSubtitle}>{t('kebajikan:pdf_edition_only', 'Edisi: {{month}}', { month: monthLabel })}</Text>
        </View>

        {/* 5. Kepuasan Pelajar */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitleText}>{t('kebajikan:pdf_sec5_title', '5. Penilaian Pelajar')}</Text>
            <Text style={styles.sectionSubtitleText}>{t('kebajikan:pdf_sec5_subtitle', 'Kadar kepuasan setelah aduan/tiket ditutup')}</Text>
          </View>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.avg_rating ?? '-'}/5</Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_avg_rating', 'Purata Rating')}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.satisfied_count}</Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_satisfied', 'Puas Hati')}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.neutral_count}</Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_neutral', 'Neutral')}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{data.unsatisfied_count}</Text>
              <Text style={styles.metricLabel}>{t('kebajikan:pdf_metric_unsatisfied', 'Tidak Puas')}</Text>
            </View>
          </View>

          {data.top_comments.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.textSm}>{t('kebajikan:pdf_selected_reviews', 'Ulasan Terpilih:')}</Text>
              {data.top_comments.map((c, i) => (
                <View key={i} style={{ padding: 6, backgroundColor: '#f8fafc', marginBottom: 4, borderRadius: 4 }}>
                  <Text style={[styles.textBase, styles.italic]}>"{c.comment}" — ({c.rating} {t('kebajikan:pdf_stars', 'Bintang')})</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 6. Isu Kritikal: Tertunggak / Escalated */}
        <View style={styles.section}>
          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitleText}>{t('kebajikan:pdf_sec6_title', '6. Senarai Tiket Masih Tertunggak (Pending)')}</Text>
            <Text style={styles.sectionSubtitleText}>{t('kebajikan:pdf_sec6_subtitle', 'Aduan yang memerlukan perhatian dalam bulan seterusnya')}</Text>
          </View>
          
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableHeaderItem, { flex: 1.5, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>{t('kebajikan:pdf_th_ticket_no', 'No. Tiket')}</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 2, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>{t('kebajikan:pdf_th_category', 'Kategori')}</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>{t('kebajikan:pdf_th_open_time', 'Masa Dibuka')}</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 1.5, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>{t('kebajikan:pdf_th_status', 'Status')}</Text></View>
              <View style={[styles.tableHeaderItem, { flex: 2 }]}><Text>{t('kebajikan:pdf_th_assigned_staff', 'Staf Bertugas')}</Text></View>
            </View>
            {data.pending_tickets.map((ticket, i, arr) => (
              <View key={ticket.ticket_no} style={i === arr.length - 1 ? styles.tableRowLast : styles.tableRow}>
                <View style={[styles.tableCell, { flex: 1.5, borderRightWidth: 1, borderRightColor: '#cbd5e1', fontWeight: 'bold' }]}><Text>{ticket.ticket_no}</Text></View>
                <View style={[styles.tableCell, { flex: 2, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>{KEBAJIKAN_CATEGORY_LABELS[ticket.category as KebajikanTicketCategory] || ticket.category}</Text></View>
                <View style={[styles.tableCell, { flex: 1, borderRightWidth: 1, borderRightColor: '#cbd5e1', textAlign: 'center' }]}><Text>{ticket.days_open} {t('kebajikan:pdf_days', 'hari')}</Text></View>
                <View style={[styles.tableCell, { flex: 1.5, borderRightWidth: 1, borderRightColor: '#cbd5e1' }]}><Text>{getStatusLabel(ticket.status)}</Text></View>
                <View style={[styles.tableCell, { flex: 2 }]}><Text>{ticket.assigned_to}</Text></View>
              </View>
            ))}
            {data.pending_tickets.length === 0 && (
              <View style={styles.tableRowLast}><View style={styles.tableCell}><Text>{t('kebajikan:pdf_congrats_no_pending', 'Tahniah! Tiada tiket yang tertunggak.')}</Text></View></View>
            )}
          </View>
        </View>

        {/* Footer info across pages */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{t('kebajikan:pdf_footer_org', 'Jawatankuasa Perwakilan Pelajar (JPP) Politeknik Sultan Haji Ahmad Shah')}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => t('kebajikan:pdf_page_number_of', 'Muka Surat {{pageNumber}} daripada {{totalPages}}', { pageNumber, totalPages })} />
        </View>
      </Page>
    </Document>
  );
}
