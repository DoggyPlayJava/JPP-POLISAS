import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { type PolyAd } from '@/types';
import { PM_ACCENT, PM_LIGHT, PM_GRADIENT, CATEGORY_EMOJI, usePolymart } from './PolyMartLayout';
import { sendNotificationToUser } from '@/lib/notifications';
import toast from 'react-hot-toast';
import {
  Package, CheckCircle, XCircle, Truck, Clock, Store,
  Phone, MessageCircle, ChevronDown, ChevronUp, AlertTriangle,
  TrendingUp, ShoppingBag, CreditCard, Handshake, Eye, Image,
  Search, X,
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
  business_id: string;
  business_products: { id: string; name: string; image_url: string | null; category: string } | null;
  buyer: { id: string; full_name: string; matric_no: string; phone: string | null } | null;
  // Payment fields
  payment_method: 'COD' | 'QR_ONLINE' | null;
  payment_receipt_url: string | null;
  payment_receipt_rejected: boolean;
  payment_verified_at: string | null;
  payment_verified_by: string | null;
  payment_deadline_at: string | null;
  selected_variation: string | null;
  cancellation_requested_at: string | null;
  cancellation_reason: string | null;
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

interface GroupedVendorOrder {
  id: string;
  buyer: {
    id: string;
    full_name: string;
    matric_no: string;
    phone: string | null;
  } | null;
  business_id: string;
  payment_method: 'COD' | 'QR_ONLINE' | null;
  payment_receipt_url: string | null;
  payment_receipt_rejected: boolean;
  payment_verified_at: string | null;
  payment_verified_by: string | null;
  payment_deadline_at: string | null;
  pickup_time: string | null;
  share_phone: boolean;
  status: OrderStatus;
  created_at: string;
  cancellation_requested_at: string | null;
  cancellation_reason: string | null;
  items: {
    order_id: string;
    product_id: string;
    name: string;
    image_url: string | null;
    category: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    selected_variation: string | null;
    note: string | null;
  }[];
}

const groupVendorOrders = (rawOrders: VendorOrder[]): GroupedVendorOrder[] => {
  const groups: Record<string, GroupedVendorOrder> = {};
  
  rawOrders.forEach(o => {
    const buyerId = o.buyer?.id || 'unknown';
    const bizId = o.business_id;
    const status = o.status;
    const method = o.payment_method || 'COD';
    
    let batchKey = '';
    if (method === 'QR_ONLINE' && o.payment_receipt_url) {
      batchKey = o.payment_receipt_url;
    } else {
      const timeMs = new Date(o.created_at).getTime();
      const bucket = Math.floor(timeMs / 15000); // 15-second intervals
      batchKey = `time_${bucket}`;
    }
    
    const key = `${buyerId}_${bizId}_${status}_${method}_${batchKey}`;
    
    if (!groups[key]) {
      groups[key] = {
        id: o.id,
        buyer: o.buyer,
        business_id: o.business_id,
        payment_method: o.payment_method,
        payment_receipt_url: o.payment_receipt_url,
        payment_receipt_rejected: o.payment_receipt_rejected,
        payment_verified_at: o.payment_verified_at,
        payment_verified_by: o.payment_verified_by,
        payment_deadline_at: o.payment_deadline_at,
        pickup_time: o.pickup_time,
        share_phone: o.share_phone,
        status: o.status,
        created_at: o.created_at,
        cancellation_requested_at: o.cancellation_requested_at,
        cancellation_reason: o.cancellation_reason,
        items: []
      };
    }
    
    groups[key].items.push({
      order_id: o.id,
      product_id: o.business_products?.id || '',
      name: o.business_products?.name || 'Produk',
      image_url: o.business_products?.image_url || null,
      category: o.business_products?.category || '',
      quantity: o.quantity,
      unit_price: o.unit_price,
      total_price: o.total_price ?? o.unit_price * o.quantity,
      selected_variation: o.selected_variation,
      note: o.note
    });
  });
  
  return Object.values(groups).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

// ── Order Action Card ──────────────────────────────────────────────────────────
function VendorOrderCard({ order, onUpdate }: { order: GroupedVendorOrder; onUpdate: () => void }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [expanded,    setExpanded]   = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel,  setShowCancel] = useState(false);
  const [showComplete,setShowComplete] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH'|'QR'|'TRANSFER'>('QR');
  const [loading,     setLoading]    = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const [refundReference, setRefundReference] = useState('');
  const cfg = STATUS_CONFIG[order.status];

  const updateStatus = async (newStatus: OrderStatus, extra: Record<string, any> = {}) => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const updates: Record<string, any> = { status: newStatus, updated_at: now, ...extra };
      if (newStatus === 'CONFIRMED') updates.confirmed_at = now;
      if (newStatus === 'READY') updates.ready_at = now;
      if (newStatus === 'COMPLETED') updates.completed_at = now;
      if (newStatus === 'CANCELLED') updates.cancelled_at = now;

      const orderIds = order.items.map(i => i.order_id);

      if (newStatus === 'CANCELLED') {
        for (const item of order.items) {
          await supabase.rpc('release_polymart_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
            p_variation: item.selected_variation || null
          });
        }
      }

      if (newStatus === 'COMPLETED') {
        for (const item of order.items) {
          const { error } = await supabase.rpc('complete_polymart_order', {
            p_order_id: item.order_id,
            p_business_id: order.business_id,
            p_product_id: item.product_id,
            p_quantity: item.quantity,
            p_unit_price: item.unit_price,
            p_payment_method: paymentMethod,
            p_served_by: profile?.id
          });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from('polymart_orders').update(updates).in('id', orderIds);
        if (error) throw error;
      }

      // Notify buyer
      const buyerId = order.buyer?.id;
      if (buyerId) {
        const itemsDesc = order.items.map(i => `${i.quantity}x ${i.name}${i.selected_variation ? ` (${i.selected_variation})` : ''}`).join(', ');
        const messages: Record<string, { title: string; message: string }> = {
          CONFIRMED: { title: '✅ Pesanan Disahkan!', message: `Pesanan anda (${itemsDesc}) telah disahkan. Sedia pada: ${order.pickup_time ?? 'TBA'}` },
          READY:     { title: '🎉 Pesanan Siap Diambil!', message: `Pesanan anda (${itemsDesc}) sudah siap. Sila datang ambil!` },
          COMPLETED: { title: '🌟 Pesanan Selesai', message: `Terima kasih kerana berurusan di PolyMart!` },
          CANCELLED: { title: '❌ Pesanan Dibatalkan', message: `Maap, pesanan anda dibatalkan${cancelReason ? `: ${cancelReason}` : ''}` },
        };
        const msg = messages[newStatus];
        if (msg) {
          await sendNotificationToUser(buyerId, {
            ...msg, type: `polymart_order_${newStatus.toLowerCase()}`,
            module: 'POLYMART', link: `/polymart/pesanan-saya`, reference_id: order.id,
          });

          if (newStatus === 'CONFIRMED' && order.share_phone && order.buyer?.phone) {
            const phone = order.buyer.phone.replace(/\D/g, '').replace(/^0/, '60');
            const waMsg = encodeURIComponent(`Hai ${order.buyer.full_name}! Pesanan anda di PolyMart sudah kami sahkan 🎉\n\n📦 ${itemsDesc}\n⏰ Ambil: ${order.pickup_time ?? 'TBA'}\n\nTerima kasih!`);
            const waUrl = `https://wa.me/${phone}?text=${waMsg}`;
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
      setShowComplete(false);
    }
  };

  const totalAmount = order.items.reduce((sum, i) => sum + i.total_price, 0);
  const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      <motion.div layout className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-3.5 py-2" style={{ background: cfg.bg }}>
        <span className="text-[11px] font-black" style={{ color: cfg.color }}>{cfg.label}</span>
        <span className="ml-auto text-[9px] text-muted-foreground/50">
          {new Date(order.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Content */}
      <div className="p-3.5 space-y-3.5">
        {/* Buyer Info Header (Shopee Style) */}
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/30">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-black text-muted-foreground uppercase border border-border/40 shrink-0">
            {order.buyer?.full_name?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[11px] font-black text-foreground leading-tight truncate">{order.buyer?.full_name ?? 'Tidak diketahui'}</h4>
            <p className="text-[9px] text-muted-foreground/60 font-medium">{order.buyer?.matric_no ?? 'Tiada No Matrik'}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {order.pickup_time && (
              <div className="px-2 py-1 rounded-lg bg-muted/40 border border-border/40 flex items-center gap-1 text-[9px] font-black text-muted-foreground">
                <Clock className="w-3 h-3 text-muted-foreground/60" /> {order.pickup_time}
              </div>
            )}
            <button onClick={() => setExpanded(e => !e)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Expanded buyer info */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="pb-3 border-b border-border/40 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-muted-foreground">No. Telefon Pelajar:</span>
                  {order.share_phone && order.buyer?.phone ? (
                    <a href={`https://wa.me/${order.buyer.phone.replace(/\D/g, '').replace(/^0/, '60')}`} target="_blank" rel="noopener noreferrer"
                      className="text-green-500 font-bold hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {order.buyer.phone} (Hubungi)
                    </a>
                  ) : (
                    <span className="text-muted-foreground/50">Tidak dikongsi</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Products List */}
        <div className="space-y-2">
          {order.items.map(item => {
            const emoji = CATEGORY_EMOJI[item.category] ?? '📦';
            return (
              <div key={item.order_id} className="flex gap-3 py-2 border-b border-border/30 last:border-0 last:pb-0 first:pt-0">
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center text-lg border border-border/30">
                  {item.image_url
                    ? <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    : emoji
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[11px] font-black text-foreground truncate">{item.name}</p>
                    {item.selected_variation && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[8px] font-black text-amber-500">
                        {item.selected_variation}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 font-semibold mt-0.5">RM {item.unit_price.toFixed(2)} × {item.quantity}</p>
                  
                  {item.note && (
                    <div className="mt-1 px-2 py-1 rounded bg-muted/40 border border-border/20 text-[9px] text-muted-foreground leading-snug">
                      <span className="font-bold text-amber-600 dark:text-amber-400">Nota: </span>
                      {item.note}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-black text-foreground">RM {item.total_price.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Price Row */}
        <div className="flex justify-between items-center pt-2.5 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            {order.payment_method && (
              <span className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full ${order.payment_method === 'QR_ONLINE' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'}`}>
                {order.payment_method === 'QR_ONLINE' ? <CreditCard className="w-2.5 h-2.5" /> : <Handshake className="w-2.5 h-2.5" />}
                {order.payment_method === 'QR_ONLINE' ? 'QR Online' : 'COD'}
                {order.payment_verified_at ? ' (Sah)' : ''}
              </span>
            )}
          </div>
          <div className="text-right flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-bold">Jumlah Pakej ({totalQty} unit):</span>
            <span className="text-sm font-black" style={{ color: PM_ACCENT }}>RM {totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Buyer Cancellation Request Banner */}
        {order.cancellation_requested_at && order.status !== 'CANCELLED' && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <p className="text-[11px] font-black text-rose-600">Pembeli Minta Pembatalan</p>
            </div>
            <p className="text-[10px] text-rose-500/70">Sebab: {order.cancellation_reason}</p>
            <div className="flex gap-2">
              <button onClick={async () => {
                  if (order.payment_method === 'QR_ONLINE') {
                    setShowRefundModal(true);
                  } else {
                    setLoading(true);
                    const { error } = await supabase.rpc('vendor_handle_cancellation', {
                      p_order_id: order.id,
                      p_vendor_id: profile?.id,
                      p_action: 'approve',
                    });
                    if (error) { toast.error(error.message); setLoading(false); return; }
                    if (order.buyer?.id) {
                      await sendNotificationToUser(order.buyer.id, {
                        title: '✅ Pembatalan Diluluskan',
                        message: `Pesanan anda telah dibatalkan seperti diminta.`,
                        type: 'polymart_cancellation_approved',
                        module: 'POLYMART',
                        link: '/polymart/pesanan-saya',
                        reference_id: order.id,
                      });
                    }
                    toast.success('Pembatalan diluluskan');
                    onUpdate();
                    setLoading(false);
                  }
                }} disabled={loading}
                className="flex-1 h-9 rounded-xl text-[11px] font-black bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-60">
                ✅ Luluskan Batal
              </button>
              <button onClick={async () => {
                  setLoading(true);
                  const { error } = await supabase.rpc('vendor_handle_cancellation', {
                    p_order_id: order.id,
                    p_vendor_id: profile?.id,
                    p_action: 'reject',
                  });
                  if (error) { toast.error(error.message); setLoading(false); return; }
                  if (order.buyer?.id) {
                    await sendNotificationToUser(order.buyer.id, {
                      title: '❌ Pembatalan Ditolak',
                      message: `Permintaan pembatalan untuk tempahan anda telah ditolak oleh vendor.`,
                      type: 'polymart_cancellation_rejected',
                      module: 'POLYMART',
                      link: '/polymart/pesanan-saya',
                      reference_id: order.id,
                    });
                  }
                  toast.success('Permintaan pembatalan ditolak');
                  onUpdate();
                  setLoading(false);
                }} disabled={loading}
                className="flex-1 h-9 rounded-xl text-[11px] font-black border border-border/50 hover:bg-muted/50 transition-colors disabled:opacity-60">
                ❌ Tolak
              </button>
            </div>
          </div>
        )}

        {/* Cancel form */}
        <AnimatePresence>
          {showCancel && (
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
          )}
        </AnimatePresence>

        {/* Complete form */}
        <AnimatePresence>
          {showComplete && (
            <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cara Bayaran Pelajar</p>
              <div className="flex gap-2">
                {['CASH', 'QR', 'TRANSFER'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m as any)}
                    className={`flex-1 h-9 rounded-xl text-[11px] font-bold transition-colors ${paymentMethod === m ? 'bg-amber-500/10 border-amber-500/50 text-amber-600' : 'bg-muted/30 border-border/50 text-muted-foreground'} border`}>
                    {m === 'CASH' ? 'Tunai' : m === 'QR' ? 'QR Pay' : 'Transfer'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowComplete(false)}
                  className="flex-1 h-9 rounded-xl text-[11px] font-bold border border-border/50 hover:bg-muted/50 transition-colors">
                  Batal
                </button>
                <button onClick={() => updateStatus('COMPLETED')}
                  disabled={loading} className="flex-1 h-9 rounded-xl text-[11px] font-black text-white bg-green-500 hover:bg-green-600 transition-colors">
                  Sahkan Selesai
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Payment verification — for QR orders with uploaded receipt */}
        {order.payment_method === 'QR_ONLINE' && order.payment_receipt_url && !order.payment_verified_at && !order.payment_receipt_rejected && order.status !== 'CANCELLED' && (
          <div className="mt-3 p-3 rounded-2xl bg-blue-500/5 border border-blue-500/15 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
              <Image className="w-3.5 h-3.5" /> Resit Pembayaran
            </p>
            <a href={order.payment_receipt_url} target="_blank" rel="noopener noreferrer">
              <img src={order.payment_receipt_url} alt="Resit" className="w-full rounded-xl max-h-40 object-contain bg-white border border-border/30 cursor-pointer hover:opacity-80 transition-opacity" />
            </a>
            <div className="flex gap-2">
              <button onClick={async () => {
                  setLoading(true);
                  const now = new Date().toISOString();
                  const { error } = await supabase.from('polymart_orders').update({
                    payment_verified_at: now,
                    payment_verified_by: profile?.id,
                    status: 'CONFIRMED',
                    confirmed_at: now,
                    updated_at: now,
                  }).in('id', order.items.map(i => i.order_id));
                  if (error) {
                    toast.error('Gagal mengesahkan bayaran: ' + error.message);
                    setLoading(false);
                    return;
                  }
                  if (order.buyer?.id) {
                    await sendNotificationToUser(order.buyer.id, {
                      title: '✅ Bayaran Disahkan!',
                      message: `Bayaran untuk tempahan anda telah disahkan. Pesanan sedang diproses!`,
                      type: 'polymart_payment_verified',
                      module: 'POLYMART',
                      link: '/polymart/pesanan-saya',
                      reference_id: order.id,
                    });
                  }
                  toast.success('Bayaran berjaya disahkan!');
                  onUpdate();
                  setLoading(false);
                }} disabled={loading}
                className="flex-1 h-9 rounded-xl text-[11px] font-black text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-60">
                {loading ? '⏳ Memproses...' : '✅ Sahkan Bayaran'}
              </button>
              <button onClick={async () => {
                  setLoading(true);
                  const { error } = await supabase.from('polymart_orders').update({
                    payment_receipt_rejected: true,
                    updated_at: new Date().toISOString(),
                  }).in('id', order.items.map(i => i.order_id));
                  if (error) {
                    toast.error('Gagal menolak resit: ' + error.message);
                    setLoading(false);
                    return;
                  }
                  if (order.buyer?.id) {
                    await sendNotificationToUser(order.buyer.id, {
                      title: '⚠ Resit Ditolak',
                      message: `Resit pembayaran anda telah ditolak. Sila muat naik resit yang betul.`,
                      type: 'polymart_receipt_rejected',
                      module: 'POLYMART',
                      link: '/polymart/pesanan-saya',
                      reference_id: order.id,
                    });
                  }
                  toast.error('Resit ditolak');
                  onUpdate();
                  setLoading(false);
                }} disabled={loading}
                className="flex-1 h-9 rounded-xl text-[11px] font-black text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-colors disabled:opacity-60">
                {loading ? '⏳ Memproses...' : '❌ Tolak Resit'}
              </button>
            </div>
          </div>
        )}

        {/* If order is CANCELLED but has payment receipt, warn vendor to manually refund */}
        {order.status === 'CANCELLED' && order.payment_method === 'QR_ONLINE' && order.payment_receipt_url && (
          <div className="mt-3 p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" /> Amaran Jualan Batal (Ada Resit QR)
            </p>
            <p className="text-[10px] text-rose-500/80 leading-relaxed">
              Pesanan ini telah **DIBATALKAN**, tetapi sistem mengesan resit pembayaran telah dimuat naik oleh pelajar. Sila semak resit di bawah dan pulangkan wang secara manual sekiranya bayaran telah masuk.
            </p>
            <a href={order.payment_receipt_url} target="_blank" rel="noopener noreferrer">
              <img src={order.payment_receipt_url} alt="Resit" className="w-full rounded-xl max-h-40 object-contain bg-white border border-border/30 cursor-pointer hover:opacity-80 transition-opacity" />
            </a>
            
            {order.buyer?.phone && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const phone = order.buyer!.phone!.replace(/\D/g, '').replace(/^0/, '60');
                    const waMsg = encodeURIComponent(
                      `Hai ${order.buyer!.full_name}! Saya wakil kedai dari PolyMart. Mengenai pesanan anda yang terbatal bernilai RM${totalAmount.toFixed(2)}, boleh berikan butiran bank / nombor DuitNow anda untuk pemulangan wang (refund) manual? Terima kasih.`
                    );
                    window.open(`https://wa.me/${phone}?text=${waMsg}`, '_blank');
                  }}
                  className="w-full h-9 rounded-xl text-[10px] font-black bg-rose-500 text-white hover:bg-rose-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" /> Hubungi Pelajar (Tanya Akaun Bank)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Banners for QR Order Statuses */}
        {order.payment_method === 'QR_ONLINE' && order.payment_receipt_rejected && order.status !== 'CANCELLED' && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-black">
              Resit Ditolak (Menunggu pelajar memuat naik resit baharu...)
            </div>
          </div>
        )}

        {order.payment_method === 'QR_ONLINE' && !order.payment_receipt_url && !order.payment_verified_at && order.status !== 'CANCELLED' && (
          <div className="mt-3 p-3 rounded-2xl bg-muted/40 border border-border/50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0 animate-pulse" />
            <div className="text-[10px] text-muted-foreground font-black">
              Menunggu pembayaran / resit daripada pelajar...
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex gap-2">
          {order.status === 'PENDING' && order.payment_method === 'COD' && (
            <>
              <button onClick={() => updateStatus('CONFIRMED')} disabled={loading}
                className="flex-1 h-9 rounded-xl text-[11px] font-black text-white transition-all disabled:opacity-60"
                style={{ background: PM_GRADIENT }}>
                {loading ? '⏳...' : '✅ Sahkan'}
              </button>
              <button onClick={() => setShowCancel(true)} disabled={loading}
                className="flex-1 h-9 rounded-xl text-[11px] font-black text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-colors disabled:opacity-60">
                ❌ Tolak
              </button>
            </>
          )}
          {order.status === 'PENDING' && order.payment_method === 'QR_ONLINE' && (
            <button onClick={() => setShowCancel(true)} disabled={loading}
              className="flex-1 h-9 rounded-xl text-[11px] font-black text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 transition-colors disabled:opacity-60">
              ❌ Batalkan Pesanan
            </button>
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
          {order.status === 'READY' && !showComplete && (
            <button onClick={() => setShowComplete(true)} disabled={loading}
              className="flex-1 h-9 rounded-xl text-[11px] font-black text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              ✔️ Tandakan Selesai
            </button>
          )}
        </div>
      </div>
    </motion.div>

    {/* Borang Pengesahan Pulangan Wang (Refund Modal) */}
    <AnimatePresence>
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-rose-500/20 relative"
          >
            {/* Modal Header */}
            <div className="p-5 bg-rose-500/10 border-b border-rose-500/20">
              <h3 className="text-sm font-black text-rose-500 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 animate-pulse text-rose-500" /> Pengesahan Refund (Bayaran QR)
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Pesanan ini dibayar dengan **QR Online**. Anda wajib memulangkan wang pelajar secara manual sebelum meluluskan pembatalan.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Refund Details Card */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                  <span>Penerima:</span>
                  <span className="text-foreground font-black truncate max-w-[150px]">{order.buyer?.full_name ?? 'Pelajar'}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                  <span>No. Telefon:</span>
                  <span className="text-foreground font-black">{order.buyer?.phone ?? 'Tiada'}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/30">
                  <span className="text-xs font-black text-rose-500">JUMLAH REFUND:</span>
                  <span className="text-base font-black text-rose-500">RM {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Helper: WhatsApp Student */}
              {order.buyer?.phone && (
                <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Perlukan No. Akaun?</p>
                    <p className="text-[9px] text-muted-foreground leading-normal mt-0.5 truncate">
                      Hubungi pelajar di WhatsApp untuk butiran bank.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const phone = order.buyer!.phone!.replace(/\D/g, '').replace(/^0/, '60');
                      const waMsg = encodeURIComponent(
                        `Hai ${order.buyer!.full_name}! Saya wakil kedai dari PolyMart. Mengenai pembatalan pesanan anda berjumlah RM${totalAmount.toFixed(2)}, boleh berikan butiran bank / nombor DuitNow anda untuk proses pemulangan wang (refund)? Terima kasih.`
                      );
                      window.open(`https://wa.me/${phone}?text=${waMsg}`, '_blank');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-[10px] font-black hover:bg-emerald-600 transition-colors flex items-center gap-1 flex-shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                </div>
              )}

              {/* Input: Refund Reference */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                  Nota Rujukan / Cara Refund <span className="text-rose-500">*</span>
                </label>
                <input 
                  value={refundReference} 
                  onChange={e => setRefundReference(e.target.value)}
                  placeholder="Cth: MAE Instant Transfer / Tunai bersemuka"
                  className="w-full h-10 px-3 text-xs bg-muted/50 rounded-xl border border-border outline-none focus:border-rose-500/40" 
                />
              </div>

              {/* Checkbox confirmation */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input 
                  type="checkbox" 
                  checked={refundConfirmed} 
                  onChange={e => setRefundConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-rose-500 focus:ring-rose-500 mt-0.5" 
                />
                <span className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                  Saya mengesahkan wang sebanyak <strong className="text-foreground">RM {totalAmount.toFixed(2)}</strong> telah berjaya dipulangkan kepada pelajar.
                </span>
              </label>
            </div>

            {/* Modal Buttons */}
            <div className="p-4 border-t border-border/50 flex gap-2 bg-muted/20">
              <button 
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundConfirmed(false);
                  setRefundReference('');
                }} 
                className="flex-1 h-10 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/50 transition-colors border border-border/50"
              >
                Kembali
              </button>
              <button 
                disabled={loading || !refundConfirmed || !refundReference.trim()} 
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { error: rpcErr } = await supabase.rpc('vendor_handle_cancellation', {
                      p_order_id: order.id,
                      p_vendor_id: profile?.id,
                      p_action: 'approve',
                    });
                    if (rpcErr) throw rpcErr;

                    const fullReason = `${order.cancellation_reason || ''} [Sebab Batal] | Pemulangan Wang disahkan: ${refundReference}`;
                    await supabase.from('polymart_orders').update({
                      cancel_reason: fullReason
                    }).in('id', order.items.map(i => i.order_id));

                    if (order.buyer?.id) {
                      await sendNotificationToUser(order.buyer.id, {
                        title: '✅ Pembatalan & Refund Diluluskan',
                        message: `Tuntutan bayaran balik (refund) berjaya diproses. Nota: ${refundReference}`,
                        type: 'polymart_cancellation_approved',
                        module: 'POLYMART',
                        link: '/polymart/pesanan-saya',
                        reference_id: order.id,
                      });
                    }

                    toast.success('Pembatalan & pemulangan wang diluluskan!');
                    onUpdate();
                  } catch (e: any) {
                    toast.error(e.message || 'Gagal meluluskan pembatalan');
                  } finally {
                    setLoading(false);
                    setShowRefundModal(false);
                    setRefundConfirmed(false);
                    setRefundReference('');
                  }
                }}
                className="flex-1 h-10 rounded-xl text-xs font-black text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Luluskan & Refund'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </>
);
}

// ── Vendor Ads Tab ─────────────────────────────────────────────────────────────
function VendorAdsTab() {
  const { user } = useAuth();
  const [ads, setAds] = useState<PolyAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const loadAds = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('polymart_ads')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    setAds(data || []);
    setLoading(false);
  };

  useEffect(() => { loadAds(); }, [user]);

  const handleApply = async () => {
    if (!title.trim() || !imageFile) {
      toast.error('Sila isi tajuk dan berikan gambar banner'); return;
    }
    setSaving(true);
    try {
      const { compressImage } = await import('@/lib/imageCompression');
      const compressedFile = await compressImage(imageFile);
      
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${window.crypto.randomUUID()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from('polymart-ads')
        .upload(fileName, compressedFile, { contentType: compressedFile.type });
      
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('polymart-ads').getPublicUrl(fileName);

      const payload = {
        title,
        image_url: publicUrl,
        link_url: linkUrl || null,
        type: 'INTERNAL',
        status: 'DRAFT', // Mesti diluluskan Exco
        created_by: user?.id,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('polymart_ads').insert(payload);
      if (error) throw error;
      
      toast.success('Permohonan iklan dihantar! Sila tunggu kelulusan Exco.');
      setShowModal(false);
      setTitle(''); setLinkUrl(''); setImageFile(null);
      loadAds();
    } catch (e: any) {
      toast.error('Ralat: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between p-4 bg-white/5 border border-border/50 rounded-2xl">
        <div>
          <p className="text-sm font-black text-foreground">Permohonan Iklan (Promo)</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Iklan anda akan dipaparkan di halaman utama PolyMart selepas diluluskan.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="h-9 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-xl hover:scale-105 active:scale-95 whitespace-nowrap"
          style={{ background: PM_GRADIENT }}>
          + Mohon Iklan
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : ads.length === 0 ? (
        <div className="text-center py-10 opacity-50">
          <p className="text-xs font-bold">Tiada permohonan iklan lagi.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {ads.map(ad => (
            <div key={ad.id} className="flex gap-4 p-3 rounded-2xl border border-border/50 bg-card">
              <img src={ad.image_url} className="w-24 h-16 object-cover rounded-xl bg-muted shrink-0 border border-border/50" alt="" loading="lazy" decoding="async" />
              <div>
                <p className="text-sm font-black text-foreground">{ad.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest text-white uppercase ${
                    ad.status === 'ACTIVE' ? 'bg-emerald-500' : ad.status === 'DRAFT' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}>
                    {ad.status === 'DRAFT' ? 'Menunggu Kelulusan' : ad.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-amber-500" /> {ad.clicks} klik
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="p-5 space-y-4">
                <h3 className="text-lg font-black text-foreground">Permohonan Iklan</h3>
                <p className="text-xs text-muted-foreground leading-relaxed -mt-2">Promosikan produk anda di muka depan PolyMart! Iklan ini perlu diluluskan oleh Exco Keusahawanan.</p>
                
                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tajuk Promo</label>
                    <input value={title} onChange={e => setTitle(e.target.value)}
                      placeholder="Cth: Promosi Merdeka Diskaun 50%!"
                      className="w-full h-10 px-3 text-xs bg-muted/50 rounded-xl border border-border outline-none focus:border-amber-500/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pautan / Link (Jika ada)</label>
                    <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full h-10 px-3 text-xs bg-muted/50 rounded-xl border border-border outline-none focus:border-amber-500/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Banner Gambar (Nisbah 2.5:1)</label>
                    <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
                      className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-amber-500/10 file:text-amber-600 outline-none" />
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-border/50 flex gap-2 bg-muted/20">
                <button onClick={() => setShowModal(false)} className="flex-1 h-10 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/50 transition-colors border border-border/50">
                  Kembali
                </button>
                <button disabled={saving} onClick={handleApply}
                  className="flex-1 h-10 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: PM_GRADIENT }}>
                  {saving ? 'Hantar...' : 'Hantar Permohonan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function PolyMartVendorDashboard() {
  const { user } = useAuth();
  const { refetchCounts } = usePolymart();
  const navigate = useNavigate();

  const [orders,   setOrders]   = useState<VendorOrder[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'active' | 'all' | 'ads'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order');
    if (orderId) {
      setSearchQuery(orderId);
      setActiveTab('all');
    }
  }, []);

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
      .order('created_at', { ascending: false });

    setOrders((data ?? []) as unknown as VendorOrder[]);
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, [user]);

  const handleUpdate = () => { loadOrders(); refetchCounts(); };

  const pending   = orders.filter(o => o.status === 'PENDING');
  const active    = orders.filter(o => ['PENDING','CONFIRMED','READY'].includes(o.status));
  const today     = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const totalRev  = orders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + (o.total_price ?? o.unit_price * o.quantity), 0);

  const tabMap: Record<string, VendorOrder[]> = {
    all:       orders,
    active:    active,
    PENDING:   pending,
    CONFIRMED: orders.filter(o => o.status === 'CONFIRMED'),
    READY:     orders.filter(o => o.status === 'READY'),
    COMPLETED: orders.filter(o => o.status === 'COMPLETED'),
    CANCELLED: orders.filter(o => o.status === 'CANCELLED'),
  };
  
  let displayedRaw = tabMap[activeTab] ?? active;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayedRaw = displayedRaw.filter(o => 
      o.id.toLowerCase().includes(q) || 
      o.buyer?.full_name?.toLowerCase().includes(q) ||
      o.buyer?.matric_no?.toLowerCase().includes(q)
    );
  }

  const displayed = groupVendorOrders(displayedRaw);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-foreground">Dashboard Peniaga</h1>
          <p className="text-xs text-muted-foreground/60">Urus pesanan PolyMart anda</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/keusahawanan/pos/stats')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black text-white transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{ background: PM_GRADIENT }}>
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lihat Analitik</span>
            <span className="sm:hidden">Analitik</span>
          </button>
        </div>
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

      {/* Search Bar */}
      <div className="relative flex items-center h-10 px-3.5 rounded-2xl bg-muted/30 border border-border/50 hover:border-border focus-within:border-amber-500/50 focus-within:bg-muted/40 transition-all duration-300">
        <Search className="w-4 h-4 text-muted-foreground/45 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama pembeli, no. matrik, atau ID pesanan..."
          className="w-full h-full px-2.5 text-xs font-semibold outline-none bg-transparent text-foreground placeholder:text-muted-foreground/30"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              window.history.replaceState({}, '', '/polymart/vendor');
            }}
            className="w-5 h-5 rounded-full flex items-center justify-center bg-muted hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tab filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 border-b border-border/30 mb-2">
        {[
          { key: 'all', label: 'Semua', emoji: '📋' },
          { key: 'active', label: 'Aktif', emoji: '🔥' },
          { key: 'PENDING', label: 'Menunggu', emoji: '⏳' },
          { key: 'CONFIRMED', label: 'Disahkan', emoji: '✅' },
          { key: 'READY', label: 'Siap', emoji: '🎉' },
          { key: 'COMPLETED', label: 'Selesai', emoji: '⭐' },
          { key: 'CANCELLED', label: 'Batal', emoji: '❌' },
          { key: 'ads', label: 'Iklan', emoji: '🪧' },
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

      {searchQuery && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border border-border/50 rounded-xl">
          <p className="text-xs font-bold text-muted-foreground">Pencarian QR: {searchQuery.slice(0,8)}...</p>
          <button onClick={() => { setSearchQuery(''); window.history.replaceState({}, '', '/polymart/vendor'); }} 
            className="text-[10px] font-black text-rose-500 hover:underline">
            Kosongkan
          </button>
        </div>
      )}

      {activeTab === 'ads' ? (
        <VendorAdsTab />
      ) : (
        /* Orders list */
        loading ? (
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
        )
      )}
    </div>
  );
}

