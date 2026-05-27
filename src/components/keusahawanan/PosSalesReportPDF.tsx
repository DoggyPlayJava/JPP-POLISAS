import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer';
import { StatsData } from '@/hooks/usePosData';

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
    color: '#111111',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
    paddingRight: 16,
  },
  headerLeftTextContainer: {
    flexShrink: 1,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    objectFit: 'contain',
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
  },
  businessName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 20,
    color: '#111111',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  reportSubtitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerRightText: {
    textAlign: 'right',
  },
  badge: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 6,
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  metaText: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  
  // ── Executive Summary ──
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#111111',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    paddingBottom: 4,
    marginBottom: 10,
    marginTop: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 10,
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '31%',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  summarySub: {
    fontSize: 8,
    color: '#ef4444',
    marginTop: 4,
  },
  summarySubGreen: {
    fontSize: 8,
    color: '#22c55e',
    marginTop: 4,
  },
  
  // ── Tables ──
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#111',
    alignItems: 'center',
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    color: '#111',
    paddingRight: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
    paddingRight: 8,
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
  },
  w5: { width: '5%' },
  w10: { width: '10%' },
  w15: { width: '15%' },
  w20: { width: '20%' },
  w40: { width: '40%' },
  w45: { width: '45%' },
  w50: { width: '50%' },
  textRight: { textAlign: 'right' },
  textCenter: { textAlign: 'center' },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sigBlock: {
    width: 200,
  },
  sigLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 40,
  },
  sigLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    marginBottom: 6,
  },
  sigName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#111111',
  },
  sigRole: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
});

// ── Types ────────────────────────────────────────────────────────────────────
interface PosSalesReportPDFProps {
  businessName: string;
  businessLogo?: string;
  themeColor: string;
  stats: StatsData;
  rangeLabel: string;
  dateRangeString: string;
  generatedBy: string;
  generationDate: string;  
}

const fmtRM = (v: number) => `RM ${v.toFixed(2)}`;

// ── Component ────────────────────────────────────────────────────────────────
export function PosSalesReportPDF({
  businessName, businessLogo, themeColor, stats, rangeLabel, dateRangeString, generatedBy, generationDate
}: PosSalesReportPDFProps) {
  
  return (
    <Document>
      <Page size="A4" style={s.page}>
        
        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {businessLogo ? (
              <Image src={businessLogo} style={s.logo} />
            ) : (
              <View style={[s.logoPlaceholder, { backgroundColor: themeColor }]}>
                <Text style={s.logoPlaceholderText}>{businessName.charAt(0)}</Text>
              </View>
            )}
            <View style={s.headerLeftTextContainer}>
              <Text style={s.businessName}>{businessName}</Text>
              <Text style={s.reportSubtitle}>Laporan Prestasi & Jualan</Text>
            </View>
          </View>
          <View style={s.headerRightText}>
            <Text style={[s.badge, { backgroundColor: themeColor }]}>Tempoh: {rangeLabel}</Text>
            <Text style={[s.metaText, { fontFamily: 'Helvetica-Bold', marginBottom: 6, color: '#111' }]}>{dateRangeString}</Text>
            <Text style={s.metaText}>Janaan: {generationDate}</Text>
            <Text style={s.metaText}>Oleh: {generatedBy}</Text>
          </View>
        </View>

        {/* ── EXECUTIVE SUMMARY ── */}
        <Text style={s.sectionTitle}>Ringkasan Eksekutif</Text>
        <View style={s.summaryGrid}>
          {/* Row 1 */}
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Tunai Kasar (Tunai+Bank)</Text>
            <Text style={[s.summaryValue, { color: themeColor }]}>{fmtRM((stats as any).totalCashCollected ?? stats.totalRevenue)}</Text>
            <Text style={s.metaText}>Selesai: {fmtRM(stats.totalRevenue)}</Text>
            <Text style={s.metaText}>Pending QR: {fmtRM((stats as any).onlinePendingRevenue ?? 0)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Jumlah Perbelanjaan</Text>
            <Text style={[s.summaryValue, { color: '#ef4444' }]}>{fmtRM(stats.totalExpenses)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Untung Bersih (Anggaran)</Text>
            <Text style={s.summaryValue}>{fmtRM(stats.netProfit)}</Text>
            {stats.netProfit >= 0 ? (
              <Text style={s.summarySubGreen}>✅ Untung</Text>
            ) : (
              <Text style={s.summarySub}>🔴 Rugi</Text>
            )}
          </View>

          {/* Row 2 */}
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Transaksi & Unit</Text>
            <Text style={s.summaryValue}>{stats.transactionCount} Txn</Text>
            <Text style={s.metaText}>Total unit dijual: {stats.unitsSold}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Purata Pesanan (AOV)</Text>
            <Text style={s.summaryValue}>{fmtRM(stats.averageOrderValue)}</Text>
            <Text style={s.metaText}>Per transaksi</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Diskaun Diberi</Text>
            <Text style={s.summaryValue}>{fmtRM(stats.totalDiscounts)}</Text>
            <Text style={s.metaText}>Potongan / Promo</Text>
          </View>
        </View>

        {/* ── TOP PRODUCTS ── */}
        <Text style={s.sectionTitle}>Prestasi Produk Terjual</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.w10, s.textCenter]}>Rank</Text>
            <Text style={[s.tableHeaderCell, s.w50]}>Nama Produk</Text>
            <Text style={[s.tableHeaderCell, s.w20, s.textCenter]}>Unit Terjual</Text>
            <Text style={[s.tableHeaderCell, s.w20, s.textRight]}>Jumlah (RM)</Text>
          </View>
          {stats.topProducts.length === 0 ? (
            <View style={s.tableRow}>
              <Text style={[s.tableCell, { width: '100%', textAlign: 'center', paddingVertical: 10 }]}>Tiada rekod jualan dalam tempoh ini.</Text>
            </View>
          ) : (
            stats.topProducts.map((p, i) => (
              <View key={i} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableCellBold, s.w10, s.textCenter]}>{i + 1}</Text>
                <Text style={[s.tableCell, s.w50]}>{p.name.toUpperCase()}</Text>
                <Text style={[s.tableCell, s.w20, s.textCenter]}>{p.units}</Text>
                <Text style={[s.tableCellBold, s.w20, s.textRight, { color: themeColor }]}>{fmtRM(p.revenue)}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── EXPENSE DETAILS ── */}
        <Text style={s.sectionTitle}>Butiran Perbelanjaan Operasi</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.w15]}>Tarikh</Text>
            <Text style={[s.tableHeaderCell, s.w45]}>Butiran</Text>
            <Text style={[s.tableHeaderCell, s.w20]}>Kategori</Text>
            <Text style={[s.tableHeaderCell, s.w20, s.textRight, { paddingRight: 0 }]}>Jumlah (RM)</Text>
          </View>
          {stats.expenseItems?.length === 0 ? (
            <View style={s.tableRow}>
              <Text style={[s.tableCell, { width: '100%', textAlign: 'center', paddingVertical: 10 }]}>Tiada perbelanjaan direkodkan.</Text>
            </View>
          ) : (
            stats.expenseItems?.map((e, i) => (
              <View key={i} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableCell, s.w15]}>{new Date(e.expense_date).toLocaleDateString('en-GB')}</Text>
                <Text style={[s.tableCell, s.w45]}>{e.description}</Text>
                <Text style={[s.tableCell, s.w20]}>{e.category}</Text>
                <Text style={[s.tableCellBold, s.w20, s.textRight, { color: '#ef4444', paddingRight: 0 }]}>{fmtRM(e.amount)}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <View style={s.sigBlock}>
            <Text style={s.sigLabel}>Disahkan oleh:</Text>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{generatedBy}</Text>
            <Text style={s.sigRole}>Pengurus Perniagaan</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
