import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { POLISAS_CAMPUS_STICKERS } from '@/lib/polySuaraHelpers';

export interface PolySuaraStickerBadgeProps {
  stickerId: string;
  size?: 'sm' | 'md' | 'lg';
  onRemove?: () => void;
  className?: string;
}

export const PolySuaraStickerBadge: React.FC<PolySuaraStickerBadgeProps> = ({
  stickerId,
  size = 'md',
  onRemove,
  className,
}) => {
  const sticker = POLISAS_CAMPUS_STICKERS.find((s) => s.id === stickerId);

  if (!sticker) {
    return null;
  }

  const sizeStyles = {
    sm: {
      container: 'px-2 py-1 text-xs gap-1.5 rounded-xl',
      emoji: 'text-base',
      label: 'text-xs font-semibold',
      phrase: 'hidden sm:inline-block text-[10px] opacity-80',
      closeBtn: 'p-0.5 -mr-0.5',
      closeIcon: 'w-3 h-3',
    },
    md: {
      container: 'px-3 py-1.5 text-xs sm:text-sm gap-2 rounded-2xl',
      emoji: 'text-lg sm:text-xl',
      label: 'text-xs sm:text-sm font-bold',
      phrase: 'text-[11px] sm:text-xs opacity-85',
      closeBtn: 'p-1 -mr-1',
      closeIcon: 'w-3.5 h-3.5',
    },
    lg: {
      container: 'px-4 py-2.5 text-sm sm:text-base gap-2.5 rounded-2xl',
      emoji: 'text-2xl sm:text-3xl',
      label: 'text-sm sm:text-base font-bold',
      phrase: 'text-xs sm:text-sm opacity-90',
      closeBtn: 'p-1.5 -mr-1',
      closeIcon: 'w-4 h-4',
    },
  }[size];

  return (
    <div
      data-testid="sticker-badge"
      data-sticker-id={sticker.id}
      data-size={size}
      className={cn(
        'inline-flex items-center border bg-gradient-to-r shadow-xs backdrop-blur-md transition-all select-none',
        sticker.gradientClass,
        sticker.borderClass,
        sizeStyles.container,
        className
      )}
    >
      <span
        data-testid="sticker-badge-emoji"
        className={cn('shrink-0 filter drop-shadow-xs', sizeStyles.emoji)}
        aria-hidden="true"
      >
        {sticker.emoji}
      </span>

      <div className="flex flex-col min-w-0 leading-tight">
        <span
          data-testid="sticker-badge-label"
          className={cn('truncate text-slate-800 dark:text-slate-100', sizeStyles.label)}
        >
          {sticker.label}
        </span>
        <span
          data-testid="sticker-badge-phrase"
          className={cn('truncate text-slate-600 dark:text-slate-300', sizeStyles.phrase)}
        >
          {sticker.phrase}
        </span>
      </div>

      {onRemove && (
        <button
          data-testid="sticker-badge-remove-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Buang sticker ${sticker.label}`}
          title="Buang sticker"
          className={cn(
            'inline-flex items-center justify-center rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-1',
            sizeStyles.closeBtn
          )}
        >
          <X className={sizeStyles.closeIcon} />
        </button>
      )}
    </div>
  );
};

export default PolySuaraStickerBadge;
