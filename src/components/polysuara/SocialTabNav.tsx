import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Clock, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SocialTabType = 'FOR_YOU' | 'LATEST' | 'TRENDING';

export interface SocialTabItem {
  id: SocialTabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SOCIAL_TABS: SocialTabItem[] = [
  { id: 'FOR_YOU', label: 'Untuk Anda', icon: Sparkles },
  { id: 'LATEST', label: 'Terkini', icon: Clock },
  { id: 'TRENDING', label: 'Hangat', icon: Flame },
];

export interface SocialTabNavProps {
  activeTab: SocialTabType;
  onChangeTab: (tab: SocialTabType) => void;
  className?: string;
}

export const SocialTabNav: React.FC<SocialTabNavProps> = ({
  activeTab,
  onChangeTab,
  className,
}) => {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center justify-around border-b border-slate-200/80 dark:border-white/10 mb-6 bg-transparent relative',
        className
      )}
    >
      {SOCIAL_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChangeTab(tab.id)}
            className={cn(
              'relative flex-1 py-3 px-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer select-none',
              isActive
                ? 'text-slate-900 dark:text-white font-extrabold'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
            )}
          >
            <Icon
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isActive ? 'scale-110 text-rose-500 dark:text-rose-400' : 'opacity-70'
              )}
            />
            <span>{tab.label}</span>

            {isActive && (
              <motion.div
                layoutId="activeFeedTabIndicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 sm:h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400 rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SocialTabNav;
