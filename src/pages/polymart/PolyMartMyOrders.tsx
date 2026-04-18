import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PM_ACCENT, PM_LIGHT, PM_GRADIENT, PM_GLOW, CATEGORY_EMOJI } from './PolyMartLayout';
import { sendNotificationToUser } from '@/lib/notifications';
import toast from 'react-hot-toast';
import {
  Package, Clock, CheckCircle, XCircle, Truck, Star, Store,
  ChevronRight, MessageCircle, Phone, X,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
type OrderStatus = 'PENDING' | 'CONFIRMED' | 'READY' | 'COMPLETED' | 'CANCELLED';

interface Order {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  note: string | null;
  pickup_time: string | null;
  share_phone: boolean;
  status: OrderStatus;
  created_at: string;
  confirmed_at: string | null;
  ready_at: string | null;
  cancel_reason: string | null;
  business_products: {
    id: string;
    name: string;
    image_url: string | null;
    category: string;
  } | null;
  keusahawanan_businesses: {
    id: string;
    name: string;
    logo_url: string | null;
    polymart_contact_method: string;
    owner: { phone: string | null } | null;
  } | null;
  buyer: { phone: string | null } | null;
}

const STATUS_TABS: { key: OrderStatus | 'all'; label: string; emoji: string }[] = [
  { key: 'all',       label: 'Semua',    emoji: '📋' },
  { key: 'PENDING',   label: 'Menunggu', emoji: '⏳' },
  { key: 'CONFIRMED', label: 'Disahkan', emoji: '✅' },
  { key: 'READY',     label: 'Siap',     emoji: '🎉' },
  { key: 'COMPLETED', label: 'Selesai',  emoji: '⭐' },
  { key: 'CANCELLED', label: 'Batal',    emoji: '❌' },
];

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.FC<any> }> = {
  PENDING:   { label: 'Menunggu Pengesahan', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: Clock },
  CONFIRMED: { label: 'Disahkan Vendor',     color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: CheckCircle },
  READY:     { label: 'Sedia Diambil!',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  icon: Truck },
  COMPLETED: { label: 'Selesai',             color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: CheckCircle },
  CANCELLED: { label: 'Dibatalkan',          color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: XCircle },
};

// ── Review Modal ───────────────────────────────────────────────────────────────
function ReviewModal({ order, onClose }: { order: Order; onClose: (submitted: boolean) => void }) {
  const { user } = useAuth();
  const [rating,    setRating]    = useState(5);
  const [comment,   setComment]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user || !order.business_products?.id) return;
    setSubmitting(true);
    const { error } = await supabase.from('polymart_reviews').insert({
      product_id:  order.business_products.id,
      order_id:    order.id,
      reviewer_id: user.id,
      rating,
      comment: comment.trim() || null,
    });
    if (!error) { toast.success('Terima kasih atas ulasan anda! ⭐'); onClose(true); }
    else toast.error('Gagal hantar ulasan');
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onClose(false)} />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative w-full sm:max-w-sm bg-card rounded-3xl border border-border/50 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-foreground">Beri Ulasan</h3>
          <button onClick={() => onClose(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/60">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm font-bold text-muted-foreground">{order.business_products?.name}</p>

        {/* Star picker */}
        <div className="flex items-center justify-center gap-2 py-3">
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() => setRating(s)}>
              <Star className="w-9 h-9 transition-all" style={{ color: s <= rating ? '#f59e0b' : 'hsl(var(--border))', fill: s <= rating ? '#f59e0b' : 'none' }} />
            </button>
          ))}
        </div>

        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
          placeholder="Bagaimana pengalaman anda? (pilihan)"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 resize-none focus:border-amber-500/50 transition-all" />

        <button onClick={submit} disabled={submitting}
          className="w-full h-11 rounded-2xl text-white font-black text-sm disabled:opacity-60"
          style={{ background: PM_GRADIENT }}>
          {submitting ? 'Menghantar...' : '⭐ Hantar Ulasan'}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Order Card ─────────────────────────────────────────────────────────────────
function OrderCard({ order, onReview }: { order: Order; onReview: (o: Order) => void }) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[order.status];
  const StatusIcon = cfg.icon;
  const emoji = CATEGORY_EMOJI[order.business_products?.category ?? ''] ?? '📦';
  const biz = order.keusahawanan_businesses;

  const vendorPhone = biz?.owner?.phone;
  const formattedVendorPhone = vendorPhone ? vendorPhone.replace(/\D/g, '').replace(/^0/, '60') : '';

  const whatsappUrl = biz?.polymart_contact_method === 'whatsapp' && order.share_phone && formattedVendorPhone
    ? `https://wa.me/${formattedVendorPhone}?text=${encodeURIComponent(`Hai! Saya dari PolyMart — pesanan saya: ${order.quantity}x ${order.business_products?.name ?? 'produk'} (ID: ${order.id.slice(0, 8)})`)}` : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
    >
      {/* Status bar */}
      <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ background: cfg.bg }}>
        <StatusIcon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
        <span className="text-[11px] font-black" style={{ color: cfg.color }}>{cfg.label}</span>
        <span className="ml-auto text-[9px] text-muted-foreground/50">
          {new Date(order.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="p-3.5 flex gap-3">
        {/* Product image */}
        <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0" style={{ background: PM_LIGHT }}>
          {order.business_products?.image_url
            ? <img src={order.business_products.image_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">{emoji}</div>
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground/50 font-bold flex items-center gap-1">
            <Store className="w-2.5 h-2.5" /> {biz?.name ?? 'Kedai'}
          </p>
          <p className="text-sm font-black text-foreground truncate">{order.business_products?.name}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-black" style={{ color: PM_ACCENT }}>RM {(order.total_price ?? order.unit_price * order.quantity).toFixed(2)}</span>
            <span className="text-[10px] text-muted-foreground/50">×{order.quantity}</span>
          </div>
          {order.pickup_time && (
            <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1 mt-0.5">
              <Clock className="w-2.5 h-2.5" /> {order.pickup_time}
            </p>
          )}
          {order.cancel_reason && (
            <p className="text-[10px] text-rose-400 mt-0.5">Sebab: {order.cancel_reason}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {(order.status === 'CONFIRMED' || order.status === 'READY') && whatsappUrl && (
        <div className="px-3.5 pb-3.5 flex gap-2">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-green-500/30 bg-green-500/10 text-[11px] font-bold text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Hubungi via WhatsApp</span>
          </a>
        </div>
      )}

      {order.status === 'COMPLETED' && (
        <div className="px-3.5 pb-3.5">
          <button onClick={() => onReview(order)}
            className="w-full h-9 rounded-xl text-[11px] font-black transition-all hover:brightness-110"
            style={{ background: PM_LIGHT, color: PM_ACCENT }}>
            ⭐ Beri Ulasan
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function PolyMartMyOrders() {
  const { user } = useAuth();
  const [orders,       setOrders]       = useState<Order[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState<OrderStatus | 'all'>('all');
  const [reviewTarget, setReviewTarget] = useState<Order | null>(null);
  const [reviewedIds,  setReviewedIds]  = useState<Set<string>>(new Set());

  const loadOrders = async () => {
    if (!user) return;
    const { data } = await supabase.from('polymart_orders')
      .select(`
        *,
        business_products!product_id(id, name, image_url, category),
        keusahawanan_businesses!business_id(
          id, name, logo_url, polymart_contact_method,
          owner:profiles!owner_id(phone)
        ),
        buyer:profiles!buyer_id(phone)
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    setOrders((data ?? []) as Order[]);

    // Check which orders already have reviews
    const completedIds = (data ?? []).filter(o => o.status === 'COMPLETED').map(o => o.id);
    if (completedIds.length > 0) {
      const { data: rv } = await supabase.from('polymart_reviews')
        .select('order_id').eq('reviewer_id', user.id).in('order_id', completedIds);
      setReviewedIds(new Set(rv?.map(r => r.order_id) ?? []));
    }
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, [user]);

  const filtered = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab);
  const tabCounts: Record<string, number> = {};
  orders.forEach(o => { tabCounts[o.status] = (tabCounts[o.status] ?? 0) + 1; });

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-black text-foreground">Pesanan Saya</h1>
          <p className="text-xs text-muted-foreground/60 mt-0.5">{orders.length} pesanan keseluruhan</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {STATUS_TABS.map(tab => {
            const count = tab.key === 'all' ? orders.length : tabCounts[tab.key] ?? 0;
            return (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                style={activeTab === tab.key
                  ? { background: PM_LIGHT, color: PM_ACCENT, border: `1.5px solid ${PM_ACCENT}40` }
                  : { background: 'transparent', color: 'hsl(var(--muted-foreground))', border: '1.5px solid hsl(var(--border)/0.5)' }
                }>
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                    style={{ background: activeTab === tab.key ? PM_ACCENT : 'hsl(var(--muted))', color: activeTab === tab.key ? 'white' : 'hsl(var(--muted-foreground))' }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Orders */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin"
              style={{ borderColor: PM_ACCENT, borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-5xl">📦</div>
            <p className="text-sm font-bold text-muted-foreground/60">Tiada pesanan</p>
            <p className="text-xs text-muted-foreground/40">Pesanan anda akan muncul di sini</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onReview={o => !reviewedIds.has(o.id) && setReviewTarget(o)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {reviewTarget && (
          <ReviewModal
            order={reviewTarget}
            onClose={(submitted) => {
              if (submitted) setReviewedIds(s => new Set([...s, reviewTarget.id]));
              setReviewTarget(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
