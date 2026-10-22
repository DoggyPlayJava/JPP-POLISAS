/**
 * foodbankDefaults.ts
 * Nilai Default & Mock Fallback untuk Modul Food Bank JPP
 * Memastikan portal pelajar dan pusat kawalan pentadbir beroperasi lancar
 * dan tidak tergendala jika pangkalan data belum disegerakkan.
 */

import i18n from '@/lib/i18n';

const t = (key: string, fallback: string, options?: Record<string, unknown>): string => {
  if (i18n && typeof i18n.t === 'function' && i18n.isInitialized) {
    return i18n.t(key, fallback, options);
  }
  return fallback;
};

import {
  FoodBankSettings,
  FoodBankDistributionLocation,
  FoodBankItem,
  FoodBankApplicationStatus,
  FoodBankLocationStock,
  FoodBankOfficer,
  FoodBankAuditLog,
} from '@/types';

// ============================================================
// Semantic Color & Category Tokens ("Warm Citrus & Fresh Harvest")
// ============================================================

export function getFoodBankCategoryConfig(t: (k: string, fb: string, opt?: Record<string, unknown>) => string = (k, fb, opt) => (i18n && i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...(opt || {}) }) as string) : fb)): Record<string, { label: string; badge: string; icon: string }> {
  return {
    MAKANAN: {
      label: t('kebajikan:foodbank_cat_makanan', 'Makanan Asas'),
      badge: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30',
      icon: '🍚',
    },
    MINUMAN: {
      label: t('kebajikan:foodbank_cat_minuman', 'Minuman'),
      badge: 'bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-500/30',
      icon: '☕',
    },
    KEBERSIHAN: {
      label: t('kebajikan:foodbank_cat_kebersihan', 'Kebersihan Diri'),
      badge: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
      icon: '🧼',
    },
    KEPERLUAN_ASAS: {
      label: t('kebajikan:foodbank_cat_keperluan_asas', 'Keperluan Asas'),
      badge: 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30',
      icon: '📦',
    },
    LAIN_LAIN: {
      label: t('kebajikan:foodbank_cat_lain_lain', 'Keperluan Lain'),
      badge: 'bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30',
      icon: '📦',
    },
  };
}

export const FOODBANK_CATEGORY_CONFIG: Record<string, { label: string; badge: string; icon: string }> = new Proxy({}, {
  get(_target, prop: string) {
    return getFoodBankCategoryConfig()[prop];
  },
  has(_target, prop: string) {
    return prop in getFoodBankCategoryConfig();
  },
  ownKeys() {
    return Reflect.ownKeys(getFoodBankCategoryConfig());
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    return {
      configurable: true,
      enumerable: true,
      value: (getFoodBankCategoryConfig() as any)[prop],
    };
  },
}) as Record<string, { label: string; badge: string; icon: string }>;

export function getFoodBankStockBadge(stock: number, unit: string = 'unit') {
  if (stock <= 0) {
    return {
      label: t('kebajikan:foodbank_stock_empty', 'Stok Habis'),
      badgeClass: 'bg-rose-500 text-white font-black',
      status: 'OUT_OF_STOCK' as const,
    };
  }
  if (stock <= 10) {
    return {
      label: t('kebajikan:foodbank_stock_limited', `Terhad: ${stock} ${unit}`, { stock, unit }),
      badgeClass: 'bg-amber-500 text-slate-950 font-black',
      status: 'LIMITED' as const,
    };
  }
  return {
    label: t('kebajikan:foodbank_stock_remaining', `Baki: ${stock} ${unit}`, { stock, unit }),
    badgeClass: 'bg-emerald-600 dark:bg-emerald-500 text-white font-bold',
    status: 'IN_STOCK' as const,
  };
}

export function getFoodBankStatusConfig(t: (k: string, fb: string, opt?: Record<string, unknown>) => string = (k, fb, opt) => (i18n && i18n.isInitialized ? (i18n.t(k, { defaultValue: fb, ...(opt || {}) }) as string) : fb)): Record<FoodBankApplicationStatus, { label: string; badge: string; dot: string; iconName?: string }> {
  return {
    MENUNGGU: {
      label: t('kebajikan:foodbank_status_menunggu', 'Menunggu Kelulusan'),
      badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
      dot: 'bg-amber-500',
    },
    DALAM_SEMAKAN: {
      label: t('kebajikan:foodbank_status_dalam_semakan', 'Dalam Semakan'),
      badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
      dot: 'bg-sky-500',
    },
    LULUS: {
      label: t('kebajikan:foodbank_status_lulus', 'Lulus - Sedia Diambil'),
      badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
      dot: 'bg-emerald-500',
    },
    SELESAI: {
      label: t('kebajikan:foodbank_status_selesai', 'Selesai Diambil'),
      badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      dot: 'bg-emerald-600',
    },
    DITOLAK: {
      label: t('kebajikan:foodbank_status_ditolak', 'Tidak Diluluskan'),
      badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
      dot: 'bg-rose-500',
    },
    BATAL: {
      label: t('kebajikan:foodbank_status_batal', 'Dibatalkan'),
      badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
      dot: 'bg-slate-400',
    },
  };
}

export const FOODBANK_STATUS_CONFIG: Record<FoodBankApplicationStatus, { label: string; badge: string; dot: string; iconName?: string }> = new Proxy({}, {
  get(_target, prop: string) {
    return (getFoodBankStatusConfig() as any)[prop];
  },
  has(_target, prop: string) {
    return prop in getFoodBankStatusConfig();
  },
  ownKeys() {
    return Reflect.ownKeys(getFoodBankStatusConfig());
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    return {
      configurable: true,
      enumerable: true,
      value: (getFoodBankStatusConfig() as any)[prop],
    };
  },
}) as Record<FoodBankApplicationStatus, { label: string; badge: string; dot: string; iconName?: string }>;

export const DEFAULT_FOODBANK_SETTINGS: FoodBankSettings = {
  id: '00000000-0000-0000-0000-000000000001',
  is_module_active: false, // Lalai: Tutup / Dalam Persediaan sehingga dirasmikan
  is_application_open: true,
  total_budget: 70000.0,
  current_spent: 0.0,
  max_monthly_applications_per_student: 1,
  max_items_per_application: 5,
  allow_housemate: true, // Lalai: benarkan kuota rakan serumah
  application_instructions: t('kebajikan:foodbank_default_instructions', 'Sila bawa kad matrik fizikal atau digital semasa menuntut barangan di kaunter.'),
  eligibility_criteria: t('kebajikan:foodbank_default_eligibility', 'Terbuka kepada pelajar asnaf dan B40 yang berdaftar di POLISAS.'),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const STORAGE_KEY_FOODBANK_SETTINGS = 'jpp_foodbank_settings';

export function loadLocalFoodBankSettings(): FoodBankSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FOODBANK_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_FOODBANK_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to parse local foodbank settings:', e);
  }
  return DEFAULT_FOODBANK_SETTINGS;
}

export function saveLocalFoodBankSettings(settings: Partial<FoodBankSettings>): FoodBankSettings {
  try {
    const current = loadLocalFoodBankSettings();
    const merged: FoodBankSettings = {
      ...current,
      ...settings,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_FOODBANK_SETTINGS, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.error('Failed to save local foodbank settings:', e);
    return { ...DEFAULT_FOODBANK_SETTINGS, ...settings };
  }
}

export const DEFAULT_FOODBANK_LOCATIONS: (FoodBankDistributionLocation & { polymaps_building_id?: string })[] = [
  {
    id: '00000000-0000-0000-0000-000000000010',
    name: t('kebajikan:foodbank_loc_sc_name', 'Pusat Edaran Utama JPP (Student Centre)'),
    building_id: '1c7f4753-2626-4f10-9b6c-6348005341f7',
    polymaps_building_id: '1c7f4753-2626-4f10-9b6c-6348005341f7',
    room_or_spot: t('kebajikan:foodbank_loc_sc_spot', 'Bilik Gerakan JPP, Aras Bawah SC'),
    operating_hours: t('kebajikan:foodbank_loc_sc_hours', '10:00 AM - 4:30 PM (Isnin - Jumaat)'),
    contact_person: t('kebajikan:foodbank_loc_sc_contact', 'Exco Kebajikan JPP (011-23456789)'),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000011',
    name: t('kebajikan:foodbank_loc_admin_name', 'Kaunter Kebajikan Blok Pentadbiran'),
    building_id: '98592794-6c87-4b8c-8222-c4176dce3b74',
    polymaps_building_id: '98592794-6c87-4b8c-8222-c4176dce3b74',
    room_or_spot: t('kebajikan:foodbank_loc_admin_spot', 'Foyer Aras Bawah, Berhampiran Lobi Utama'),
    operating_hours: t('kebajikan:foodbank_loc_admin_hours', '11:00 AM - 3:00 PM'),
    contact_person: t('kebajikan:foodbank_loc_admin_contact', 'Urusetia Kebajikan HEP'),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    name: t('kebajikan:foodbank_loc_kamsis_name', 'Hab Edaran Kamsis (Kafe Al-Biruni)'),
    building_id: 'cad08be4-c2ab-40fb-a797-b7089d487cfa',
    polymaps_building_id: 'cad08be4-c2ab-40fb-a797-b7089d487cfa',
    room_or_spot: t('kebajikan:foodbank_loc_kamsis_spot', 'Sudut Kebajikan Pelajar Kafe AB'),
    operating_hours: t('kebajikan:foodbank_loc_kamsis_hours', '5:00 PM - 8:00 PM (Hari Bekerja)'),
    contact_person: t('kebajikan:foodbank_loc_kamsis_contact', 'Warden Bertugas Kamsis'),
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export const DEFAULT_FOODBANK_ITEMS: FoodBankItem[] = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    name: 'Beras Wangi Super Spesial (5kg)',
    category: 'MAKANAN',
    current_stock: 120,
    estimated_cost: 19.5,
    unit: 'pek',
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80',
    description: t('kebajikan:foodbank_item_rice_desc', 'Beras putih berkualiti tinggi untuk keperluan makan harian.'),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    name: 'Minyak Masak Sawit (1kg Polybag)',
    category: 'MAKANAN',
    current_stock: 150,
    estimated_cost: 2.5,
    unit: 'peket',
    image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80',
    description: t('kebajikan:foodbank_item_oil_desc', 'Minyak masak bersubsidi untuk memasak.'),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000103',
    name: 'Biskut Cream Crackers Hup Seng',
    category: 'MAKANAN',
    current_stock: 200,
    estimated_cost: 4.8,
    unit: 'peket',
    image_url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop&q=80',
    description: t('kebajikan:foodbank_item_biscuit_desc', 'Biskut rangup berkhasiat untuk sarapan atau waktu belajar.'),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000104',
    name: 'Mi Segera Maggi Kari (5x79g)',
    category: 'MAKANAN',
    current_stock: 180,
    estimated_cost: 5.2,
    unit: 'pek',
    image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=80',
    description: t('kebajikan:foodbank_item_maggi_desc', 'Mi segera perisa kari kegemaran mahasiswa.'),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000105',
    name: 'Sardin Dalam Sos Tomato (425g)',
    category: 'MAKANAN',
    current_stock: 95,
    estimated_cost: 6.9,
    unit: 'tin',
    image_url: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=400&auto=format&fit=crop&q=80',
    description: t('kebajikan:foodbank_item_sardine_desc', 'Lauk protein mudah disediakan dan berkhasiat.'),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000106',
    name: 'Susu Pekat Manis (500g)',
    category: 'MINUMAN',
    current_stock: 110,
    estimated_cost: 3.8,
    unit: 'tin',
    image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80',
    description: t('kebajikan:foodbank_item_condensed_milk_desc', 'Pekatan manis untuk minuman kopi atau teh.'),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000107',
    name: t('kebajikan:foodbank_item_milo_name', 'Minuman Malt Coklat Milo (1kg)'),
    category: 'MINUMAN',
    current_stock: 60,
    estimated_cost: 18.5,
    unit: 'peket',
    image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&auto=format&fit=crop&q=80',
    description: t('kebajikan:foodbank_item_milo_desc', 'Serbuk minuman bertenaga untuk mahasiswa.'),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000108',
    name: 'Ubat Gigi & Berus Gigi Twin Pack',
    category: 'KEBERSIHAN',
    current_stock: 75,
    estimated_cost: 7.5,
    unit: 'set',
    image_url: 'https://images.unsplash.com/photo-1559591937-e1032a92d416?w=400&auto=format&fit=crop&q=80',
    description: t('kebajikan:foodbank_item_oral_desc', 'Kit penjagaan kesihatan oral asas.'),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000109',
    name: 'Sabun Mandi Antibakteria (3x85g)',
    category: 'KEBERSIHAN',
    current_stock: 90,
    estimated_cost: 6.2,
    unit: 'pek',
    image_url: 'https://images.unsplash.com/photo-1607006314397-6a4a25997d91?w=400&auto=format&fit=crop&q=80',
    description: t('kebajikan:foodbank_item_soap_desc', 'Sabun badan untuk kebersihan diri mahasiswa di asrama.'),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000110',
    name: 'Pencuci Pakaian Serbuk (2kg)',
    category: 'KEPERLUAN_ASAS',
    current_stock: 80,
    estimated_cost: 9.8,
    unit: 'pek',
    image_url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&auto=format&fit=crop&q=80',
    description: t('kebajikan:foodbank_item_detergent_desc', 'Detergen pakaian harian untuk pelajar.'),
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// ============================================================
// Multi-Location Stocks, Officers & Audit Logs Mock Fallbacks
// ============================================================

/**
 * Penjana Mock Baki Stok Mengikut Lokasi Fizikal
 * Membahagikan stok mengikut nisbah kapasiti pusat edaran (Utama 60%, Kamsis 25%, Lain-lain 15%)
 */
export function generateDefaultFoodBankLocationStocks(
  items: FoodBankItem[] = DEFAULT_FOODBANK_ITEMS,
  locations: (FoodBankDistributionLocation & { polymaps_building_id?: string })[] = DEFAULT_FOODBANK_LOCATIONS
): FoodBankLocationStock[] {
  const stocks: FoodBankLocationStock[] = [];

  items.forEach((item, itemIdx) => {
    locations.forEach((loc, locIdx) => {
      let allocated = 0;
      if (loc.name.includes(t('kebajikan:foodbank_filter_main_sc', 'Pusat Edaran Utama'))) {
        allocated = Math.ceil(item.current_stock * 0.6);
      } else if (loc.name.includes(t('kebajikan:foodbank_filter_kamsis', 'Kamsis'))) {
        allocated = Math.ceil(item.current_stock * 0.25);
      } else {
        allocated = Math.max(0, item.current_stock - Math.ceil(item.current_stock * 0.6) - Math.ceil(item.current_stock * 0.25));
      }

      stocks.push({
        id: `00000000-0000-0000-0000-${String(2000 + (itemIdx + 1) * 10 + locIdx).padStart(12, '0')}`,
        item_id: item.id,
        location_id: loc.id,
        current_stock: allocated,
        reorder_level: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        item,
        location: loc,
      });
    });
  });

  return stocks;
}

export const DEFAULT_FOODBANK_LOCATION_STOCKS: FoodBankLocationStock[] =
  generateDefaultFoodBankLocationStocks();

export const DEFAULT_FOODBANK_OFFICERS: FoodBankOfficer[] = [
  {
    id: '00000000-0000-0000-0000-000000000201',
    user_id: '88888888-8888-8888-8888-888888880001',
    location_id: null, // Semua Lokasi (Floating / Penyelaras Utama)
    role_title: t('kebajikan:foodbank_role_lead_coord', 'Ketua Penyelaras Agihan Food Bank'),
    is_active: true,
    assigned_by: '00000000-0000-0000-0000-000000000001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: '88888888-8888-8888-8888-888888880001',
      full_name: 'Muhammad Farhan bin Razali',
      email: t('kebajikan:foodbank_mock_email_farhan', 'farhan.razali@siswa.polisas.edu.my'),
      student_id: '15DIT23F1001',
      phone_number: '011-23456789',
    },
    location: null,
  },
  {
    id: '00000000-0000-0000-0000-000000000202',
    user_id: '88888888-8888-8888-8888-888888880002',
    location_id: '00000000-0000-0000-0000-000000000010', // Pusat Edaran Utama SC
    role_title: t('kebajikan:foodbank_role_main_counter', 'Petugas Kaunter Utama'),
    is_active: true,
    assigned_by: '88888888-8888-8888-8888-888888880001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: '88888888-8888-8888-8888-888888880002',
      full_name: 'Nurul Ain binti Kamaruddin',
      email: t('kebajikan:foodbank_mock_email_ain', 'nurulain@siswa.polisas.edu.my'),
      student_id: '15DAT23F1042',
      phone_number: '012-34567890',
    },
    location: DEFAULT_FOODBANK_LOCATIONS[0],
  },
  {
    id: '00000000-0000-0000-0000-000000000203',
    user_id: '88888888-8888-8888-8888-888888880003',
    location_id: '00000000-0000-0000-0000-000000000012', // Hab Edaran Kamsis
    role_title: t('kebajikan:foodbank_role_kamsis_counter', 'Petugas Hab Kamsis'),
    is_active: true,
    assigned_by: '88888888-8888-8888-8888-888888880001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: '88888888-8888-8888-8888-888888880003',
      full_name: 'Ahmad Daniel bin Rosli',
      email: t('kebajikan:foodbank_mock_email_daniel', 'daniel.rosli@siswa.polisas.edu.my'),
      student_id: '15DKM23F1089',
      phone_number: '013-45678901',
    },
    location: DEFAULT_FOODBANK_LOCATIONS[2],
  },
  {
    id: '00000000-0000-0000-0000-000000000204',
    user_id: '88888888-8888-8888-8888-888888880004',
    location_id: '00000000-0000-0000-0000-000000000011', // Kaunter Pentadbiran
    role_title: t('kebajikan:foodbank_role_verify_stock', 'Pembantu Verifikasi & Stok'),
    is_active: true,
    assigned_by: '88888888-8888-8888-8888-888888880001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: '88888888-8888-8888-8888-888888880004',
      full_name: 'Siti Nur Aisyah binti Zamri',
      email: t('kebajikan:foodbank_mock_email_aisyah', 'aisyah.zamri@siswa.polisas.edu.my'),
      student_id: '15DPR23F1015',
      phone_number: '014-56789012',
    },
    location: DEFAULT_FOODBANK_LOCATIONS[1],
  },
];

export const DEFAULT_FOODBANK_AUDIT_LOGS: FoodBankAuditLog[] = [
  {
    id: '00000000-0000-0000-0000-000000000301',
    actor_id: '88888888-8888-8888-8888-888888880001',
    actor_name: t('kebajikan:foodbank_log_actor_farhan_lead', 'Muhammad Farhan (Ketua Penyelaras)'),
    action_type: 'STOCK_TRANSFER',
    location_id: '00000000-0000-0000-0000-000000000012',
    target_id: 'Beras Wangi Super Spesial (5kg)',
    details: {
      item_name: 'Beras Wangi Super Spesial (5kg)',
      from_location_name: t('kebajikan:foodbank_loc_sc_name', 'Pusat Edaran Utama JPP (Student Centre)'),
      to_location_name: t('kebajikan:foodbank_loc_kamsis_name', 'Hab Edaran Kamsis (Kafe Al-Biruni)'),
      quantity: 15,
      notes: t('kebajikan:foodbank_log_notes_exam_prep', 'Penambahan stok asrama menjelang minggu peperiksaan'),
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000302',
    actor_id: '88888888-8888-8888-8888-888888880002',
    actor_name: t('kebajikan:foodbank_log_actor_ain_counter', 'Nurul Ain (Petugas Kaunter)'),
    action_type: 'PICKUP_VERIFIED',
    location_id: '00000000-0000-0000-0000-000000000010',
    target_id: 'FB-2026-0042',
    details: {
      application_no: 'FB-2026-0042',
      student_name: 'Muhammad Alif bin Zulkifli',
      matric_no: '15DEP23F2005',
      items_claimed: 4,
      notes: t('kebajikan:foodbank_log_notes_qr_claim', 'Penebusan pas digital QR disahkan di Kaunter SC'),
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000303',
    actor_id: '88888888-8888-8888-8888-888888880001',
    actor_name: t('kebajikan:foodbank_log_actor_farhan_lead', 'Muhammad Farhan (Ketua Penyelaras)'),
    action_type: 'OFFICER_ASSIGNED',
    location_id: '00000000-0000-0000-0000-000000000012',
    target_id: 'Ahmad Daniel bin Rosli',
    details: {
      officer_name: 'Ahmad Daniel bin Rosli',
      role_title: t('kebajikan:foodbank_role_kamsis_counter', 'Petugas Hab Kamsis'),
      assigned_location: t('kebajikan:foodbank_loc_kamsis_name', 'Hab Edaran Kamsis (Kafe Al-Biruni)'),
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000304',
    actor_id: '88888888-8888-8888-8888-888888880001',
    actor_name: t('kebajikan:foodbank_log_actor_farhan_lead', 'Muhammad Farhan (Ketua Penyelaras)'),
    action_type: 'STOCK_ADJUSTMENT',
    location_id: '00000000-0000-0000-0000-000000000010',
    target_id: 'Mi Segera Maggi Kari (5x79g)',
    details: {
      item_name: 'Mi Segera Maggi Kari (5x79g)',
      adjustment: t('kebajikan:foodbank_log_adjustment_50', '+50 pek'),
      reason: t('kebajikan:foodbank_log_reason_corp_donation', 'Penerimaan sumbangan korporat sesi 2026'),
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

