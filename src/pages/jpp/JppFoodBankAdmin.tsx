/**
 * JppFoodBankAdmin.tsx
 * Pusat Kawalan Pentadbir Food Bank JPP HQ (/jpp/foodbank)
 * 
 * Modul ini menyediakan pengurusan penuh program Food Bank JPP untuk mahasiswa POLISAS:
 * 1. Header KPI & Kawalan Sesi: Bajet RM70,000, perbelanjaan, baki, metrik permohonan, suis buka/tutup sesi pantas.
 * 2. Tab 1: Pengurusan Permohonan & Imbasan Kaunter (Pengesahan atomik RPC verify_and_complete_foodbank_pickup).
 * 3. Tab 2: Pengurusan Inventori & Stok Barangan (Katalog, kemas kini stok pantas, muat naik gambar).
 * 4. Tab 3: Penjejakan Bajet & Lejar Audit RM70k (foodbank_budget_transactions).
 * 5. Tab 4: Tetapan Sesi & Lokasi Pengagihan (Formula kuota, hebahan, lokasi berintegrasi PolyMaps 360).
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartHandshake,
  ShoppingBag,
  Boxes,
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  QrCode,
  DollarSign,
  TrendingDown,
  Calendar,
  MapPin,
  User,
  Users,
  Edit2,
  Trash2,
  ExternalLink,
  RefreshCw,
  Sliders,
  Receipt,
  ShieldCheck,
  Check,
  X,
  ChevronRight,
  Eye,
  Save,
  Upload,
  AlertTriangle,
  Layers,
  Sparkles,
  Phone,
  Building,
  Home,
  FileText,
  CreditCard,
  ArrowUpRight,
  CheckCircle,
  Lock,
  ArrowLeftRight,
  UserPlus,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFileToDrive } from '@/lib/driveUpload';
import {
  FoodBankSettings,
  FoodBankItem,
  FoodBankDistributionLocation,
  FoodBankApplication,
  FoodBankBudgetTransaction,
  PolyMapsBuildingWith360,
  FoodBankLocationStock,
  FoodBankOfficer,
} from '@/types';
import { FoodBankQrPassModal } from '@/components/foodbank/FoodBankQrPassModal';
import { Link } from 'react-router-dom';
import { getBuilding360Url } from '@/lib/polymaps360Data';
import {
  DEFAULT_FOODBANK_SETTINGS,
  DEFAULT_FOODBANK_ITEMS,
  DEFAULT_FOODBANK_LOCATIONS,
  loadLocalFoodBankSettings,
  saveLocalFoodBankSettings,
  FOODBANK_CATEGORY_CONFIG,
  getFoodBankStockBadge,
  generateDefaultFoodBankLocationStocks,
  DEFAULT_FOODBANK_LOCATION_STOCKS,
  DEFAULT_FOODBANK_OFFICERS,
} from '@/lib/foodbankDefaults';

// Baseline rasmi peruntukan Tabung Food Bank JPP
const OFFICIAL_BASELINE_BUDGET = 70000.0;

type AdminTab = 'applications' | 'inventory' | 'budget' | 'settings';

export function JppFoodBankAdmin() {
  const { user, profile, isSuperAdmin } = useAuth();

  // ── States Utama ──────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<FoodBankSettings | null>(null);
  const [applications, setApplications] = useState<FoodBankApplication[]>([]);
  const [items, setItems] = useState<FoodBankItem[]>([]);
  const [transactions, setTransactions] = useState<FoodBankBudgetTransaction[]>([]);
  const [locations, setLocations] = useState<FoodBankDistributionLocation[]>([]);
  const [buildings, setBuildings] = useState<PolyMapsBuildingWith360[]>([]);

  // ── Pengurusan Pegawai Bertugas & RBAC ──────────────────────────────────────
  const [officers, setOfficers] = useState<FoodBankOfficer[]>([]);
  const [officerSearchQuery, setOfficerSearchQuery] = useState('');
  const [candidateProfiles, setCandidateProfiles] = useState<any[]>([]);
  const [isSearchingCandidate, setIsSearchingCandidate] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [officerAssignLocationId, setOfficerAssignLocationId] = useState('');
  const [officerRoleTitle, setOfficerRoleTitle] = useState('Petugas Kaunter Food Bank');
  const [isAssigningOfficer, setIsAssigningOfficer] = useState(false);

  // ── Kawalan Akses Berasaskan Peranan (RBAC Gating) ─────────────────────────
  const isExecutiveAdmin = Boolean(
    isSuperAdmin || 
    profile?.role === 'SUPER_ADMIN_JPP' || 
    profile?.role === 'ADMIN' || 
    profile?.jpp_position === 'YDP' || 
    profile?.jpp_unit === 'KEBAJIKAN'
  );

  const myOfficerRecord = useMemo(() => {
    if (!user?.id) return null;
    return officers.find(o => o.user_id === user.id && o.is_active);
  }, [officers, user?.id]);

  const isAssignedOfficer = Boolean(myOfficerRecord);
  const assignedLocationId = myOfficerRecord?.location_id || null;

  // Kunci tab untuk bukan pentadbir eksekutif (Tab 3 & 4 hanya untuk eksekutif)
  useEffect(() => {
    if (!isExecutiveAdmin && (activeTab === 'budget' || activeTab === 'settings')) {
      setActiveTab('applications');
    }
  }, [isExecutiveAdmin, activeTab]);

  // Kunci atau pilihkan secara lalai lokasi jagaan pegawai dalam Tab Inventori
  useEffect(() => {
    if (!isExecutiveAdmin && assignedLocationId) {
      setSelectedInventoryLocationId(assignedLocationId);
    }
  }, [isExecutiveAdmin, assignedLocationId]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('applications');

  // ── Tab 1: Permohonan & Kaunter ───────────────────────────────────────────
  const [appSearch, setAppSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'MENUNGGU' | 'LULUS' | 'SELESAI' | 'DITOLAK'>('SEMUA');
  const [housingFilter, setHousingFilter] = useState<string>('SEMUA');
  const [selectedAppForDetail, setSelectedAppForDetail] = useState<FoodBankApplication | null>(null);
  const [selectedAppForPass, setSelectedAppForPass] = useState<FoodBankApplication | null>(null);
  const [rejectionModalApp, setRejectionModalApp] = useState<FoodBankApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Kaunter Imbasan Segera (QR / No Matrik)
  const [counterInput, setCounterInput] = useState('');
  const [isVerifyingCounter, setIsVerifyingCounter] = useState(false);
  const [recentVerifiedRecord, setRecentVerifiedRecord] = useState<{
    appNo: string;
    studentName: string;
    matricNo?: string;
    itemsCount: number;
    totalValue: number;
    timestamp: string;
  } | null>(null);

  // ── Tab 2: Inventori & Stok ───────────────────────────────────────────────
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('SEMUA');
  const [selectedInventoryLocationId, setSelectedInventoryLocationId] = useState<string>('SEMUA');
  const [locationStocks, setLocationStocks] = useState<FoodBankLocationStock[]>([]);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodBankItem | null>(null);
  const [itemFormData, setItemFormData] = useState({
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

  // Modal Pindahan Stok Antara Lokasi
  const [transferModalOpen, setTransferModalOpen] = useState<boolean>(false);
  const [transferFormData, setTransferFormData] = useState({
    item_id: '',
    from_location_id: '',
    to_location_id: '',
    quantity: 1,
    notes: '',
  });
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState<boolean>(false);

  // ── Tab 3: Bajet & Lejar ──────────────────────────────────────────────────
  const [txFilter, setTxFilter] = useState<string>('SEMUA');
  const [txSearch, setTxSearch] = useState('');
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetFormData, setBudgetFormData] = useState({
    transaction_type: 'BUDGET_ADDITION' as 'BUDGET_ADDITION' | 'ADJUSTMENT',
    amount: 1000,
    description: '',
  });
  const [isSubmittingBudget, setIsSubmittingBudget] = useState(false);

  // ── Tab 4: Tetapan Sesi & Lokasi ──────────────────────────────────────────
  const [sessionFormData, setSessionFormData] = useState({
    max_monthly_applications_per_student: 1,
    max_items_per_application: 5,
    application_instructions: '',
    eligibility_criteria: '',
    total_budget: OFFICIAL_BASELINE_BUDGET,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<FoodBankDistributionLocation | null>(null);
  const [locationFormData, setLocationFormData] = useState({
    name: '',
    polymaps_building_id: '',
    room_detail: '',
    operating_hours: 'Isnin - Khamis: 10:00 AM - 4:00 PM',
    contact_person: 'Exco Kebajikan JPP',
    contact_phone: '',
    is_active: true,
  });
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  // ── 1. Muat Turun Semua Data (Promise.all - Non-Negotiable) ───────────────
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
      ] = await Promise.all([
        supabase
          .from('foodbank_settings')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('foodbank_applications')
          .select(`
            *,
            applicant:profiles!applicant_id(id, full_name, email, student_id, phone_number),
            location:foodbank_distribution_locations!location_id(
              id, name, room_detail, operating_hours, polymaps_building_id,
              building:imaps_buildings(id, name, code, panorama_360_url)
            ),
            verifier:profiles!pickup_verified_by(id, full_name),
            reviewer:profiles!reviewed_by(id, full_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('foodbank_items')
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('foodbank_budget_transactions')
          .select(`
            *,
            creator:profiles!created_by(id, full_name),
            application:foodbank_applications!application_id(id, application_no, total_estimated_value)
          `)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('foodbank_distribution_locations')
          .select(`
            *,
            building:imaps_buildings(id, name, code)
          `)
          .order('name', { ascending: true }),
        supabase
          .from('imaps_buildings')
          .select('id, name, code, description')
          .order('name', { ascending: true }),
        supabase
          .from('foodbank_location_stocks')
          .select('*'),
        supabase
          .from('foodbank_officers')
          .select(`
            *,
            profile:profiles!user_id(id, full_name, email, student_id, phone_number, department, avatar_url),
            location:foodbank_distribution_locations!location_id(id, name),
            assigner:profiles!assigned_by(id, full_name)
          `)
          .order('created_at', { ascending: false }),
      ]);

      if (settingsRes.error) console.error('Error fetching settings:', settingsRes.error);
      if (appsRes.error) console.error('Error fetching applications:', appsRes.error);
      if (itemsRes.error) console.error('Error fetching items:', itemsRes.error);
      if (txRes.error) console.error('Error fetching transactions:', txRes.error);
      if (locationsRes.error) console.error('Error fetching locations:', locationsRes.error);
      if (buildingsRes.error) console.error('Error fetching buildings:', buildingsRes.error);
      if (locStocksRes.error) console.warn('Note/Error fetching location stocks (fallback used):', locStocksRes.error);
      if (officersRes.error) console.warn('Note/Error fetching foodbank officers (fallback used):', officersRes.error);

      const finalSettings = (settingsRes.data as FoodBankSettings) || loadLocalFoodBankSettings();
      setSettings(finalSettings);
      setSessionFormData({
        max_monthly_applications_per_student: finalSettings.max_monthly_applications_per_student || 1,
        max_items_per_application: finalSettings.max_items_per_application || 5,
        application_instructions: finalSettings.application_instructions || '',
        eligibility_criteria: finalSettings.eligibility_criteria || '',
        total_budget: finalSettings.total_budget || OFFICIAL_BASELINE_BUDGET,
      });

      if (appsRes.data) setApplications(appsRes.data as FoodBankApplication[]);
      
      const finalItems = (itemsRes.data && itemsRes.data.length > 0)
        ? (itemsRes.data as FoodBankItem[])
        : DEFAULT_FOODBANK_ITEMS;
      setItems(finalItems);

      if (txRes.data) setTransactions(txRes.data as FoodBankBudgetTransaction[]);

      const rawLocations = (locationsRes.data && locationsRes.data.length > 0)
        ? locationsRes.data
        : DEFAULT_FOODBANK_LOCATIONS;
      const enhancedLocations = (rawLocations as FoodBankDistributionLocation[]).map((loc) => {
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

      const finalLocationStocks = (locStocksRes.data && locStocksRes.data.length > 0)
        ? (locStocksRes.data as FoodBankLocationStock[])
        : generateDefaultFoodBankLocationStocks(finalItems, enhancedLocations);
      setLocationStocks(finalLocationStocks);

      const enhancedBuildings = ((buildingsRes.data || []) as any[]).map((b) => ({
        ...b,
        panorama_360_url: b.panorama_360_url || getBuilding360Url(b),
      })) as PolyMapsBuildingWith360[];
      setBuildings(enhancedBuildings);

      const finalOfficers = (officersRes.data && officersRes.data.length > 0)
        ? (officersRes.data as any[]).map((o: any) => ({
            ...o,
            user: o.user || o.profile || null,
          })) as FoodBankOfficer[]
        : DEFAULT_FOODBANK_OFFICERS;
      setOfficers(finalOfficers);
    } catch (err: any) {
      console.error('Fatal load error:', err);
      toast.error('Ralat ketika memuat turun data Food Bank.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── 2. Metrik & Pengiraan Bajet ──────────────────────────────────────────
  const budgetAllocation = settings?.total_budget ?? OFFICIAL_BASELINE_BUDGET;
  const currentSpent = settings?.current_spent ?? 0;
  const remainingBudget = Math.max(0, budgetAllocation - currentSpent);
  const budgetUsedPercentage = budgetAllocation > 0 
    ? Math.min(100, Math.max(0, (currentSpent / budgetAllocation) * 100)) 
    : 0;

  const appMetrics = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let completed = 0;
    let rejected = 0;
    let totalItemsDistributed = 0;

    applications.forEach(app => {
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

  // ── 3. Tindakan: Suis Pantas Buka / Tutup Sesi Permohonan ──────────────────
  const handleToggleSession = async () => {
    const currentStatus = settings?.is_application_open ?? false;
    const newStatus = !currentStatus;

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

        if (error) {
          console.warn('DB update error for foodbank_settings (session):', error);
        }
      }
    } catch (err: any) {
      console.warn('Session toggle database error, fallback to local persistence:', err);
    }

    saveLocalFoodBankSettings({ is_application_open: newStatus });
    setSettings(prev => prev ? ({ ...prev, is_application_open: newStatus } as FoodBankSettings) : ({ ...loadLocalFoodBankSettings(), is_application_open: newStatus } as FoodBankSettings));
    if (newStatus) {
      toast.success('Pintu permohonan Food Bank dibuka kepada mahasiswa! 🟢');
    } else {
      toast('Permohonan Food Bank ditutup buat sementara waktu.', { icon: '🔒' });
    }
  };

  // Suis Induk Modul Food Bank (Akses Pelajar)
  const handleToggleModuleStatus = async () => {
    const currentStatus = settings?.is_module_active ?? false;
    const newStatus = !currentStatus;

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

        if (error) {
          console.warn('DB update error for foodbank_settings (module):', error);
        }
      }
    } catch (err: any) {
      console.warn('Module toggle database error, fallback to local persistence:', err);
    }

    saveLocalFoodBankSettings({ is_module_active: newStatus });
    setSettings(prev => prev ? ({ ...prev, is_module_active: newStatus } as FoodBankSettings) : ({ ...loadLocalFoodBankSettings(), is_module_active: newStatus } as FoodBankSettings));
    if (newStatus) {
      toast.success('Modul Food Bank kini RASMI DIBUKA & aktif di portal Kebajikan mahasiswa! 🟢');
    } else {
      toast('Modul Food Bank kini DALAM PERSEDIAAN (Tutup untuk permohonan mahasiswa).', { icon: '🛡️' });
    }
  };

  // ── 4. Imbasan Kaunter & Pengesahan Atomik (verify_and_complete_foodbank_pickup) ──
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#be123c', '#e11d48', '#10b981', '#f59e0b', '#3b82f6'],
      });
    } catch {
      // ignore
    }
  };

  const handleVerifyCounterPickup = async (overrideQuery?: string) => {
    const query = (overrideQuery || counterInput).trim();
    if (!query) {
      toast.error('Sila imbas kod QR atau masukkan No. Matrik / No. Permohonan.');
      return;
    }
    if (!user?.id) {
      toast.error('Sesi pegawai tidak sah.');
      return;
    }

    setIsVerifyingCounter(true);
    try {
      // 1. Semak jika input adalah Kod QR langsung (FB-...)
      let targetApp = applications.find(
        a => a.pickup_qr_code?.toLowerCase() === query.toLowerCase() || a.id === query
      );

      // 2. Jika tidak dijumpai sebagai QR langsung, cuba padankan No. Matrik atau No. Permohonan
      if (!targetApp) {
        targetApp = applications.find(
          a =>
            a.application_no?.toLowerCase() === query.toLowerCase() ||
            a.applicant?.student_id?.toLowerCase() === query.toLowerCase() ||
            a.applicant?.full_name?.toLowerCase().includes(query.toLowerCase())
        );
      }

      let rpcResult: any = null;

      // Panggil RPC secara atomik:
      if (targetApp) {
        if (targetApp.status === 'SELESAI') {
          toast.error(`Permohonan ${targetApp.application_no} telah pun selesai diambil sebelum ini.`);
          setIsVerifyingCounter(false);
          return;
        }
        if (targetApp.status !== 'LULUS') {
          toast.error(
            `Permohonan ini berstatus "${targetApp.status}". Hanya permohonan LULUS dibenarkan untuk agihan fizikal.`
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
        // Cuba panggil secara langsung melalui verify_and_complete_foodbank_pickup_by_qr
        const { data, error } = await supabase.rpc('verify_and_complete_foodbank_pickup_by_qr', {
          p_qr_code: query,
          p_verifier_id: user.id,
        });

        if (error) throw error;
        rpcResult = data;
      }

      if (rpcResult && rpcResult.success) {
        triggerCelebration();
        toast.success(
          `Pengesahan Berjaya! Barangan telah diserahkan untuk permohonan ${rpcResult.application_no || ''}.`,
          { duration: 5000 }
        );

        // Rekod ringkasan pengesahan terkini
        const matched = targetApp || applications.find(a => a.id === rpcResult.application_id);
        setRecentVerifiedRecord({
          appNo: rpcResult.application_no || matched?.application_no || query,
          studentName: matched?.applicant?.full_name || 'Mahasiswa POLISAS',
          matricNo: matched?.applicant?.student_id || undefined,
          itemsCount: matched?.selected_items?.length || 0,
          totalValue: Number(rpcResult.total_value || matched?.total_estimated_value || 0),
          timestamp: new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }),
        });

        setCounterInput('');
        // Muat semula data di latar belakang
        fetchAllData(true);
      } else {
        toast.error(rpcResult?.message || 'Pengesahan gagal diselesaikan.');
      }
    } catch (err: any) {
      console.error('Counter verify error:', err);
      toast.error('Ralat pengesahan kaunter: ' + (err.message || 'Sila semak baki stok barangan.'));
    } finally {
      setIsVerifyingCounter(false);
    }
  };

  // ── 5. Tindakan Pegawai: Luluskan & Tolak Permohonan ───────────────────────
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

      toast.success(`Permohonan ${app.application_no} berjaya DILULUSKAN! Pas QR sedia.`);
      fetchAllData(true);
    } catch (err: any) {
      console.error('Approve error:', err);
      toast.error('Gagal meluluskan: ' + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenRejectionModal = (app: FoodBankApplication) => {
    setRejectionModalApp(app);
    setRejectionReason('Maklumat pendapatan / kelayakan tidak memenuhi syarat semasa.');
  };

  const handleConfirmReject = async () => {
    if (!rejectionModalApp || !user?.id) return;
    if (!rejectionReason.trim()) {
      toast.error('Sila nyatakan sebab penolakan.');
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

      toast.success(`Permohonan ${rejectionModalApp.application_no} telah DITOLAK.`);
      setRejectionModalApp(null);
      setRejectionReason('');
      fetchAllData(true);
    } catch (err: any) {
      console.error('Reject error:', err);
      toast.error('Gagal menolak permohonan: ' + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // ── 6. Tindakan Inventori: Tambah / Sunting / Kemas Kini Stok Pantas ───────
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
      toast.error('Sila masukkan nama item.');
      return;
    }

    setIsSavingItem(true);
    try {
      let finalImageUrl = itemFormData.image_url;

      // Muat naik fail gambar jika pengguna memilih fail baharu
      if (imageFile) {
        setIsUploadingImage(true);
        try {
          finalImageUrl = await uploadFileToDrive(imageFile, 'foodbank', `item_${Date.now()}`);
        } catch (uploadErr) {
          console.warn('Upload via uploadFileToDrive failed, trying direct storage...', uploadErr);
          // Fallback direct storage
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
        toast.success(`Item "${payload.name}" berjaya dikemas kini!`);
      } else {
        const { error } = await supabase.from('foodbank_items').insert([payload]);
        if (error) throw error;
        toast.success(`Item baharu "${payload.name}" berjaya ditambah!`);
      }

      setItemModalOpen(false);
      fetchAllData(true);
    } catch (err: any) {
      console.error('Save item error:', err);
      toast.error('Gagal menyimpan item: ' + err.message);
    } finally {
      setIsSavingItem(false);
    }
  };

  // ── Kiraan Baki Stok Mengikut Lokasi Fizikal ──────────────────────────────
  const getItemStockForLocation = useCallback((itemId: string, locationId: string): number => {
    if (locationId === 'SEMUA') {
      const matching = locationStocks.filter(ls => ls.item_id === itemId);
      if (matching.length > 0) {
        return matching.reduce((acc, curr) => acc + curr.current_stock, 0);
      }
      const found = items.find(i => i.id === itemId);
      return found?.current_stock ?? 0;
    }
    const locStock = locationStocks.find(
      ls => ls.item_id === itemId && ls.location_id === locationId
    );
    return locStock ? locStock.current_stock : 0;
  }, [locationStocks, items]);

  // ── Kemas Kini Cepat Stok (Menyokong Lokasi Khusus / Agregat) ───────────────
  const handleQuickAdjustStock = async (item: FoodBankItem, delta: number) => {
    if (selectedInventoryLocationId === 'SEMUA') {
      const newStock = Math.max(0, item.current_stock + delta);
      try {
        const { error } = await supabase
          .from('foodbank_items')
          .update({
            current_stock: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (error) throw error;

        // Optimistic update
        setItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, current_stock: newStock } : i))
        );
        toast.success(`Stok agregat ${item.name}: ${item.current_stock} → ${newStock} ${item.unit}`);
      } catch (err: any) {
        console.error('Stock adjust error:', err);
        // Fallback tempatan
        setItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, current_stock: newStock } : i))
        );
        toast.success(`(Mod Luar Talian) Stok ${item.name}: ${newStock} ${item.unit}`);
      }
    } else {
      // Pelarasan stok khusus mengikut lokasi yang dipilih
      const currentLocStock = getItemStockForLocation(item.id, selectedInventoryLocationId);
      const newLocStock = Math.max(0, currentLocStock + delta);
      const targetLoc = locations.find(l => l.id === selectedInventoryLocationId);
      const locName = targetLoc?.name || 'Pusat Edaran';

      try {
        const { error } = await supabase
          .from('foodbank_location_stocks')
          .upsert(
            {
              item_id: item.id,
              location_id: selectedInventoryLocationId,
              current_stock: newLocStock,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'item_id,location_id' }
          );

        if (error) throw error;

        // Rekod audit log jika berjaya
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
        } catch (e) {
          // Abaikan sekiranya jadual audit belum sedia
        }

        // Kemas kini state tempatan baki lokasi
        setLocationStocks(prev => {
          const exists = prev.some(
            ls => ls.item_id === item.id && ls.location_id === selectedInventoryLocationId
          );
          if (exists) {
            return prev.map(ls =>
              ls.item_id === item.id && ls.location_id === selectedInventoryLocationId
                ? { ...ls, current_stock: newLocStock, updated_at: new Date().toISOString() }
                : ls
            );
          } else {
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
          }
        });

        // Selaraskan juga jumlah stok agregat item
        setItems(prev =>
          prev.map(i => {
            if (i.id !== item.id) return i;
            const diff = newLocStock - currentLocStock;
            return { ...i, current_stock: Math.max(0, i.current_stock + diff) };
          })
        );

        toast.success(`Stok ${item.name} di ${locName}: ${currentLocStock} → ${newLocStock} ${item.unit}`);
      } catch (err: any) {
        console.error('Location stock adjust error:', err);
        // Fallback optimistic tempatan
        setLocationStocks(prev => {
          const exists = prev.some(
            ls => ls.item_id === item.id && ls.location_id === selectedInventoryLocationId
          );
          if (exists) {
            return prev.map(ls =>
              ls.item_id === item.id && ls.location_id === selectedInventoryLocationId
                ? { ...ls, current_stock: newLocStock }
                : ls
            );
          } else {
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
          }
        });
        toast.success(`(Mod Luar Talian) Stok ${item.name} di ${locName}: ${newLocStock} ${item.unit}`);
      }
    }
  };

  // ── Laksanakan Pindahan Stok Antara Lokasi Fizikal (RPC) ────────────────────
  const handleExecuteStockTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFormData.item_id || !transferFormData.from_location_id || !transferFormData.to_location_id) {
      toast.error('Sila lengkapkan semua medan lokasi dan barangan.');
      return;
    }
    if (transferFormData.from_location_id === transferFormData.to_location_id) {
      toast.error('Lokasi sumber dan destinasi tidak boleh sama.');
      return;
    }
    const sourceStock = getItemStockForLocation(transferFormData.item_id, transferFormData.from_location_id);
    const qty = Number(transferFormData.quantity);
    if (qty <= 0) {
      toast.error('Kuantiti pindahan mestilah sekurang-kurangnya 1.');
      return;
    }
    if (qty > sourceStock) {
      toast.error(`Baki stok tidak mencukupi di lokasi sumber (Baki semasa: ${sourceStock}).`);
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const { data, error } = await supabase.rpc('transfer_foodbank_stock', {
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
        toast.error((data as any).message || 'Gagal memindahkan stok.');
        return;
      }

      toast.success((data as any)?.message || 'Pindahan stok berjaya direkodkan!');
      setTransferModalOpen(false);
      setTransferFormData({
        item_id: '',
        from_location_id: '',
        to_location_id: '',
        quantity: 1,
        notes: '',
      });
      await fetchAllData(true);
    } catch (err: any) {
      console.warn('RPC transfer_foodbank_stock fallback to local updates:', err);
      // Fallback: update local locationStocks
      setLocationStocks(prev => {
        let foundDest = false;
        const updated = prev.map(ls => {
          if (ls.item_id === transferFormData.item_id && ls.location_id === transferFormData.from_location_id) {
            return { ...ls, current_stock: Math.max(0, ls.current_stock - qty), updated_at: new Date().toISOString() };
          }
          if (ls.item_id === transferFormData.item_id && ls.location_id === transferFormData.to_location_id) {
            foundDest = true;
            return { ...ls, current_stock: ls.current_stock + qty, updated_at: new Date().toISOString() };
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

      // Local audit log entry if table is available
      try {
        const itemObj = items.find(i => i.id === transferFormData.item_id);
        const fromLocObj = locations.find(l => l.id === transferFormData.from_location_id);
        const toLocObj = locations.find(l => l.id === transferFormData.to_location_id);
        await supabase.from('foodbank_audit_logs').insert({
          actor_id: user?.id,
          actor_name: profile?.full_name || 'Pegawai JPP',
          action_type: 'STOCK_TRANSFER',
          location_id: transferFormData.to_location_id,
          target_id: itemObj?.name || 'Barangan Food Bank',
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
      } catch (e) {
        // silent catch
      }

      toast.success('Pindahan stok berjaya (Mod Tempatan)!');
      setTransferModalOpen(false);
      setTransferFormData({
        item_id: '',
        from_location_id: '',
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
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (error) throw error;

      setItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, is_active: newStatus } : i))
      );
      toast.success(`Item ${item.name} kini ${newStatus ? 'AKTIF' : 'TIDAK AKTIF'}.`);
    } catch (err: any) {
      console.error('Toggle active error:', err);
      toast.error('Gagal menukar status: ' + err.message);
    }
  };

  const handleDeleteItem = async (item: FoodBankItem) => {
    if (!window.confirm(`Adakah anda pasti ingin memadam item "${item.name}" daripada katalog?`)) {
      return;
    }
    try {
      const { error } = await supabase.from('foodbank_items').delete().eq('id', item.id);
      if (error) throw error;
      toast.success(`Item "${item.name}" telah dipadam.`);
      fetchAllData(true);
    } catch (err: any) {
      console.error('Delete item error:', err);
      toast.error('Gagal memadam item (mungkin terdapat rekod permohonan berkaitan).');
    }
  };

  // ── 7. Tindakan Bajet: Suntikan & Pelarasan ────────────────────────────────
  const handleSaveBudgetAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (budgetFormData.amount <= 0) {
      toast.error('Sila masukkan amaun melebihi RM0.');
      return;
    }
    if (!budgetFormData.description.trim()) {
      toast.error('Sila nyatakan sebab / perihal pelarasan.');
      return;
    }

    setIsSubmittingBudget(true);
    try {
      // 1. Rekod transaksi dalam foodbank_budget_transactions
      const { error: txError } = await supabase.from('foodbank_budget_transactions').insert([
        {
          transaction_type: budgetFormData.transaction_type,
          amount: budgetFormData.amount,
          description: budgetFormData.description.trim(),
          created_by: user.id,
        },
      ]);
      if (txError) throw txError;

      // 2. Kemas kini settings bajet jika jenis BUDGET_ADDITION
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

      toast.success('Pelarasan bajet berjaya direkodkan ke lejar audit!');
      setBudgetModalOpen(false);
      setBudgetFormData({
        transaction_type: 'BUDGET_ADDITION',
        amount: 1000,
        description: '',
      });
      fetchAllData(true);
    } catch (err: any) {
      console.error('Budget adjustment error:', err);
      toast.error('Gagal merekod bajet: ' + err.message);
    } finally {
      setIsSubmittingBudget(false);
    }
  };

  // ── 8. Tindakan Tetapan Sesi & Formula Kuota ──────────────────────────────
  const handleSaveSessionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSavingSettings(true);
    const updatedPayload: Partial<FoodBankSettings> = {
      max_monthly_applications_per_student: Math.max(1, sessionFormData.max_monthly_applications_per_student),
      max_items_per_application: Math.max(1, sessionFormData.max_items_per_application),
      application_instructions: sessionFormData.application_instructions.trim(),
      eligibility_criteria: sessionFormData.eligibility_criteria.trim(),
      total_budget: Math.max(100, sessionFormData.total_budget),
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

        if (error) {
          console.warn('DB update error for session settings:', error);
        }
      }
    } catch (err: any) {
      console.warn('Save settings database error, saving to local state:', err);
    }

    saveLocalFoodBankSettings(updatedPayload);
    setSettings(prev => prev ? ({ ...prev, ...updatedPayload } as FoodBankSettings) : ({ ...loadLocalFoodBankSettings(), ...updatedPayload } as FoodBankSettings));
    toast.success('Tetapan sesi & formula kuota berjaya disimpan! ⚙️');
    setIsSavingSettings(false);
  };

  // ── 9. Tindakan Lokasi Pengagihan (CRUD) ───────────────────────────────────
  const handleOpenAddLocationModal = () => {
    setEditingLocation(null);
    setLocationFormData({
      name: '',
      polymaps_building_id: buildings[0]?.id || '',
      room_detail: '',
      operating_hours: 'Isnin - Khamis: 10:00 AM - 4:00 PM',
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
      contact_person: loc.contact_person || 'Exco Kebajikan JPP',
      contact_phone: loc.contact_phone || '',
      is_active: loc.is_active,
    });
    setLocationModalOpen(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationFormData.name.trim()) {
      toast.error('Sila masukkan nama pusat lokasi.');
      return;
    }

    setIsSavingLocation(true);
    try {
      const payload = {
        name: locationFormData.name.trim(),
        polymaps_building_id: locationFormData.polymaps_building_id || null,
        room_detail: locationFormData.room_detail.trim() || null,
        operating_hours: locationFormData.operating_hours.trim(),
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
        toast.success(`Lokasi "${payload.name}" berjaya dikemas kini!`);
      } else {
        const { error } = await supabase
          .from('foodbank_distribution_locations')
          .insert([payload]);
        if (error) throw error;
        toast.success(`Lokasi baharu "${payload.name}" berjaya didaftarkan!`);
      }

      setLocationModalOpen(false);
      fetchAllData(true);
    } catch (err: any) {
      console.error('Save location error:', err);
      toast.error('Gagal menyimpan lokasi: ' + err.message);
    } finally {
      setIsSavingLocation(false);
    }
  };

  // ── 10. Tindakan: Carian & Pelantikan Pegawai Bertugas Kaunter ──────────────────
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
          .select('id, full_name, email, student_id, phone_number, department, avatar_url')
          .or(`student_id.ilike.%${q}%,full_name.ilike.%${q}%`)
          .limit(8);

        if (error) {
          console.warn('Profiles search error:', error);
        }
        setCandidateProfiles(data || []);
      } catch (err: any) {
        console.warn('Candidate search error:', err);
      } finally {
        setIsSearchingCandidate(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [officerSearchQuery, selectedCandidate]);

  const handleSelectCandidate = (candidate: any) => {
    setSelectedCandidate(candidate);
    setOfficerSearchQuery(`${candidate.full_name} (${candidate.student_id || candidate.email || 'POLISAS'})`);
    setCandidateProfiles([]);
  };

  const handleClearCandidate = () => {
    setSelectedCandidate(null);
    setOfficerSearchQuery('');
    setCandidateProfiles([]);
  };

  const handleAssignOfficer = async () => {
    if (!selectedCandidate) {
      toast.error('Sila pilih calon pegawai daripada carian No. Matrik / Nama.');
      return;
    }
    if (!officerRoleTitle.trim()) {
      toast.error('Sila nyatakan gelaran peranan pegawai.');
      return;
    }

    const locId = officerAssignLocationId ? officerAssignLocationId : null;

    // Semak jika calon sudah pun dilantik bagi lokasi tersebut
    const alreadyAssigned = officers.some(
      o => o.user_id === selectedCandidate.id && (o.location_id || null) === locId
    );
    if (alreadyAssigned) {
      toast.error('Pegawai ini sudah pun dilantik bagi lokasi tersebut.');
      return;
    }

    setIsAssigningOfficer(true);
    const assignedLocName = locId
      ? locations.find(l => l.id === locId)?.name || 'Pusat Edaran Khusus'
      : 'Semua Pusat Edaran (Floating)';

    try {
      const { data, error } = await supabase
        .from('foodbank_officers')
        .insert({
          user_id: selectedCandidate.id,
          location_id: locId,
          role_title: officerRoleTitle.trim(),
          is_active: true,
          assigned_by: user?.id || null,
        })
        .select(`
          *,
          profile:profiles!user_id(id, full_name, email, student_id, phone_number, department, avatar_url),
          location:foodbank_distribution_locations!location_id(id, name),
          assigner:profiles!assigned_by(id, full_name)
        `)
        .single();

      if (error) throw error;

      // Log audit action
      try {
        await supabase.from('foodbank_audit_logs').insert({
          actor_id: user?.id,
          actor_name: profile?.full_name || 'Pentadbir Eksekutif JPP',
          action_type: 'OFFICER_ASSIGNED',
          location_id: locId,
          target_id: selectedCandidate.student_id || selectedCandidate.full_name,
          details: {
            officer_user_id: selectedCandidate.id,
            officer_name: selectedCandidate.full_name,
            matric_no: selectedCandidate.student_id,
            role_title: officerRoleTitle.trim(),
            assigned_location: assignedLocName,
          },
        });
      } catch (auditErr) {
        console.warn('Audit log insert note:', auditErr);
      }

      toast.success(`Berjaya melantik ${selectedCandidate.full_name} sebagai ${officerRoleTitle.trim()}! 🎉`);
      handleClearCandidate();
      setOfficerAssignLocationId('');
      setOfficerRoleTitle('Petugas Kaunter Food Bank');
      await fetchAllData(true);
    } catch (err: any) {
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
          student_id: selectedCandidate.student_id,
          phone_number: selectedCandidate.phone_number,
          avatar_url: selectedCandidate.avatar_url,
        },
        location: locations.find(l => l.id === locId) || null,
      };
      setOfficers(prev => [newOfficer, ...prev]);

      try {
        await supabase.from('foodbank_audit_logs').insert({
          actor_id: user?.id,
          actor_name: profile?.full_name || 'Pentadbir Eksekutif JPP',
          action_type: 'OFFICER_ASSIGNED',
          location_id: locId,
          target_id: selectedCandidate.student_id || selectedCandidate.full_name,
          details: {
            officer_user_id: selectedCandidate.id,
            officer_name: selectedCandidate.full_name,
            matric_no: selectedCandidate.student_id,
            role_title: officerRoleTitle.trim(),
            assigned_location: assignedLocName,
            is_offline: true,
          },
        });
      } catch (e) {
        // silent
      }

      toast.success(`(Mod Tempatan) Berjaya melantik ${selectedCandidate.full_name}! 🎉`);
      handleClearCandidate();
      setOfficerAssignLocationId('');
      setOfficerRoleTitle('Petugas Kaunter Food Bank');
    } finally {
      setIsAssigningOfficer(false);
    }
  };

  const handleToggleOfficerStatus = async (officer: FoodBankOfficer) => {
    const newStatus = !officer.is_active;
    try {
      const { error } = await supabase
        .from('foodbank_officers')
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', officer.id);

      if (error) throw error;

      setOfficers(prev =>
        prev.map(o => (o.id === officer.id ? { ...o, is_active: newStatus } : o))
      );

      try {
        await supabase.from('foodbank_audit_logs').insert({
          actor_id: user?.id,
          actor_name: profile?.full_name || 'Pentadbir Eksekutif JPP',
          action_type: newStatus ? 'OFFICER_ASSIGNED' : 'OFFICER_REMOVED',
          location_id: officer.location_id,
          target_id: officer.user?.student_id || officer.user?.full_name || officer.id,
          details: {
            officer_id: officer.id,
            officer_name: officer.user?.full_name,
            new_status: newStatus ? 'AKTIF' : 'TIDAK_AKTIF',
            action: newStatus ? 'Mengaktifkan semula pegawai' : 'Menyahaktifkan status pegawai',
          },
        });
      } catch (e) {
        // silent
      }

      toast.success(`Status ${officer.user?.full_name || 'pegawai'} kini ${newStatus ? 'AKTIF' : 'TIDAK AKTIF'}.`);
    } catch (err: any) {
      console.error('Toggle officer error:', err);
      setOfficers(prev =>
        prev.map(o => (o.id === officer.id ? { ...o, is_active: newStatus } : o))
      );
      toast.success(`(Mod Tempatan) Status pegawai dikemaskini: ${newStatus ? 'AKTIF' : 'TIDAK AKTIF'}.`);
    }
  };

  const handleRemoveOfficer = async (officer: FoodBankOfficer) => {
    const officerName = officer.user?.full_name || 'Pegawai';
    if (!window.confirm(`Adakah anda pasti ingin membatalkan lantikan pegawai "${officerName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('foodbank_officers')
        .delete()
        .eq('id', officer.id);

      if (error) throw error;

      try {
        await supabase.from('foodbank_audit_logs').insert({
          actor_id: user?.id,
          actor_name: profile?.full_name || 'Pentadbir Eksekutif JPP',
          action_type: 'OFFICER_REMOVED',
          location_id: officer.location_id,
          target_id: officer.user?.student_id || officer.user?.full_name || officer.id,
          details: {
            officer_id: officer.id,
            officer_name: officerName,
            role_title: officer.role_title,
            location_name: officer.location?.name || 'Semua Pusat Edaran (Floating)',
          },
        });
      } catch (auditErr) {
        console.warn('Audit log note:', auditErr);
      }

      setOfficers(prev => prev.filter(o => o.id !== officer.id));
      toast.success(`Lantikan ${officerName} telah dibatalkan.`);
    } catch (err: any) {
      console.error('Delete officer error:', err);
      setOfficers(prev => prev.filter(o => o.id !== officer.id));
      toast.success(`(Mod Tempatan) Lantikan ${officerName} telah dibatalkan.`);
    }
  };

  // ── Penapis Senarai Permohonan (Tab 1) ─────────────────────────────────────
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      // Penapis status
      if (statusFilter !== 'SEMUA' && app.status !== statusFilter) return false;
      // Penapis perumahan
      if (housingFilter !== 'SEMUA' && app.housing_type !== housingFilter) return false;

      // Carian teks
      if (appSearch.trim()) {
        const q = appSearch.toLowerCase();
        const noMatch = app.application_no.toLowerCase().includes(q);
        const nameMatch = app.applicant?.full_name?.toLowerCase().includes(q);
        const idMatch = app.applicant?.student_id?.toLowerCase().includes(q);
        const reasonMatch = app.reason?.toLowerCase().includes(q);
        const qrMatch = app.pickup_qr_code?.toLowerCase().includes(q);
        if (!noMatch && !nameMatch && !idMatch && !reasonMatch && !qrMatch) return false;
      }
      return true;
    });
  }, [applications, statusFilter, housingFilter, appSearch]);

  // ── Penapis Senarai Barangan (Tab 2) ───────────────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter(item => {
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

  // ── Penapis Lejar Bajet (Tab 3) ───────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
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

  return (
    <div className="min-h-screen bg-[#faf6f6] dark:bg-[#0b0c10] text-slate-900 dark:text-slate-100 pb-16 transition-colors">
      
      {/* ── 1. HEADER UTAMA & KPI BAR ───────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-md border-b border-rose-200/60 dark:border-white/10 px-4 sm:px-6 lg:px-8 py-4 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Tajuk & Breadcrumb */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-800/70 dark:text-rose-400">
              <span>Portal JPP HQ</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Pengurusan Pelajar</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-rose-950 dark:text-rose-200 font-bold">Food Bank JPP</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-10 h-10 rounded-2xl bg-rose-600/10 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 flex items-center justify-center text-rose-700 dark:text-rose-300 shadow-sm">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  Food Bank JPP Command Center
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                    {isExecutiveAdmin ? 'Admin Eksekutif' : (myOfficerRecord?.role_title || 'Petugas Kaunter')}
                  </span>
                  {myOfficerRecord?.location && !isExecutiveAdmin && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-600" />
                      {myOfficerRecord.location.name}
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Pusat Kawalan Agihan Bantuan Makanan & Keperluan Asas Mahasiswa POLISAS
                </p>
              </div>
            </div>
          </div>

          {/* Kawalan Pantas Sesi & Butang Refresh */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Suis Status Sesi */}
            {isExecutiveAdmin ? (
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-white dark:bg-white/5 border border-rose-200/80 dark:border-white/10 shadow-sm">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Sesi Pelajar:
                </span>
                <button
                  type="button"
                  onClick={handleToggleSession}
                  className={cn(
                    'px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm',
                    settings?.is_application_open
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30'
                  )}
                >
                  {settings?.is_application_open ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      Buka
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      Tutup
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm text-xs font-bold text-slate-600 dark:text-slate-400">
                <span>Status Sesi:</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase",
                  settings?.is_application_open ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                )}>
                  {settings?.is_application_open ? 'Dibuka' : 'Ditutup'}
                </span>
              </div>
            )}

            {/* Butang Refresh */}
            <button
              onClick={() => fetchAllData(true)}
              disabled={isRefreshing}
              title="Segarkan data"
              className="p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-rose-200/80 dark:border-white/10 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin text-rose-600')} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* ── 2. KAD METRIK KPI WARM CITRUS & STATUS BAJET RM70K ───────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Kad 1: Bajet Rasmi RM70,000 vs Belanja Semasa */}
          <div className="p-4 rounded-3xl bg-white dark:bg-white/[0.03] border border-amber-200/80 dark:border-white/10 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  Peruntukan Belanjawan Rasmi
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  RM {budgetAllocation.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
              <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                <span className="text-slate-500 dark:text-slate-400">
                  Belanja: RM {currentSpent.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-amber-700 dark:text-amber-400">
                  {budgetUsedPercentage.toFixed(1)}% Digunakan
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500 rounded-full"
                  style={{ width: `${budgetUsedPercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                Baki Sedia Ada: RM {remainingBudget.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Kad 2: Permohonan Menunggu Kelulusan */}
          <div className="p-4 rounded-3xl bg-white dark:bg-white/[0.03] border border-amber-200/80 dark:border-white/10 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Permohonan Menunggu
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    {appMetrics.pending}
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">pelajar</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Perlu semakan pegawai</span>
              <button
                onClick={() => {
                  setActiveTab('applications');
                  setStatusFilter('MENUNGGU');
                }}
                className="text-[11px] font-black text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                Semak Segera <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Kad 3: Permohonan Lulus (Menunggu Ambilan) */}
          <div className="p-4 rounded-3xl bg-white dark:bg-white/[0.03] border border-sky-200/80 dark:border-white/10 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400">
                  Diluluskan (Sedia Diambil)
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    {appMetrics.approved}
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">pas aktif</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Menanti imbasan QR di kaunter</span>
              <button
                onClick={() => {
                  setActiveTab('applications');
                  setStatusFilter('LULUS');
                }}
                className="text-[11px] font-black text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                Lihat Senarai <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Kad 4: Agihan Selesai & Jumlah Pek Diberi */}
          <div className="p-4 rounded-3xl bg-white dark:bg-white/[0.03] border border-emerald-200/80 dark:border-white/10 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Jumlah Agihan Selesai
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    {appMetrics.completed}
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">penerima</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Pek diagihkan: <strong className="text-slate-800 dark:text-slate-200">{appMetrics.totalItemsDistributed} unit</strong>
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                Audit Sah
              </span>
            </div>
          </div>
        </div>

        {/* ── 3. NAVIGASI TAB UTAMA ────────────────────────────────────────── */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-rose-200/70 dark:border-white/10 shadow-sm overflow-x-auto">
          {[
            {
              id: 'applications',
              label: 'Permohonan & Kaunter',
              icon: QrCode,
              badge: appMetrics.pending > 0 ? appMetrics.pending : null,
              badgeColor: 'bg-amber-500 text-white',
            },
            {
              id: 'inventory',
              label: 'Inventori & Stok',
              icon: Package,
              badge: items.filter(i => i.current_stock < 10).length > 0 ? 'Stok Rendah' : null,
              badgeColor: 'bg-rose-500 text-white',
            },
            ...(isExecutiveAdmin
              ? [
                  {
                    id: 'budget',
                    label: 'Bajet & Lejar Audit (RM70k)',
                    icon: Receipt,
                    badge: null,
                    badgeColor: '',
                  },
                  {
                    id: 'settings',
                    label: 'Tetapan Sesi & Pegawai',
                    icon: Sliders,
                    badge: null,
                    badgeColor: '',
                  },
                ]
              : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-amber-500/10'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase',
                    tab.badgeColor
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── 4. KANDUNGAN TAB ──────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          
          {/* ════════════════════════════════════════════════════════════════════
              TAB 1: PENGURUSAN PERMOHONAN & IMBASAN KAUNTER
             ════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'applications' && (
            <motion.div
              key="tab-applications"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* Kotak Pengesahan Kaunter Segera (QR / Matrik) */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-900 to-slate-900 text-white shadow-lg border border-rose-800/40 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-80 h-full bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-rose-300 text-xs font-black uppercase tracking-wider">
                      <QrCode className="w-4 h-4 text-rose-400" />
                      Kaunter Agihan Pantas
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-white">
                      Imbas Pas Pengambilan Mahasiswa
                    </h2>
                    <p className="text-xs text-rose-100/70 max-w-lg">
                      Masukkan atau imbas Kod QR (FB-...), No. Matrik, atau No. Permohonan pelajar untuk mengesahkan pengambilan dan menolak inventori secara atomik.
                    </p>
                  </div>

                  {/* Input Carian & Butang Pengesahan */}
                  <div className="flex items-center gap-2 sm:w-auto w-full">
                    <div className="relative flex-1 sm:w-72">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={counterInput}
                        onChange={e => setCounterInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleVerifyCounterPickup()}
                        placeholder="Imbas Kod QR / No Matrik..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleVerifyCounterPickup()}
                      disabled={isVerifyingCounter || !counterInput.trim()}
                      className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-md flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {isVerifyingCounter ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Mengesahkan...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Sahkan Ambilan
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Banner Pengesahan Terkini Berjaya */}
                {recentVerifiedRecord && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                      <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span>Agihan Terbaharu Sah:</span>
                      <span className="text-white font-black">
                        {recentVerifiedRecord.studentName} ({recentVerifiedRecord.matricNo || recentVerifiedRecord.appNo})
                      </span>
                      <span className="text-emerald-400/90 font-medium">
                        — {recentVerifiedRecord.itemsCount} barangan (RM {recentVerifiedRecord.totalValue.toFixed(2)})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-300 font-semibold">
                      Masa: {recentVerifiedRecord.timestamp}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Bar Penapis Permohonan */}
              <div className="p-4 rounded-3xl bg-white dark:bg-white/[0.03] border border-rose-200/70 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {(['SEMUA', 'MENUNGGU', 'LULUS', 'SELESAI', 'DITOLAK'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap',
                        statusFilter === st
                          ? 'bg-rose-500/15 text-rose-900 dark:text-rose-300 font-black border border-rose-500/30'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                      )}
                    >
                      {st === 'SEMUA' ? 'Semua Status' : st}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={housingFilter}
                    onChange={e => setHousingFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="SEMUA">Semua Kediaman</option>
                    <option value="KAMSIS">KAMSIS</option>
                    <option value="RUMAH_SEWA">Rumah Sewa Luar</option>
                    <option value="SENDIRI">Kediaman Sendiri</option>
                  </select>

                  <div className="relative w-full sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={appSearch}
                      onChange={e => setAppSearch(e.target.value)}
                      placeholder="Cari nama / matrik / no app..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Jadual Senarai Permohonan */}
              <div className="rounded-3xl bg-white dark:bg-white/[0.03] border border-rose-200/70 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-rose-50/50 dark:bg-white/[0.02] border-b border-rose-200/60 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-4">No. Permohonan</th>
                        <th className="py-3.5 px-4">Maklumat Pemohon</th>
                        <th className="py-3.5 px-4">Kategori & Kediaman</th>
                        <th className="py-3.5 px-4">Barangan Dipohon</th>
                        <th className="py-3.5 px-4">Lokasi & Tarikh</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {isLoading ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
                            Memuat turun senarai permohonan Food Bank...
                          </td>
                        </tr>
                      ) : filteredApplications.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                            <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                            Tiada permohonan ditemui bagi kriteria carian ini.
                          </td>
                        </tr>
                      ) : (
                        filteredApplications.map(app => (
                          <tr
                            key={app.id}
                            className="hover:bg-rose-50/30 dark:hover:bg-white/[0.02] transition-colors"
                          >
                            {/* No Permohonan */}
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                              <div>{app.application_no}</div>
                              <span className="text-[10px] text-slate-400 font-sans font-normal">
                                {new Date(app.created_at || '').toLocaleDateString('ms-MY', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </td>

                            {/* Maklumat Pemohon */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {app.applicant?.full_name || 'Pelajar'}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                                <span>{app.applicant?.student_id || '-'}</span>
                                {app.applicant?.phone_number && (
                                  <>
                                    <span>•</span>
                                    <span>{app.applicant.phone_number}</span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Kategori & Kediaman */}
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                                  {app.financial_category || 'B40'}
                                </span>
                                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Home className="w-3 h-3 text-slate-400" />
                                  {app.housing_type === 'KAMSIS' ? 'KAMSIS' : 'Luar Kampus'}
                                  {app.housemates && app.housemates.length > 0 && (
                                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                      (+{app.housemates.length} rakan)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </td>

                            {/* Barangan Dipohon */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {app.selected_items?.length || 0} Barangan
                              </div>
                              <div className="text-[11px] font-medium text-rose-700 dark:text-rose-400">
                                RM {Number(app.total_estimated_value || 0).toFixed(2)}
                              </div>
                            </td>

                            {/* Lokasi & Tarikh */}
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                                {app.location?.name || 'Pusat Edaran JPP'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {app.pickup_date || 'Sedia untuk diambil'}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={cn(
                                  'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-sm',
                                  app.status === 'MENUNGGU' && 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
                                  app.status === 'LULUS' && 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30',
                                  app.status === 'SELESAI' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
                                  app.status === 'DITOLAK' && 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                )}
                              >
                                {app.status === 'SELESAI' && <Check className="w-3 h-3" />}
                                {app.status}
                              </span>
                            </td>

                            {/* Tindakan */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Butang Papar Butiran */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedAppForDetail(app)}
                                  title="Lihat Butiran Penuh"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {/* Tindakan Menunggu: Lulus / Tolak */}
                                {app.status === 'MENUNGGU' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleApproveApplication(app)}
                                      disabled={isProcessingAction}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors shadow-sm disabled:opacity-50"
                                    >
                                      Lulus
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRejectionModal(app)}
                                      disabled={isProcessingAction}
                                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 font-bold text-[11px] transition-colors"
                                    >
                                      Tolak
                                    </button>
                                  </>
                                )}

                                {/* Tindakan Lulus: Pas QR & Sahkan Ambilan Langsung */}
                                {app.status === 'LULUS' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAppForPass(app)}
                                      title="Papar Pas QR"
                                      className="p-1.5 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25 transition-colors"
                                    >
                                      <QrCode className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleVerifyCounterPickup(app.application_no)}
                                      disabled={isVerifyingCounter}
                                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-colors shadow-sm flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      Sahkan Ambilan
                                    </button>
                                  </>
                                )}

                                {app.status === 'SELESAI' && (
                                  <span className="text-[10px] text-slate-400 font-medium italic">
                                    Disahkan oleh {app.verifier?.full_name || 'Pegawai'}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 2: PENGURUSAN INVENTORI & STOK BARANGAN
             ════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'inventory' && (
            <motion.div
              key="tab-inventory"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* Bar Atas Inventori & Butang Tambah */}
              <div className="p-4 rounded-3xl bg-white dark:bg-white/[0.03] border border-amber-200/70 dark:border-white/10 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Kategori Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                  {(['SEMUA', 'MAKANAN', 'MINUMAN', 'KEBERSIHAN', 'KEPERLUAN_ASAS'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setItemCategoryFilter(cat)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap',
                        itemCategoryFilter === cat
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                      )}
                    >
                      {cat === 'SEMUA' ? 'Semua Kategori' : cat}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Dropdown Pemilihan Lokasi */}
                  <div className="relative min-w-[210px] flex-1 sm:flex-initial">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 dark:text-amber-400 pointer-events-none" />
                    <select
                      value={selectedInventoryLocationId}
                      onChange={e => setSelectedInventoryLocationId(e.target.value)}
                      disabled={!isExecutiveAdmin && !!assignedLocationId}
                      className={cn(
                        "w-full pl-9 pr-7 py-2 rounded-xl text-xs font-bold bg-amber-500/5 dark:bg-white/5 border border-amber-300/60 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer appearance-none",
                        !isExecutiveAdmin && !!assignedLocationId && "opacity-80 cursor-not-allowed bg-slate-100 dark:bg-white/5"
                      )}
                    >
                      {isExecutiveAdmin && (
                        <option value="SEMUA" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold">
                          Semua Pusat Edaran (Agregat)
                        </option>
                      )}
                      {locations.map(loc => (
                        <option
                          key={loc.id}
                          value={loc.id}
                          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                        >
                          {loc.name} {!isExecutiveAdmin && loc.id === assignedLocationId ? ' (Lokasi Jagaan Anda)' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                      ▼
                    </div>
                  </div>

                  {/* Carian Item */}
                  <div className="relative w-full sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                      placeholder="Cari barangan..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Butang Pindah Stok */}
                  <button
                    type="button"
                    onClick={() => {
                      setTransferFormData(prev => ({
                        ...prev,
                        item_id: prev.item_id || items[0]?.id || '',
                        from_location_id: prev.from_location_id || (selectedInventoryLocationId !== 'SEMUA' ? selectedInventoryLocationId : locations[0]?.id) || '',
                        to_location_id: prev.to_location_id || (locations.find(l => l.id !== selectedInventoryLocationId)?.id || locations[1]?.id) || '',
                        quantity: 1,
                        notes: '',
                      }));
                      setTransferModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Pindah Stok
                  </button>

                  {/* Butang Tambah Item */}
                  <button
                    type="button"
                    onClick={handleOpenAddItemModal}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Item
                  </button>
                </div>
              </div>

              {/* Grid Barangan Inventori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredItems.map(item => {
                  const catConfig = FOODBANK_CATEGORY_CONFIG[item.category] || {
                    label: item.category,
                    badge: 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30',
                    icon: '📦',
                  };
                  const displayStock = getItemStockForLocation(item.id, selectedInventoryLocationId);
                  const stockBadge = getFoodBankStockBadge(displayStock, item.unit);

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-4 rounded-3xl bg-white dark:bg-white/[0.03] border transition-all duration-200 flex flex-col justify-between shadow-sm relative',
                        item.is_active
                          ? 'border-rose-200/70 dark:border-white/10'
                          : 'border-slate-200/60 dark:border-white/5 opacity-60'
                      )}
                    >
                      <div>
                        {/* Gambar Item */}
                        <div className="w-full h-32 rounded-2xl bg-rose-50/50 dark:bg-white/5 overflow-hidden mb-3 relative flex items-center justify-center border border-rose-100 dark:border-white/5">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={e => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Package className="w-10 h-10 text-rose-300 dark:text-slate-600" />
                          )}
                          <span
                            className={cn(
                              'absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider backdrop-blur-md border flex items-center gap-1 shadow-sm',
                              catConfig.badge
                            )}
                          >
                            <span>{catConfig.icon}</span>
                            <span>{catConfig.label}</span>
                          </span>
                          {!item.is_active && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white">
                              Tidak Aktif
                            </span>
                          )}
                        </div>

                        {/* Maklumat Item */}
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 font-medium">
                            {item.description}
                          </p>
                        )}

                        {/* Harga & Baki Stok */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Anggaran</span>
                            <p className="font-black text-slate-800 dark:text-slate-200">
                              RM {Number(item.estimated_cost).toFixed(2)} /{item.unit}
                            </p>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">
                              {selectedInventoryLocationId === 'SEMUA' ? 'Baki Agregat' : 'Baki Lokasi'}
                            </span>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm',
                                stockBadge.badgeClass
                              )}
                            >
                              {stockBadge.label}
                            </span>
                          </div>
                        </div>

                        {/* Taburan Baki Mengikut Pusat Edaran Fizikal */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-500" />
                              Pusat Edaran
                            </span>
                            <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                              {selectedInventoryLocationId !== 'SEMUA' ? 'Fokus Lokasi' : 'Pecahan'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {locations.map(loc => {
                              const locStock = getItemStockForLocation(item.id, loc.id);
                              const isCurrentSelected = selectedInventoryLocationId === loc.id;
                              const shortName = loc.name.includes('Utama') || loc.name.includes('Student Centre')
                                ? 'SC Utama'
                                : loc.name.includes('Kamsis') || loc.name.includes('Al-Biruni')
                                ? 'Kamsis AB'
                                : loc.name.includes('Pentadbiran')
                                ? 'Pentadbiran'
                                : loc.name.split(' ')[0];

                              return (
                                <button
                                  key={loc.id}
                                  type="button"
                                  onClick={() => setSelectedInventoryLocationId(isCurrentSelected ? 'SEMUA' : loc.id)}
                                  title={`Klik untuk fokus ${loc.name} (Baki: ${locStock} ${item.unit})`}
                                  className={cn(
                                    'p-1 rounded-xl border text-center transition-all cursor-pointer',
                                    isCurrentSelected
                                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-300 font-black shadow-xs ring-1 ring-amber-500/30'
                                      : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                  )}
                                >
                                  <div className="text-[8px] font-black uppercase truncate">{shortName}</div>
                                  <div className="text-[11px] font-extrabold leading-tight">
                                    {locStock} <span className="text-[8px] font-normal text-slate-400">{item.unit}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Kawalan Pantas Stok */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 space-y-2">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase truncate">
                            {selectedInventoryLocationId !== 'SEMUA' ? (
                              <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                                Kemas Kini ({locations.find(l => l.id === selectedInventoryLocationId)?.name.split(' ')[0] || 'Lokasi'}):
                              </span>
                            ) : (
                              'Kemas Kini:'
                            )}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustStock(item, -10)}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-black text-[10px] transition-colors"
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustStock(item, 10)}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black text-[10px] transition-colors"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustStock(item, 50)}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black text-[10px] transition-colors"
                            >
                              +50
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => handleToggleItemActive(item)}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          >
                            {item.is_active ? 'Nyahaktifkan' : 'Aktifkan'}
                          </button>

                          <div className="flex items-center gap-1">
                            {/* Butang Pindah Stok Item Ini */}
                            <button
                              type="button"
                              onClick={() => {
                                setTransferFormData({
                                  item_id: item.id,
                                  from_location_id: (selectedInventoryLocationId !== 'SEMUA' ? selectedInventoryLocationId : locations[0]?.id) || '',
                                  to_location_id: (locations.find(l => l.id !== selectedInventoryLocationId)?.id || locations[1]?.id) || '',
                                  quantity: 1,
                                  notes: '',
                                });
                                setTransferModalOpen(true);
                              }}
                              title="Pindah Stok Barangan Ini"
                              className="p-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-colors"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditItemModal(item)}
                              title="Sunting Item"
                              className="p-1 rounded bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              title="Padam Item"
                              className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 3: PENJEJAKAN BAJET & LEJAR AUDIT (RM70,000)
             ════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'budget' && isExecutiveAdmin && (
            <motion.div
              key="tab-budget"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* Kad Ringkasan Belanjawan */}
              <div className="p-6 rounded-3xl bg-white dark:bg-white/[0.03] border border-rose-200/70 dark:border-white/10 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                      Pengauditan Tabung Kebajikan
                    </span>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                      Penyata Penggunaan Peruntukan RM {budgetAllocation.toLocaleString('en-MY')}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                      Setiap agihan barangan di kaunter menolak bajet secara automatik mengikut nilai kos sebenar pek barangan. Semua transaksi direkodkan secara lejar kekal (immutable ledger).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBudgetModalOpen(true)}
                    className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap self-start md:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Pelarasan / Suntikan Bajet
                  </button>
                </div>

                {/* Butiran Baki & Purata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Peruntukan Asas</span>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      RM {budgetAllocation.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Jumlah Digunakan</span>
                    <p className="text-base font-black text-rose-600 dark:text-rose-400">
                      RM {currentSpent.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Baki Sedia Ada</span>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      RM {remainingBudget.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Purata Kos / Pelajar</span>
                    <p className="text-base font-black text-slate-900 dark:text-white">
                      RM {appMetrics.completed > 0 ? (currentSpent / appMetrics.completed).toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Jadual Transaksi Lejar Audit */}
              <div className="rounded-3xl bg-white dark:bg-white/[0.03] border border-rose-200/70 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {(['SEMUA', 'DISTRIBUTION', 'BUDGET_ADDITION', 'ADJUSTMENT'] as const).map(txT => (
                      <button
                        key={txT}
                        onClick={() => setTxFilter(txT)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap',
                          txFilter === txT
                            ? 'bg-rose-500/15 text-rose-900 dark:text-rose-300 font-black border border-rose-500/30'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        )}
                      >
                        {txT === 'SEMUA' ? 'Semua Transaksi' : txT}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={txSearch}
                      onChange={e => setTxSearch(e.target.value)}
                      placeholder="Cari transaksi / keterangan..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-rose-50/50 dark:bg-white/[0.02] border-b border-rose-200/60 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Tarikh & Masa</th>
                        <th className="py-3 px-4">Jenis Transaksi</th>
                        <th className="py-3 px-4">No. Rujukan</th>
                        <th className="py-3 px-4">Keterangan</th>
                        <th className="py-3 px-4">Pegawai</th>
                        <th className="py-3 px-4 text-right">Amaun (RM)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                            Tiada transaksi lejar ditemui.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map(tx => {
                          const isDeduction = tx.transaction_type === 'DISTRIBUTION';
                          return (
                            <tr key={tx.id} className="hover:bg-rose-50/20 dark:hover:bg-white/[0.01]">
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono">
                                {new Date(tx.created_at || '').toLocaleString('ms-MY', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded text-[10px] font-black uppercase',
                                    isDeduction
                                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                  )}
                                >
                                  {tx.transaction_type}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                                {tx.application?.application_no || '-'}
                              </td>
                              <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium max-w-md">
                                {tx.description}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {tx.creator?.full_name || 'Sistem'}
                              </td>
                              <td
                                className={cn(
                                  'py-3 px-4 text-right font-black font-mono text-sm',
                                  isDeduction
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                )}
                              >
                                {isDeduction ? '-' : '+'} RM {Number(tx.amount).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 4: TETAPAN SESI, FORMULA KUOTA & LOKASI PENGAGIHAN
             ════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'settings' && isExecutiveAdmin && (
            <motion.div
              key="tab-settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Suis Induk Pelancaran Modul (Turn ON / Turn OFF untuk Mahasiswa) */}
              <div className={cn(
                "p-6 rounded-3xl border shadow-sm space-y-4 col-span-full transition-all",
                settings?.is_module_active
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-amber-500/10 border-amber-500/30"
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase",
                        settings?.is_module_active
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-500 text-slate-900 font-bold"
                      )}>
                        {settings?.is_module_active ? 'MODUL DIAKTIFKAN (RASMI)' : 'MODUL DALAM PERSEDIAAN (TUTUP)'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Akses Portal Mahasiswa (/kebajikan/foodbank)
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      Suis Induk Pelancaran Modul Food Bank JPP
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl mt-0.5">
                      Kawal kebolehcapaian portal mahasiswa sebelum perasmian penuh. Apabila ditutup (default), mahasiswa boleh melihat info persediaan & katalog barangan, namun borang permohonan dikunci rapi dengan notis "Dalam Persediaan / Akan Datang".
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleToggleModuleStatus}
                      className={cn(
                        "px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-sm",
                        settings?.is_module_active
                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      )}
                    >
                      {settings?.is_module_active ? (
                        <>
                          <Lock className="w-4 h-4" />
                          Tutup Akses Siswa (Mod Persediaan)
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Rasmikan & Buka Modul Siswa
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tetapan Formula Kuota & Arahan */}
              <div className="p-6 rounded-3xl bg-white dark:bg-white/[0.03] border border-rose-200/70 dark:border-white/10 shadow-sm space-y-6">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                    Konfigurasi Sesi & Peraturan
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    Formula Kuota & Had Permohonan
                  </h2>
                </div>

                <form onSubmit={handleSaveSessionSettings} className="space-y-4 text-xs font-semibold">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">
                        Had Permohonan / Pelajar / Bulan
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={sessionFormData.max_monthly_applications_per_student}
                        onChange={e =>
                          setSessionFormData({
                            ...sessionFormData,
                            max_monthly_applications_per_student: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Default: 1 kali sebulan</p>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">
                        Had Maksimum Barangan Asas
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={sessionFormData.max_items_per_application}
                        onChange={e =>
                          setSessionFormData({
                            ...sessionFormData,
                            max_items_per_application: parseInt(e.target.value, 10) || 5,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Default: 5 barangan individu</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                      Peruntukan Siling Belanjawan (RM)
                    </label>
                    <input
                      type="number"
                      min={100}
                      step="any"
                      value={sessionFormData.total_budget}
                      onChange={e =>
                        setSessionFormData({
                          ...sessionFormData,
                          total_budget: parseFloat(e.target.value) || OFFICIAL_BASELINE_BUDGET,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                      Teks Arahan & Panduan Permohonan
                    </label>
                    <textarea
                      rows={3}
                      value={sessionFormData.application_instructions}
                      onChange={e =>
                        setSessionFormData({
                          ...sessionFormData,
                          application_instructions: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                      placeholder="Masukkan arahan kepada mahasiswa..."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                      Syarat Kelayakan Mahasiswa
                    </label>
                    <textarea
                      rows={3}
                      value={sessionFormData.eligibility_criteria}
                      onChange={e =>
                        setSessionFormData({
                          ...sessionFormData,
                          eligibility_criteria: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                      placeholder="Syarat kelayakan bantuan..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="w-full py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingSettings ? 'Menyimpan...' : 'Simpan Tetapan Sesi'}
                  </button>
                </form>
              </div>

              {/* Pengurusan Lokasi Pusat Pengagihan Berintegrasi PolyMaps */}
              <div className="p-6 rounded-3xl bg-white dark:bg-white/[0.03] border border-rose-200/70 dark:border-white/10 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                        Lokasi Fizikal & PolyMaps 360°
                      </span>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                        Pusat Pengagihan Food Bank
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAddLocationModal}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase transition-all shadow-sm flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Lokasi
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {locations.map(loc => (
                      <div
                        key={loc.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 dark:text-white">{loc.name}</h4>
                            {!loc.is_active && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/10 text-rose-600">
                                Ditutup
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                            {loc.room_detail} • {loc.operating_hours}
                          </p>
                          {loc.building && (
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-rose-700 dark:text-rose-400 font-semibold">
                              <MapPin className="w-3 h-3" />
                              <span>Bangunan: {loc.building.name} ({loc.building.code})</span>
                              {loc.building.panorama_360_url && (
                                <Link
                                  to={`/jpp/polymaps`}
                                  className="text-[10px] font-bold underline text-blue-600 dark:text-blue-400 hover:opacity-80 flex items-center gap-0.5"
                                >
                                  Papar PolyMaps 360° <ExternalLink className="w-2.5 h-2.5" />
                                </Link>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleOpenEditLocationModal(loc)}
                            className="p-1.5 rounded-lg bg-slate-200/70 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-950 dark:text-rose-200 text-xs">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                    Integrasi PolyMaps 360° Kampus
                  </p>
                  <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 mt-1">
                    Setiap pusat agihan dihubungkan secara terus ke sistem peta 360° POLISAS untuk membolehkan mahasiswa mencari arah kaunter fizikal tanpa sesat.
                  </p>
                </div>
              </div>

              {/* ── SEKSYEN BAHARU: Pengurusan & Pelantikan Pegawai Bertugas Kaunter ── */}
              <div className="col-span-full p-6 rounded-3xl bg-white dark:bg-white/[0.03] border border-amber-200/80 dark:border-white/10 shadow-sm space-y-6">
                {/* Header Seksyen */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                          Akses Kaunter & RBAC
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          {officers.length} Pegawai Dilantik ({officers.filter(o => o.is_active).length} Aktif)
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                        Pengurusan & Pelantikan Pegawai Bertugas Kaunter
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Lantik staf atau mahasiswa POLISAS bertugas bagi menguruskan imbasan pas QR dan stok edaran.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* ── Kolum Kiri / Borang Carian & Lantikan (5 Kolum) ── */}
                  <div className="lg:col-span-5 space-y-4 bg-slate-50/70 dark:bg-white/[0.02] p-5 rounded-2xl border border-slate-200/60 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        Borang Lantikan Pegawai Baharu
                      </h3>
                    </div>

                    {/* Carian No. Matrik / Nama dari profiles */}
                    <div className="space-y-1.5 relative">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Cari Calon Pegawai (No. Matrik / Nama) *
                      </label>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={officerSearchQuery}
                          onChange={e => {
                            setOfficerSearchQuery(e.target.value);
                            if (selectedCandidate) setSelectedCandidate(null);
                          }}
                          placeholder="Cari '15DIT...' atau nama..."
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                        />
                        {officerSearchQuery && (
                          <button
                            type="button"
                            onClick={handleClearCandidate}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Loading Indicator */}
                      {isSearchingCandidate && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5 mt-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Mencari profil pelajar / staf POLISAS...
                        </p>
                      )}

                      {/* Dropdown Hasil Carian Profiles */}
                      {!selectedCandidate && candidateProfiles.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-white/10 shadow-xl divide-y divide-slate-100 dark:divide-white/5">
                          {candidateProfiles.map(candidate => (
                            <button
                              key={candidate.id}
                              type="button"
                              onClick={() => handleSelectCandidate(candidate)}
                              className="w-full text-left p-2.5 hover:bg-amber-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2.5 text-xs group"
                            >
                              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 font-black flex items-center justify-center shrink-0 border border-amber-500/20">
                                {candidate.full_name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300 truncate">
                                  {candidate.full_name}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {candidate.student_id ? `${candidate.student_id} • ` : ''}
                                  {candidate.department || candidate.email || 'Pelajar POLISAS'}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Calon Terpilih Card Preview */}
                      {selectedCandidate && (
                        <div className="mt-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center shrink-0">
                              <Check className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 dark:text-white truncate">
                                {selectedCandidate.full_name}
                              </p>
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                                {selectedCandidate.student_id || selectedCandidate.email}
                                {selectedCandidate.department ? ` • ${selectedCandidate.department}` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleClearCandidate}
                            className="text-[11px] font-bold text-rose-600 hover:underline shrink-0 ml-2"
                          >
                            Tukar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Pilihan Lokasi Penugasan */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Pusat Pengagihan Bertugas *
                      </label>
                      <select
                        value={officerAssignLocationId}
                        onChange={e => setOfficerAssignLocationId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm cursor-pointer"
                      >
                        <option value="">🌐 Semua Pusat Edaran (Floating / Merentas Lokasi)</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>
                            📍 {loc.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Pegawai terapung (Floating) boleh menguruskan imbasan di mana-mana kaunter aktif.
                      </p>
                    </div>

                    {/* Gelaran Peranan */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Gelaran Peranan / Jawatan *
                      </label>
                      <input
                        type="text"
                        value={officerRoleTitle}
                        onChange={e => setOfficerRoleTitle(e.target.value)}
                        placeholder="cth: Petugas Kaunter Food Bank, Ketua Penyelaras"
                        className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                      />
                    </div>

                    {/* Butang Lantik Pegawai */}
                    <button
                      type="button"
                      onClick={handleAssignOfficer}
                      disabled={isAssigningOfficer || !selectedCandidate}
                      className={cn(
                        "w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm",
                        selectedCandidate && !isAssigningOfficer
                          ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                          : "bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      <UserPlus className="w-4 h-4" />
                      {isAssigningOfficer ? 'Memproses Lantikan...' : 'Lantik Sebagai Pegawai Bertugas'}
                    </button>
                  </div>

                  {/* ── Kolum Kanan / Senarai Pegawai Dilantik (7 Kolum) ── */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        Senarai Pegawai Bertugas
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold">
                          {officers.length}
                        </span>
                      </h3>
                    </div>

                    {officers.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                        <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          Tiada pegawai bertugas dilantik setakat ini.
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Gunakan borang carian di sebelah untuk melantik petugas kaunter Food Bank.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                        {officers.map(officer => {
                          const officerUser = officer.user || (officer as any).profile;
                          const assignedLoc = locations.find(l => l.id === officer.location_id) || officer.location;

                          return (
                            <div
                              key={officer.id}
                              className={cn(
                                "p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm",
                                officer.is_active
                                  ? "bg-white dark:bg-white/[0.02] border-slate-200/80 dark:border-white/10"
                                  : "bg-slate-50 dark:bg-white/[0.01] border-slate-200/40 dark:border-white/5 opacity-60"
                              )}
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div className={cn(
                                  "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border relative",
                                  officer.is_active
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                    : "bg-slate-200 dark:bg-white/10 text-slate-500 border-transparent"
                                )}>
                                  {officerUser?.full_name?.charAt(0)?.toUpperCase() || 'P'}
                                  {officer.is_active && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 absolute -bottom-0.5 -right-0.5" />
                                  )}
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-black text-slate-900 dark:text-white truncate">
                                      {officerUser?.full_name || 'Pegawai Bertugas'}
                                    </h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                                      {officer.role_title}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {officerUser?.student_id && <span className="font-mono font-bold text-slate-700 dark:text-slate-300 mr-2">{officerUser.student_id}</span>}
                                    {officerUser?.email && <span>{officerUser.email}</span>}
                                    {officerUser?.phone_number && <span className="ml-1.5">• {officerUser.phone_number}</span>}
                                  </p>

                                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                                    {assignedLoc ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                                        <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                                        {assignedLoc.name}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-500/20">
                                        <Sparkles className="w-3 h-3 text-sky-600 shrink-0" />
                                        Semua Pusat Edaran (Floating)
                                      </span>
                                    )}

                                    <span className={cn(
                                      "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                                      officer.is_active
                                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                    )}>
                                      {officer.is_active ? 'Aktif' : 'Nyahaktif'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Butang Tindakan Pegawai */}
                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                {/* Suis Toggle Status */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleOfficerStatus(officer)}
                                  title={officer.is_active ? 'Nyahaktifkan pegawai' : 'Aktifkan semula pegawai'}
                                  className={cn(
                                    "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-1",
                                    officer.is_active
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-700"
                                      : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-700"
                                  )}
                                >
                                  {officer.is_active ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" />
                                      Aktif
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3" />
                                      Nyahaktif
                                    </>
                                  )}
                                </button>

                                {/* Butang Padam / Hapus Lantikan */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOfficer(officer)}
                                  title="Hapus lantikan pegawai"
                                  className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/20 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>

      {/* ── 5. MODAL PENOLAKAN PERMOHONAN ───────────────────────────────────── */}
      {rejectionModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-rose-200 dark:border-white/10 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Tolak Permohonan Food Bank
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Permohonan <strong>{rejectionModalApp.application_no}</strong> bagi pelajar{' '}
              <strong>{rejectionModalApp.applicant?.full_name}</strong>.
            </p>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Sebab Penolakan Rasmi:
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Nyatakan sebab penolakan permohonan..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectionModalApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white uppercase tracking-wider shadow-sm disabled:opacity-50"
              >
                {isProcessingAction ? 'Memproses...' : 'Sahkan Penolakan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. MODAL BUTIRAN PENUH PERMOHONAN ─────────────────────────────────── */}
      {selectedAppForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-rose-200 dark:border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">
                  Butiran Permohonan
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedAppForDetail.application_no}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAppForDetail(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profil Pemohon */}
            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-white/5 border border-rose-100 dark:border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Nama Penuh</span>
                <p className="font-bold text-slate-800 dark:text-white">{selectedAppForDetail.applicant?.full_name}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">No. Matrik</span>
                <p className="font-bold text-slate-800 dark:text-white">{selectedAppForDetail.applicant?.student_id || '-'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">No. Telefon</span>
                <p className="font-bold text-slate-800 dark:text-white">{selectedAppForDetail.applicant?.phone_number || '-'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Kategori Kewangan</span>
                <p className="font-bold text-slate-800 dark:text-white">{selectedAppForDetail.financial_category || 'B40'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Pendapatan Isi Rumah</span>
                <p className="font-bold text-slate-800 dark:text-white">
                  {selectedAppForDetail.household_income ? `RM ${selectedAppForDetail.household_income}` : 'Tiada maklumat'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Jenis Kediaman</span>
                <p className="font-bold text-slate-800 dark:text-white">{selectedAppForDetail.housing_type}</p>
              </div>
            </div>

            {/* Sebab Memohon */}
            <div className="text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Sebab / Alasan Permohonan:</span>
              <p className="p-3 mt-1 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-medium">
                {selectedAppForDetail.reason}
              </p>
            </div>

            {/* Senarai Rakan Serumah jika ada */}
            {selectedAppForDetail.housemates && selectedAppForDetail.housemates.length > 0 && (
              <div className="text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold">
                  Rakan Serumah Ditanggung ({selectedAppForDetail.housemates.length}):
                </span>
                <div className="mt-1 space-y-1">
                  {selectedAppForDetail.housemates.map((hm, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-between text-[11px]"
                    >
                      <span className="font-bold text-slate-800 dark:text-white">{hm.name}</span>
                      <span className="text-slate-500 font-mono">{hm.ic_or_matric}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Senarai Barangan Dipohon */}
            <div className="text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Barangan Yang Dipohon:</span>
              <div className="mt-1 border border-slate-100 dark:border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3">Kuantiti</th>
                      <th className="py-2 px-3 text-right">Kos Anggaran (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {selectedAppForDetail.selected_items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-white">{it.item_name}</td>
                        <td className="py-2 px-3">{it.quantity} {it.unit}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {(it.estimated_cost * it.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-rose-50/50 dark:bg-white/5 font-black text-rose-700 dark:text-rose-300">
                      <td colSpan={2} className="py-2.5 px-3">Jumlah Nilai Anggaran</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        RM {Number(selectedAppForDetail.total_estimated_value || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {selectedAppForDetail.rejection_reason && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300">
                <span className="font-bold">Sebab Penolakan: </span>
                {selectedAppForDetail.rejection_reason}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAppForDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. MODAL TAMBAH / SUNTING ITEM INVENTORI ────────────────────────── */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-rose-200 dark:border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
              {editingItem ? 'Sunting Item Food Bank' : 'Tambah Item Inventori Baharu'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Nama Barangan *</label>
                <input
                  type="text"
                  required
                  value={itemFormData.name}
                  onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })}
                  placeholder="cth: Beras Super Spesial (5kg)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                  <select
                    value={itemFormData.category}
                    onChange={e => setItemFormData({ ...itemFormData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                  >
                    <option value="MAKANAN">Makanan Asas</option>
                    <option value="MINUMAN">Minuman</option>
                    <option value="KEBERSIHAN">Kebersihan Diri</option>
                    <option value="KEPERLUAN_ASAS">Keperluan Asas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Unit Sukatan</label>
                  <input
                    type="text"
                    required
                    value={itemFormData.unit}
                    onChange={e => setItemFormData({ ...itemFormData, unit: e.target.value })}
                    placeholder="cth: pek, tin, kampit"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Stok Semasa</label>
                  <input
                    type="number"
                    min={0}
                    value={itemFormData.current_stock}
                    onChange={e =>
                      setItemFormData({
                        ...itemFormData,
                        current_stock: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Anggaran Kos Seunit (RM)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={itemFormData.estimated_cost}
                    onChange={e =>
                      setItemFormData({
                        ...itemFormData,
                        estimated_cost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Penerangan Ringkas</label>
                <textarea
                  rows={2}
                  value={itemFormData.description}
                  onChange={e => setItemFormData({ ...itemFormData, description: e.target.value })}
                  placeholder="Keterangan kandungan atau pembungkusan..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>

              {/* Muat Naik Gambar */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Gambar Produk</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setImageFile(e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-500/10 file:text-rose-700 dark:file:text-rose-300 hover:file:bg-rose-500/20"
                  />
                </div>
                {itemFormData.image_url && !imageFile && (
                  <p className="text-[10px] text-slate-400 mt-1 truncate">
                    Gambar semasa: {itemFormData.image_url}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="item_active"
                  checked={itemFormData.is_active}
                  onChange={e => setItemFormData({ ...itemFormData, is_active: e.target.checked })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <label htmlFor="item_active" className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                  Katalog Aktif (Mahasiswa boleh mohon item ini)
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingItem || isUploadingImage}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white uppercase tracking-wider shadow-sm disabled:opacity-50"
                >
                  {isSavingItem || isUploadingImage ? 'Menyimpan...' : 'Simpan Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7.5. MODAL PINDAHAN STOK ANTARA LOKASI FIZIKAL ────────────────────── */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-amber-200 dark:border-white/10 shadow-2xl max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Pindahan Stok Antara Lokasi
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pindahkan baki barangan fizikal antara pusat pengagihan secara atomik
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteStockTransfer} className="space-y-4">
              {/* Pemilihan Barangan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Barangan Food Bank *
                </label>
                <select
                  value={transferFormData.item_id}
                  onChange={e => {
                    const newItemId = e.target.value;
                    setTransferFormData(prev => ({
                      ...prev,
                      item_id: newItemId,
                      quantity: 1,
                    }));
                  }}
                  required
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="" disabled>Pilih Barangan...</option>
                  {items.filter(i => i.is_active).map(it => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.unit}) — Jumlah Stok: {getItemStockForLocation(it.id, 'SEMUA')} {it.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid Dari Lokasi -> Ke Lokasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Dari Lokasi (Sumber) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Dari Lokasi (Sumber) *
                  </label>
                  <select
                    value={transferFormData.from_location_id}
                    onChange={e => {
                      const newFrom = e.target.value;
                      setTransferFormData(prev => ({
                        ...prev,
                        from_location_id: newFrom,
                        quantity: 1,
                      }));
                    }}
                    required
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="" disabled>Pilih Pusat Sumber...</option>
                    {locations.map(loc => {
                      const stockHere = transferFormData.item_id
                        ? getItemStockForLocation(transferFormData.item_id, loc.id)
                        : 0;
                      const selectedItem = items.find(i => i.id === transferFormData.item_id);
                      return (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} (Baki: {stockHere} {selectedItem?.unit || 'unit'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Ke Lokasi (Destinasi) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Ke Lokasi (Destinasi) *
                  </label>
                  <select
                    value={transferFormData.to_location_id}
                    onChange={e => {
                      setTransferFormData(prev => ({
                        ...prev,
                        to_location_id: e.target.value,
                      }));
                    }}
                    required
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="" disabled>Pilih Pusat Destinasi...</option>
                    {locations.map(loc => {
                      const isSame = loc.id === transferFormData.from_location_id;
                      const stockHere = transferFormData.item_id
                        ? getItemStockForLocation(transferFormData.item_id, loc.id)
                        : 0;
                      const selectedItem = items.find(i => i.id === transferFormData.item_id);
                      return (
                        <option key={loc.id} value={loc.id} disabled={isSame}>
                          {loc.name} {isSame ? '(Sama dengan Sumber)' : `(Semasa: ${stockHere} ${selectedItem?.unit || 'unit'})`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Status Visual Live Pindahan */}
              {transferFormData.item_id && transferFormData.from_location_id && (
                (() => {
                  const sourceStock = getItemStockForLocation(transferFormData.item_id, transferFormData.from_location_id);
                  const selectedItem = items.find(i => i.id === transferFormData.item_id);
                  const fromLoc = locations.find(l => l.id === transferFormData.from_location_id);
                  const toLoc = locations.find(l => l.id === transferFormData.to_location_id);

                  return (
                    <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-white/[0.03] border border-amber-200/80 dark:border-white/10 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-600 dark:text-slate-400">Baki Semasa di {fromLoc?.name || 'Sumber'}:</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded font-black",
                          sourceStock > 10 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" :
                          sourceStock > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" :
                          "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300"
                        )}>
                          {sourceStock} {selectedItem?.unit || 'unit'}
                        </span>
                      </div>
                      {toLoc && (
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                          <span>Baki Destinasi ({toLoc.name}):</span>
                          <span className="font-bold">
                            {getItemStockForLocation(transferFormData.item_id, toLoc.id)} {selectedItem?.unit || 'unit'}
                            {transferFormData.quantity > 0 && sourceStock >= transferFormData.quantity && (
                              <span className="text-emerald-600 dark:text-emerald-400 ml-1 font-black">
                                → {getItemStockForLocation(transferFormData.item_id, toLoc.id) + Number(transferFormData.quantity)} {selectedItem?.unit}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* Input Kuantiti & Butang Pintas */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Kuantiti Pindahan *
                  </label>
                  {transferFormData.item_id && transferFormData.from_location_id && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setTransferFormData(p => ({ ...p, quantity: 1 }))}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        Min (1)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const srcStock = getItemStockForLocation(transferFormData.item_id, transferFormData.from_location_id);
                          setTransferFormData(p => ({ ...p, quantity: Math.max(1, Math.floor(srcStock / 2)) }));
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        Setengah (50%)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const srcStock = getItemStockForLocation(transferFormData.item_id, transferFormData.from_location_id);
                          setTransferFormData(p => ({ ...p, quantity: Math.max(1, srcStock) }));
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        Semua (Max)
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  max={transferFormData.item_id && transferFormData.from_location_id
                    ? Math.max(1, getItemStockForLocation(transferFormData.item_id, transferFormData.from_location_id))
                    : undefined}
                  value={transferFormData.quantity}
                  onChange={e => setTransferFormData(p => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                  required
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Catatan Pindahan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Catatan Pindahan (Untuk Rekod Audit)
                </label>
                <textarea
                  rows={2}
                  value={transferFormData.notes}
                  onChange={e => setTransferFormData(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Cth: Penambahan stok Hab Kamsis Al-Biruni sempena minggu peperiksaan akhir..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* Validasi Amaran */}
              {transferFormData.from_location_id && transferFormData.to_location_id && transferFormData.from_location_id === transferFormData.to_location_id && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Lokasi sumber dan destinasi tidak boleh sama.</span>
                </div>
              )}

              {transferFormData.item_id && transferFormData.from_location_id && (() => {
                const sourceStock = getItemStockForLocation(transferFormData.item_id, transferFormData.from_location_id);
                if (sourceStock <= 0) {
                  return (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Baki stok di lokasi sumber adalah 0. Pindahan tidak dapat dijalankan.</span>
                    </div>
                  );
                }
                if (transferFormData.quantity > sourceStock) {
                  return (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Baki stok tidak mencukupi di lokasi sumber (Baki tersedia: {sourceStock}).</span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Butang Tindakan */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingTransfer ||
                    !transferFormData.item_id ||
                    !transferFormData.from_location_id ||
                    !transferFormData.to_location_id ||
                    transferFormData.from_location_id === transferFormData.to_location_id ||
                    transferFormData.quantity < 1 ||
                    transferFormData.quantity > getItemStockForLocation(transferFormData.item_id, transferFormData.from_location_id) ||
                    getItemStockForLocation(transferFormData.item_id, transferFormData.from_location_id) <= 0
                  }
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2"
                >
                  {isSubmittingTransfer ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Memindahkan...
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      Laksanakan Pindahan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 8. MODAL PELARASAN BAJET (TAB 3) ─────────────────────────────────── */}
      {budgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-rose-200 dark:border-white/10 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3">
              Pelarasan / Suntikan Bajet Food Bank
            </h3>

            <form onSubmit={handleSaveBudgetAdjustment} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Jenis Pelarasan</label>
                <select
                  value={budgetFormData.transaction_type}
                  onChange={e =>
                    setBudgetFormData({
                      ...budgetFormData,
                      transaction_type: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                >
                  <option value="BUDGET_ADDITION">Suntikan Dana / Penambahan Bajet (+)</option>
                  <option value="ADJUSTMENT">Pelarasan Kira-Kira Audit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Amaun (RM) *</label>
                <input
                  type="number"
                  min={1}
                  step={10}
                  required
                  value={budgetFormData.amount}
                  onChange={e =>
                    setBudgetFormData({
                      ...budgetFormData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Perihal / Sebab *</label>
                <textarea
                  rows={3}
                  required
                  value={budgetFormData.description}
                  onChange={e =>
                    setBudgetFormData({
                      ...budgetFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="cth: Sumbangan Alumni POLISAS, Geran Kebajikan Sesi..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBudget}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white uppercase tracking-wider shadow-sm disabled:opacity-50"
                >
                  {isSubmittingBudget ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 9. MODAL LOKASI PUSAT PENGAGIHAN (TAB 4) ─────────────────────────── */}
      {locationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-rose-200 dark:border-white/10 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
              {editingLocation ? 'Sunting Lokasi Pengagihan' : 'Tambah Pusat Pengagihan Baharu'}
            </h3>

            <form onSubmit={handleSaveLocation} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Nama Lokasi *</label>
                <input
                  type="text"
                  required
                  value={locationFormData.name}
                  onChange={e => setLocationFormData({ ...locationFormData, name: e.target.value })}
                  placeholder="cth: Pusat Edaran Utama JPP (Blok Pentadbiran)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                  Pautan Bangunan PolyMaps (Peta Kampus)
                </label>
                <select
                  value={locationFormData.polymaps_building_id}
                  onChange={e =>
                    setLocationFormData({
                      ...locationFormData,
                      polymaps_building_id: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                >
                  <option value="">-- Pilih Bangunan PolyMaps --</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Perincian Bilik / Aras</label>
                <input
                  type="text"
                  value={locationFormData.room_detail}
                  onChange={e =>
                    setLocationFormData({ ...locationFormData, room_detail: e.target.value })
                  }
                  placeholder="cth: Bilik Gerakan JPP, Tingkat 1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1">Waktu Operasi</label>
                <input
                  type="text"
                  value={locationFormData.operating_hours}
                  onChange={e =>
                    setLocationFormData({ ...locationFormData, operating_hours: e.target.value })
                  }
                  placeholder="cth: Isnin - Khamis: 10:00 AM - 4:00 PM"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">Pegawai Bertanggungjawab</label>
                  <input
                    type="text"
                    value={locationFormData.contact_person}
                    onChange={e =>
                      setLocationFormData({ ...locationFormData, contact_person: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">No. Telefon Pegawai</label>
                  <input
                    type="text"
                    value={locationFormData.contact_phone}
                    onChange={e =>
                      setLocationFormData({ ...locationFormData, contact_phone: e.target.value })
                    }
                    placeholder="cth: 012-3456789"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="loc_active"
                  checked={locationFormData.is_active}
                  onChange={e =>
                    setLocationFormData({ ...locationFormData, is_active: e.target.checked })
                  }
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <label htmlFor="loc_active" className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                  Lokasi Aktif & Buka untuk Temujanji
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingLocation}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white uppercase tracking-wider shadow-sm disabled:opacity-50"
                >
                  {isSavingLocation ? 'Menyimpan...' : 'Simpan Lokasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 10. MODAL PAS PENGAMBILAN QR (DIGITAL BOARDING PASS) ─────────────── */}
      <FoodBankQrPassModal
        open={Boolean(selectedAppForPass)}
        onClose={() => setSelectedAppForPass(null)}
        application={selectedAppForPass}
        studentName={selectedAppForPass?.applicant?.full_name}
        studentMatric={selectedAppForPass?.applicant?.student_id || undefined}
        roomOrResidence={
          selectedAppForDetail?.housing_type === 'KAMSIS' ? 'KAMSIS POLISAS' : 'Kediaman Luar'
        }
      />
    </div>
  );
}
