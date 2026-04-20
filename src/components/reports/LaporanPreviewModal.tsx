/**
 * LaporanPreviewModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal pratonton laporan PDF — mengikut pattern EInvoiceModal.tsx.
 *
 * Toolbar:
 *   [✕ Tutup]  [⬇ DOCX Editable ⚠]  [🚀 Hantar Laporan]
 *
 * Butang "Hantar" memanggil callback onSubmit() yang disediakan oleh parent.
 * Butang "DOCX" memaparkan amaran inline, kemudian muat turun DOCX.
 * Modal TIDAK menutup sendiri kecuali selepas onSubmit() berjaya atau user
 * klik ✕.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Send, AlertTriangle, Loader2 } from 'lucide-react';
import { LaporanPDFTemplate } from '@/components/reports/LaporanPDFTemplate';
import { generateLaporanDocx } from '@/lib/generateLaporanDocx';
import { toast } from 'react-hot-toast';

// ── Props ──────────────────────────────────────────────────────────────────────

export interface LaporanPreviewModalProps {
  // Template data (mirrors LaporanPDFTemplate props)
  clubName: string;
  monthYear: string;
  activities: any[];
  submitterName?: string;
  submitterRole?: string;
  submitterUnit?: string;
  presidenName?: string;
  reviewerRole?: string;
  reviewerUnit?: string;
  clubLogoUrl?: string;
  /** Aktifkan layout khusus Exco JPP dalam PDF */
  isExco?: boolean;
  /** Nama fail DOCX yang akan dimuat turun (tanpa extension) */
  fileName?: string;
  // Callbacks
  onClose: () => void;
  /** Dipanggil bila user klik "Hantar Laporan". Parent bertanggungjawab untuk
   *  generate PDF blob, upload Drive, dan save ke database.
   *  Haru throw error jika gagal (modal akan kekal terbuka). */
  onSubmit: () => Promise<void>;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function LaporanPreviewModal({
  clubName,
  monthYear,
  activities,
  submitterName,
  submitterRole,
  submitterUnit,
  presidenName,
  reviewerRole,
  reviewerUnit,
  clubLogoUrl,
  isExco,
  fileName,
  onClose,
  onSubmit,
}: LaporanPreviewModalProps) {
  const [submitting, setSubmitting]           = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [showDocxWarning, setShowDocxWarning] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit();
      onClose();
    } catch {
      // Error toast dipaparkan oleh parent
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocxDownload = async () => {
    setShowDocxWarning(false);
    setDownloadingDocx(true);
    try {
      await generateLaporanDocx({
        clubName,
        monthYear,
        activities,
        submitterName,
        submitterRole,
        submitterUnit,
        presidenName,
        reviewerRole,
        reviewerUnit,
        clubLogoUrl,
        fileName: fileName || `Laporan_${clubName}_${monthYear}`,
      });
      toast.success('DOCX berjaya dimuat turun!');
    } catch (err: any) {
      toast.error('Gagal jana DOCX: ' + (err?.message || 'Ralat tidak diketahui'));
    } finally {
      setDownloadingDocx(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl h-[92vh] bg-card rounded-3xl overflow-hidden border border-border shadow-2xl flex flex-col"
        >
          {/* ── Toolbar ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/95 backdrop-blur-sm shrink-0 gap-3">
            {/* Title */}
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Pratonton Laporan
              </p>
              <p className="text-sm font-black text-foreground truncate">
                {clubName} — {monthYear}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">

              {/* DOCX Button + Warning Popover */}
              <div className="relative">
                <button
                  id="btn-docx-download"
                  onClick={() => setShowDocxWarning(v => !v)}
                  disabled={downloadingDocx}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-wider transition-colors border border-amber-500/20 disabled:opacity-50"
                >
                  {downloadingDocx
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />}
                  DOCX Editable
                </button>

                {/* Inline warning dropdown */}
                <AnimatePresence>
                  {showDocxWarning && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className="absolute right-0 top-11 w-72 bg-card border border-border rounded-2xl p-4 shadow-2xl z-20"
                    >
                      <div className="flex gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          DOCX ini <strong className="text-foreground">tiada watermark</strong> dan{' '}
                          <strong className="text-foreground">tidak disimpan dalam sistem</strong>.
                          Selepas selesai edit, sila hantar melalui{' '}
                          <strong className="text-foreground">Muat Naik Manual</strong>.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDocxWarning(false)}
                          className="flex-1 h-8 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground text-[10px] font-black uppercase tracking-wider transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleDocxDownload}
                          className="flex-1 h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider transition-colors"
                        >
                          OK, Muat Turun
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Hantar / Submit */}
              <button
                id="btn-hantar-laporan"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-60"
              >
                {submitting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />}
                {submitting ? 'Menghantar...' : 'Hantar Laporan'}
              </button>

              {/* Close */}
              <button
                id="btn-close-preview"
                onClick={onClose}
                disabled={submitting}
                className="w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── PDF Viewer ───────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden">
            <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
              <LaporanPDFTemplate
                clubName={clubName}
                monthYear={monthYear}
                activities={activities}
                submitterName={submitterName}
                submitterRole={submitterRole}
                submitterUnit={submitterUnit}
                presidenName={presidenName}
                reviewerRole={reviewerRole}
                reviewerUnit={reviewerUnit}
                clubLogoUrl={clubLogoUrl}
                isExco={isExco}
              />
            </PDFViewer>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
