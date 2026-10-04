import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Trophy, Flame, Award, PartyPopper, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  aggregatePortalCampaigns,
  type CampaignInputData,
  type CampaignNotificationItem,
} from '@/lib/portalDeckHelpers';

export interface PortalNotificationCenterProps {
  kamsisStatus?: string | null;
  kamsisExtraData?: any;
  kamsisToggles?: Record<string, boolean>;
  onOpenKamsisAppeal?: () => void;
  supsasActive?: boolean;
  supsasEdition?: any;
  karnivalActive?: boolean;
  karnivalStatus?: any;
  makmpStatus?: 'DIJEMPUT' | 'TIDAK_TERPILIH' | null;
  makmpTrackingCode?: string | null;
}

function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    return { user: null };
  }
}

function getCampaignIcon(id: string, badgeVariant?: CampaignNotificationItem['badgeVariant']) {
  switch (id) {
    case 'makmp':
      return badgeVariant === 'gold' ? PartyPopper : Award;
    case 'kamsis':
      return Building2;
    case 'karnival':
      return Flame;
    case 'supsas':
      return Trophy;
    default:
      return Award;
  }
}

function getCampaignTabLabel(id: string, category: string): string {
  switch (id) {
    case 'makmp':
      return 'MAKMP';
    case 'kamsis':
      return 'ASRAMA';
    case 'karnival':
      return 'KARNIVAL';
    case 'supsas':
      return 'SUPSAS';
    default:
      return category;
  }
}

const BADGE_STYLES: Record<CampaignNotificationItem['badgeVariant'], string> = {
  gold: 'bg-amber-400/20 text-amber-900 dark:text-amber-300 border-amber-500/40',
  emerald: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/30',
  rose: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30',
  blue: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30',
  maroon: 'bg-fuchsia-500/15 text-fuchsia-900 dark:text-fuchsia-300 border-fuchsia-500/30',
};

const ICON_STYLES: Record<CampaignNotificationItem['badgeVariant'], string> = {
  gold: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  blue: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  maroon: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20',
};

export function PortalNotificationCenter({
  kamsisStatus,
  kamsisExtraData,
  kamsisToggles = {},
  onOpenKamsisAppeal,
  supsasActive,
  supsasEdition,
  karnivalActive,
  karnivalStatus,
  makmpStatus,
  makmpTrackingCode,
}: PortalNotificationCenterProps) {
  const navigate = useNavigate();
  const { user } = useSafeAuth();
  const [activeTab, setActiveTab] = useState(0);

  const [fetchedMakmp, setFetchedMakmp] = useState<{
    status: 'DIJEMPUT' | 'TIDAK_TERPILIH' | null;
    trackingCode: string | null;
  }>({ status: null, trackingCode: null });

  useEffect(() => {
    if (makmpStatus !== undefined) return;
    if (!user?.id) return;

    let cancelled = false;

    async function fetchMakmpWinner() {
      try {
        const { data, error } = await supabase
          .from('makmp_submissions')
          .select('tracking_code, winner_status')
          .eq('user_id', user?.id)
          .not('winner_status', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled || error || !data) return;

        setFetchedMakmp({
          status: data.winner_status as 'DIJEMPUT' | 'TIDAK_TERPILIH',
          trackingCode: data.tracking_code,
        });
      } catch {
        // Fallback silently if table query fails
      }
    }

    fetchMakmpWinner();

    return () => {
      cancelled = true;
    };
  }, [user?.id, makmpStatus]);

  const effectiveMakmpStatus = makmpStatus !== undefined ? makmpStatus : fetchedMakmp.status;
  const effectiveMakmpTrackingCode =
    makmpTrackingCode !== undefined ? makmpTrackingCode : fetchedMakmp.trackingCode;

  const notifications = useMemo(() => {
    const input: CampaignInputData = {
      kamsisStatus,
      kamsisExtraData,
      kamsisToggles,
      supsasActive,
      supsasEdition,
      karnivalActive,
      karnivalStatus,
      makmpStatus: effectiveMakmpStatus,
      makmpTrackingCode: effectiveMakmpTrackingCode,
    };
    return aggregatePortalCampaigns(input);
  }, [
    kamsisStatus,
    kamsisExtraData,
    kamsisToggles,
    supsasActive,
    supsasEdition,
    karnivalActive,
    karnivalStatus,
    effectiveMakmpStatus,
    effectiveMakmpTrackingCode,
  ]);

  if (notifications.length === 0) return null;

  const currentIdx = Math.min(Math.max(activeTab, 0), notifications.length - 1);
  const activeItem = notifications[currentIdx];
  const ActiveIcon = getCampaignIcon(activeItem.id, activeItem.badgeVariant);

  const handleAction = () => {
    if (activeItem.id === 'kamsis' && activeItem.actionLabel === 'Buat Rayuan' && onOpenKamsisAppeal) {
      onOpenKamsisAppeal();
      return;
    }
    if (activeItem.actionUrl) {
      navigate(activeItem.actionUrl);
    }
  };

  return (
    <div className="w-full mt-4 mb-2">
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-3.5 sm:p-4 shadow-sm hover:border-black/10 dark:hover:border-white/15 transition-all">
        {notifications.length > 1 && (
          <div className="flex items-center gap-1.5 pb-2.5 mb-2.5 border-b border-black/5 dark:border-white/5 overflow-x-auto no-scrollbar">
            {notifications.map((item, idx) => {
              const isSelected = idx === currentIdx;
              const TabIcon = getCampaignIcon(item.id, item.badgeVariant);
              const tabLabel = getCampaignTabLabel(item.id, item.category);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all select-none whitespace-nowrap cursor-pointer",
                    isSelected
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100/80 text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:bg-white/5 dark:hover:bg-white/10"
                  )}
                  aria-label={`Pilih kempen ${tabLabel}`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tabLabel}</span>
                  {item.badgeVariant === 'gold' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors",
                ICON_STYLES[activeItem.badgeVariant]
              )}
            >
              <ActiveIcon className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {activeItem.category}
                </span>
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border",
                    BADGE_STYLES[activeItem.badgeVariant]
                  )}
                >
                  {activeItem.badgeLabel}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate mt-0.5">
                {activeItem.title} <span className="text-muted-foreground font-normal hidden sm:inline">: {activeItem.message}</span>
              </p>
              <p className="text-xs text-muted-foreground font-normal sm:hidden mt-0.5 line-clamp-1">
                {activeItem.message}
              </p>
            </div>
          </div>

          {activeItem.actionLabel && (
            <div className="flex items-center self-end sm:self-center shrink-0">
              <Button
                size="sm"
                onClick={handleAction}
                className="h-8 px-3.5 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>{activeItem.actionLabel}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
