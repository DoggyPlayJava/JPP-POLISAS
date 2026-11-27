import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, Flame, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCivicProgressStep, shouldShowCivicTracker } from '@/lib/polySuaraHelpers';
export { PolySuaraImageLightbox, type PolySuaraMediaViewerProps } from './PolySuaraMediaViewer';

export interface PolySuaraQuickReportModalProps {
  isOpen: boolean;
  targetType: 'CONFESSION' | 'COMMENT';
  reason: string;
  onReasonChange: (value: string) => void;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function PolySuaraQuickReportModal({
  isOpen,
  targetType,
  reason,
  onReasonChange,
  isSubmitting,
  onClose,
  onSubmit,
}: PolySuaraQuickReportModalProps) {
  const { t } = useTranslation(['services', 'common']);

  const quickReasons = [
    t('services:report_chip_harassment', 'Gangguan / Buli Siber'),
    t('services:report_chip_misinfo', 'Maklumat Palsu / Fitnah'),
    t('services:report_chip_spam', 'Spam / Iklan'),
    t('services:report_chip_sensitive', 'Kandungan Sensitif'),
    t('services:report_chip_crisis', 'Bantuan Krisis / Kebajikan'),
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#090B0E]/75 z-[99990]"
          />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[99995] pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t('services:report_content_title', 'Laporkan Kandungan')}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="w-full max-w-md bg-white dark:bg-[#13171D] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-[2rem] shadow-2xl p-6 pointer-events-auto text-[#0B2420] dark:text-[#F1F5F9]"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>
                    {targetType === 'COMMENT'
                      ? t('services:report_comment', 'Lapor Ulasan')
                      : t('services:report_content_title', 'Laporkan Kandungan')}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t('common:close', 'Tutup')}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-[#3B635C] dark:text-[#94A0B2] mb-3">
                {t('services:report_quick_select_desc', 'Pilih sebab pantas di bawah atau nyatakan butiran untuk semakan Exco Kebajikan.')}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {quickReasons.map((chip) => {
                  const selected = reason === chip;
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => onReasonChange(chip)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer',
                        selected
                          ? 'bg-[#0F766E] border-[#0F766E] text-white dark:bg-[#2DD4BF] dark:border-[#2DD4BF] dark:text-[#090B0E]'
                          : 'bg-[#F6FBF9] dark:bg-[#0E1116] border-[#B8E4DC]/80 dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] hover:border-[#0F766E]/40'
                      )}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>

              <textarea
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder={t('services:report_reason_placeholder', 'Sebab laporan...')}
                className="w-full bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] rounded-2xl p-3.5 text-sm text-[#0B2420] dark:text-[#F1F5F9] placeholder:text-[#3B635C]/70 dark:placeholder:text-[#94A0B2]/60 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/40 resize-none transition-colors mb-4"
                rows={3}
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-[#3B635C] dark:text-[#94A0B2] hover:bg-[#EBF7F4] dark:hover:bg-[#1B2028] transition-colors text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  {t('common:cancel', 'Batal')}
                </button>
                <button
                  type="button"
                  disabled={reason.trim().length < 3 || isSubmitting}
                  onClick={onSubmit}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-[#EBF7F4] dark:disabled:bg-[#1B2028] disabled:text-[#3B635C]/50 dark:disabled:text-[#94A0B2]/40 text-slate-950 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{t('services:submit_report', 'Hantar Laporan')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export interface PolySuaraCivicProgressProps {
  status?: string | null;
  category?: string | null;
  upvotes?: number;
}

export function PolySuaraCivicProgress({
  status,
  category,
  upvotes = 0,
}: PolySuaraCivicProgressProps) {
  const { t } = useTranslation(['services']);
  if (!shouldShowCivicTracker(category, status)) return null;

  const isCivicCategory = category === 'FASILITI' || category === 'KAMSIS';
  const step = getCivicProgressStep(status);
  const isPriority = isCivicCategory && upvotes >= 15;

  const stages = [
    { num: 1, label: t('services:civic_step_voiced', 'Disuarakan') },
    { num: 2, label: t('services:civic_step_received', 'Diterima JPP') },
    { num: 3, label: t('services:civic_step_investigating', 'Disiasat') },
    { num: 4, label: t('services:civic_step_resolved', 'Selesai') },
  ];

  return (
    <div className="mb-3.5 rounded-2xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35] px-3.5 py-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] font-bold text-[#0F766E] dark:text-[#2DD4BF]">
          {t('services:civic_tracker_label', 'Penjejak Tindakan Kampus')}
        </span>
        {isPriority && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <Flame className="w-3 h-3" />
            <span>{t('services:campus_priority_badge', 'Keutamaan Kampus')}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {stages.map((st) => {
          const active = st.num <= step;
          return (
            <div key={st.num} className="space-y-1">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-colors',
                  active
                    ? 'bg-[#0F766E] dark:bg-[#2DD4BF]'
                    : 'bg-[#B8E4DC]/50 dark:bg-[#252B35]'
                )}
              />
              <div className="flex items-start gap-1">
                {active && <Check className="w-2.5 h-2.5 mt-0.5 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" />}
                <span
                  className={cn(
                    'text-[10px] font-semibold leading-tight',
                    active
                      ? 'text-[#0B2420] dark:text-[#F1F5F9]'
                      : 'text-[#3B635C]/80 dark:text-[#94A0B2]/75'
                  )}
                >
                  {st.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
