/**
 * FoodBankQrPassModal.tsx
 * Modal Pas Pengambilan Digital (Digital Boarding Pass Style) Food Bank JPP
 * Memaparkan kod QR, status langsung, maklumat temujanji, senarai barangan & pautan PolyMaps.
 */

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Calendar,
  Clock,
  ShoppingBag,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock3,
  User,
  Building,
  Sparkles,
  Layers,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { FoodBankApplication, FoodBankApplicationStatus } from '@/types';
import { Link } from 'react-router-dom';

interface FoodBankQrPassModalProps {
  open: boolean;
  onClose: () => void;
  application: FoodBankApplication | null;
  studentName?: string;
  studentMatric?: string;
  studentProgramme?: string;
  roomOrResidence?: string;
}

export function FoodBankQrPassModal({
  open,
  onClose,
  application,
  studentName,
  studentMatric,
  studentProgramme,
  roomOrResidence,
}: FoodBankQrPassModalProps) {
  const passRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!open || !application) return null;

  const appNo = application.application_no || 'FB-000000';
  const qrCodeToken = application.pickup_qr_code || appNo;
  const status: FoodBankApplicationStatus = application.status;

  const displayName =
    application.applicant?.full_name || studentName || 'Mahasiswa POLISAS';
  const displayMatric =
    application.applicant?.student_id || studentMatric || 'Matrik Tidak Dinyatakan';
  const displayProgramme = studentProgramme || 'POLISAS';
  const displayResidence =
    roomOrResidence ||
    (application.housing_type
      ? `${application.housing_type === 'KAMSIS' ? 'Kolej Kediaman (Kamsis)' : 'Rumah Sewa Luar Kampus'}`
      : 'Kolej Kediaman POLISAS');

  const polymapsBuildingId = application.location?.polymaps_building_id;
  const polymapsUrl = polymapsBuildingId
    ? `/polymaps?b=${polymapsBuildingId}`
    : '/polymaps';

  // Status Styling Configuration
  const getStatusBadge = () => {
    switch (status) {
      case 'MENUNGGU':
        return {
          label: 'Menunggu Semakan',
          subLabel: 'Permohonan diterima & menunggu giliran semakan.',
          bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
          dot: 'bg-amber-500',
          icon: Clock3,
          glow: 'shadow-amber-500/10',
        };
      case 'DALAM_SEMAKAN':
        return {
          label: 'Dalam Semakan',
          subLabel: 'Exco Kebajikan sedang menilai kuota & dokumen.',
          bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
          dot: 'bg-sky-500 animate-pulse',
          icon: ShieldCheck,
          glow: 'shadow-sky-500/10',
        };
      case 'LULUS':
        return {
          label: 'Lulus • Sedia Diambil',
          subLabel: 'Sedia untuk diambil di kaunter agihan.',
          bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-400 animate-ping',
          icon: CheckCircle2,
          glow: 'shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/50',
        };
      case 'SELESAI':
        return {
          label: 'Selesai Ditebus',
          subLabel: 'Bantuan telah berjaya diagihkan sepenuhnya.',
          bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-600',
          icon: CheckCircle2,
          glow: 'shadow-emerald-500/10',
        };
      case 'DITOLAK':
        return {
          label: 'Permohonan Ditolak',
          subLabel: application.rejection_reason || 'Tidak memenuhi kriteria permohonan semasa.',
          bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
          dot: 'bg-rose-500',
          icon: AlertCircle,
          glow: 'shadow-rose-500/10',
        };
      case 'BATAL':
      default:
        return {
          label: 'Dibatalkan',
          subLabel: 'Permohonan telah dibatalkan oleh pelajar.',
          bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
          dot: 'bg-slate-400',
          icon: AlertCircle,
          glow: 'shadow-slate-500/10',
        };
    }
  };

  const statusInfo = getStatusBadge();
  const StatusIcon = statusInfo.icon;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(qrCodeToken);
    setCopied(true);
    toast.success('Kod token pas disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    if (!passRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(passRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Pas_FoodBank_${appNo}.png`;
      a.click();
      toast.success('Pas digital berjaya dimuat turun!');
    } catch (err) {
      console.error('Error generating pass image:', err);
      toast.error('Gagal memuat turun imej pas.');
    } finally {
      setIsDownloading(false);
    }
  };

  const totalItemCount = application.selected_items?.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1),
    0
  ) || 0;

  return (
    <>
      {/* Print stylesheet to isolate the boarding pass */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #foodbank-printable-pass,
          #foodbank-printable-pass * {
            visibility: visible !important;
          }
          #foodbank-printable-pass {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 700px !important;
            margin: 0 auto !important;
            padding: 16px !important;
            background: white !important;
            color: #0f172a !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <AnimatePresence>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md">
          {/* Backdrop click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg my-auto"
          >
            {/* Action Bar Header above Pass */}
            <div className="no-print flex items-center justify-between mb-3 text-white px-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-white">
                    Pas Pengambilan Digital
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium">
                    Food Bank JPP POLISAS
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  className="h-8 px-2.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-lg gap-1.5"
                  title="Cetak Pas"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cetak</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isDownloading}
                  onClick={handleDownloadPng}
                  className="h-8 px-2.5 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30 rounded-lg gap-1.5"
                  title="Simpan Imej PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {isDownloading ? 'Menjana...' : 'Simpan'}
                  </span>
                </Button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors ml-1"
                  aria-label="Tutup modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ─── Boarding Pass Physical Card ─── */}
            <div
              id="foodbank-printable-pass"
              ref={passRef}
              className={cn(
                'rounded-3xl overflow-hidden shadow-2xl transition-all duration-300',
                'bg-white dark:bg-slate-900',
                'border border-slate-200/90 dark:border-amber-500/30',
                'text-slate-900 dark:text-slate-50'
              )}
            >
              {/* Top Boarding Pass Header Banner */}
              <div className="relative p-5 sm:p-6 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white overflow-hidden">
                {/* Background Pattern Elements */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none -ml-8 -mb-8" />

                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-[10px] font-black uppercase tracking-widest text-amber-100 mb-2">
                      <Sparkles className="w-3 h-3 text-amber-200" />
                      E-Bantuan Siswa Prihatin
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                      Pas Pengambilan Bantuan
                    </h2>
                    <p className="text-xs text-amber-100/90 font-medium mt-0.5">
                      Jawatankuasa Perwakilan Pelajar (JPP) POLISAS
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="block text-[9px] uppercase tracking-wider text-amber-200/80 font-mono">
                      No. Permohonan
                    </span>
                    <span className="text-xs sm:text-sm font-black font-mono tracking-wider bg-black/20 px-2.5 py-1 rounded-lg border border-white/20 inline-block mt-0.5">
                      {appNo}
                    </span>
                  </div>
                </div>

                {/* Status Notice Ribbon */}
                <div className="relative z-10 mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2">
                  <div
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border',
                      statusInfo.bg,
                      statusInfo.glow
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', statusInfo.dot)} />
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span>{statusInfo.label}</span>
                  </div>
                  <span className="text-[11px] text-amber-100/90 font-medium">
                    {statusInfo.subLabel}
                  </span>
                </div>
              </div>

              {/* Student & Appointment Section */}
              <div className="p-5 sm:p-6 space-y-5">
                {/* Passenger / Student Identity Grid */}
                <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                      Nama Mahasiswa
                    </span>
                    <p className="font-extrabold text-slate-900 dark:text-white truncate mt-0.5">
                      {displayName}
                    </p>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                      No. Matrik
                    </span>
                    <p className="font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                      {displayMatric}
                    </p>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                      Program / Jabatan
                    </span>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 truncate mt-0.5">
                      {displayProgramme}
                    </p>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                      Penginapan / Bilik
                    </span>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 truncate mt-0.5">
                      {displayResidence}
                    </p>
                  </div>
                </div>

                {/* Pickup Appointment Schedule & PolyMaps Location */}
                <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400">
                          Pusat Agihan
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {application.location?.name || 'Pusat Edaran Kaunter JHEP (Pentadbiran)'}
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                          {application.location?.room_detail || 'Bilik Gerakan JPP, Kaunter Aras Bawah'}
                        </p>
                      </div>
                    </div>

                    <Link
                      to={polymapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="no-print flex-shrink-0"
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-[11px] font-bold text-teal-700 dark:text-teal-300 border-teal-500/30 hover:bg-teal-500/10 rounded-xl gap-1"
                      >
                        <span>PolyMaps</span>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">
                          Tarikh Temujanji
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {application.pickup_date
                            ? new Date(application.pickup_date).toLocaleDateString('ms-MY', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Akan Diselaraskan'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">
                          Slot Masa
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {application.pickup_time_slot || '10:00 AM - 4:00 PM'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manifest / Selected Items Breakdown */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Manifest Barangan ({totalItemCount} Unit)
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      Nilai Anggaran: RM{' '}
                      {(Number(application.total_estimated_value) || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {application.selected_items && application.selected_items.length > 0 ? (
                      application.selected_items.map((item, idx) => (
                        <div
                          key={`${item.item_id || idx}-${idx}`}
                          className="px-3.5 py-2 flex items-center justify-between bg-white dark:bg-slate-900/60"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {item.item_name}
                          </span>
                          <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-[11px]">
                            {item.quantity} {item.unit || 'unit'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-slate-500 text-xs">
                        Pakej Makanan Asas Standard JPP
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── Boarding Pass Perforated Divider ─── */}
              <div className="relative py-2 flex items-center justify-center">
                {/* Left Scalloped Cutout */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950 border-r border-slate-200/90 dark:border-amber-500/30" />
                {/* Dashed Line */}
                <div className="w-full border-t-2 border-dashed border-slate-300 dark:border-slate-700 px-6" />
                {/* Right Scalloped Cutout */}
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950 border-l border-slate-200/90 dark:border-amber-500/30" />
              </div>

              {/* ─── Boarding Pass QR Stub ─── */}
              <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-950/50 flex flex-col items-center text-center">
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                  <QRCodeSVG
                    value={qrCodeToken}
                    size={170}
                    level="H"
                    includeMargin={false}
                    className="mx-auto"
                  />
                </div>

                {/* Token Display & Copy */}
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  <span className="font-mono text-xs font-black tracking-wider text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    {qrCodeToken}
                  </span>
                  <button
                    onClick={handleCopyToken}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 border border-slate-200 dark:border-slate-700 transition-colors"
                    title="Salin Kod Token"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 max-w-xs font-normal">
                  Sila imbas atau tunjukkan pas digital ini di kaunter semasa sesi serahan bantuan.
                </p>

                {/* Instructions Reminder */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
                  SISTEM E-KEBAJIKAN & FOOD BANK JPP POLISAS • VERIFIKASI DIGITAL KAMPUS
                </div>
              </div>
            </div>

            {/* Bottom Dismiss Button for Mobile */}
            <div className="no-print mt-3 text-center">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white"
              >
                Tutup Tingkap Pas
              </Button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </>
  );
}
export default FoodBankQrPassModal;
