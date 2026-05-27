import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePolymart, PM_ACCENT, PM_LIGHT, PM_GRADIENT, PM_GLOW, CATEGORY_EMOJI } from './PolyMartLayout';
import { sendNotificationToBusinessVendor, sendNotificationToUser } from '@/lib/notifications';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Star, Store, Clock, Package, Phone, MessageCircle,
  Minus, Plus, CheckCircle, AlertCircle, User, ChevronDown, ShoppingBag, ShoppingCart,
  CreditCard, Handshake, Award, X,
} from 'lucide-react';
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
      {[1,2,3,4,5].map(s => (
        <Star key={s} style={{ width: size, height: size, color: s <= rating ? '#f59e0b' : 'hsl(var(--border))' }}
          fill={s <= rating ? '#f59e0b' : 'none'} />
      ))}
    </div>
  );
}

// ── Review Card ────────────────────────────────────────────────────────────────
function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="p-3 rounded-2xl bg-muted/30 border border-border/40">
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

// ── Order Modal ────────────────────────────────────────────────────────────────
function OrderModal({
  product, onClose, onSuccess
}: {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [qty,        setQty]        = useState(1);
  const [note,       setNote]       = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [sharePhone, setSharePhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Payment method
  const biz = product.keusahawanan_businesses;
  const qrEnabled = (product.online_payment_enabled ?? biz?.online_payment_enabled) === true;
  const codEnabled = biz?.cod_enabled !== false; // default true
  
  // If BOTH are enabled, do NOT auto-select (force user choice). Otherwise, auto-select the single option.
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'QR_ONLINE' | null>(
    qrEnabled && codEnabled ? null : (qrEnabled ? 'QR_ONLINE' : 'COD')
  );
  const [selectedVariation, setSelectedVariation] = useState<string>('');

  // Lock body scroll when modal is active to prevent background scroll-through
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTip, setShowScrollTip] = useState(false);

  // Check if content is scrollable and show/hide scroll indicator
  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    // If the content height is bigger than the visible window by a threshold (e.g. 15px)
    const isScrollable = scrollHeight - clientHeight > 15;
    
    // If we haven't scrolled close to the bottom (e.g. within 25px of the bottom)
    const reachedBottom = scrollTop + clientHeight >= scrollHeight - 25;
    
    setShowScrollTip(isScrollable && !reachedBottom);
  };

  useEffect(() => {
    // Check initial state after component renders
    const timer = setTimeout(checkScroll, 300);
    return () => clearTimeout(timer);
  }, [qty, pickupTime, selectedVariation]);

  const selectedVarObj = product.variations?.find((v: any) => v.name === selectedVariation);
  const availableStock = selectedVarObj
    ? Math.max(0, selectedVarObj.stock - (selectedVarObj.reserved || 0))
    : Math.max(0, product.stock_quantity - (product.reserved_stock || 0));
  const maxQty = Math.min(availableStock, 10);
  
  // Use sale price if product is currently on sale
  const isOnSale = product.sale_price && product.sale_start_at && product.sale_end_at &&
    new Date() >= new Date(product.sale_start_at) && new Date() <= new Date(product.sale_end_at);
  const effectivePrice = isOnSale ? product.sale_price! : product.price;
  const total = (effectivePrice * qty).toFixed(2);

  const submit = async () => {
    if (!user) { toast.error('Sila log masuk dahulu'); return; }
    if (!pickupTime.trim()) { toast.error('Sila isi masa pesanan siap/ambil'); return; }
    if (!paymentMethod) { toast.error('Sila pilih kaedah pembayaran dahulu!'); return; }
    setSubmitting(true);
    try {
      if (product.variations && product.variations.length > 0 && !selectedVariation) {
        toast.error('Sila pilih saiz/variasi produk dahulu!');
        setSubmitting(false);
        return;
      }

      // 1. Tempah stok dahulu
      const { error: reserveError } = await supabase.rpc('reserve_polymart_stock', {
        p_product_id: product.id,
        p_quantity: qty,
        p_variation: selectedVariation || null
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
        product_id:  product.id,
        business_id: product.business_id,
        buyer_id:    user.id,
        quantity:    qty,
        unit_price:  effectivePrice,
        note:        note.trim() || null,
        pickup_time: pickupTime.trim(),
        share_phone: sharePhone,
        status:      'PENDING',
        payment_method: paymentMethod,
        payment_deadline_at: paymentDeadlineAt,
        selected_variation: selectedVariation || null,
      }).select('id').single();

      if (error) {
        // Jika gagal insert, lepaskan kembali stok
        await supabase.rpc('release_polymart_stock', {
          p_product_id: product.id,
          p_quantity: qty,
          p_variation: selectedVariation || null
        });
        throw error;
      }

      // 3. Notify vendor (fire-and-forget — jangan gagalkan pesanan jika push error)
      try {
        await sendNotificationToBusinessVendor(product.business_id, {
          title: '🛍️ Pesanan Baharu!',
          message: `${profile?.full_name ?? 'Pelajar'} menempah ${qty}x ${product.name}`,
          type: 'polymart_order_new',
          module: 'POLYMART',
          link: `/polymart/vendor`,
          reference_id: order.id,
          actor_name: profile?.full_name,
        });
      } catch (e) {
        console.error('Push notification gagal:', e);
      }

      if (paymentMethod === 'QR_ONLINE') {
        navigate(`/polymart/bayar/${order.id}`);
      } else {
        toast.success('Pesanan berjaya dihantar!', {
          icon: '🎉',
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
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]"
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 shrink-0 sm:hidden" />

        {/* Fixed Header */}
        <div className="p-5 pb-3 border-b border-border/40 shrink-0">
          <div className="flex items-start gap-3 justify-between">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0"
                style={{ background: PM_LIGHT }}>
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">{CATEGORY_EMOJI[product.category] ?? '📦'}</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-foreground leading-tight truncate">{product.name}</h3>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{product.keusahawanan_businesses?.name}</p>
                <p className="text-base font-black mt-1" style={{ color: PM_ACCENT }}>RM {product.price.toFixed(2)}</p>
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
        </div>

        {/* Scrollable Content */}
        <div ref={scrollRef} onScroll={checkScroll} className="flex-1 overflow-y-auto p-5 py-4 space-y-4 scrollbar-none relative">
          {/* Quantity */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Kuantiti</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl border border-border/60 flex items-center justify-center hover:bg-muted/50 transition-colors"
                disabled={qty <= 1}>
                <Minus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <span className="text-lg font-black text-foreground w-8 text-center">{qty}</span>
              <button onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                className="w-9 h-9 rounded-xl border border-border/60 flex items-center justify-center hover:bg-muted/50 transition-colors"
                disabled={qty >= maxQty}>
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <span className="text-[10px] text-muted-foreground/50 ml-1">Stok: {availableStock}</span>
            </div>
          </div>

          {/* Size / Variation Selector */}
          {product.variations && product.variations.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">
                Pilih Saiz / Variasi <span className="text-amber-500 font-bold">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variations.map(v => {
                  const varStock = Math.max(0, v.stock - (v.reserved || 0));
                  const isOut = varStock === 0;
                  const active = selectedVariation === v.name;
                  return (
                    <button
                      key={v.name}
                      type="button"
                      disabled={isOut}
                      onClick={() => setSelectedVariation(v.name)}
                      className="h-10 px-4 rounded-xl border font-black text-xs transition-all flex items-center justify-center active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={active
                        ? { background: 'rgba(245,158,11,0.1)', borderColor: PM_ACCENT, color: PM_ACCENT }
                        : { background: 'transparent', borderColor: 'hsl(var(--border)/0.6)', color: 'hsl(var(--muted-foreground))' }
                      }
                    >
                      {v.name} {isOut ? '(Habis)' : `(${varStock})`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pickup time */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">
              Cadangan Waktu Ambil <span className="text-rose-400">*</span>
            </p>
            
            {/* Quick Suggestions Pills */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {[
                { label: '⚡ Segera (Bila Siap)', value: 'Segera (Bila-bila Siap)' },
                { label: '🌅 Rehat Pagi (10 AM)', value: 'Rehat Pagi (~10.00 AM)' },
                { label: '☀️ Tengah Hari (1 PM)', value: 'Tengah Hari (~1.00 PM)' },
                { label: '🌇 Petang (Lepas 4 PM)', value: 'Petang (Selepas 4.00 PM)' }
              ].map(sug => {
                const active = pickupTime === sug.value;
                return (
                  <button
                    key={sug.value}
                    type="button"
                    onClick={() => setPickupTime(sug.value)}
                    className="px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all active:scale-95 whitespace-nowrap"
                    style={active
                      ? { background: 'rgba(245,158,11,0.1)', borderColor: PM_ACCENT, color: PM_ACCENT }
                      : { background: 'hsl(var(--muted)/0.3)', borderColor: 'hsl(var(--border)/0.5)', color: 'hsl(var(--muted-foreground))' }
                    }
                  >
                    {sug.label}
                  </button>
                );
              })}
            </div>

            <input value={pickupTime} onChange={e => setPickupTime(e.target.value)}
              placeholder="Atau taip waktu kustom anda sendiri..."
              className="w-full h-10 px-3 rounded-xl text-sm outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-amber-500/50 transition-all" />
          </div>

          {/* Note */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Nota (Pilihan)</p>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="Allergen, permintaan khas..."
              className="w-full h-10 px-3 rounded-xl text-sm outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-amber-500/50 transition-all" />
          </div>

          {/* Share phone toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/40">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-muted-foreground/60" />
              <div>
                <p className="text-[11px] font-bold text-foreground">Kongsikan No. Telefon</p>
                <p className="text-[9px] text-muted-foreground/50">Biar vendor hubungi via WhatsApp</p>
              </div>
            </div>
            <button onClick={() => setSharePhone(s => !s)}
              className="w-11 h-6 rounded-full transition-all duration-200 relative shrink-0"
              style={{ background: sharePhone ? PM_GRADIENT : 'hsl(var(--muted))' }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                style={{ left: sharePhone ? 'calc(100% - 22px)' : '2px' }} />
            </button>
          </div>

          {/* Payment method selector */}
          {qrEnabled && codEnabled && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Kaedah Pembayaran</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPaymentMethod('QR_ONLINE')}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${paymentMethod === 'QR_ONLINE' ? 'border-blue-500 bg-blue-500/5' : 'border-border/40 hover:border-border'}`}>
                  <div className="flex items-center gap-2">
                    <CreditCard className={`w-4 h-4 ${paymentMethod === 'QR_ONLINE' ? 'text-blue-500' : 'text-muted-foreground/40'}`} />
                    <span className="text-xs font-black">💳 QR Online</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground/50 mt-0.5">Bayar & upload resit</p>
                </button>
                <button type="button" onClick={() => setPaymentMethod('COD')}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${paymentMethod === 'COD' ? 'border-amber-500 bg-amber-500/5' : 'border-border/40 hover:border-border'}`}>
                  <div className="flex items-center gap-2">
                    <Handshake className={`w-4 h-4 ${paymentMethod === 'COD' ? 'text-amber-500' : 'text-muted-foreground/40'}`} />
                    <span className="text-xs font-black">🤝 COD</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground/50 mt-0.5">Bayar semasa ambil</p>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scroll Tip Indicator */}
        <AnimatePresence>
          {showScrollTip && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 10, x: '-50%' }}
              className="absolute bottom-[145px] left-1/2 z-[210] pointer-events-none"
            >
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500 text-white text-[10px] font-black shadow-lg shadow-amber-500/20 backdrop-blur-sm animate-bounce">
                <span>Skrol bawah untuk lagi</span>
                <ChevronDown className="w-3 h-3 animate-pulse" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fixed Footer */}
        <div className="p-5 pt-3 border-t border-border/40 bg-card/95 backdrop-blur-sm shrink-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-muted-foreground">Jumlah</span>
              <span className="text-xl font-black" style={{ color: PM_ACCENT }}>RM {total}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 px-1">
              <AlertCircle className="w-3 h-3" />
              <span>
                {paymentMethod === 'QR_ONLINE'
                  ? `Sila bayar melalui QR & upload resit dalam ${biz?.payment_deadline_value ?? 24} ${(biz?.payment_deadline_unit ?? 'HOURS') === 'HOURS' ? 'jam' : (biz?.payment_deadline_unit ?? 'HOURS') === 'DAYS' ? 'hari' : 'minggu'}.`
                  : paymentMethod === 'COD'
                  ? 'Pembayaran dibuat bersemuka semasa ambil pesanan.'
                  : 'Sila pilih kaedah pembayaran di atas.'
                }
              </span>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (product.variations && product.variations.length > 0 && !selectedVariation) {
                    toast.error('Sila pilih saiz/variasi produk dahulu!');
                    return;
                  }
                  setSubmitting(true);
                  const { error } = await supabase.from('polymart_cart_items').upsert(
                    {
                      buyer_id: user.id,
                      product_id: product.id,
                      quantity: qty,
                      selected_variation: selectedVariation || ''
                    },
                    { onConflict: 'buyer_id, product_id, selected_variation' }
                  );
                  setSubmitting(false);
                  if (error) {
                    toast.error('Gagal tambah ke troli');
                  } else {
                    toast.success('Ditambah ke troli!', { icon: '🛒', style: { borderRadius: '16px', fontWeight: 700 } });
                    onClose();
                  }
                }}
                disabled={submitting}
                className="flex-1 h-12 rounded-2xl font-black text-xs transition-all hover:bg-muted/50 border-2 border-border/60"
                style={{ color: PM_ACCENT }}
              >
                🛒 Troli
              </button>
              
              <button onClick={submit} disabled={submitting}
                className="flex-[2] h-12 rounded-2xl text-white font-black text-xs transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                style={{ background: PM_GRADIENT }}>
                {submitting ? '⏳ Menghantar...' : `🛍️ Beli Sekarang`}
              </button>
            </div>
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
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [product,   setProduct]   = useState<Product | null>(null);
  const { refetchCounts } = usePolymart();

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
                image_url: product.image_url
              }
            }
          })
        );
      }, 300);
    }
  }, [user, product, searchParams, setSearchParams]);
  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showOrder, setShowOrder] = useState(false);
  const [ordered,   setOrdered]   = useState(false);
  const [reported,  setReported]  = useState(false);
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
        behavior: 'smooth'
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
    const load = async () => {
      const { data } = await supabase
        .from('business_products')
        .select(`
          *,
          keusahawanan_businesses!business_id(id, name, logo_url, description, polymart_contact_method, status, online_payment_enabled, cod_enabled, payment_qr_url, payment_instructions, business_phone, payment_deadline_value, payment_deadline_unit)
        `)
        .eq('id', id).single();
      setProduct(data as Product);

      const { data: rv } = await supabase.from('polymart_reviews')
        .select('*, reviewer:profiles!reviewer_id(full_name, matric_no)')
        .eq('product_id', id).order('created_at', { ascending: false });
      setReviews((rv ?? []) as Review[]);

      if (user) {
        const { data: existing } = await supabase.from('polymart_reports')
          .select('id').eq('product_id', id).eq('reporter_id', user.id).maybeSingle();
        setReported(!!existing);
      }
      setLoading(false);

      // Fetch vendor score/reputation
      if (data?.business_id) {
        const [vendorReviews, vendorOrders] = await Promise.all([
          supabase.from('polymart_reviews').select('rating')
            .in('product_id',
              (await supabase.from('business_products').select('id').eq('business_id', data.business_id)).data?.map(p => p.id) ?? []
            ),
          supabase.from('polymart_orders').select('status')
            .eq('business_id', data.business_id)
        ]);
        const ratings = vendorReviews.data ?? [];
        const orders = vendorOrders.data ?? [];
        const totalReviews = ratings.length;
        const avgRat = totalReviews > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / totalReviews : 0;
        const completed = orders.filter(o => o.status === 'COMPLETED').length;
        const total = orders.length;
        const completionRate = total > 0 ? completed / total : 0;
        // Weighted score: 60% rating + 40% completion rate (scaled to 5)
        const score = totalReviews > 0 ? (avgRat * 0.6 + completionRate * 5 * 0.4) : (completionRate * 5);
        let label = 'Baru'; let color = '#94a3b8';
        if (score >= 4.5) { label = 'Terbaik'; color = '#22c55e'; }
        else if (score >= 3.5) { label = 'Bagus'; color = '#f59e0b'; }
        else if (score >= 2.5) { label = 'Sederhana'; color = '#f97316'; }
        else if (totalReviews > 0 || total > 3) { label = 'Perlu Perbaiki'; color = '#ef4444'; }
        setVendorScore({ avg: avgRat, total: totalReviews, completed, label, color });
      }
    };
    load();
  }, [id, user]);

  const submitReport = async () => {
    if (!user || !id || !reportReason.trim()) return;
    const { error } = await supabase.from('polymart_reports').insert({
      product_id: id, reporter_id: user.id, reason: reportReason.trim(),
    });
    if (!error) {
      setReported(true);
      setShowReport(false);
      toast.success('Laporan dihantar. Terima kasih!');
    }
  };

  const addToCart = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/polymart/produk/${id}`)}`);
      return;
    }
    
    // Jika produk mempunyai variasi saiz/warna, buka modal pemilihan terlebih dahulu!
    if (product && product.variations && product.variations.length > 0) {
      setShowOrder(true);
      return;
    }

    const { error } = await supabase.from('polymart_cart_items').upsert(
      { buyer_id: user.id, product_id: id, quantity: 1, selected_variation: '' },
      { onConflict: 'buyer_id, product_id, selected_variation' }
    );
    if (error) {
      toast.error('Gagal tambah ke troli');
    } else {
      toast.success('Ditambah ke troli!', { icon: '🛒', style: { borderRadius: '16px', fontWeight: 700 } });
      refetchCounts();
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: PM_ACCENT, borderTopColor: 'transparent' }} />
    </div>
  );

  if (!product) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Produk tidak dijumpai.</p>
    </div>
  );

  const emoji = CATEGORY_EMOJI[product.category] ?? '📦';
  const availableStock = Math.max(0, product.stock_quantity - (product.reserved_stock || 0));
  const isOut = availableStock <= 0;
  const business = product.keusahawanan_businesses;

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-4 pb-4">
        {/* Product Image Gallery */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          onMouseEnter={() => setIsHoveringImage(true)}
          onMouseLeave={() => setIsHoveringImage(false)}
          className="relative aspect-[4/3] rounded-3xl overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${PM_LIGHT}, rgba(249,115,22,0.08))` }}>
          {(() => {
            const allImages = [...(product.image_urls ?? []), ...(product.image_url ? [product.image_url] : [])]
              .filter((v, i, a) => a.indexOf(v) === i); // deduplicate
            return (
              <>
                <div 
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide h-full w-full"
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
                    <div className="w-full h-full flex items-center justify-center text-[100px] select-none">{emoji}</div>
                  )}
                </div>
                {/* Dot indicators for multi-image */}
                {allImages.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1.5 rounded-full z-10">
                    {allImages.map((_, i) => (
                      <button key={i} onClick={() => scrollToImage(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === activeImgIdx ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`} />
                    ))}
                  </div>
                )}
              </>
            );
          })()}
          {isOut && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-sm font-black bg-black/60 px-4 py-2 rounded-full">Stok Habis</span>
            </div>
          )}
          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
            {emoji} {product.category}
          </div>
          {/* Flash Sale Badge */}
          {product.sale_price && product.sale_start_at && product.sale_end_at && 
            new Date() >= new Date(product.sale_start_at) && new Date() <= new Date(product.sale_end_at) && (
            <div className="absolute top-3 right-3 bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse shadow-lg">
              ⚡ SALE -{Math.round((1 - product.sale_price / product.price) * 100)}%
            </div>
          )}
          {/* Pre-order Badge */}
          {product.is_preorder && (
            <div className="absolute top-3 right-3 bg-indigo-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
              📦 PRA-TEMPAHAN
            </div>
          )}
        </motion.div>

        {/* Product Info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="space-y-3">
          <div>
            <h1 className="text-xl font-black text-foreground leading-tight">{product.name}</h1>
            {product.description && (
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Price + Rating + Sale */}
          <div className="flex items-center justify-between">
            <div>
              {(() => {
                const isOnSale = product.sale_price && product.sale_start_at && product.sale_end_at &&
                  new Date() >= new Date(product.sale_start_at) && new Date() <= new Date(product.sale_end_at);
                return isOnSale ? (
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black text-rose-500">RM {product.sale_price!.toFixed(2)}</span>
                    <span className="text-lg text-muted-foreground/50 line-through">RM {product.price.toFixed(2)}</span>
                  </div>
                ) : (
                  <span className="text-3xl font-black" style={{ color: PM_ACCENT }}>RM {product.price.toFixed(2)}</span>
                );
              })()}
              {/* Pre-order deadline */}
              {product.is_preorder && product.preorder_deadline && new Date(product.preorder_deadline) > new Date() && (
                <p className="text-[10px] font-black text-indigo-500 mt-1">
                  📦 Pra-tempahan tamat: {new Date(product.preorder_deadline).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
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

          {/* Info pills */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-muted/40 border border-border/40">
              <Package className="w-3 h-3 text-muted-foreground" />
              <span>Stok: {availableStock}</span>
            </div>
            {product.polymart_location && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-muted/40 border border-border/40">
                <Store className="w-3 h-3 text-muted-foreground" />
                <span>{product.polymart_location}</span>
              </div>
            )}
            {product.polymart_pickup_info && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-muted/40 border border-border/40">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span>{product.polymart_pickup_info}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Vendor Info */}
        {business && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="flex items-center gap-3 p-3 rounded-2xl border border-border/40 bg-muted/20">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0" style={{ background: PM_LIGHT }}>
              {business.logo_url
                ? <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                : <div className="w-full h-full flex items-center justify-center"><Store className="w-5 h-5" style={{ color: PM_ACCENT }} /></div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">Peniaga</p>
              <p className="text-sm font-black text-foreground truncate">{business.name}</p>
              {business.description && (
                <p className="text-[10px] text-muted-foreground/60 truncate">{business.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {vendorScore && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-xl border" style={{ borderColor: `${vendorScore.color}30`, background: `${vendorScore.color}10` }}>
                  <Award className="w-3 h-3" style={{ color: vendorScore.color }} />
                  <span className="text-[9px] font-black" style={{ color: vendorScore.color }}>{vendorScore.label}</span>
                  {vendorScore.total > 0 && (
                    <span className="text-[8px] font-bold text-muted-foreground/40">({vendorScore.avg.toFixed(1)}★)</span>
                  )}
                </div>
              )}
              {business.polymart_contact_method === 'whatsapp' && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-green-500/10 border border-green-500/20">
                  <MessageCircle className="w-3 h-3 text-green-500" />
                  <span className="text-[9px] font-bold text-green-600 dark:text-green-400">WhatsApp</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Chat Vendor Button */}
        {business && (
          <motion.button
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            onClick={() => {
              if (!user) {
                navigate(`/login?redirect=${encodeURIComponent(`/polymart/produk/${id}?chat=true`)}`);
                return;
              }
              window.dispatchEvent(
                new CustomEvent('open-polymart-chat', {
                  detail: {
                    businessId: business.id,
                    product: product ? {
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image_url: product.image_url
                    } : undefined
                  }
                })
              );
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all"
          >
            <MessageCircle className="w-4 h-4" style={{ color: PM_ACCENT }} />
            <span className="text-xs font-black" style={{ color: PM_ACCENT }}>Sembang Peniaga</span>
          </motion.button>
        )}

        {/* CTA */}
        {ordered ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-2 py-5 rounded-3xl border border-border/40 bg-muted/20">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
            <p className="text-sm font-black text-foreground">Pesanan Dihantar!</p>
            <p className="text-xs text-muted-foreground/60">Tunggu pengesahan dari vendor.</p>
            <button onClick={() => navigate('/polymart/pesanan-saya')}
              className="mt-1 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              style={{ background: PM_LIGHT, color: PM_ACCENT }}>
              Lihat Pesanan Saya →
            </button>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={addToCart}
                disabled={isOut}
                className="flex-1 h-14 rounded-2xl font-black text-[13px] sm:text-sm transition-all hover:bg-muted/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border-2 border-border/60"
                style={{ color: isOut ? 'hsl(var(--muted-foreground))' : PM_ACCENT }}>
                🛒 Masukkan Troli
              </button>
              <button
                onClick={() => {
                  if (!user) {
                    navigate(`/login?redirect=${encodeURIComponent(`/polymart/produk/${id}`)}`);
                    return;
                  }
                  setShowOrder(true);
                }}
                disabled={isOut}
                className="flex-1 h-14 rounded-2xl text-white font-black text-[13px] sm:text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                style={{ background: isOut ? 'hsl(var(--muted))' : PM_GRADIENT, boxShadow: isOut ? 'none' : `0 8px 24px ${PM_GLOW}` }}>
                {isOut ? '😔 Stok Habis' : '🛍️ Tempah Sekarang'}
              </button>
            </div>
            {/* Guest nudge */}
            {!user && !isOut && (
              <p className="text-center text-[10px] text-muted-foreground/50 -mt-1">
                Perlu <span className="font-bold" style={{ color: PM_ACCENT }}>log masuk</span> untuk membuat tempahan
              </p>
            )}
          </>
        )}

        {/* Report */}
        {user && !reported && (
          <button onClick={() => setShowReport(s => !s)}
            className="w-full text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors text-center py-1">
            ⚠️ Laporkan produk ini
          </button>
        )}
        {reported && <p className="text-center text-[11px] text-muted-foreground/40">✅ Laporan telah dihantar</p>}

        {/* Report Form */}
        <AnimatePresence>
          {showReport && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-3">
                <p className="text-[11px] font-bold text-rose-500/80">Sebab Laporan</p>
                <input value={reportReason} onChange={e => setReportReason(e.target.value)}
                  placeholder="Jelaskan masalah dengan produk ini..."
                  className="w-full h-10 px-3 rounded-xl text-xs outline-none bg-background border border-border/50 text-foreground placeholder:text-muted-foreground/40" />
                <button onClick={submitReport} disabled={!reportReason.trim()}
                  className="w-full h-9 rounded-xl text-xs font-bold text-white bg-rose-500 disabled:opacity-50 transition-colors">
                  Hantar Laporan
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <h2 className="text-sm font-black text-foreground">Ulasan Pembeli ({reviews.length})</h2>
          </div>
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground/50">Belum ada ulasan. Jadilah yang pertama!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
          )}
        </section>
      </div>

      {/* Order Modal */}
      <AnimatePresence>
        {showOrder && (
          <OrderModal
            product={product}
            onClose={() => setShowOrder(false)}
            onSuccess={() => { setShowOrder(false); setOrdered(true); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
