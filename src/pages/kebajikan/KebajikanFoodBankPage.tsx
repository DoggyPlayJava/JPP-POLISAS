/**
 * KebajikanFoodBankPage.tsx
 * Portal Permohonan Food Bank JPP untuk Mahasiswa POLISAS (SuperApp Revamp)
 * Ciri-ciri Utama:
 * - Semakan 1 Permohonan Aktif (Active Application Gating)
 * - Dwi-Pilihan Pakej: Ready Care Box (1-Sentuhan) & Smart Pantry Basket (Pilihan Bebas)
 * - Kiraan Kuota Dinamik Rakan Serumah (totalQuota, usedQuota, remainingQuota)
 * - Mobile Sticky Pantry Bottom Capsule & Slide-Up Basket Sheet
 * - Pas Pengambilan Digital Eksekutif (Digital QR Boarding Pass dengan pautan PolyMaps 360)
 * - Sifar Raw Emoji (100% Ikon Vektor Lucide)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShoppingBag,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Clock3,
  MapPin,
  Calendar,
  Users,
  Plus,
  Minus,
  Trash2,
  ExternalLink,
  QrCode,
  Search,
  Filter,
  Package,
  Layers,
  Info,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  Building,
  RefreshCw,
  Home,
  Check,
  AlertTriangle,
  Pencil,
  X,
  Download,
  UtensilsCrossed,
  Coffee,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  FoodBankSettings,
  FoodBankItem,
  FoodBankDistributionLocation,
  FoodBankApplication,
  FoodBankHousemate,
  FoodBankSelectedItem,
  FoodBankLocationStock,
} from '@/types';
import { FoodBankQrPassModal } from '@/components/foodbank/FoodBankQrPassModal';
import { Link } from 'react-router-dom';
import { getBuilding360Url } from '@/lib/polymaps360Data';
import { sendNotificationToKebajikanExco } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { buildFoodBankEmail } from '@/lib/foodbankEmail';
import {
  DEFAULT_FOODBANK_SETTINGS,
  DEFAULT_FOODBANK_ITEMS,
  DEFAULT_FOODBANK_LOCATIONS,
  loadLocalFoodBankSettings,
  FOODBANK_CATEGORY_CONFIG,
  getFoodBankStockBadge,
  generateDefaultFoodBankLocationStocks,
  DEFAULT_FOODBANK_LOCATION_STOCKS,
} from '@/lib/foodbankDefaults';

// Tab Kategori Barangan
const getCategoryTabs = (t: (key: string, fallback: string) => string) => [
  { id: 'SEMUA', label: t('kebajikan:tab_all_items', 'Semua Barangan') },
  { id: 'MAKANAN', label: t('kebajikan:tab_basic_food', 'Makanan Asas') },
  { id: 'MINUMAN', label: t('kebajikan:tab_beverages', 'Minuman') },
  { id: 'KEBERSIHAN', label: t('kebajikan:tab_personal_hygiene', 'Kebersihan Diri') },
  { id: 'LAIN_LAIN', label: t('kebajikan:tab_other_essentials', 'Keperluan Lain') },
];

// Masa Slot Pilihan Standard
const TIME_SLOTS = [
  '10:00 AM - 11:30 AM',
  '11:30 AM - 01:00 PM',
  '02:30 PM - 04:00 PM',
];

// Presets Ready Care Box (1-Sentuhan)
const getReadyCareBoxPresets = (t: (key: string, fallback: string) => string) => [
  {
    id: 'rahmah-standard',
    name: t('kebajikan:foodbank_package_rahmah_title', 'Ready Care Box: Pakej Rahmah Siswa Standard'),
    nameKey: 'foodbank_package_rahmah_title',
    tagline: t('kebajikan:foodbank_package_rahmah_tagline', '1-Sentuhan • Paling Popular & Seimbang'),
    taglineKey: 'foodbank_package_rahmah_tagline',
    badge: t('kebajikan:foodbank_package_rahmah_badge', '1-Sentuhan • Popular'),
    badgeKey: 'foodbank_package_rahmah_badge',
    description: t('kebajikan:foodbank_package_rahmah_desc', 'Pakej lengkap mengandungi Beras/Biskut, Mi Segera, Minuman Pek dan Barangan Kebersihan asas.'),
    descKey: 'foodbank_package_rahmah_desc',
    icon: Package,
    itemsList: [
      { key: 'foodbank_item_rice_staple', defaultText: t('kebajikan:foodbank_item_rice_staple', 'Beras / Makanan Asas Ruji') },
      { key: 'foodbank_item_instant_noodles_x2', defaultText: t('kebajikan:foodbank_item_instant_noodles_x2', 'Mi Segera (x2)') },
      { key: 'foodbank_item_energy_biscuits', defaultText: t('kebajikan:foodbank_item_energy_biscuits', 'Biskut Sarapan Bertenaga') },
      { key: 'foodbank_item_beverage_pack', defaultText: t('kebajikan:foodbank_item_beverage_pack', 'Minuman Pek Kopi/Malt') },
      { key: 'foodbank_item_hygiene_essentials', defaultText: t('kebajikan:foodbank_item_hygiene_essentials', 'Sabun / Keperluan Kebersihan') },
    ],
  },
  {
    id: 'express-care',
    name: t('kebajikan:foodbank_package_express_title', 'Ready Care Box: Pakej Makanan Pantas Siswa'),
    nameKey: 'foodbank_package_express_title',
    tagline: t('kebajikan:foodbank_package_express_tagline', '1-Sentuhan • Cepat Sedia'),
    taglineKey: 'foodbank_package_express_tagline',
    badge: t('kebajikan:foodbank_package_express_badge', '1-Sentuhan • Ekspres'),
    badgeKey: 'foodbank_package_express_badge',
    description: t('kebajikan:foodbank_package_express_desc', 'Pakej makanan pantas mudah disediakan untuk musim peperiksaan atau ketiadaan kemudahan memasak.'),
    descKey: 'foodbank_package_express_desc',
    icon: Sparkles,
    itemsList: [
      { key: 'foodbank_item_instant_noodles_x3', defaultText: t('kebajikan:foodbank_item_instant_noodles_x3', 'Mi Segera Aneka Perisa (x3)') },
      { key: 'foodbank_item_cracker_biscuits', defaultText: t('kebajikan:foodbank_item_cracker_biscuits', 'Biskut Kraker Sarapan') },
      { key: 'foodbank_item_condensed_milk', defaultText: t('kebajikan:foodbank_item_condensed_milk', 'Susu / Minuman Pekat Manis') },
    ],
  },
];

// Helper Ikon Kategori Bebas Emoji (100% Vektor Lucide)
export const renderCategoryIcon = (category: string, className = 'w-4 h-4') => {
  const cat = (category || '').toUpperCase();
  if (cat.includes('MAKANAN')) return <UtensilsCrossed className={className} />;
  if (cat.includes('MINUMAN')) return <Coffee className={className} />;
  if (cat.includes('KEBERSIHAN')) return <Heart className={className} />;
  return <Package className={className} />;
};

export function KebajikanFoodBankPage() {
  const { t } = useTranslation(['kebajikan', 'common']);
  const { user, profile } = useAuth();
  const CATEGORY_TABS = getCategoryTabs(t);
  const READY_CARE_BOX_PRESETS = getReadyCareBoxPresets(t);

  // Helper hantar emel Food Bank (fire-and-forget)
  const buildEmailAndSend = async (status: any, data: any, to: string) => {
    try {
      const { subject, html } = buildFoodBankEmail({ ...data, status });
      await sendEmail({ to, subject, html });
    } catch (e) {
      console.error('FoodBank email error:', e);
    }
  };

  // State data utama
  const [settings, setSettings] = useState<FoodBankSettings | null>(null);
  const [locations, setLocations] = useState<FoodBankDistributionLocation[]>(typeof window === 'undefined' ? [{ id: 'loc-main', name: t('kebajikan:foodbank_loc_main_name', 'Pusat Agihan HEP'), room_detail: t('kebajikan:foodbank_loc_main_room', 'Kaunter HEP'), operating_hours: t('kebajikan:foodbank_loc_main_hours', 'Isnin - Khamis: 10AM - 4PM'), is_active: true } as any] : []);
  const [items, setItems] = useState<FoodBankItem[]>([]);
  const [locationStocks, setLocationStocks] = useState<FoodBankLocationStock[]>([]);
  const [activeApplication, setActiveApplication] = useState<FoodBankApplication | null>(null);
  const [pastApplications, setPastApplications] = useState<FoodBankApplication[]>([]);
  const [isLoading, setIsLoading] = useState(typeof window === 'undefined' ? false : true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Modal QR Pass (Full High-Res View)
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [selectedPassApp, setSelectedPassApp] = useState<FoodBankApplication | null>(null);

  // Dwi-Mod Pemilihan Pakej: READY_BOX vs SMART_PANTRY
  const [packageMode, setPackageMode] = useState<'READY_BOX' | 'SMART_PANTRY'>('READY_BOX');

  // Slide-Up Bottom Sheet untuk Bakul Pantri Mobile
  const [showBasketSheet, setShowBasketSheet] = useState(false);

  // Form State
  const [reason, setReason] = useState('');
  const [financialCategory, setFinancialCategory] = useState<'B40' | 'M40' | 'ASNAF' | 'KECEMASAN'>('B40');
  const [householdIncome, setHouseholdIncome] = useState('');
  const [housingType, setHousingType] = useState<'KAMSIS' | 'RUMAH_SEWA' | 'SENDIRI'>('KAMSIS');
  const [roomNumber, setRoomNumber] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');

  // Pindaan Nama / No. Matrik
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [identityConfirmed, setIdentityConfirmed] = useState<boolean>(
    () => profile?.fb_identity_confirmed === true
  );
  const [fullNameOverride, setFullNameOverride] = useState('');
  const [matricOverride, setMatricOverride] = useState('');

  const defaultFullName = profile?.full_name || user?.email || '';
  const defaultMatric = profile?.matric_no || profile?.matrix_no || '';

  const effectiveName = fullNameOverride.trim() ? fullNameOverride : defaultFullName;
  const effectiveMatric = matricOverride.trim() ? matricOverride : defaultMatric;

  const hasIdentityChanged =
    fullNameOverride.trim() !== defaultFullName.trim() ||
    matricOverride.trim().toUpperCase() !== defaultMatric.trim().toUpperCase();

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
  }, [profile?.phone]);

  const openIdentityModal = () => {
    setFullNameOverride(effectiveName);
    setMatricOverride(effectiveMatric);
    setShowIdentityModal(true);
  };

  const confirmIdentity = () => {
    setIdentityConfirmed(true);
    try {
      localStorage.removeItem('fb_identity_confirmed');
    } catch {
      /* abaikan */
    }
    if (user?.id) {
      supabase
        .from('profiles')
        .update({ fb_identity_confirmed: true })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.warn('Gagal simpan fb_identity_confirmed:', error.message);
        });
    }
  };

  // Senarai Rakan Serumah
  const [housemates, setHousemates] = useState<FoodBankHousemate[]>([]);
  const [hmName, setHmName] = useState('');
  const [hmMatric, setHmMatric] = useState('');
  const [hmSearchQuery, setHmSearchQuery] = useState('');
  const [hmSuggestions, setHmSuggestions] = useState<any[]>([]);
  const [isSearchingHm, setIsSearchingHm] = useState(false);
  const [showManualHmForm, setShowManualHmForm] = useState(false);

  // Barangan Dipilih (item_id -> quantity)
  const [selectedItemQuantities, setSelectedItemQuantities] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

  // Lokasi & Slot Masa
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [pickupDate, setPickupDate] = useState<string>('');
  const [pickupTimeSlot, setPickupTimeSlot] = useState<string>(TIME_SLOTS[0]);

  // Pengakuan
  const [acknowledged, setAcknowledged] = useState(false);

  // Peta nama hari (BM) -> JS getDay()
  const DAY_NAME_TO_NUM: Record<string, number> = {
    Isnin: 1,
    Selasa: 2,
    Rabu: 3,
    Khamis: 4,
    Jumaat: 5,
  };

  const workingDays = useMemo(() => {
    const days: { dateStr: string; label: string }[] = [];

    const loc = locations.find((l) => l.id === selectedLocationId);
    const allowedDays =
      loc && loc.operating_days && loc.operating_days.length > 0
        ? loc.operating_days
            .map((d) => DAY_NAME_TO_NUM[d])
            .filter((n): n is number => typeof n === 'number')
        : [1, 2, 3, 4, 5];

    if (allowedDays.length === 0) return days;

    const current = new Date();
    let offset = 1;
    while (days.length < 5 && offset <= 30) {
      const d = new Date(current);
      d.setDate(current.getDate() + offset);
      const day = d.getDay();
      if (allowedDays.includes(day)) {
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('ms-MY', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
        days.push({ dateStr, label });
      }
      offset++;
    }
    return days;
  }, [locations, selectedLocationId]);

  // Fetch initial data (MANDATORY RULE: Promise.all)
  const fetchInitialData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [
        settingsRes,
        locationsRes,
        itemsRes,
        activeAppRes,
        pastAppsRes,
        locationStocksRes,
      ] = await Promise.all([
        supabase
          .from('foodbank_settings')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('foodbank_distribution_locations')
          .select('*, building:imaps_buildings(*)')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('foodbank_items')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('foodbank_applications')
          .select('*, location:foodbank_distribution_locations(*)')
          .eq('applicant_id', user.id)
          .in('status', ['MENUNGGU', 'DALAM_SEMAKAN', 'LULUS'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('foodbank_applications')
          .select('*, location:foodbank_distribution_locations(*)')
          .eq('applicant_id', user.id)
          .in('status', ['SELESAI', 'DITOLAK', 'BATAL'])
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('foodbank_location_stocks')
          .select('*'),
      ]);

      if (settingsRes.error) console.error('Error fetching settings:', settingsRes.error);
      if (locationsRes.error) console.error('Error fetching locations:', locationsRes.error);
      if (itemsRes.error) console.error('Error fetching items:', itemsRes.error);
      if (activeAppRes.error) console.error('Error fetching active app:', activeAppRes.error);
      if (locationStocksRes.error) console.error('Error fetching location stocks:', locationStocksRes.error);

      const finalSettings = (settingsRes.data as FoodBankSettings) || loadLocalFoodBankSettings();
      setSettings(finalSettings);

      const rawLocations =
        locationsRes.data && locationsRes.data.length > 0
          ? (locationsRes.data as FoodBankDistributionLocation[])
          : DEFAULT_FOODBANK_LOCATIONS;
      const enhancedLocations = rawLocations.map((loc) => {
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
      if (enhancedLocations.length > 0 && !selectedLocationId) {
        setSelectedLocationId(enhancedLocations[0].id);
        const firstSlots =
          enhancedLocations[0].time_slots && enhancedLocations[0].time_slots.length > 0
            ? enhancedLocations[0].time_slots
            : TIME_SLOTS;
        setPickupTimeSlot(firstSlots[0] || '');
      }

      const finalItems =
        itemsRes.data && itemsRes.data.length > 0
          ? (itemsRes.data as FoodBankItem[])
          : DEFAULT_FOODBANK_ITEMS;
      setItems(finalItems);

      const finalLocationStocks =
        locationStocksRes.data && locationStocksRes.data.length > 0
          ? (locationStocksRes.data as FoodBankLocationStock[])
          : generateDefaultFoodBankLocationStocks(finalItems, enhancedLocations);
      setLocationStocks(finalLocationStocks);

      if (activeAppRes.data) {
        setActiveApplication(activeAppRes.data as FoodBankApplication);
      } else {
        setActiveApplication(null);
      }
      if (pastAppsRes.data) {
        setPastApplications(pastAppsRes.data as FoodBankApplication[]);
      }

      if (workingDays.length > 0 && !pickupDate) {
        setPickupDate(workingDays[0].dateStr);
      }
    } catch (err) {
      console.error('Failed to load foodbank data:', err);
      toast.error(t('kebajikan:toast_foodbank_fetch_failed', 'Ralat semasa memuatkan data Food Bank.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (workingDays.length === 0) return;
    if (!pickupDate || !workingDays.some((d) => d.dateStr === pickupDate)) {
      setPickupDate(workingDays[0].dateStr);
    }
  }, [workingDays]);

  // Kiraan Kuota Dinamik:
  // Math.min(items_per_person * (1 + housemates.length), max_items_limit)
  const itemsPerPerson = settings?.max_items_per_application || 5;
  const allowHousemate = settings?.allow_housemate !== false;
  const effectiveHousemates = allowHousemate ? housemates : [];
  const maxItemsLimit = allowHousemate ? itemsPerPerson * 3 : itemsPerPerson;
  const maxAllowedItems = Math.min(
    itemsPerPerson * (1 + effectiveHousemates.length),
    maxItemsLimit
  );

  // Kuota Tokens untuk Live Tracking
  const totalQuota = maxAllowedItems;
  const totalSelectedCount = useMemo(() => {
    return Object.values(selectedItemQuantities).reduce((acc: number, q: any) => acc + (Number(q) || 0), 0);
  }, [selectedItemQuantities]);
  const usedQuota = totalSelectedCount;
  const remainingQuota = Math.max(0, totalQuota - usedQuota);

  // Nilai Anggaran Keseluruhan Barangan Dipilih
  const totalEstimatedCost = useMemo(() => {
    let cost = 0;
    for (const [itemId, qtyVal] of Object.entries(selectedItemQuantities)) {
      const qty = Number(qtyVal) || 0;
      const item = items.find((i) => i.id === itemId);
      if (item && qty > 0) {
        cost += (Number(item.estimated_cost) || 0) * qty;
      }
    }
    return cost;
  }, [selectedItemQuantities, items]);

  // Carian Pelajar POLISAS untuk Autocomplete Rakan Serumah
  const handleSearchStudent = async (query: string) => {
    setHmSearchQuery(query);
    const q = query.trim();
    if (q.length < 2) {
      setHmSuggestions([]);
      return;
    }
    setIsSearchingHm(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, matric_no, email, department')
        .or(`full_name.ilike.%${q}%,matric_no.ilike.%${q}%`)
        .limit(8);

      if (!error && data) {
        const existingMatrics = new Set(housemates.map((h) => h.ic_or_matric.toUpperCase()));
        if (profile?.matric_no) existingMatrics.add(profile.matric_no.toUpperCase());

        const filtered = data.filter((s: any) => {
          const m = (s.matric_no || s.email || '').toUpperCase();
          return !existingMatrics.has(m) && s.id !== user?.id;
        });
        setHmSuggestions(filtered);
      } else {
        setHmSuggestions([]);
      }
    } catch (err) {
      console.error('Error searching students for housemate:', err);
      setHmSuggestions([]);
    } finally {
      setIsSearchingHm(false);
    }
  };

  const handleSelectStudent = (student: any) => {
    const matric = (student.matric_no || student.email || '').toUpperCase().trim();
    const name = (student.full_name || t('kebajikan:student_polisas', 'Pelajar POLISAS')).trim();

    if (housemates.some((h) => h.ic_or_matric.toUpperCase() === matric)) {
      toast.error(t('kebajikan:toast_roommate_already_added', 'Rakan serumah dengan nombor matrik ini telah dimasukkan.'));
      return;
    }

    setHousemates([...housemates, { name, ic_or_matric: matric }]);
    setHmSearchQuery('');
    setHmSuggestions([]);
    setHmName('');
    setHmMatric('');
    toast.success(t('kebajikan:toast_roommate_added_success', '{{name}} berjaya ditambah! Kuota anda meningkat.', { name }));
  };

  const handleAddHousemate = () => {
    const trimmedName = hmName.trim();
    const trimmedMatric = hmMatric.trim().toUpperCase();

    if (!trimmedName || !trimmedMatric) {
      toast.error(t('kebajikan:toast_roommate_input_required', 'Sila masukkan nama dan nombor matrik rakan serumah.'));
      return;
    }

    if (housemates.some((h) => h.ic_or_matric.toUpperCase() === trimmedMatric)) {
      toast.error(t('kebajikan:toast_roommate_already_added', 'Rakan serumah dengan nombor matrik ini telah dimasukkan.'));
      return;
    }

    setHousemates([...housemates, { name: trimmedName, ic_or_matric: trimmedMatric }]);
    setHmName('');
    setHmMatric('');
    toast.success(t('kebajikan:toast_roommate_added_success', 'Rakan serumah ditambah! Kuota anda meningkat.', { name: 'Rakan serumah' }));
  };

  const handleRemoveHousemate = (index: number) => {
    const updated = [...housemates];
    updated.splice(index, 1);
    setHousemates(updated);
    toast.success(t('kebajikan:toast_roommate_removed', 'Rakan serumah dikeluarkan.'));
  };

  // Helper Baki Stok di Lokasi Terpilih
  const getItemStockAtSelectedLocation = (itemId: string): number => {
    if (!selectedLocationId) return 0;
    const locStock = locationStocks.find(
      (ls) => ls.item_id === itemId && ls.location_id === selectedLocationId
    );
    if (!locStock) return 0;
    return Math.max(0, locStock.current_stock - (locStock.reserved_stock || 0));
  };

  // Helper Lokasi Alternatif yang Mempunyai Baki Stok
  const getAlternativeLocationWithStock = (itemId: string): string | null => {
    const alt = locationStocks.find(
      (ls) =>
        ls.item_id === itemId &&
        ls.location_id !== selectedLocationId &&
        ls.current_stock - (ls.reserved_stock || 0) > 0
    );
    if (!alt) return null;
    const loc = locations.find((l) => l.id === alt.location_id);
    return loc ? loc.name : null;
  };

  const selectedLocationName = useMemo(() => {
    const loc = locations.find((l) => l.id === selectedLocationId);
    return loc ? loc.name : t('kebajikan:selected_distribution_center', 'Pusat Edaran Terpilih');
  }, [locations, selectedLocationId]);

  const activeTimeSlots = useMemo(() => {
    const loc = locations.find((l) => l.id === selectedLocationId);
    if (loc && loc.time_slots && loc.time_slots.length > 0) {
      return loc.time_slots;
    }
    return TIME_SLOTS;
  }, [locations, selectedLocationId]);

  const handleLocationChange = (newLocationId: string) => {
    if (newLocationId === selectedLocationId) return;
    setSelectedLocationId(newLocationId);

    const newLoc = locations.find((l) => l.id === newLocationId);
    const slots =
      newLoc && newLoc.time_slots && newLoc.time_slots.length > 0
        ? newLoc.time_slots
        : TIME_SLOTS;
    setPickupTimeSlot(slots[0] || '');

    let hasAdjusted = false;
    const updatedQuantities = { ...selectedItemQuantities };

    for (const [itemId, qtyVal] of Object.entries(selectedItemQuantities)) {
      const qty = Number(qtyVal) || 0;
      if (qty <= 0) continue;
      const locStock = locationStocks.find(
        (ls) => ls.item_id === itemId && ls.location_id === newLocationId
      );
      const available = locStock
        ? Math.max(0, locStock.current_stock - (locStock.reserved_stock || 0))
        : 0;
      if (qty > available) {
        hasAdjusted = true;
        if (available <= 0) {
          delete updatedQuantities[itemId];
        } else {
          updatedQuantities[itemId] = available;
        }
      }
    }

    if (hasAdjusted) {
      setSelectedItemQuantities(updatedQuantities);
      toast(t('kebajikan:toast_items_adjusted_for_location_stock', 'Kuantiti barangan diselaraskan mengikut stok lokasi yang dipilih.'));
    }
  };

  // Ubah Kuantiti Barangan (+ / -)
  const handleItemQuantityChange = (item: FoodBankItem, delta: number) => {
    const currentQty = selectedItemQuantities[item.id] || 0;
    const newQty = currentQty + delta;
    const availableStock = getItemStockAtSelectedLocation(item.id);

    if (delta > 0) {
      if (newQty > availableStock) {
        toast.error(t('kebajikan:toast_stock_insufficient', 'Baki stok bagi "{{item}}" di pusat ini hanya tinggal {{stock}} unit.', { item: item.name, stock: availableStock }));
        return;
      }
      if (totalSelectedCount >= maxAllowedItems) {
        toast.error(t('kebajikan:toast_quota_limit_reached', 'Had kuota kelayakan ({{limit}} unit barangan) telah dicapai.', { limit: maxAllowedItems }));
        return;
      }
    }

    if (newQty <= 0) {
      const updated = { ...selectedItemQuantities };
      delete updated[item.id];
      setSelectedItemQuantities(updated);
    } else {
      setSelectedItemQuantities({
        ...selectedItemQuantities,
        [item.id]: newQty,
      });
    }
  };

  // 1-Sentuhan Pilihan Pakej Segera (Ready Care Box Selection Logic)
  const handleSelectReadyCareBox = (presetId: string) => {
    if (settings?.is_application_open === false || settings?.is_module_active === false) {
      toast.error(t('kebajikan:toast_session_closed', 'Sesi permohonan ditutup buat masa ini.'));
      return;
    }

    const availableItems = items.filter((it) => getItemStockAtSelectedLocation(it.id) > 0);
    if (availableItems.length === 0) {
      toast.error(t('kebajikan:toast_no_stock_available', 'Maaf, tiada baki stok barangan di pusat edaran terpilih.'));
      return;
    }

    const newQuantities: Record<string, number> = {};
    let allocatedCount = 0;
    const targetQuota = maxAllowedItems;

    if (presetId === 'express-care') {
      const noodles = availableItems.filter(
        (i) =>
          i.name.toLowerCase().includes('mi') ||
          i.name.toLowerCase().includes('maggi')
      );
      const biscuits = availableItems.filter(
        (i) =>
          i.name.toLowerCase().includes('biskut') ||
          i.name.toLowerCase().includes('roti')
      );
      const drinks = availableItems.filter((i) =>
        (i.category || '').toUpperCase().includes('MINUMAN')
      );
      const others = availableItems.filter(
        (i) => !noodles.includes(i) && !biscuits.includes(i) && !drinks.includes(i)
      );

      const pool = [...noodles, ...biscuits, ...drinks, ...others];
      for (const item of pool) {
        if (allocatedCount >= targetQuota) break;
        const stock = getItemStockAtSelectedLocation(item.id);
        const toAdd = Math.min(stock, targetQuota - allocatedCount, 2);
        if (toAdd > 0) {
          newQuantities[item.id] = toAdd;
          allocatedCount += toAdd;
        }
      }
    } else {
      // Pakej Rahmah Siswa Standard: Makanan ruji, mi segera, biskut, minuman, kebersihan
      const staple = availableItems.filter(
        (i) =>
          i.name.toLowerCase().includes('beras') ||
          i.name.toLowerCase().includes('minyak') ||
          i.name.toLowerCase().includes('tepung')
      );
      const noodles = availableItems.filter(
        (i) =>
          i.name.toLowerCase().includes('mi') ||
          i.name.toLowerCase().includes('maggi')
      );
      const biscuits = availableItems.filter(
        (i) =>
          i.name.toLowerCase().includes('biskut') ||
          i.name.toLowerCase().includes('sardin')
      );
      const drinks = availableItems.filter((i) =>
        (i.category || '').toUpperCase().includes('MINUMAN')
      );
      const hygiene = availableItems.filter((i) =>
        (i.category || '').toUpperCase().includes('KEBERSIHAN')
      );
      const remaining = availableItems.filter(
        (i) =>
          !staple.includes(i) &&
          !noodles.includes(i) &&
          !biscuits.includes(i) &&
          !drinks.includes(i) &&
          !hygiene.includes(i)
      );

      const categoryClusters = [staple, noodles, biscuits, drinks, hygiene, remaining];
      for (const cluster of categoryClusters) {
        for (const item of cluster) {
          if (allocatedCount >= targetQuota) break;
          const stock = getItemStockAtSelectedLocation(item.id);
          if (stock > 0 && !newQuantities[item.id]) {
            const toAdd = Math.min(stock, 1);
            newQuantities[item.id] = toAdd;
            allocatedCount += toAdd;
          }
        }
      }

      // Top up baki kuota jika ada baki
      for (const item of availableItems) {
        if (allocatedCount >= targetQuota) break;
        const stock = getItemStockAtSelectedLocation(item.id);
        const cur = newQuantities[item.id] || 0;
        if (stock > cur) {
          const canAdd = Math.min(stock - cur, targetQuota - allocatedCount);
          newQuantities[item.id] = cur + canAdd;
          allocatedCount += canAdd;
        }
      }
    }

    setSelectedItemQuantities(newQuantities);
    toast.success(
      t('kebajikan:toast_ready_box_loaded', 'Ready Care Box berjaya dimuatkan ({{count}} item). Sila sahkan lokasi & slot masa.', { count: allocatedCount })
    );

    // Bawa pelajar terus ke langkah pengesahan lokasi & slot masa
    const pickupEl = document.getElementById('section-pickup-location');
    if (pickupEl) {
      pickupEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter Katalog Barangan
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeCategory !== 'SEMUA') {
        const itemCat = (item.category || '').toUpperCase();
        if (activeCategory === 'MAKANAN' && !itemCat.includes('MAKANAN')) return false;
        if (activeCategory === 'MINUMAN' && !itemCat.includes('MINUMAN')) return false;
        if (activeCategory === 'KEBERSIHAN' && !itemCat.includes('KEBERSIHAN')) return false;
        if (
          activeCategory === 'LAIN_LAIN' &&
          (itemCat.includes('MAKANAN') ||
            itemCat.includes('MINUMAN') ||
            itemCat.includes('KEBERSIHAN'))
        ) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [items, activeCategory, searchQuery]);

  // Batalkan Permohonan Aktif
  const handleCancelActiveApp = async (appId: string) => {
    if (!user) return;
    const confirmed = window.confirm(
      t('kebajikan:confirm_cancel_foodbank_app', 'Adakah anda pasti ingin membatalkan permohonan Food Bank ini? Tindakan ini tidak boleh diundur.')
    );
    if (!confirmed) return;

    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('foodbank_applications')
        .update({
          status: 'BATAL',
          updated_at: new Date().toISOString(),
        })
        .eq('id', appId)
        .eq('applicant_id', user.id);

      if (error) throw error;

      try {
        await supabase.rpc('release_foodbank_stock', { p_application_id: appId });
      } catch {
        /* abaikan */
      }

      toast.success(t('kebajikan:toast_foodbank_cancelled', 'Permohonan Food Bank telah dibatalkan.'));
      await fetchInitialData();
    } catch (err: any) {
      console.error('Error cancelling application:', err);
      toast.error(t('kebajikan:toast_cancel_failed', 'Gagal membatalkan permohonan') + ': ' + (err.message || t('kebajikan:please_try_again', 'Sila cuba lagi.')));
    } finally {
      setIsCancelling(false);
    }
  };

  // Hantar Permohonan Baru
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(t('kebajikan:toast_login_required', 'Sila log masuk terlebih dahulu.'));
      return;
    }

    if (settings?.is_application_open === false) {
      toast.error(t('kebajikan:toast_session_closed', 'Permohonan Food Bank ditutup buat masa ini.'));
      return;
    }

    if (activeApplication) {
      toast.error(t('kebajikan:toast_active_application_exists', 'Anda sudah mempunyai permohonan aktif yang sedang diproses.'));
      return;
    }

    if (!reason.trim()) {
      toast.error(t('kebajikan:toast_reason_required', 'Sila nyatakan sebab permohonan bantuan.'));
      return;
    }

    if (!roomNumber.trim()) {
      toast.error(t('kebajikan:toast_room_no_required', 'Sila nyatakan nombor bilik atau nama rumah kediaman.'));
      return;
    }

    if (!phone.trim()) {
      toast.error(t('kebajikan:toast_phone_required', 'Sila isikan nombor telefon.'));
      return;
    }

    if (!/^[0-9+\-\s]{9,15}$/.test(phone.trim())) {
      toast.error(t('kebajikan:toast_phone_invalid', 'Nombor telefon tidak sah.'));
      return;
    }

    if (totalSelectedCount === 0) {
      toast.error(t('kebajikan:toast_select_at_least_one_item', 'Sila pilih sekurang-kurangnya 1 item daripada katalog barangan.'));
      return;
    }

    if (totalSelectedCount > maxAllowedItems) {
      toast.error(t('kebajikan:toast_exceeds_max_quota', 'Pilihan melebihi had kuota maksimum ({{max}} item).', { max: maxAllowedItems }));
      return;
    }

    if (!selectedLocationId) {
      toast.error(t('kebajikan:toast_distribution_center_required', 'Sila pilih pusat agihan / lokasi pengambilan.'));
      return;
    }

    if (!pickupDate) {
      toast.error(t('kebajikan:toast_pickup_date_required', 'Sila pilih tarikh pengambilan.'));
      return;
    }

    if (!acknowledged) {
      toast.error(t('kebajikan:toast_declaration_required', 'Sila sahkan perakuan permohonan terlebih dahulu.'));
      return;
    }

    // Semak baki stok lokasi bagi setiap item sebelum hantar
    for (const [itemId, qtyVal] of Object.entries(selectedItemQuantities)) {
      const qty = Number(qtyVal) || 0;
      if (qty <= 0) continue;
      const itm = items.find((i) => i.id === itemId);
      const avail = getItemStockAtSelectedLocation(itemId);
      if (qty > avail) {
        toast.error(
          t('kebajikan:toast_stock_insufficient', 'Kuantiti bagi "{{item}}" melebihi baki stok lokasi terkini ({{stock}} unit).', { item: itm?.name || 'barangan', stock: avail })
        );
        return;
      }
    }

    const selectedItemsList: FoodBankSelectedItem[] = [];
    for (const [itemId, qtyVal] of Object.entries(selectedItemQuantities)) {
      const qty = Number(qtyVal) || 0;
      const itm = items.find((i) => i.id === itemId);
      if (itm && qty > 0) {
        selectedItemsList.push({
          item_id: itm.id,
          item_name: itm.name,
          quantity: qty,
          unit: itm.unit || 'unit',
          estimated_cost: Number(itm.estimated_cost) || 0,
        });
      }
    }

    const pickupToken = `FB-POLISAS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const appNo = `APP-FB-${Date.now().toString(36).toUpperCase()}`;

    setIsSubmitting(true);
    try {
      const { data: insertedApp, error: insertError } = await supabase
        .from('foodbank_applications')
        .insert([
          {
            application_no: appNo,
            applicant_id: user.id,
            status: 'MENUNGGU',
            reason: reason.trim(),
            financial_category: financialCategory,
            household_income: householdIncome ? parseFloat(householdIncome) : null,
            housing_type: housingType,
            housemates: effectiveHousemates,
            selected_items: selectedItemsList,
            location_id: selectedLocationId,
            pickup_date: pickupDate,
            pickup_time_slot: pickupTimeSlot,
            pickup_qr_code: pickupToken,
            total_estimated_value: totalEstimatedCost,
            applicant_name_override: hasIdentityChanged ? fullNameOverride.trim() : null,
            applicant_matric_override: hasIdentityChanged ? matricOverride.trim().toUpperCase() : null,
            requires_counter_verification: hasIdentityChanged,
          },
        ])
        .select('*, location:foodbank_distribution_locations(*)')
        .single();

      if (insertError) throw insertError;

      const newApp = insertedApp as FoodBankApplication;

      try {
        const { error: reserveErr } = await supabase.rpc('reserve_foodbank_stock', {
          p_application_id: newApp.id,
        });
        if (reserveErr) throw reserveErr;
      } catch (reserveErr: any) {
        try {
          await supabase.from('foodbank_applications').delete().eq('id', newApp.id);
        } catch {
          /* abaikan */
        }
        toast.error(
          t('kebajikan:toast_no_stock_available', 'Maaf, stok barangan telah habis atau tidak mencukupi. Sila semak semula pilihan anda.')
        );
        throw new Error('STOCK_INSUFFICIENT');
      }

      toast.success(t('kebajikan:toast_foodbank_submitted', 'Permohonan Food Bank berjaya dihantar!'));

      if (phone.trim() && phone.trim() !== (profile?.phone || '')) {
        supabase
          .from('profiles')
          .update({ phone: phone.trim() })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.error('Gagal simpan telefon:', error.message);
          });
      }

      const studentEmail = profile?.email || user?.email;

      sendNotificationToKebajikanExco({
        title: t('kebajikan:notif_foodbank_new_title', 'Permohonan Food Bank Baru'),
        message: t('kebajikan:notif_foodbank_new_msg', '{{name}} menghantar permohonan {{appNo}}.', { name: profile?.full_name || t('kebajikan:student_fallback_mahasiswa', 'Mahasiswa'), appNo }),
        type: 'FOODBANK_SUBMISSION',
        module: 'KEBAJIKAN',
        link: '/jpp/foodbank',
        reference_id: newApp?.id,
        actor_name: profile?.full_name || undefined,
      }).catch(() => {});

      if (studentEmail) {
        buildEmailAndSend(
          'MENUNGGU',
          {
            studentName: profile?.full_name || user?.email || 'Mahasiswa',
            matricNo: profile?.matric_no,
            applicationNo: appNo,
            programme: profile?.programme_code,
            items: selectedItemsList,
            pickupDate: pickupDate,
            pickupTime: pickupTimeSlot,
            location: selectedLocationName,
          },
          studentEmail
        ).catch(() => {});
      }

      setActiveApplication(newApp);
      setSelectedPassApp(newApp);
      setPassModalOpen(true);

      setReason('');
      setHouseholdIncome('');
      setRoomNumber('');
      setHousemates([]);
      setSelectedItemQuantities({});
      setAcknowledged(false);

      await fetchInitialData();
    } catch (err: any) {
      console.error('Failed to submit foodbank application:', err);
      if (err?.message !== 'STOCK_INSUFFICIENT') {
        toast.error(t('kebajikan:toast_submit_failed', 'Gagal menghantar permohonan') + ': ' + (err.message || t('kebajikan:please_try_again', 'Sila cuba lagi.')));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-spin text-amber-500">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 animate-pulse">
          {t('kebajikan:loading_foodbank_portal', 'Memuatkan Portal Food Bank...')}
        </p>
      </div>
    );
  }

  const isModuleUnderPreparation = settings?.is_module_active === false;
  const isApplicationWindowClosed = settings?.is_application_open === false;
  const isSessionClosed = isModuleUnderPreparation || isApplicationWindowClosed;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-8 select-none">
      {/* ── Top Breadcrumb & Header ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Link
            to="/kebajikan"
            className="hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Hab E-Kebajikan</span>
          </Link>
          <span>/</span>
          <span className="text-amber-600 dark:text-amber-400">{t('kebajikan:nav_foodbank', 'Food Bank JPP')}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {t('kebajikan:foodbank_header_badge')}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {t('foodbank_pantry')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl font-normal">
              {t('kebajikan:foodbank_header_desc')}
            </p>
          </div>

          {activeApplication && (
            <Button
              onClick={() => {
                setSelectedPassApp(activeApplication);
                setPassModalOpen(true);
              }}
              className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-bold rounded-2xl gap-2 shadow-lg shadow-emerald-500/20 flex-shrink-0 animate-pulse"
            >
              <QrCode className="w-4 h-4" />
              <span>{t('kebajikan:foodbank_pass_button')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Status Modul Dalam Persediaan / Sesi Ditutup ── */}
      {isModuleUnderPreparation ? (
        <div className="rounded-2xl p-4 sm:p-5 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3.5">
          <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                {t('kebajikan:foodbank_prep_badge')}
              </span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                {t('kebajikan:foodbank_prep_title')}
              </span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-normal pt-0.5">
              {t('kebajikan:foodbank_prep_desc')}
            </p>
          </div>
        </div>
      ) : isApplicationWindowClosed ? (
        <div className="rounded-2xl p-4 sm:p-5 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3.5">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold">{t('kebajikan:foodbank_closed_title')}</h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-normal">
              {t('kebajikan:foodbank_closed_desc')}
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Pas Pengambilan Digital (Digital QR Boarding Pass Moden) ── */}
      {activeApplication ? (
        <div className="rounded-3xl bg-slate-900 text-white border border-amber-500/40 shadow-2xl relative overflow-hidden">
          {/* Subtle Accent Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full  pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full  pointer-events-none" />

          {/* Boarding Pass Header Strip */}
          <div className="p-6 sm:p-7 border-b border-white/10 bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    {t('kebajikan:foodbank_digital_pass')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                    POLISAS PRIHATIN
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                  {t('kebajikan:foodbank_ref_no')}: {activeApplication.application_no}
                </h3>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-2',
                  activeApplication.status === 'LULUS'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.3)]'
                    : activeApplication.status === 'DALAM_SEMAKAN'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    activeApplication.status === 'LULUS'
                      ? 'bg-emerald-400 animate-ping'
                      : activeApplication.status === 'DALAM_SEMAKAN'
                      ? 'bg-sky-400'
                      : 'bg-amber-400'
                  )}
                />
                <span>
                  {activeApplication.status === 'LULUS'
                    ? t('kebajikan:foodbank_status_ready')
                    : activeApplication.status === 'DALAM_SEMAKAN'
                    ? t('kebajikan:foodbank_status_review')
                    : t('kebajikan:foodbank_status_pending')}
                </span>
              </span>
            </div>
          </div>

          {/* Ticket Perforation / Divider */}
          <div className="relative py-1">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-950 border-r border-amber-500/40" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-950 border-l border-amber-500/40" />
            <div className="border-t-2 border-dashed border-white/15 mx-6" />
          </div>

          {/* Boarding Pass Body: Details + QR Stub */}
          <div className="p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Details & Manifest (8 cols) */}
            <div className="lg:col-span-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Venue & PolyMaps 360 */}
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('kebajikan:foodbank_dist_location', 'Lokasi Pengagihan')}</span>
                  </div>
                  <p className="font-extrabold text-sm text-white">
                    {activeApplication.location?.name || t('kebajikan:foodbank_loc_jhep_default', 'Pusat Edaran Kaunter JHEP')}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {activeApplication.location?.room_detail || t('kebajikan:foodbank_loc_admin_bldg_default', 'Bangunan Pentadbiran Utama')}
                  </p>

                  {/* Direct PolyMaps 360 Link */}
                  {(() => {
                    const targetParam =
                      activeApplication.location?.polymaps_building_id ||
                      (activeApplication.location as any)?.building_id ||
                      activeApplication.location?.name;
                    const polymapsUrl = targetParam
                      ? `/polymaps?b=${encodeURIComponent(targetParam)}`
                      : '/polymaps';
                    return (
                      <div className="pt-1">
                        <Link
                          to={polymapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold hover:bg-teal-500/30 transition-all group"
                        >
                          <span>{t('kebajikan:foodbank_polymaps_360')}</span>
                          <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    );
                  })()}
                </div>

                {/* Time Slot & Date */}
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('kebajikan:foodbank_timeslot')}</span>
                  </div>
                  <p className="font-extrabold text-sm text-white">
                    {activeApplication.pickup_date
                      ? new Date(activeApplication.pickup_date).toLocaleDateString('ms-MY', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : t('kebajikan:to_be_coordinated', 'Akan Diselaraskan')}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{activeApplication.pickup_time_slot || '10:00 AM - 04:00 PM'}</span>
                  </div>
                </div>
              </div>

              {/* Package Summary / Senarai Barangan */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-400" />
                    <span>{t('kebajikan:foodbank_eligible_items')}:</span>
                  </span>
                </div>

                {activeApplication.selected_items && activeApplication.selected_items.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {activeApplication.selected_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between"
                      >
                        <span className="text-slate-200 truncate mr-2 font-medium">
                          {item.item_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px] shrink-0">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">{t('kebajikan:foodbank_standard_package_desc', 'Pakej standard keperluan asas mahasiswa.')}</p>
                )}
              </div>
            </div>

            {/* Right Column: QR Stub (4 cols) */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-3 bg-white rounded-2xl shadow-xl">
                <QRCodeSVG
                  value={activeApplication.pickup_qr_code || activeApplication.application_no}
                  size={140}
                  level="H"
                  includeMargin
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <span className="block font-mono text-xs font-black text-amber-400 tracking-wider">
                  {activeApplication.pickup_qr_code || activeApplication.application_no}
                </span>
                <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                  {t('kebajikan:foodbank_qr_scan_hint')}
                </p>
              </div>
            </div>
          </div>

          {/* Boarding Pass Actions */}
          <div className="p-4 sm:p-6 bg-white/[0.02] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{t('kebajikan:foodbank_bring_matric_card')}</span>
            </div>

            <div className="flex items-center gap-2.5">
              {activeApplication.status === 'MENUNGGU' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isCancelling}
                  onClick={() => handleCancelActiveApp(activeApplication.id)}
                  className="h-10 text-xs font-bold text-rose-400 border-rose-500/30 hover:bg-rose-500/10 rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>{isCancelling ? t('kebajikan:foodbank_cancelling') : t('kebajikan:foodbank_cancel_application')}</span>
                </Button>
              )}

              <Button
                onClick={() => {
                  setSelectedPassApp(activeApplication);
                  setPassModalOpen(true);
                }}
                className="h-10 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl gap-2 shadow-lg shadow-amber-500/20 text-xs"
              >
                <Download className="w-4 h-4" />
                <span>{t('kebajikan:foodbank_download_pass', 'Muat Turun / Tangkap Layar Pas')}</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Borang Permohonan Baru ── */
        <form onSubmit={handleSubmitApplication} className="space-y-8">
          {/* Arahan & Syarat Kelayakan */}
          <div className="rounded-3xl p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{t('kebajikan:foodbank_criteria_title')}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="space-y-1.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {t('kebajikan:foodbank_criteria_label')}
                </span>
                <p className="leading-relaxed font-normal">
                  {settings?.eligibility_criteria ||
                    t('kebajikan:foodbank_default_eligibility_criteria', 'Terbuka kepada semua mahasiswa POLISAS yang memerlukan bantuan makanan/keperluan asas (keutamaan kepada kategori B40, asnaf, atau kecemasan).')}
                </p>
              </div>
              <div className="space-y-1.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {t('kebajikan:foodbank_guidelines_label')}
                </span>
                <p className="leading-relaxed font-normal">
                  {settings?.application_instructions ||
                    t('kebajikan:foodbank_default_application_instructions', 'Sila bawa Pas Pengambilan Digital (QR) ke lokasi agihan pada tarikh & slot masa yang dipilih untuk diimbas oleh petugas kaunter.')}
                </p>
              </div>
            </div>
          </div>

          {/* ── Bahagian 1: Maklumat Pemohon & Status Kewangan ── */}
          <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs">
                1
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {t('kebajikan:foodbank_step1_title')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('kebajikan:foodbank_step1_desc')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('kebajikan:foodbank_full_name')}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    disabled
                    value={effectiveName}
                    className="bg-slate-50 dark:bg-slate-800/60 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('kebajikan:foodbank_matric_no')}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    disabled
                    value={effectiveMatric}
                    className="bg-slate-50 dark:bg-slate-800/60 font-mono font-medium"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={openIdentityModal}
                  disabled={isSessionClosed}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t('kebajikan:foodbank_fix_name_matric', 'Betulkan Nama / No. Matrik')}
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('kebajikan:foodbank_phone')} <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="tel"
                  placeholder="Contoh: 011-2345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSessionClosed}
                  required
                  className="rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('foodbank_eligibility')}
                </label>
                <select
                  value={financialCategory}
                  onChange={(e) => setFinancialCategory(e.target.value as any)}
                  disabled={isSessionClosed}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="B40">{t('kebajikan:income_b40', 'B40 (Pendapatan < RM4,850)')}</option>
                  <option value="M40">{t('kebajikan:income_m40', 'M40 (Pendapatan RM4,850 - RM10,959)')}</option>
                  <option value="ASNAF">{t('kebajikan:foodbank_financial_asnaf', 'Asnaf / Bantuan Zakat')}</option>
                  <option value="KECEMASAN">{t('kebajikan:foodbank_emergency_option', 'Kecemasan / Ketiadaan Wang Saku')}</option>
                </select>
              </div>
            </div>

            {hasIdentityChanged && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  {t('kebajikan:identity_changed_warning', 'Anda telah mengubah Nama atau No. Matrik. Sila bawa kad matrik fizikal semasa pengambilan Food Bank — pegawai kaunter akan membuat pengesahan.')}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('kebajikan:foodbank_household_income')}
                </label>
                <Input
                  type="number"
                  placeholder="Contoh: 1800"
                  value={householdIncome}
                  onChange={(e) => setHouseholdIncome(e.target.value)}
                  disabled={isSessionClosed}
                  className="rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('kebajikan:foodbank_reason')} <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder={t('kebajikan:foodbank_reason_placeholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSessionClosed}
                  required
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* ── Bahagian 2: Maklumat Kediaman & Kuota Dinamik Rakan Serumah ── */}
          <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs">
                2
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {t('kebajikan:foodbank_roommates_title')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('kebajikan:foodbank_roommates_desc')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('kebajikan:foodbank_housing_type')}
                </label>
                <select
                  value={housingType}
                  onChange={(e) => setHousingType(e.target.value as any)}
                  disabled={isSessionClosed}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="KAMSIS">{t('kebajikan:housing_kamsis', 'Kolej Kediaman Siswa (Kamsis Dalam Kampus)')}</option>
                  <option value="RUMAH_SEWA">{t('kebajikan:housing_rented_house', 'Rumah Sewa Luar Kampus')}</option>
                  <option value="SENDIRI">{t('kebajikan:housing_own_commute', 'Kediaman Sendiri / Ulang-Alik')}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('kebajikan:foodbank_room_no')} <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder={t('kebajikan:housing_address_placeholder', 'Contoh: Blok B3-12 (Kamsis) atau No 14, Lorong Semambu')}
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  disabled={isSessionClosed}
                  required
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            {allowHousemate && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-extrabold text-slate-900 dark:text-white">
                      {t('kebajikan:foodbank_residence_housemate_quota_title', 'Maklumat Kediaman & Kuota Rakan Serumah')}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('kebajikan:foodbank_housemate_quota_desc', 'Setiap rakan serumah yang ditambah akan meningkatkan had kuota barangan anda (+{{count}} barangan).', { count: itemsPerPerson })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualHmForm(!showManualHmForm)}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    {showManualHmForm ? t('kebajikan:btn_close_manual', 'Tutup Manual') : t('kebajikan:btn_input_manual', 'Input Manual')}
                  </button>
                </div>

                <div className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder={t('kebajikan:housing_search_roommate_placeholder', 'Ketik Nama atau No. Matrik kawan (Cth: 06DKM... atau Ali)...')}
                      value={hmSearchQuery}
                      onChange={(e) => handleSearchStudent(e.target.value)}
                      disabled={isSessionClosed}
                      className="pl-10 pr-10 text-xs rounded-xl h-10 bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40 focus:ring-amber-500 font-medium placeholder:text-slate-400"
                    />
                    {isSearchingHm && (
                      <RefreshCw className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-600 animate-spin" />
                    )}
                  </div>

                  <AnimatePresence>
                    {hmSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80"
                      >
                        <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          {t('kebajikan:housing_select_student_count', 'Pilih Pelajar ({{count}} dijumpai)', { count: hmSuggestions.length })}
                        </div>
                        {hmSuggestions.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => handleSelectStudent(st)}
                            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors group"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                {st.full_name?.charAt(0) || 'P'}
                              </div>
                              <div className="truncate">
                                <p className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                                  {st.full_name}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                  <span className="font-mono font-semibold">{st.matric_no || st.email}</span>
                                  {st.department && <span>• {st.department}</span>}
                                </div>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/40 px-2 py-0.5 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-all shrink-0">
                              <Plus className="w-3 h-3" /> {t('kebajikan:btn_add', 'Tambah')}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {hmSearchQuery.trim().length >= 2 && !isSearchingHm && hmSuggestions.length === 0 && (
                    <div className="text-[11px] text-slate-400 mt-1 pl-1">
                      {t('kebajikan:foodbank_no_matching_student_msg', 'Tiada pelajar sepadan ditemui dalam sistem. Anda boleh guna')}{' '}
                      <button
                        type="button"
                        onClick={() => setShowManualHmForm(true)}
                        className="font-bold text-amber-600 underline"
                      >
                        {t('kebajikan:foodbank_manual_form_btn', 'borang manual')}
                      </button>
                      .
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {showManualHmForm && (
                    <motion.div
                      initial={{ opacity: 0, }}
                      animate={{ opacity: 1, }}
                      exit={{ opacity: 0, }}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 overflow-hidden"
                    >
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {t('kebajikan:foodbank_manual_housemate_form_label', 'Borang Manual Rakan Serumah:')}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <Input
                          placeholder={t('kebajikan:foodbank_friend_full_name_ph', 'Nama Penuh Rakan')}
                          value={hmName}
                          onChange={(e) => setHmName(e.target.value)}
                          disabled={isSessionClosed}
                          className="text-xs rounded-xl"
                        />
                        <Input
                          placeholder={t('kebajikan:foodbank_friend_matric_ph', 'No. Matrik (Cth: 06DKM23F1001)')}
                          value={hmMatric}
                          onChange={(e) => setHmMatric(e.target.value)}
                          disabled={isSessionClosed}
                          className="text-xs font-mono rounded-xl"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddHousemate}
                          disabled={isSessionClosed}
                          className="h-10 text-xs font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 rounded-xl gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('kebajikan:foodbank_add_manual_btn', 'Tambah Manual')}</span>
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {housemates.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    {housemates.map((hm, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-2.5 flex items-center justify-between text-xs bg-slate-50/60 dark:bg-slate-800/40"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {hm.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            ({hm.ic_or_matric})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveHousemate(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title={t('common:delete', 'Padam')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Widget Kiraan Kuota Dinamik Langsung (Smart Quota Tracking) ── */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div>
                  <span className="font-black uppercase tracking-wider text-[11px]">
                    {t('kebajikan:foodbank_formula_quota_title', 'Formula Kelayakan Kuota:')}
                  </span>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                    {t('kebajikan:foodbank_formula_quota_calc', '{{base}} unit asas + {{extra}} unit per rakan serumah (Had maksimum: {{max}} unit)', { base: itemsPerPerson, extra: itemsPerPerson, max: maxItemsLimit })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold">{t('kebajikan:foodbank_max_eligibility_label', 'Kelayakan Maksimum:')}</span>
                  <span className="ml-1.5 px-2.5 py-0.5 rounded-lg bg-amber-600 text-white font-black font-mono text-xs">
                    {t('kebajikan:foodbank_items_count_label', '{{count}} Barangan', { count: maxAllowedItems })}
                  </span>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>
                    {t('kebajikan:total_items_selected_label', 'Jumlah Barangan Dipilih:')}{' '}
                    <span className="font-mono text-amber-600 dark:text-amber-400">
                      {totalSelectedCount}
                    </span>{' '}
                    / {totalQuota} {t('kebajikan:foodbank_unit_count', 'unit')}
                  </span>
                  <span
                    className={cn(
                      totalSelectedCount > totalQuota
                        ? 'text-rose-600 font-black'
                        : totalSelectedCount === totalQuota
                        ? 'text-emerald-600 font-black'
                        : 'text-amber-700 dark:text-amber-300'
                    )}
                  >
                    {totalSelectedCount > totalQuota
                      ? t('kebajikan:foodbank_quota_exceeded', 'Melebihi Kuota!')
                      : totalSelectedCount === totalQuota
                      ? t('kebajikan:quota_full', 'Kuota Penuh')
                      : t('kebajikan:quota_remaining_label', '{{count}} baki kuota', { count: remainingQuota })}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-amber-200/60 dark:bg-amber-950/60 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-300 rounded-full',
                      totalSelectedCount > totalQuota
                        ? 'bg-rose-500'
                        : totalSelectedCount === totalQuota
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    )}
                    style={{
                      width: `${Math.min((totalSelectedCount / totalQuota) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Bahagian 3: Lokasi Agihan & Slot Waktu Pengambilan ── */}
          <div
            id="section-pickup-location"
            className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 scroll-mt-20"
          >
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs">
                3
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {t('kebajikan:foodbank_section_pickup', '3. Lokasi Agihan & Slot Waktu Pengambilan')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('kebajikan:foodbank_section_pickup_desc', 'Pilih pusat edaran dan waktu temujanji terlebih dahulu supaya baki ketersediaan barangan dikemas kini dengan tepat.')}
                </p>
              </div>
            </div>

            {/* Pilihan Lokasi */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('kebajikan:foodbank_select_center')}:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {locations.map((loc) => {
                  const isSelected = selectedLocationId === loc.id;
                  const targetParam = (loc as any).building_id || loc.polymaps_building_id || loc.name;
                  const polymapsUrl = targetParam
                    ? `/polymaps?b=${encodeURIComponent(targetParam)}`
                    : '/polymaps';

                  return (
                    <div
                      key={loc.id}
                      onClick={() => !isSessionClosed && handleLocationChange(loc.id)}
                      className={cn(
                        'p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3',
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                              isSelected
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            )}
                          >
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                              {loc.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {loc.room_detail || t('kebajikan:loc_hep_counter_default', 'Kaunter Hal Ehwal Pelajar')}
                            </p>
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
                              {t('kebajikan:foodbank_operating_hours_prefix', 'Waktu Operasi: ')}{loc.operating_hours || 'Isnin - Khamis: 10AM - 4PM'}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {loc.contact_person || 'Exco Kebajikan JPP'}
                        </span>
                        <Link
                          to={polymapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          <span>{t('kebajikan:foodbank_polymaps_360')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pilihan Tarikh & Slot Masa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{t('kebajikan:foodbank_select_date')}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {workingDays.map((d) => (
                    <button
                      key={d.dateStr}
                      type="button"
                      disabled={isSessionClosed}
                      onClick={() => setPickupDate(d.dateStr)}
                      className={cn(
                        'py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition-all',
                        pickupDate === d.dateStr
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-500/40'
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{t('kebajikan:foodbank_select_slot')}</span>
                </label>
                <div className="space-y-2">
                  {activeTimeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      disabled={isSessionClosed}
                      onClick={() => setPickupTimeSlot(slot)}
                      className={cn(
                        'w-full py-2 px-3 rounded-xl border text-left font-bold text-xs flex items-center justify-between transition-all',
                        pickupTimeSlot === slot
                          ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-500/40'
                      )}
                    >
                      <span>{slot}</span>
                      {pickupTimeSlot === slot && (
                        <div className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Bahagian 4: Dwi-Pilihan Bantuan (Ready Care Box vs Smart Pantry Basket) ── */}
          <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs">
                  4
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {t('kebajikan:foodbank_section_package', '4. Pilihan Pakej Bantuan Food Bank')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('kebajikan:foodbank_choose_between_msg', 'Pilih antara')} <strong>Ready Care Box</strong> {t('kebajikan:foodbank_one_touch_instant', '(1-sentuhan segera) atau')}{' '}
                    <strong>Smart Pantry Basket</strong> {t('kebajikan:foodbank_custom_pantry_choice', '(pilihan bebas barangan).')}
                  </p>
                </div>
              </div>

              {/* Mode Toggle Pills */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 w-fit">
                <button
                  type="button"
                  onClick={() => setPackageMode('READY_BOX')}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5',
                    packageMode === 'READY_BOX'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Ready Care Box</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPackageMode('SMART_PANTRY')}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5',
                    packageMode === 'SMART_PANTRY'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Smart Pantry Basket</span>
                </button>
              </div>
            </div>

            {/* MOD 1: Ready Care Box (Pakej Segera 1-Sentuhan) */}
            {packageMode === 'READY_BOX' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block">{t('kebajikan:foodbank_ready_box_title', 'Pilihan Pakej Segera (Ready Care Box)')}</span>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-normal mt-0.5">
                      {t('kebajikan:foodbank_one_touch_desc', 'Satu sentuhan untuk mengisi pakej keperluan secara automatik mengikut baki stok di {{location}}. Anda boleh menukar kuantiti pada bila-bila masa di Smart Pantry Basket.', { location: selectedLocationName })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {READY_CARE_BOX_PRESETS.map((preset) => {
                    const PresetIcon = preset.icon;
                    return (
                      <div
                        key={preset.id}
                        className="p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.04] to-transparent dark:from-amber-500/[0.06] hover:border-amber-500/60 transition-all flex flex-col justify-between space-y-4 group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black text-[10px] uppercase tracking-wider border border-amber-500/30">
                              <PresetIcon className="w-3 h-3" />
                              <span>{t(`kebajikan:${(preset as any).badgeKey}`, preset.badge)}</span>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                              {t('kebajikan:foodbank_quota_limit', 'Had Kuota:')} {totalQuota} {t('kebajikan:foodbank_unit_count', 'unit')}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-black text-base text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                              {t(`kebajikan:${(preset as any).nameKey}`, preset.name)}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                              {t(`kebajikan:${(preset as any).descKey}`, preset.description)}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                            <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
                              {t('kebajikan:foodbank_main_package_contents', 'Kandungan Utama Pakej:')}
                            </span>
                            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                              {(preset.itemsList as any[]).map((item: any, idx: number) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                  <span>{t(`kebajikan:${item.key}`, item.defaultText || item)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Button
                            type="button"
                            disabled={isSessionClosed}
                            onClick={() => handleSelectReadyCareBox(preset.id)}
                            className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs gap-1.5 shadow-md shadow-amber-500/10"
                          >
                            <Package className="w-4 h-4" />
                            <span>{preset.id === 'rahmah-standard' ? t('kebajikan:foodbank_select_rahmah_box', 'Pilih Ready Care Box Rahmah') : t('kebajikan:foodbank_select_express_box', 'Pilih Ready Care Box Pantas')}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setPackageMode('SMART_PANTRY')}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{t('kebajikan:smart_pantry_basket_link', 'Mahu pilih item satu-persatu mengikut citarasa? Buka Smart Pantry Basket')}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* MOD 2: Smart Pantry Basket (Pilihan Bebas Katalog) */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t('kebajikan:foodbank_free_pantry_at_label', 'Pilihan Pantri Bebas di:')}
                    </span>
                    <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400">
                      {selectedLocationName}
                    </span>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder={t('kebajikan:search_items_placeholder', 'Cari barangan...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                {/* Tab Kategori */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs">
                  {CATEGORY_TABS.map((tab) => {
                    const tabKeyMap: Record<string, string> = {
                      'SEMUA': 'kebajikan:tab_all_items',
                      'MAKANAN': 'kebajikan:tab_basic_food',
                      'MINUMAN': 'kebajikan:tab_beverages',
                      'KEBERSIHAN': 'kebajikan:tab_personal_hygiene',
                      'LAIN_LAIN': 'kebajikan:tab_other_essentials'
                    };
                    const label = tabKeyMap[tab.id] ? t(tabKeyMap[tab.id], tab.label) : tab.label;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveCategory(tab.id)}
                        className={cn(
                          'px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all',
                          activeCategory === tab.id
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Grid Katalog Barangan */}
                {filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                    <Package className="w-8 h-8 mx-auto text-slate-300" />
                    <p>{t('kebajikan:no_items_in_category', 'Tiada barangan dijumpai dalam kategori ini.')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredItems.map((item) => {
                      const qty = selectedItemQuantities[item.id] || 0;
                      const availableStock = getItemStockAtSelectedLocation(item.id);
                      const isOutOfStock = availableStock <= 0;
                      const altLocName = isOutOfStock
                        ? getAlternativeLocationWithStock(item.id)
                        : null;
                      const canAddMore =
                        !isOutOfStock &&
                        qty < availableStock &&
                        totalSelectedCount < totalQuota &&
                        !isSessionClosed;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between space-y-3 relative',
                            qty > 0
                              ? 'border-amber-500/40 bg-amber-500/[0.04] shadow-sm'
                              : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300',
                            isOutOfStock && 'opacity-75'
                          )}
                        >
                          <div className="w-full h-28 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center overflow-hidden relative">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                {renderCategoryIcon(item.category, 'w-6 h-6')}
                              </div>
                            )}

                            {/* Stok Status Badge */}
                            <div className="absolute top-2 right-2">
                              {(() => {
                                if (isOutOfStock) {
                                  return (
                                    <span className="px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider shadow-sm bg-rose-500 text-white font-black">
                                      {t('kebajikan:foodbank_out_of_stock_at_center', 'Habis di pusat ini')}
                                    </span>
                                  );
                                }
                                const stockBadge = getFoodBankStockBadge(availableStock, item.unit);
                                return (
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider shadow-sm',
                                      stockBadge.badgeClass
                                    )}
                                  >
                                    {stockBadge.label}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Info Barangan */}
                          <div className="space-y-1.5">
                            {(() => {
                              const catConfig = FOODBANK_CATEGORY_CONFIG[item.category] || {
                                label: item.category,
                                badge:
                                  'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30',
                              };
                              return (
                                <div
                                  className={cn(
                                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold tracking-wider',
                                    catConfig.badge
                                  )}
                                >
                                  {renderCategoryIcon(item.category, 'w-3 h-3 shrink-0')}
                                  <span>{catConfig.label}</span>
                                </div>
                              );
                            })()}

                            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-2 leading-snug">
                              {item.name}
                            </h4>
                            {item.description && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {item.description}
                              </p>
                            )}
                            {isOutOfStock && altLocName && (
                              <div className="pt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-semibold leading-tight">
                                  <Info className="w-3 h-3 shrink-0 text-amber-600 dark:text-amber-400" />
                                  <span>{t('kebajikan:foodbank_remaining_at_location', 'Berbaki di {{location}}', { location: altLocName })}</span>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Stepper Buttons (+ / -) */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {qty > 0 ? `${qty} ${item.unit}` : t('kebajikan:zero_units', '0 unit')}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={qty <= 0 || isSessionClosed}
                                onClick={() => handleItemQuantityChange(item, -1)}
                                className="w-7 h-7 p-0 rounded-lg text-xs font-bold"
                              >
                                -
                              </Button>
                              <span className="w-5 text-center font-mono font-bold text-xs">
                                {qty}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!canAddMore}
                                onClick={() => handleItemQuantityChange(item, 1)}
                                className={cn(
                                  'w-7 h-7 p-0 rounded-lg text-xs font-bold transition-all',
                                  canAddMore
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                    : 'opacity-40 cursor-not-allowed'
                                )}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Bahagian 5: Perakuan & Butang Penyerahan ── */}
          <div className="rounded-3xl p-6 sm:p-7 bg-slate-900 text-white border border-amber-500/30 space-y-5">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="foodbank-acknowledge"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                disabled={isSessionClosed}
                className="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <label
                htmlFor="foodbank-acknowledge"
                className="text-xs text-slate-300 leading-relaxed cursor-pointer"
              >
                {t('foodbank_declaration_text')}
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                <span className="font-mono">{t('kebajikan:foodbank_selected_count_summary', '({{count}} unit barangan dipilih)', { count: totalSelectedCount })}</span>
              </div>

              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  isSessionClosed ||
                  !acknowledged ||
                  totalSelectedCount === 0 ||
                  totalSelectedCount > totalQuota
                }
                className={cn(
                  'h-12 px-6 font-black text-sm rounded-2xl gap-2 shadow-xl transition-all',
                  isModuleUnderPreparation
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                    : isSessionClosed
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 cursor-not-allowed shadow-none'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                )}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? t('foodbank_submitting')
                    : isModuleUnderPreparation
                    ? t('foodbank_prep_title')
                    : isSessionClosed
                    ? t('foodbank_closed_title')
                    : t('request_foodbank')}
                </span>
                {!isModuleUnderPreparation && !isSessionClosed && <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* ── Mobile Sticky Pantry Bottom Capsule (sm:hidden) ── */}
      {!activeApplication && !isSessionClosed && (
        <div className="fixed bottom-4 left-4 right-4 z-40 bg-slate-900/95 dark:bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between border border-white/10 sm:hidden">
          <div className="flex items-center gap-2.5 truncate mr-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="text-xs font-black truncate">
                {t('kebajikan:foodbank_items_selected_quota_remaining', '{{count}} Item Dipilih • Baki Kuota: {{remaining}}', { count: totalSelectedCount, remaining: remainingQuota })}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {usedQuota}/{totalQuota} {t('kebajikan:units_suffix', 'unit')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowBasketSheet(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1 shadow-md transition-all active:scale-95"
          >
            <span>{t('kebajikan:review_basket_btn', 'Semak Bakul')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Slide-Up Pantry Bottom Sheet (Smart Pantry Basket Review) ── */}
      <AnimatePresence>
        {showBasketSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 ">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Sheet Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      Smart Pantry Basket
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('kebajikan:foodbank_review_adjust_items_desc', 'Semak & selaras barangan pilihan anda')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBasketSheet(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quota Progress Bar */}
              <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20 text-xs">
                <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                  <span className="text-amber-900 dark:text-amber-200">
                    {t('kebajikan:quota_usage_label', 'Penggunaan Kuota: {{used}} / {{total}} Unit', { used: usedQuota, total: totalQuota })}
                  </span>
                  <span
                    className={cn(
                      'font-mono font-black',
                      usedQuota > totalQuota
                        ? 'text-rose-600'
                        : 'text-amber-700 dark:text-amber-300'
                    )}
                  >
                    {t('kebajikan:foodbank_remaining_quota_units_badge', 'Baki Kuota: {{count}} Unit', { count: remainingQuota })}
                  </span>
                </div>
                <div className="w-full h-2 bg-amber-200/60 dark:bg-amber-950/60 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-300 rounded-full',
                      usedQuota > totalQuota ? 'bg-rose-500' : 'bg-amber-500'
                    )}
                    style={{
                      width: `${Math.min((usedQuota / totalQuota) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Selected Items Scroll Area */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/80 space-y-2">
                {totalSelectedCount === 0 ? (
                  <div className="py-10 text-center text-slate-400 space-y-2">
                    <Package className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs">{t('kebajikan:foodbank_pantry_basket_empty_title', 'Bakul pantri anda masih kosong.')}</p>
                    <p className="text-[11px] text-slate-500">
                      {t('kebajikan:foodbank_pantry_basket_empty_desc', 'Pilih barangan daripada katalog atau pilih Ready Care Box di atas.')}
                    </p>
                  </div>
                ) : (
                  Object.entries(selectedItemQuantities).map(([itemId, qtyVal]) => {
                    const qty = Number(qtyVal) || 0;
                    if (qty <= 0) return null;
                    const item = items.find((i) => i.id === itemId);
                    if (!item) return null;
                    const availStock = getItemStockAtSelectedLocation(itemId);

                    return (
                      <div
                        key={itemId}
                        className="pt-2 pb-1 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            {renderCategoryIcon(
                              item.category,
                              'w-4 h-4 text-amber-600 dark:text-amber-400'
                            )}
                          </div>
                          <div className="truncate">
                            <p className="font-extrabold text-slate-900 dark:text-white truncate">
                              {item.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleItemQuantityChange(item, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-mono font-bold text-xs">{qty}</span>
                            <button
                              type="button"
                              disabled={qty >= availStock || totalSelectedCount >= totalQuota}
                              onClick={() => handleItemQuantityChange(item, 1)}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...selectedItemQuantities };
                              delete updated[itemId];
                              setSelectedItemQuantities(updated);
                              toast.success(t('kebajikan:toast_item_removed_from_basket', '{{item}} dikeluarkan dari bakul.', { item: item.name }));
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sheet Footer & CTA */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">

                <Button
                  type="button"
                  onClick={() => {
                    setShowBasketSheet(false);
                    const el = document.getElementById('section-pickup-location');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs gap-1.5 shadow-md shadow-amber-500/10"
                >
                  <span>{t('kebajikan:proceed_slot_confirmation', 'Teruskan ke Pengesahan Slot')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Sejarah Permohonan Lepas (Arkib) ── */}
      {pastApplications.length > 0 && (
        <div className="rounded-3xl p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{t('foodbank_history_title')}</span>
          </div>

          <div className="divide-y divide-slate-200/80 dark:divide-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
            {pastApplications.map((app) => (
              <div
                key={app.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold font-mono text-slate-900 dark:text-white">
                      {app.application_no}
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider',
                        app.status === 'SELESAI'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          : app.status === 'DITOLAK'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-slate-500/10 text-slate-500'
                      )}
                    >
                      {app.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {t('kebajikan:foodbank_submitted_on_label', 'Dihantar pada:')}{' '}
                    {app.created_at
                      ? new Date(app.created_at).toLocaleDateString('ms-MY')
                      : '-'}
                    {' • '}
                    {t('kebajikan:foodbank_unit_goods_count', '{{count}} unit barangan', { count: app.selected_items?.length || 0 })}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedPassApp(app);
                    setPassModalOpen(true);
                  }}
                  className="h-8 px-3 text-xs font-bold rounded-xl gap-1 text-slate-700 dark:text-slate-300"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t('kebajikan:view_pass_btn', 'Lihat Pas')}</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal Pas Pengambilan Digital (Full Modal PDF & Screenshot) ── */}
      <FoodBankQrPassModal
        open={passModalOpen}
        onClose={() => setPassModalOpen(false)}
        application={selectedPassApp}
        studentName={profile?.full_name || undefined}
        studentMatric={profile?.matric_no || profile?.matrix_no || undefined}
        studentProgramme={profile?.department || undefined}
        roomOrResidence={roomNumber || undefined}
      />

      {/* ── Popup Semak Maklumat (First Time) ── */}
      <AnimatePresence>
        {!identityConfirmed && !isSessionClosed && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {t('kebajikan:review_details_title', 'Semak Maklumat Anda')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t('kebajikan:review_details_notice', 'Sila pastikan Nama Penuh dan No. Matrik anda di bawah adalah betul dan tepat sebelum meneruskan permohonan.')}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">{t('kebajikan:foodbank_full_name', 'Nama Penuh')}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{effectiveName || '—'}</span>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold">{t('kebajikan:foodbank_matric_no', 'No. Matrik')}</span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">{effectiveMatric || '—'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={confirmIdentity}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <span>{t('kebajikan:my_details_correct', 'Maklumat Saya Betul')}</span>
                  <Check className="w-4 h-4 ml-1" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmIdentity();
                    openIdentityModal();
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                >
                  {t('kebajikan:btn_want_to_correct_details', 'Saya Nak Betulkan Maklumat')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Betulkan Nama / No. Matrik ── */}
      <AnimatePresence>
        {showIdentityModal && (
          <motion.div
            className="fixed inset-0 z-[61] flex items-center justify-center p-4 bg-black/60 "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <Pencil className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {t('kebajikan:foodbank_fix_name_matric_modal_title', 'Betulkan Nama / No. Matrik')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('kebajikan:foodbank_fix_name_matric_modal_desc', 'Isi maklumat yang betul. Sila bawa kad matrik semasa pengambilan.')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIdentityModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('kebajikan:foodbank_full_name_label', 'Nama Penuh')}
                  </label>
                  <Input
                    value={fullNameOverride}
                    onChange={(e) => setFullNameOverride(e.target.value)}
                    placeholder={t('kebajikan:fullname_as_in_matric_placeholder', 'Nama penuh seperti dalam kad matrik')}
                    className="text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('kebajikan:foodbank_matric_label', 'No. Matrik')}
                  </label>
                  <Input
                    value={matricOverride}
                    onChange={(e) => setMatricOverride(e.target.value)}
                    placeholder={t('kebajikan:matric_placeholder_example', 'Contoh: 02DTM24F1005')}
                    className="text-sm font-mono font-medium"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 mb-4">
                <AlertTriangle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                {t('kebajikan:foodbank_modified_info_notice_1', 'Anda telah mengubah maklumat. Sila')}{' '}
                <strong>{t('kebajikan:foodbank_bring_physical_matric_card', 'bawa kad matrik fizikal')}</strong>{' '}
                {t('kebajikan:foodbank_modified_info_notice_2', 'semasa pengambilan — pegawai kaunter akan membuat pengesahan.')}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowIdentityModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                >
                  {t('kebajikan:foodbank_modal_cancel_btn', 'Batal')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowIdentityModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition"
                >
                  {t('kebajikan:foodbank_modal_save_btn', 'Simpan')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default KebajikanFoodBankPage;
