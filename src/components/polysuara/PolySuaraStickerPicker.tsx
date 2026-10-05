import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { POLISAS_CAMPUS_STICKERS, CampusSticker } from '@/lib/polySuaraHelpers';

export type StickerCategory = 'SEMUA' | 'STUDY' | 'MOOD' | 'CAMPUS' | 'MEME';

export interface PolySuaraStickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (stickerId: string) => void;
  selectedStickerId?: string | null;
  defaultCategory?: StickerCategory;
  className?: string;
}

export const CATEGORY_TABS: Array<{ key: StickerCategory; label: string }> = [
  { key: 'SEMUA', label: 'Semua' },
  { key: 'STUDY', label: 'Study' },
  { key: 'MOOD', label: 'Mood' },
  { key: 'CAMPUS', label: 'Campus' },
  { key: 'MEME', label: 'Meme' },
];

export const PolySuaraStickerPicker: React.FC<PolySuaraStickerPickerProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
  selectedStickerId,
  defaultCategory = 'SEMUA',
  className,
}) => {
  const [activeCategory, setActiveCategory] = useState<StickerCategory>(defaultCategory);

  if (!isOpen) {
    return null;
  }

  const filteredStickers =
    activeCategory === 'SEMUA'
      ? POLISAS_CAMPUS_STICKERS
      : POLISAS_CAMPUS_STICKERS.filter((s) => s.category === activeCategory);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop Dismissal Overlay */}
        <motion.div
          data-testid="sticker-picker-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-default"
        />

        {/* Dialog / Drawer Container */}
        <motion.div
          data-testid="sticker-picker-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Pilih Pelekat Kampus POLISAS"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 26, stiffness: 350 }}
          className={cn(
            'relative z-10 w-full max-h-[85vh] sm:max-h-[80vh] flex flex-col',
            'fixed inset-x-0 bottom-0 rounded-t-3xl sm:rounded-3xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md',
            'bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl overflow-hidden transform-gpu',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-rose-500/10 text-rose-500 dark:bg-rose-500/20">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Pelekat Kampus POLISAS
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Vibe kehidupan kampus & politeknik
                </p>
              </div>
            </div>

            <button
              data-testid="sticker-picker-close-btn"
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              title="Tutup"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category Filter Pills */}
          <div
            className="flex items-center gap-1.5 px-5 py-3 overflow-x-auto scrollbar-none border-b border-slate-100 dark:border-white/5 shrink-0"
            role="tablist"
          >
            {CATEGORY_TABS.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  data-testid={`sticker-category-tab-${cat.key}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveCategory(cat.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold min-h-[44px] sm:min-h-0 transition-all select-none cursor-pointer',
                    isActive
                      ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/30'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Sticker Grid */}
          <div className="grid grid-cols-2 gap-2.5 p-4 overflow-y-auto max-h-[55vh] sm:max-h-[380px] overscroll-contain">
            {filteredStickers.map((sticker: CampusSticker) => {
              const isSelected = selectedStickerId === sticker.id;
              return (
                <motion.button
                  key={sticker.id}
                  data-testid={`sticker-item-${sticker.id}`}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    onSelectSticker(sticker.id);
                    onClose();
                  }}
                  className={cn(
                    'relative p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer min-h-[44px]',
                    'bg-gradient-to-br backdrop-blur-md',
                    sticker.gradientClass,
                    sticker.borderClass,
                    isSelected && 'ring-2 ring-rose-500 dark:ring-rose-400 shadow-md'
                  )}
                >
                  <div className="flex items-start justify-between w-full">
                    <span className="text-2xl filter drop-shadow-xs" aria-hidden="true">
                      {sticker.emoji}
                    </span>
                    {isSelected && (
                      <span
                        data-testid="sticker-selected-indicator"
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[10px]"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <div className="mt-2 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {sticker.label}
                    </p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-tight">
                      {sticker.phrase}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PolySuaraStickerPicker;
