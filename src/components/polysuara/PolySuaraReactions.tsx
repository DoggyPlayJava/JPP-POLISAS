import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [popoverCoords, setPopoverCoords] = useState<{ bottom: number; left: number } | null>(null);

  // Breakdown popover state
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [breakdownCoords, setBreakdownCoords] = useState<{ bottom: number; left: number } | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!isControlled) {
      setInternalOpen(open);
    }
    onOpenChange?.(open);
    if (open) {
      setIsBreakdownOpen(false);
    }
  };

  const handleToggleBreakdown = () => {
    const nextState = !isBreakdownOpen;
    setIsBreakdownOpen(nextState);
    if (nextState) {
      handleOpenChange(false);
    }
  };

  // Close WhatsApp popover when clicking outside or scrolling
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleOpenChange(false);
      }
    };

    const updateCoords = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 280;
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 667;
      const left = Math.max(12, Math.min(rect.left, windowWidth - popoverWidth - 12));
      const bottom = windowHeight - rect.top + 8;
      setPopoverCoords({ bottom, left });
    };

    updateCoords();

    const handleDismissOnEvent = () => {
      handleOpenChange(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('scroll', handleDismissOnEvent, true);
    window.addEventListener('resize', handleDismissOnEvent);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleDismissOnEvent, true);
      window.removeEventListener('resize', handleDismissOnEvent);
    };
  }, [isPopoverOpen]);

  // Close Breakdown popover when clicking outside or scrolling
  useEffect(() => {
    if (!isBreakdownOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsBreakdownOpen(false);
      }
    };

    const updateCoords = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 210;
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
      const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 667;
      const left = Math.max(12, Math.min(rect.left, windowWidth - popoverWidth - 12));
      const bottom = windowHeight - rect.top + 8;
      setBreakdownCoords({ bottom, left });
    };

    updateCoords();

    const handleDismissOnEvent = () => {
      setIsBreakdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('scroll', handleDismissOnEvent, true);
    window.addEventListener('resize', handleDismissOnEvent);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleDismissOnEvent, true);
      window.removeEventListener('resize', handleDismissOnEvent);
    };
  }, [isBreakdownOpen]);

  // Active user reaction
  const userReaction = (reactions || []).find((r) => r.userReacted);
  const isUserReacted = Boolean(userReaction);
  const activeEmoji = userReaction?.emoji;
  const activeType = userReaction?.type;

  // Total reaction & likes calculation
  const totalReactionsCount = (reactions || []).reduce((sum, r) => sum + r.count, 0);
  const displayLikes = Math.max(totalReactionsCount, totalUpvotes ?? 0);

  // Active reactions with count > 0 sorted by count descending
  const activeReactions = (reactions || []).filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
  const topEmojis = activeReactions.slice(0, 3);
  const hasDiverseReactions = activeReactions.length > 1 || (activeReactions.length === 1 && activeReactions[0].type !== 'heart');
  const breakdownTooltipText = activeReactions.length > 0
    ? activeReactions.map((r) => `${r.emoji} ${r.count}`).join(' · ')
    : 'Belum ada reaksi';

  // Handler for clicking the main reaction button
  const handleMainButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUserReacted && activeType) {
      onToggleReaction(confessionId, activeType);
    } else {
      onToggleReaction(confessionId, 'heart');
    }
  };

  // WhatsApp Reaction Popover Content
  const popoverContent = (
    <AnimatePresence>
      {isPopoverOpen && (
        <>
          {/* Transparent backdrop for outside tap/click dismiss */}
          <div
            data-testid="reaction-backdrop"
            className="fixed inset-0 z-[9990] cursor-default"
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
            style={popoverCoords ? {
              position: 'fixed',
              bottom: `${popoverCoords.bottom}px`,
              left: `${popoverCoords.left}px`,
              zIndex: 9999,
            } : undefined}
            className={cn(
              "z-[9999] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 shadow-xl dark:shadow-2xl rounded-full px-3 py-1.5 flex items-center gap-2 transform-gpu shrink-0 flex-nowrap",
              !popoverCoords && "absolute bottom-full mb-2 left-0"
            )}
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
  );

  // Reaction Breakdown Popover Content
  const breakdownContent = (
    <AnimatePresence>
      {isBreakdownOpen && (
        <>
          <div
            data-testid="breakdown-backdrop"
            className="fixed inset-0 z-[9980] cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setIsBreakdownOpen(false);
            }}
          />

          <motion.div
            data-testid="reactions-breakdown-popover"
            role="dialog"
            aria-label="Pecahan Reaksi Komuniti"
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={breakdownCoords ? {
              position: 'fixed',
              bottom: `${breakdownCoords.bottom}px`,
              left: `${breakdownCoords.left}px`,
              zIndex: 9985,
            } : undefined}
            className={cn(
              "z-[9985] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 shadow-2xl rounded-2xl p-2.5 flex flex-col gap-1 min-w-[190px] max-w-[240px]",
              !breakdownCoords && "absolute bottom-full mb-2 left-0"
            )}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1.5 pb-1.5 border-b border-slate-100 dark:border-white/5">
              <span>Reaksi Komuniti</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{displayLikes}</span>
            </div>

            <div className="flex flex-col gap-0.5 mt-1">
              {activeReactions.map((r) => (
                <button
                  key={r.type}
                  data-testid={`breakdown-row-${r.type}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleReaction(confessionId, r.type);
                    setIsBreakdownOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded-xl transition-all cursor-pointer select-none text-left w-full hover:bg-slate-100 dark:hover:bg-white/5",
                    r.userReacted
                      ? "bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold"
                      : "text-slate-700 dark:text-slate-300"
                  )}
                  title={r.userReacted ? `Klik untuk batal ${r.label || r.type}` : `Klik untuk beri ${r.label || r.type}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{r.emoji}</span>
                    <span className="capitalize text-xs font-semibold">{r.label || r.type}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="tabular-nums font-bold">{r.count}</span>
                    {r.userReacted && (
                      <span className="text-[10px] font-sans font-bold text-rose-500 dark:text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded-full">
                        Anda
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const canUsePortal = typeof document !== 'undefined' && Boolean(document.body);

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex items-center flex-nowrap shrink-0 gap-1.5', className)}
    >
      {/* Floating Capsule Popover (Portal elevated above all cards & overflows) */}
      {canUsePortal ? createPortal(popoverContent, document.body) : popoverContent}

      {/* Breakdown Popover (Portal elevated) */}
      {canUsePortal ? createPortal(breakdownContent, document.body) : breakdownContent}

      {/* Unified Reaction Cluster Capsule */}
      <div className="inline-flex items-center rounded-full bg-slate-100/90 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 p-0.5 shadow-xs shrink-0 flex-nowrap">
        {/* Dynamic User Reaction / Like Button */}
        <button
          data-testid="reaction-heart-btn"
          type="button"
          title={isUserReacted ? (userReaction?.label ? `Batal reaksi ${userReaction.label}` : 'Batal reaksi') : 'Suka luahan ini'}
          aria-label={`Suka (${displayLikes})`}
          onClick={handleMainButtonClick}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all select-none cursor-pointer flex-nowrap shrink-0 min-h-[32px] sm:min-h-0',
            isUserReacted
              ? activeType === 'heart'
                ? 'bg-rose-500 text-white shadow-xs'
                : activeType === 'laugh'
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold'
                : activeType === 'fire'
                ? 'bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-bold'
                : activeType === 'cry'
                ? 'bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 font-bold'
                : activeType === 'shock'
                ? 'bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 font-bold'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400'
          )}
        >
          {isUserReacted && activeEmoji && activeType !== 'heart' ? (
            <span className="text-sm leading-none shrink-0 transform active:scale-125 transition-transform">
              {activeEmoji}
            </span>
          ) : (
            <Heart
              className={cn(
                'w-3.5 h-3.5 transition-transform active:scale-125 shrink-0',
                isUserReacted && activeType === 'heart' && 'fill-current text-white'
              )}
            />
          )}
          <span className="tabular-nums font-mono text-[11px] leading-none shrink-0">{displayLikes}</span>
        </button>

        {/* Stacked Community Emoji Badges (Facebook/LinkedIn Style) */}
        {hasDiverseReactions && (
          <button
            data-testid="reactions-summary-badge"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleBreakdown();
            }}
            title={`Pecahan Reaksi: ${breakdownTooltipText}`}
            aria-label={`Pecahan reaksi: ${breakdownTooltipText}`}
            className="inline-flex items-center -space-x-1 px-1.5 py-0.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer select-none"
          >
            {topEmojis.map((r) => (
              <span
                key={r.type}
                data-testid={`stacked-emoji-${r.type}`}
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-800 ring-1 ring-white dark:ring-slate-900 text-[9px] leading-none shadow-xs shrink-0 select-none"
              >
                {r.emoji}
              </span>
            ))}
          </button>
        )}

        {/* Plus Button to open WhatsApp Reaction Popover */}
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
    </div>
  );
};

export default PolySuaraReactions;
