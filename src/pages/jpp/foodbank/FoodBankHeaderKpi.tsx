import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  HeartHandshake,
  ChevronRight,
  MapPin,
  Lock,
  RefreshCw,
  DollarSign,
  Clock,
  QrCode,
  CheckCircle2,
  Package,
  Receipt,
  Sliders,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FoodBankItem, FoodBankOfficer, FoodBankSettings } from '@/types';
import {
  FB_CARD,
  type AdminTab,
  type AppMetrics,
  type ApplicationStatusFilter,
} from './foodbankAdminUtils';

interface FoodBankHeaderKpiProps {
  settings: FoodBankSettings | null;
  isExecutiveAdmin: boolean;
  myOfficerRecord: FoodBankOfficer | null | undefined;
  isRefreshing: boolean;
  onRefresh: () => void;
  onToggleSession: () => void;
  budgetAllocation: number;
  currentSpent: number;
  remainingBudget: number;
  budgetUsedPercentage: number;
  appMetrics: AppMetrics;
  items: FoodBankItem[];
  auditLogsCount: number;
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onJumpToApplicationStatus: (status: ApplicationStatusFilter) => void;
}

export const FoodBankHeaderKpi: React.FC<FoodBankHeaderKpiProps> = ({
  settings,
  isExecutiveAdmin,
  myOfficerRecord,
  isRefreshing,
  onRefresh,
  onToggleSession,
  budgetAllocation,
  currentSpent,
  remainingBudget,
  budgetUsedPercentage,
  appMetrics,
  items,
  auditLogsCount,
  activeTab,
  onSelectTab,
  onJumpToApplicationStatus,
}) => {
  const { t } = useTranslation(['kebajikan', 'jpp', 'common']);

  const lowStockCount = items.filter((i) => i.current_stock < 10).length;

  const tabs = [
    {
      id: 'applications' as const,
      label: t('jpp:foodbank_tab_applications', 'Permohonan & Kaunter'),
      icon: QrCode,
      badge: appMetrics.pending > 0 ? String(appMetrics.pending) : null,
      badgeColor: 'bg-amber-600 text-white',
    },
    {
      id: 'inventory' as const,
      label: t('jpp:foodbank_tab_inventory', 'Inventori & Stok'),
      icon: Package,
      badge: lowStockCount > 0 ? t('jpp:foodbank_low_stock_badge', 'Stok Rendah') : null,
      badgeColor: 'bg-rose-600 text-white',
    },
    ...(isExecutiveAdmin
      ? [
          {
            id: 'budget' as const,
            label: t('jpp:foodbank_tab_budget', 'Bajet & Lejar Audit (RM70k)'),
            icon: Receipt,
            badge: null,
            badgeColor: '',
          },
          {
            id: 'settings' as const,
            label: t('jpp:foodbank_tab_settings', 'Tetapan Sesi & Pegawai'),
            icon: Sliders,
            badge: null,
            badgeColor: '',
          },
        ]
      : []),
    {
      id: 'audit' as const,
      label: t('jpp:foodbank_tab_audit', 'Log Audit Operasi'),
      icon: FileText,
      badge: auditLogsCount > 0 ? String(auditLogsCount) : null,
      badgeColor: 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF]',
    },
  ];

  return (
    <>
      {/* ── 1. Sticky Top Command Header ── */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#13171D] border-b border-[#B8E4DC] dark:border-[#252B35] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Breadcrumb */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2] flex-wrap">
              <span>Portal JPP HQ</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t('jpp:foodbank_breadcrumb_student_management', 'Pengurusan Pelajar')}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="text-[#0F766E] dark:text-[#2DD4BF]">Food Bank JPP</span>
            </div>

            <div className="flex items-center gap-3 mt-1.5">
              <div className="w-10 h-10 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] flex items-center justify-center text-[#0F766E] dark:text-[#2DD4BF] shrink-0">
                <HeartHandshake className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B2420] dark:text-[#F1F5F9] flex items-center gap-2 flex-wrap [text-wrap:balance]">
                  <span>{t('jpp:foodbank_admin', 'Kawalan Berpusat Food Bank')}</span>
                  <span className="text-xs uppercase font-semibold tracking-wider px-2.5 py-0.5 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35]">
                    {isExecutiveAdmin
                      ? t('jpp:foodbank_executive_admin', 'Admin Eksekutif')
                      : myOfficerRecord?.role_title || t('jpp:foodbank_counter_officer', 'Petugas Kaunter')}
                  </span>
                  {myOfficerRecord?.location && !isExecutiveAdmin && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                      {myOfficerRecord.location.name}
                    </span>
                  )}
                </h1>
                <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal mt-0.5">
                  {t(
                    'jpp:foodbank_subtitle',
                    'Pusat Kawalan Agihan Bantuan Makanan & Keperluan Asas Mahasiswa POLISAS'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Session Quick Control & Refresh */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {isExecutiveAdmin ? (
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35]">
                <span className="text-xs font-semibold text-[#3B635C] dark:text-[#94A0B2]">
                  {t('jpp:foodbank_student_session', 'Sesi Pelajar:')}
                </span>
                <button
                  type="button"
                  onClick={onToggleSession}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-[transform,opacity,background-color] duration-200 active:scale-[0.98] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]',
                    settings?.is_application_open
                      ? 'bg-[#0F766E] hover:bg-[#0D665F] dark:bg-[#2DD4BF] dark:hover:bg-[#14B8A6] text-white dark:text-[#090B0E]'
                      : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/25'
                  )}
                >
                  {settings?.is_application_open ? (
                    <>
                      <span
                        className="w-2 h-2 rounded-full bg-white dark:bg-[#090B0E]"
                        aria-hidden="true"
                      />
                      {t('jpp:foodbank_session_open', 'Buka')}
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                      {t('jpp:foodbank_session_closed', 'Tutup')}
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] text-xs font-semibold text-[#3B635C] dark:text-[#94A0B2]">
                <span>{t('jpp:foodbank_student_session', 'Sesi Pelajar:')}</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-semibold uppercase',
                    settings?.is_application_open
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  )}
                >
                  {settings?.is_application_open
                    ? t('jpp:foodbank_status_opened', 'Dibuka')
                    : t('jpp:foodbank_status_closed', 'Ditutup')}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Segarkan data"
              title="Segarkan data"
              className="w-9 h-9 rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9] border border-[#B8E4DC] dark:border-[#252B35] flex items-center justify-center transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
            >
              <RefreshCw
                className={cn('w-4 h-4', isRefreshing && 'animate-spin motion-reduce:animate-none text-[#0F766E] dark:text-[#2DD4BF]')}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. KPI Metrics & Tab Navigation Container ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Official RM70,000 Budget Allocation */}
          <div className={cn(FB_CARD, 'p-5 flex flex-col justify-between')}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2]">
                  {t('jpp:foodbank_official_budget', 'Peruntukan Belanjawan Rasmi')}
                </p>
                <h3 className="text-2xl font-bold text-[#0B2420] dark:text-[#F1F5F9] mt-1 font-mono tabular-nums">
                  RM {budgetAllocation.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#B8E4DC]/50 dark:border-[#252B35]">
              <div className="flex flex-wrap justify-between items-center text-xs mb-1.5 font-medium gap-x-2 gap-y-0.5">
                <span className="text-[#3B635C] dark:text-[#94A0B2] font-mono tabular-nums">
                  {t('jpp:foodbank_current_spending', 'Belanja Semasa')}: RM{' '}
                  {currentSpent.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[#0F766E] dark:text-[#2DD4BF] font-semibold font-mono tabular-nums shrink-0">
                  {budgetUsedPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028] overflow-hidden">
                <div
                  className="h-full bg-[#0F766E] dark:bg-[#2DD4BF] rounded-full"
                  style={{ width: `${budgetUsedPercentage}%` }}
                />
              </div>
              <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-1.5 font-medium font-mono tabular-nums">
                {t('jpp:foodbank_remaining_budget', 'Baki Peruntukan')}: RM{' '}
                {remainingBudget.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Card 2: Pending Applications */}
          <div className={cn(FB_CARD, 'p-5 flex flex-col justify-between')}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  {t('jpp:foodbank_pending_applications', 'Permohonan Menunggu')}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">
                    {appMetrics.pending}
                  </h3>
                  <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-medium">
                    {t('jpp:foodbank_students_unit', 'pelajar')}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#B8E4DC]/50 dark:border-[#252B35] flex items-center justify-between gap-2">
              <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal">
                {t('jpp:foodbank_needs_review', 'Perlu Semakan')}
              </span>
              <button
                type="button"
                onClick={() => onJumpToApplicationStatus('MENUNGGU')}
                className="text-xs font-semibold text-amber-800 dark:text-amber-400 hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF] rounded"
              >
                {t('jpp:foodbank_check_immediately', 'Semak Segera')}
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Card 3: Approved Ready for Pickup */}
          <div className={cn(FB_CARD, 'p-5 flex flex-col justify-between')}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-800 dark:text-sky-400">
                  {t('jpp:foodbank_approved_ready', 'Diluluskan (Sedia Diambil)')}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">
                    {appMetrics.approved}
                  </h3>
                  <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-medium">
                    {t('jpp:foodbank_active_passes', 'pas aktif')}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/15 border border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#B8E4DC]/50 dark:border-[#252B35] flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal">
                {t('jpp:foodbank_waiting_counter_scan', 'Menanti imbasan QR di kaunter')}
              </span>
              <button
                type="button"
                onClick={() => onJumpToApplicationStatus('LULUS')}
                className="text-xs font-semibold text-sky-800 dark:text-sky-400 hover:underline inline-flex items-center gap-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF] rounded"
              >
                {t('jpp:foodbank_view_list', 'Lihat Senarai')}
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Card 4: Completed Distributions */}
          <div className={cn(FB_CARD, 'p-5 flex flex-col justify-between')}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#2DD4BF]">
                  {t('jpp:foodbank_completed_distributions', 'Jumlah Agihan Selesai')}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">
                    {appMetrics.completed}
                  </h3>
                  <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-medium">
                    {t('jpp:foodbank_recipients', 'penerima')}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#B8E4DC]/50 dark:border-[#252B35] flex items-center justify-between gap-2">
              <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-normal">
                {t('jpp:foodbank_packs_distributed', 'Pek diagihkan:')}{' '}
                <strong className="text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">
                  {appMetrics.totalItemsDistributed} {t('jpp:foodbank_unit', 'unit')}
                </strong>
              </span>
              <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35] shrink-0">
                {t('jpp:foodbank_audit_verified', 'Audit Sah')}
              </span>
            </div>
          </div>
        </div>

        {/* ── 3. Primary Navigation Tabs ── */}
        <nav
          role="tablist"
          aria-label="Tab Kawalan Food Bank"
          className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] shadow-surface-sm overflow-x-auto scrollbar-hide"
        >
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectTab(tab.id)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-[transform,opacity,background-color,color] duration-200 ease-apple-out active:scale-[0.98] flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]',
                  isSelected
                    ? 'bg-[#0F766E] text-white dark:bg-[#1B2028] dark:text-[#2DD4BF] dark:border dark:border-[#2DD4BF]/30 shadow-surface-sm'
                    : 'text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9] hover:bg-[#F6FBF9] dark:hover:bg-[#1B2028]/60'
                )}
              >
                <TabIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-semibold leading-none font-mono tabular-nums',
                      isSelected
                        ? 'bg-white/20 text-white dark:bg-[#2DD4BF]/20 dark:text-[#2DD4BF]'
                        : tab.badgeColor
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};
