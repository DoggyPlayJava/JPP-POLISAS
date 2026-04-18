import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PM_ACCENT, PM_LIGHT, PM_GRADIENT, CATEGORY_EMOJI, usePolymart } from './PolyMartLayout';
import { sendNotificationToUser } from '@/lib/notifications';
import toast from 'react-hot-toast';
import {
  Package, CheckCircle, XCircle, Truck, Clock, Store,
  Phone, MessageCircle, ChevronDown, ChevronUp, AlertTriangle,
  TrendingUp, ShoppingBag,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
type OrderStatus = 'PENDING' | 'CONFIRMED' | 'READY' | 'COMPLETED' | 'CANCELLED';

interface VendorOrder {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  note: string | null;
  pickup_time: string | null;
  share_phone: boolean;
  status: OrderStatus;
  created_at: string;
  business_products: { id: string; name: string; image_url: string | null; category: string } | null;
  buyer: { id: string; full_name: string; matric_no: string; phone: string | null } | null;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Menunggu',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  CONFIRMED: { label: 'Disahkan',  color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  READY:     { label: 'Siap',      color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  COMPLETED: { label: 'Selesai',   color: '#94a3b8', bg: 'rgba(148,163,184,0.08)'},
  CANCELLED: { label: 'Batal',     color: '#ef4444', bg: 'rgba(239,68,68,0.08)'  },
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-border/40 bg-card p-3 flex items-center gap-2.5 min-w-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[18px] font-black text-foreground leading-none">{value}</p>
        <p className="text-[9px] text-muted-foreground/60 font-medium truncate">{label}</p>
      </div>
    </div>
  );
}

// ── Order Action Card ──────────────────────────────────────────────────────────
function VendorOrderCard({ order, onUpdate }: { order: VendorOrder; onUpdate: () => void }) {
  const { profile } = useAuth();
  const [expanded,    setExpanded]   = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel,  setShowCancel] = useState(false);
  const [loading,     setLoading]    = useState(false);
  const cfg = STATUS_CONFIG[order.status];
  const emoji = CATEGORY_EMOJI[order.business_products?.category ?? ''] ?? '📦';

  const updateStatus = async (newStatus: OrderStatus, extra: Record<string, any> = {}) => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const updates: Record<string, any> = { status: newStatus, updated_at: now, ...extra };
      if (newStatus === 'CONFIRMED') updates.confirmed_at = now;
      if (newStatus === 'READY') updates.ready_at = now;
      if (newStatus === 'COMPLETED') updates.completed_at = now;
      if (newStatus === 'CANCELLED') updates.cancelled_at = now;

      const { error } = await supabase.from('polymart_orders').update(updates).eq('id', order.id);
      if (error) throw error;

      // Notify buyer
      const buyerId = order.buyer?.id;
      if (buyerId) {
        const messages: Record<string, { title: string; message: string }> = {
          CONFIRMED: { title: '✅ Pesanan Disahkan!', message: `Pesanan anda (${order.quantity}x ${order.business_products?.name}) telah disahkan. Sedia pada: ${order.pickup_time ?? 'TBA'}` },
          READY:     { title: '🎉 Pesanan Siap Diambil!', message: `Pesanan anda (${order.business_products?.name}) sudah siap. Sila datang ambil!` },
          COMPLETED: { title: '🌟 Pesanan Selesai', message: `Terima kasih kerana berurusan di PolyMart!` },
          CANCELLED: { title: '❌ Pesanan Dibatalkan', message: `Maap, pesanan anda dibatalkan${cancelReason ? `: ${cancelReason}` : ''}` },
        };
        const msg = messages[newStatus];
        if (msg) {
          await sendNotificationToUser(buyerId, {
            ...msg, type: `polymart_order_${newStatus.toLowerCase()}`,
            module: 'POLYMART', link: `/polymart/pesanan-saya`, reference_id: order.id,
          });

          // WhatsApp link for vendor to contact buyer (if applicable)
          if (newStatus === 'CONFIRMED' && order.share_phone && order.buyer?.phone) {
            const phone = order.buyer.phone.replace(/[^0-9]/g, '');
            const waMsg = encodeURIComponent(`Hai ${order.buyer.full_name}! Pesanan anda di PolyMart sudah kami sahkan 🎉\n\n📦 ${order.quantity}x ${order.business_products?.name}\n⏰ Ambil: ${order.pickup_time ?? 'TBA'}\n\nTerima kasih!`);
            const waUrl = `https://wa.me/${phone}?text=${waMsg}`;
            // Open WhatsApp in new tab for vendor
            window.open(waUrl, '_blank');
          }
        }
      }

      toast.success(`Status dikemaskini: ${STATUS_CONFIG[newStatus].label}`);
      onUpdate();
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal kemaskini');
    } finally {
      setLoading(false);
      setShowCancel(false);
    }
  };

  return (
    <motion.div layout className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-3.5 py-2" style={{ background: cfg.bg }}>
        <span className="text-[11px] font-black" style={{ color: cfg.color }}>{cfg.label}</span>
        <span className="ml-auto text-[9px] text-muted-foreground/50">
          {new Date(order.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: PM_LIGHT }}>
            {order.business_products?.image_url
              ? <img src={order.business_products.image_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xl">{emoji}</div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-foreground truncate">{order.business_products?.name}</p>
            <p className="text-[10px] text-muted-foreground/60">×{order.quantity} • RM {(order.total_price ?? order.unit_price * order.quantity).toFixed(2)}</p>
            {order.pickup_time && (
              <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1 mt-0.5">
                <Clock className="w-2.5 h-2.5" /> {order.pickup_time}
              </p>
            )}
          </div>
          <button onClick={() => setExpanded(e => !e)}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors self-start shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>

        {/* Expanded buyer info */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-3 pt-3 border-t border-border/40 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground">
                    {order.buyer?.full_name?.[0] ?? '?'}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-foreground">{order.buyer?.full_name ?? 'Tidak diketahui'}</p>
                    <p className="text-[9px] text-muted-foreground/50">{order.buyer?.matric_no}</p>
                  </div>
                  {order.share_phone && order.buyer?.phone && (
                    <span className="ml-auto text-[9px] font-bold text-green-500 flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" /> {order.buyer.phone}
                    </span>
                  )}
                </div>
                {order.note && (
                  <div className="px-3 py-2 rounded-xl bg-muted/30 border border-border/40">
                    <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">Nota</p>
                    <p className="text-[11px] text-foreground">{order.note}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel form */}
        <AnimatePresence>
          {showCancel && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  placeholder="Sebab pembatalan..."
                  className="w-full h-10 px-3 rounded-xl text-xs outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40" />
                <div className="flex gap-2">
                  <button onClick={() => setShowCancel(false)}
                    className="flex-1 h-9 rounded-xl text-[11px] font-bold border border-border/50 hover:bg-muted/50 transition-colors">
                    Batal
                  </button>
                  <button onClick={() => updateStatus('CANCELLED', { cancel_reason: cancelReason })}
                    disabled={loading} className="flex-1 h-9 rounded-xl text-[11px] font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors">
                    Sahkan Batal
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="mt-3 flex gap-2">
          {order.status === 'PENDING' && (
            <>
              <button onClick={() => updateStatus('CONFIRMED')} disabled={loading}
                className="flex-1 h-9 rounded-xl text-[11px] font-black text-white transition-all disabled:opacity-60"
                style={{ background: PM_GRADIENT }}>
                ✅ Sahkan
              </button>
              <button onClick={() => setShowCancel(true)} disabled={loading}
                className="flex-1 h-9 rounded-xl text-[11px] font-black text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-colors disabled:opacity-60">
                ❌ Tolak
              </button>
            </>
          )}
          {order.status === 'CONFIRMED' && (
            <>
              <button onClick={() => updateStatus('READY')} disabled={loading}
                className="flex-1 h-9 rounded-xl text-[11px] font-black text-white transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                🎉 Siap Diambil
              </button>
              <button onClick={() => setShowCancel(true)} disabled={loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 transition-colors">
                <XCircle className="w-4 h-4 text-rose-500" />
              </button>
            </>
          )}
          {order.status === 'READY' && (
            <button onClick={() => updateStatus('COMPLETED')} disabled={loading}
              className="flex-1 h-9 rounded-xl text-[11px] font-black text-muted-foreground border border-border/50 hover:bg-muted/50 transition-colors disabled:opacity-60">
              ✔️ Tandakan Selesai
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function PolyMartVendorDashboard() {
  const { user } = useAuth();
  const { refetchCounts } = usePolymart();

  const [orders,   setOrders]   = useState<VendorOrder[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'active'>('active');

  const loadOrders = async () => {
    if (!user) return;
    // Get all businesses where user is owner
    const { data: businesses } = await supabase
      .from('keusahawanan_businesses').select('id').eq('owner_id', user.id).eq('status', 'ACTIVE');
    const { data: memberBiz } = await supabase
      .from('student_business_memberships').select('business_id').eq('user_id', user.id).eq('status', 'ACTIVE');

    const ids = [...new Set([
      ...(businesses?.map(b => b.id) ?? []),
      ...(memberBiz?.map(m => m.business_id) ?? []),
    ])];
    if (ids.length === 0) { setLoading(false); return; }

    const { data } = await supabase.from('polymart_orders')
      .select(`
        *,
        business_products!product_id(id, name, image_url, category),
        buyer:profiles!buyer_id(id, full_name, matric_no, phone)
      `)
      .in('business_id', ids)
      .order('created_at', { ascending: false });

    setOrders((data ?? []) as VendorOrder[]);
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, [user]);

  const handleUpdate = () => { loadOrders(); refetchCounts(); };

  const pending   = orders.filter(o => o.status === 'PENDING');
  const active    = orders.filter(o => ['PENDING','CONFIRMED','READY'].includes(o.status));
  const today     = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const totalRev  = orders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + (o.total_price ?? o.unit_price * o.quantity), 0);

  const tabMap: Record<string, VendorOrder[]> = {
    active:    active,
    PENDING:   pending,
    CONFIRMED: orders.filter(o => o.status === 'CONFIRMED'),
    READY:     orders.filter(o => o.status === 'READY'),
    COMPLETED: orders.filter(o => o.status === 'COMPLETED'),
    CANCELLED: orders.filter(o => o.status === 'CANCELLED'),
  };
  const displayed = tabMap[activeTab] ?? active;

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-black text-foreground">Dashboard Peniaga</h1>
        <p className="text-xs text-muted-foreground/60">Urus pesanan PolyMart anda</p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard label="Pesanan Hari Ini" value={today.length}      icon={ShoppingBag}  color={PM_ACCENT} />
        <StatCard label="Menunggu Sahkan"  value={pending.length}    icon={Clock}        color="#f97316" />
        <StatCard label="Aktif Sekarang"   value={active.length}     icon={Package}      color="#6366f1" />
        <StatCard label="Hasil Selesai"    value={`RM ${totalRev.toFixed(0)}`} icon={TrendingUp} color="#22c55e" />
      </motion.div>

      {/* Pending alert */}
      {pending.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border"
          style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: PM_ACCENT }} />
          <p className="text-[11px] font-bold" style={{ color: PM_ACCENT }}>
            Anda ada {pending.length} pesanan menunggu pengesahan!
          </p>
        </motion.div>
      )}

      {/* Tab filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {[
          { key: 'active', label: 'Aktif', emoji: '🔥' },
          { key: 'PENDING', label: 'Menunggu', emoji: '⏳' },
          { key: 'CONFIRMED', label: 'Disahkan', emoji: '✅' },
          { key: 'READY', label: 'Siap', emoji: '🎉' },
          { key: 'COMPLETED', label: 'Selesai', emoji: '⭐' },
          { key: 'CANCELLED', label: 'Batal', emoji: '❌' },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
            style={activeTab === tab.key
              ? { background: PM_LIGHT, color: PM_ACCENT, border: `1.5px solid ${PM_ACCENT}40` }
              : { background: 'transparent', color: 'hsl(var(--muted-foreground))', border: '1.5px solid hsl(var(--border)/0.5)' }
            }>
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
            {(tabMap[tab.key]?.length ?? 0) > 0 && (
              <span className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ background: activeTab === tab.key ? PM_ACCENT : 'hsl(var(--muted))', color: activeTab === tab.key ? 'white' : 'hsl(var(--muted-foreground))' }}>
                {tabMap[tab.key]?.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: PM_ACCENT, borderTopColor: 'transparent' }} />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="text-5xl">🎯</div>
          <p className="text-sm font-bold text-muted-foreground/60">Tiada pesanan dalam kategori ini</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {displayed.map(o => (
              <VendorOrderCard key={o.id} order={o} onUpdate={handleUpdate} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
