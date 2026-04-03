import React from 'react';
import { Clock, Eye, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportStatus } from '@/types';

interface StatusChipProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

const CONFIG: Record<string, { label: string; icon: React.ElementType; classes: string }> = {
  // Report Status
  'Menunggu':       { label: 'Menunggu',       icon: Clock,         classes: 'bg-amber-100 text-amber-700 border-amber-200'  },
  'Dalam Semakan':  { label: 'Dalam Semakan',  icon: Eye,           classes: 'bg-blue-100 text-blue-700 border-blue-200'     },
  'Diluluskan':     { label: 'Diluluskan',     icon: CheckCircle2,  classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'Ditolak':        { label: 'Ditolak',        icon: XCircle,       classes: 'bg-red-100 text-red-700 border-red-200'         },
  // Activity Status
  'perancangan':    { label: 'Perancangan',    icon: Clock,         classes: 'bg-blue-100 text-blue-700 border-blue-200'     },
  'aktif':          { label: 'Aktif',          icon: Activity,      classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'selesai':        { label: 'Selesai',        icon: CheckCircle2,  classes: 'bg-slate-100 text-slate-600 border-slate-200'   },
  'ditangguh':      { label: 'Ditangguh',      icon: XCircle,       classes: 'bg-orange-100 text-orange-700 border-orange-200' },
};

export function StatusChip({ status, size = 'sm', className }: StatusChipProps) {
  const { label, icon: Icon, classes } = CONFIG[status] ?? CONFIG['Menunggu'];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-black uppercase tracking-widest rounded-full border',
      size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[10px] px-3 py-1',
      classes,
      className,
    )}>
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {label}
    </span>
  );
}
