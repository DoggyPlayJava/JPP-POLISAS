import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plus, Filter, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FoodBankBudgetTransaction } from '@/types';
import { FB_CARD, FB_INPUT, FB_PRIMARY_BTN, type AppMetrics } from './foodbankAdminUtils';

interface FoodBankBudgetTabProps {
  budgetAllocation: number;
  currentSpent: number;
  remainingBudget: number;
  appMetrics: AppMetrics;
  txFilter: string;
  onTxFilterChange: (val: string) => void;
  txSearch: string;
  onTxSearchChange: (val: string) => void;
  filteredTransactions: FoodBankBudgetTransaction[];
  onOpenBudgetModal: () => void;
}

export const FoodBankBudgetTab: React.FC<FoodBankBudgetTabProps> = ({
  budgetAllocation,
  currentSpent,
  remainingBudget,
  appMetrics,
  txFilter,
  onTxFilterChange,
  txSearch,
  onTxSearchChange,
  filteredTransactions,
  onOpenBudgetModal,
}) => {
  const { t } = useTranslation(['kebajikan', 'jpp', 'common']);

  return (
    <motion.div
      key="tab-budget"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className="space-y-6"
    >
      {/* Budget Audit Summary Card */}
      <section className={cn(FB_CARD, 'p-5 sm:p-6')}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] dark:text-[#2DD4BF]">
              {t('kebajikan:welfare_fund_audit_title', 'Pengauditan Tabung Kebajikan')}
            </span>
            <h2 className="text-xl font-bold text-[#0B2420] dark:text-[#F1F5F9] mt-0.5 [text-wrap:balance]">
              {t('kebajikan:budget_utilization_statement', 'Penyata Penggunaan Peruntukan RM {{amount}}', {
                amount: budgetAllocation.toLocaleString('en-MY'),
              })}
            </h2>
            <p className="text-xs text-[#3B635C] dark:text-[#94A0B2] mt-1 max-w-xl leading-relaxed">
              {t(
                'jpp:foodbank_budget_ledger_desc',
                'Setiap agihan barangan di kaunter menolak bajet secara automatik mengikut nilai kos sebenar pek barangan. Semua transaksi direkodkan secara lejar kekal (immutable ledger).'
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenBudgetModal}
            className={cn(
              FB_PRIMARY_BTN,
              'px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap self-start md:self-auto shrink-0'
            )}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Pelarasan / Suntikan Bajet
          </button>
        </div>

        {/* 4 Breakdown Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-[#B8E4DC]/60 dark:border-[#252B35]">
          <div>
            <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-semibold uppercase tracking-wider">
              {t('jpp:foodbank_budget_baseline_label', 'Peruntukan Asas')}
            </span>
            <p className="text-base font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums mt-1">
              RM {budgetAllocation.toFixed(2)}
            </p>
          </div>
          <div>
            <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-semibold uppercase tracking-wider">
              {t('jpp:foodbank_total_spent_label', 'Jumlah Digunakan')}
            </span>
            <p className="text-base font-bold text-rose-700 dark:text-rose-400 font-mono tabular-nums mt-1">
              RM {currentSpent.toFixed(2)}
            </p>
          </div>
          <div>
            <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-semibold uppercase tracking-wider">
              {t('jpp:foodbank_remaining_balance_label', 'Baki Sedia Ada')}
            </span>
            <p className="text-base font-bold text-[#0F766E] dark:text-[#2DD4BF] font-mono tabular-nums mt-1">
              RM {remainingBudget.toFixed(2)}
            </p>
          </div>
          <div>
            <span className="text-xs text-[#3B635C] dark:text-[#94A0B2] font-semibold uppercase tracking-wider">
              {t('jpp:foodbank_avg_cost_student_label', 'Purata Kos / Pelajar')}
            </span>
            <p className="text-base font-bold text-[#0B2420] dark:text-[#F1F5F9] font-mono tabular-nums mt-1">
              RM {appMetrics.completed > 0 ? (currentSpent / appMetrics.completed).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>
      </section>

      {/* Immutable Ledger Table */}
      <div className={cn(FB_CARD, 'overflow-hidden')}>
        <div className="p-4 border-b border-[#B8E4DC]/60 dark:border-[#252B35] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            <Filter className="w-4 h-4 text-[#3B635C] dark:text-[#94A0B2] shrink-0 mr-1" aria-hidden="true" />
            {(['SEMUA', 'DISTRIBUTION', 'BUDGET_ADDITION', 'ADJUSTMENT'] as const).map((txT) => (
              <button
                key={txT}
                type="button"
                onClick={() => onTxFilterChange(txT)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]',
                  txFilter === txT
                    ? 'bg-[#0F766E] text-white dark:bg-[#1B2028] dark:text-[#2DD4BF] dark:border dark:border-[#2DD4BF]/30'
                    : 'text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028]'
                )}
              >
                {txT === 'SEMUA' ? t('jpp:foodbank_all_transactions', 'Semua Transaksi') : txT}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-60">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#3B635C] dark:text-[#94A0B2]"
              aria-hidden="true"
            />
            <input
              type="text"
              aria-label={t('jpp:foodbank_search_ledger_placeholder', 'Cari transaksi / keterangan...')}
              value={txSearch}
              onChange={(e) => onTxSearchChange(e.target.value)}
              placeholder={t('jpp:foodbank_search_ledger_placeholder', 'Cari transaksi / keterangan...')}
              className={cn(FB_INPUT, 'pl-9')}
            />
          </div>
        </div>

        <div className="w-full max-w-full overflow-x-auto scrollbar-hide">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead>
              <tr className="bg-[#F6FBF9] dark:bg-[#0E1116] border-b border-[#B8E4DC] dark:border-[#252B35] text-[#3B635C] dark:text-[#94A0B2] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">{t('jpp:foodbank_audit_col_datetime', 'Tarikh & Masa')}</th>
                <th className="py-3 px-4">{t('jpp:foodbank_col_tx_type', 'Jenis Transaksi')}</th>
                <th className="py-3 px-4">{t('jpp:foodbank_col_ref_no', 'No. Rujukan')}</th>
                <th className="py-3 px-4">{t('jpp:foodbank_col_description', 'Keterangan')}</th>
                <th className="py-3 px-4">{t('jpp:foodbank_th_officer', 'Pegawai')}</th>
                <th className="py-3 px-4 text-right">{t('jpp:foodbank_col_amount_rm', 'Amaun (RM)')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#B8E4DC]/50 dark:divide-[#252B35]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#3B635C] dark:text-[#94A0B2] font-medium">
                    {t('jpp:foodbank_no_ledger_tx_found', 'Tiada transaksi lejar ditemui.')}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isDeduction = tx.transaction_type === 'DISTRIBUTION';
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-[#F6FBF9] dark:hover:bg-[#1B2028]/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-[#3B635C] dark:text-[#94A0B2] font-mono tabular-nums">
                        {new Date(tx.created_at || '').toLocaleString('ms-MY', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-semibold uppercase',
                            isDeduction
                              ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                              : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          )}
                        >
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#0B2420] dark:text-[#F1F5F9]">
                        {tx.application?.application_no || '-'}
                      </td>
                      <td className="py-3 px-4 text-[#0B2420] dark:text-[#F1F5F9] font-normal max-w-md">
                        {tx.description}
                      </td>
                      <td className="py-3 px-4 text-[#3B635C] dark:text-[#94A0B2]">
                        {tx.creator?.full_name || 'Sistem'}
                      </td>
                      <td
                        className={cn(
                          'py-3 px-4 text-right font-bold font-mono text-sm tabular-nums',
                          isDeduction
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-[#0F766E] dark:text-[#2DD4BF]'
                        )}
                      >
                        {isDeduction ? '-' : '+'} RM {Number(tx.amount).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
