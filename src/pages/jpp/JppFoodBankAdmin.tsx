/**
 * JppFoodBankAdmin.tsx
 * Pusat Kawalan Pentadbir Food Bank JPP HQ (/jpp/foodbank)
 *
 * Thin state & business-logic orchestration shell composing modular UI tabs under
 * src/pages/jpp/foodbank/:
 * - FoodBankHeaderKpi: Sticky command header, RM70k KPI strip & navigation tabs
 * - FoodBankApplicationsTab: Architectural QR Counter Scanner & applications table
 * - FoodBankInventoryTab: Multi-location stock grid/table & quick adjusters
 * - FoodBankBudgetTab: RM70k immutable ledger & utilization statement
 * - FoodBankSettingsTab: Launch switch, quota formula, PolyMaps 360 locations & officer RBAC
 * - FoodBankAuditTab: Dedicated operational audit log & JHEP XLSX export
 * - FoodBankModals: Rejection, Detail, Item, Transfer, Budget & Location modals
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';
import { exportXlsx } from '@/lib/exportXlsx';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFileToDrive } from '@/lib/driveUpload';
import type {
  FoodBankSettings,
  FoodBankItem,
  FoodBankDistributionLocation,
  FoodBankApplication,
  FoodBankBudgetTransaction,
  PolyMapsBuildingWith360,
  FoodBankLocationStock,
  FoodBankOfficer,
  FoodBankAuditLog,
} from '@/types';
import { FoodBankQrPassModal } from '@/components/foodbank/FoodBankQrPassModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getBuilding360Url } from '@/lib/polymaps360Data';
import { sendNotificationToUser } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { buildFoodBankEmail } from '@/lib/foodbankEmail';
import {
  DEFAULT_FOODBANK_ITEMS,
  DEFAULT_FOODBANK_LOCATIONS,
  loadLocalFoodBankSettings,
  saveLocalFoodBankSettings,
  generateDefaultFoodBankLocationStocks,
  DEFAULT_FOODBANK_OFFICERS,
  DEFAULT_FOODBANK_AUDIT_LOGS,
} from '@/lib/foodbankDefaults';
import {
  OFFICIAL_BASELINE_BUDGET,
  FOODBANK_SETTINGS_SELECT,
  FOODBANK_ITEMS_SELECT,
  FOODBANK_LOCATION_STOCKS_SELECT,
  FOODBANK_APPLICATIONS_SELECT,
  FOODBANK_APPLICATION_LOOKUP_SELECT,
  FOODBANK_TX_SELECT,
  FOODBANK_LOCATIONS_SELECT,
  FOODBANK_OFFICERS_SELECT,
  FOODBANK_AUDIT_LOGS_SELECT,
  effectiveName,
  effectiveMatric,
  getActionCategory,
  getAuditActionConfig,
  formatAuditDateTime,
  type AdminTab,
  type ApplicationStatusFilter,
  type AuditCategoryFilter,
  type RecentVerifiedRecord,
  type ItemFormState,
  type TransferFormState,
  type BudgetFormState,
  type SessionFormState,
  type LocationFormState,
  type ConfirmDialogState,
} from './foodbank/foodbankAdminUtils';
import { FoodBankHeaderKpi } from './foodbank/FoodBankHeaderKpi';
import { FoodBankApplicationsTab } from './foodbank/FoodBankApplicationsTab';
import { FoodBankInventoryTab } from './foodbank/FoodBankInventoryTab';
import { FoodBankBudgetTab } from './foodbank/FoodBankBudgetTab';
import { FoodBankSettingsTab } from './foodbank/FoodBankSettingsTab';
import { FoodBankAuditTab } from './foodbank/FoodBankAuditTab';
import { FoodBankModals } from './foodbank/FoodBankModals';

export function JppFoodBankAdmin() {
  const { t } = useTranslation(['kebajikan', 'jpp', 'common']);
  const { user, profile, isSuperAdmin } = useAuth();

  // Helper: hantar notifikasi + emel Food Bank kepada pelajar
  const notifyStudent = async (app: FoodBankApplication, status: 'LULUS' | 'DITOLAK' | 'SELESAI') => {
    const recipientId = app.applicant?.id;
    const recipientEmail = app.applicant?.email;
    const studentName = app.applicant?.full_name || 'Mahasiswa';
    const locationName =
      (app.location as any)?.name ||
      app.location?.name ||
      t('jpp:foodbank_distribution_center_fallback', 'Pusat Agihan');

    const payload = {
      title:
        status === 'LULUS'
          ? t('jpp:foodbank_notif_app_approved_title', 'Permohonan Food Bank Diluluskan')
          : status === 'DITOLAK'
          ? t('jpp:foodbank_notif_app_rejected_title', 'Permohonan Food Bank Ditolak')
          : t('jpp:foodbank_notif_app_collected_title', 'Bantuan Food Bank Telah Diambil'),
      message:
        status === 'LULUS'
          ? t(
              'kebajikan:foodbank_notif_app_approved_msg',
              `Tahniah! Permohonan ${app.application_no} anda telah diluluskan. Sila muat turun pas QR anda.`,
              { app_no: app.application_no }
            )
          : status === 'DITOLAK'
          ? t(
              'kebajikan:foodbank_notif_app_rejected_msg',
              `Permohonan ${app.application_no} anda tidak berjaya. Sila semak emel untuk maklumat lanjut.`,
              { app_no: app.application_no }
            )
          : t(
              'kebajikan:foodbank_notif_app_collected_msg',
              `Bantuan bagi permohonan ${app.application_no} telah diserahkan. Terima kasih.`,
              { app_no: app.application_no }
            ),
      type: 'FOODBANK_STATUS',
      module: 'KEBAJIKAN' as const,
      link: '/kebajikan/foodbank',
      reference_id: app.id,
      actor_name: profile?.full_name || 'Pegawai JPP',
    };

    if (recipientId) {
      sendNotificationToUser(recipientId, payload).catch(() => {});
    }

    if (recipientEmail) {
      try {
        const { subject, html } = buildFoodBankEmail({
          status,
          studentName,
          matricNo: app.applicant?.matric_no,
          applicationNo: app.application_no,
          items: (app.selected_items || []).map((it) => ({
            name: it.item_name,
            quantity: it.quantity,
            unit: it.unit,
          })),
          pickupDate: app.pickup_date,
          pickupTime: app.pickup_time_slot,
          location: status === 'DITOLAK' ? undefined : locationName,
          rejectionReason: status === 'DITOLAK' ? app.rejection_reason || undefined : undefined,
        });
        await sendEmail({ to: recipientEmail, subject, html });
      } catch (e) {
        console.error('FoodBank admin email error:', e);
      }
    }
  };

  // ── Core States ──────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<FoodBankSettings | null>(null);
  const [applications, setApplications] = useState<FoodBankApplication[]>([]);
  const [items, setItems] = useState<FoodBankItem[]>([]);
  const [transactions, setTransactions] = useState<FoodBankBudgetTransaction[]>([]);
  const [locations, setLocations] = useState<FoodBankDistributionLocation[]>([]);
  const [buildings, setBuildings] = useState<PolyMapsBuildingWith360[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('applications');

  // ── Officers & RBAC ──────────────────────────────────────────────────────
  const [officers, setOfficers] = useState<FoodBankOfficer[]>([]);
  const [officerSearchQuery, setOfficerSearchQuery] = useState('');
  const [candidateProfiles, setCandidateProfiles] = useState<any[]>([]);
  const [isSearchingCandidate, setIsSearchingCandidate] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [officerAssignLocationId, setOfficerAssignLocationId] = useState('');
  const [officerRoleTitle, setOfficerRoleTitle] = useState(
    t('jpp:foodbank_counter_officer_default', 'Petugas Kaunter Food Bank')
  );
  const [isAssigningOfficer, setIsAssigningOfficer] = useState(false);

  // ── Tab 1: Applications & Counter Scanner ────────────────────────────────
  const [appSearch, setAppSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatusFilter>('SEMUA');
  const [housingFilter, setHousingFilter] = useState<string>('SEMUA');
  const [includeHousemates, setIncludeHousemates] = useState(false);
  const [selectedAppForDetail, setSelectedAppForDetail] = useState<FoodBankApplication | null>(null);
  const [selectedAppForPass, setSelectedAppForPass] = useState<FoodBankApplication | null>(null);
  const [rejectionModalApp, setRejectionModalApp] = useState<FoodBankApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [counterInput, setCounterInput] = useState('');
  const [isVerifyingCounter, setIsVerifyingCounter] = useState(false);
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [activeScanStudent, setActiveScanStudent] = useState<FoodBankApplication | null>(null);
  const [recentVerifiedRecord, setRecentVerifiedRecord] = useState<RecentVerifiedRecord | null>(null);

  // ── Tab 2: Inventory & Stocks ────────────────────────────────────────────
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('SEMUA');
  const [selectedInventoryLocationId, setSelectedInventoryLocationId] = useState<string>('SEMUA');
  const [locationStocks, setLocationStocks] = useState<FoodBankLocationStock[]>([]);
  const [inventoryViewMode, setInventoryViewMode] = useState<'grid' | 'table'>('grid');
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodBankItem | null>(null);
  const [itemFormData, setItemFormData] = useState<ItemFormState>({
    name: '',
    category: 'MAKANAN',
    description: '',
    unit: 'pek',
    current_stock: 0,
    estimated_cost: 0,
    is_active: true,
    image_url: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);

  const [transferModalOpen, setTransferModalOpen] = useState<boolean>(false);
  const [transferFormData, setTransferFormData] = useState<TransferFormState>({
    item_id: '',
    from_location_id: 'AGREGAT',
    to_location_id: '',
    quantity: 1,
    notes: '',
  });
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState<boolean>(false);

  // ── Tab 3: Budget & Ledger ───────────────────────────────────────────────
  const [txFilter, setTxFilter] = useState<string>('SEMUA');
  const [txSearch, setTxSearch] = useState('');
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetFormData, setBudgetFormData] = useState<BudgetFormState>({
    transaction_type: 'BUDGET_ADDITION',
    amount: 1000,
    description: '',
  });
  const [isSubmittingBudget, setIsSubmittingBudget] = useState(false);

  // ── Tab 4: Settings & Locations ──────────────────────────────────────────
  const [sessionFormData, setSessionFormData] = useState<SessionFormState>({
    max_monthly_applications_per_student: 1,
    max_items_per_application: 5,
    application_instructions: '',
    eligibility_criteria: '',
    total_budget: OFFICIAL_BASELINE_BUDGET,
    allow_housemate: true,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<FoodBankDistributionLocation | null>(null);
  const [locationFormData, setLocationFormData] = useState<LocationFormState>({
    name: '',
    polymaps_building_id: '',
    room_detail: '',
    operating_hours: 'Isnin - Khamis: 10:00 AM - 4:00 PM',
    time_slots: '10:00 AM - 11:30 AM, 11:30 AM - 01:00 PM, 02:30 PM - 04:00 PM',
    operating_days: [],
    contact_person: 'Exco Kebajikan JPP',
    contact_phone: '',
    is_active: true,
  });
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // ── Tab 5: Audit Logs ────────────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<FoodBankAuditLog[]>([]);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<AuditCategoryFilter>('SEMUA');
  const [auditLocationFilter, setAuditLocationFilter] = useState<string>('SEMUA');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // ── RBAC Gating ──────────────────────────────────────────────────────────
  const isExecutiveAdmin = Boolean(
    isSuperAdmin ||
      profile?.role === 'SUPER_ADMIN_JPP' ||
      profile?.role === 'ADMIN' ||
      profile?.jpp_position === 'YDP' ||
      profile?.jpp_unit === 'KEBAJIKAN'
  );

  const myOfficerRecord = useMemo(() => {
    if (!user?.id) return null;
    return officers.find((o) => o.user_id === user.id && o.is_active);
  }, [officers, user?.id]);

  const assignedLocationId = myOfficerRecord?.location_id || null;

  useEffect(() => {
    if (!isExecutiveAdmin && (activeTab === 'budget' || activeTab === 'settings')) {
      setActiveTab('applications');
    }
  }, [isExecutiveAdmin, activeTab]);

  useEffect(() => {
    if (!isExecutiveAdmin && assignedLocationId) {
      setSelectedInventoryLocationId(assignedLocationId);
    }
  }, [isExecutiveAdmin, assignedLocationId]);

  // ── 1. Parallel Data Fetch (Explicit Columns Only — Zero select('*')) ────
  const fetchAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [
        settingsRes,
        appsRes,
        itemsRes,
        txRes,
        locationsRes,
        buildingsRes,
        locStocksRes,
        officersRes,
        auditLogsRes,
      ] = await Promise.all([
        supabase
          .from('foodbank_settings')
          .select(FOODBANK_SETTINGS_SELECT)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('foodbank_applications')
          .select(FOODBANK_APPLICATIONS_SELECT)
          .order('created_at', { ascending: false }),
        supabase
          .from('foodbank_items')
          .select(FOODBANK_ITEMS_SELECT)
          .order('category', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('foodbank_budget_transactions')
          .select(FOODBANK_TX_SELECT)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('foodbank_distribution_locations')
          .select(FOODBANK_LOCATIONS_SELECT)
          .order('name', { ascending: true }),
        supabase
          .from('imaps_buildings')
          .select('id, name, code, description')
          .order('name', { ascending: true }),
        supabase.from('foodbank_location_stocks').select(FOODBANK_LOCATION_STOCKS_SELECT),
        supabase
          .from('foodbank_officers')
          .select(FOODBANK_OFFICERS_SELECT)
          .order('created_at', { ascending: false }),
        supabase
          .from('foodbank_audit_logs')
          .select(FOODBANK_AUDIT_LOGS_SELECT)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);

      if (settingsRes.error) console.error('Error fetching settings:', settingsRes.error);
      if (appsRes.error) console.error('Error fetching applications:', appsRes.error);
      if (itemsRes.error) console.error('Error fetching items:', itemsRes.error);
      if (txRes.error) console.error('Error fetching transactions:', txRes.error);
      if (locationsRes.error) console.error('Error fetching locations:', locationsRes.error);
      if (buildingsRes.error) console.error('Error fetching buildings:', buildingsRes.error);
      if (locStocksRes.error) console.warn('Note/Error fetching location stocks (fallback used):', locStocksRes.error);
      if (officersRes.error) console.warn('Note/Error fetching foodbank officers (fallback used):', officersRes.error);
      if (auditLogsRes.error) console.warn('Note/Error fetching foodbank audit logs (fallback used):', auditLogsRes.error);

      const finalSettings = (settingsRes.data as FoodBankSettings) || loadLocalFoodBankSettings();
      setSettings(finalSettings);
      setSessionFormData({
        max_monthly_applications_per_student: finalSettings.max_monthly_applications_per_student || 1,
        max_items_per_application: finalSettings.max_items_per_application || 5,
        application_instructions: finalSettings.application_instructions || '',
        eligibility_criteria: finalSettings.eligibility_criteria || '',
        total_budget: finalSettings.total_budget || OFFICIAL_BASELINE_BUDGET,
        allow_housemate: finalSettings.allow_housemate !== false,
      });

      if (appsRes.data) setApplications(appsRes.data as unknown as FoodBankApplication[]);

      const finalItems =
        itemsRes.data && itemsRes.data.length > 0
          ? (itemsRes.data as FoodBankItem[])
          : DEFAULT_FOODBANK_ITEMS;
      setItems(finalItems);

      if (txRes.data) setTransactions(txRes.data as unknown as FoodBankBudgetTransaction[]);

      const rawLocations =
        locationsRes.data && locationsRes.data.length > 0
          ? locationsRes.data
          : DEFAULT_FOODBANK_LOCATIONS;
      const enhancedLocations = (rawLocations as unknown as FoodBankDistributionLocation[]).map((loc) => {
        const rawB = loc.building as any;
        return {
          ...loc,
          building: rawB
            ? {
                ...rawB,
                panorama_360_url: rawB.panorama_360_url || getBuilding360Url(rawB),
              }
            : rawB,
        };
      });
      setLocations(enhancedLocations);

      const finalLocationStocks =
        locStocksRes.data && locStocksRes.data.length > 0
          ? (locStocksRes.data as FoodBankLocationStock[])
          : generateDefaultFoodBankLocationStocks(finalItems, enhancedLocations);
      setLocationStocks(finalLocationStocks);

      const enhancedBuildings = ((buildingsRes.data || []) as any[]).map((b) => ({
        ...b,
        panorama_360_url: b.panorama_360_url || getBuilding360Url(b),
      })) as PolyMapsBuildingWith360[];
      setBuildings(enhancedBuildings);

      const finalOfficers =
        officersRes.data && officersRes.data.length > 0
          ? ((officersRes.data as any[]).map((o: any) => ({
              ...o,
              user: o.user || o.profile || null,
            })) as FoodBankOfficer[])
          : DEFAULT_FOODBANK_OFFICERS;
      setOfficers(finalOfficers);

      const finalAuditLogs =
        auditLogsRes.data && auditLogsRes.data.length > 0
          ? ((auditLogsRes.data as any[]).map((log: any) => ({
              ...log,
              location: log.location || enhancedLocations.find((l) => l.id === log.location_id) || null,
            })) as FoodBankAuditLog[])
          : DEFAULT_FOODBANK_AUDIT_LOGS;
      setAuditLogs(finalAuditLogs);
    } catch (err: any) {
      console.error('Fatal load error:', err);
      toast.error(t('jpp:foodbank_data_fetch_error', 'Ralat ketika memuat turun data Food Bank.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── 2. Budget & Application Metrics ──────────────────────────────────────
  const budgetAllocation = settings?.total_budget ?? OFFICIAL_BASELINE_BUDGET;
  const currentSpent = settings?.current_spent ?? 0;
  const remainingBudget = Math.max(0, budgetAllocation - currentSpent);
  const budgetUsedPercentage =
    budgetAllocation > 0 ? Math.min(100, Math.max(0, (currentSpent / budgetAllocation) * 100)) : 0;

  const appMetrics = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let completed = 0;
    let rejected = 0;
    let totalItemsDistributed = 0;

    applications.forEach((app) => {
      if (app.status === 'MENUNGGU') pending++;
      else if (app.status === 'LULUS') approved++;
      else if (app.status === 'SELESAI') {
        completed++;
        if (Array.isArray(app.selected_items)) {
          app.selected_items.forEach((item: any) => {
            totalItemsDistributed += Number(item.quantity || 1);
          });
        }
      } else if (app.status === 'DITOLAK') rejected++;
    });

    return {
      total: applications.length,
      pending,
      approved,
      completed,
      rejected,
      totalItemsDistributed,
    };
  }, [applications]);

  // ── 3. Session & Module Launch Toggles ───────────────────────────────────
  const handleToggleSession = async () => {
    const newStatus = !(settings?.is_application_open ?? false);
    try {
      if (settings?.id) {
        const { error } = await supabase
          .from('foodbank_settings')
          .update({
            is_application_open: newStatus,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settings.id);
        if (error) console.warn('DB update error for foodbank_settings (session):', error);
      }
    } catch (err) {
      console.warn('Session toggle database error, fallback to local persistence:', err);
    }

    saveLocalFoodBankSettings({ is_application_open: newStatus });
    setSettings((prev) =>
      prev
        ? ({ ...prev, is_application_open: newStatus } as FoodBankSettings)
        : ({ ...loadLocalFoodBankSettings(), is_application_open: newStatus } as FoodBankSettings)
    );
    if (newStatus) {
      toast.success(t('jpp:foodbank_door_opened', 'Pintu permohonan Food Bank dibuka kepada mahasiswa!'));
    } else {
      toast(t('jpp:foodbank_door_closed_toast', 'Permohonan Food Bank ditutup buat sementara waktu.'));
    }
  };

  const handleToggleModuleStatus = async () => {
    const newStatus = !(settings?.is_module_active ?? false);
    try {
      if (settings?.id) {
        const { error } = await supabase
          .from('foodbank_settings')
          .update({
            is_module_active: newStatus,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settings.id);
        if (error) console.warn('DB update error for foodbank_settings (module):', error);
      }
    } catch (err) {
      console.warn('Module toggle database error, fallback to local persistence:', err);
    }

    saveLocalFoodBankSettings({ is_module_active: newStatus });
    setSettings((prev) =>
      prev
        ? ({ ...prev, is_module_active: newStatus } as FoodBankSettings)
        : ({ ...loadLocalFoodBankSettings(), is_module_active: newStatus } as FoodBankSettings)
    );
    if (newStatus) {
      toast.success(
        t('jpp:foodbank_module_opened_toast', 'Modul Food Bank kini RASMI DIBUKA & aktif di portal Kebajikan mahasiswa!')
      );
    } else {
      toast(
        t(
          'jpp:foodbank_module_prep_toast',
          'Modul Food Bank kini DALAM PERSEDIAAN (Tutup untuk permohonan mahasiswa).'
        )
      );
    }
  };

  // ── 4. Live Camera Scanner (html5-qrcode) ────────────────────────────────
  const startCameraScan = () => setIsCameraScanning(true);

  const stopCameraScan = () => {
    try {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current?.clear();
          });
      }
    } catch {
      /* noop */
    }
    scannerRef.current = null;
    setIsCameraScanning(false);
  };

  useEffect(() => {
    if (!isCameraScanning) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const el = document.getElementById('foodbank-counter-qr-reader');
      if (!el) return;
      try {
        const scanner = new Html5Qrcode('foodbank-counter-qr-reader');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: (w: number, h: number) => {
              const size = Math.min(w, h) * 0.7;
              return { width: size, height: size };
            },
          },
          (decodedText) => {
            if (cancelled) return;
            const raw = (decodedText || '').trim();
            if (!raw) return;
            let token = raw;
            try {
              const u = new URL(raw);
              const v = u.searchParams.get('verify');
              if (v) token = v;
            } catch {
              /* raw token */
            }
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(100);
            }
            stopCameraScan();
            setCounterInput(token);
            handleLookupOrVerify(token);
          },
          () => {
            /* ignore routine frame errors */
          }
        );
      } catch (err: any) {
        if (cancelled) return;
        console.error('Camera scan failed:', err);
        setIsCameraScanning(false);
        scannerRef.current = null;
        toast.error(
          err?.name === 'NotAllowedError' || String(err?.message || '').includes('NotAllowed')
            ? t(
                'jpp:foodbank_camera_permission_denied',
                'Akses kamera ditolak. Sila benarkan kamera pada pelayar (HTTPS).'
              )
            : t(
                'jpp:foodbank_camera_start_failed',
                'Gagal memulakan kamera. Peranti mungkin tiada kamera atau disekat.'
              )
        );
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraScanning]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('verify');
    if (token && user?.id && applications.length > 0) {
      setCounterInput(token);
      handleVerifyCounterPickup(token);
      const url = new URL(window.location.href);
      url.searchParams.delete('verify');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, applications.length]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current?.clear();
          });
      }
    };
  }, []);

  // ── 5. Atomic Counter Pickup Verification (RPC) ──────────────────────────
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0f766e', '#14b8a6', '#10b981', '#f59e0b', '#0284c7'],
      });
    } catch {
      /* ignore */
    }
  };

  const handleVerifyCounterPickup = async (overrideQuery?: string) => {
    const query = (overrideQuery || counterInput).trim();
    if (!query) {
      toast.error(t('jpp:scan_qr_prompt', 'Sila imbas kod QR atau masukkan No. Matrik / No. Permohonan.'));
      return;
    }
    if (!user?.id) {
      toast.error(t('jpp:foodbank_officer_session_invalid', 'Sesi pegawai tidak sah.'));
      return;
    }

    setIsVerifyingCounter(true);
    try {
      let targetApp = applications.find(
        (a) => a.pickup_qr_code?.toLowerCase() === query.toLowerCase() || a.id === query
      );

      if (!targetApp) {
        targetApp = applications.find(
          (a) =>
            a.application_no?.toLowerCase() === query.toLowerCase() ||
            a.applicant?.matric_no?.toLowerCase() === query.toLowerCase() ||
            a.applicant?.full_name?.toLowerCase().includes(query.toLowerCase())
        );
      }

      let rpcResult: any = null;

      if (targetApp) {
        if (targetApp.status === 'SELESAI') {
          toast.error(
            t(
              'kebajikan:foodbank_pickup_already_completed',
              `Permohonan ${targetApp.application_no} telah pun selesai diambil sebelum ini.`,
              { app_no: targetApp.application_no }
            )
          );
          setIsVerifyingCounter(false);
          return;
        }
        if (targetApp.status !== 'LULUS') {
          toast.error(
            t(
              'kebajikan:foodbank_pickup_not_approved_error',
              `Permohonan ini berstatus "${targetApp.status}". Hanya permohonan LULUS dibenarkan untuk agihan fizikal.`,
              { status: targetApp.status }
            )
          );
          setIsVerifyingCounter(false);
          return;
        }

        const { data, error } = await supabase.rpc('verify_and_complete_foodbank_pickup', {
          p_application_id: targetApp.id,
          p_verifier_id: user.id,
        });
        if (error) throw error;
        rpcResult = data;
      } else {
        const { data, error } = await supabase.rpc('verify_and_complete_foodbank_pickup_by_qr', {
          p_qr_code: query,
          p_verifier_id: user.id,
        });
        if (error) throw error;
        rpcResult = data;
      }

      if (rpcResult && rpcResult.success) {
        triggerCelebration();

        const matched = targetApp || applications.find((a) => a.id === rpcResult.application_id);
        if (matched?.requires_counter_verification && !matched.counter_verified) {
          await supabase
            .from('foodbank_applications')
            .update({
              counter_verified: true,
              counter_verified_by: user.id,
              counter_verified_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', matched.id);
        }

        toast.success(
          t(
            'jpp:foodbank_pickup_success',
            'Pengesahan Berjaya! Barangan telah diserahkan untuk permohonan {{appNo}}.',
            { appNo: rpcResult.application_no || '' }
          ),
          { duration: 5000 }
        );

        setRecentVerifiedRecord({
          appNo: rpcResult.application_no || matched?.application_no || query,
          studentName: matched ? effectiveName(matched) : 'Mahasiswa POLISAS',
          matricNo: matched ? effectiveMatric(matched) : undefined,
          itemsCount: matched?.selected_items?.length || 0,
          totalValue: Number(rpcResult.total_value || matched?.total_estimated_value || 0),
          timestamp: new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }),
        });

        setCounterInput('');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(100);
        }
        setActiveScanStudent((prev) => (prev ? ({ ...prev, status: 'SELESAI' } as FoodBankApplication) : null));
        if (matched?.applicant?.id) {
          notifyStudent({ ...matched, status: 'SELESAI' }, 'SELESAI').catch(() => {});
        }
        fetchAllData(true);
      } else {
        toast.error(rpcResult?.message || t('jpp:foodbank_verification_failed', 'Pengesahan gagal diselesaikan.'));
      }
    } catch (err: any) {
      console.error('Counter verify error:', err);
      toast.error(
        `${t('jpp:foodbank_counter_error_prefix', 'Ralat pengesahan kaunter:')} ${
          err.message || t('jpp:foodbank_check_stock_balance', 'Sila semak baki stok barangan.')
        }`
      );
    } finally {
      setIsVerifyingCounter(false);
    }
  };

  const handleLookupOrVerify = async (queryStr: string) => {
    const query = queryStr.trim();
    if (!query) {
      toast.error(t('jpp:scan_qr_prompt', 'Sila imbas kod QR atau masukkan No. Matrik / No. Permohonan.'));
      return;
    }

    let matched = applications.find(
      (a) =>
        a.pickup_qr_code?.toLowerCase() === query.toLowerCase() ||
        a.id.toLowerCase() === query.toLowerCase() ||
        a.application_no?.toLowerCase() === query.toLowerCase() ||
        a.applicant?.matric_no?.toLowerCase() === query.toLowerCase() ||
        a.applicant_matric_override?.toLowerCase() === query.toLowerCase() ||
        a.applicant?.full_name?.toLowerCase().includes(query.toLowerCase()) ||
        a.applicant_name_override?.toLowerCase().includes(query.toLowerCase())
    );

    if (!matched) {
      try {
        const { data } = await supabase
          .from('foodbank_applications')
          .select(FOODBANK_APPLICATION_LOOKUP_SELECT)
          .or(`pickup_qr_code.eq.${query},application_no.eq.${query},id.eq.${query}`)
          .maybeSingle();

        if (data) {
          matched = data as unknown as FoodBankApplication;
        }
      } catch (e) {
        console.warn('DB lookup error:', e);
      }
    }

    if (matched) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(100);
      }
      setActiveScanStudent(matched);
      toast.success(
        t('kebajikan:foodbank_student_record_found', `Rekod pelajar ditemui: ${effectiveName(matched)}`, {
          name: effectiveName(matched),
        })
      );
    } else {
      handleVerifyCounterPickup(query);
    }
  };

  const handleExecuteFulfillment = async (app: FoodBankApplication) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }
    await handleVerifyCounterPickup(app.id || app.pickup_qr_code || app.application_no);
    setActiveScanStudent((prev) => (prev ? ({ ...prev, status: 'SELESAI' } as FoodBankApplication) : null));
  };

  // ── 6. Application Approval / Rejection ──────────────────────────────────
  const handleApproveApplication = async (app: FoodBankApplication) => {
    if (!user?.id) return;
    setIsProcessingAction(true);
    try {
      const { error } = await supabase
        .from('foodbank_applications')
        .update({
          status: 'LULUS',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', app.id);

      if (error) throw error;

      toast.success(
        t(
          'kebajikan:foodbank_app_approved_with_no',
          `${t('jpp:foodbank_toast_approved', 'Permohonan berjaya diluluskan')}: ${app.application_no}`,
          { app_no: app.application_no }
        )
      );
      notifyStudent({ ...app, status: 'LULUS' }, 'LULUS').catch(() => {});
      fetchAllData(true);
    } catch (err: any) {
      console.error('Approve error:', err);
      toast.error(`${t('jpp:foodbank_fail_approve_prefix', 'Gagal meluluskan:')} ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenRejectionModal = (app: FoodBankApplication) => {
    setRejectionModalApp(app);
    setRejectionReason(
      t(
        'jpp:foodbank_rejection_reason_default',
        'Maklumat pendapatan / kelayakan tidak memenuhi syarat semasa.'
      )
    );
  };

  const handleConfirmReject = async () => {
    if (!rejectionModalApp || !user?.id) return;
    if (!rejectionReason.trim()) {
      toast.error(t('jpp:foodbank_specify_rejection_reason', 'Sila nyatakan sebab penolakan.'));
      return;
    }

    setIsProcessingAction(true);
    try {
      const { error } = await supabase
        .from('foodbank_applications')
        .update({
          status: 'DITOLAK',
          rejection_reason: rejectionReason.trim(),
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rejectionModalApp.id);

      if (error) throw error;

      if (rejectionModalApp.stock_reserved) {
        try {
          await supabase.rpc('release_foodbank_stock', { p_application_id: rejectionModalApp.id });
        } catch {
          /* ignore */
        }
      }

      toast.success(
        t(
          'kebajikan:foodbank_app_rejected_with_no',
          `${t('jpp:foodbank_toast_rejected', 'Permohonan ditolak')}: ${rejectionModalApp.application_no}`,
          { app_no: rejectionModalApp.application_no }
        )
      );
      notifyStudent(
        { ...rejectionModalApp, status: 'DITOLAK', rejection_reason: rejectionReason.trim() },
        'DITOLAK'
      ).catch(() => {});
      setRejectionModalApp(null);
      setRejectionReason('');
      fetchAllData(true);
    } catch (err: any) {
      console.error('Reject error:', err);
      toast.error(`${t('jpp:foodbank_fail_reject_prefix', 'Gagal menolak permohonan:')} ${err.message}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // ── 7. Inventory CRUD & Multi-Location Stock Control ─────────────────────
  const handleOpenAddItemModal = () => {
    setEditingItem(null);
    setItemFormData({
      name: '',
      category: 'MAKANAN',
      description: '',
      unit: 'pek',
      current_stock: 50,
      estimated_cost: 5.0,
      is_active: true,
      image_url: '',
    });
    setImageFile(null);
    setItemModalOpen(true);
  };

  const handleOpenEditItemModal = (item: FoodBankItem) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name,
      category: item.category,
      description: item.description || '',
      unit: item.unit,
      current_stock: item.current_stock,
      estimated_cost: item.estimated_cost,
      is_active: item.is_active,
      image_url: item.image_url || '',
    });
    setImageFile(null);
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.name.trim()) {
      toast.error(t('jpp:foodbank_enter_item_name', 'Sila masukkan nama item.'));
      return;
    }

    setIsSavingItem(true);
    try {
      let finalImageUrl = itemFormData.image_url;

      if (imageFile) {
        setIsUploadingImage(true);
        try {
          finalImageUrl = await uploadFileToDrive(imageFile, 'foodbank', `item_${Date.now()}`);
        } catch (uploadErr) {
          console.warn('Upload via uploadFileToDrive failed, trying direct storage...', uploadErr);
          const ext = imageFile.name.split('.').pop() || 'jpg';
          const path = `foodbank/item_${Date.now()}.${ext}`;
          const { error: directErr } = await supabase.storage
            .from('reports')
            .upload(path, imageFile, { upsert: true });
          if (!directErr) {
            const { data } = supabase.storage.from('reports').getPublicUrl(path);
            finalImageUrl = data.publicUrl;
          }
        } finally {
          setIsUploadingImage(false);
        }
      }

      const payload = {
        name: itemFormData.name.trim(),
        category: itemFormData.category,
        description: itemFormData.description.trim() || null,
        unit: itemFormData.unit.trim() || 'pek',
        current_stock: Math.max(0, parseInt(String(itemFormData.current_stock), 10) || 0),
        estimated_cost: Math.max(0, parseFloat(String(itemFormData.estimated_cost)) || 0),
        is_active: itemFormData.is_active,
        image_url: finalImageUrl || null,
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        const { error } = await supabase
          .from('foodbank_items')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success(
          t('kebajikan:foodbank_item_updated_toast', `Item "${payload.name}" berjaya dikemas kini!`, {
            name: payload.name,
          })
        );
      } else {
        const { error } = await supabase.from('foodbank_items').insert([payload]);
        if (error) throw error;
        toast.success(
          t('kebajikan:foodbank_item_added_toast', `Item baharu "${payload.name}" berjaya ditambah!`, {
            name: payload.name,
          })
        );
      }

      setItemModalOpen(false);
      fetchAllData(true);
    } catch (err: any) {
      console.error('Save item error:', err);
      toast.error(`${t('jpp:foodbank_fail_save_item_prefix', 'Gagal menyimpan item:')} ${err.message}`);
    } finally {
      setIsSavingItem(false);
    }
  };

  const getItemStockForLocation = useCallback(
    (itemId: string, locationId: string): number => {
      if (locationId === 'SEMUA' || locationId === 'AGREGAT') {
        const found = items.find((i) => i.id === itemId);
        return found?.current_stock ?? 0;
      }
      const locStock = locationStocks.find(
        (ls) => ls.item_id === itemId && ls.location_id === locationId
      );
      return locStock ? locStock.current_stock : 0;
    },
    [items, locationStocks]
  );

  const handleQuickAdjustStock = async (item: FoodBankItem, delta: number) => {
    if (selectedInventoryLocationId === 'SEMUA') {
      const newStock = Math.max(0, item.current_stock + delta);
      try {
        const { error } = await supabase
          .from('foodbank_items')
          .update({ current_stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', item.id);
        if (error) throw error;

        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, current_stock: newStock } : i)));
        toast.success(
          t(
            'kebajikan:foodbank_stock_aggregate_adjusted_toast',
            `Stok agregat ${item.name}: ${item.current_stock} → ${newStock} ${item.unit}`,
            { name: item.name, old_stock: item.current_stock, new_stock: newStock, unit: item.unit }
          )
        );
      } catch (err) {
        console.error('Stock adjust error:', err);
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, current_stock: newStock } : i)));
        toast.success(
          t(
            'kebajikan:foodbank_stock_offline_adjusted_toast',
            `(Mod Luar Talian) Stok ${item.name}: ${newStock} ${item.unit}`,
            { name: item.name, stock: newStock, unit: item.unit }
          )
        );
      }
    } else {
      const currentLocStock = getItemStockForLocation(item.id, selectedInventoryLocationId);
      const newLocStock = Math.max(0, currentLocStock + delta);
      const targetLoc = locations.find((l) => l.id === selectedInventoryLocationId);
      const locName = targetLoc?.name || 'Pusat Edaran';

      try {
        const { error } = await supabase.from('foodbank_location_stocks').upsert(
          {
            item_id: item.id,
            location_id: selectedInventoryLocationId,
            current_stock: newLocStock,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'item_id,location_id' }
        );
        if (error) throw error;

        try {
          await supabase.from('foodbank_audit_logs').insert({
            actor_id: user?.id,
            actor_name: profile?.full_name || 'Pegawai JPP',
            action_type: 'STOCK_ADJUSTMENT',
            location_id: selectedInventoryLocationId,
            target_id: item.name,
            details: {
              item_id: item.id,
              item_name: item.name,
              delta,
              old_stock: currentLocStock,
              new_stock: newLocStock,
              location_name: locName,
            },
          });
        } catch {
          /* ignore */
        }

        setLocationStocks((prev) => {
          const exists = prev.some(
            (ls) => ls.item_id === item.id && ls.location_id === selectedInventoryLocationId
          );
          if (exists) {
            return prev.map((ls) =>
              ls.item_id === item.id && ls.location_id === selectedInventoryLocationId
                ? { ...ls, current_stock: newLocStock, updated_at: new Date().toISOString() }
                : ls
            );
          }
          return [
            ...prev,
            {
              id: `ls-${Date.now()}`,
              item_id: item.id,
              location_id: selectedInventoryLocationId,
              current_stock: newLocStock,
              reorder_level: 10,
              updated_at: new Date().toISOString(),
            },
          ];
        });

        setItems((prev) =>
          prev.map((i) => {
            if (i.id !== item.id) return i;
            const diff = newLocStock - currentLocStock;
            return { ...i, current_stock: Math.max(0, i.current_stock + diff) };
          })
        );

        toast.success(
          t(
            'kebajikan:foodbank_stock_loc_adjusted_toast',
            `Stok ${item.name} di ${locName}: ${currentLocStock} → ${newLocStock} ${item.unit}`,
            {
              name: item.name,
              loc: locName,
              old_stock: currentLocStock,
              new_stock: newLocStock,
              unit: item.unit,
            }
          )
        );
      } catch (err) {
        console.error('Location stock adjust error:', err);
        setLocationStocks((prev) => {
          const exists = prev.some(
            (ls) => ls.item_id === item.id && ls.location_id === selectedInventoryLocationId
          );
          if (exists) {
            return prev.map((ls) =>
              ls.item_id === item.id && ls.location_id === selectedInventoryLocationId
                ? { ...ls, current_stock: newLocStock }
                : ls
            );
          }
          return [
            ...prev,
            {
              id: `ls-${Date.now()}`,
              item_id: item.id,
              location_id: selectedInventoryLocationId,
              current_stock: newLocStock,
              reorder_level: 10,
            },
          ];
        });
        toast.success(
          t(
            'kebajikan:foodbank_stock_loc_offline_toast',
            `(Mod Luar Talian) Stok ${item.name} di ${locName}: ${newLocStock} ${item.unit}`,
            { name: item.name, loc: locName, stock: newLocStock, unit: item.unit }
          )
        );
      }
    }
  };

  const handleOpenTransferModal = (itemId?: string) => {
    setTransferFormData((prev) => ({
      ...prev,
      item_id: itemId || prev.item_id || items[0]?.id || '',
      from_location_id: itemId
        ? (selectedInventoryLocationId !== 'SEMUA' ? selectedInventoryLocationId : locations[0]?.id) || 'AGREGAT'
        : prev.from_location_id || (selectedInventoryLocationId !== 'SEMUA' ? selectedInventoryLocationId : 'AGREGAT'),
      to_location_id:
        (locations.find((l) => l.id !== selectedInventoryLocationId)?.id || locations[1]?.id) || '',
      quantity: 1,
      notes: '',
    }));
    setTransferModalOpen(true);
  };

  const handleExecuteStockTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !transferFormData.item_id ||
      !transferFormData.from_location_id ||
      !transferFormData.to_location_id
    ) {
      toast.error(t('jpp:foodbank_transfer_all_fields_required', 'Sila lengkapkan semua medan lokasi dan barangan.'));
      return;
    }
    if (transferFormData.from_location_id === transferFormData.to_location_id) {
      toast.error(t('jpp:foodbank_transfer_same_location', 'Lokasi sumber dan destinasi tidak boleh sama.'));
      return;
    }
    const sourceStock = getItemStockForLocation(
      transferFormData.item_id,
      transferFormData.from_location_id
    );
    const qty = Number(transferFormData.quantity);
    if (qty <= 0) {
      toast.error(t('kebajikan:foodbank_transfer_min_qty', 'Kuantiti pindahan mestilah sekurang-kurangnya 1.'));
      return;
    }
    if (qty > sourceStock) {
      toast.error(
        t(
          'kebajikan:foodbank_insufficient_source_stock',
          `Baki stok tidak mencukupi di lokasi sumber (Baki semasa: ${sourceStock}).`,
          { stock: sourceStock }
        )
      );
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const fromAgregat = transferFormData.from_location_id === 'AGREGAT';
      const { data, error } = fromAgregat
        ? await supabase.rpc('allocate_foodbank_stock_from_aggregate', {
            p_item_id: transferFormData.item_id,
            p_to_location_id: transferFormData.to_location_id,
            p_quantity: qty,
            p_actor_id: user?.id,
            p_actor_name: profile?.full_name || 'Pegawai JPP',
            p_notes: transferFormData.notes?.trim() || null,
          })
        : await supabase.rpc('transfer_foodbank_stock', {
            p_item_id: transferFormData.item_id,
            p_from_location_id: transferFormData.from_location_id,
            p_to_location_id: transferFormData.to_location_id,
            p_quantity: qty,
            p_actor_id: user?.id,
            p_actor_name: profile?.full_name || 'Pegawai JPP',
            p_notes: transferFormData.notes?.trim() || null,
          });

      if (error) throw error;

      if (data && typeof data === 'object' && (data as any).success === false) {
        toast.error((data as any).message || t('jpp:foodbank_transfer_failed', 'Gagal memindahkan stok.'));
        return;
      }

      toast.success((data as any)?.message || t('jpp:foodbank_transfer_success', 'Pindahan stok berjaya direkodkan!'));
      setTransferModalOpen(false);
      setTransferFormData({
        item_id: '',
        from_location_id: 'AGREGAT',
        to_location_id: '',
        quantity: 1,
        notes: '',
      });
      await fetchAllData(true);
    } catch (err) {
      console.warn('RPC transfer_foodbank_stock fallback to local updates:', err);
      if (transferFormData.from_location_id === 'AGREGAT') {
        setItems((prev) =>
          prev.map((i) =>
            i.id === transferFormData.item_id
              ? { ...i, current_stock: Math.max(0, i.current_stock - qty) }
              : i
          )
        );
      }
      setLocationStocks((prev) => {
        let foundDest = false;
        const updated = prev.map((ls) => {
          if (
            ls.item_id === transferFormData.item_id &&
            ls.location_id === transferFormData.from_location_id
          ) {
            return {
              ...ls,
              current_stock: Math.max(0, ls.current_stock - qty),
              updated_at: new Date().toISOString(),
            };
          }
          if (
            ls.item_id === transferFormData.item_id &&
            ls.location_id === transferFormData.to_location_id
          ) {
            foundDest = true;
            return {
              ...ls,
              current_stock: ls.current_stock + qty,
              updated_at: new Date().toISOString(),
            };
          }
          return ls;
        });

        if (!foundDest) {
          updated.push({
            id: `ls-${Date.now()}`,
            item_id: transferFormData.item_id,
            location_id: transferFormData.to_location_id,
            current_stock: qty,
            reorder_level: 10,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        return updated;
      });

      try {
        const itemObj = items.find((i) => i.id === transferFormData.item_id);
        const fromLocObj = locations.find((l) => l.id === transferFormData.from_location_id);
        const toLocObj = locations.find((l) => l.id === transferFormData.to_location_id);
        await supabase.from('foodbank_audit_logs').insert({
          actor_id: user?.id,
          actor_name: profile?.full_name || 'Pegawai JPP',
          action_type: 'STOCK_TRANSFER',
          location_id: transferFormData.to_location_id,
          target_id: itemObj?.name || t('kebajikan:foodbank_items_title', 'Barangan Food Bank'),
          details: {
            item_id: transferFormData.item_id,
            item_name: itemObj?.name,
            from_location_id: transferFormData.from_location_id,
            from_location_name: fromLocObj?.name,
            to_location_id: transferFormData.to_location_id,
            to_location_name: toLocObj?.name,
            quantity: qty,
            notes: transferFormData.notes,
          },
        });
      } catch {
        /* silent */
      }

      toast.success(t('jpp:foodbank_transfer_local_success', 'Pindahan stok berjaya (Mod Tempatan)!'));
      setTransferModalOpen(false);
      setTransferFormData({
        item_id: '',
        from_location_id: 'AGREGAT',
        to_location_id: '',
        quantity: 1,
        notes: '',
      });
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleToggleItemActive = async (item: FoodBankItem) => {
    const newStatus = !item.is_active;
    try {
      const { error } = await supabase
        .from('foodbank_items')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;

      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: newStatus } : i)));
      toast.success(
        t('jpp:foodbank_item_status_msg', 'Item {{name}} kini {{status}}.', {
          name: item.name,
          status: newStatus
            ? t('jpp:foodbank_status_active_caps', 'AKTIF')
            : t('jpp:foodbank_status_inactive_caps', 'TIDAK AKTIF'),
        })
      );
    } catch (err: any) {
      console.error('Toggle active error:', err);
      toast.error(`${t('jpp:foodbank_fail_change_status_prefix', 'Gagal menukar status:')} ${err.message}`);
    }
  };

  const handleDeleteItem = (item: FoodBankItem) => {
    setConfirmConfig({
      isOpen: true,
      title: t('jpp:foodbank_delete_catalog_title', 'Padam Item Katalog'),
      description: t(
        'kebajikan:confirm_delete_item_catalog',
        `Adakah anda pasti ingin memadam item "${item.name}" daripada katalog? Tindakan ini tidak boleh diundur.`,
        { name: item.name }
      ),
      confirmLabel: t('jpp:foodbank_item_deleted_title', 'Padam Item'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('foodbank_items').delete().eq('id', item.id);
          if (error) throw error;
          toast.success(
            t('kebajikan:foodbank_item_deleted_toast', `Item "${item.name}" telah dipadam.`, {
              name: item.name,
            })
          );
          fetchAllData(true);
        } catch (err) {
          console.error('Delete item error:', err);
          toast.error(
            t(
              'jpp:foodbank_delete_item_failed',
              'Gagal memadam item (mungkin terdapat rekod permohonan berkaitan).'
            )
          );
        }
      },
    });
  };

  // ── 8. Budget Adjustments ────────────────────────────────────────────────
  const handleSaveBudgetAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (budgetFormData.amount <= 0) {
      toast.error(t('jpp:foodbank_budget_amount_required', 'Sila masukkan amaun melebihi RM0.'));
      return;
    }
    if (!budgetFormData.description.trim()) {
      toast.error(t('jpp:foodbank_budget_reason_required', 'Sila nyatakan sebab / perihal pelarasan.'));
      return;
    }

    setIsSubmittingBudget(true);
    try {
      const { error: txError } = await supabase.from('foodbank_budget_transactions').insert([
        {
          transaction_type: budgetFormData.transaction_type,
          amount: budgetFormData.amount,
          description: budgetFormData.description.trim(),
          created_by: user.id,
        },
      ]);
      if (txError) throw txError;

      if (settings?.id && budgetFormData.transaction_type === 'BUDGET_ADDITION') {
        const newTotal = (settings.total_budget || OFFICIAL_BASELINE_BUDGET) + budgetFormData.amount;
        await supabase
          .from('foodbank_settings')
          .update({
            total_budget: newTotal,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settings.id);
      }

      toast.success(
        t('jpp:foodbank_budget_adjusted_success', 'Pelarasan bajet berjaya direkodkan ke lejar audit!')
      );
      setBudgetModalOpen(false);
      setBudgetFormData({ transaction_type: 'BUDGET_ADDITION', amount: 1000, description: '' });
      fetchAllData(true);
    } catch (err: any) {
      console.error('Budget adjustment error:', err);
      toast.error(`${t('jpp:foodbank_fail_record_budget_prefix', 'Gagal merekod bajet:')} ${err.message}`);
    } finally {
      setIsSubmittingBudget(false);
    }
  };

  // ── 9. Session Settings & Distribution Locations CRUD ────────────────────
  const handleSaveSessionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSavingSettings(true);
    const updatedPayload: Partial<FoodBankSettings> = {
      max_monthly_applications_per_student: Math.max(
        1,
        sessionFormData.max_monthly_applications_per_student
      ),
      max_items_per_application: Math.max(1, sessionFormData.max_items_per_application),
      application_instructions: sessionFormData.application_instructions.trim(),
      eligibility_criteria: sessionFormData.eligibility_criteria.trim(),
      total_budget: Math.max(100, sessionFormData.total_budget),
      allow_housemate: sessionFormData.allow_housemate,
    };

    try {
      if (settings?.id) {
        const { error } = await supabase
          .from('foodbank_settings')
          .update({
            ...updatedPayload,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settings.id);
        if (error) console.warn('DB update error for session settings:', error);
      }
    } catch (err) {
      console.warn('Save settings database error, saving to local state:', err);
    }

    saveLocalFoodBankSettings(updatedPayload);
    setSettings((prev) =>
      prev
        ? ({ ...prev, ...updatedPayload } as FoodBankSettings)
        : ({ ...loadLocalFoodBankSettings(), ...updatedPayload } as FoodBankSettings)
    );
    toast.success(t('jpp:foodbank_settings_saved', 'Tetapan sesi & formula kuota berjaya disimpan!'));
    setIsSavingSettings(false);
  };

  const handleOpenAddLocationModal = () => {
    setEditingLocation(null);
    setLocationFormData({
      name: '',
      polymaps_building_id: buildings[0]?.id || '',
      room_detail: '',
      operating_hours: 'Isnin - Khamis: 10:00 AM - 4:00 PM',
      time_slots: '10:00 AM - 11:30 AM, 11:30 AM - 01:00 PM, 02:30 PM - 04:00 PM',
      operating_days: [],
      contact_person: 'Exco Kebajikan JPP',
      contact_phone: '',
      is_active: true,
    });
    setLocationModalOpen(true);
  };

  const handleOpenEditLocationModal = (loc: FoodBankDistributionLocation) => {
    setEditingLocation(loc);
    setLocationFormData({
      name: loc.name,
      polymaps_building_id: loc.polymaps_building_id || '',
      room_detail: loc.room_detail || '',
      operating_hours: loc.operating_hours || 'Isnin - Khamis: 10:00 AM - 4:00 PM',
      time_slots:
        loc.time_slots && loc.time_slots.length > 0
          ? loc.time_slots.join(', ')
          : '10:00 AM - 11:30 AM, 11:30 AM - 01:00 PM, 02:30 PM - 04:00 PM',
      operating_days: loc.operating_days && loc.operating_days.length > 0 ? [...loc.operating_days] : [],
      contact_person: loc.contact_person || 'Exco Kebajikan JPP',
      contact_phone: loc.contact_phone || '',
      is_active: loc.is_active,
    });
    setLocationModalOpen(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationFormData.name.trim()) {
      toast.error(t('jpp:foodbank_location_name_required', 'Sila masukkan nama pusat lokasi.'));
      return;
    }

    setIsSavingLocation(true);
    try {
      const payload = {
        name: locationFormData.name.trim(),
        polymaps_building_id: locationFormData.polymaps_building_id || null,
        room_detail: locationFormData.room_detail.trim() || null,
        operating_hours: locationFormData.operating_hours.trim(),
        time_slots: locationFormData.time_slots
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
        operating_days: locationFormData.operating_days,
        contact_person: locationFormData.contact_person.trim() || 'Exco Kebajikan JPP',
        contact_phone: locationFormData.contact_phone.trim() || null,
        is_active: locationFormData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingLocation) {
        const { error } = await supabase
          .from('foodbank_distribution_locations')
          .update(payload)
          .eq('id', editingLocation.id);
        if (error) throw error;
        toast.success(
          t('kebajikan:foodbank_location_updated_toast', `Lokasi "${payload.name}" berjaya dikemas kini!`, {
            name: payload.name,
          })
        );
      } else {
        const { error } = await supabase.from('foodbank_distribution_locations').insert([payload]);
        if (error) throw error;
        toast.success(
          t(
            'kebajikan:foodbank_location_registered_toast',
            `Lokasi baharu "${payload.name}" berjaya didaftarkan!`,
            { name: payload.name }
          )
        );
      }

      setLocationModalOpen(false);
      fetchAllData(true);
    } catch (err: any) {
      console.error('Save location error:', err);
      toast.error(`${t('jpp:foodbank_fail_save_location_prefix', 'Gagal menyimpan lokasi:')} ${err.message}`);
    } finally {
      setIsSavingLocation(false);
    }
  };

  // ── 10. Counter Officer Search & Appointment ─────────────────────────────
  useEffect(() => {
    if (!officerSearchQuery || officerSearchQuery.trim().length < 2) {
      setCandidateProfiles([]);
      return;
    }
    if (selectedCandidate && officerSearchQuery.includes(selectedCandidate.full_name)) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCandidate(true);
      try {
        const q = officerSearchQuery.trim();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, matric_no, phone, department, avatar_url')
          .or(`matric_no.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(8);
        if (error) console.warn('Profiles search error:', error);
        setCandidateProfiles(data || []);
      } catch (err) {
        console.warn('Candidate search error:', err);
      } finally {
        setIsSearchingCandidate(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [officerSearchQuery, selectedCandidate]);

  const handleSelectCandidate = (candidate: any) => {
    setSelectedCandidate(candidate);
    setOfficerSearchQuery(
      `${candidate.full_name} (${candidate.matric_no || candidate.email || 'POLISAS'})`
    );
    setCandidateProfiles([]);
  };

  const handleClearCandidate = () => {
    setSelectedCandidate(null);
    setOfficerSearchQuery('');
    setCandidateProfiles([]);
  };

  const handleAssignOfficer = async () => {
    if (!selectedCandidate) {
      toast.error(
        t(
          'jpp:foodbank_select_officer_candidate',
          'Sila pilih calon pegawai daripada carian No. Matrik / Nama.'
        )
      );
      return;
    }
    if (!officerRoleTitle.trim()) {
      toast.error(t('jpp:foodbank_officer_role_required', 'Sila nyatakan gelaran peranan pegawai.'));
      return;
    }

    const locId = officerAssignLocationId ? officerAssignLocationId : null;
    const alreadyAssigned = officers.some(
      (o) => o.user_id === selectedCandidate.id && (o.location_id || null) === locId
    );
    if (alreadyAssigned) {
      toast.error(
        t('jpp:foodbank_officer_already_assigned', 'Pegawai ini sudah pun dilantik bagi lokasi tersebut.')
      );
      return;
    }

    setIsAssigningOfficer(true);
    const assignedLocName = locId
      ? locations.find((l) => l.id === locId)?.name || 'Pusat Edaran Khusus'
      : t('jpp:foodbank_all_distribution_centers_floating', 'Semua Pusat Edaran (Floating)');

    try {
      const { error } = await supabase
        .from('foodbank_officers')
        .insert({
          user_id: selectedCandidate.id,
          location_id: locId,
          role_title: officerRoleTitle.trim(),
          is_active: true,
          assigned_by: user?.id || null,
        })
        .select(FOODBANK_OFFICERS_SELECT)
        .single();
      if (error) throw error;

      try {
        await supabase.from('foodbank_audit_logs').insert({
          actor_id: user?.id,
          actor_name: profile?.full_name || t('kebajikan:role_executive_admin_jpp', 'Pentadbir Eksekutif JPP'),
          action_type: 'OFFICER_ASSIGNED',
          location_id: locId,
          target_id: selectedCandidate.matric_no || selectedCandidate.full_name,
          details: {
            officer_user_id: selectedCandidate.id,
            officer_name: selectedCandidate.full_name,
            matric_no: selectedCandidate.matric_no,
            role_title: officerRoleTitle.trim(),
            assigned_location: assignedLocName,
          },
        });
      } catch (auditErr) {
        console.warn(t('jpp:foodbank_audit_log_insert_note', 'Nota sisipan log audit:'), auditErr);
      }

      toast.success(
        t(
          'kebajikan:foodbank_officer_appointed_toast',
          `Berjaya melantik ${selectedCandidate.full_name} sebagai ${officerRoleTitle.trim()}!`,
          { name: selectedCandidate.full_name, role: officerRoleTitle.trim() }
        )
      );
      handleClearCandidate();
      setOfficerAssignLocationId('');
      setOfficerRoleTitle(t('jpp:foodbank_counter_officer_default', 'Petugas Kaunter Food Bank'));
      await fetchAllData(true);
    } catch (err) {
      console.error('Assign officer error, fallback local:', err);
      const newOfficer: FoodBankOfficer = {
        id: `off-${Date.now()}`,
        user_id: selectedCandidate.id,
        location_id: locId,
        role_title: officerRoleTitle.trim(),
        is_active: true,
        assigned_by: user?.id,
        created_at: new Date().toISOString(),
        user: {
          id: selectedCandidate.id,
          full_name: selectedCandidate.full_name,
          email: selectedCandidate.email,
          matric_no: selectedCandidate.matric_no,
          phone: selectedCandidate.phone,
          avatar_url: selectedCandidate.avatar_url,
        },
        location: locations.find((l) => l.id === locId) || null,
      };
      setOfficers((prev) => [newOfficer, ...prev]);

      try {
        await supabase.from('foodbank_audit_logs').insert({
          actor_id: user?.id,
          actor_name: profile?.full_name || t('kebajikan:role_executive_admin_jpp', 'Pentadbir Eksekutif JPP'),
          action_type: 'OFFICER_ASSIGNED',
          location_id: locId,
          target_id: selectedCandidate.matric_no || selectedCandidate.full_name,
          details: {
            officer_user_id: selectedCandidate.id,
            officer_name: selectedCandidate.full_name,
            matric_no: selectedCandidate.matric_no,
            role_title: officerRoleTitle.trim(),
            assigned_location: assignedLocName,
            is_offline: true,
          },
        });
      } catch {
        /* silent */
      }

      toast.success(
        t(
          'kebajikan:foodbank_officer_appointed_local_toast',
          `(Mod Tempatan) Berjaya melantik ${selectedCandidate.full_name}!`,
          { name: selectedCandidate.full_name }
        )
      );
      handleClearCandidate();
      setOfficerAssignLocationId('');
      setOfficerRoleTitle(t('jpp:foodbank_counter_officer_default', 'Petugas Kaunter Food Bank'));
    } finally {
      setIsAssigningOfficer(false);
    }
  };

  const handleToggleOfficerStatus = async (officer: FoodBankOfficer) => {
    const newStatus = !officer.is_active;
    try {
      const { error } = await supabase
        .from('foodbank_officers')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', officer.id);
      if (error) throw error;

      setOfficers((prev) => prev.map((o) => (o.id === officer.id ? { ...o, is_active: newStatus } : o)));

      try {
        await supabase.from('foodbank_audit_logs').insert({
          actor_id: user?.id,
          actor_name: profile?.full_name || t('kebajikan:role_executive_admin_jpp', 'Pentadbir Eksekutif JPP'),
          action_type: newStatus ? 'OFFICER_ASSIGNED' : 'OFFICER_REMOVED',
          location_id: officer.location_id,
          target_id: officer.user?.matric_no || officer.user?.full_name || officer.id,
          details: {
            officer_id: officer.id,
            officer_name: officer.user?.full_name,
            new_status: newStatus ? 'AKTIF' : 'TIDAK_AKTIF',
            action: newStatus
              ? t('jpp:foodbank_reactivating_officer', 'Mengaktifkan semula pegawai')
              : t('jpp:foodbank_deactivating_officer', 'Menyahaktifkan status pegawai'),
          },
        });
      } catch {
        /* silent */
      }

      toast.success(
        t('jpp:foodbank_officer_status_named_msg', 'Status {{name}} kini {{status}}.', {
          name: officer.user?.full_name || t('jpp:foodbank_officer_fallback', 'pegawai'),
          status: newStatus
            ? t('jpp:foodbank_status_active_caps', 'AKTIF')
            : t('jpp:foodbank_status_inactive_caps', 'TIDAK AKTIF'),
        })
      );
    } catch (err) {
      console.error('Toggle officer error:', err);
      setOfficers((prev) => prev.map((o) => (o.id === officer.id ? { ...o, is_active: newStatus } : o)));
      toast.success(
        t('jpp:foodbank_officer_status_local_msg', '(Mod Tempatan) Status pegawai dikemaskini: {{status}}.', {
          status: newStatus
            ? t('jpp:foodbank_status_active_caps', 'AKTIF')
            : t('jpp:foodbank_status_inactive_caps', 'TIDAK AKTIF'),
        })
      );
    }
  };

  const handleRemoveOfficer = (officer: FoodBankOfficer) => {
    const officerName = officer.user?.full_name || 'Pegawai';
    setConfirmConfig({
      isOpen: true,
      title: t('jpp:foodbank_revoke_officer_title', 'Batalkan Lantikan Pegawai'),
      description: t(
        'kebajikan:confirm_revoke_officer_desc',
        `Adakah anda pasti ingin membatalkan lantikan pegawai "${officerName}"?`,
        { name: officerName }
      ),
      confirmLabel: t('jpp:foodbank_revoke_officer_confirm', 'Batalkan Lantikan'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('foodbank_officers').delete().eq('id', officer.id);
          if (error) throw error;

          try {
            await supabase.from('foodbank_audit_logs').insert({
              actor_id: user?.id,
              actor_name:
                profile?.full_name || t('kebajikan:role_executive_admin_jpp', 'Pentadbir Eksekutif JPP'),
              action_type: 'OFFICER_REMOVED',
              location_id: officer.location_id,
              target_id: officer.user?.matric_no || officer.user?.full_name || officer.id,
              details: {
                officer_id: officer.id,
                officer_name: officerName,
                role_title: officer.role_title,
                location_name:
                  officer.location?.name ||
                  t('jpp:foodbank_all_distribution_centers_floating', 'Semua Pusat Edaran (Floating)'),
              },
            });
          } catch (auditErr) {
            console.warn(t('jpp:foodbank_audit_log_note', 'Nota log audit:'), auditErr);
          }

          setOfficers((prev) => prev.filter((o) => o.id !== officer.id));
          toast.success(
            t('kebajikan:foodbank_officer_revoked_toast', `Lantikan ${officerName} telah dibatalkan.`, {
              name: officerName,
            })
          );
        } catch (err) {
          console.error('Delete officer error:', err);
          setOfficers((prev) => prev.filter((o) => o.id !== officer.id));
          toast.success(
            t(
              'kebajikan:foodbank_officer_revoked_local_toast',
              `(Mod Tempatan) Lantikan ${officerName} telah dibatalkan.`,
              { name: officerName }
            )
          );
        }
      },
    });
  };

  // ── 11. Derived Filtered Lists ───────────────────────────────────────────
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter !== 'SEMUA' && app.status !== statusFilter) return false;
      if (housingFilter !== 'SEMUA' && app.housing_type !== housingFilter) return false;

      if (appSearch.trim()) {
        const q = appSearch.toLowerCase();
        const noMatch = app.application_no.toLowerCase().includes(q);
        const nameMatch = effectiveName(app).toLowerCase().includes(q);
        const idMatch = effectiveMatric(app).toLowerCase().includes(q);
        const reasonMatch = app.reason?.toLowerCase().includes(q);
        const qrMatch = app.pickup_qr_code?.toLowerCase().includes(q);
        if (!noMatch && !nameMatch && !idMatch && !reasonMatch && !qrMatch) return false;
      }
      return true;
    });
  }, [applications, statusFilter, housingFilter, appSearch]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (itemCategoryFilter !== 'SEMUA' && item.category !== itemCategoryFilter) return false;
      if (itemSearch.trim()) {
        const q = itemSearch.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q);
        if (!nameMatch && !descMatch) return false;
      }
      return true;
    });
  }, [items, itemCategoryFilter, itemSearch]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (txFilter !== 'SEMUA' && tx.transaction_type !== txFilter) return false;
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        const descMatch = tx.description.toLowerCase().includes(q);
        const creatorMatch = tx.creator?.full_name?.toLowerCase().includes(q);
        const appMatch = tx.application?.application_no?.toLowerCase().includes(q);
        if (!descMatch && !creatorMatch && !appMatch) return false;
      }
      return true;
    });
  }, [transactions, txFilter, txSearch]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditCategoryFilter !== 'SEMUA' && getActionCategory(log.action_type) !== auditCategoryFilter) {
        return false;
      }
      if (auditLocationFilter !== 'SEMUA' && log.location_id !== auditLocationFilter) {
        return false;
      }
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase();
        const matchActor = log.actor_name?.toLowerCase().includes(q);
        const matchTarget = log.target_id?.toLowerCase().includes(q);
        const matchAction = log.action_type?.toLowerCase().includes(q);
        const matchDetails = log.details ? JSON.stringify(log.details).toLowerCase().includes(q) : false;
        if (!matchActor && !matchTarget && !matchAction && !matchDetails) return false;
      }
      return true;
    });
  }, [auditLogs, auditCategoryFilter, auditLocationFilter, auditSearchQuery]);

  const auditMetrics = useMemo(() => {
    const total = filteredAuditLogs.length;
    const transfers = filteredAuditLogs.filter((l) => l.action_type === 'STOCK_TRANSFER').length;
    const pickups = filteredAuditLogs.filter((l) => l.action_type === 'PICKUP_VERIFIED').length;
    const adminOfficerActions = filteredAuditLogs.filter((l) =>
      [
        'OFFICER_ASSIGNED',
        'OFFICER_REMOVED',
        'SESSION_CONFIG_CHANGED',
        'LOCATION_UPDATED',
        'BUDGET_ADDITION',
      ].includes(l.action_type)
    ).length;

    return { total, transfers, pickups, adminOfficerActions };
  }, [filteredAuditLogs]);

  // ── 12. XLSX Exports ─────────────────────────────────────────────────────
  const handleExportNamesXlsx = async () => {
    const rows: { name: string; matric: string }[] = [];
    for (const app of filteredApplications) {
      rows.push({
        name: effectiveName(app) || '—',
        matric: effectiveMatric(app) || '—',
      });
      if (includeHousemates && app.housemates && app.housemates.length > 0) {
        for (const hm of app.housemates) {
          rows.push({ name: hm.name, matric: hm.ic_or_matric });
        }
      }
    }

    if (rows.length === 0) {
      toast.error(t('jpp:foodbank_no_export_names', 'Tiada nama untuk dieksport.'));
      return;
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const filename = t(
      'kebajikan:export_names_filename',
      `Senarai_Nama_FoodBank_${yyyy}${mm}${dd}.xlsx`,
      { date: `${yyyy}${mm}${dd}` }
    );

    await exportXlsx(filename, [
      {
        name: t('jpp:foodbank_export_names_sheet', 'Senarai Nama'),
        columns: [
          { header: 'Bil.', width: 8 },
          { header: 'Nama', width: 32 },
          { header: t('kebajikan:header_matric_registration_no', 'No Pendaftaran'), width: 18, asText: true },
        ],
        rows: rows.map((r, i) => [i + 1, r.name, r.matric]),
      },
    ]);

    toast.success(
      t('kebajikan:export_names_success_toast', `Berjaya mengeksport ${rows.length} nama.`, {
        count: rows.length,
      })
    );
  };

  const handleExportAuditXlsx = async (logsToExport: FoodBankAuditLog[]) => {
    if (logsToExport.length === 0) {
      toast.error(t('jpp:foodbank_no_audit_to_export', 'Tiada rekod audit untuk dieksport.'));
      return;
    }

    const columns = [
      { header: 'ID', width: 34 },
      { header: t('jpp:foodbank_audit_col_datetime', 'Tarikh & Masa'), width: 20 },
      { header: t('jpp:foodbank_audit_col_officer', 'Pegawai Bertugas'), width: 24 },
      { header: t('jpp:foodbank_audit_col_action_type', 'Jenis Tindakan'), width: 20 },
      { header: t('jpp:foodbank_audit_col_location', 'Lokasi Pusat Edaran'), width: 24 },
      { header: t('jpp:foodbank_audit_col_target', 'Sasaran / Dokumen'), width: 22 },
      { header: t('jpp:foodbank_audit_col_details', 'Butiran Ringkas'), width: 40 },
    ];

    const rows = logsToExport.map((log) => {
      const locName =
        locations.find((l) => l.id === log.location_id)?.name ||
        log.location?.name ||
        t('jpp:foodbank_all_locations', 'Semua Lokasi');
      const actionConfig = getAuditActionConfig(log.action_type, t);

      let detailsSummary = '';
      if (log.details && typeof log.details === 'object') {
        detailsSummary = Object.entries(log.details)
          .filter(([k]) => k !== 'is_offline')
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ');
      }

      return [
        log.id,
        formatAuditDateTime(log.created_at),
        log.actor_name,
        actionConfig.label,
        locName,
        log.target_id || '-',
        detailsSummary || '-',
      ];
    });

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const filename = `Audit_FoodBank_POLISAS_${yyyy}${mm}${dd}.xlsx`;

    await exportXlsx(filename, [
      { name: t('jpp:foodbank_export_audit_sheet', 'Audit Log'), columns, rows },
    ]);

    toast.success(
      t(
        'kebajikan:export_audit_success_toast',
        `Berjaya mengeksport ${logsToExport.length} rekod audit JHEP!`,
        { count: logsToExport.length }
      )
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#F6FBF9] dark:bg-[#090B0E] text-[#0B2420] dark:text-[#F1F5F9] pb-16">
      <FoodBankHeaderKpi
        settings={settings}
        isExecutiveAdmin={isExecutiveAdmin}
        myOfficerRecord={myOfficerRecord}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchAllData(true)}
        onToggleSession={handleToggleSession}
        budgetAllocation={budgetAllocation}
        currentSpent={currentSpent}
        remainingBudget={remainingBudget}
        budgetUsedPercentage={budgetUsedPercentage}
        appMetrics={appMetrics}
        items={items}
        auditLogsCount={auditLogs.length}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onJumpToApplicationStatus={(st) => {
          setActiveTab('applications');
          setStatusFilter(st);
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <AnimatePresence mode="wait">
          {activeTab === 'applications' && (
            <FoodBankApplicationsTab
              counterInput={counterInput}
              onCounterInputChange={setCounterInput}
              isVerifyingCounter={isVerifyingCounter}
              isCameraScanning={isCameraScanning}
              onStartCameraScan={startCameraScan}
              onStopCameraScan={stopCameraScan}
              onLookupOrVerify={handleLookupOrVerify}
              activeScanStudent={activeScanStudent}
              onClearActiveScanStudent={() => setActiveScanStudent(null)}
              onExecuteFulfillment={handleExecuteFulfillment}
              recentVerifiedRecord={recentVerifiedRecord}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              housingFilter={housingFilter}
              onHousingFilterChange={setHousingFilter}
              includeHousemates={includeHousemates}
              onIncludeHousematesChange={setIncludeHousemates}
              appSearch={appSearch}
              onAppSearchChange={setAppSearch}
              onExportNamesXlsx={handleExportNamesXlsx}
              isLoading={isLoading}
              filteredApplications={filteredApplications}
              isProcessingAction={isProcessingAction}
              onViewDetail={setSelectedAppForDetail}
              onApprove={handleApproveApplication}
              onOpenRejectModal={handleOpenRejectionModal}
              onViewQrPass={setSelectedAppForPass}
              onDirectVerifyPickup={handleVerifyCounterPickup}
            />
          )}

          {activeTab === 'inventory' && (
            <FoodBankInventoryTab
              itemCategoryFilter={itemCategoryFilter}
              onItemCategoryFilterChange={setItemCategoryFilter}
              selectedInventoryLocationId={selectedInventoryLocationId}
              onSelectInventoryLocationId={setSelectedInventoryLocationId}
              isExecutiveAdmin={isExecutiveAdmin}
              assignedLocationId={assignedLocationId}
              locations={locations}
              itemSearch={itemSearch}
              onItemSearchChange={setItemSearch}
              inventoryViewMode={inventoryViewMode}
              onInventoryViewModeChange={setInventoryViewMode}
              filteredItems={filteredItems}
              getItemStockForLocation={getItemStockForLocation}
              onOpenTransferModal={handleOpenTransferModal}
              onOpenAddItemModal={handleOpenAddItemModal}
              onOpenEditItemModal={handleOpenEditItemModal}
              onQuickAdjustStock={handleQuickAdjustStock}
              onToggleItemActive={handleToggleItemActive}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {activeTab === 'budget' && isExecutiveAdmin && (
            <FoodBankBudgetTab
              budgetAllocation={budgetAllocation}
              currentSpent={currentSpent}
              remainingBudget={remainingBudget}
              appMetrics={appMetrics}
              txFilter={txFilter}
              onTxFilterChange={setTxFilter}
              txSearch={txSearch}
              onTxSearchChange={setTxSearch}
              filteredTransactions={filteredTransactions}
              onOpenBudgetModal={() => setBudgetModalOpen(true)}
            />
          )}

          {activeTab === 'settings' && isExecutiveAdmin && (
            <FoodBankSettingsTab
              settings={settings}
              onToggleModuleStatus={handleToggleModuleStatus}
              sessionFormData={sessionFormData}
              onSessionFormDataChange={setSessionFormData}
              isSavingSettings={isSavingSettings}
              onSaveSessionSettings={handleSaveSessionSettings}
              locations={locations}
              onOpenAddLocationModal={handleOpenAddLocationModal}
              onOpenEditLocationModal={handleOpenEditLocationModal}
              officers={officers}
              officerSearchQuery={officerSearchQuery}
              onOfficerSearchQueryChange={setOfficerSearchQuery}
              isSearchingCandidate={isSearchingCandidate}
              candidateProfiles={candidateProfiles}
              selectedCandidate={selectedCandidate}
              onSelectCandidate={handleSelectCandidate}
              onClearCandidate={handleClearCandidate}
              officerAssignLocationId={officerAssignLocationId}
              onOfficerAssignLocationIdChange={setOfficerAssignLocationId}
              officerRoleTitle={officerRoleTitle}
              onOfficerRoleTitleChange={setOfficerRoleTitle}
              isAssigningOfficer={isAssigningOfficer}
              onAssignOfficer={handleAssignOfficer}
              onToggleOfficerStatus={handleToggleOfficerStatus}
              onRemoveOfficer={handleRemoveOfficer}
            />
          )}

          {activeTab === 'audit' && (
            <FoodBankAuditTab
              filteredAuditLogs={filteredAuditLogs}
              auditMetrics={auditMetrics}
              auditCategoryFilter={auditCategoryFilter}
              onAuditCategoryFilterChange={setAuditCategoryFilter}
              auditLocationFilter={auditLocationFilter}
              onAuditLocationFilterChange={setAuditLocationFilter}
              auditSearchQuery={auditSearchQuery}
              onAuditSearchQueryChange={setAuditSearchQuery}
              locations={locations}
              onExportAuditXlsx={handleExportAuditXlsx}
            />
          )}
        </AnimatePresence>
      </main>

      <FoodBankModals
        rejectionModalApp={rejectionModalApp}
        rejectionReason={rejectionReason}
        onRejectionReasonChange={setRejectionReason}
        onCloseRejectionModal={() => setRejectionModalApp(null)}
        onConfirmReject={handleConfirmReject}
        isProcessingAction={isProcessingAction}
        selectedAppForDetail={selectedAppForDetail}
        onCloseDetailModal={() => setSelectedAppForDetail(null)}
        itemModalOpen={itemModalOpen}
        editingItem={editingItem}
        itemFormData={itemFormData}
        onItemFormDataChange={setItemFormData}
        imageFile={imageFile}
        onImageFileChange={setImageFile}
        isSavingItem={isSavingItem}
        isUploadingImage={isUploadingImage}
        onCloseItemModal={() => setItemModalOpen(false)}
        onSaveItem={handleSaveItem}
        transferModalOpen={transferModalOpen}
        transferFormData={transferFormData}
        onTransferFormDataChange={setTransferFormData}
        items={items}
        locations={locations}
        getItemStockForLocation={getItemStockForLocation}
        isSubmittingTransfer={isSubmittingTransfer}
        onCloseTransferModal={() => setTransferModalOpen(false)}
        onExecuteStockTransfer={handleExecuteStockTransfer}
        budgetModalOpen={budgetModalOpen}
        budgetFormData={budgetFormData}
        onBudgetFormDataChange={setBudgetFormData}
        isSubmittingBudget={isSubmittingBudget}
        onCloseBudgetModal={() => setBudgetModalOpen(false)}
        onSaveBudgetAdjustment={handleSaveBudgetAdjustment}
        locationModalOpen={locationModalOpen}
        editingLocation={editingLocation}
        locationFormData={locationFormData}
        onLocationFormDataChange={setLocationFormData}
        buildings={buildings}
        isSavingLocation={isSavingLocation}
        onCloseLocationModal={() => setLocationModalOpen(false)}
        onSaveLocation={handleSaveLocation}
      />

      <FoodBankQrPassModal
        open={Boolean(selectedAppForPass)}
        onClose={() => setSelectedAppForPass(null)}
        application={selectedAppForPass}
        studentName={selectedAppForPass ? effectiveName(selectedAppForPass) : undefined}
        studentMatric={selectedAppForPass ? effectiveMatric(selectedAppForPass) : undefined}
        roomOrResidence={
          selectedAppForPass?.housing_type === 'KAMSIS'
            ? t('jpp:foodbank_kamsis_polisas', 'KAMSIS POLISAS')
            : t('jpp:foodbank_offcampus_residence', 'Kediaman Luar')
        }
      />

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((c) => ({ ...c, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmLabel={confirmConfig.confirmLabel}
        variant={confirmConfig.variant}
      />
    </div>
  );
}
