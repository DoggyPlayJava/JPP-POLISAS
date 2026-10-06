import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Package,
  Plus,
  Minus,
  Check,
  X,
  AlertTriangle,
  Search,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Utensils,
  Coffee,
  Layers,
  Wrench,
  Tag,
  Smartphone,
  Clock,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import mockData from '../mockData.json';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ProductVariation {
  name: string;
  stock: number;
  reserved?: number;
  price?: number;
}

export interface BusinessProduct {
  id: string;
  business_id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
  is_available: boolean;
  variations: ProductVariation[] | null;
  stock_quantity: number | null;
  reserved_stock: number | null;
}

export interface VendorCatalogManagerProps {
  myBusinesses: Array<{ id: string; name: string }>;
  selectedBizId: string;
  onBizChange: (bizId: string) => void;
  onUpdate?: () => void;
}

// ── Helper: Category Icon ──────────────────────────────────────────────────────
const getCategoryIcon = (category: string) => {
  const className = "w-5 h-5 text-muted-foreground/60 stroke-[1.75]";
  switch (category) {
    case 'Makanan':
      return <Utensils className={className} />;
    case 'Minuman':
      return <Coffee className={className} />;
    case 'Aksesori':
      return <Layers className={className} />;
    case 'Perkhidmatan':
      return <Wrench className={className} />;
    case 'Pakaian':
      return <Tag className={className} />;
    case 'Elektronik':
      return <Smartphone className={className} />;
    default:
      return <Package className={className} />;
  }
};

export function VendorCatalogManager({
  myBusinesses,
  selectedBizId,
  onBizChange,
  onUpdate,
}: VendorCatalogManagerProps) {
  // ── Smart Auto-Selection (No blocker screen) ─────────────────────────────────
  const effectiveBizId = useMemo(() => {
    if (selectedBizId && selectedBizId !== 'all') {
      const match = myBusinesses.find(b => b.id === selectedBizId);
      if (match) return selectedBizId;
    }
    return myBusinesses[0]?.id || '';
  }, [selectedBizId, myBusinesses]);

  // Sync back to parent if 'all' or empty
  useEffect(() => {
    if ((!selectedBizId || selectedBizId === 'all') && myBusinesses.length > 0) {
      onBizChange(myBusinesses[0].id);
    }
  }, [selectedBizId, myBusinesses, onBizChange]);

  // ── States ────────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<BusinessProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Inline stock edit states
  const [editingBaseStock, setEditingBaseStock] = useState<{ productId: string; value: string } | null>(null);
  const [editingVarStock, setEditingVarStock] = useState<{ productId: string; varName: string; value: string } | null>(null);
  const [savingStockId, setSavingStockId] = useState<string | null>(null);

  // ── Data Fetching ─────────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    if (!effectiveBizId) {
      setProducts([]);
      return;
    }

    setLoading(true);

    if (typeof window !== 'undefined' && localStorage.getItem('use_mock_auth') === 'true') {
      let stored = localStorage.getItem('mock_vendor_products');
      let parsedProducts: any[] = [];
      try {
        parsedProducts = stored ? JSON.parse(stored) : [];
      } catch {
        parsedProducts = [];
      }

      if (!Array.isArray(parsedProducts) || parsedProducts.length === 0) {
        const defaultProducts = mockData.products && mockData.products.length > 0
          ? mockData.products
          : [];
        try {
          localStorage.setItem('mock_vendor_products', JSON.stringify(defaultProducts));
        } catch {
          // ignore storage quota errors
        }
        parsedProducts = defaultProducts;
      }

      const filtered = parsedProducts.filter((p: any) => p.business_id === effectiveBizId);
      setProducts(filtered);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('business_products')
        .select('id, business_id, name, price, image_url, category, is_available, variations, stock_quantity, reserved_stock')
        .eq('business_id', effectiveBizId)
        .order('name');

      if (error) {
        toast.error('Ralat memuatkan produk: ' + error.message);
      } else {
        setProducts((data as BusinessProduct[]) || []);
      }
    } catch {
      toast.error('Gagal berhubung dengan pelayan');
    } finally {
      setLoading(false);
    }
  }, [effectiveBizId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ── Product Availability Toggle ──────────────────────────────────────────────
  const toggleProductAvailability = async (prodId: string, current: boolean) => {
    setTogglingId(prodId);
    const updatedStatus = !current;

    // Optimistic UI update
    setProducts(prev => prev.map(p => p.id === prodId ? { ...p, is_available: updatedStatus } : p));

    if (typeof window !== 'undefined' && localStorage.getItem('use_mock_auth') === 'true') {
      const stored = localStorage.getItem('mock_vendor_products');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const updated = parsed.map((p: any) => p.id === prodId ? { ...p, is_available: updatedStatus } : p);
          localStorage.setItem('mock_vendor_products', JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      toast.success(updatedStatus ? 'Produk kini dibuka untuk jualan' : 'Produk telah ditutup daripada jualan');
      setTogglingId(null);
      onUpdate?.();
      return;
    }

    try {
      const { error } = await supabase
        .from('business_products')
        .update({ is_available: updatedStatus })
        .eq('id', prodId);

      if (error) {
        toast.error('Ralat mengemaskini status ketersediaan');
        loadProducts();
      } else {
        toast.success(updatedStatus ? 'Produk kini dibuka untuk jualan' : 'Produk telah ditutup daripada jualan');
        onUpdate?.();
      }
    } catch {
      toast.error('Gagal berhubung dengan pelayan');
      loadProducts();
    } finally {
      setTogglingId(null);
    }
  };

  // ── Stock Adjustments (Base Product) ──────────────────────────────────────────
  const handleSaveBaseStock = async (prodId: string, valueStr: string) => {
    const newVal = parseInt(valueStr, 10);
    if (isNaN(newVal) || newVal < 0) {
      toast.error('Masukkan kuantiti stok yang sah!');
      return;
    }

    setSavingStockId(prodId);

    // Optimistic UI update
    setProducts(prev => prev.map(p => p.id === prodId ? { ...p, stock_quantity: newVal } : p));

    if (typeof window !== 'undefined' && localStorage.getItem('use_mock_auth') === 'true') {
      const stored = localStorage.getItem('mock_vendor_products');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const updated = parsed.map((p: any) => p.id === prodId ? { ...p, stock_quantity: newVal } : p);
          localStorage.setItem('mock_vendor_products', JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      toast.success('Stok produk berjaya dikemaskini');
      setEditingBaseStock(null);
      setSavingStockId(null);
      onUpdate?.();
      return;
    }

    try {
      const { error } = await supabase
        .from('business_products')
        .update({ stock_quantity: newVal })
        .eq('id', prodId);

      if (error) {
        toast.error('Gagal mengemaskini stok: ' + error.message);
        loadProducts();
      } else {
        toast.success('Stok produk berjaya dikemaskini');
        setEditingBaseStock(null);
        onUpdate?.();
      }
    } catch {
      toast.error('Ralat pangkalan data');
      loadProducts();
    } finally {
      setSavingStockId(null);
    }
  };

  const handleStepBaseStock = async (product: BusinessProduct, delta: number) => {
    const current = product.stock_quantity ?? 0;
    const nextVal = Math.max(0, current + delta);
    await handleSaveBaseStock(product.id, nextVal.toString());
  };

  // ── Stock Adjustments (Variations) ────────────────────────────────────────────
  const handleSaveVariationStock = async (
    prodId: string,
    variations: ProductVariation[],
    varName: string,
    valueStr: string
  ) => {
    const newVal = parseInt(valueStr, 10);
    if (isNaN(newVal) || newVal < 0) {
      toast.error('Masukkan kuantiti stok yang sah!');
      return;
    }

    setSavingStockId(`${prodId}-${varName}`);

    const updatedVariations = variations.map(v => (v.name === varName ? { ...v, stock: newVal } : v));

    // Optimistic UI update
    setProducts(prev => prev.map(p => p.id === prodId ? { ...p, variations: updatedVariations } : p));

    if (typeof window !== 'undefined' && localStorage.getItem('use_mock_auth') === 'true') {
      const stored = localStorage.getItem('mock_vendor_products');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const updated = parsed.map((p: any) => p.id === prodId ? { ...p, variations: updatedVariations } : p);
          localStorage.setItem('mock_vendor_products', JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      toast.success('Stok variasi berjaya dikemaskini');
      setEditingVarStock(null);
      setSavingStockId(null);
      onUpdate?.();
      return;
    }

    try {
      const { error } = await supabase
        .from('business_products')
        .update({ variations: updatedVariations })
        .eq('id', prodId);

      if (error) {
        toast.error('Gagal mengemaskini stok variasi');
        loadProducts();
      } else {
        toast.success('Stok variasi berjaya dikemaskini');
        setEditingVarStock(null);
        onUpdate?.();
      }
    } catch {
      toast.error('Ralat pangkalan data');
      loadProducts();
    } finally {
      setSavingStockId(null);
    }
  };

  const handleStepVariationStock = async (
    product: BusinessProduct,
    varName: string,
    delta: number
  ) => {
    if (!product.variations) return;
    const currentVar = product.variations.find(v => v.name === varName);
    const currentStock = currentVar ? currentVar.stock : 0;
    const nextVal = Math.max(0, currentStock + delta);
    await handleSaveVariationStock(product.id, product.variations, varName, nextVal.toString());
  };

  // ── Filters ───────────────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategory === 'all' || p.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const activeBiz = myBusinesses.find(b => b.id === effectiveBizId);

  // ── Empty State: No Business ──────────────────────────────────────────────────
  if (myBusinesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card/40 rounded-2xl border border-border/60 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
          <Store className="w-7 h-7" />
        </div>
        <p className="text-sm font-black text-foreground">Tiada Kedai Didaftarkan</p>
        <p className="text-xs text-muted-foreground max-w-xs -mt-1 leading-normal">
          Daftar perniagaan anda di modul e-Keusahawanan untuk mula mengurus produk dan menerima pesanan PolyMart.
        </p>
        <Link
          to="/keusahawanan"
          className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-sm"
        >
          <Store className="w-4 h-4" />
          <span>Daftar Kedai di e-Keusahawanan</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Top Header & Direct POS Integration Link ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/60 hover:border-amber-400/50 transition-all duration-300 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-foreground">
                Katalog &amp; Kawalan Stok Pantas
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium">
                Kemas kini ketersediaan jualan dan pelaras pantas stok produk kedai anda
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Direct POS Product Management */}
        <Link
          to="/keusahawanan/pos/products"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-sm active:scale-98 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Urus Penuh / Tambah Produk di POS</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </Link>
      </div>

      {/* ── Store Switcher Capsule (If multiple stores exist) ── */}
      {myBusinesses.length > 1 ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none px-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" />
            <span>Pilih Kedai:</span>
          </span>
          {myBusinesses.map(b => {
            const isSelected = b.id === effectiveBizId;
            return (
              <button
                key={b.id}
                onClick={() => onBizChange(b.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-2 ring-amber-500/30'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
                }`}
              >
                <span>{b.name}</span>
              </button>
            );
          })}
        </div>
      ) : activeBiz ? (
        <div className="flex items-center gap-2 px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold">
            <Store className="w-3.5 h-3.5" />
            <span>{activeBiz.name}</span>
          </div>
        </div>
      ) : null}

      {/* ── Search Bar & Category Filters ── */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama produk atau kategori..."
              className="w-full pl-9 pr-8 py-2 bg-muted/40 border border-border/50 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground p-0.5"
                title="Kosongkan carian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={loadProducts}
            disabled={loading}
            className="h-8.5 px-3 rounded-xl bg-muted/40 hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-bold transition-all shrink-0"
            title="Muat semula senarai produk"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">Segar Semula</span>
          </button>
        </div>

        {/* Category Pills */}
        {categories.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30'
                }`}
              >
                {cat === 'all' ? 'Semua Kategori' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Products List Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card/20 rounded-2xl border border-border/40">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-xs font-bold text-muted-foreground">Memuatkan katalog produk...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card/20 rounded-2xl border border-border/40 text-center px-4">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center text-muted-foreground/50">
            <Package className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-muted-foreground">
            {searchQuery || selectedCategory !== 'all'
              ? 'Tiada produk menepati carian atau kategori anda.'
              : 'Tiada produk didaftarkan di bawah kedai ini.'}
          </p>
          <p className="text-[11px] text-muted-foreground/60 max-w-xs -mt-1 leading-normal">
            Gunakan sistem POS untuk menambah dan mengurus inventori produk kedai anda.
          </p>
          <Link
            to="/keusahawanan/pos/products"
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Urus Penuh / Tambah Produk di POS</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {filteredProducts.map(p => {
            const hasVariations = Array.isArray(p.variations) && p.variations.length > 0;
            const availableBaseStock = (p.stock_quantity ?? 0) - (p.reserved_stock ?? 0);
            const isLowBase = availableBaseStock <= 5;

            return (
              <div
                key={p.id}
                className="p-4 rounded-2xl border border-border/60 hover:border-amber-400/50 bg-card/60 backdrop-blur-md shadow-xs space-y-3.5 transition-all duration-300"
              >
                {/* Header: Image/Icon, Name, Price, Category */}
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-muted/60 border border-border/40 flex items-center justify-center text-foreground">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      getCategoryIcon(p.category)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs sm:text-sm font-black text-foreground truncate" title={p.name}>
                        {p.name}
                      </p>
                      <span className="text-xs font-black text-amber-500 shrink-0">
                        RM {p.price.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mt-0.5">
                      {p.category || 'Umum'}
                    </p>
                  </div>
                </div>

                {/* Stock Status Availability Toggle */}
                <div className="flex items-center justify-between pt-2.5 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        p.is_available ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    <span
                      className={`text-[10px] sm:text-[11px] font-black ${
                        p.is_available ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {p.is_available ? 'Tersedia untuk Pelanggan' : 'Tutup Jualan'}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleProductAvailability(p.id, p.is_available)}
                    disabled={togglingId === p.id}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all shadow-xs flex items-center gap-1 ${
                      p.is_available
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20'
                    }`}
                  >
                    {togglingId === p.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : p.is_available ? (
                      <>
                        <X className="w-3 h-3" />
                        <span>Tutup Jualan</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Buka Jualan</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Variations Stock Manager */}
                {hasVariations ? (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30 space-y-2">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                      Stok Mengikut Variasi
                    </p>
                    <div className="divide-y divide-border/20 space-y-2">
                      {p.variations!.map((v) => {
                        const isEditing =
                          editingVarStock?.productId === p.id &&
                          editingVarStock?.varName === v.name;
                        const varAvailable = v.stock - (v.reserved || 0);
                        const isLowVar = varAvailable <= 5;
                        const isSavingThis = savingStockId === `${p.id}-${v.name}`;

                        return (
                          <div
                            key={v.name}
                            className="flex items-center justify-between pt-2 first:pt-0 text-[11px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-black uppercase bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg text-[9px] text-amber-500">
                                {v.name}
                              </span>
                              {isLowVar && (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 uppercase tracking-wide flex items-center gap-0.5 shrink-0">
                                  <AlertTriangle className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                                  <span>Stok Rendah</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-right shrink-0 mr-1">
                                <p className="font-bold text-[10px] text-foreground">
                                  Stok Fizikal: {v.stock} unit
                                </p>
                                {(v.reserved ?? 0) > 0 && (
                                  <p className="text-[9px] text-amber-500 font-bold">
                                    Ditempah: {v.reserved}
                                  </p>
                                )}
                                <p
                                  className={`text-[9.5px] font-black ${
                                    isLowVar ? 'text-rose-500' : 'text-emerald-500'
                                  }`}
                                >
                                  Boleh Dijual: {varAvailable}
                                </p>
                              </div>

                              {isEditing ? (
                                <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1 shadow-inner">
                                  <button
                                    onClick={() =>
                                      setEditingVarStock(prev =>
                                        prev
                                          ? {
                                              ...prev,
                                              value: Math.max(
                                                0,
                                                parseInt(prev.value || '0', 10) - 1
                                              ).toString(),
                                            }
                                          : null
                                      )
                                    }
                                    className="w-7 h-7 bg-muted/50 border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg flex items-center justify-center transition-all"
                                    title="Tolak 1"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    type="number"
                                    value={editingVarStock.value}
                                    onChange={(e) =>
                                      setEditingVarStock(prev =>
                                        prev ? { ...prev, value: e.target.value } : null
                                      )
                                    }
                                    className="w-12 h-7 bg-transparent border-0 text-center font-black text-xs text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0"
                                  />
                                  <button
                                    onClick={() =>
                                      setEditingVarStock(prev =>
                                        prev
                                          ? {
                                              ...prev,
                                              value: (
                                                parseInt(prev.value || '0', 10) + 1
                                              ).toString(),
                                            }
                                          : null
                                      )
                                    }
                                    className="w-7 h-7 bg-muted/50 border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg flex items-center justify-center transition-all"
                                    title="Tambah 1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>

                                  <div className="w-px h-5 bg-border/40 mx-0.5" />

                                  <button
                                    onClick={() =>
                                      handleSaveVariationStock(
                                        p.id,
                                        p.variations!,
                                        v.name,
                                        editingVarStock.value
                                      )
                                    }
                                    disabled={isSavingThis}
                                    className="w-7 h-7 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg flex items-center justify-center shadow-xs active:scale-95 transition-all"
                                    title="Simpan Stok"
                                  >
                                    {isSavingThis ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setEditingVarStock(null)}
                                    className="w-7 h-7 bg-rose-500 text-white hover:bg-rose-600 rounded-lg flex items-center justify-center shadow-xs active:scale-95 transition-all"
                                    title="Batal"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleStepVariationStock(p, v.name, -1)}
                                    disabled={v.stock <= 0}
                                    className="w-6 h-6 rounded-lg bg-muted/50 border border-border/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-xs font-bold transition-all disabled:opacity-40"
                                    title="Tolak 1 Stok"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleStepVariationStock(p, v.name, 1)}
                                    className="w-6 h-6 rounded-lg bg-muted/50 border border-border/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-xs font-bold transition-all"
                                    title="Tambah 1 Stok"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setEditingVarStock({
                                        productId: p.id,
                                        varName: v.name,
                                        value: v.stock.toString(),
                                      })
                                    }
                                    className="px-2 py-1 rounded-lg border border-border/60 bg-card/60 text-[9px] font-bold text-muted-foreground hover:text-foreground hover:border-amber-500/40 transition-all shadow-2xs"
                                  >
                                    Ubah
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Base Product Stock (No Variations)
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                        Kuantiti Stok Utama
                      </p>
                      <div className="mt-1 space-y-0.5">
                        <p className="text-[11px] font-bold text-foreground">
                          Stok Fizikal: <span className="font-black">{p.stock_quantity ?? 0}</span> unit
                        </p>
                        {(p.reserved_stock ?? 0) > 0 && (
                          <p className="text-[9.5px] text-amber-500 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>Ditempah: {p.reserved_stock} unit</span>
                          </p>
                        )}
                        <p
                          className={`text-[10px] font-black flex items-center gap-1 ${
                            isLowBase ? 'text-rose-500' : 'text-emerald-500'
                          }`}
                        >
                          <span>Boleh Dijual: {availableBaseStock} unit</span>
                          {isLowBase && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 uppercase tracking-wide flex items-center gap-0.5 shrink-0">
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                              <span>Stok Rendah</span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {editingBaseStock?.productId === p.id ? (
                        <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1 shadow-inner">
                          <button
                            onClick={() =>
                              setEditingBaseStock(prev =>
                                prev
                                  ? {
                                      ...prev,
                                      value: Math.max(
                                        0,
                                        parseInt(prev.value || '0', 10) - 1
                                      ).toString(),
                                    }
                                  : null
                              )
                            }
                            className="w-7 h-7 bg-muted/50 border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg flex items-center justify-center transition-all"
                            title="Tolak 1"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            value={editingBaseStock.value}
                            onChange={(e) =>
                              setEditingBaseStock(prev =>
                                prev ? { ...prev, value: e.target.value } : null
                              )
                            }
                            className="w-12 h-7 bg-transparent border-0 text-center font-black text-xs text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                          />
                          <button
                            onClick={() =>
                              setEditingBaseStock(prev =>
                                prev
                                  ? {
                                      ...prev,
                                      value: (
                                        parseInt(prev.value || '0', 10) + 1
                                      ).toString(),
                                    }
                                  : null
                              )
                            }
                            className="w-7 h-7 bg-muted/50 border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg flex items-center justify-center transition-all"
                            title="Tambah 1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          <div className="w-px h-5 bg-border/40 mx-0.5" />

                          <button
                            onClick={() =>
                              handleSaveBaseStock(p.id, editingBaseStock.value)
                            }
                            disabled={savingStockId === p.id}
                            className="w-7 h-7 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg flex items-center justify-center shadow-xs active:scale-95 transition-all"
                            title="Simpan Stok"
                          >
                            {savingStockId === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingBaseStock(null)}
                            className="w-7 h-7 bg-rose-500 text-white hover:bg-rose-600 rounded-lg flex items-center justify-center shadow-xs active:scale-95 transition-all"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStepBaseStock(p, -1)}
                            disabled={(p.stock_quantity ?? 0) <= 0}
                            className="w-7 h-7 rounded-lg bg-muted/50 border border-border/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-xs font-bold transition-all disabled:opacity-40"
                            title="Tolak 1 Stok"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStepBaseStock(p, 1)}
                            className="w-7 h-7 rounded-lg bg-muted/50 border border-border/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-xs font-bold transition-all"
                            title="Tambah 1 Stok"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setEditingBaseStock({
                                productId: p.id,
                                value: (p.stock_quantity ?? 0).toString(),
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-border/60 bg-card/60 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:border-amber-500/40 transition-all shadow-2xs"
                          >
                            Ubah Stok
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default VendorCatalogManager;
