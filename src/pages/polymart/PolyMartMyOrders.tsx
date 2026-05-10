import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PM_ACCENT, PM_LIGHT, PM_GRADIENT, PM_GLOW, CATEGORY_EMOJI } from './PolyMartLayout';
import { sendNotificationToUser } from '@/lib/notifications';
import toast from 'react-hot-toast';
import {
  Package, Clock, CheckCircle, XCircle, Truck, Star, Store,
  ChevronRight, MessageCircle, Phone, X, RefreshCw, Bike,
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
  polyrider_jobs?: {
    id: string;
    status: string;
    rider: { profiles: { full_name: string | null } | null } | null;
  }[];
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
    if (!error) { 
      toast.success('Terima kasih atas ulasan anda! ⭐'); 
      
      // Award merit (Exco Kediaman boleh adjust nilai di pangkalan data kelak)
      const { error: meritErr } = await supabase.rpc('increment_merit_by_source', {
        p_user_id: user.id,
        p_amount: 1,
        p_source: `Ulasan PolyMart: ${order.business_products.name.slice(0, 30)}`,
        p_type: 'RESIDENTIAL'
      });
      
      if (!meritErr) {
        toast.success('+1 Merit Kediaman! 🎉', {
          style: { background: '#f59e0b', color: '#fff', fontWeight: 900 }
        });
      }
      
      onClose(true); 
    }
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

        <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-2.5 text-center">
          <p className="text-[11px] font-black text-amber-700">🎁 Ganjaran Ulasan</p>
          <p className="text-[10px] font-bold text-amber-600/80 mt-0.5 leading-tight">
            Tinggalkan ulasan bergambar / jujur untuk menerima automatik +1 Merit Kediaman.
          </p>
        </div>

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

// ── Order Timeline ─────────────────────────────────────────────────────────────
function OrderTimeline({ status, cancelReason }: { status: OrderStatus, cancelReason?: string | null }) {
  if (status === 'CANCELLED') {
    return (
      <div className="px-3.5 py-3 border-t border-border/30 bg-rose-500/5">
        <div className="flex items-center gap-3">
          <XCircle className="w-6 h-6 text-rose-500" />
          <div>
            <p className="text-sm font-black text-rose-500">Dibatalkan</p>
            {cancelReason && <p className="text-[11px] font-bold text-rose-500/70 mt-0.5">{cancelReason}</p>}
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { key: 'PENDING',   label: 'Dibuat',   icon: Clock },
    { key: 'CONFIRMED', label: 'Diproses', icon: Package },
    { key: 'READY',     label: 'Sedia',    icon: Truck },
    { key: 'COMPLETED', label: 'Selesai',  icon: Star },
  ];

  const currentIdx = steps.findIndex(s => s.key === status);

  return (
    <div className="px-6 py-5 border-t border-border/30 bg-muted/5">
      <div className="flex items-center justify-between relative">
        {/* Progress Background Line */}
        <div className="absolute top-4 left-2 right-2 h-1 bg-muted rounded-full" />
        
        {/* Active Progress Line */}
        <motion.div 
          className="absolute top-4 left-2 h-1 rounded-full z-0"
          style={{ background: PM_ACCENT }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, currentIdx) * (100 / (steps.length - 1))}%` }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />

        {steps.map((step, idx) => {
          const isActive = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const StepIcon = step.icon;
          
          return (
            <div key={step.key} className="flex flex-col items-center gap-2 z-10 relative">
              <motion.div 
                initial={false}
                animate={{ 
                  backgroundColor: isActive ? PM_ACCENT : 'hsl(var(--muted))',
                  color: isActive ? '#fff' : 'hsl(var(--muted-foreground))',
                  scale: isCurrent ? 1.15 : 1,
                  boxShadow: isCurrent ? `0 0 12px ${PM_ACCENT}40` : 'none'
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center border-[3px] border-card transition-colors duration-300"
              >
                <StepIcon className="w-3.5 h-3.5" />
              </motion.div>
              <span 
                className={`text-[9px] font-black uppercase tracking-wider transition-colors duration-300 ${
                  isActive ? 'text-foreground' : 'text-muted-foreground/40'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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
            ? <img src={order.business_products.image_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
        </div>
      </div>

      {/* Visual Timeline Tracker */}
      <OrderTimeline status={order.status} cancelReason={order.cancel_reason} />

      {/* Actions */}
      {(order.status === 'CONFIRMED' || order.status === 'READY') && (
        <div className="px-3.5 pb-3.5 space-y-3">
          {/* PolyRider Status & Action */}
          {order.polyrider_jobs && order.polyrider_jobs.length > 0 ? (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bike className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 tracking-wider">Status Rider</p>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-100">{order.polyrider_jobs[0].status === 'PENDING' ? 'Mencari Rider...' : order.polyrider_jobs[0].status === 'ACCEPTED' ? `Rider Ditugaskan: ${order.polyrider_jobs[0].rider?.profiles?.full_name || 'Rider'}` : order.polyrider_jobs[0].status === 'IN_TRANSIT' ? 'Rider Dalam Perjalanan!' : order.polyrider_jobs[0].status === 'ARRIVED' ? 'Rider Tiba!' : order.polyrider_jobs[0].status}</p>
                </div>
              </div>
              <button onClick={() => navigate('/polyrider')} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-black shadow-sm">Jejak</button>
            </div>
          ) : (
            <button onClick={() => navigate('/polyrider', { state: { polymartOrderId: order.id, pickup_name: biz?.name, dropoff_name: 'Lokasi Anda (Sila isi)' } })}
              className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl bg-amber-500 text-white text-[11px] font-black shadow-sm hover:bg-amber-600 transition-colors">
              <Bike className="w-4 h-4" />
              <span>Panggil Rider untuk Hantar</span>
            </button>
          )}

          <div className="bg-white dark:bg-card p-4 rounded-2xl flex flex-col items-center justify-center border border-border/50 shadow-sm mx-auto max-w-[200px]">
            <QRCode value={`${window.location.origin}/polymart/vendor?order=${order.id}`} size={120} className="dark:bg-white p-2 rounded-xl" />
            <p className="text-[10px] text-center text-muted-foreground font-bold mt-3 leading-tight">
              Tunjuk QR ini kepada vendor semasa ambil pesanan
            </p>
          </div>
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl border border-green-500/30 bg-green-500/10 text-[11px] font-bold text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Hubungi via WhatsApp</span>
            </a>
          )}
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
  const [orders,         setOrders]         = useState<Order[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [isRefreshing,   setIsRefreshing]   = useState(false);
  const [lastRefreshed,  setLastRefreshed]  = useState<Date | null>(null);
  const [activeTab,      setActiveTab]      = useState<OrderStatus | 'all'>('all');
  const [reviewTarget,   setReviewTarget]   = useState<Order | null>(null);
  const [reviewedIds,    setReviewedIds]    = useState<Set<string>>(new Set());

  const loadOrders = useCallback(async (showRefreshSpinner = false) => {
    if (!user) return;
    if (showRefreshSpinner) setIsRefreshing(true);
    const { data } = await supabase.from('polymart_orders')
      .select(`
        *,
        business_products!product_id(id, name, image_url, category),
        keusahawanan_businesses!business_id(
          id, name, logo_url, polymart_contact_method,
          owner:profiles!owner_id(phone)
        ),
        buyer:profiles!buyer_id(phone),
        polyrider_jobs(
          id, status, 
          rider:polyrider_profiles(profiles(full_name))
        )
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    setOrders((data ?? []) as Order[]);
    setLastRefreshed(new Date());

    // Check which orders already have reviews
    const completedIds = (data ?? []).filter(o => o.status === 'COMPLETED').map(o => o.id);
    if (completedIds.length > 0) {
      const { data: rv } = await supabase.from('polymart_reviews')
        .select('order_id').eq('reviewer_id', user.id).in('order_id', completedIds);
      setReviewedIds(new Set(rv?.map(r => r.order_id) ?? []));
    }
    setLoading(false);
    if (showRefreshSpinner) setIsRefreshing(false);
  }, [user]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Auto-refresh bila pengguna kembali ke tab ini (visibilitychange)
  // Lebih bijak dari setInterval — hanya fire bila pengguna benar-benar aktif semula
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadOrders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadOrders]);

  // Realtime Auto-Refresh Subscription (DIKEKALKAN — sudah optimal, ada filter buyer_id)
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('polymart-myorders-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'polymart_orders', filter: `buyer_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as Order;
          setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
          
          if (updated.status === 'READY') {
            toast.success(`Pesanan ${updated.id.slice(0, 8)} sedia diambil! 🎉`);
          } else if (updated.status === 'CONFIRMED') {
            toast.success(`Pesanan sedang diproses! 📦`);
          } else if (updated.status === 'CANCELLED') {
            toast.error(`Pesanan dibatalkan.`);
          }
        }
      )
      .subscribe();

    const polyriderChannel = supabase.channel('polymart-rider-tracking')
      .on('postgres_changes', { 
        event: 'UPDATE', schema: 'public', table: 'polyrider_jobs' 
      }, (payload) => {
        const updated = payload.new;
        if (updated.polymart_order_id) {
          loadOrders(); // Refetch to get updated nested PolyRider job status
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
      supabase.removeChannel(polyriderChannel); 
    };
  }, [user, loadOrders]);

  const filtered = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab);
  const tabCounts: Record<string, number> = {};
  orders.forEach(o => { tabCounts[o.status] = (tabCounts[o.status] ?? 0) + 1; });

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-foreground">Pesanan Saya</h1>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{orders.length} pesanan keseluruhan</p>
            </div>
            {/* Butang Semak Status + Masa Terakhir Dikemas Kini */}
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => loadOrders(true)}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all disabled:opacity-60"
                style={{ background: PM_LIGHT, color: PM_ACCENT }}
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Menyemak...' : 'Semak Status'}
              </button>
              {lastRefreshed && (
                <p className="text-[9px] text-muted-foreground/40 font-bold">
                  Dikemas kini: {lastRefreshed.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
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
