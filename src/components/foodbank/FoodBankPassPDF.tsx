import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { FoodBankApplication } from '@/types';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 36,
    fontFamily: 'Helvetica',
  },
  header: {
    borderBottomWidth: 3,
    borderBottomColor: '#be123c',
    paddingBottom: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  headerSub: { fontSize: 9, color: '#64748b', textTransform: 'uppercase', marginTop: 2 },
  headerBadge: {
    backgroundColor: '#be123c',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 3,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', marginBottom: 16 },
  col: { flex: 1, paddingRight: 12 },
  label: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 3 },
  value: { fontSize: 11, color: '#0f172a', fontWeight: 'bold' },
  valueMono: { fontSize: 10, color: '#334155', fontFamily: 'Courier' },
  section: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemName: { fontSize: 10, color: '#334155' },
  itemQty: { fontSize: 10, color: '#0f172a', fontWeight: 'bold' },
  qrWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 14,
    marginTop: 4,
  },
  qrImage: { width: 110, height: 110 },
  token: { fontSize: 9, fontFamily: 'Courier', color: '#475569', marginTop: 6 },
  note: { fontSize: 8, color: '#94a3b8', marginTop: 4, lineHeight: 1.4 },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

interface FoodBankPassPDFProps {
  application: FoodBankApplication;
  qrDataUrl: string;
  studentName: string;
  studentMatric: string;
  studentProgramme: string;
  residence: string;
  statusLabel: string;
}

const fmtDate = (d?: string | null) => {
  if (!d) return '-';
  try {
    const dt = new Date(`${d}T00:00:00`);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
};

export function FoodBankPassPDF({
  application,
  qrDataUrl,
  studentName,
  studentMatric,
  studentProgramme,
  residence,
  statusLabel,
}: FoodBankPassPDFProps) {
  const items = application.selected_items || [];
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Pas Pengambilan Food Bank</Text>
            <Text style={styles.headerSub}>JPP POLISAS • E-Kebajikan &amp; Food Bank</Text>
          </View>
          <Text style={styles.headerBadge}>{statusLabel}</Text>
        </View>

        {/* Pelajar */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Nama Mahasiswa</Text>
            <Text style={styles.value}>{studentName}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>No. Matrik</Text>
            <Text style={styles.value}>{studentMatric}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Program</Text>
            <Text style={styles.value}>{studentProgramme}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Tempat Tinggal</Text>
            <Text style={styles.value}>{residence}</Text>
          </View>
        </View>

        {/* Temujanji */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Butiran Temujanji Pengambilan</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>No. Permohonan</Text>
              <Text style={styles.valueMono}>{application.application_no || '-'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Tarikh Pengambilan</Text>
              <Text style={styles.value}>{fmtDate(application.pickup_date)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Slot Masa</Text>
              <Text style={styles.value}>{application.pickup_time_slot || '-'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Pusat Agihan</Text>
              <Text style={styles.value}>{application.location?.name || '-'}</Text>
            </View>
          </View>
          {application.location?.room_detail ? (
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Lokasi Terperinci</Text>
                <Text style={styles.value}>{application.location.room_detail}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Barangan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Senarai Barangan Diluluskan</Text>
          {items.length === 0 ? (
            <Text style={styles.note}>Tiada barangan.</Text>
          ) : (
            items.map((it, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {it.item_name} ({it.unit || 'unit'})
                </Text>
                <Text style={styles.itemQty}>x{it.quantity}</Text>
              </View>
            ))
          )}
        </View>

        {/* QR */}
        <View style={styles.qrWrap}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.label}>Kod QR Pengesahan</Text>
            <Text style={styles.token}>{application.pickup_qr_code || application.application_no || '-'}</Text>
            <Text style={styles.note}>
              Sila imbas atau tunjukkan kod QR ini di kaunter agihan. Pegawai akan mengesahkan
              pengambilan secara automatik.
            </Text>
          </View>
          {qrDataUrl ? <Image src={qrDataUrl} style={styles.qrImage} /> : null}
        </View>

        <Text style={styles.footer}>
          SISTEM E-KEBAJIKAN &amp; FOOD BANK JPP POLISAS • VERIFIKASI DIGITAL KAMPUS
        </Text>
      </Page>
    </Document>
  );
}

export default FoodBankPassPDF;
