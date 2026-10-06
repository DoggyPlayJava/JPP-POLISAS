import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  Package,
  ChevronRight,
  ArrowRight,
  QrCode,
  MessageSquare,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KebajikanLiveTrackerCardProps {
  ticket?: any | null;
  foodbankApp?: any | null;
  className?: string;
  onViewQrPass?: () => void;
}

const INACTIVE_TICKET_STATUSES = ['RESOLVED', 'CLOSED', 'CANCELLED', 'BATAL', 'SELESAI'];
const INACTIVE_FOODBANK_STATUSES = ['SELESAI', 'BATAL', 'DITOLAK', 'REJECTED', 'COMPLETED', 'CANCELLED'];

export function KebajikanLiveTrackerCard({
  ticket,
  foodbankApp,
  className,
  onViewQrPass,
}: KebajikanLiveTrackerCardProps): JSX.Element | null {
  const isTicketActive = Boolean(
    ticket &&
    ticket.status &&
    !INACTIVE_TICKET_STATUSES.includes(ticket.status.toUpperCase())
  );

  const isFoodBankActive = Boolean(
    foodbankApp &&
    foodbankApp.status &&
    !INACTIVE_FOODBANK_STATUSES.includes(foodbankApp.status.toUpperCase())
  );

  if (!isTicketActive && !isFoodBankActive) {
    return null;
  }

  return (
    <div
      className={cn(
        'w-full rounded-2xl md:rounded-3xl p-5 sm:p-6 transition-all duration-300',
        'bg-white/95 dark:bg-slate-900/90 backdrop-blur-md',
        'border border-slate-200/90 dark:border-white/10 shadow-sm hover:shadow-md',
        'space-y-6',
        className
      )}
      data-testid="kebajikan-live-tracker"
    >
      {/* ── Active Welfare Ticket Tracker Section ── */}
      {isTicketActive && ticket && (
        <WelfareTicketTrackerItem ticket={ticket} />
      )}

      {/* Divider if both exist */}
      {isTicketActive && isFoodBankActive && (
        <div className="border-t border-slate-200/80 dark:border-white/10 my-2" />
      )}

      {/* ── Active FoodBank Application Tracker Section ── */}
      {isFoodBankActive && foodbankApp && (
        <FoodBankTrackerItem
          foodbankApp={foodbankApp}
          onViewQrPass={onViewQrPass}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Subcomponent: Welfare Ticket Tracker
// ────────────────────────────────────────────────────────────
function WelfareTicketTrackerItem({ ticket }: { ticket: any }) {
  const status = (ticket.status || '').toUpperCase();
  const ticketNo = ticket.ticket_no || ticket.id || 'TIKET-AKTIF';
  const title = ticket.title || ticket.category || 'Aduan Pelajar';

  // Stepper State Logic:
  // Step 1: Dihantar (always completed)
  // Step 2: Disemak JPP (active if PENDING/NEW/WAITING_INFO; completed if IN_PROGRESS, ACTION_TAKEN, IN_INVESTIGATION, etc.)
  // Step 3: Tindakan Unit Fasiliti (active if IN_PROGRESS, ACTION_TAKEN, IN_INVESTIGATION, DELEGATED, ESCALATED)
  // Step 4: Selesai (upcoming since ticket is active)
  const isStep2Completed = ['IN_PROGRESS', 'ACTION_TAKEN', 'IN_INVESTIGATION', 'DELEGATED', 'ESCALATED'].includes(status);
  const isStep2Active = !isStep2Completed; // PENDING, NEW, WAITING_INFO
  const isStep3Active = isStep2Completed; // actively being worked on by facilities / exco

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
            </span>
            Penjejak Aduan Langsung
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Aduan Fasiliti: {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            No. Rujukan: <span className="font-semibold text-slate-700 dark:text-slate-200">{ticketNo}</span>
          </p>
        </div>

        {/* SLA Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 shrink-0">
          <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>SLA: 24-48 Jam Bekerja</span>
        </div>
      </div>

      {/* Parcel-delivery Pulse Stepper */}
      <div className="pt-2 pb-1">
        <div className="grid grid-cols-4 gap-2 relative">
          {/* Step 1: Dihantar */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white">
              Dihantar
            </span>
          </div>

          {/* Step 2: Disemak JPP */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            {isStep2Completed ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : isStep2Active ? (
              <div className="relative w-8 h-8 rounded-full bg-teal-500/20 border-2 border-teal-500 text-teal-600 dark:text-teal-300 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60" />
                <Clock className="w-4 h-4 relative z-10" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            )}
            <span className={cn(
              'text-[11px] sm:text-xs font-bold',
              isStep2Completed || isStep2Active
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-400 dark:text-slate-500'
            )}>
              Disemak JPP
            </span>
          </div>

          {/* Step 3: Tindakan Unit Fasiliti */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            {isStep3Active ? (
              <div className="relative w-8 h-8 rounded-full bg-teal-500/20 border-2 border-teal-500 text-teal-600 dark:text-teal-300 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60" />
                <Sparkles className="w-4 h-4 relative z-10" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            )}
            <span className={cn(
              'text-[11px] sm:text-xs font-bold',
              isStep3Active
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-400 dark:text-slate-500'
            )}>
              Tindakan Unit Fasiliti
            </span>
          </div>

          {/* Step 4: Selesai */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-slate-500">
              Selesai
            </span>
          </div>
        </div>
      </div>

      {/* Footer CTA Bar */}
      <div className="flex items-center justify-end pt-1">
        <Link
          to={`/kebajikan/aduan/${ticket.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800/50 transition-colors shadow-2xs"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Buka Sembang Aduan</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Subcomponent: FoodBank Tracker
// ────────────────────────────────────────────────────────────
function FoodBankTrackerItem({
  foodbankApp,
  onViewQrPass,
}: {
  foodbankApp: any;
  onViewQrPass?: () => void;
}) {
  const status = (foodbankApp.status || '').toUpperCase();
  const appNo = foodbankApp.application_no || foodbankApp.id || 'FB-PERMOHONAN';
  const isApproved = status === 'APPROVED' || status === 'LULUS';
  const isReviewing = status === 'DALAM_SEMAKAN' || status === 'PROCESSING' || status === 'PACKING';

  const locationName = foodbankApp.location?.name || 'Pusat Edaran Kaunter JHEP';
  const slotTime = foodbankApp.pickup_time_slot || '10:00 AM - 11:30 AM';

  const handleCtaClick = (e: React.MouseEvent) => {
    if (onViewQrPass) {
      e.preventDefault();
      onViewQrPass();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            Food Bank Siswa
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Permohonan Food Bank JPP
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            No. Permohonan: <span className="font-semibold text-slate-700 dark:text-slate-200">{appNo}</span>
          </p>
        </div>

        {/* Location & Slot Info */}
        <div className="space-y-1 text-right">
          <div className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 font-semibold">
            <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{locationName}</span>
          </div>
          <div className="flex items-center justify-end gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <Clock className="w-3 h-3" />
            <span>{slotTime}</span>
          </div>
        </div>
      </div>

      {/* Parcel-delivery Pulse Stepper (3 Steps) */}
      <div className="pt-2 pb-1">
        <div className="grid grid-cols-3 gap-2 relative">
          {/* Step 1: Permohonan Diterima (Marked Complete) */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white">
              Permohonan Diterima
            </span>
          </div>

          {/* Step 2: Pakej Disediakan */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            {isApproved ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : isReviewing ? (
              <div className="relative w-8 h-8 rounded-full bg-amber-500/20 border-2 border-amber-500 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                <Package className="w-4 h-4 relative z-10" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            )}
            <span className={cn(
              'text-[11px] sm:text-xs font-bold',
              isApproved || isReviewing
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            )}>
              Pakej Disediakan
            </span>
          </div>

          {/* Step 3: Sedia Diambil di Kaunter */}
          <div className="flex flex-col items-center text-center space-y-1.5">
            {isApproved ? (
              <div className="relative w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shadow-xs">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <Sparkles className="w-4 h-4 relative z-10" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            )}
            <div className="flex flex-col items-center">
              <span className={cn(
                'text-[11px] sm:text-xs font-bold',
                isApproved
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-400 dark:text-slate-500'
              )}>
                {isApproved ? 'Sedia Diambil' : 'Sedia Diambil di Kaunter'}
              </span>
              {isApproved && (
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  (di Kaunter)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {isApproved ? (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Sedia untuk diambil
            </span>
          ) : (
            <span>Menunggu kelulusan agihan</span>
          )}
        </div>

        <Link
          to="/kebajikan/foodbank"
          onClick={handleCtaClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/50 transition-colors shadow-2xs"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Tunjuk Pas QR</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default KebajikanLiveTrackerCard;
