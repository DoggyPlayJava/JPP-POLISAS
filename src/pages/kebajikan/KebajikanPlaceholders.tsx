import React from 'react';
import { useTranslation } from 'react-i18next';
import { HeartHandshake } from 'lucide-react';

// These pages are now fully implemented in their own files.
// This file is kept for backwards-compatibility but re-exports from the real pages.
export { KebajikanReportPage }    from './KebajikanReportPage';
export { KebajikanStaffPage }     from './KebajikanStaffPage';
export { KebajikanSettingsPage }  from './KebajikanSettingsPage';

export function KebajikanEmptyState({ title, description }: { title?: string; description?: string }) {
  const { t } = useTranslation(['kebajikan', 'common']);
  return (
    <div className="text-center py-12 p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-sm">
      <HeartHandshake className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-white/20" />
      <p className="font-black text-slate-800 dark:text-white/40 text-base mb-1">
        {title || t('kebajikan:my_tickets_empty_title', 'Tiada Aduan Dikemukakan')}
      </p>
      <p className="text-xs text-slate-500 dark:text-white/30">
        {description || t('kebajikan:my_tickets_empty_desc', 'Aduan yang anda kemukakan akan dipaparkan di sini')}
      </p>
    </div>
  );
}
