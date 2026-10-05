import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Plus } from 'lucide-react';
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

  // Compute heart reaction & likes
  const heartReaction = (reactions || []).find((r) => r.type === 'heart');
  const isHearted = Boolean(heartReaction?.userReacted);
  const displayLikes = (heartReaction?.count ?? 0) > 0 ? heartReaction!.count : (totalUpvotes ?? 0);

  // Filter non-heart active reactions with count > 0
  const nonHeartActivePills = (reactions || []).filter((r) => r.type !== 'heart' && r.count > 0);

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex items-center flex-nowrap shrink-0 gap-1.5', className)}
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
              className="absolute bottom-full mb-2 left-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 shadow-xl dark:shadow-2xl rounded-full px-3 py-1.5 flex items-center gap-2 transform-gpu shrink-0 flex-nowrap"
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

      {/* One-Tap Heart (❤️) Like Button + Menu Trigger Cluster */}
      <div className="inline-flex items-center rounded-full bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 p-0.5 shadow-xs shrink-0 flex-nowrap">
        <button
          data-testid="reaction-heart-btn"
          type="button"
          title="Suka luahan ini"
          aria-label={`Suka (${displayLikes})`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleReaction(confessionId, 'heart');
          }}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all select-none cursor-pointer flex-nowrap shrink-0 min-h-[32px] sm:min-h-0',
            isHearted
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400'
          )}
        >
          <Heart
            className={cn(
              'w-3.5 h-3.5 transition-transform active:scale-125 shrink-0',
              isHearted && 'fill-current text-white'
            )}
          />
          <span className="tabular-nums font-mono text-[11px] leading-none shrink-0">{displayLikes}</span>
        </button>

        <button
          data-testid="reaction-menu-trigger"
          type="button"
          title="Pilih reaksi lain"
          aria-label="Pilih reaksi lain"
          aria-expanded={isPopoverOpen}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenChange(!isPopoverOpen);
          }}
          className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Non-Heart Active Reaction Pills */}
      {nonHeartActivePills.length > 0 && (
        <div className="inline-flex items-center gap-1 flex-nowrap shrink-0">
          {nonHeartActivePills.map((reaction) => {
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
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all select-none border shrink-0 flex-nowrap cursor-pointer min-h-[30px] sm:min-h-0',
                  isUserReacted
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 font-bold shadow-xs'
                    : 'bg-slate-100/90 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/10'
                )}
              >
                <span className="text-xs leading-none shrink-0">{reaction.emoji}</span>
                <span className="tabular-nums font-mono text-[10px] shrink-0">{reaction.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PolySuaraReactions;
