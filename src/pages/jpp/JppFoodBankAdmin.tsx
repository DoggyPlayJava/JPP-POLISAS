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
      ]);

      if (settingsRes.error) console.error('Error fetching settings:', settingsRes.error);
      if (appsRes.error) console.error('Error fetching applications:', appsRes.error);
      if (itemsRes.error) console.error('Error fetching items:', itemsRes.error);
      if (txRes.error) console.error('Error fetching transactions:', txRes.error);
      if (locationsRes.error) console.error('Error fetching locations:', locationsRes.error);
      if (buildingsRes.error) console.error('Error fetching buildings:', buildingsRes.error);

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

      const enhancedBuildings = ((buildingsRes.data || []) as any[]).map((b) => ({
        ...b,
        panorama_360_url: b.panorama_360_url || getBuilding360Url(b),
      })) as PolyMapsBuildingWith360[];
      setBuildings(enhancedBuildings);
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

  const handleQuickAdjustStock = async (item: FoodBankItem, delta: number) => {
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
      toast.success(`Stok ${item.name}: ${item.current_stock} → ${newStock}`);
    } catch (err: any) {
      console.error('Stock adjust error:', err);
      toast.error('Gagal mengubah stok: ' + err.message);
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
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Food Bank JPP Command Center
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                    Admin
                  </span>
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

        {/* ── 2. KAD METRIK KPI SOFT MAROON & STATUS BAJET RM70K ───────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Kad 1: Bajet Rasmi RM70,000 vs Belanja Semasa */}
          <div className="p-4 rounded-3xl bg-white dark:bg-white/[0.03] border border-rose-200/70 dark:border-white/10 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-400">
                  Peruntukan Belanjawan Rasmi
                </p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  RM {budgetAllocation.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
              <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                <span className="text-slate-500 dark:text-slate-400">
                  Belanja: RM {currentSpent.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-rose-700 dark:text-rose-400">
                  {budgetUsedPercentage.toFixed(1)}% Digunakan
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-rose-700 transition-all duration-500 rounded-full"
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
          <div className="p-4 rounded-3xl bg-white dark:bg-white/[0.03] border border-blue-200/80 dark:border-white/10 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Diluluskan (Sedia Diambil)
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    {appMetrics.approved}
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">pas aktif</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
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
                className="text-[11px] font-black text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
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
            {
              id: 'budget',
              label: 'Bajet & Lejar Audit (RM70k)',
              icon: Receipt,
            },
            {
              id: 'settings',
              label: 'Tetapan Sesi & Lokasi',
              icon: Sliders,
            },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-950 dark:hover:text-white hover:bg-rose-500/10'
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
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleVerifyCounterPickup()}
                      disabled={isVerifyingCounter || !counterInput.trim()}
                      className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-md flex items-center gap-1.5 whitespace-nowrap"
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
              <div className="p-4 rounded-3xl bg-white dark:bg-white/[0.03] border border-rose-200/70 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  {(['SEMUA', 'MAKANAN', 'MINUMAN', 'KEBERSIHAN', 'KEPERLUAN_ASAS'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setItemCategoryFilter(cat)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap',
                        itemCategoryFilter === cat
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                      )}
                    >
                      {cat === 'SEMUA' ? 'Semua Kategori' : cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                      placeholder="Cari nama barangan..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

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
                {filteredItems.map(item => (
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
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white">
                          {item.category}
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
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Stok Semasa</span>
                          <p
                            className={cn(
                              'font-black text-sm',
                              item.current_stock > 20
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.current_stock > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            )}
                          >
                            {item.current_stock} {item.unit}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Kawalan Pantas Stok */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Kemas Kini:</span>
                        <div className="flex items-center gap-1">
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
                ))}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              TAB 3: PENJEJAKAN BAJET & LEJAR AUDIT (RM70,000)
             ════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'budget' && (
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
          {activeTab === 'settings' && (
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
