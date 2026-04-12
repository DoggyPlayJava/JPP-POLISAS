import React from 'react';
import {
  Page, Text, View, Document, StyleSheet, Image, PDFViewer, pdf,
} from '@react-pdf/renderer';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer } from 'lucide-react';
import { BusinessTransaction } from '@/types';

// ── PDF Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
    color: '#111111',
  },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 48, height: 48, borderRadius: 8 },
  logoPlaceholder: { width: 48, height: 48, backgroundColor: '#6d28d9', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  logoPlaceholderText: { color: '#fff', fontSize: 20, fontFamily: 'Helvetica-Bold' },
  businessName: { fontFamily: 'Helvetica-Bold', fontSize: 16, color: '#111111', textTransform: 'uppercase' },
  invoiceBadge: { backgroundColor: '#111111', color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
  // Meta row
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  metaBlock: { gap: 3 },
  metaLine: { flexDirection: 'row', gap: 4 },
  metaLabel: { color: '#6b7280', width: 60 },
  metaValue: { fontFamily: 'Helvetica-Bold', color: '#111111' },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: '#7c3aed', padding: 8, borderRadius: 4, marginBottom: 4 },
  tableHeaderCell: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 9, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tableCell: { color: '#111111', fontSize: 9 },
  colSl:    { width: '8%' },
  colItem:  { width: '42%' },
  colQty:   { width: '15%', textAlign: 'center' as const },
  colPrice: { width: '17%', textAlign: 'right' as const },
  colTotal: { width: '18%', textAlign: 'right' as const },
  // Summary
  summarySection: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between' },
  paymentNote: { fontSize: 9, color: '#6b7280', marginTop: 4 },
  summaryBox: { width: '45%' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  summaryLabel: { color: '#374151', fontSize: 9 },
  summaryValue: { color: '#111111', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  payableRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#7c3aed', padding: 6, borderRadius: 4, marginVertical: 4 },
  payableLabel: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  payableValue: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  // Footer
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  footerBlock: { alignItems: 'center', width: '40%' },
  signatureLine: { width: '100%', borderBottomWidth: 1, borderBottomColor: '#111111', marginBottom: 6 },
  footerLabel: { fontSize: 8, color: '#6b7280', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ── Invoice PDF Document ──────────────────────────────────────────────────────

interface InvoiceData {
  invoiceNumber:  string;
  businessName:   string;
  businessLogo?:  string | null;
  serverName?:    string | null;
  customerName?:  string | null;
  items:          { name: string; qty: number; unit_price: number; total_price: number }[];
  subtotal:       number;
  discountRM?:    number;
  discountNote?:  string | null;
  totalAmount:    number;
  paymentMethod?: string;
  receivedAmount?:number | null;
  changeAmount?:  number | null;
  createdAt:      string;
}

const fmtRM = (v: number | null | undefined) => v != null ? `RM${v.toFixed(2)}` : 'RM0.00';
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
};

function InvoiceDocument({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {data.businessLogo ? (
              <Image src={data.businessLogo} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>{data.businessName.charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.businessName}>{data.businessName}</Text>
          </View>
          <Text style={styles.invoiceBadge}>INVOICE</Text>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Bill To</Text>
              <Text style={styles.metaValue}>{data.customerName || 'Guest'}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Mobile</Text>
              <Text style={styles.metaValue}>{data.customerName || 'Guest'}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Address</Text>
              <Text style={styles.metaValue}> </Text>
            </View>
          </View>
          <View style={styles.metaBlock}>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Sells By</Text>
              <Text style={styles.metaValue}>{data.serverName || 'Staff'}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Invoice</Text>
              <Text style={styles.metaValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.metaLine}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{fmtDate(data.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colSl]}>SL</Text>
          <Text style={[styles.tableHeaderCell, styles.colItem]}>Item</Text>
          <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total Price</Text>
        </View>

        {/* Table rows */}
        {data.items.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colSl]}>{i + 1}</Text>
            <Text style={[styles.tableCell, styles.colItem]}>{item.name.toUpperCase()}</Text>
            <Text style={[styles.tableCell, styles.colQty]}>{item.qty}</Text>
            <Text style={[styles.tableCell, styles.colPrice]}>{fmtRM(item.unit_price)}</Text>
            <Text style={[styles.tableCell, styles.colTotal]}>{fmtRM(item.total_price)}</Text>
          </View>
        ))}

        {/* Summary */}
        <View style={styles.summarySection}>
          <View>
            <Text style={styles.paymentNote}>Paid using : {
              data.paymentMethod === 'CASH' ? 'Cash' :
              data.paymentMethod === 'QR'   ? 'QR Code' : 'Bank Transfer'
            }</Text>
          </View>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal :</Text>
              <Text style={styles.summaryValue}>{fmtRM(data.subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vat :</Text>
              <Text style={styles.summaryValue}>RM0</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping Charge :</Text>
              <Text style={styles.summaryValue}>RM0</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount :</Text>
              <Text style={styles.summaryValue}>{fmtRM(data.discountRM || 0)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount :</Text>
              <Text style={styles.summaryValue}>{fmtRM(data.totalAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rounding(+/-) :</Text>
              <Text style={styles.summaryValue}>RM0</Text>
            </View>
            <View style={styles.payableRow}>
              <Text style={styles.payableLabel}>Payable Amount :</Text>
              <Text style={styles.payableValue}>{fmtRM(data.totalAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Receive Amount :</Text>
              <Text style={styles.summaryValue}>{fmtRM(data.receivedAmount ?? data.totalAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Change Amount :</Text>
              <Text style={styles.summaryValue}>{fmtRM(data.changeAmount ?? 0)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.footerLabel}>Customer Signature</Text>
          </View>
          <View style={styles.footerBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.footerLabel}>Authorized Signature</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ── Modal Wrapper (browser-side) ──────────────────────────────────────────────

interface EInvoiceModalProps {
  transaction: any;  // BusinessTransaction + extra display fields
  onClose: () => void;
}

export function EInvoiceModal({ transaction: txn, onClose }: EInvoiceModalProps) {
  const data: InvoiceData = {
    invoiceNumber:  txn.invoice_number,
    businessName:   txn.businessName   || 'Perniagaan',
    businessLogo:   txn.businessLogo   || null,
    serverName:     txn.serverName     || txn.server?.full_name || null,
    customerName:   txn.customer_name  || null,
    items:          Array.isArray(txn.items) ? txn.items : [],
    subtotal:       txn.subtotal       ?? 0,
    discountRM:     txn.discountRM     ?? txn.discount_amount ?? 0,
    discountNote:   txn.discount_note  ?? null,
    totalAmount:    txn.totalAmount    ?? txn.total_amount ?? 0,
    paymentMethod:  txn.payment_method || 'CASH',
    receivedAmount: txn.received_amount ?? null,
    changeAmount:   txn.changeAmount   ?? txn.change_amount ?? 0,
    createdAt:      txn.created_at     || new Date().toISOString(),
  };

  const handleDownload = async () => {
    const blob = await pdf(<InvoiceDocument data={data} />).toBlob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${data.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl h-[90vh] bg-card rounded-3xl overflow-hidden border border-border shadow-2xl flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm z-10 shrink-0">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">E-Invoice</p>
              <p className="text-sm font-black text-foreground">{data.invoiceNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleDownload}
                className="flex items-center gap-2 h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black uppercase tracking-wider transition-colors">
                <Download className="w-3.5 h-3.5" /> Muat Turun
              </button>
              <button onClick={onClose}
                className="w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* PDF Viewer */}
          <div className="flex-1 overflow-hidden">
            <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
              <InvoiceDocument data={data} />
            </PDFViewer>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
