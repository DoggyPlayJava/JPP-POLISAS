import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PM_ACCENT, PM_LIGHT, PM_GRADIENT, usePolymart } from './PolyMartLayout';
import toast from 'react-hot-toast';
import mockData from './mockData.json';
import {
  ShoppingBag,
  Clock,
  Package,
  TrendingUp,
  Store,
  ChevronDown,
  AlertTriangle,
  Eye,
  Image,
  Tag,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Filter,
  Check,
  X,
  Plus,
  ExternalLink,
} from 'lucide-react';

import {
  VendorOrdersPipeline,
  type GroupedVendorOrder,
  type OrderItem,
  type OrderStatus,
} from './vendor/VendorOrdersPipeline';
import { VendorCatalogManager } from './vendor/VendorCatalogManager';
import { VendorAnalyticsPromo } from './vendor/VendorAnalyticsPromo';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface VendorBusiness {
  id: string;
  name: string;
  is_active: boolean;
}

export type VendorDashboardTab = 'orders' | 'catalog' | 'analytics';

// ── Helper: Order Grouping Engine ──────────────────────────────────────────────
export const groupVendorOrders = (rawOrders: any[]): GroupedVendorOrder[] => {
  const groups: Record<string, GroupedVendorOrder> = {};

  rawOrders.forEach(o => {
    // If order already has items array populated, preserve it
    if (Array.isArray(o.items) && o.items.length > 0) {
      groups[o.id] = o;
      return;
    }

    const buyerId = o.buyer?.id || 'unknown';
    const bizId = o.business_id;
    const status = o.status as OrderStatus;
    const method = o.payment_method || 'COD';

    let batchKey = '';
    if (method === 'QR_ONLINE' && o.payment_receipt_url) {
      batchKey = o.payment_receipt_url;
    } else {
      const timeMs = new Date(o.created_at).getTime();
      const bucket = Math.floor(timeMs / 15000); // 15-second batch bucket
      batchKey = `time_${bucket}`;
    }

    const key = `${buyerId}_${bizId}_${status}_${method}_${batchKey}`;

    if (!groups[key]) {
      groups[key] = {
        id: o.id,
        buyer: o.buyer || null,
        business_id: o.business_id,
        payment_method: o.payment_method || null,
        payment_receipt_url: o.payment_receipt_url || null,
        payment_receipt_rejected: !!o.payment_receipt_rejected,
        payment_verified_at: o.payment_verified_at || null,
        payment_verified_by: o.payment_verified_by || null,
        payment_deadline_at: o.payment_deadline_at || null,
        pickup_time: o.pickup_time || null,
        share_phone: !!o.share_phone,
        status: o.status,
        created_at: o.created_at,
        cancellation_requested_at: o.cancellation_requested_at || null,
        cancellation_reason: o.cancellation_reason || null,
        items: [],
      };
    }

    groups[key].items.push({
      order_id: o.id,
      product_id: o.business_products?.id || o.product_id || '',
      name: o.business_products?.name || o.name || 'Produk',
      image_url: o.business_products?.image_url || o.image_url || null,
      category: o.business_products?.category || o.category || '',
      quantity: o.quantity || 1,
      unit_price: o.unit_price || 0,
      total_price: o.total_price ?? ((o.unit_price || 0) * (o.quantity || 1)),
      selected_variation: o.selected_variation || null,
      note: o.note || null,
    });
  });

  return Object.values(groups).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

// ── Storage Helpers for SSR Safety ───────────────────────────────────────────
const getStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setStorageItem = (key: string, value: string): void => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore in SSR
  }
};

// ── Orchestrator Component ─────────────────────────────────────────────────────
export function PolyMartVendorDashboard() {
  const { user } = useAuth();
  const { refetchCounts } = usePolymart();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState<VendorDashboardTab>('orders');

  // Business and Selection States
  const [myBusinesses, setMyBusinesses] = useState<VendorBusiness[]>([]);
  const [selectedBizId, setSelectedBizId] = useState<string>(
    () => getStorageItem('polymart_vendor_selected_biz') || 'all'
  );

  // Core Data States
  const [orders, setOrders] = useState<GroupedVendorOrder[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Operational Controls
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [togglingStatus, setTogglingStatus] = useState<boolean>(false);

  // ── URL Parameter Routing ────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderParam = params.get('order');
    if (orderParam) {
      setActiveTab('orders');
    }
  }, []);

  // ── Smart Selection Sync ─────────────────────────────────────────────────────
  const handleBizChange = useCallback((bizId: string) => {
    setSelectedBizId(bizId);
    setStorageItem('polymart_vendor_selected_biz', bizId);
  }, []);

  // ── Data Loading Engine (Promise.all Concurrency) ────────────────────────────
  const loadAllData = useCallback(async () => {
    if (!user && getStorageItem('use_mock_auth') !== 'true') {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Mock Authentication Mode
      if (getStorageItem('use_mock_auth') === 'true') {
        const mockBizList: VendorBusiness[] =
          mockData.businesses && mockData.businesses.length > 0
            ? mockData.businesses.map((b: any) => ({
                id: b.id,
                name: b.name,
                is_active: b.is_active ?? true,
              }))
            : [
                { id: 'mock-biz-1', name: 'Kedai Mock Cik Jah', is_active: true },
                { id: 'mock-biz-2', name: 'PolyMerch Co.', is_active: false },
              ];
        setMyBusinesses(mockBizList);

        // Load mock orders
        let storedOrders = getStorageItem('mock_vendor_orders');
        let rawOrders: any[] = [];
        try {
          rawOrders = storedOrders ? JSON.parse(storedOrders) : [];
        } catch (e) {
          rawOrders = [];
        }
        if (!Array.isArray(rawOrders) || rawOrders.length === 0) {
          const defaultOrders = mockData.orders && mockData.orders.length > 0 ? mockData.orders : [];
          setStorageItem('mock_vendor_orders', JSON.stringify(defaultOrders));
          rawOrders = defaultOrders;
        }
        setOrders(groupVendorOrders(rawOrders));

        // Load mock products
        let storedProducts = getStorageItem('mock_vendor_products');
        let rawProducts: any[] = [];
        try {
          rawProducts = storedProducts ? JSON.parse(storedProducts) : [];
        } catch (e) {
          rawProducts = [];
        }
        if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
          const defaultProducts = mockData.products && mockData.products.length > 0 ? mockData.products : [];
          setStorageItem('mock_vendor_products', JSON.stringify(defaultProducts));
          rawProducts = defaultProducts;
        }
        setProducts(rawProducts);
        setLoading(false);
        return;
      }

      // 2. Production Mode: Fetch user owned and membership businesses concurrently
      const [businessesRes, memberBizRes] = await Promise.all([
        supabase
          .from('keusahawanan_businesses')
          .select('id, name, is_active')
          .eq('owner_id', user!.id)
          .eq('status', 'ACTIVE'),
        supabase
          .from('student_business_memberships')
          .select('business_id, business:keusahawanan_businesses(id, name, is_active)')
          .eq('user_id', user!.id)
          .eq('status', 'ACTIVE'),
      ]);

      const bizList: VendorBusiness[] = [];
      const seen = new Set<string>();

      if (businessesRes.data) {
        businessesRes.data.forEach((b: any) => {
          if (!seen.has(b.id)) {
            seen.add(b.id);
            bizList.push({ id: b.id, name: b.name, is_active: !!b.is_active });
          }
        });
      }
      if (memberBizRes.data) {
        memberBizRes.data.forEach((m: any) => {
          const b = m.business as any;
          if (b && !seen.has(b.id)) {
            seen.add(b.id);
            bizList.push({ id: b.id, name: b.name, is_active: !!b.is_active });
          }
        });
      }

      setMyBusinesses(bizList);

      const ids = bizList.map(b => b.id);
      if (ids.length === 0) {
        setOrders([]);
        setProducts([]);
        setLoading(false);
        return;
      }

      // Fetch orders and catalog products in parallel (Strict Promise.all Rule)
      const [ordersRes, productsRes] = await Promise.all([
        supabase
          .from('polymart_orders')
          .select(`
            id, quantity, unit_price, total_price, note, pickup_time, share_phone,
            status, created_at, business_id,
            payment_method, payment_receipt_url, payment_receipt_rejected,
            payment_verified_at, payment_verified_by, payment_deadline_at,
            selected_variation,
            cancellation_requested_at, cancellation_reason,
            business_products!product_id(id, name, image_url, category),
            buyer:profiles!buyer_id(id, full_name, matric_no, phone)
          `)
          .in('business_id', ids)
          .order('created_at', { ascending: false }),
        supabase
          .from('business_products')
          .select('id, name, price, image_url, category, is_available, variations, stock_quantity, reserved_stock, business_id')
          .in('business_id', ids)
          .order('name'),
      ]);

      if (ordersRes.data) {
        setOrders(groupVendorOrders(ordersRes.data));
      } else {
        setOrders([]);
      }

      if (productsRes.data) {
        setProducts(productsRes.data);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      console.error('Failed to load PolyMart vendor data:', err);
      toast.error('Ralat memuatkan data peniaga');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial Load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 30-Second Auto-Refresh Poller
  useEffect(() => {
    let interval: any;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadAllData();
        refetchCounts();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, loadAllData, refetchCounts]);

  // ── Store Status Toggle Engine ───────────────────────────────────────────────
  const handleToggleStoreStatus = async (bizId: string, currentStatus: boolean) => {
    setTogglingStatus(true);
    try {
      if (getStorageItem('use_mock_auth') === 'true') {
        setMyBusinesses(prev =>
          prev.map(b => (b.id === bizId ? { ...b, is_active: !currentStatus } : b))
        );
        toast.success(`Kedai ${!currentStatus ? 'dibuka!' : 'ditutup!'}`);
        return;
      }

      const { error } = await supabase
        .from('keusahawanan_businesses')
        .update({ is_active: !currentStatus })
        .eq('id', bizId);

      if (error) {
        toast.error('Gagal menukar status kedai: ' + error.message);
      } else {
        toast.success(`Kedai ${!currentStatus ? 'dibuka!' : 'ditutup!'}`);
        setMyBusinesses(prev =>
          prev.map(b => (b.id === bizId ? { ...b, is_active: !currentStatus } : b))
        );
      }
    } catch (err: any) {
      toast.error('Ralat mengemaskini status kedai');
    } finally {
      setTogglingStatus(false);
    }
  };

  // ── Active Business Context ──────────────────────────────────────────────────
  const activeStore = useMemo(() => {
    if (selectedBizId !== 'all') {
      return myBusinesses.find(b => b.id === selectedBizId) || null;
    }
    return myBusinesses.length === 1 ? myBusinesses[0] : null;
  }, [selectedBizId, myBusinesses]);

  // ── Filtered Orders by Business ──────────────────────────────────────────────
  const domainOrders = useMemo(() => {
    if (selectedBizId === 'all') return orders;
    return orders.filter(o => o.business_id === selectedBizId);
  }, [orders, selectedBizId]);

  // ── KPI Statistics Computation ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayOrders = domainOrders.filter(
      o => new Date(o.created_at).toDateString() === todayStr
    );

    const pendingConfirm = domainOrders.filter(o => o.status === 'PENDING');
    const activeNow = domainOrders.filter(
      o => o.status === 'CONFIRMED' || o.status === 'READY'
    );

    const completedRevenue = domainOrders
      .filter(o => o.status === 'COMPLETED')
      .reduce((sum, o) => {
        const orderTotal = o.items.reduce(
          (acc, item) => acc + (item.total_price || item.unit_price * item.quantity),
          0
        );
        return sum + orderTotal;
      }, 0);

    return {
      todayCount: todayOrders.length,
      pendingCount: pendingConfirm.length,
      activeCount: activeNow.length,
      revenue: completedRevenue,
    };
  }, [domainOrders]);

  // Low Stock Alerts Count for Tab Dynamic Badge
  const lowStockCount = useMemo(() => {
    let count = 0;
    const filteredProds =
      selectedBizId === 'all'
        ? products
        : products.filter(p => p.business_id === selectedBizId);

    filteredProds.forEach(p => {
      if (Array.isArray(p.variations) && p.variations.length > 0) {
        p.variations.forEach((v: any) => {
          const available = (v.stock ?? 0) - (v.reserved ?? 0);
          if (available <= 5) count++;
        });
      } else {
        const available = (p.stock_quantity ?? 0) - (p.reserved_stock ?? 0);
        if (available <= 5) count++;
      }
    });
    return count;
  }, [products, selectedBizId]);

  // ── Guard: Login Required (Non-Mock) ─────────────────────────────────────────
  if (!user && getStorageItem('use_mock_auth') !== 'true') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20 shadow-sm">
          <Store className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-foreground mb-2">Log Masuk Diperlukan</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Sila log masuk untuk mengakses Hab Peniaga PolyMart dan mengurus pesanan serta inventori kedai anda.
        </p>
        <button
          onClick={() => navigate('/auth')}
          className="px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all active:scale-95"
        >
          Log Masuk Sekarang
        </button>
      </div>
    );
  }

  // ── Guard: No Businesses Registered ──────────────────────────────────────────
  if (!loading && myBusinesses.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20 shadow-sm">
          <Store className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-foreground mb-2">Tiada Kedai Didaftarkan</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
          Anda belum mempunyai profil perniagaan siswa yang aktif untuk mengurus pesanan di PolyMart.
        </p>
        <button
          onClick={() => navigate('/keusahawanan')}
          className="px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2 active:scale-95"
        >
          <span>Daftar Kedai di e-Keusahawanan</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* ── Mock Mode Alert Banner ──────────────────────────────────────────── */}
      {getStorageItem('use_mock_auth') === 'true' && (
        <div className="flex items-center gap-3 p-3.5 mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="text-left flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-wider">Mod Pembangunan Aktif (Mock Mode)</p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              Data dipaparkan daripada simpanan tempatan untuk tujuan pengujian sistem.
            </p>
          </div>
        </div>
      )}

      {/* ── SuperApp Header & Store Controls ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <Store className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Hab Peniaga PolyMart
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-medium mt-1">
            Pusat Kawalan Bersepadu 3 Domain Operasi
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Smart Store Switcher Capsule (when multiple stores exist) */}
          {myBusinesses.length > 1 && (
            <div className="relative inline-flex items-center bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1.5 rounded-full border border-border/70 shadow-sm text-xs">
              <Store className="w-3.5 h-3.5 text-muted-foreground mr-1.5 shrink-0" />
              <select
                value={selectedBizId}
                onChange={e => handleBizChange(e.target.value)}
                className="bg-transparent font-bold text-foreground pr-4 focus:outline-none cursor-pointer appearance-none"
              >
                <option value="all">Semua Kedai ({myBusinesses.length})</option>
                {myBusinesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none absolute right-2.5" />
            </div>
          )}

          {/* Store Open / Closed Status Toggle Switch */}
          {activeStore && (
            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-full border border-border/70 shadow-sm">
              <span
                className={`px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                  activeStore.is_active
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeStore.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                {activeStore.is_active ? 'BUKA' : 'TUTUP'}
              </span>

              <button
                type="button"
                onClick={() => handleToggleStoreStatus(activeStore.id, activeStore.is_active)}
                disabled={togglingStatus}
                aria-label="Tukar status operasi kedai"
                className="text-[11px] font-bold px-2.5 py-1 rounded-full text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {togglingStatus ? 'Memproses...' : activeStore.is_active ? 'Tutup Kedai' : 'Buka Kedai'}
              </button>
            </div>
          )}

          {/* Auto Refresh Toggle Button */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors shadow-sm ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-100 dark:bg-zinc-800 text-muted-foreground border-border/60 hover:text-foreground'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-500' : ''}`} />
            <span className="hidden sm:inline">Kemas Kini Auto</span>
            <span>{autoRefresh ? '(On)' : '(Off)'}</span>
          </button>
        </div>
      </div>

      {/* ── 4 Compact KPI Stat Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6">
        {/* Stat 1: Pesanan Hari Ini */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab('orders')}
          onKeyDown={e => e.key === 'Enter' && setActiveTab('orders')}
          className="rounded-2xl bg-white dark:bg-zinc-900/80 p-3.5 sm:p-4 border border-border/60 hover:border-amber-500/40 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245, 158, 11, 0.12)' }}
            >
              <ShoppingBag className="w-5 h-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-mono font-black text-foreground tracking-tight leading-none">
                {stats.todayCount}
              </p>
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-muted-foreground/70 mt-1 truncate">
                Pesanan Hari Ini
              </p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2 truncate">
            Tempahan masuk hari ini
          </p>
        </div>

        {/* Stat 2: Menunggu Sahkan */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab('orders')}
          onKeyDown={e => e.key === 'Enter' && setActiveTab('orders')}
          className="rounded-2xl bg-white dark:bg-zinc-900/80 p-3.5 sm:p-4 border border-border/60 hover:border-orange-500/40 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(249, 115, 22, 0.12)' }}
            >
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-mono font-black text-foreground tracking-tight leading-none">
                {stats.pendingCount}
              </p>
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-muted-foreground/70 mt-1 truncate">
                Menunggu Sahkan
              </p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2 truncate">
            Perlu tindakan pengesahan
          </p>
        </div>

        {/* Stat 3: Aktif Sekarang */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab('orders')}
          onKeyDown={e => e.key === 'Enter' && setActiveTab('orders')}
          className="rounded-2xl bg-white dark:bg-zinc-900/80 p-3.5 sm:p-4 border border-border/60 hover:border-indigo-500/40 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99, 102, 241, 0.12)' }}
            >
              <Package className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-mono font-black text-foreground tracking-tight leading-none">
                {stats.activeCount}
              </p>
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-muted-foreground/70 mt-1 truncate">
                Aktif Sekarang
              </p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2 truncate">
            Sedang disedia &amp; sedia diambil
          </p>
        </div>

        {/* Stat 4: Hasil Selesai */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab('analytics')}
          onKeyDown={e => e.key === 'Enter' && setActiveTab('analytics')}
          className="rounded-2xl bg-white dark:bg-zinc-900/80 p-3.5 sm:p-4 border border-border/60 hover:border-emerald-500/40 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(34, 197, 94, 0.12)' }}
            >
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-mono font-black text-foreground tracking-tight leading-none">
                RM {stats.revenue.toFixed(2)}
              </p>
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-muted-foreground/70 mt-1 truncate">
                Hasil Selesai
              </p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2 truncate">
            Jumlah pesanan yang selesai
          </p>
        </div>
      </div>

      {/* ── Sticky Top Segmented Tab Bar (3 Domains) ─────────────────────────── */}
      <div className="sticky top-14 sm:top-16 z-30 bg-background/95 backdrop-blur-md py-2.5 mb-6 border-b border-border/40">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-border/60 shadow-inner">
          {/* Domain 1: Urus Pesanan */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl text-xs sm:text-sm transition-all ${
              activeTab === 'orders'
                ? 'bg-white dark:bg-zinc-800 text-amber-500 font-extrabold shadow-sm'
                : 'text-muted-foreground hover:text-foreground font-semibold'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="truncate">Pesanan Masuk</span>
            {stats.pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm shrink-0">
                {stats.pendingCount}
              </span>
            )}
          </button>

          {/* Domain 2: Katalog & Stok */}
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl text-xs sm:text-sm transition-all ${
              activeTab === 'catalog'
                ? 'bg-white dark:bg-zinc-800 text-amber-500 font-extrabold shadow-sm'
                : 'text-muted-foreground hover:text-foreground font-semibold'
            }`}
          >
            <Tag className="w-4 h-4 shrink-0" />
            <span className="truncate">Katalog &amp; Stok</span>
            {products.length > 0 && (
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full text-[10px] font-black bg-zinc-200 dark:bg-zinc-700 text-muted-foreground shrink-0">
                {products.length}
              </span>
            )}
          </button>

          {/* Domain 3: Prestasi & Promosi */}
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl text-xs sm:text-sm transition-all ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-zinc-800 text-amber-500 font-extrabold shadow-sm'
                : 'text-muted-foreground hover:text-foreground font-semibold'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span className="truncate">Prestasi &amp; Iklan</span>
            {lowStockCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 border border-rose-500/30 text-rose-500 shrink-0">
                {lowStockCount} Amaran
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Active Domain Content Area ───────────────────────────────────────── */}
      <div className="w-full">
        {/* Domain 1: Order Pipeline */}
        {activeTab === 'orders' && (
          <VendorOrdersPipeline
            orders={domainOrders}
            loading={loading}
            onUpdate={loadAllData}
            bizName={activeStore?.name}
            myBusinesses={myBusinesses}
            selectedBizId={selectedBizId}
          />
        )}

        {/* Domain 2: Catalog & Fast Stock Manager */}
        {activeTab === 'catalog' && (
          <VendorCatalogManager
            myBusinesses={myBusinesses}
            selectedBizId={selectedBizId}
            onBizChange={handleBizChange}
            onUpdate={loadAllData}
          />
        )}

        {/* Domain 3: Analytics & Promo Ads */}
        {activeTab === 'analytics' && (
          <VendorAnalyticsPromo
            orders={domainOrders}
            products={products}
            myBusinesses={myBusinesses}
            selectedBizId={selectedBizId}
            onUpdate={loadAllData}
          />
        )}
      </div>
    </div>
  );
}

export default PolyMartVendorDashboard;
