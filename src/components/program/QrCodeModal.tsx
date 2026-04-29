/**
 * QrCodeModal.tsx
 * Modal premium untuk papar, muat turun & share QR Check-in Program.
 * Menggunakan library `qrcode` (node) untuk generate canvas → PNG.
 * Dipanggil dari ActivityKelabCard & ProgramCard apabila qr_enabled = true.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { toast } from 'react-hot-toast';
import {
  X, Download, Copy, Share2, QrCode,
  Loader2, ExternalLink, Smartphone, Trophy,
  Clock, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { ms } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────
interface QrCodeModalProps {
  open: boolean;
  onClose: () => void;
  program: {
    id: string;
    type: 'takwim' | 'aktiviti';
    title: string;
    qr_token: string;
    merit_kelab?: number;
    merit_eakademik?: number;
    qr_open_at?: string | null;
    qr_close_at?: string | null;
    date?: string | null;
    venue?: string | null;
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function QrCodeModal({ open, onClose, program }: QrCodeModalProps) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const [ready, setReady]       = useState(false);
  const [imgSrc, setImgSrc]     = useState<string>('');
  const [copied, setCopied]     = useState(false);

  const attendUrl = `${window.location.origin}/program/attend/${program.qr_token}`;

  // ─── Generate QR image ────────────────────────────────────────────────────
  const generateQr = useCallback(async () => {
    if (!open) return;
    setReady(false);
    try {
      // Render ke data URL terus (tanpa canvas DOM)
      const url = await QRCode.toDataURL(attendUrl, {
        errorCorrectionLevel: 'H',
        width: 400,
        margin: 2,
        color: {
          dark:  '#0f172a',   // slate-950 — gelap untuk contrast
          light: '#f8fafc',   // slate-50
        },
      });
      setImgSrc(url);
      setReady(true);
    } catch (err) {
      toast.error('Gagal menjana QR kod.');
    }
  }, [open, attendUrl]);

  useEffect(() => { generateQr(); }, [generateQr]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!imgSrc) return;
    const link = document.createElement('a');
    link.href  = imgSrc;
    link.download = `QR_${program.title.replace(/\s+/g, '_').slice(0, 30)}.png`;
    link.click();
    toast.success('QR berjaya dimuat turun!');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(attendUrl);
      setCopied(true);
      toast.success('Link QR disalin!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Gagal menyalin.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Daftar Hadir: ${program.title}`,
          text:  `Scan QR atau klik link untuk daftar hadir program ini.`,
          url:   attendUrl,
        });
      } catch { /* User cancelled */ }
    } else {
      handleCopy();
    }
  };

  const formatDT = (d?: string | null) => {
    if (!d) return null;
    try {
      const parsed = parseISO(d);
      if (!isValid(parsed)) return d;
      return format(parsed, "d MMM, h:mm a", { locale: ms });
    } catch { return d; }
  };

  const typeLabel = program.type === 'takwim' ? 'Takwim Rasmi' : 'Aktiviti Kelab';
  const typeColor = program.type === 'takwim'
    ? 'bg-primary/15 text-primary border-primary/25'
    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-sm pointer-events-auto">
              <div className="rounded-[2.5rem] bg-slate-900 border border-white/[0.07] shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      'inline-block text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border mb-2',
                      typeColor
                    )}>
                      {typeLabel}
                    </span>
                    <h2 className="text-base font-black text-white leading-tight line-clamp-2 pr-2">
                      {program.title}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0 mt-0.5"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* QR Display */}
                <div className="px-6 pb-4">
                  <div className="relative rounded-[1.5rem] bg-slate-50 p-4 flex items-center justify-center overflow-hidden">
                    {/* Decorative corners */}
                    <CornerMarks />

                    {!ready ? (
                      <div className="w-[200px] h-[200px] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                      </div>
                    ) : (
                      <motion.img
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        src={imgSrc}
                        alt="QR Check-in"
                        className="w-[200px] h-[200px] rounded-lg"
                      />
                    )}

                    {/* QR icon watermark */}
                    <div className="absolute bottom-3 right-3 w-7 h-7 rounded-lg bg-slate-900/10 flex items-center justify-center">
                      <QrCode size={14} className="text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Info strip */}
                <div className="px-6 pb-4 space-y-2">
                  {/* Window masa */}
                  {(program.qr_open_at || program.qr_close_at) && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                      <Clock size={12} className="text-amber-400 shrink-0" />
                      <p className="text-[10px] font-bold text-slate-400">
                        {program.qr_open_at ? formatDT(program.qr_open_at) : '—'}
                        {' → '}
                        {program.qr_close_at ? formatDT(program.qr_close_at) : 'Tiada had'}
                      </p>
                    </div>
                  )}

                  {/* Merit badges */}
                  {(!!program.merit_kelab || !!program.merit_eakademik) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {!!program.merit_kelab && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/20">
                          <Trophy size={11} className="text-amber-400" />
                          <span className="text-[10px] font-black text-amber-300 uppercase tracking-wide">
                            +{program.merit_kelab} Merit Kelab
                          </span>
                        </div>
                      )}
                      {!!program.merit_eakademik && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/20">
                          <Trophy size={11} className="text-emerald-400" />
                          <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wide">
                            +{program.merit_eakademik} Merit Rasmi
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* URL preview */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                    <Smartphone size={11} className="text-slate-500 shrink-0" />
                    <p className="text-[9px] font-mono text-slate-500 truncate flex-1">
                      {attendUrl.replace('https://', '')}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-6 h-px bg-white/[0.05]" />

                {/* Action buttons */}
                <div className="p-4 grid grid-cols-3 gap-2">
                  <ActionBtn
                    icon={Download}
                    label="Muat Turun"
                    onClick={handleDownload}
                    disabled={!ready}
                    className="bg-primary hover:bg-primary/90 text-white"
                    iconColor="text-white"
                  />
                  <ActionBtn
                    icon={copied ? CheckCircle2 : Copy}
                    label={copied ? 'Disalin!' : 'Salin Link'}
                    onClick={handleCopy}
                    className={cn(copied ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.10]')}
                    iconColor={copied ? 'text-emerald-400' : 'text-slate-400'}
                    textColor={copied ? 'text-emerald-400' : 'text-slate-400'}
                  />
                  <ActionBtn
                    icon={Share2}
                    label="Share"
                    onClick={handleShare}
                    className="bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.10]"
                    iconColor="text-slate-400"
                    textColor="text-slate-400"
                  />
                </div>

                {/* Open in new tab */}
                <div className="px-4 pb-4">
                  <a
                    href={attendUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-10 rounded-2xl border border-white/[0.06] text-[10px] font-black text-slate-500 hover:text-slate-300 hover:border-white/[0.12] transition-colors uppercase tracking-widest"
                  >
                    <ExternalLink size={11} />
                    Buka Halaman QR
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionBtn({
  icon: Icon, label, onClick, disabled, className, iconColor, textColor
}: {
  icon: any; label: string; onClick: () => void;
  disabled?: boolean; className?: string; iconColor?: string; textColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border transition-all',
        'disabled:opacity-40 disabled:cursor-not-allowed active:scale-95',
        className
      )}
    >
      <Icon size={18} className={cn(iconColor)} />
      <span className={cn('text-[9px] font-black uppercase tracking-widest leading-none', textColor ?? 'text-white')}>
        {label}
      </span>
    </button>
  );
}

/** Dekoratif corner marks supaya QR nampak lebih "scanner-like" */
function CornerMarks() {
  const cls = 'absolute w-5 h-5 border-slate-300';
  return (
    <>
      <span className={cn(cls, 'top-2 left-2 border-t-2 border-l-2 rounded-tl-lg')} />
      <span className={cn(cls, 'top-2 right-2 border-t-2 border-r-2 rounded-tr-lg')} />
      <span className={cn(cls, 'bottom-2 left-2 border-b-2 border-l-2 rounded-bl-lg')} />
      <span className={cn(cls, 'bottom-2 right-2 border-b-2 border-r-2 rounded-br-lg')} />
    </>
  );
}
