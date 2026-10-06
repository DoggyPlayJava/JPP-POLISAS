import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  Megaphone,
  Plus,
  BarChart3,
  ExternalLink,
  Calendar,
  X,
  Upload,
  Clock,
  CheckCircle,
  Package,
  Sparkles,
  ArrowRight,
  Store,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PM_GRADIENT } from '../PolyMartLayout';
import toast from 'react-hot-toast';
import type { GroupedVendorOrder } from './VendorOrdersPipeline';

export interface VendorAnalyticsProduct {
  id: string;
  name: string;
  stock_quantity: number;
  reserved_stock: number;
  business_id: string;
  is_available?: boolean;
  variations?: Array<{ name: string; stock?: number; reserved?: number }>;
}

export interface VendorAnalyticsPromoProps {
  orders: GroupedVendorOrder[];
  products: Array<{
    id: string;
    name: string;
    stock_quantity: number;
    reserved_stock: number;
    business_id: string;
    is_available?: boolean;
    variations?: Array<{ name: string; stock?: number; reserved?: number }>;
  }>;
  myBusinesses: Array<{ id: string; name: string }>;
  selectedBizId: string;
  onUpdate?: () => void;
}

export interface VendorPromoAd {
  id: string;
  title: string;
  image_url: string;
  link_url?: string | null;
  type?: 'INTERNAL' | 'EXTERNAL';
  status: 'APPROVED' | 'ACTIVE' | 'DRAFT' | 'REJECTED' | 'INACTIVE';
  clicks?: number;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export type AnalyticsSubDomain = 'analytics' | 'ads';

export function VendorAnalyticsPromo({
  orders,
  products,
  myBusinesses,
  selectedBizId,
  onUpdate,
}: VendorAnalyticsPromoProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Sub-domain navigation pill tabs
  const [activeTab, setActiveTab] = useState<AnalyticsSubDomain>('analytics');

  // Promotional Ads states
  const [ads, setAds] = useState<VendorPromoAd[]>([]);
  const [loadingAds, setLoadingAds] = useState<boolean>(true);
  const [showNewAdModal, setShowNewAdModal] = useState<boolean>(false);
  const [submittingAd, setSubmittingAd] = useState<boolean>(false);

  // New Ad Form states
  const [adTitle, setAdTitle] = useState<string>('');
  const [adLinkUrl, setAdLinkUrl] = useState<string>('');
  const [adImageFile, setAdImageFile] = useState<File | null>(null);
  const [adImagePreview, setAdImagePreview] = useState<string | null>(null);

  // Filter orders by selected business if not 'all'
  const filteredOrders = useMemo(() => {
    if (selectedBizId === 'all') return orders;
    return orders.filter(o => o.business_id === selectedBizId);
  }, [orders, selectedBizId]);

  // Compute 7-day sales trend for Recharts AreaChart
  const chartData = useMemo(() => {
    const days: Array<{
      date: string;
      key: string;
      'Jumlah Hasil (RM)': number;
      'Kuantiti Tempahan': number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit' });
      days.push({
        date: dateStr,
        key: d.toDateString(),
        'Jumlah Hasil (RM)': 0,
        'Kuantiti Tempahan': 0,
      });
    }

    const dayMap = new Map(days.map(item => [item.key, item]));

    filteredOrders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const entry = dayMap.get(orderDate.toDateString());
      if (entry) {
        const orderQty = order.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) ?? 1;
        entry['Kuantiti Tempahan'] += orderQty;

        if (order.status === 'COMPLETED') {
          const orderTotal =
            order.items?.reduce(
              (sum, it) => sum + (it.total_price ?? (it.unit_price * it.quantity)),
              0
            ) ?? 0;
          entry['Jumlah Hasil (RM)'] += Math.round(orderTotal * 100) / 100;
        }
      }
    });

    return days.map(d => ({
      date: d.date,
      'Jumlah Hasil (RM)': Math.round(d['Jumlah Hasil (RM)'] * 100) / 100,
      'Kuantiti Tempahan': d['Kuantiti Tempahan'],
    }));
  }, [filteredOrders]);

  const hasChartData = useMemo(() => {
    return chartData.some(
      item => item['Jumlah Hasil (RM)'] > 0 || item['Kuantiti Tempahan'] > 0
    );
  }, [chartData]);

  // Low-stock products calculation (available stock <= 5)
  const lowStockProducts = useMemo(() => {
    const filtered =
      selectedBizId === 'all'
        ? products
        : products.filter(p => p.business_id === selectedBizId);

    const result: Array<{
      id: string;
      name: string;
      business_id: string;
      available: number;
    }> = [];

    filtered.forEach(p => {
      // Check variation level stock if exists
      if (Array.isArray(p.variations) && p.variations.length > 0) {
        p.variations.forEach(v => {
          const avail = (v.stock ?? 0) - (v.reserved ?? 0);
          if (avail <= 5) {
            result.push({
              id: `${p.id}_${v.name}`,
              name: `${p.name} (${v.name})`,
              business_id: p.business_id,
              available: Math.max(0, avail),
            });
          }
        });
      } else {
        const avail = (p.stock_quantity ?? 0) - (p.reserved_stock ?? 0);
        if (avail <= 5) {
          result.push({
            id: p.id,
            name: p.name,
            business_id: p.business_id,
            available: Math.max(0, avail),
          });
        }
      }
    });

    return result;
  }, [products, selectedBizId]);

  // Fetch promotional ads for the current user
  const fetchAds = async () => {
    if (!user) {
      setLoadingAds(false);
      return;
    }

    setLoadingAds(true);

    try {
      if (
        typeof window !== 'undefined' &&
        localStorage.getItem('use_mock_auth') === 'true'
      ) {
        let storedAds = localStorage.getItem('mock_vendor_ads');
        if (!storedAds) {
          const defaultMockAds: VendorPromoAd[] = [
            {
              id: 'mock-ad-1',
              title: 'Nasi Lemak RM1 Cik Jah Promo',
              image_url:
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="250" viewBox="0 0 600 250"><rect width="100%" height="100%" fill="%23f59e0b"/><text x="50" y="100" font-family="sans-serif" font-size="28" font-weight="bold" fill="white">Nasi Lemak RM1!</text><text x="50" y="140" font-family="sans-serif" font-size="16" fill="white">Cik Jah Catering - 100% Student Price</text></svg>',
              link_url: '/polymart',
              type: 'INTERNAL',
              status: 'APPROVED',
              clicks: 42,
              created_by: user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 'mock-ad-2',
              title: 'T-Shirt JPP Preorder',
              image_url:
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="250" viewBox="0 0 600 250"><rect width="100%" height="100%" fill="%233b82f6"/><text x="50" y="100" font-family="sans-serif" font-size="28" font-weight="bold" fill="white">T-Shirt JPP 2026</text><text x="50" y="140" font-family="sans-serif" font-size="16" fill="white">Order yours now - PolyMerch Co.</text></svg>',
              link_url: '/polymart',
              type: 'INTERNAL',
              status: 'DRAFT',
              clicks: 0,
              created_by: user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ];
          localStorage.setItem('mock_vendor_ads', JSON.stringify(defaultMockAds));
          storedAds = JSON.stringify(defaultMockAds);
        }
        const parsedAds: VendorPromoAd[] = JSON.parse(storedAds);
        setAds(parsedAds);
        setLoadingAds(false);
        return;
      }

      const { data, error } = await supabase
        .from('polymart_ads')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching polymart_ads:', error);
      } else {
        setAds((data as VendorPromoAd[]) || []);
      }
    } catch (err) {
      console.error('Failed to load ads:', err);
    } finally {
      setLoadingAds(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, [user]);

  const resetAdForm = () => {
    setAdTitle('');
    setAdLinkUrl('');
    setAdImageFile(null);
    setAdImagePreview(null);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAdImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setAdImagePreview(url);
    } else {
      setAdImagePreview(null);
    }
  };

  const handleApplyNewAd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adTitle.trim()) {
      toast.error('Sila masukkan tajuk promo');
      return;
    }
    if (!adImageFile) {
      toast.error('Sila muat naik gambar banner');
      return;
    }

    setSubmittingAd(true);

    try {
      if (
        typeof window !== 'undefined' &&
        localStorage.getItem('use_mock_auth') === 'true'
      ) {
        const payload: VendorPromoAd = {
          id: `mock-ad-${Date.now()}`,
          title: adTitle.trim(),
          image_url:
            adImagePreview ||
            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="250" viewBox="0 0 600 250"><rect width="100%" height="100%" fill="%236b7280"/><text x="50" y="100" font-family="sans-serif" font-size="28" font-weight="bold" fill="white">' +
              encodeURIComponent(adTitle.trim()) +
              '</text></svg>',
          link_url: adLinkUrl.trim() || null,
          type: 'INTERNAL',
          status: 'DRAFT',
          clicks: 0,
          created_by: user?.id || 'demo-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const stored = localStorage.getItem('mock_vendor_ads');
        const parsed: VendorPromoAd[] = stored ? JSON.parse(stored) : [];
        parsed.unshift(payload);
        localStorage.setItem('mock_vendor_ads', JSON.stringify(parsed));

        toast.success('Permohonan iklan berjaya dihantar! Sila tunggu kelulusan Exco.');
        setShowNewAdModal(false);
        resetAdForm();
        fetchAds();
        return;
      }

      // Use image compression before uploading
      const { compressImage } = await import('@/lib/imageCompression');
      const compressedFile = await compressImage(adImageFile);

      const fileExt = compressedFile.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('polymart-ads')
        .upload(fileName, compressedFile, { contentType: compressedFile.type });

      if (uploadErr) throw uploadErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from('polymart-ads').getPublicUrl(fileName);

      const payload = {
        title: adTitle.trim(),
        image_url: publicUrl,
        link_url: adLinkUrl.trim() || null,
        type: 'INTERNAL',
        status: 'DRAFT',
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertErr } = await supabase.from('polymart_ads').insert(payload);
      if (insertErr) throw insertErr;

      toast.success('Permohonan iklan berjaya dihantar! Sila tunggu kelulusan Exco.');
      setShowNewAdModal(false);
      resetAdForm();
      fetchAds();
      if (onUpdate) onUpdate();
    } catch (err: any) {
      toast.error('Ralat menghantar permohonan iklan: ' + (err?.message || 'Sila cuba lagi'));
    } finally {
      setSubmittingAd(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Header Bar with POS Stats Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/40 shadow-sm">
        <div className="space-y-0.5">
          <h2 className="text-base font-black text-foreground tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <span>Prestasi & Promosi Kedai</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Pantau trend hasil jualan harian, amaran baki stok, dan promosi banner PolyMart.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/keusahawanan/pos/stats')}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:scale-[1.02] active:scale-98 shrink-0"
          style={{ background: PM_GRADIENT }}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Lihat Analitik Penuh di POS</span>
        </button>
      </div>

      {/* Two Sub-Domain Pill Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900/60 ring-1 ring-zinc-200 dark:ring-zinc-800/40 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
            activeTab === 'analytics'
              ? 'bg-white dark:bg-zinc-800 text-amber-500 shadow-sm ring-1 ring-zinc-200/80 dark:ring-zinc-700/50'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Prestasi Jualan & Inventori</span>
          {lowStockProducts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-500">
              {lowStockProducts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ads')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all ${
            activeTab === 'ads'
              ? 'bg-white dark:bg-zinc-800 text-amber-500 shadow-sm ring-1 ring-zinc-200/80 dark:ring-zinc-700/50'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Iklan Promo PolyMart</span>
          {ads.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
              {ads.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Prestasi Jualan & Inventori */}
      {activeTab === 'analytics' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Low-Stock Inventory Alerts */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-black text-foreground">Amaran Inventori & Stok Rendah</h3>
              </div>
              {lowStockProducts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  {lowStockProducts.length} Perlu Perhatian
                </span>
              )}
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200/80 dark:border-zinc-800/40 flex items-center gap-3">
                <Package className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">Semua Stok Mencukupi</p>
                  <p className="text-[11px] text-muted-foreground">
                    Tiada produk yang berada di bawah baki 5 unit.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {lowStockProducts.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-colors gap-3"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          Kedai:{' '}
                          {myBusinesses.find(b => b.id === item.business_id)?.name ||
                            'Kedai PolyMart'}
                        </p>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
                      <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                      <span>{`Sisa: ${item.available} unit`}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 7-Day Pre-order Sales Trend Recharts AreaChart */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-black text-foreground">
                    Trend Pra-Pesanan (7 Hari Terakhir)
                  </h3>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Perbandingan jumlah hasil jualan siap berbanding kuantiti tempahan harian.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground text-[11px]">Hasil (RM)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-muted-foreground text-[11px]">Kuantiti Tempahan</span>
                </div>
              </div>
            </div>

            {/* AreaChart or Empty State */}
            {!hasChartData ? (
              <div className="h-56 min-h-[200px] rounded-xl bg-zinc-50 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800/60 flex flex-col items-center justify-center p-6 text-center">
                <BarChart3 className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-bold text-muted-foreground">
                  Tiada data jualan untuk tempoh ini.
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Graf akan memaparkan tren apabila pesanan baru direkodkan.
                </p>
              </div>
            ) : (
              <div className="h-56 min-h-[200px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%" className="min-h-[200px]">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="currentColor"
                      className="text-zinc-200 dark:text-zinc-800/60"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="currentColor"
                      className="text-zinc-500"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis yAxisId="left" stroke="#f59e0b" fontSize={10} tickLine={false} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#6366f1"
                      fontSize={10}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        color: 'var(--foreground)',
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="Jumlah Hasil (RM)"
                      stroke="#f59e0b"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      strokeWidth={2}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="Kuantiti Tempahan"
                      stroke="#6366f1"
                      fillOpacity={1}
                      fill="url(#colorCount)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Iklan Promo PolyMart */}
      {activeTab === 'ads' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border border-border/40 rounded-2xl gap-3 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-foreground">Permohonan Iklan Banner (Promo)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Iklan anda akan dipaparkan di halaman utama PolyMart selepas disemak dan diluluskan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewAdModal(true)}
              className="h-9 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:scale-105 active:scale-95 whitespace-nowrap self-start sm:self-auto"
              style={{ background: PM_GRADIENT }}
            >
              + Mohon Iklan Baru
            </button>
          </div>

          {loadingAds ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ads.length === 0 ? (
            <div className="text-center py-12 bg-card border border-dashed border-border/60 rounded-2xl space-y-3">
              <Megaphone className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">Tiada permohonan iklan lagi</p>
                <p className="text-[11px] text-muted-foreground">
                  Mohon iklan banner untuk mempromosikan produk anda di muka depan PolyMart.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewAdModal(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-xs font-bold text-white shadow-sm"
                style={{ background: PM_GRADIENT }}
              >
                + Mohon Iklan Baru
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {ads.map(ad => (
                <div
                  key={ad.id}
                  className="flex flex-col sm:flex-row gap-3.5 p-3.5 rounded-2xl border border-border/40 bg-card hover:border-amber-500/30 transition-all shadow-sm"
                >
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="w-full sm:w-36 h-24 object-cover rounded-xl bg-muted shrink-0 border border-border/30"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
                    <div>
                      <h4 className="text-xs font-black text-foreground truncate">{ad.title}</h4>
                      {ad.link_url && (
                        <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span>{ad.link_url}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/20">
                      <div>
                        {ad.status === 'APPROVED' || ad.status === 'ACTIVE' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Diluluskan
                          </span>
                        ) : ad.status === 'DRAFT' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Menunggu Kelulusan
                          </span>
                        ) : ad.status === 'REJECTED' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            Ditolak
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                            {ad.status}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                        <span>{ad.clicks || 0} klik</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Permohonan Iklan Baru */}
      <AnimatePresence>
        {showNewAdModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="bg-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-border/50 relative flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-border/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-foreground">Permohonan Iklan Baru</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Isi butiran promosi untuk tatapan pembeli PolyMart.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewAdModal(false)}
                  className="w-8 h-8 rounded-full bg-muted/40 hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleApplyNewAd} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    Tajuk Promo
                  </label>
                  <input
                    type="text"
                    required
                    value={adTitle}
                    onChange={e => setAdTitle(e.target.value)}
                    placeholder="Cth: Promosi Kombo Jimat Akhir Semester"
                    className="w-full h-10 px-3 text-xs bg-muted/30 rounded-xl border border-border/60 outline-none focus:border-amber-500 text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    Pautan / URL Destinasi (Pilihan)
                  </label>
                  <input
                    type="text"
                    value={adLinkUrl}
                    onChange={e => setAdLinkUrl(e.target.value)}
                    placeholder="Cth: /polymart atau pautan luaran"
                    className="w-full h-10 px-3 text-xs bg-muted/30 rounded-xl border border-border/60 outline-none focus:border-amber-500 text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    Gambar Banner (Nisbah 2.5:1 Disyorkan)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={handleImageFileChange}
                    className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-amber-500/10 file:text-amber-600 outline-none text-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground/70">
                    Gambar akan dimampatkan secara automatik sebelum dimuat naik.
                  </p>
                </div>

                {adImagePreview && (
                  <div className="rounded-xl overflow-hidden border border-border/40">
                    <img
                      src={adImagePreview}
                      alt="Banner Preview"
                      className="w-full h-28 object-cover"
                    />
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewAdModal(false)}
                    className="flex-1 h-10 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/40 transition-colors border border-border/60"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAd}
                    className="flex-1 h-10 rounded-xl text-xs font-black text-white transition-all shadow-md disabled:opacity-50"
                    style={{ background: PM_GRADIENT }}
                  >
                    {submittingAd ? 'Menghantar...' : 'Hantar Permohonan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VendorAnalyticsPromo;
