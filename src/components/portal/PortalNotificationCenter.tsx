import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Trophy, Flame, Award, ChevronRight, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export interface PortalNotificationCenterProps {
  kamsisStatus?: string | null;
  kamsisExtraData?: any;
  kamsisToggles?: Record<string, boolean>;
  onOpenKamsisAppeal?: () => void;
  supsasActive?: boolean;
  supsasEdition?: any;
  karnivalActive?: boolean;
  karnivalStatus?: any;
}

interface NotificationItem {
  id: string;
  category: string;
  title: string;
  message: string;
  badgeLabel: string;
  badgeVariant: 'emerald' | 'amber' | 'rose' | 'blue' | 'maroon';
  icon: any;
  actionLabel?: string;
  onAction?: () => void;
}

export function PortalNotificationCenter({
  kamsisStatus,
  kamsisExtraData,
  kamsisToggles = {},
  onOpenKamsisAppeal,
  supsasActive,
  supsasEdition,
  karnivalActive,
  karnivalStatus
}: PortalNotificationCenterProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const notifications: NotificationItem[] = [];

  // 1. KAMSIS Housing Status
  if (kamsisStatus && kamsisStatus !== 'OPT_OUT') {
    const isAppeal = !!kamsisExtraData?.appeal_reason || kamsisStatus === 'APPEALING' || kamsisStatus === 'APPEAL_REJECTED';
    const isResultOpen = kamsisToggles['kamsis_result_open'];
    const isAppealResultOpen = kamsisToggles['kamsis_appeal_result_open'];
    const isAppealOpen = kamsisToggles['kamsis_appeal_open'];

    let displayStatus = kamsisStatus;
    if (!isAppeal) {
      if (!isResultOpen) displayStatus = 'PENDING';
    } else {
      if (!isAppealResultOpen) displayStatus = 'APPEALING';
    }

    const canAppeal = kamsisStatus === 'REJECTED' && isResultOpen && isAppealOpen && !isAppeal;

    let badgeLabel = 'MENUNGGU KELULUSAN';
    let badgeVariant: NotificationItem['badgeVariant'] = 'amber';
    let message = 'Permohonan asrama anda sedang dalam proses semakan pihak pentadbiran.';

    if (displayStatus === 'APPROVED') {
      badgeLabel = 'LULUS';
      badgeVariant = 'emerald';
      message = 'Tahniah! Permohonan penempatan asrama anda telah diluluskan.';
    } else if (displayStatus === 'REJECTED') {
      badgeLabel = 'TOLAK';
      badgeVariant = 'rose';
      message = 'Dukacita dimaklumkan permohonan asrama anda tidak berjaya.';
    } else if (displayStatus === 'APPEAL_REJECTED') {
      badgeLabel = 'RAYUAN DITOLAK';
      badgeVariant = 'rose';
      message = 'Dukacita dimaklumkan rayuan penempatan asrama anda ditolak.';
    } else if (displayStatus === 'APPEALING') {
      badgeLabel = 'RAYUAN DIPROSES';
      badgeVariant = 'amber';
      message = 'Rayuan anda sedang dalam proses semakan rasmi.';
    }

    notifications.push({
      id: 'kamsis',
      category: 'KAMSIS',
      title: 'Status Permohonan Asrama',
      message,
      badgeLabel,
      badgeVariant,
      icon: Building2,
      actionLabel: canAppeal ? 'Buat Rayuan' : 'Semak Status',
      onAction: canAppeal ? onOpenKamsisAppeal : () => navigate('/asrama')
    });
  }

  // 2. Karnival Mega Announcement
  if (karnivalActive) {
    notifications.push({
      id: 'karnival',
      category: 'KARNIVAL',
      title: karnivalStatus?.name || 'Karnival JPP 2026',
      message: 'Karnival siswa kini berlangsung! Undi gerai kegemaran anda dan sertai aktiviti.',
      badgeLabel: 'SEDANG BERLANGSUNG',
      badgeVariant: 'maroon',
      icon: Flame,
      actionLabel: 'Undi Booth',
      onAction: () => navigate('/karnival')
    });
  }

  // 3. SUPSAS Sports Announcement
  if (supsasActive && !karnivalActive) {
    notifications.push({
      id: 'supsas',
      category: 'SUPSAS',
      title: supsasEdition?.name || 'Kejohanan SUPSAS',
      message: 'Sukan antara jabatan berlangsung. Pantau keputusan langsung dan sokong jabatan anda.',
      badgeLabel: 'LIVE KEPUTUSAN',
      badgeVariant: 'blue',
      icon: Trophy,
      actionLabel: 'Lihat Skor',
      onAction: () => navigate('/supsas')
    });
  }

  if (notifications.length === 0) return null;

  const currentIdx = Math.min(activeTab, notifications.length - 1);
  const activeItem = notifications[currentIdx];
  const IconComponent = activeItem.icon;

  const badgeStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    maroon: 'bg-primary/10 text-primary dark:text-red-400 border-primary/20'
  };

  return (
    <div className="w-full mt-4 mb-2">
      <div className="rounded-2xl border border-border/80 bg-card/90 dark:bg-card/70 backdrop-blur-xl p-3.5 sm:p-4 shadow-sm hover:border-primary/30 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left Info Section */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
              <IconComponent className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {activeItem.category}
                </span>
                <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border", badgeStyles[activeItem.badgeVariant])}>
                  {activeItem.badgeLabel}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-foreground truncate mt-0.5">
                {activeItem.title} - <span className="text-muted-foreground font-normal">{activeItem.message}</span>
              </p>
            </div>
          </div>

          {/* Right Action & Switcher Section */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {notifications.length > 1 && (
              <div className="flex items-center gap-1 mr-2 bg-muted/50 p-1 rounded-lg">
                {notifications.map((n, idx) => (
                  <button
                    key={n.id}
                    onClick={() => setActiveTab(idx)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      idx === currentIdx ? "w-5 bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    aria-label={`Lihat notifikasi ${n.category}`}
                  />
                ))}
              </div>
            )}

            {activeItem.actionLabel && activeItem.onAction && (
              <Button
                size="sm"
                onClick={activeItem.onAction}
                className="h-8 px-3.5 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm active:scale-[0.98] transition-all"
              >
                <span>{activeItem.actionLabel}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
