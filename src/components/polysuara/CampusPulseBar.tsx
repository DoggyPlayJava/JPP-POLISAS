import React from 'react';
import { cn } from '@/lib/utils';

export interface PulseItem {
  id: string;
  label: string;
  emoji: string;
  gradientRing: string;
  categoryFilter?: string;
  isCreate?: boolean;
}

export interface CampusPulseBarProps {
  activePulseId: string;
  onSelectPulse: (id: string, categoryFilter?: string) => void;
  onOpenCompose: () => void;
  items?: PulseItem[];
  className?: string;
}

export const DEFAULT_PULSE_ITEMS: PulseItem[] = [
  { id: 'create', label: '+ Luah', emoji: '✍️', gradientRing: 'from-rose-500 to-pink-500', isCreate: true },
  { id: 'all', label: 'Semua', emoji: '🌟', gradientRing: 'from-slate-400 to-slate-600', categoryFilter: 'SEMUA' },
  { id: 'trending', label: 'Hangat', emoji: '⚡', gradientRing: 'from-amber-400 via-rose-500 to-pink-500' },
  { id: 'exam', label: 'Exam', emoji: '📚', gradientRing: 'from-blue-400 to-indigo-500', categoryFilter: 'AKADEMIK' },
  { id: 'kamsis', label: 'Kamsis', emoji: '🏠', gradientRing: 'from-emerald-400 to-teal-500', categoryFilter: 'KAMSIS' },
  { id: 'kafe', label: 'Kafe', emoji: '🍔', gradientRing: 'from-orange-400 to-amber-500', categoryFilter: 'FASILITI' },
  { id: 'aduan', label: 'Aduan', emoji: '💬', gradientRing: 'from-purple-400 to-pink-500', categoryFilter: 'KAUNSELING' },
];

export const CampusPulseBar: React.FC<CampusPulseBarProps> = ({
  activePulseId,
  onSelectPulse,
  onOpenCompose,
  items = DEFAULT_PULSE_ITEMS,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 sm:gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x',
        className
      )}
    >
      {items.map((item) => {
        const isActive = activePulseId === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.isCreate) {
                onOpenCompose();
              } else {
                onSelectPulse(item.id, item.categoryFilter);
              }
            }}
            className="flex flex-col items-center flex-shrink-0 snap-start focus:outline-none cursor-pointer max-w-[64px] sm:max-w-[72px] group"
            aria-label={item.label}
          >
            {/* Story Bubble Circle Container */}
            <div
              className={cn(
                'w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] transition-all duration-200 active:scale-95 group relative bg-gradient-to-tr',
                item.gradientRing,
                isActive && 'shadow-[0_0_15px_rgba(244,63,94,0.35)] ring-2 ring-rose-500/50'
              )}
            >
              {/* Inner Avatar */}
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-xl sm:text-2xl shadow-inner select-none">
                <span>{item.emoji}</span>
              </div>

              {/* Create item indicator badge */}
              {item.isCreate && (
                <span
                  className="absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] sm:text-xs font-black shadow-md border-2 border-white dark:border-slate-900 select-none leading-none"
                  aria-hidden="true"
                >
                  +
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-[11px] sm:text-xs font-bold text-center mt-1 text-slate-700 dark:text-slate-300 truncate w-full transition-colors',
                isActive && 'text-rose-600 dark:text-rose-400 font-extrabold'
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CampusPulseBar;
