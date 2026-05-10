import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePolymart, PM_ACCENT, PM_LIGHT, PM_GRADIENT, PM_GLOW, CATEGORY_EMOJI } from './PolyMartLayout';
import { sendNotificationToBusinessVendor, sendNotificationToUser } from '@/lib/notifications';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Star, Store, Clock, Package, Phone, MessageCircle,
  Minus, Plus, CheckCircle, AlertCircle, User, ChevronDown, ShoppingBag, ShoppingCart,
} from 'lucide-react';

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
  } | null;
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
  const [qty,        setQty]        = useState(1);
  const [note,       setNote]       = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [sharePhone, setSharePhone] = useState(true);
  const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP' | 'POLYRIDER'>('PICKUP');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [proposedPrice, setProposedPrice] = useState<number>(3.00);
  const [submitting, setSubmitting] = useState(false);

  const availableStock = Math.max(0, product.stock_quantity - (product.reserved_stock || 0));
  const maxQty = Math.min(availableStock, 10);
  const itemsTotal = product.price * qty;
  const deliveryFee = deliveryMethod === 'POLYRIDER' ? proposedPrice : 0;
  const total = (itemsTotal + deliveryFee).toFixed(2);

  const submit = async () => {
    if (!user) { toast.error('Sila log masuk dahulu'); return; }
    if (!pickupTime.trim()) { toast.error('Sila isi masa pesanan siap/ambil'); return; }
    if (deliveryMethod === 'POLYRIDER') {
      if (!dropoffLocation.trim()) { toast.error('Sila isi lokasi penghantaran'); return; }
      if (proposedPrice < 1) { toast.error('Harga tawaran rider minimum adalah RM 1.00'); return; }
    }
    setSubmitting(true);
    try {
      // 1. Tempah stok dahulu
      const { error: reserveError } = await supabase.rpc('reserve_polymart_stock', {
        p_product_id: product.id,
        p_quantity: qty
      });
      if (reserveError) throw new Error('Stok tidak mencukupi atau sedang ditempah.');

      // 2. Cipta pesanan
      const { data: order, error } = await supabase.from('polymart_orders').insert({
        product_id:  product.id,
        business_id: product.business_id,
        buyer_id:    user.id,
        quantity:    qty,
        unit_price:  product.price,
        note:        note.trim() || null,
        pickup_time: pickupTime.trim(),
        share_phone: sharePhone,
        status:      'PENDING',
      }).select('id').single();

      if (error) {
        // Jika gagal insert, lepaskan kembali stok
        await supabase.rpc('release_polymart_stock', { p_product_id: product.id, p_quantity: qty });
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

      // 4. PolyRider Integration
      if (deliveryMethod === 'POLYRIDER') {
        const business = product.keusahawanan_businesses;
        await supabase.from('polyrider_jobs').insert({
          student_id: user.id,
          job_type: 'POLYMART_CUST',
          polymart_order_id: order.id,
          pickup_name: business?.name || 'PolyMart Vendor',
          dropoff_name: dropoffLocation.trim(),
          status: 'PENDING',
          base_fare: proposedPrice,
          proposed_price: proposedPrice
        });
      }

      toast.success(deliveryMethod === 'POLYRIDER' ? 'Pesanan & Rider berjaya ditempah!' : 'Pesanan berjaya dihantar!', {
        icon: '🎉',
        style: { borderRadius: '16px', fontWeight: 700 },
      });
      onSuccess();
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
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl overflow-hidden"
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0"
              style={{ background: PM_LIGHT }}>
              {product.image_url
                ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                : <div className="w-full h-full flex items-center justify-center text-2xl">{CATEGORY_EMOJI[product.category] ?? '📦'}</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-foreground leading-tight">{product.name}</h3>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">{product.keusahawanan_businesses?.name}</p>
              <p className="text-base font-black mt-1" style={{ color: PM_ACCENT }}>RM {product.price.toFixed(2)}</p>
            </div>
          </div>

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

          {/* Delivery Method */}
          <div className="bg-muted/10 rounded-2xl p-1 border border-border/50">
            <div className="flex gap-1">
              <button 
                onClick={() => setDeliveryMethod('PICKUP')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  deliveryMethod === 'PICKUP' 
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border' 
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}>
                Ambil Sendiri
              </button>
              <button 
                onClick={() => setDeliveryMethod('POLYRIDER')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  deliveryMethod === 'POLYRIDER' 
                    ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/20' 
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}>
                PolyRider
              </button>
            </div>
          </div>

          <AnimatePresence>
            {deliveryMethod === 'POLYRIDER' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="space-y-4 pt-1 pb-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Lokasi Penghantaran <span className="text-rose-400">*</span></p>
                    <input value={dropoffLocation} onChange={e => setDropoffLocation(e.target.value)}
                      placeholder="Cth: Kamsis A, Bilik 101"
                      className="w-full h-10 px-3 rounded-xl text-sm outline-none bg-amber-500/5 border border-amber-500/20 text-foreground placeholder:text-muted-foreground/40 focus:border-amber-500/50 transition-all" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Harga Tawaran Rider (RM) <span className="text-rose-400">*</span></p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setProposedPrice(p => Math.max(1, p - 0.5))}
                        className="w-10 h-10 rounded-xl border border-border/60 flex items-center justify-center hover:bg-muted/50 transition-colors">
                        <Minus className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <input 
                        type="number" min={1} step={0.5}
                        value={proposedPrice}
                        onChange={e => setProposedPrice(parseFloat(e.target.value) || 0)}
                        className="flex-1 h-10 px-3 rounded-xl text-center font-black text-amber-600 bg-amber-500/10 border border-amber-500/20 outline-none focus:border-amber-500/50 transition-all"
                      />
                      <button onClick={() => setProposedPrice(p => p + 0.5)}
                        className="w-10 h-10 rounded-xl border border-border/60 flex items-center justify-center hover:bg-muted/50 transition-colors">
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <p className="text-[9px] text-muted-foreground/50 mt-1">Tambang bergantung kepada jarak dari gerai ke lokasi anda.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pickup time */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">
              {deliveryMethod === 'POLYRIDER' ? 'Masa Pesanan Siap (Untuk Rider Ambil)' : 'Masa Ambil'} <span className="text-rose-400">*</span>
            </p>
            <input value={pickupTime} onChange={e => setPickupTime(e.target.value)}
              placeholder={deliveryMethod === 'POLYRIDER' ? "cth: Segera, 2:30 PM..." : "cth: Rehat 1.00pm, Selepas kelas 4pm..."}
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

          {/* Total + Submit */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-muted-foreground">Jumlah</span>
              <span className="text-xl font-black" style={{ color: PM_ACCENT }}>RM {total}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 px-1">
              <AlertCircle className="w-3 h-3" />
              <span>Pembayaran dibuat bersemuka semasa ambil pesanan.</span>
            </div>
            <button onClick={submit} disabled={submitting}
              className="w-full h-12 rounded-2xl text-white font-black text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              style={{ background: PM_GRADIENT }}>
              {submitting ? '⏳ Menghantar...' : `🛍️ Tempah Sekarang — RM ${total}`}
            </button>
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

  const [product,   setProduct]   = useState<Product | null>(null);
  const { refetchCounts } = usePolymart();
  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showOrder, setShowOrder] = useState(false);
  const [ordered,   setOrdered]   = useState(false);
  const [reported,  setReported]  = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase
        .from('business_products')
        .select(`
          *,
          keusahawanan_businesses!business_id(id, name, logo_url, description, polymart_contact_method, status)
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
    const { error } = await supabase.from('polymart_cart_items').upsert(
      { buyer_id: user.id, product_id: id, quantity: 1 },
      { onConflict: 'buyer_id, product_id' }
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
        {/* Product Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative aspect-[4/3] rounded-3xl overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${PM_LIGHT}, rgba(249,115,22,0.08))` }}>
          {product.image_url
            ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
            : <div className="w-full h-full flex items-center justify-center text-[100px]">{emoji}</div>
          }
          {isOut && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-sm font-black bg-black/60 px-4 py-2 rounded-full">Stok Habis</span>
            </div>
          )}
          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
            {emoji} {product.category}
          </div>
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

          {/* Price + Rating */}
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black" style={{ color: PM_ACCENT }}>
              RM {product.price.toFixed(2)}
            </span>
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
            {business.polymart_contact_method === 'whatsapp' && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-green-500/10 border border-green-500/20">
                <MessageCircle className="w-3 h-3 text-green-500" />
                <span className="text-[9px] font-bold text-green-600 dark:text-green-400">WhatsApp</span>
              </div>
            )}
          </motion.div>
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
                🛒 Tambah Troli
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
