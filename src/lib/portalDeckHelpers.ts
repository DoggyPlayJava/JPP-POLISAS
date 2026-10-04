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
}

export interface CampusTelemetryFormatted {
  openText: string;
  resolvedText: string;
  ratingText: string;
}

export function aggregatePortalCampaigns(data: CampaignInputData): CampaignNotificationItem[] {
  return [];
}

export function calculateBentoLayoutSpan(moduleId: string, index: number, total: number): BentoLayoutSpan {
  return {
    colSpan: 'lg:col-span-4',
    isHero: false,
  };
}

export function validateZeroEmDashes(text?: string | null): boolean {
  if (!text) return true;
  return !text.includes('\u2014') && !text.includes('\u2013');
}

export function formatCampusTelemetry(data: CampusTelemetryData | null): CampusTelemetryFormatted {
  return {
    openText: '-',
    resolvedText: '-',
    ratingText: '-',
  };
}
