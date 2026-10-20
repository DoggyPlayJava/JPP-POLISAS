import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Eye, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportStatus } from '@/types';

interface StatusChipProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusChip({ status, size = 'sm', className }: StatusChipProps) {
  const { t } = useTranslation(['kpp', 'common']);

  const getStatusConfig = (s: string) => {
    switch (s) {
      case 'Menunggu':
        return { label: t('kpp:report_status_submitted', 'Menunggu'), icon: Clock, classes: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'Dalam Semakan':
        return { label: t('kpp:report_status_reviewing', 'Dalam Semakan'), icon: Eye, classes: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'Diluluskan':
        return { label: t('kpp:report_status_approved', 'Diluluskan'), icon: CheckCircle2, classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'Ditolak':
        return { label: t('kpp:report_status_rejected', 'Ditolak'), icon: XCircle, classes: 'bg-red-100 text-red-700 border-red-200' };
      case 'perancangan':
        return { label: t('kpp:event_status_upcoming', 'Perancangan'), icon: Clock, classes: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'aktif':
        return { label: t('kpp:event_status_ongoing', 'Aktif'), icon: Activity, classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'selesai':
        return { label: t('kpp:event_status_completed', 'Selesai'), icon: CheckCircle2, classes: 'bg-slate-100 text-slate-600 border-slate-200' };
      case 'ditangguh':
        return { label: t('kpp:event_status_postponed', 'Ditangguh'), icon: XCircle, classes: 'bg-orange-100 text-orange-700 border-orange-200' };
      default:
        return { label: t('kpp:report_status_submitted', 'Menunggu'), icon: Clock, classes: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
  };

  const cfg = getStatusConfig(status);
  const Icon = cfg.icon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-black uppercase tracking-widest rounded-full border',
      size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[10px] px-3 py-1',
      cfg.classes,
      className,
    )}>
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {cfg.label}
    </span>
  );
}
