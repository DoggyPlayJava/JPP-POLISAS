import type { TFunction } from 'i18next';
import {
  ArrowLeftRight,
  Package,
  CheckCircle2,
  CheckCircle,
  XCircle,
  UserCheck,
  Trash2,
  Sliders,
  MapPin,
  Receipt,
  Activity,
} from 'lucide-react';
import type { FoodBankApplication } from '@/types';

// Baseline rasmi peruntukan Tabung Food Bank JPP
export const OFFICIAL_BASELINE_BUDGET = 70000.0;

export type AdminTab = 'applications' | 'inventory' | 'budget' | 'settings' | 'audit';
export type ApplicationStatusFilter = 'SEMUA' | 'MENUNGGU' | 'LULUS' | 'SELESAI' | 'DITOLAK';
export type AuditCategoryFilter = 'SEMUA' | 'STOK' | 'AGIHAN' | 'PEGAWAI' | 'TETAPAN';

export interface AppMetrics {
  total: number;
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
  totalItemsDistributed: number;
}

export interface AuditMetrics {
  total: number;
  transfers: number;
  pickups: number;
  adminOfficerActions: number;
}

export interface RecentVerifiedRecord {
  appNo: string;
  studentName: string;
  matricNo?: string;
  itemsCount: number;
  totalValue: number;
  timestamp: string;
}

export interface ItemFormState {
  name: string;
  category: string;
  description: string;
  unit: string;
  current_stock: number;
  estimated_cost: number;
  is_active: boolean;
  image_url: string;
}

export interface TransferFormState {
  item_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  notes: string;
}

export interface BudgetFormState {
  transaction_type: 'BUDGET_ADDITION' | 'ADJUSTMENT';
  amount: number;
  description: string;
}

export interface SessionFormState {
  max_monthly_applications_per_student: number;
  max_items_per_application: number;
  application_instructions: string;
  eligibility_criteria: string;
  total_budget: number;
  allow_housemate: boolean;
}

export interface LocationFormState {
  name: string;
  polymaps_building_id: string;
  room_detail: string;
  operating_hours: string;
  time_slots: string;
  operating_days: string[];
  contact_person: string;
  contact_phone: string;
  is_active: boolean;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
}

// Explicit Supabase column projections (zero select('*'))
export const FOODBANK_SETTINGS_SELECT =
  'id, is_module_active, is_application_open, allow_housemate, total_budget, current_spent, max_monthly_applications_per_student, max_items_per_application, application_instructions, eligibility_criteria, updated_by, updated_at, created_at';

export const FOODBANK_ITEMS_SELECT =
  'id, name, category, description, image_url, current_stock, reserved_stock, unit, estimated_cost, is_active, created_at, updated_at';

export const FOODBANK_LOCATION_STOCKS_SELECT =
  'id, item_id, location_id, current_stock, reserved_stock, reorder_level, created_at, updated_at';

export const FOODBANK_APPLICATIONS_SELECT = `
  id, application_no, applicant_id, status, reason, financial_category, household_income,
  housing_type, housemates, selected_items, location_id, pickup_date, pickup_time_slot,
  pickup_qr_code, pickup_verified_at, pickup_verified_by, applicant_name_override,
  applicant_matric_override, requires_counter_verification, counter_verified,
  counter_verified_by, counter_verified_at, stock_reserved, total_estimated_value,
  reviewed_by, reviewed_at, rejection_reason, admin_notes, created_at, updated_at,
  applicant:profiles!applicant_id(id, full_name, email, matric_no, phone),
  location:foodbank_distribution_locations!location_id(
    id, name, room_detail, operating_hours, polymaps_building_id,
    building:imaps_buildings(id, name, code, panorama_360_url)
  ),
  verifier:profiles!pickup_verified_by(id, full_name),
  reviewer:profiles!reviewed_by(id, full_name)
`;

export const FOODBANK_APPLICATION_LOOKUP_SELECT = `
  id, application_no, applicant_id, status, reason, financial_category, household_income,
  housing_type, housemates, selected_items, location_id, pickup_date, pickup_time_slot,
  pickup_qr_code, pickup_verified_at, pickup_verified_by, applicant_name_override,
  applicant_matric_override, requires_counter_verification, counter_verified,
  stock_reserved, total_estimated_value, rejection_reason, created_at, updated_at,
  applicant:profiles!applicant_id(id, full_name, matric_no, email, phone, avatar_url, class, department),
  location:foodbank_distribution_locations!location_id(id, name, room_detail)
`;

export const FOODBANK_TX_SELECT = `
  id, application_id, transaction_type, amount, description, created_by, created_at,
  creator:profiles!created_by(id, full_name),
  application:foodbank_applications!application_id(id, application_no, total_estimated_value)
`;

export const FOODBANK_LOCATIONS_SELECT = `
  id, name, polymaps_building_id, room_detail, operating_hours, time_slots,
  operating_days, is_active, contact_person, contact_phone, created_at, updated_at,
  building:imaps_buildings(id, name, code)
`;

export const FOODBANK_OFFICERS_SELECT = `
  id, user_id, location_id, role_title, is_active, assigned_by, created_at, updated_at,
  profile:profiles!user_id(id, full_name, email, matric_no, phone, department, avatar_url),
  location:foodbank_distribution_locations!location_id(id, name),
  assigner:profiles!assigned_by(id, full_name)
`;

export const FOODBANK_AUDIT_LOGS_SELECT = `
  id, actor_id, actor_name, action_type, location_id, target_id, details, created_at,
  location:foodbank_distribution_locations!location_id(id, name)
`;

// Shared Semambu Mineral Teal (Light) & Obsidian Carbon (Dark) surface tokens
export const FB_CARD =
  'rounded-2xl bg-white dark:bg-[#13171D] border border-[#B8E4DC] dark:border-[#252B35] shadow-surface-sm';

export const FB_INSET =
  'rounded-xl bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC]/80 dark:border-[#252B35]';

export const FB_INPUT =
  'w-full px-3 py-2 rounded-xl text-xs font-medium bg-[#F6FBF9] dark:bg-[#0E1116] border border-[#B8E4DC] dark:border-[#252B35] text-[#0B2420] dark:text-[#F1F5F9] placeholder-[#3B635C]/70 dark:placeholder-[#94A0B2]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]';

export const FB_PRIMARY_BTN =
  'bg-[#0F766E] hover:bg-[#0D665F] dark:bg-[#2DD4BF] dark:hover:bg-[#14B8A6] text-white dark:text-[#090B0E] font-semibold transition-[transform,opacity,background-color] duration-200 ease-apple-out active:scale-[0.98] shadow-surface-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] dark:focus-visible:ring-[#2DD4BF]';

// Nilai efektif Nama / No. Matrik (override pelajar lebih diutamakan)
export const effectiveName = (app: FoodBankApplication): string =>
  app.applicant_name_override?.trim() || app.applicant?.full_name || 'Pelajar';

export const effectiveMatric = (app: FoodBankApplication): string =>
  app.applicant_matric_override?.trim() || app.applicant?.matric_no || '-';

export const getActionCategory = (
  actionType: string
): 'STOK' | 'AGIHAN' | 'PEGAWAI' | 'TETAPAN' | 'LAIN' => {
  if (actionType === 'STOCK_ADJUSTMENT' || actionType === 'STOCK_TRANSFER') return 'STOK';
  if (['APPLICATION_APPROVAL', 'APPLICATION_REJECTION', 'PICKUP_VERIFIED'].includes(actionType)) {
    return 'AGIHAN';
  }
  if (['OFFICER_ASSIGNED', 'OFFICER_REMOVED'].includes(actionType)) return 'PEGAWAI';
  if (['SESSION_CONFIG_CHANGED', 'LOCATION_UPDATED', 'BUDGET_ADDITION'].includes(actionType)) {
    return 'TETAPAN';
  }
  return 'LAIN';
};

export const getAuditActionConfig = (actionType: string, t: TFunction) => {
  switch (actionType) {
    case 'STOCK_TRANSFER':
      return {
        label: t('jpp:foodbank_audit_action_stock_transfer', 'Pindahan Stok Lokasi'),
        category: 'STOK',
        badgeBg: 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
        iconBg: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
        icon: ArrowLeftRight,
      };
    case 'STOCK_ADJUSTMENT':
      return {
        label: t('jpp:foodbank_audit_action_stock_adjustment', 'Pelarasan Inventori'),
        category: 'STOK',
        badgeBg: 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
        iconBg: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
        icon: Package,
      };
    case 'PICKUP_VERIFIED':
      return {
        label: t('jpp:foodbank_audit_action_pickup_verified', 'Penebusan QR Disahkan'),
        category: 'AGIHAN',
        badgeBg: 'bg-[#EBF7F4] dark:bg-[#2DD4BF]/15 text-[#0F766E] dark:text-[#2DD4BF] border-[#B8E4DC] dark:border-[#2DD4BF]/30',
        iconBg: 'bg-[#EBF7F4] dark:bg-[#2DD4BF]/15 text-[#0F766E] dark:text-[#2DD4BF]',
        icon: CheckCircle2,
      };
    case 'APPLICATION_APPROVAL':
      return {
        label: t('jpp:foodbank_audit_action_application_approval', 'Permohonan Diluluskan'),
        category: 'AGIHAN',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
        iconBg: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
        icon: CheckCircle,
      };
    case 'APPLICATION_REJECTION':
      return {
        label: t('jpp:foodbank_audit_action_application_rejection', 'Permohonan Ditolak'),
        category: 'AGIHAN',
        badgeBg: 'bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
        iconBg: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400',
        icon: XCircle,
      };
    case 'OFFICER_ASSIGNED':
      return {
        label: t('jpp:foodbank_audit_action_officer_assigned', 'Pelantikan Pegawai Kaunter'),
        category: 'PEGAWAI',
        badgeBg: 'bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
        iconBg: 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400',
        icon: UserCheck,
      };
    case 'OFFICER_REMOVED':
      return {
        label: t('jpp:foodbank_audit_action_officer_removed', 'Penamatan Pegawai Kaunter'),
        category: 'PEGAWAI',
        badgeBg: 'bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
        iconBg: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400',
        icon: Trash2,
      };
    case 'SESSION_CONFIG_CHANGED':
      return {
        label: t('jpp:foodbank_audit_action_session_config_changed', 'Perubahan Tetapan Sesi'),
        category: 'TETAPAN',
        badgeBg: 'bg-[#F6FBF9] dark:bg-[#1B2028] text-[#0B2420] dark:text-[#F1F5F9] border-[#B8E4DC] dark:border-[#252B35]',
        iconBg: 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF]',
        icon: Sliders,
      };
    case 'LOCATION_UPDATED':
      return {
        label: t('jpp:foodbank_audit_action_location_updated', 'Kemas Kini Hab Edaran'),
        category: 'TETAPAN',
        badgeBg: 'bg-[#F6FBF9] dark:bg-[#1B2028] text-[#0B2420] dark:text-[#F1F5F9] border-[#B8E4DC] dark:border-[#252B35]',
        iconBg: 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF]',
        icon: MapPin,
      };
    case 'BUDGET_ADDITION':
      return {
        label: t('jpp:foodbank_audit_action_budget_addition', 'Penambahan / Pelarasan Bajet'),
        category: 'TETAPAN',
        badgeBg: 'bg-[#F6FBF9] dark:bg-[#1B2028] text-[#0B2420] dark:text-[#F1F5F9] border-[#B8E4DC] dark:border-[#252B35]',
        iconBg: 'bg-[#EBF7F4] dark:bg-[#1B2028] text-[#0F766E] dark:text-[#2DD4BF]',
        icon: Receipt,
      };
    default:
      return {
        label: actionType,
        category: 'LAIN',
        badgeBg: 'bg-[#F6FBF9] dark:bg-[#1B2028] text-[#3B635C] dark:text-[#94A0B2] border-[#B8E4DC] dark:border-[#252B35]',
        iconBg: 'bg-[#F6FBF9] dark:bg-[#1B2028] text-[#3B635C] dark:text-[#94A0B2]',
        icon: Activity,
      };
  }
};

export const formatAuditDateTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
  } catch {
    return dateStr;
  }
};
