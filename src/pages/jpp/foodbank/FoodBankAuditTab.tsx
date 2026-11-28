import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  History,
  Download,
  FileSpreadsheet,
  ArrowLeftRight,
  CheckCircle2,
  ShieldCheck,
  Search,
  X,
  FileText,
  MapPin,
  Sparkles,
  User,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FoodBankAuditLog, FoodBankDistributionLocation } from '@/types';
import {
  FB_CARD,
  FB_INSET,
  FB_INPUT,
  FB_PRIMARY_BTN,
  formatAuditDateTime,
  getAuditActionConfig,
  type AuditCategoryFilter,
  type AuditMetrics,
} from './foodbankAdminUtils';

interface FoodBankAuditTabProps {
  filteredAuditLogs: FoodBankAuditLog[];
  auditMetrics: AuditMetrics;
  auditCategoryFilter: AuditCategoryFilter;
  onAuditCategoryFilterChange: (cat: AuditCategoryFilter) => void;
  auditLocationFilter: string;
  onAuditLocationFilterChange: (locId: string) => void;
  auditSearchQuery: string;
  onAuditSearchQueryChange: (q: string) => void;
  locations: FoodBankDistributionLocation[];
  onExportAuditXlsx: (logs: FoodBankAuditLog[]) => void;
}

export const FoodBankAuditTab: React.FC<FoodBankAuditTabProps> = ({
  filteredAuditLogs,
  auditMetrics,
  auditCategoryFilter,
  onAuditCategoryFilterChange,
  auditLocationFilter,
  onAuditLocationFilterChange,
  auditSearchQuery,
  onAuditSearchQueryChange,
  locations,
  onExportAuditXlsx,
}) => {
  const { t } = useTranslation(['kebajikan', 'jpp', 'common']);

  return (
    <motion.div
      key="tab-audit"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="space-y-6"
    >
      {/* 1. Architectural Audit Header Banner (Semambu Teal / Obsidian Carbon, zero dark-slate/amber gradient) */}
      <section className={cn(FB_CARD, 'p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4')}>
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 text-[#0F766E] dark:text-[#2DD4BF] text-xs font-semibold uppercase tracking-wider">
            <History className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('jpp:foodbank_official_audit_ledger', 'Lejar Rasmi Pengauditan JHEP & JPP')}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#0B2420] dark:text-[#F1F5F9] flex flex-wrap items-center gap-2">
            <span>{t('jpp:foodbank_audit_dedicated_title', 'Log Audit Dedikasi Food Bank')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35] font-semibold font-mono tabular-nums">
              {t('jpp:foodbank_filtered_records_count', '{{count}} Rekod Ditapis', {
                count: filteredAuditLogs.length,
              })}
            </span>
          </h2>
          <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] max-w-xl leading-relaxed">
            {t(
              'jpp:foodbank_audit_dedicated_desc',
              'Jejak telus setiap pergerakan stok antara lokasi, imbasan pas QR kaunter, perlantikan pegawai bertugas, dan pengubahsuaian sesi permohonan.'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onExportAuditXlsx(filteredAuditLogs)}
          className={cn(
            FB_PRIMARY_BTN,
            'px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap self-start sm:self-center shrink-0'
          )}
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>{t('kebajikan:btn_export_xlsx_jhep', 'Eksport XLSX JHEP')}</span>
        </button>
      </section>

      {/* 2. 4 Audit Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn(FB_CARD, 'p-4 flex flex-col justify-between')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#3B635C] dark:text-[#94A0B2]">
                {t('jpp:foodbank_audit_total_tx_title', 'Jumlah Transaksi Rekod')}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">
                  {auditMetrics.total}
                </h3>
                <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-medium">entri audit</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#B8E4DC]/50 dark:border-[#252B35] flex items-center justify-between text-xs text-[#3B635C] dark:text-[#94A0B2]">
            <span>{t('jpp:foodbank_audit_overall_active_records', 'Keseluruhan rekod aktif')}</span>
            <span className="font-semibold text-[#0F766E] dark:text-[#2DD4BF]">
              {t('kebajikan:audit_100_percent_recorded', '100% Tercatat')}
            </span>
          </div>
        </div>

        <div className={cn(FB_CARD, 'p-4 flex flex-col justify-between')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                {t('jpp:foodbank_audit_stock_transfers_title', 'Pindahan Stok Lokasi')}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">
                  {auditMetrics.transfers}
                </h3>
                <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-medium">perpindahan</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#B8E4DC]/50 dark:border-[#252B35] flex items-center justify-between text-xs text-[#3B635C] dark:text-[#94A0B2]">
            <span className="truncate pr-2">
              {t('jpp:foodbank_audit_between_hubs_desc', 'Pusat Edaran JPP / Hab Kamsis')}
            </span>
            <span className="font-semibold text-[#0B2420] dark:text-[#F1F5F9] shrink-0">
              {t('kebajikan:audit_between_hubs', 'Antara Hab')}
            </span>
          </div>
        </div>

        <div className={cn(FB_CARD, 'p-4 flex flex-col justify-between')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#2DD4BF]">
                {t('jpp:foodbank_qr_redemptions_verified', 'Penebusan QR Disahkan')}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">
                  {auditMetrics.pickups}
                </h3>
                <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-medium">
                  {t('jpp:foodbank_physical_distribution', 'agihan fizikal')}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] border border-[#B8E4DC] dark:border-[#252B35] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#B8E4DC]/50 dark:border-[#252B35] flex items-center justify-between text-xs text-[#3B635C] dark:text-[#94A0B2]">
            <span>{t('jpp:foodbank_valid_counter_qr_scan', 'Imbasan QR kaunter sah')}</span>
            <span className="font-semibold text-[#0F766E] dark:text-[#2DD4BF]">
              {t('jpp:foodbank_handed_over', 'Diserahkan')}
            </span>
          </div>
        </div>

        <div className={cn(FB_CARD, 'p-4 flex flex-col justify-between')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-800 dark:text-sky-400">
                {t('jpp:foodbank_admin_officer_actions_title', 'Tindakan Pegawai & Admin')}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums">
                  {auditMetrics.adminOfficerActions}
                </h3>
                <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-medium">
                  {t('jpp:foodbank_management_count_unit', 'pengurusan')}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/15 border border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#B8E4DC]/50 dark:border-[#252B35] flex items-center justify-between text-xs text-[#3B635C] dark:text-[#94A0B2]">
            <span>{t('jpp:foodbank_appointments_quota_settings', 'Lantikan, kuota & tetapan')}</span>
            <span className="font-semibold text-sky-700 dark:text-sky-400">
              {t('jpp:foodbank_governance', 'Tadbir Urus')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className={cn(FB_CARD, 'p-4 flex flex-col md:flex-row md:items-center justify-between gap-3')}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          {(['SEMUA', 'STOK', 'AGIHAN', 'PEGAWAI', 'TETAPAN'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onAuditCategoryFilterChange(cat)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]',
                auditCategoryFilter === cat
                  ? 'bg-[#0F766E] text-white dark:bg-[#1B2028] dark:text-[#2DD4BF] dark:border dark:border-[#2DD4BF]/30'
                  : 'bg-[#F6FBF9] dark:bg-[#0E1116] text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative min-w-[180px] w-full sm:w-auto">
            <select
              aria-label={t('jpp:foodbank_all_distribution_locations_option', 'Semua Lokasi Pengagihan')}
              value={auditLocationFilter}
              onChange={(e) => onAuditLocationFilterChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]"
            >
              <option value="SEMUA" className="bg-white dark:bg-[#13171D]">
                {t('jpp:foodbank_all_distribution_locations_option', 'Semua Lokasi Pengagihan')}
              </option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id} className="bg-white dark:bg-[#13171D]">
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#3B635C] dark:text-[#94A0B2]"
              aria-hidden="true"
            />
            <input
              type="text"
              aria-label={t('jpp:foodbank_search_officer_target_placeholder', 'Cari pegawai, sasaran, butiran...')}
              value={auditSearchQuery}
              onChange={(e) => onAuditSearchQueryChange(e.target.value)}
              placeholder={t('jpp:foodbank_search_officer_target_placeholder', 'Cari pegawai, sasaran, butiran...')}
              className={cn(FB_INPUT, 'pl-9 pr-8')}
            />
            {auditSearchQuery && (
              <button
                type="button"
                onClick={() => onAuditSearchQueryChange('')}
                aria-label="Kosongkan carian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3B635C] dark:text-[#94A0B2] hover:text-[#0B2420] dark:hover:text-[#F1F5F9]"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Audit Timeline Cards */}
      {filteredAuditLogs.length === 0 ? (
        <div className={cn(FB_CARD, 'p-12 text-center space-y-3')}>
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] flex items-center justify-center">
            <FileText className="w-6 h-6" aria-hidden="true" />
          </div>
          <h4 className="text-base font-bold text-[#0B2420] dark:text-[#F1F5F9]">
            {t('jpp:foodbank_no_audit_records_found_title', 'Tiada Rekod Audit Ditemui')}
          </h4>
          <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] max-w-sm mx-auto">
            {t(
              'jpp:foodbank_no_audit_records_found_desc',
              'Tiada aktiviti transaksi sepadan dengan kriteria carian atau penapis kategori dan lokasi semasa.'
            )}
          </p>
          {(auditCategoryFilter !== 'SEMUA' || auditLocationFilter !== 'SEMUA' || auditSearchQuery.trim()) && (
            <button
              type="button"
              onClick={() => {
                onAuditCategoryFilterChange('SEMUA');
                onAuditLocationFilterChange('SEMUA');
                onAuditSearchQueryChange('');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF] border border-[#B8E4DC] dark:border-[#252B35] hover:bg-[#B8E4DC]/50 dark:hover:bg-[#232933] transition-colors"
            >
              {t('jpp:foodbank_reset_all_filters_btn', 'Set Semula Semua Penapis')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAuditLogs.map((log) => {
            const actionCfg = getAuditActionConfig(log.action_type, t);
            const ActionIcon = actionCfg.icon;
            const loc = locations.find((l) => l.id === log.location_id) || log.location;

            return (
              <article
                key={log.id}
                className={cn(
                  FB_CARD,
                  'p-4 sm:p-5 hover:border-[#0F766E]/40 dark:hover:border-[#2DD4BF]/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4'
                )}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[#B8E4DC]/40 dark:border-[#252B35]',
                      actionCfg.iconBg
                    )}
                  >
                    <ActionIcon className="w-5 h-5" aria-hidden="true" />
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-[#0B2420] dark:text-[#F1F5F9]">{actionCfg.label}</h4>
                      <span
                        className={cn(
                          'text-xs font-semibold uppercase px-2 py-0.5 rounded-full border',
                          actionCfg.badgeBg
                        )}
                      >
                        {actionCfg.category}
                      </span>
                      {loc ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                          <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                          {loc.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-[#F6FBF9] dark:bg-[#0E1116] text-[#3B635C] dark:text-[#94A0B2] border border-[#B8E4DC]/60 dark:border-[#252B35]">
                          <Sparkles className="w-3 h-3 shrink-0" aria-hidden="true" />
                          {t('jpp:foodbank_jpp_system_level', 'Peringkat Sistem JPP')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#3B635C] dark:text-[#94A0B2] flex-wrap">
                      <span className="font-semibold flex items-center gap-1 text-[#0B2420] dark:text-[#F1F5F9]">
                        <User className="w-3.5 h-3.5 text-[#3B635C] dark:text-[#94A0B2]" aria-hidden="true" />
                        {log.actor_name || t('kebajikan:system_admin_fallback', 'Pentadbir Sistem')}
                      </span>

                      {log.target_id && (
                        <>
                          <span>•</span>
                          <span className="font-medium">
                            {t('kebajikan:target_label_colon', 'Sasaran:')}{' '}
                            <strong className="text-[#0B2420] dark:text-[#F1F5F9] font-mono">
                              {log.target_id}
                            </strong>
                          </span>
                        </>
                      )}
                    </div>

                    {log.details && Object.keys(log.details).length > 0 && (
                      <div
                        className={cn(
                          FB_INSET,
                          'mt-2 p-3 text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'
                        )}
                      >
                        {Object.entries(log.details).map(([key, val]) => {
                          if (val === null || val === undefined || key === 'is_offline') return null;
                          const formattedKey = key
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (c) => c.toUpperCase());
                          return (
                            <div key={key} className="flex flex-col min-w-0">
                              <span className="text-xs uppercase font-semibold text-[#3B635C] dark:text-[#94A0B2] tracking-wider">
                                {formattedKey}
                              </span>
                              <span
                                className="font-semibold text-xs text-[#0B2420] dark:text-[#F1F5F9] truncate"
                                title={typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              >
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-2.5 md:pt-0 border-[#B8E4DC]/50 dark:border-[#252B35] shrink-0 text-right">
                  <span className="text-xs font-semibold text-[#0B2420] dark:text-[#F1F5F9] flex items-center gap-1.5 font-mono tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF]" aria-hidden="true" />
                    {formatAuditDateTime(log.created_at)}
                  </span>
                  <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-mono mt-0.5">
                    ID: #{log.id.slice(0, 8)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
