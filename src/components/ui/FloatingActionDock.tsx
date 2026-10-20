import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DockAction {
  label: string;
  onClick: () => void;
  icon?: React.ElementType;
  variant?: 'default' | 'destructive' | 'outline';
  disabled?: boolean;
}

interface FloatingActionDockProps {
  count: number;
  onClear: () => void;
  actions: DockAction[];
  className?: string;
}

export function FloatingActionDock({
  count,
  onClear,
  actions,
  className,
}: FloatingActionDockProps) {
  const { t } = useTranslation('common');

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/95 dark:bg-[#1C261D]/95 text-white shadow-2xl border border-white/10 backdrop-blur-md',
            className
          )}
        >
          <div className="flex items-center gap-2 pr-3 border-r border-white/15">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tabular-nums">
              {count} dipilih
            </span>
          </div>

          <div className="flex items-center gap-2">
            {actions.map((act, i) => {
              const Icon = act.icon;
              return (
                <button
                  key={i}
                  onClick={act.onClick}
                  disabled={act.disabled}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer',
                    act.variant === 'destructive'
                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm'
                      : act.variant === 'outline'
                        ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  )}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{act.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onClear}
            title={t('common:cancel_selection_esc', 'Batal pilihan (Esc)')}
            className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors ml-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
