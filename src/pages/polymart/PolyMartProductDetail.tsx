import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePolymart, PM_ACCENT, PM_LIGHT, PM_GRADIENT, PM_GLOW, CATEGORY_ICON_MAP } from './PolyMartLayout';
import { sendNotificationToBusinessVendor } from '@/lib/notifications';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Star, Store, Clock, Package, Phone, MessageCircle,
  Minus, Plus, CheckCircle2, AlertCircle, User, ChevronRight,
  ShoppingBag, ShoppingCart, Zap, Heart, Share2, X, ChevronDown,
  Award, CreditCard, Handshake,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ProductVariation } from '@/types';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  stock_quantity: number;
  reserved_stock: number;
  is_available: boolean;
  publish_to_polymart: boolean;
  polymart_location: string | null;
  polymart_pickup_info: string | null;
  business_id: string;
  keusahawanan_businesses: {
    id: string;
    name: string;
    logo_url: string | null;
    description: string | null;
    polymart_contact_method: string;
    status: string;
    online_payment_enabled?: boolean;
    cod_enabled?: boolean;
    payment_qr_url?: string | null;
    payment_instructions?: string | null;
    business_phone?: string | null;
    payment_deadline_value?: number;
    payment_deadline_unit?: string;
    is_active?: boolean;
  } | null;
  online_payment_enabled?: boolean | null; // product-level override
  variations?: ProductVariation[] | null;
  // Multi-image
  image_urls?: string[] | null;
  // Flash sale / pre-order
  sale_price?: number | null;
  sale_start_at?: string | null;
  sale_end_at?: string | null;
  is_preorder?: boolean;
  preorder_deadline?: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { full_name: string; matric_no: string } | null;
}

// ── Star Rating Display ────────────────────────────────────────────────────────
function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          style={{ width: size, height: size, color: s <= rating ? '#f59e0b' : 'hsl(var(--border))' }}
          fill={s <= rating ? '#f59e0b' : 'none'}
        />
      ))}
    </div>
  );
}

// ── Review Card ────────────────────────────────────────────────────────────────
function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-foreground">
              {review.reviewer?.full_name ?? 'Pengguna'}
            </p>
            <p className="text-[9px] text-muted-foreground/50">
              {new Date(review.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        <StarRating rating={review.rating} size={12} />
      </div>
      {review.comment && (
        <p className="text-xs text-muted-foreground leading-relaxed">{review.comment}</p>
      )}
    </div>
  );
}

// ── Slide-Up Variation Bottom Sheet ────────────────────────────────────────────
export function ProductVariationBottomSheet({
  product,
  mode,
  onClose,
  onSuccess,
}: {
  product: Product;
  mode: 'CART' | 'BUY';
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { refetchCounts } = usePolymart();

  const [activeMode, setActiveMode] = useState<'CART' | 'BUY'>(mode);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [sharePhone, setSharePhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<string>('');

  // Payment method
  const biz = product.keusahawanan_businesses;
  const qrEnabled = (product.online_payment_enabled ?? biz?.online_payment_enabled) === true;
  const codEnabled = biz?.cod_enabled !== false; // default true

  // If BOTH are enabled, do NOT auto-select. Otherwise auto-select the single option.
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'QR_ONLINE' | null>(
    qrEnabled && codEnabled ? null : (qrEnabled ? 'QR_ONLINE' : 'COD')
  );

  // Lock body scroll when sheet is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTip, setShowScrollTip] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isScrollable = scrollHeight - clientHeight > 15;
    const reachedBottom = scrollTop + clientHeight >= scrollHeight - 25;
    setShowScrollTip(isScrollable && !reachedBottom);
  };

  useEffect(() => {
    const timer = setTimeout(checkScroll, 300);
    return () => clearTimeout(timer);
  }, [qty, pickupTime, selectedVariation, activeMode]);

  const selectedVarObj = product.variations?.find((v) => v.name === selectedVariation);
  const availableStock = selectedVarObj
    ? Math.max(0, selectedVarObj.stock - (selectedVarObj.reserved || 0))
    : Math.max(0, product.stock_quantity - (product.reserved_stock || 0));
  const maxQty = Math.min(availableStock, 10);

  const isOnSale = product.sale_price && product.sale_start_at && product.sale_end_at &&
    new Date() >= new Date(product.sale_start_at) && new Date() <= new Date(product.sale_end_at);
  const effectivePrice = isOnSale ? product.sale_price! : product.price;
  const total = (effectivePrice * qty).toFixed(2);

  const FallbackIcon = CATEGORY_ICON_MAP[product.category] || Package;

  const handleAddToCart = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/polymart/produk/${product.id}`)}`);
      return;
    }
    if (product.variations && product.variations.length > 0 && !selectedVariation) {
      toast.error('Sila pilih saiz/variasi produk dahulu!');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('polymart_cart_items').upsert(
        {
          buyer_id: user.id,
          product_id: product.id,
          quantity: qty,
          selected_variation: selectedVariation || '',
        },
        { onConflict: 'buyer_id, product_id, selected_variation' }
      );
      if (error) throw error;
      toast.success('Ditambah ke troli!', { style: { borderRadius: '16px', fontWeight: 700 } });
      refetchCounts();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal tambah ke troli');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectBuy = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/polymart/produk/${product.id}`)}`);
      return;
    }
    if (product.variations && product.variations.length > 0 && !selectedVariation) {
      toast.error('Sila pilih saiz/variasi produk dahulu!');
      return;
    }
    if (!pickupTime.trim()) {
      toast.error('Sila isi cadangan masa pesanan siap/ambil');
      return;
    }
    if (!paymentMethod) {
      toast.error('Sila pilih kaedah pembayaran dahulu!');
      return;
    }

    setSubmitting(true);
    try {
      // 0. Semak kedai masih aktif
      if (biz && biz.is_active === false) {
        throw new Error('Kedai ini telah ditutup. Tidak boleh membuat tempahan buat masa ini.');
      }

      // 1. Tempah stok dahulu
      const { error: reserveError } = await supabase.rpc('reserve_polymart_stock', {
        p_product_id: product.id,
        p_quantity: qty,
        p_variation: selectedVariation || null,
      });
      if (reserveError) throw new Error(reserveError.message || 'Stok tidak mencukupi atau sedang ditempah.');

      // 2. Compute payment deadline
      let paymentDeadlineAt: string | null = null;
      if (paymentMethod === 'QR_ONLINE') {
        const deadlineVal = biz?.payment_deadline_value ?? 24;
        const deadlineUnit = biz?.payment_deadline_unit ?? 'HOURS';
        const now = new Date();
        if (deadlineUnit === 'HOURS') now.setHours(now.getHours() + deadlineVal);
        else if (deadlineUnit === 'DAYS') now.setDate(now.getDate() + deadlineVal);
        else if (deadlineUnit === 'WEEKS') now.setDate(now.getDate() + deadlineVal * 7);
        paymentDeadlineAt = now.toISOString();
      }

      // 3. Cipta pesanan
      const { data: order, error } = await supabase.from('polymart_orders').insert({
        product_id: product.id,
        business_id: product.business_id,
        buyer_id: user.id,
        quantity: qty,
        unit_price: effectivePrice,
        note: note.trim() || null,
        pickup_time: pickupTime.trim(),
        share_phone: sharePhone,
        status: 'PENDING',
        payment_method: paymentMethod,
        payment_deadline_at: paymentDeadlineAt,
        selected_variation: selectedVariation || null,
      }).select('id').single();

      if (error) {
        await supabase.rpc('release_polymart_stock', {
          p_product_id: product.id,
          p_quantity: qty,
          p_variation: selectedVariation || null,
        });
        throw error;
      }

      // 4. Notify vendor (fire-and-forget)
      try {
        await sendNotificationToBusinessVendor(product.business_id, {
          title: 'Pesanan Baharu!',
          message: `${profile?.full_name ?? 'Pelajar'} menempah ${qty}x ${product.name}`,
          type: 'polymart_order_new',
          module: 'POLYMART',
          link: `/polymart/vendor`,
          reference_id: order.id,
          actor_name: profile?.full_name,
        });
      } catch (e) {
        console.error('Push notification ralat:', e);
      }

      if (paymentMethod === 'QR_ONLINE') {
        navigate(`/polymart/bayar/${order.id}`);
      } else {
        toast.success('Pesanan berjaya dihantar!', {
          style: { borderRadius: '16px', fontWeight: 700 },
        });
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal hantar pesanan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] z-10"
      >
        {/* Top Drag Handle Pill */}
        <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto mt-3 mb-1 shrink-0" />

        {/* Header Preview */}
        <div className="p-4 border-b border-border/40 shrink-0">
          <div className="flex items-start gap-3 justify-between">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className="w-16 h-16 rounded-2xl border border-border/50 overflow-hidden shrink-0 flex items-center justify-center bg-muted/20"
                style={{ background: PM_LIGHT }}
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-amber-500/10 text-amber-500">
                    <FallbackIcon className="w-7 h-7" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-foreground leading-tight truncate">{product.name}</h3>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{product.keusahawanan_businesses?.name}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-base font-black" style={{ color: PM_ACCENT }}>
                    RM {effectivePrice.toFixed(2)}
                  </p>
                  {isOnSale && (
                    <span className="text-xs text-muted-foreground/50 line-through">
                      RM {product.price.toFixed(2)}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/60">
                    (Baki stok: {availableStock})
                  </span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shrink-0 active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 mt-3 p-1 rounded-xl bg-muted/40 border border-border/40">
            <button
              type="button"
              onClick={() => setActiveMode('CART')}
              className={cn(
                "py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                activeMode === 'CART'
                  ? "bg-card text-foreground shadow-sm font-black border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
              <span>Tambah ke Troli</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('BUY')}
              className={cn(
                "py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                activeMode === 'BUY'
                  ? "bg-card text-foreground shadow-sm font-black border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
              <span>Beli Sekarang</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div ref={scrollRef} onScroll={checkScroll} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none relative">
          {/* Size / Variation Selector */}
          {product.variations && product.variations.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">
                Pilih Saiz / Variasi <span className="text-amber-500 font-bold">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variations.map((v) => {
                  const varStock = Math.max(0, v.stock - (v.reserved || 0));
                  const isOut = varStock === 0;
                  const active = selectedVariation === v.name;
                  return (
                    <button
                      key={v.name}
                      type="button"
                      disabled={isOut}
                      onClick={() => setSelectedVariation(v.name)}
                      className={cn(
                        "h-10 px-3.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
                        active
                          ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black shadow-sm"
                          : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:text-foreground"
                      )}
                    >
                      {v.name} {isOut ? '(Habis)' : `(${varStock})`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Stepper */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Kuantiti</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl border border-border/60 flex items-center justify-center hover:bg-muted/50 transition-colors disabled:opacity-40 active:scale-90"
                disabled={qty <= 1}
              >
                <Minus className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="text-lg font-black text-foreground w-8 text-center">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                className="w-10 h-10 rounded-xl border border-border/60 flex items-center justify-center hover:bg-muted/50 transition-colors disabled:opacity-40 active:scale-90"
                disabled={qty >= maxQty || maxQty === 0}
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="text-[11px] text-muted-foreground/60 ml-1">Maks: {maxQty}</span>
            </div>
          </div>

          {/* Buy Mode Specific Options */}
          {activeMode === 'BUY' && (
            <>
              {/* Pickup Time */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1.5">
                  Cadangan Waktu Ambil <span className="text-rose-400">*</span>
                </p>

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[
                    { label: 'Segera (Bila Siap)', value: 'Segera (Bila-bila Siap)' },
                    { label: 'Rehat Pagi (~10.00 AM)', value: 'Rehat Pagi (~10.00 AM)' },
                    { label: 'Tengah Hari (~1.00 PM)', value: 'Tengah Hari (~1.00 PM)' },
                    { label: 'Petang (Lepas 4.00 PM)', value: 'Petang (Selepas 4.00 PM)' },
                  ].map((sug) => {
                    const active = pickupTime === sug.value;
                    return (
                      <button
                        key={sug.value}
                        type="button"
                        onClick={() => setPickupTime(sug.value)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition-all active:scale-95 whitespace-nowrap",
                          active
                            ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-black shadow-sm"
                            : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        {sug.label}
                      </button>
                    );
                  })}
                </div>

                <input
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  placeholder="Atau taip masa pilihan anda..."
                  className="w-full h-10 px-3 rounded-xl text-sm outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-amber-500/50 transition-all"
                />
              </div>

              {/* Note */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Nota Tambahan (Pilihan)</p>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Permintaan khas atau alahan makanan..."
                  className="w-full h-10 px-3 rounded-xl text-sm outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-amber-500/50 transition-all"
                />
              </div>

              {/* Share Phone Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/40">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <div>
                    <p className="text-[11px] font-bold text-foreground">Kongsikan No. Telefon</p>
                    <p className="text-[9px] text-muted-foreground/50">Membolehkan peniaga hubungi pesanan anda</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSharePhone((s) => !s)}
                  className="w-11 h-6 rounded-full transition-all duration-200 relative shrink-0"
                  style={{ background: sharePhone ? PM_GRADIENT : 'hsl(var(--muted))' }}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                    style={{ left: sharePhone ? 'calc(100% - 22px)' : '2px' }}
                  />
                </button>
              </div>

              {/* Payment Method Selector */}
              {qrEnabled && codEnabled && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Kaedah Pembayaran</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('QR_ONLINE')}
                      className={cn(
                        "p-3 rounded-xl border-2 text-left transition-all",
                        paymentMethod === 'QR_ONLINE' ? "border-blue-500 bg-blue-500/5" : "border-border/40 hover:border-border"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className={cn("w-4 h-4", paymentMethod === 'QR_ONLINE' ? "text-blue-500" : "text-muted-foreground/50")} />
                        <span className="text-xs font-black">QR Online</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground/50 mt-0.5">Bayar & muat naik resit</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('COD')}
                      className={cn(
                        "p-3 rounded-xl border-2 text-left transition-all",
                        paymentMethod === 'COD' ? "border-amber-500 bg-amber-500/5" : "border-border/40 hover:border-border"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Handshake className={cn("w-4 h-4", paymentMethod === 'COD' ? "text-amber-500" : "text-muted-foreground/50")} />
                        <span className="text-xs font-black">Tunai (COD)</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground/50 mt-0.5">Bayar bersemuka</p>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Scroll Tip Indicator */}
        <AnimatePresence>
          {showScrollTip && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 10, x: '-50%' }}
              className="absolute bottom-[130px] left-1/2 z-20 pointer-events-none"
            >
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500 text-white text-[10px] font-black shadow-lg shadow-amber-500/20 backdrop-blur-sm animate-bounce">
                <span>Skrol ke bawah</span>
                <ChevronDown className="w-3 h-3 animate-pulse" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fixed Footer */}
        <div className="p-4 border-t border-border/40 bg-card/95 backdrop-blur-sm shrink-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-muted-foreground">Jumlah ({qty} unit)</span>
              <span className="text-xl font-black" style={{ color: PM_ACCENT }}>RM {total}</span>
            </div>

            {activeMode === 'BUY' && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 px-1">
                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate">
                  {paymentMethod === 'QR_ONLINE'
                    ? `Bayar melalui QR & muat naik resit dalam tempoh ${biz?.payment_deadline_value ?? 24} ${(biz?.payment_deadline_unit ?? 'HOURS') === 'HOURS' ? 'jam' : 'hari'}.`
                    : paymentMethod === 'COD'
                    ? 'Pembayaran dibuat bersemuka semasa ambil pesanan.'
                    : 'Sila pilih kaedah pembayaran di atas.'}
                </span>
              </div>
            )}

            {activeMode === 'CART' ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={submitting || availableStock <= 0}
                className="w-full h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-amber-500/20"
                style={{ background: PM_GRADIENT }}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{submitting ? 'Menambah...' : 'Sahkan & Tambah ke Troli'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDirectBuy}
                disabled={submitting || availableStock <= 0}
                className="w-full h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-amber-500/20"
                style={{ background: PM_GRADIENT }}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{submitting ? 'Menghantar...' : 'Teruskan Pesanan'}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function PolyMartProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [product, setProduct] = useState<Product | null>(null);
  const { refetchCounts, cartCount } = usePolymart();

  // Auto-trigger vendor chat when returning with ?chat=true after logging in
  useEffect(() => {
    if (user && product?.keusahawanan_businesses?.id && searchParams.get('chat') === 'true') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('chat');
      setSearchParams(newParams, { replace: true });

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('open-polymart-chat', {
            detail: {
              businessId: product.keusahawanan_businesses?.id,
              product: {
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
              },
            },
          })
        );
      }, 300);
    }
  }, [user, product, searchParams, setSearchParams]);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrderSheet, setShowOrderSheet] = useState(false);
  const [sheetMode, setSheetMode] = useState<'CART' | 'BUY'>('BUY');
  const [ordered, setOrdered] = useState(false);
  const [reported, setReported] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [vendorScore, setVendorScore] = useState<{ avg: number; total: number; completed: number; label: string; color: string } | null>(null);
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToImage = (idx: number) => {
    setActiveImgIdx(idx);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: idx * scrollContainerRef.current.clientWidth,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const activeIdx = Math.round(container.scrollLeft / container.clientWidth);
    if (activeIdx !== activeImgIdx && activeIdx >= 0) {
      setActiveImgIdx(activeIdx);
    }
  };

  useEffect(() => {
    if (!product) return;
    const allImages = [...(product.image_urls ?? []), ...(product.image_url ? [product.image_url] : [])]
      .filter((v, i, a) => a.indexOf(v) === i);
    if (allImages.length <= 1 || isHoveringImage) return;

    const interval = setInterval(() => {
      const nextIdx = (activeImgIdx + 1) % allImages.length;
      scrollToImage(nextIdx);
    }, 4000);

    return () => clearInterval(interval);
  }, [product, isHoveringImage, activeImgIdx]);

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const load = async () => {
      try {
        const { data: prodData } = await supabase
          .from('business_products')
          .select(`
            *,
            keusahawanan_businesses!business_id(
              id, name, logo_url, description, polymart_contact_method, status,
              online_payment_enabled, cod_enabled, payment_qr_url, payment_instructions,
              business_phone, payment_deadline_value, payment_deadline_unit, is_active
            )
          `)
          .eq('id', id)
          .single();

        if (!isMounted) return;
        setProduct(prodData as Product);

        const promises: Promise<any>[] = [
          supabase
            .from('polymart_reviews')
            .select('*, reviewer:profiles!reviewer_id(full_name, matric_no)')
            .eq('product_id', id)
            .order('created_at', { ascending: false }),
        ];

        if (user) {
          promises.push(
            supabase
              .from('polymart_reports')
              .select('id')
              .eq('product_id', id)
              .eq('reporter_id', user.id)
              .maybeSingle()
          );
        } else {
          promises.push(Promise.resolve({ data: null }));
        }

        if (prodData?.business_id) {
          promises.push(
            supabase
              .from('business_products')
              .select('id, name, price, image_url, category, stock_quantity, reserved_stock, sale_price, sale_start_at, sale_end_at')
              .eq('business_id', prodData.business_id)
              .neq('id', id)
              .eq('is_available', true)
              .eq('publish_to_polymart', true)
              .limit(6)
          );
          promises.push(
            supabase.from('polymart_orders').select('status').eq('business_id', prodData.business_id)
          );
          promises.push(
            supabase.from('business_products').select('id').eq('business_id', prodData.business_id)
          );
        }

        const results = await Promise.all(promises);
        if (!isMounted) return;

        const rvData = results[0]?.data;
        setReviews((rvData ?? []) as Review[]);

        const reportData = results[1]?.data;
        setReported(!!reportData);

        if (prodData?.business_id) {
          const related = results[2]?.data ?? [];
          setRelatedProducts(related);

          const orders = results[3]?.data ?? [];
          const allBizProductIds = (results[4]?.data ?? []).map((p: any) => p.id);

          let vendorReviewsData: any[] = [];
          if (allBizProductIds.length > 0) {
            const { data: vRev } = await supabase
              .from('polymart_reviews')
              .select('rating')
              .in('product_id', allBizProductIds);
            vendorReviewsData = vRev ?? [];
          }

          const totalReviews = vendorReviewsData.length;
          const avgRat = totalReviews > 0 ? vendorReviewsData.reduce((s: number, r: any) => s + r.rating, 0) / totalReviews : 0;
          const completed = orders.filter((o: any) => o.status === 'COMPLETED').length;
          const total = orders.length;
          const completionRate = total > 0 ? completed / total : 0;
          const score = totalReviews > 0 ? (avgRat * 0.6 + completionRate * 5 * 0.4) : (completionRate * 5);

          let label = 'Baru';
          let color = '#94a3b8';
          if (score >= 4.5) {
            label = 'Terbaik';
            color = '#22c55e';
          } else if (score >= 3.5) {
            label = 'Bagus';
            color = '#f59e0b';
          } else if (score >= 2.5) {
            label = 'Sederhana';
            color = '#f97316';
          } else if (totalReviews > 0 || total > 3) {
            label = 'Perlu Perbaiki';
            color = '#ef4444';
          }

          setVendorScore({ avg: avgRat, total: totalReviews, completed, label, color });
        }
      } catch (e) {
        console.error('Error loading product details:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [id, user]);

  const submitReport = async () => {
    if (!user || !id || !reportReason.trim()) return;
    const { error } = await supabase.from('polymart_reports').insert({
      product_id: id,
      reporter_id: user.id,
      reason: reportReason.trim(),
    });
    if (!error) {
      setReported(true);
      setShowReport(false);
      toast.success('Laporan dihantar. Terima kasih!');
    }
  };

  const handleOpenChat = () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/polymart/produk/${id}?chat=true`)}`);
      return;
    }
    if (!product?.keusahawanan_businesses) return;
    window.dispatchEvent(
      new CustomEvent('open-polymart-chat', {
        detail: {
          businessId: product.keusahawanan_businesses.id,
          product: product
            ? {
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
              }
            : undefined,
        },
      })
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: PM_ACCENT, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Produk tidak dijumpai.</p>
      </div>
    );
  }

  const FallbackIcon = CATEGORY_ICON_MAP[product.category] || Package;
  const availableStock = Math.max(0, product.stock_quantity - (product.reserved_stock || 0));
  const isOut = availableStock <= 0;
  const business = product.keusahawanan_businesses;

  const allImages = [...(product.image_urls ?? []), ...(product.image_url ? [product.image_url] : [])]
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-5 pb-28 sm:pb-32 px-4 sm:px-0">
        {/* Top Back Action Bar */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-card border border-border/50 flex items-center justify-center text-foreground hover:bg-muted transition-all active:scale-90"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {business && (
              <button
                type="button"
                onClick={() => navigate(`/polymart/kedai/${business.id}`)}
                className="px-3 py-1.5 rounded-xl border border-border/50 bg-card hover:bg-muted/50 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-all"
              >
                <Store className="w-3.5 h-3.5 text-amber-500" />
                <span>Kedai</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Image Gallery & Vector Fallback */}
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            onMouseEnter={() => setIsHoveringImage(true)}
            onMouseLeave={() => setIsHoveringImage(false)}
            className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-border/50 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${PM_LIGHT}, rgba(249,115,22,0.08))` }}
          >
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none h-full w-full"
              style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
            >
              {allImages.length > 0 ? (
                allImages.map((img, i) => (
                  <div key={i} className="w-full h-full shrink-0 snap-start snap-always">
                    <img
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      className="w-full h-full object-cover select-none"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ))
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
                  <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                    <FallbackIcon className="w-10 h-10" />
                  </div>
                </div>
              )}
            </div>

            {/* Dot indicators for multi-image */}
            {allImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1.5 rounded-full z-10">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollToImage(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      i === activeImgIdx ? "bg-white scale-125" : "bg-white/40 hover:bg-white/60"
                    )}
                  />
                ))}
              </div>
            )}

            {/* Out of Stock Overlay */}
            {isOut && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-sm font-black bg-black/70 px-4 py-2 rounded-full border border-white/20">
                  Stok Habis
                </span>
              </div>
            )}

            {/* Category Vector Badge */}
            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/10 shadow-sm">
              <FallbackIcon className="w-3 h-3 text-amber-400" />
              <span>{product.category}</span>
            </div>

            {/* Flash Sale Badge */}
            {product.sale_price && product.sale_start_at && product.sale_end_at &&
              new Date() >= new Date(product.sale_start_at) && new Date() <= new Date(product.sale_end_at) && (
              <div className="absolute top-3 right-3 bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-rose-500/25">
                <Zap className="w-3 h-3 fill-white" />
                <span>Promosi -{Math.round((1 - product.sale_price / product.price) * 100)}%</span>
              </div>
            )}

            {/* Pre-order Badge */}
            {product.is_preorder && (
              <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-indigo-600/25">
                <Clock className="w-3 h-3" />
                <span>Pra-Tempahan</span>
              </div>
            )}
          </motion.div>

          {/* Thumbnail Filmstrip */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToImage(i)}
                  className={cn(
                    "w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all active:scale-95",
                    i === activeImgIdx
                      ? "border-amber-500 ring-2 ring-amber-500/30 shadow-sm"
                      : "border-border/60 hover:border-border opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={img} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground leading-tight">{product.name}</h1>
            {product.description && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Price + Rating */}
          <div className="flex items-center justify-between pt-1">
            <div>
              {(() => {
                const isOnSale = product.sale_price && product.sale_start_at && product.sale_end_at &&
                  new Date() >= new Date(product.sale_start_at) && new Date() <= new Date(product.sale_end_at);
                return isOnSale ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-rose-500">RM {product.sale_price!.toFixed(2)}</span>
                    <span className="text-base text-muted-foreground/50 line-through">RM {product.price.toFixed(2)}</span>
                  </div>
                ) : (
                  <span className="text-2xl sm:text-3xl font-black" style={{ color: PM_ACCENT }}>RM {product.price.toFixed(2)}</span>
                );
              })()}
              {product.is_preorder && product.preorder_deadline && new Date(product.preorder_deadline) > new Date() && (
                <p className="text-[10px] font-bold text-indigo-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Pra-tempahan tamat: {new Date(product.preorder_deadline).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              )}
            </div>

            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={Math.round(avgRating)} />
                <span className="text-xs font-bold text-muted-foreground">
                  {avgRating.toFixed(1)} ({reviews.length} ulasan)
                </span>
              </div>
            )}
          </div>

          {/* Info Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted/40 border border-border/40">
              <Package className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Baki Stok: {availableStock}</span>
            </div>
            {product.polymart_location && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted/40 border border-border/40">
                <Store className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{product.polymart_location}</span>
              </div>
            )}
            {product.polymart_pickup_info && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted/40 border border-border/40">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{product.polymart_pickup_info}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Interactive Vendor Card */}
        {business && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => navigate('/polymart/kedai/' + business.id)}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/50 bg-card hover:border-amber-500/40 hover:bg-muted/30 transition-all cursor-pointer group active:scale-[0.99] shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 border border-border/40" style={{ background: PM_LIGHT }}>
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Store className="w-6 h-6 text-amber-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Peniaga Sah POLISAS</p>
              <p className="text-sm font-black text-foreground truncate group-hover:text-amber-500 transition-colors">{business.name}</p>
              {business.description && (
                <p className="text-[10px] text-muted-foreground/60 truncate">{business.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-end gap-1">
                {vendorScore && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold" style={{ borderColor: `${vendorScore.color}30`, background: `${vendorScore.color}10`, color: vendorScore.color }}>
                    <Award className="w-3 h-3" />
                    <span>{vendorScore.label}</span>
                  </div>
                )}
                <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5">
                  Lawati Kedai <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Chat Vendor Button */}
        {business && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={handleOpenChat}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all text-amber-600 dark:text-amber-400 font-black text-xs active:scale-[0.99]"
          >
            <MessageCircle className="w-4 h-4 text-amber-500" />
            <span>Sembang Bersama Peniaga</span>
          </motion.button>
        )}

        {/* In-Page Action Feedback or Trigger */}
        {ordered ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-2 py-5 rounded-3xl border border-border/40 bg-muted/20 text-center"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <p className="text-sm font-black text-foreground">Pesanan Dihantar!</p>
            <p className="text-xs text-muted-foreground/60">Sila tunggu pengesahan status daripada peniaga.</p>
            <button
              onClick={() => navigate('/polymart/pesanan-saya')}
              className="mt-1 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              style={{ background: PM_LIGHT, color: PM_ACCENT }}
            >
              Lihat Pesanan Saya →
            </button>
          </motion.div>
        ) : (
          <div className="hidden sm:flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSheetMode('CART');
                setShowOrderSheet(true);
              }}
              disabled={isOut}
              className="flex-1 h-12 rounded-2xl font-black text-xs transition-all hover:bg-muted/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border-2 border-border/60 flex items-center justify-center gap-2"
              style={{ color: isOut ? 'hsl(var(--muted-foreground))' : PM_ACCENT }}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Masukkan Troli</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  navigate(`/login?redirect=${encodeURIComponent(`/polymart/produk/${id}`)}`);
                  return;
                }
                setSheetMode('BUY');
                setShowOrderSheet(true);
              }}
              disabled={isOut}
              className="flex-1 h-12 rounded-2xl text-white font-black text-xs transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
              style={{ background: isOut ? 'hsl(var(--muted))' : PM_GRADIENT }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isOut ? 'Stok Habis' : 'Tempah Sekarang'}</span>
            </button>
          </div>
        )}

        {/* Report Product Action */}
        <div className="pt-1">
          {user && !reported && (
            <button
              onClick={() => setShowReport((s) => !s)}
              className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors text-center py-1.5 flex items-center justify-center gap-1.5"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Laporkan produk ini</span>
            </button>
          )}
          {reported && (
            <p className="text-center text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5 py-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Laporan telah dihantar</span>
            </p>
          )}

          {/* Report Form */}
          <AnimatePresence>
            {showReport && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-3">
                  <p className="text-xs font-bold text-rose-500/90">Sebab Laporan</p>
                  <input
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Jelaskan masalah dengan produk ini..."
                    className="w-full h-10 px-3 rounded-xl text-xs outline-none bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/40"
                  />
                  <button
                    onClick={submitReport}
                    disabled={!reportReason.trim()}
                    className="w-full h-9 rounded-xl text-xs font-bold text-white bg-rose-500 disabled:opacity-50 transition-colors"
                  >
                    Hantar Laporan
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cross-Selling Carousel: Produk Lain dari Kedai Ini */}
        {relatedProducts.length > 0 && business && (
          <section className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-black text-foreground">Produk Lain dari Kedai Ini</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/polymart/kedai/' + business.id)}
                className="text-[11px] font-bold text-amber-500 hover:underline flex items-center gap-0.5"
              >
                Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
              {relatedProducts.map((rel) => {
                const RelFallback = CATEGORY_ICON_MAP[rel.category] || Package;
                return (
                  <div
                    key={rel.id}
                    onClick={() => {
                      navigate(`/polymart/produk/${rel.id}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-36 shrink-0 rounded-2xl border border-border/50 bg-card p-2.5 hover:border-amber-500/40 hover:shadow-md transition-all cursor-pointer snap-start flex flex-col justify-between"
                  >
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-muted/30 mb-2 border border-border/30">
                      {rel.image_url ? (
                        <img src={rel.image_url} alt={rel.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-amber-500/10">
                          <RelFallback className="w-6 h-6 text-amber-500" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground line-clamp-1">{rel.name}</p>
                      <p className="text-xs font-black text-amber-500 mt-1">RM {Number(rel.sale_price ?? rel.price).toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Reviews Section */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <h2 className="text-sm font-black text-foreground">Ulasan Pembeli ({reviews.length})</h2>
          </div>
          {reviews.length === 0 ? (
            <div className="text-center py-8 bg-muted/10 rounded-2xl border border-border/30">
              <p className="text-xs text-muted-foreground/50">Belum ada ulasan untuk produk ini.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Mobile Sticky Bottom Purchase Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shadow-lg">
        {/* Left Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => business?.id && navigate(`/polymart/kedai/${business.id}`)}
            className="flex flex-col items-center justify-center w-11 h-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors active:scale-95"
            title="Kedai"
          >
            <Store className="w-4 h-4 text-amber-500" />
            <span className="text-[9px] font-bold mt-0.5">Kedai</span>
          </button>

          <button
            type="button"
            onClick={handleOpenChat}
            className="flex flex-col items-center justify-center w-11 h-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors active:scale-95"
            title="Sembang"
          >
            <MessageCircle className="w-4 h-4 text-sky-500" />
            <span className="text-[9px] font-bold mt-0.5">Sembang</span>
          </button>

          <button
            type="button"
            onClick={() => (!user ? navigate(`/login?redirect=${encodeURIComponent('/polymart/troli')}`) : navigate('/polymart/troli'))}
            className="relative flex flex-col items-center justify-center w-11 h-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors active:scale-95"
            title="Troli"
          >
            <ShoppingCart className="w-4 h-4 text-amber-500" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center leading-none shadow-sm">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
            <span className="text-[9px] font-bold mt-0.5">Troli</span>
          </button>
        </div>

        {/* Right Twin Action Buttons */}
        <div className="flex items-center gap-2 flex-1 min-w-0 max-w-sm ml-auto">
          <button
            type="button"
            onClick={() => {
              setSheetMode('CART');
              setShowOrderSheet(true);
            }}
            disabled={isOut}
            className="flex-1 h-11 rounded-xl font-black text-xs transition-all hover:bg-amber-500/10 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>+ Troli</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!user) {
                navigate(`/login?redirect=${encodeURIComponent(`/polymart/produk/${id}`)}`);
                return;
              }
              setSheetMode('BUY');
              setShowOrderSheet(true);
            }}
            disabled={isOut}
            className="flex-1 h-11 rounded-xl text-white font-black text-xs transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
            style={{ background: isOut ? 'hsl(var(--muted))' : PM_GRADIENT }}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isOut ? 'Stok Habis' : 'Beli Sekarang'}</span>
          </button>
        </div>
      </div>

      {/* Slide-Up Variation Bottom Sheet */}
      <AnimatePresence>
        {showOrderSheet && (
          <ProductVariationBottomSheet
            product={product}
            mode={sheetMode}
            onClose={() => setShowOrderSheet(false)}
            onSuccess={() => {
              setShowOrderSheet(false);
              setOrdered(true);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
