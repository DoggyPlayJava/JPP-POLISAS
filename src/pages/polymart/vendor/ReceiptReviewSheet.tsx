import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileQuestion,
  ExternalLink,
  User,
  Receipt,
  RotateCcw,
} from 'lucide-react';

export interface ReceiptReviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  receiptUrl: string | null;
  orderId: string;
  buyerName?: string;
  buyerMatric?: string;
  amount: number;
  paymentVerifiedAt?: string | null;
  paymentRejected?: boolean;
  onVerify: () => Promise<void>;
  onReject: () => Promise<void>;
  loading: boolean;
}

export const ReceiptReviewSheet: React.FC<ReceiptReviewSheetProps> = ({
  isOpen,
  onClose,
  receiptUrl,
  orderId,
  buyerName,
  buyerMatric,
  amount,
  paymentVerifiedAt,
  paymentRejected,
  onVerify,
  onReject,
  loading,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const formattedOrderId = orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : '#--------';
  const formattedAmount = `RM ${(Number(amount) || 0).toFixed(2)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
          {/* Backdrop click dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0"
            aria-label="Tutup Semakan Resit"
          />

          {/* Slide-Up Bottom Sheet Card */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg bg-card rounded-t-[2.25rem] sm:rounded-3xl border border-border/40 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden text-card-foreground"
          >
            {/* Ergonomic Drag Handle Pill */}
            <div className="pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20 mx-auto" />
            </div>

            {/* Header: Title, Order ID and Close Button */}
            <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-foreground tracking-tight truncate">
                    Semakan Resit Pembayaran
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-muted-foreground truncate">
                    Pesanan {formattedOrderId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted/60 hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground flex items-center justify-center transition-colors shrink-0"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Sheet Content */}
            <div className="px-5 py-4 overflow-y-auto space-y-4">
              {/* Buyer Metadata Badge & Amount */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-foreground truncate">
                      {buyerName || 'Pelajar'}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">
                      {buyerMatric ? buyerMatric : 'Tiada No. Matrik'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    Jumlah Bayaran
                  </span>
                  <span className="text-base sm:text-lg font-black text-amber-500 dark:text-amber-400">
                    {formattedAmount}
                  </span>
                </div>
              </div>

              {/* Status Alert Badges if already verified or rejected */}
              {paymentVerifiedAt && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Pembayaran Telah Disahkan!</span>
                </div>
              )}

              {paymentRejected && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Resit Telah Ditolak</span>
                </div>
              )}

              {/* Receipt Viewer Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span className="font-bold">Imej Bukti Resit</span>
                  {receiptUrl && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 1}
                        className="p-1 rounded-md bg-muted/60 hover:bg-muted text-foreground disabled:opacity-40 transition-colors"
                        title="Zum Keluar"
                        aria-label="Zum Keluar"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 2.5}
                        className="p-1 rounded-md bg-muted/60 hover:bg-muted text-foreground disabled:opacity-40 transition-colors"
                        title="Zum Masuk"
                        aria-label="Zum Masuk"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      {zoomLevel > 1 && (
                        <button
                          type="button"
                          onClick={handleResetZoom}
                          className="p-1 rounded-md bg-muted/60 hover:bg-muted text-foreground transition-colors"
                          title="Reset Zum"
                          aria-label="Reset Zum"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-md bg-muted/60 hover:bg-muted text-foreground transition-colors ml-1"
                        title="Buka Imej Asal"
                        aria-label="Buka Imej Asal"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border/70 overflow-hidden bg-zinc-950/5 dark:bg-zinc-950/40 relative min-h-[220px] max-h-[380px] flex items-center justify-center">
                  {receiptUrl ? (
                    <div className="w-full h-full max-h-[380px] overflow-auto flex items-center justify-center p-2">
                      <img
                        src={receiptUrl}
                        alt="Bukti Resit Pembayaran"
                        style={{
                          transform: `scale(${zoomLevel})`,
                          transformOrigin: 'center center',
                          transition: 'transform 0.2s ease-out',
                        }}
                        className="max-h-[350px] w-auto max-w-full object-contain rounded-lg shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                        <FileQuestion className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-muted-foreground">
                        Tiada fail resit dimuat naik
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer / Dual Ergonomic Thumb Action Buttons */}
            {!paymentVerifiedAt && !paymentRejected && (
              <div className="p-4 border-t border-border/40 bg-card/95 backdrop-blur-sm grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onReject}
                  disabled={loading}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 font-black rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  <span>Tolak Resit</span>
                </button>

                <button
                  type="button"
                  onClick={onVerify}
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl py-2.5 px-5 shadow-md flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>Sahkan Bayaran</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReceiptReviewSheet;
