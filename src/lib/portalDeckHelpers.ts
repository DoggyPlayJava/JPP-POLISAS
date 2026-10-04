// ============================================================
// Portal Command Deck Helpers
// Pure utility functions for executive deck telemetry and layouts.
// ============================================================

export interface CampaignInputData {
  kamsisStatus?: string | null;
  kamsisExtraData?: any;
  kamsisToggles?: Record<string, boolean>;
  makmpStatus?: 'DIJEMPUT' | 'TIDAK_TERPILIH' | null;
  makmpTrackingCode?: string | null;
  supsasActive?: boolean;
  supsasEdition?: any;
  karnivalActive?: boolean;
  karnivalStatus?: any;
}

export interface CampaignNotificationItem {
  id: string;
  category: string;
  title: string;
  message: string;
  badgeLabel: string;
  badgeVariant: 'emerald' | 'amber' | 'rose' | 'blue' | 'maroon' | 'gold';
  actionLabel?: string;
  actionUrl?: string;
  priority: number;
}

export interface BentoLayoutSpan {
  colSpan: string;
  isHero: boolean;
}

export interface CampusTelemetryData {
  open: number;
  resolved: number;
  rating?: number | null;
}

export interface CampusTelemetryFormatted {
  openText: string;
  resolvedText: string;
  ratingText: string;
}

export function aggregatePortalCampaigns(data: CampaignInputData): CampaignNotificationItem[] {
  const items: CampaignNotificationItem[] = [];

  // 1. MAKMP Winner Status (Highest Priority)
  if (data.makmpStatus && data.makmpTrackingCode) {
    if (data.makmpStatus === 'DIJEMPUT') {
      items.push({
        id: 'makmp',
        category: 'MAKMP 2026',
        title: 'Jemputan Rasmi Malam Anugerah',
        message: 'Tahniah! Anda dijemput ke MAKMP 2026. Sila lengkapkan pengesahan kehadiran.',
        badgeLabel: 'DIJEMPUT',
        badgeVariant: 'gold',
        actionLabel: 'Sahkan Kehadiran',
        actionUrl: `/makmp/status?code=${data.makmpTrackingCode}`,
        priority: 1,
      });
    } else {
      items.push({
        id: 'makmp',
        category: 'MAKMP 2026',
        title: 'Keputusan Pencalonan Anugerah',
        message: 'Pencalonan MAKMP telah selesai disemak. Terima kasih atas sumbangan anda.',
        badgeLabel: 'SELESAI',
        badgeVariant: 'rose',
        actionLabel: 'Semak Keputusan',
        actionUrl: `/makmp/status?code=${data.makmpTrackingCode}`,
        priority: 4,
      });
    }
  }

  // 2. KAMSIS Housing Status
  if (data.kamsisStatus && data.kamsisStatus !== 'OPT_OUT') {
    const isAppeal = !!data.kamsisExtraData?.appeal_reason || data.kamsisStatus === 'APPEALING' || data.kamsisStatus === 'APPEAL_REJECTED';
    const isResultOpen = data.kamsisToggles?.['kamsis_result_open'];
    const isAppealResultOpen = data.kamsisToggles?.['kamsis_appeal_result_open'];
    const isAppealOpen = data.kamsisToggles?.['kamsis_appeal_open'];

    let displayStatus = data.kamsisStatus;
    if (!isAppeal) {
      if (!isResultOpen) displayStatus = 'PENDING';
    } else {
      if (!isAppealResultOpen) displayStatus = 'APPEALING';
    }

    const canAppeal = data.kamsisStatus === 'REJECTED' && isResultOpen && isAppealOpen && !isAppeal;

    let badgeLabel = 'MEMPROSES';
    let badgeVariant: CampaignNotificationItem['badgeVariant'] = 'amber';
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

    items.push({
      id: 'kamsis',
      category: 'KAMSIS',
      title: 'Status Penempatan Asrama',
      message,
      badgeLabel,
      badgeVariant,
      actionLabel: canAppeal ? 'Buat Rayuan' : 'Semak Status',
      actionUrl: '/asrama',
      priority: displayStatus === 'APPROVED' || canAppeal ? 2 : 3,
    });
  }

  // 3. Karnival Mega Event
  if (data.karnivalActive) {
    items.push({
      id: 'karnival',
      category: 'KARNIVAL',
      title: data.karnivalStatus?.name || 'Karnival JPP 2026',
      message: 'Karnival siswa kini berlangsung! Undi gerai kegemaran anda dan sertai aktiviti.',
      badgeLabel: 'SEDANG BERLANGSUNG',
      badgeVariant: 'maroon',
      actionLabel: 'Undi Booth',
      actionUrl: '/karnival',
      priority: 2,
    });
  }

  // 4. SUPSAS Championship
  if (data.supsasActive) {
    items.push({
      id: 'supsas',
      category: 'SUPSAS',
      title: data.supsasEdition?.name || 'Kejohanan Sukan SUPSAS',
      message: 'Kejohanan sukan antara jabatan berlangsung. Pantau keputusan langsung terkini.',
      badgeLabel: 'LIVE SKOR',
      badgeVariant: 'blue',
      actionLabel: 'Lihat Skor',
      actionUrl: '/supsas',
      priority: 2,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

export function calculateBentoLayoutSpan(moduleId: string, _index?: number, _total?: number): BentoLayoutSpan {
  if (moduleId === 'ekpp' || moduleId === 'ems') {
    return { colSpan: 'lg:col-span-8', isHero: true };
  }
  return { colSpan: 'lg:col-span-4', isHero: false };
}

export function validateZeroEmDashes(str?: string | null): boolean {
  if (!str) return true;
  return !/[\u2014\u2013]/.test(str);
}

export function formatCampusTelemetry(kbStats: CampusTelemetryData | null): CampusTelemetryFormatted {
  if (!kbStats) {
    return { openText: '-', resolvedText: '-', ratingText: '-' };
  }
  return {
    openText: String(kbStats.open ?? 0),
    resolvedText: String(kbStats.resolved ?? 0),
    ratingText: kbStats.rating != null ? kbStats.rating.toFixed(1) : '5.0',
  };
}
