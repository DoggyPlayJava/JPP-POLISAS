import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import type { EmsEvent } from '@/types';

export interface EmsQrCodeModalProps {
  event: EmsEvent | null;
  onClose: () => void;
}

export function EmsQrCodeModal({ event, onClose }: EmsQrCodeModalProps) {
  const [qrModalTab, setQrModalTab] = useState<'PARTICIPANT' | 'AUDIENCE'>('PARTICIPANT');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!event) return null;

  const registrationUrl = `${window.location.origin}/ems/e/${event.id}/register`;
  const audienceUrl = `${window.location.origin}/ems/v/${event.id}/scan`;
  const currentUrl = qrModalTab === 'AUDIENCE' ? audienceUrl : registrationUrl;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    toast.success(
      qrModalTab === 'AUDIENCE'
        ? 'Pautan QR Pengunjung disalin!'
        : 'Pautan QR Peserta disalin!'
    );
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 dark:bg-slate-950/80 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative text-slate-900 dark:text-white animate-in fade-in-50 zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
          aria-label="Tutup Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Kod QR Acara
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate px-4">
            {event.title}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setQrModalTab('PARTICIPANT')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              qrModalTab === 'PARTICIPANT'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            QR Peserta Pertandingan
          </button>
          <button
            type="button"
            onClick={() => setQrModalTab('AUDIENCE')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              qrModalTab === 'AUDIENCE'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            QR Pengunjung / Penonton
          </button>
        </div>

        {/* QR Code Render */}
        <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-inner border border-slate-100 dark:border-slate-700">
          <QRCodeSVG
            value={currentUrl}
            size={200}
            bgColor="#FFFFFF"
            fgColor="#0F172A"
            level="H"
          />
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-3 text-center break-all select-all">
            {currentUrl}
          </p>
        </div>

        {/* Copy Link Button */}
        <button
          type="button"
          onClick={handleCopyLink}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-98 ${
            qrModalTab === 'AUDIENCE'
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-amber-500/20'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
          }`}
        >
          {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>
            {copiedLink
              ? 'Berjaya Disalin!'
              : qrModalTab === 'AUDIENCE'
              ? 'Salin Pautan QR Pengunjung'
              : 'Salin Pautan QR Peserta'}
          </span>
        </button>
      </div>
    </div>
  );
}
