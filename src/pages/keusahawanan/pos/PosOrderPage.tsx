import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSwitcher } from '@/contexts/BusinessSwitcherContext';
import { usePosData, ProcessTransactionPayload } from '@/hooks/usePosData';
import { hexToRgba } from '@/lib/utils';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, X, Percent, Tag,
  CreditCard, Banknote, QrCode, CheckCircle2, FileText, AlertTriangle,
  ShieldOff, Package, ChevronDown, RotateCcw, Ticket,
} from 'lucide-react';
import { type BusinessProduct, type BusinessTransactionItem, type BusinessPromotion } from '@/types';
import toast from 'react-hot-toast';
import { EInvoiceModal } from '@/components/keusahawanan/EInvoiceModal';
import { supabase } from '@/lib/supabase';
import { PosScannerModal } from './PosScannerModal';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtRM = (v: number) => `RM ${v.toFixed(2)}`;

// ── POS Access Denied ─────────────────────────────────────────────────────────

function PosAccessDenied({ color }: { color: string }) {
  return (
    <div className="min-h-full flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 bg-muted"
          style={{ border: `2px solid ${hexToRgba(color, 0.25)}` }}>
          <ShieldOff className="w-9 h-9 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-black mb-2 text-foreground">Akses POS Ditolak</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Hanya <span className="font-bold text-foreground">pemilik perniagaan</span>, <span className="font-bold text-foreground">staff bertugas hari ini</span>, atau <span className="font-bold text-foreground">Exco Keusahawanan</span> boleh mengakses POS.
        </p>
        <div className="mt-5 px-4 py-3 rounded-2xl bg-muted/50 border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
          Hubungi pemilik bisnes untuk penetapan akses hari ini.
        </div>
      </motion.div>
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ product, onAdd, color }: { product: BusinessProduct; onAdd: (p: BusinessProduct) => void; color: string }) {
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= product.stock_alert_threshold;
  const isOutOfStock = product.stock_quantity === 0;

  return (
    <motion.button
      onClick={() => !isOutOfStock && product.is_available && onAdd(product)}
      whileHover={!isOutOfStock && product.is_available ? { scale: 1.02 } : {}}
      whileTap={!isOutOfStock && product.is_available ? { scale: 0.97 } : {}}
      disabled={isOutOfStock || !product.is_available}
      className="relative group rounded-2xl overflow-hidden bg-card border border-border text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:border-border/80"
    >
      {/* Product image or placeholder */}
      <div className="aspect-square bg-muted/30 relative overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-muted/20 to-muted/50">
            <Package className="w-10 h-10 text-muted-foreground/20" />
          </div>
        )}
        {/* Overlay add button */}
        {!isOutOfStock && product.is_available && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: hexToRgba(color, 0.8) }}>
            <Plus className="w-8 h-8 text-white" />
          </div>
        )}
        {/* Stock badges */}
        {isLowStock && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black">
            Stok: {product.stock_quantity}
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-[10px] font-black uppercase text-white tracking-widest">Habis</span>
          </div>
        )}
        {!product.is_available && !isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-[10px] font-black uppercase text-white tracking-widest">Tidak Aktif</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 mb-0.5">{product.category}</p>
        <p className="text-xs font-black text-foreground leading-tight line-clamp-2 mb-2">{product.name}</p>
        <p className="text-sm font-black" style={{ color }}>{fmtRM(product.price)}</p>
      </div>
    </motion.button>
  );
}

// ── Cart Item Row ─────────────────────────────────────────────────────────────

function CartItemRow({
  item, onQtyChange, onRemove, color
}: {
  item: BusinessTransactionItem;
  onQtyChange: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  color: string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
      className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-foreground leading-tight line-clamp-1">{item.name}</p>
        <p className="text-[10px] text-muted-foreground">{fmtRM(item.unit_price)}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={() => onQtyChange(item.product_id, item.qty - 1)}
          className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors active:scale-90">
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-6 text-center text-xs font-black">{item.qty}</span>
        <button onClick={() => onQtyChange(item.product_id, item.qty + 1)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors active:scale-90 text-white"
          style={{ background: color }}>
          <Plus className="w-3 h-3" />
        </button>
      </div>
      <p className="text-xs font-black text-foreground w-16 text-right">{fmtRM(item.total_price)}</p>
      <button onClick={() => onRemove(item.product_id)}
        className="w-7 h-7 rounded-lg text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors active:scale-90">
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// ── Main POS Order Page ───────────────────────────────────────────────────────

export function PosOrderPage() {
  const { color } = useExcoTheme();
  const { profile } = useAuth();
  const { selectedBusiness, isLoading: isBusinessLoading, isKeusahawananAdmin } = useBusinessSwitcher();

  const businessId = selectedBusiness?.id;
  const activeBusiness = selectedBusiness;

  const pos = usePosData(businessId, isBusinessLoading);

  // ── State ─────────────────────────────────────────────────────────────────

  const [search, setSearch]             = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [cart, setCart]                 = useState<BusinessTransactionItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QR' | 'TRANSFER'>('CASH');
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('');
  const [discountNote, setDiscountNote] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [processing, setProcessing]     = useState(false);
  const [successTxn, setSuccessTxn]     = useState<any>(null);
  const [showInvoice, setShowInvoice]   = useState(false);

  // PolyMart Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scannedOrder, setScannedOrder] = useState<any>(null);

  // Ciri 5: Kupon / Promosi
  const promotionsEnabled = (selectedBusiness as any)?.promotions_enabled ?? false;
  const [couponCode, setCouponCode]         = useState('');
  const [couponValidating, setCouponValidating] = useState(false);
  const [appliedPromo, setAppliedPromo]     = useState<BusinessPromotion | null>(null);
  const [couponError, setCouponError]       = useState('');

  const searchRef = useRef<HTMLInputElement>(null);

  // ── Derived ───────────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const cats = Array.from(new Set(pos.products.map(p => p.category)));
    return ['Semua', ...cats.sort()];
  }, [pos.products]);

  const filteredProducts = useMemo(() => {
    return pos.products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat    = categoryFilter === 'Semua' || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [pos.products, search, categoryFilter]);

  const subtotal = cart.reduce((s, i) => s + i.total_price, 0);

  // Manual diskaun (hanya aktif jika tiada promo digunakan)
  const discountRM = useMemo(() => {
    if (appliedPromo) return 0; // mutex: kupon mengatasi manual diskaun
    const v = parseFloat(discountValue) || 0;
    if (!discountEnabled || v <= 0) return 0;
    if (discountType === 'PERCENT') return parseFloat(((v / 100) * subtotal).toFixed(2));
    return Math.min(v, subtotal);
  }, [appliedPromo, discountEnabled, discountType, discountValue, subtotal]);

  // Diskaun dari kupon promosi
  const promoDiscountRM = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.discount_type === 'PERCENT')
      return parseFloat(((appliedPromo.discount_value / 100) * subtotal).toFixed(2));
    return Math.min(appliedPromo.discount_value, subtotal);
  }, [appliedPromo, subtotal]);

  const effectiveDiscountRM = appliedPromo ? promoDiscountRM : discountRM;
  const totalAmount  = Math.max(0, subtotal - effectiveDiscountRM);
  const receivedRM   = parseFloat(receivedAmount) || 0;
  const changeAmount = paymentMethod === 'CASH' ? receivedRM - totalAmount : 0;

  // ── Cart Handlers ─────────────────────────────────────────────────────────

  const addToCart = useCallback((product: BusinessProduct) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, qty: i.qty + 1, total_price: parseFloat(((i.qty + 1) * product.price).toFixed(2)) }
          : i
        );
      }
      return [...prev, {
        product_id:  product.id,
        name:        product.name,
        qty:         1,
        unit_price:  product.price,
        total_price: product.price,
      }];
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.product_id !== productId));
      return;
    }
    const product = pos.products.find(p => p.id === productId);
    if (!product) return;
    setCart(prev => prev.map(i => i.product_id === productId
      ? { ...i, qty, total_price: parseFloat((qty * product.price).toFixed(2)) }
      : i
    ));
  }, [pos.products]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  }, []);

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerNote('');
    setDiscountEnabled(false);
    setDiscountValue('');
    setDiscountNote('');
    setReceivedAmount('');
    setPaymentMethod('CASH');
    // Reset kupon
    setCouponCode('');
    setAppliedPromo(null);
    setCouponError('');
  };

  // Ciri 5: Validate & apply promo code
  const handleApplyCoupon = async () => {
    if (!businessId || !couponCode.trim()) return;
    setCouponValidating(true);
    setCouponError('');
    const result = await pos.validatePromoCode(businessId, couponCode.trim(), subtotal);
    setCouponValidating(false);
    if (result.valid && result.promotion) {
      setAppliedPromo(result.promotion);
      setDiscountEnabled(false); // mutex: clear manual diskaun
      setDiscountValue('');
      setDiscountNote('');
      toast.success(`Kupon "${result.promotion.code}" berjaya digunakan!`);
    } else {
      setCouponError(result.error ?? 'Kod tidak sah.');
      setAppliedPromo(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedPromo(null);
    setCouponCode('');
    setCouponError('');
  };

  // ── Process Payment ───────────────────────────────────────────────────────

  const handleProcess = async () => {
    if (!businessId || cart.length === 0) return;
    if (paymentMethod === 'CASH' && receivedRM < totalAmount) {
      toast.error('Jumlah diterima tidak mencukupi!');
      return;
    }

    setProcessing(true);
    const result = await pos.processTransaction({
      businessId,
      items: cart,
      paymentMethod,
      // Jika kupon digunakan, hantar sebagai PERCENT/FIXED diskaun
      discountType:   appliedPromo ? appliedPromo.discount_type : (discountEnabled ? discountType : undefined),
      discountAmount: appliedPromo ? appliedPromo.discount_value : (discountEnabled ? (parseFloat(discountValue) || 0) : 0),
      discountNote:   appliedPromo ? `Kupon: ${appliedPromo.code}` : (discountEnabled ? discountNote : undefined),
      receivedAmount: paymentMethod === 'CASH' ? receivedRM : undefined,
      customerName:   customerName || undefined,
      customerNote:   customerNote || undefined,
      promotionId:    appliedPromo?.id,
      promotionCode:  appliedPromo?.code,
    });
    setProcessing(false);

    if (result?.error) { toast.error(result.error); return; }

    setSuccessTxn({
      ...result?.transaction,
      subtotal,
      discountRM: effectiveDiscountRM,
      totalAmount,
      changeAmount,
      businessName: activeBusiness?.name,
      businessLogo: activeBusiness?.logo_url,
      serverName:   profile?.full_name,
    });
    clearCart();
  };

  // ── PolyMart Scan Handlers ────────────────────────────────────────────────
  const handleScan = async (decodedText: string) => {
    setShowScanner(false);
    setProcessing(true);
    try {
      const { data, error } = await supabase
        .from('polymart_orders')
        .select(`
          *,
          business_products ( id, name, price ),
          buyer:user_id ( id, full_name )
        `)
        .eq('id', decodedText)
        .single();
        
      if (error || !data) throw new Error('Pesanan tidak wujud');
      if (data.status !== 'READY' && data.status !== 'CONFIRMED') throw new Error(`Pesanan ini berstatus ${data.status}`);
      if (data.business_id !== businessId) throw new Error('Pesanan ini bukan untuk perniagaan anda');
      
      setScannedOrder(data);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyemak pesanan PolyMart');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompletePolyMart = async () => {
    if (!scannedOrder) return;
    setProcessing(true);
    try {
      const pm = scannedOrder.payment_method || 'CASH';
      const { error } = await supabase.rpc('complete_polymart_order', {
        p_order_id: scannedOrder.id,
        p_business_id: scannedOrder.business_id,
        p_product_id: scannedOrder.product_id,
        p_quantity: scannedOrder.quantity,
        p_unit_price: scannedOrder.unit_price,
        p_payment_method: pm,
        p_served_by: profile?.id
      });
      if (error) throw error;
      toast.success('Pesanan PolyMart selesai!');
      setScannedOrder(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyelesaikan pesanan');
    } finally {
      setProcessing(false);
    }
  };

  // ── Loading / access states ───────────────────────────────────────────────

  if (isBusinessLoading || pos.isLoading || pos.posAccess === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
          {isBusinessLoading ? 'Memuatkan perniagaan...' : 'Menyemak akses...'}
        </p>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm font-black text-muted-foreground/50">Anda belum menyertai mana-mana perniagaan.</p>
          <p className="text-[10px] text-muted-foreground/30 mt-1">Sertai atau tubuhkan perniagaan untuk menggunakan POS.</p>
        </div>
      </div>
    );
  }

  if (pos.posAccess === false) return <PosAccessDenied color={color} />;

  // ── POS Low Stock Banner ──────────────────────────────────────────────────

  const lowStockItems = pos.products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.stock_alert_threshold);

  return (
    <div className="min-h-full flex flex-col">
      {/* Low stock banner */}
      <AnimatePresence>
        {lowStockItems.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-3 px-5 py-3 bg-amber-500/10 border-b border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">
              Stok Rendah: {lowStockItems.map(p => `${p.name} (${p.stock_quantity})`).join(' · ')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main POS layout */}
      <div className="flex flex-1 overflow-hidden min-h-0 flex-col lg:flex-row">

        {/* ── LEFT: Product Grid ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border/50">
          {/* Search + category filter */}
          <div className="p-4 space-y-3 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              <input
                ref={searchRef}
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari produk..."
                className="w-full h-11 pl-10 pr-10 rounded-2xl text-sm font-medium outline-none bg-muted/40 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <button key={cat} onClick={() => setCategoryFilter(cat)}
                  className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border shrink-0"
                  style={categoryFilter === cat
                    ? { background: hexToRgba(color, 0.1), borderColor: hexToRgba(color, 0.4), color }
                    : { background: 'transparent', borderColor: 'hsl(var(--border)/0.5)', color: 'hsl(var(--muted-foreground)/0.6)' }
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {pos.products.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <Package className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-black text-muted-foreground/40">Tiada produk dalam katalog.</p>
                <p className="text-[10px] text-muted-foreground/30 mt-1">Tambah produk di halaman Produk.</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-40 flex items-center justify-center">
                <p className="text-sm font-black text-muted-foreground/40">Tiada produk dijumpai.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} onAdd={addToCart} color={color} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart & Checkout ─────────────────────────────────────── */}
        <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col bg-card border-t lg:border-t-0 border-border/50 max-h-[55vh] lg:max-h-none">
          
          {/* Cart Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-4 h-4" style={{ color }} />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Troli</span>
              {cart.length > 0 && (
                <span className="w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center" style={{ background: color }}>
                  {cart.length}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowScanner(true)} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white px-3 py-1.5 rounded-lg transition-transform hover:scale-105 active:scale-95 shadow-md" style={{ background: color }}>
                <QrCode className="w-3 h-3" /> Imbas PolyMart
              </button>
              {cart.length > 0 && (
                <button onClick={clearCart} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground/50 hover:text-rose-500 transition-colors ml-2">
                  <RotateCcw className="w-3 h-3" /> Kosongkan
                </button>
              )}
            </div>
          </div>

          {/* Scrollable cart + checkout */}
          <div className="flex-1 overflow-y-auto">
            {/* Cart items */}
            <div className="px-5 py-3">
              {cart.length === 0 ? (
                <div className="py-10 text-center">
                  <ShoppingCart className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/30">Troli kosong</p>
                  <p className="text-[10px] text-muted-foreground/20 mt-1">Pilih produk dari grid kiri</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {cart.map(item => (
                    <CartItemRow key={item.product_id} item={item} onQtyChange={updateQty} onRemove={removeFromCart} color={color} />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {cart.length > 0 && (
              <div className="px-5 pb-5 space-y-4">
                {/* Customer info */}
                <div className="space-y-2">
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                    placeholder="Nama pelanggan (pilihan)"
                    className="w-full h-10 px-4 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                  <input value={customerNote} onChange={e => setCustomerNote(e.target.value)}
                    placeholder="Catatan pesanan (pilihan)"
                    className="w-full h-10 px-4 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                </div>

                {/* Payment method */}
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'CASH',     icon: Banknote,    label: 'Tunai'    },
                    { key: 'QR',       icon: QrCode,      label: 'QR'       },
                    { key: 'TRANSFER', icon: CreditCard,  label: 'Transfer' },
                  ] as const).map(({ key, icon: Icon, label }) => (
                    <button key={key} onClick={() => setPaymentMethod(key)}
                      className="h-10 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                      style={paymentMethod === key
                        ? { background: hexToRgba(color, 0.1), borderColor: hexToRgba(color, 0.4), color }
                        : { background: 'transparent', borderColor: 'hsl(var(--border)/0.5)', color: 'hsl(var(--muted-foreground)/0.5)' }
                      }
                    >
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  ))}
                </div>

                {/* Ciri 5: Kupon Promosi — hanya jika promotions_enabled */}
                {promotionsEnabled && (
                  <div className="rounded-2xl border border-border/50 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/20">
                      <Ticket className="w-3.5 h-3.5" style={{ color }} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex-1">Kod Kupon</span>
                    </div>
                    <div className="p-3 border-t border-border/30">
                      {appliedPromo ? (
                        <div className="flex items-center justify-between p-2.5 rounded-xl"
                          style={{ background: hexToRgba(color, 0.08), border: `1px solid ${hexToRgba(color, 0.25)}` }}>
                          <div>
                            <p className="text-[10px] font-black tracking-widest" style={{ color }}>{appliedPromo.code}</p>
                            <p className="text-[9px] text-muted-foreground/60">{appliedPromo.name} · -{fmtRM(promoDiscountRM)}</p>
                          </div>
                          <button onClick={handleRemoveCoupon}
                            className="w-6 h-6 rounded-lg text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                            placeholder="Masukkan kod kupon..."
                            className="flex-1 h-9 px-3 rounded-xl text-xs font-black tracking-widest outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all uppercase" />
                          <button onClick={handleApplyCoupon} disabled={couponValidating || !couponCode.trim()}
                            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-40 transition-all"
                            style={{ background: hexToRgba(color, 0.1), color }}>
                            {couponValidating ? '...' : 'Guna'}
                          </button>
                        </div>
                      )}
                      {couponError && <p className="text-[9px] text-rose-500 mt-1 font-black">{couponError}</p>}
                    </div>
                  </div>
                )}

                {/* Diskaun manual — hanya jika tiada kupon digunakan */}
                <div className={`rounded-2xl border border-border/50 overflow-hidden ${appliedPromo ? 'opacity-40 pointer-events-none' : ''}`}>
                  <button onClick={() => setDiscountEnabled(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      <Tag className="w-3.5 h-3.5" /> Diskaun Manual
                      {appliedPromo && <span className="text-[8px] text-rose-400 normal-case font-black">(tidak aktif — kupon digunakan)</span>}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground/50 transition-transform ${discountEnabled ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {discountEnabled && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="p-3 space-y-2 border-t border-border/30">
                          <div className="flex gap-2">
                            <button onClick={() => setDiscountType('PERCENT')}
                              className="flex-1 h-8 rounded-lg text-[10px] font-black uppercase border transition-all flex items-center justify-center gap-1"
                              style={discountType === 'PERCENT'
                                ? { background: hexToRgba(color, 0.1), borderColor: hexToRgba(color, 0.4), color }
                                : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                              <Percent className="w-3 h-3" /> Peratus
                            </button>
                            <button onClick={() => setDiscountType('FIXED')}
                              className="flex-1 h-8 rounded-lg text-[10px] font-black uppercase border transition-all flex items-center justify-center gap-1"
                              style={discountType === 'FIXED'
                                ? { background: hexToRgba(color, 0.1), borderColor: hexToRgba(color, 0.4), color }
                                : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                              RM Tetap
                            </button>
                          </div>
                          <input value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                            placeholder={discountType === 'PERCENT' ? 'Peratus (e.g. 10)' : 'Jumlah RM (e.g. 2.50)'}
                            type="number" min="0"
                            className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40" />
                          <input value={discountNote} onChange={e => setDiscountNote(e.target.value)}
                            placeholder="Nota diskaun (e.g. Diskaun Pelajar)"
                            className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Totals */}
                <div className="rounded-2xl border border-border/50 p-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-black">{fmtRM(subtotal)}</span>
                  </div>
                  {appliedPromo && promoDiscountRM > 0 && (
                    <div className="flex justify-between text-xs" style={{ color }}>
                      <span className="font-black">🎟️ Kupon: {appliedPromo.code}</span>
                      <span className="font-black">-{fmtRM(promoDiscountRM)}</span>
                    </div>
                  )}
                  {!appliedPromo && discountRM > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600">
                      <span>Diskaun {discountNote ? `(${discountNote})` : ''}</span>
                      <span className="font-black">-{fmtRM(discountRM)}</span>
                    </div>
                  )}
                  <div className="h-px bg-border/50 my-1" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-foreground">Jumlah Bayar</span>
                    <span className="text-xl font-black" style={{ color }}>{fmtRM(totalAmount)}</span>
                  </div>
                </div>

                {/* Cash received & change */}
                {paymentMethod === 'CASH' && (
                  <div className="space-y-2">
                    <input value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)}
                      placeholder="Jumlah diterima (RM)"
                      type="number" min="0" step="0.01"
                      className="w-full h-11 px-4 rounded-2xl text-sm font-black outline-none bg-muted/40 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                    {receivedRM >= totalAmount && totalAmount > 0 && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className="flex justify-between items-center px-4 py-3 rounded-2xl"
                        style={{ background: hexToRgba(color, 0.08), border: `1px solid ${hexToRgba(color, 0.2)}` }}>
                        <span className="text-xs font-black uppercase tracking-wider text-foreground">Baki Kembalian</span>
                        <span className="text-2xl font-black" style={{ color }}>{fmtRM(changeAmount)}</span>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Process button */}
                <button
                  onClick={handleProcess}
                  disabled={
                    processing || cart.length === 0 ||
                    (paymentMethod === 'CASH' && (receivedRM < totalAmount || receivedRM <= 0))
                  }
                  className="w-full h-14 rounded-2xl text-white font-black text-sm uppercase tracking-widest transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 shadow-xl"
                  style={{ background: color }}
                >
                  {processing ? 'Memproses...' : '✓ Proses Pembayaran'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Success Modal ─────────────────────────────────────────────────── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {successTxn && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSuccessTxn(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative w-full max-w-sm mx-auto rounded-3xl p-8 bg-card border border-border shadow-2xl text-center flex flex-col max-h-[90vh] overflow-y-auto"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: hexToRgba(color, 0.1) }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color }} />
                </motion.div>
                <h3 className="text-lg font-black mb-1">Pembayaran Berjaya!</h3>
                <p className="text-xs text-muted-foreground mb-1">No. Invois: <span className="font-black text-foreground">{successTxn.invoice_number}</span></p>
                <p className="text-2xl font-black mt-3 mb-1" style={{ color }}>{fmtRM(successTxn.totalAmount ?? successTxn.total_amount)}</p>
                {successTxn.changeAmount > 0 && (
                  <p className="text-xs text-muted-foreground mb-4">Baki: <span className="font-black text-foreground">{fmtRM(successTxn.changeAmount)}</span></p>
                )}
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setSuccessTxn(null)}
                    className="flex-1 h-11 rounded-2xl border border-border text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                    Tutup
                  </button>
                  <button
                    onClick={() => { setShowInvoice(true); }}
                    className="flex-1 h-11 rounded-2xl text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                    style={{ background: color }}>
                    <FileText className="w-4 h-4" /> Jana Invois
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      , document.body)}

      {/* E-Invoice Modal */}
      {showInvoice && successTxn && (
        <EInvoiceModal transaction={successTxn} onClose={() => { setShowInvoice(false); setSuccessTxn(null); }} />
      )}

      {/* PolyMart QR Scanner */}
      <AnimatePresence>
        {showScanner && (
          <PosScannerModal onScan={handleScan} onClose={() => setShowScanner(false)} />
        )}
      </AnimatePresence>

      {/* PolyMart Order Confirmation Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {scannedOrder && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setScannedOrder(null)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm mx-auto rounded-3xl p-6 bg-card border border-border shadow-2xl flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/20 text-amber-500">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-foreground">Pesanan PolyMart</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{scannedOrder.buyer?.full_name}</p>
                  </div>
                </div>

                <div className="p-3 bg-muted/30 rounded-xl mb-4 text-sm font-bold border border-border/50">
                  <p className="text-muted-foreground">{scannedOrder.business_products?.name} x {scannedOrder.quantity}</p>
                  <p className="text-xl mt-1" style={{ color }}>{fmtRM(scannedOrder.total_price)}</p>
                </div>

                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Kaedah Pembayaran (POS)</p>
                <div className="flex gap-2 mb-6">
                  {['CASH', 'QR', 'TRANSFER'].map(m => (
                    <button key={m} onClick={() => setScannedOrder({ ...scannedOrder, payment_method: m })}
                      className={`flex-1 h-9 rounded-xl text-[11px] font-bold transition-colors ${(scannedOrder.payment_method || 'CASH') === m ? 'border-2' : 'border border-border/50 bg-muted/30 text-muted-foreground'}`}
                      style={(scannedOrder.payment_method || 'CASH') === m ? { borderColor: color, color, background: hexToRgba(color, 0.1) } : {}}>
                      {m === 'CASH' ? 'Tunai' : m === 'QR' ? 'QR Pay' : 'Transfer'}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setScannedOrder(null)} disabled={processing}
                    className="flex-1 h-11 rounded-xl text-xs font-bold border border-border/50 hover:bg-muted/50 transition-colors">
                    Batal
                  </button>
                  <button onClick={handleCompletePolyMart} disabled={processing}
                    className="flex-1 h-11 rounded-xl text-white text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    style={{ background: color }}>
                    {processing ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : 'Selesaikan'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      , document.body)}
    </div>
  );
}
