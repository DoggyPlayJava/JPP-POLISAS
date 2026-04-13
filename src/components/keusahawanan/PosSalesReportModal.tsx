import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Loader2 } from 'lucide-react';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import { PosSalesReportPDF } from './PosSalesReportPDF';
import { StatsData } from '@/hooks/usePosData';
import toast from 'react-hot-toast';

interface PosSalesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: StatsData;
  selectedBusiness: any;
  rangeLabel: string;
  dateRangeString: string;
  themeColor: string;
  generatedBy: string;
}

export function PosSalesReportModal({
  isOpen, onClose, stats, selectedBusiness, rangeLabel, dateRangeString, themeColor, generatedBy
}: PosSalesReportModalProps) {
  const [generationDate, setGenerationDate] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGenerationDate(
        new Date().toLocaleString('ms-MY', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      );
    }
  }, [isOpen]);

  if (!isOpen || !selectedBusiness || !stats) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const doc = (
        <PosSalesReportPDF
          businessName={selectedBusiness.name}
          businessLogo={selectedBusiness.logo_url}
          themeColor={themeColor}
          stats={stats}
          rangeLabel={rangeLabel}
          dateRangeString={dateRangeString}
          generatedBy={generatedBy}
          generationDate={generationDate}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Jualan_${selectedBusiness.name.replace(/\s+/g, '_')}_${rangeLabel.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Laporan PDF berjaya dimuat turun!');
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat turun PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-5xl h-[90vh] bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
            <div>
              <h2 className="text-lg font-black text-foreground">Preview Laporan Jualan</h2>
              <p className="text-xs text-muted-foreground/70">Perniagaan: {selectedBusiness.name} | Tempoh: {rangeLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="h-10 px-4 rounded-xl text-white flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 hover:brightness-110"
                style={{ background: themeColor }}
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="text-[10px] font-black uppercase tracking-widest leading-none mt-0.5">
                  {downloading ? 'Muat Turun...' : 'Muat Turun PDF'}
                </span>
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PDF Viewer Body */}
          <div className="flex-1 bg-stone-100/50 p-2 overflow-hidden">
            <PDFViewer style={{ width: '100%', height: '100%', borderRadius: 16 }} showToolbar={true}>
              <PosSalesReportPDF
                businessName={selectedBusiness.name}
                businessLogo={selectedBusiness.logo_url}
                themeColor={themeColor}
                stats={stats}
                rangeLabel={rangeLabel}
                dateRangeString={dateRangeString}
                generatedBy={generatedBy}
                generationDate={generationDate}
              />
            </PDFViewer>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
