import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  QrCode,
  Camera,
  ScanLine,
  Search,
  RefreshCw,
  ShieldCheck,
  X,
  MapPin,
  Clock,
  CheckCircle2,
  Package,
  User,
  Sparkles,
  Filter,
  Download,
  ShoppingBag,
  AlertTriangle,
  Home,
  Check,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FoodBankApplication } from '@/types';
import {
  FB_CARD,
  FB_INSET,
  FB_INPUT,
  FB_PRIMARY_BTN,
  effectiveName,
  effectiveMatric,
  type ApplicationStatusFilter,
  type RecentVerifiedRecord,
} from './foodbankAdminUtils';

interface FoodBankApplicationsTabProps {
  // Scanner HUD state & handlers
  counterInput: string;
  onCounterInputChange: (val: string) => void;
  isVerifyingCounter: boolean;
  isCameraScanning: boolean;
  onStartCameraScan: () => void;
  onStopCameraScan: () => void;
  onLookupOrVerify: (query: string) => void;
  activeScanStudent: FoodBankApplication | null;
  onClearActiveScanStudent: () => void;
  onExecuteFulfillment: (app: FoodBankApplication) => void;
  recentVerifiedRecord: RecentVerifiedRecord | null;
  // Filter & table state & handlers
  statusFilter: ApplicationStatusFilter;
  onStatusFilterChange: (st: ApplicationStatusFilter) => void;
  housingFilter: string;
  onHousingFilterChange: (val: string) => void;
  includeHousemates: boolean;
  onIncludeHousematesChange: (val: boolean) => void;
  appSearch: string;
  onAppSearchChange: (val: string) => void;
  onExportNamesXlsx: () => void;
  isLoading: boolean;
  filteredApplications: FoodBankApplication[];
  isProcessingAction: boolean;
  onViewDetail: (app: FoodBankApplication) => void;
  onApprove: (app: FoodBankApplication) => void;
  onOpenRejectModal: (app: FoodBankApplication) => void;
  onViewQrPass: (app: FoodBankApplication) => void;
  onDirectVerifyPickup: (appNo: string) => void;
}

export const FoodBankApplicationsTab: React.FC<FoodBankApplicationsTabProps> = ({
  counterInput,
  onCounterInputChange,
  isVerifyingCounter,
  isCameraScanning,
  onStartCameraScan,
  onStopCameraScan,
  onLookupOrVerify,
  activeScanStudent,
  onClearActiveScanStudent,
  onExecuteFulfillment,
  recentVerifiedRecord,
  statusFilter,
  onStatusFilterChange,
  housingFilter,
  onHousingFilterChange,
  includeHousemates,
  onIncludeHousematesChange,
  appSearch,
  onAppSearchChange,
  onExportNamesXlsx,
  isLoading,
  filteredApplications,
  isProcessingAction,
  onViewDetail,
  onApprove,
  onOpenRejectModal,
  onViewQrPass,
  onDirectVerifyPickup,
}) => {
  const { t } = useTranslation(['kebajikan', 'jpp', 'common']);

  return (
    <motion.div
      key="tab-applications"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="space-y-6"
    >
      {/* ── Architectural QR Counter Scanner Panel (Semambu Teal / Obsidian Carbon) ── */}
      <section className={cn(FB_CARD, 'p-5 sm:p-6 shadow-surface-md')}>
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#B8E4DC]/60 dark:border-[#252B35]">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-[#0F766E] dark:text-[#2DD4BF] text-xs font-semibold uppercase tracking-wider">
              <QrCode className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t('jpp:foodbank_hud_sub_title', 'Kaunter Agihan Pantas • Pengimbas Pas Digital')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B2420] dark:text-[#F1F5F9] [text-wrap:balance]">
              {t('jpp:pass_verification_title', 'Pengesahan Pas Pengambilan Mahasiswa')}
            </h2>
            <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] max-w-2xl leading-relaxed">
              {t(
                'jpp:foodbank_pass_desc',
                'Imbas kod QR pas digital pelajar atau buat carian No. Matrik secara pantas. Pengesahan 1-tap akan mengemaskini inventori.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-[#0F766E] dark:text-[#2DD4BF] text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
              <span>{t('jpp:counter_active', 'Kaunter Aktif')}</span>
            </div>
            <button
              type="button"
              onClick={() => (isCameraScanning ? onStopCameraScan() : onStartCameraScan())}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-[transform,opacity,background-color] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]',
                isCameraScanning
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : FB_PRIMARY_BTN
              )}
            >
              {isCameraScanning ? (
                <>
                  <ScanLine className="w-4 h-4" aria-hidden="true" />
                  <span>{t('jpp:close_scanner', 'Tutup Pengimbas')}</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  <span>{t('jpp:open_scanner_camera', 'Buka Kamera Imbasan')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scanner Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          {/* Left Column: Architectural Camera Viewfinder */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-md border-2 border-[#0F766E]/60 dark:border-[#2DD4BF]/60 shadow-surface-md rounded-2xl overflow-hidden bg-[#0E1116] relative aspect-square flex flex-col items-center justify-center">
              {/* Crisp Corner Reticles */}
              <div className="absolute top-3.5 left-3.5 w-6 h-6 border-t-2 border-l-2 border-[#2DD4BF] rounded-tl-lg pointer-events-none z-20" aria-hidden="true" />
              <div className="absolute top-3.5 right-3.5 w-6 h-6 border-t-2 border-r-2 border-[#2DD4BF] rounded-tr-lg pointer-events-none z-20" aria-hidden="true" />
              <div className="absolute bottom-3.5 left-3.5 w-6 h-6 border-b-2 border-l-2 border-[#2DD4BF] rounded-bl-lg pointer-events-none z-20" aria-hidden="true" />
              <div className="absolute bottom-3.5 right-3.5 w-6 h-6 border-b-2 border-r-2 border-[#2DD4BF] rounded-br-lg pointer-events-none z-20" aria-hidden="true" />

              {/* Static Optical Laser Guide Line (visible during active camera scan, zero infinite GPU loop) */}
              {isCameraScanning && (
                <div
                  data-scanner-guide="laser-reticle"
                  className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-px bg-[#2DD4BF]/70 z-20 pointer-events-none"
                  aria-hidden="true"
                />
              )}

              {/* Status Pill */}
              <div className="absolute top-4 inset-x-0 mx-auto w-fit z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#13171D] border border-[#252B35] text-[#F1F5F9] text-xs font-medium shadow-surface-sm">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isCameraScanning ? 'bg-[#2DD4BF]' : 'bg-emerald-400'
                  )}
                  aria-hidden="true"
                />
                <ScanLine className="w-3.5 h-3.5 text-[#2DD4BF]" aria-hidden="true" />
                <span>
                  {isCameraScanning
                    ? t('jpp:hud_laser_active', 'HUD Laser Aktif — Menghala ke Kod QR')
                    : t('jpp:scanner_ready', 'Pengimbas Bersedia')}
                </span>
              </div>

              {/* Camera Feed or Standby Panel */}
              {isCameraScanning ? (
                <div className="w-full h-full flex flex-col items-center justify-center relative">
                  <div
                    id="foodbank-counter-qr-reader"
                    className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
                  />
                </div>
              ) : (
                <div className="p-6 sm:p-8 text-center space-y-3 z-10 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#13171D] border border-[#252B35] flex items-center justify-center text-[#2DD4BF]">
                    <QrCode className="w-7 h-7" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#F1F5F9]">
                      {t('jpp:viewfinder_camera_title', 'Viewfinder Kamera Digital')}
                    </p>
                    <p className="text-xs text-[#94A0B2] max-w-xs mt-1 leading-relaxed">
                      {t(
                        'jpp:viewfinder_camera_desc',
                        'Kamera dalam keadaan siap sedia. Tekan butang di bawah untuk mengaktifkan imbasan langsung.'
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onStartCameraScan}
                    className="px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D665F] dark:bg-[#2DD4BF] dark:hover:bg-[#14B8A6] text-white dark:text-[#090B0E] font-semibold text-xs uppercase tracking-wider transition-[transform,opacity,background-color] duration-200 active:scale-[0.98] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF]"
                  >
                    <Camera className="w-4 h-4" aria-hidden="true" />
                    <span>{t('jpp:activate_camera_scan', 'Aktifkan Kamera Imbasan')}</span>
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-medium mt-3 text-center">
              {t(
                'jpp:point_camera_hint',
                'Halakan kamera pada kod QR Pas Pengambilan Digital pelajar (FB-...).'
              )}
            </p>
          </div>

          {/* Right Column: Manual Matric Search & Student Identification Card */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            {/* Manual Matric Search Box */}
            <div className={cn(FB_INSET, 'p-4 space-y-2.5')}>
              <label
                htmlFor="foodbank-manual-matric-input"
                className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9] uppercase tracking-wider flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF]" aria-hidden="true" />
                <span>{t('jpp:manual_search_title', 'Carian Alternatif / Manual Pelajar')}</span>
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3B635C] dark:text-[#94A0B2]"
                    aria-hidden="true"
                  />
                  <input
                    id="foodbank-manual-matric-input"
                    type="text"
                    spellCheck={false}
                    autoComplete="off"
                    value={counterInput}
                    onChange={(e) => onCounterInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onLookupOrVerify(counterInput)}
                    placeholder={t('jpp:manual_search_placeholder', 'Cari No. Matrik secara manual...')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] placeholder-[#3B635C]/70 dark:placeholder-[#94A0B2]/70 text-xs sm:text-sm font-semibold font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onLookupOrVerify(counterInput)}
                  disabled={isVerifyingCounter || !counterInput.trim()}
                  className={cn(
                    FB_PRIMARY_BTN,
                    'px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap'
                  )}
                >
                  {isVerifyingCounter ? (
                    <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <Search className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{t('common:search', 'Cari')}</span>
                </button>
              </div>
              <p className="text-xs text-[#3B635C] dark:text-[#94A0B2]">
                {t(
                  'jpp:manual_search_hint',
                  'Masukkan No. Matrik (cth: 06DKA23F1001), No. Permohonan (FB-2026-...), atau Kod Pas QR.'
                )}
              </p>
            </div>

            {/* Student Identification Card (High-Contrast Architectural Card) */}
            {activeScanStudent ? (
              <div className="p-5 sm:p-6 rounded-2xl bg-[#F6FBF9] dark:bg-[#0E1116] border-2 border-[#0F766E]/50 dark:border-[#2DD4BF]/50 shadow-surface-md space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#2DD4BF] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {t('jpp:student_id_card_verified', 'Kad Pengenalan Mahasiswa (Disahkan)')}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-[#0B2420] dark:text-[#F1F5F9] tracking-tight break-words">
                      {effectiveName(activeScanStudent)}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="font-mono font-bold text-[#0F766E] dark:text-[#2DD4BF] text-sm tracking-wider bg-[#EBF7F4] dark:bg-[#1B2028] px-2.5 py-0.5 rounded-lg border border-[#B8E4DC] dark:border-[#252B35]">
                        {effectiveMatric(activeScanStudent)}
                      </span>
                      <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-semibold font-mono">
                        {activeScanStudent.application_no}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClearActiveScanStudent}
                    aria-label={t('jpp:close_card', 'Tutup kad')}
                    title={t('jpp:close_card', 'Tutup kad')}
                    className="p-1.5 rounded-lg bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Student Meta */}
                <div className="grid grid-cols-2 gap-3 text-xs py-2.5 border-y border-[#B8E4DC]/60 dark:border-[#252B35]">
                  <div>
                    <span className="text-xs uppercase font-semibold text-[#3B635C] dark:text-[#94A0B2] block">
                      {t('jpp:phone_number', 'No. Telefon')}
                    </span>
                    <span className="text-[#0B2420] dark:text-[#F1F5F9] font-semibold font-mono">
                      {activeScanStudent.applicant?.phone || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-[#3B635C] dark:text-[#94A0B2] block">
                      {t('jpp:department_class', 'Jabatan / Kelas')}
                    </span>
                    <span className="text-[#0B2420] dark:text-[#F1F5F9] font-semibold">
                      {(activeScanStudent.applicant as any)?.department ||
                        (activeScanStudent.applicant as any)?.class ||
                        '-'}
                    </span>
                  </div>
                </div>

                {/* Entitled Items */}
                <div className="space-y-1.5">
                  <span className="text-xs uppercase font-semibold text-[#3B635C] dark:text-[#94A0B2] block">
                    {t('jpp:approved_items_packages', 'Pakej & Barangan Diluluskan:')}
                  </span>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] max-h-32 overflow-y-auto overscroll-contain space-y-1.5 text-xs">
                    {activeScanStudent.selected_items && activeScanStudent.selected_items.length > 0 ? (
                      activeScanStudent.selected_items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[#0B2420] dark:text-[#F1F5F9]">
                          <span className="font-medium">{it.item_name}</span>
                          <span className="font-bold font-mono tabular-nums text-[#0F766E] dark:text-[#2DD4BF]">
                            {it.quantity} {it.unit}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#3B635C] dark:text-[#94A0B2] font-medium">
                        {(activeScanStudent as any).items_summary ||
                          t('jpp:basic_food_package', 'Pakej Bantuan Makanan Asas')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Distribution Location & Slot */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1.5 text-[#0B2420] dark:text-[#F1F5F9] font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF]" aria-hidden="true" />
                    <span>
                      {(activeScanStudent.location as any)?.name ||
                        t('jpp:default_distribution_center', 'Pusat Edaran JPP')}
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35] text-xs font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{activeScanStudent.pickup_time_slot || t('jpp:open_slot', 'Slot Bebas')}</span>
                  </div>
                </div>

                {/* 56px+ 1-Tap Fulfillment CTA */}
                <button
                  type="button"
                  onClick={() => onExecuteFulfillment(activeScanStudent)}
                  disabled={isVerifyingCounter || activeScanStudent.status === 'SELESAI'}
                  className={cn(
                    FB_PRIMARY_BTN,
                    'w-full min-h-[56px] py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base tracking-wide uppercase flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isVerifyingCounter ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      <span>{t('jpp:confirming_disbursement', 'Mengesahkan Penyerahan…')}</span>
                    </>
                  ) : activeScanStudent.status === 'SELESAI' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                      <span>{t('jpp:food_already_disbursed', 'MAKANAN TELAH DISERAHKAN')}</span>
                    </>
                  ) : (
                    <>
                      <Package className="w-5 h-5" aria-hidden="true" />
                      <span>{t('jpp:confirm_food_disbursement', 'SAHKAN SERAHAN MAKANAN')}</span>
                      <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-dashed border-[#B8E4DC] dark:border-[#252B35] text-center flex flex-col items-center justify-center space-y-2.5 flex-1">
                <div className="w-12 h-12 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] flex items-center justify-center text-[#0F766E] dark:text-[#2DD4BF]">
                  <User className="w-6 h-6" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold text-[#0B2420] dark:text-[#F1F5F9]">
                  {t('jpp:waiting_pass_scan', 'Menunggu Imbasan Pas Mahasiswa')}
                </p>
                <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] max-w-xs leading-relaxed">
                  {t(
                    'jpp:waiting_pass_scan_desc',
                    'Halakan kod QR ke viewfinder atau buat carian No. Matrik secara manual untuk memaparkan maklumat pelajar dan butang serahan makanan.'
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Verified Distribution Banner */}
        {recentVerifiedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mt-5 pt-4 border-t border-[#B8E4DC]/60 dark:border-[#252B35] flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            <div className="flex flex-wrap items-center gap-2 text-[#0F766E] dark:text-[#2DD4BF] font-semibold">
              <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t('jpp:recent_valid_distribution', 'Agihan Terbaharu Sah:')}</span>
              <span className="text-[#0B2420] dark:text-[#F1F5F9] font-bold">
                {recentVerifiedRecord.studentName} ({recentVerifiedRecord.matricNo || recentVerifiedRecord.appNo})
              </span>
              <span className="text-[#3B635C] dark:text-[#94A0B2] font-mono tabular-nums">
                ({recentVerifiedRecord.itemsCount} {t('jpp:items_count_suffix', 'barangan')} • RM{' '}
                {recentVerifiedRecord.totalValue.toFixed(2)})
              </span>
            </div>
            <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-mono tabular-nums">
              {t('jpp:time_label', 'Masa:')} {recentVerifiedRecord.timestamp}
            </span>
          </motion.div>
        )}
      </section>

      {/* ── Applications Filter Bar ── */}
      <div className={cn(FB_CARD, 'p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3')}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-hide">
          <Filter className="w-4 h-4 text-[#3B635C] dark:text-[#94A0B2] shrink-0 mr-1" aria-hidden="true" />
          {(['SEMUA', 'MENUNGGU', 'LULUS', 'SELESAI', 'DITOLAK'] as const).map((st) => {
            const stLabel =
              st === 'SEMUA'
                ? t('jpp:foodbank_filter_all', 'Semua')
                : st === 'MENUNGGU'
                ? t('jpp:foodbank_filter_pending', 'Menunggu')
                : st === 'LULUS'
                ? t('jpp:foodbank_filter_approved', 'Diluluskan')
                : st === 'SELESAI'
                ? t('jpp:foodbank_filter_completed', 'Selesai')
                : t('jpp:foodbank_filter_rejected', 'Ditolak');
            return (
              <button
                key={st}
                type="button"
                onClick={() => onStatusFilterChange(st)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]',
                  statusFilter === st
                    ? 'bg-[#0F766E] text-white dark:bg-[#1B2028] dark:text-[#2DD4BF] dark:border dark:border-[#2DD4BF]/30'
                    : 'text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028]'
                )}
              >
                {stLabel}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportNamesXlsx}
            className={cn(
              FB_PRIMARY_BTN,
              'px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap'
            )}
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>{t('jpp:foodbank_export_xlsx', 'Eksport XLSX Nama')}</span>
          </button>

          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] text-xs font-medium cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={includeHousemates}
              onChange={(e) => onIncludeHousematesChange(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#0F766E]"
            />
            {t('jpp:foodbank_include_housemates', 'Termasuk rakan serumah (rumah sewa)')}
          </label>

          <select
            aria-label={t('jpp:foodbank_all_housing', 'Semua Kediaman')}
            value={housingFilter}
            onChange={(e) => onHousingFilterChange(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
          >
            <option value="SEMUA" className="bg-white dark:bg-[#13171D]">
              {t('jpp:foodbank_all_housing', 'Semua Kediaman')}
            </option>
            <option value="KAMSIS" className="bg-white dark:bg-[#13171D]">
              {t('jpp:foodbank_housing_kamsis', 'KAMSIS')}
            </option>
            <option value="RUMAH_SEWA" className="bg-white dark:bg-[#13171D]">
              {t('jpp:foodbank_housing_rental', 'Rumah Sewa Luar')}
            </option>
            <option value="SENDIRI" className="bg-white dark:bg-[#13171D]">
              {t('jpp:foodbank_housing_own', 'Kediaman Sendiri')}
            </option>
          </select>

          <div className="relative w-full sm:w-56">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#3B635C] dark:text-[#94A0B2]"
              aria-hidden="true"
            />
            <input
              type="text"
              aria-label={t('jpp:foodbank_search_placeholder', 'Cari nama / matrik / no app...')}
              value={appSearch}
              onChange={(e) => onAppSearchChange(e.target.value)}
              placeholder={t('jpp:foodbank_search_placeholder', 'Cari nama / matrik / no app...')}
              className={cn(FB_INPUT, 'pl-9')}
            />
          </div>
        </div>
      </div>

      {/* ── Applications Data Table (Zero Overflow) ── */}
      <div className={cn(FB_CARD, 'overflow-hidden')}>
        <div className="w-full max-w-full overflow-x-auto scrollbar-hide">
          <table className="w-full text-left text-xs min-w-[780px]">
            <thead>
              <tr className="bg-[#F6FBF9] dark:bg-[#0E1116] border-b border-[#B8E4DC] dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2] font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">{t('jpp:foodbank_col_app_no', 'No. Permohonan')}</th>
                <th className="py-3.5 px-4">{t('jpp:foodbank_col_applicant_info', 'Maklumat Pemohon')}</th>
                <th className="py-3.5 px-4">{t('jpp:foodbank_col_category_housing', 'Kategori & Kediaman')}</th>
                <th className="py-3.5 px-4">{t('jpp:foodbank_col_items_requested', 'Barangan Dipohon')}</th>
                <th className="py-3.5 px-4">{t('jpp:foodbank_col_location_date', 'Lokasi & Tarikh')}</th>
                <th className="py-3.5 px-4 text-center">{t('jpp:foodbank_col_status', 'Status')}</th>
                <th className="py-3.5 px-4 text-right">{t('jpp:foodbank_col_actions', 'Tindakan')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B8E4DC]/50 dark:divide-[#252B35]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#3B635C] dark:text-[#94A0B2] font-medium">
                    <RefreshCw
                      className="w-6 h-6 animate-spin motion-reduce:animate-none mx-auto text-[#0F766E] dark:text-[#2DD4BF] mb-2"
                      aria-hidden="true"
                    />
                    {t('jpp:foodbank_loading_applications', 'Memuat turun senarai permohonan Food Bank…')}
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#3B635C] dark:text-[#94A0B2] font-medium">
                    <ShoppingBag className="w-8 h-8 mx-auto text-[#B8E4DC] dark:text-[#252B35] mb-2" aria-hidden="true" />
                    {t(
                      'jpp:foodbank_no_applications_found_search',
                      'Tiada permohonan ditemui bagi kriteria carian ini.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-[#F6FBF9] dark:hover:bg-[#1B2028]/50 transition-colors"
                  >
                    {/* App No */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                      <div>{app.application_no}</div>
                      <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-sans font-normal">
                        {new Date(app.created_at || '').toLocaleDateString('ms-MY', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>

                    {/* Applicant Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#0B2420] dark:text-[#F1F5F9] flex items-center gap-1.5 flex-wrap">
                        <span>{effectiveName(app)}</span>
                        {app.requires_counter_verification && (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1',
                              app.counter_verified
                                ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300'
                            )}
                          >
                            {app.counter_verified ? (
                              <>
                                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                                {t('jpp:foodbank_counter_verified', 'Disahkan Kaunter')}
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                                {t('jpp:foodbank_verify_ic_needed', 'Perlu Sahkan IC/Matrik')}
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono">{effectiveMatric(app)}</span>
                        {app.applicant_matric_override && app.applicant?.matric_no && (
                          <span className="line-through opacity-70 font-mono">{app.applicant.matric_no}</span>
                        )}
                        {app.applicant?.phone && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{app.applicant.phone}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Category & Housing */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0B2420] dark:text-[#F1F5F9]">
                          {app.financial_category || 'B40'}
                        </span>
                        <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] flex items-center gap-1">
                          <Home className="w-3.5 h-3.5" aria-hidden="true" />
                          {app.housing_type === 'KAMSIS' ? 'KAMSIS' : 'Luar Kampus'}
                          {app.housemates && app.housemates.length > 0 && (
                            <span className="font-semibold text-[#0F766E] dark:text-[#2DD4BF]">
                              (+{app.housemates.length} rakan)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Items Requested */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                        {t('jpp:foodbank_items_count_suffix', '{{count}} Barangan', {
                          count: app.selected_items?.length || 0,
                        })}
                      </div>
                      <div className="text-xs font-semibold font-mono tabular-nums text-[#0F766E] dark:text-[#2DD4BF]">
                        RM {Number(app.total_estimated_value || 0).toFixed(2)}
                      </div>
                    </td>

                    {/* Location & Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#0B2420] dark:text-[#F1F5F9] line-clamp-1">
                        {app.location?.name || 'Pusat Edaran JPP'}
                      </div>
                      <div className="text-xs text-[#3B635C] dark:text-[#94A0B2]">
                        {app.pickup_date || t('jpp:foodbank_ready_for_pickup', 'Sedia untuk diambil')}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1 border',
                          app.status === 'MENUNGGU' &&
                            'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
                          app.status === 'LULUS' &&
                            'bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
                          app.status === 'SELESAI' &&
                            'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
                          app.status === 'DITOLAK' &&
                            'bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                        )}
                      >
                        {app.status === 'SELESAI' && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                        {app.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onViewDetail(app)}
                          aria-label={t('jpp:foodbank_view_full_details', 'Lihat Butiran Penuh')}
                          title={t('jpp:foodbank_view_full_details', 'Lihat Butiran Penuh')}
                          className="p-1.5 rounded-lg bg-[#F6FBF9] hover:bg-[#EBF7F4] dark:bg-[#1B2028] dark:hover:bg-[#232933] border border-[#B8E4DC] dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9] transition-colors"
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        </button>

                        {app.status === 'MENUNGGU' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onApprove(app)}
                              disabled={isProcessingAction}
                              className="px-2.5 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D665F] dark:bg-[#2DD4BF] dark:hover:bg-[#14B8A6] text-white dark:text-[#090B0E] font-semibold text-xs transition-colors disabled:opacity-50"
                            >
                              {t('jpp:foodbank_btn_approve', 'Lulus')}
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenRejectModal(app)}
                              disabled={isProcessingAction}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 font-semibold text-xs transition-colors"
                            >
                              {t('jpp:foodbank_btn_reject', 'Tolak')}
                            </button>
                          </>
                        )}

                        {app.status === 'LULUS' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onViewQrPass(app)}
                              aria-label={t('kebajikan:action_view_qr_pass', 'Papar Pas QR')}
                              title={t('kebajikan:action_view_qr_pass', 'Papar Pas QR')}
                              className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 hover:bg-sky-100 dark:hover:bg-sky-500/25 transition-colors"
                            >
                              <QrCode className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDirectVerifyPickup(app.application_no)}
                              disabled={isVerifyingCounter}
                              className={cn(
                                FB_PRIMARY_BTN,
                                'px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 disabled:opacity-50'
                              )}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              {t('jpp:foodbank_confirm_pickup', 'Sahkan Ambilan')}
                            </button>
                          </>
                        )}

                        {app.status === 'SELESAI' && (
                          <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal italic">
                            {t('jpp:foodbank_verified_by_officer', 'Disahkan oleh {{officer}}', {
                              officer: app.verifier?.full_name || t('jpp:foodbank_officer_default', 'Pegawai'),
                            })}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
