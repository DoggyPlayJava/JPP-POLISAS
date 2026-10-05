import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REACTION_EMOJIS, ReactionSummary } from '@/lib/polySuaraHelpers';

export interface PolySuaraReactionsProps {
  confessionId: string;
  reactions: ReactionSummary[];
  onToggleReaction: (confessionId: string, reactionType: string) => void;
  totalUpvotes?: number;
  className?: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const PolySuaraReactions: React.FC<PolySuaraReactionsProps> = ({
  confessionId,
  reactions = [],
  onToggleReaction,
  totalUpvotes,
  className,
  defaultOpen = false,
  isOpen: isOpenProp,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = isOpenProp !== undefined;
  const isPopoverOpen = isControlled ? isOpenProp : internalOpen;
  const containerRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = (open: boolean) => {
    if (!isControlled) {
      setInternalOpen(open);
    }
    onOpenChange?.(open);
  };

  // Close popover when clicking outside
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isPopoverOpen]);

  // Filter reaction pills with count > 0
  const activePills = (reactions || []).filter((r) => r.count > 0);

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex items-center flex-wrap gap-1.5', className)}
    >
      {/* Floating Capsule Popover */}
      <AnimatePresence>
        {isPopoverOpen && (
          <>
            {/* Transparent backdrop for outside tap/click dismiss */}
            <div
              data-testid="reaction-backdrop"
              className="fixed inset-0 z-20 cursor-default"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenChange(false);
              }}
            />

            <motion.div
              data-testid="reaction-popover"
              role="dialog"
              aria-label="Pilih Reaksi"
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 6 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute bottom-full mb-2 left-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 shadow-xl dark:shadow-2xl rounded-full px-3 py-1.5 flex items-center gap-2 transform-gpu"
            >
              {REACTION_EMOJIS.map((item) => {
                const hasReacted = reactions.some((r) => r.type === item.type && r.userReacted);
                return (
                  <motion.button
                    key={item.type}
                    data-testid={`reaction-emoji-${item.type}`}
                    type="button"
                    title={item.label}
                    aria-label={`${item.label} ${item.emoji}`}
                    whileHover={{ scale: 1.35, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleReaction(confessionId, item.type);
                      handleOpenChange(false);
                    }}
                    className={cn(
                      'relative text-xl sm:text-2xl p-1 rounded-full transition-transform focus:outline-none select-none cursor-pointer',
                      hasReacted && 'bg-rose-500/20 ring-2 ring-rose-500/40 rounded-full'
                    )}
                  >
                    <span>{item.emoji}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reaction Trigger Button (SmilePlus / Beri Reaksi) */}
      <button
        data-testid="reaction-trigger-btn"
        type="button"
        title="Beri Reaksi"
        aria-label="Beri Reaksi"
        aria-expanded={isPopoverOpen}
        onClick={(e) => {
          e.stopPropagation();
          handleOpenChange(!isPopoverOpen);
        }}
        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 px-2.5 py-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100/90 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 border border-slate-200/70 dark:border-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 cursor-pointer"
      >
        <SmilePlus className="w-4 h-4 mr-1 text-slate-600 dark:text-slate-300" />
        <span className="text-xs font-medium hidden sm:inline">Beri Reaksi</span>
      </button>

      {/* Active Reaction Pills */}
      {activePills.map((reaction) => {
        const isUserReacted = Boolean(reaction.userReacted);
        return (
          <button
            key={reaction.type}
            data-testid={`reaction-pill-${reaction.type}`}
            type="button"
            title={`${reaction.emoji} ${reaction.count}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleReaction(confessionId, reaction.type);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all select-none border min-h-[36px] sm:min-h-0 cursor-pointer',
              isUserReacted
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold shadow-sm'
                : 'bg-slate-100/90 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/10 font-normal'
            )}
          >
            <span className="text-sm leading-none">{reaction.emoji}</span>
            <span className="tabular-nums font-mono text-[11px]">{reaction.count}</span>
          </button>
        );
      })}

      {/* Optional fallback count if totalUpvotes provided without pills */}
      {totalUpvotes !== undefined && totalUpvotes > 0 && activePills.length === 0 && (
        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono px-1">
          {totalUpvotes}
        </span>
      )}
    </div>
  );
};

export default PolySuaraReactions;
