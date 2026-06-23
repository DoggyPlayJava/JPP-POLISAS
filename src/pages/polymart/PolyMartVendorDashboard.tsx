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
  Package, CheckCircle, XCircle, Clock, Store,
  Phone, MessageCircle, ChevronDown, ChevronUp, AlertTriangle,
  TrendingUp, ShoppingBag, CreditCard, Handshake, Eye, Image,
  Search, X, Filter, Settings, Plus, Minus, Check, HelpCircle
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
    <div className="flex-1 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-md p-3.5 flex items-center gap-3 min-w-0 shadow-sm hover:border-amber-500/30 transition-all duration-300">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[18px] font-black text-foreground leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground/60 font-semibold mt-1 truncate">{label}</p>
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
function VendorOrderCard({
  order,
  onUpdate,
  isSelected = false,
  onToggleSelect = () => {},
  showCheckbox = false,
}: {
  order: GroupedVendorOrder;
  onUpdate: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}) {
  const { profile } = useAuth();
  const [expanded,    setExpanded]   = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel,  setShowCancel] = useState(false);
  const [showComplete,setShowComplete] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH'|'QR'|'TRANSFER'>('QR');
  const [loading,     setLoading]    = useState(false);
  
  // Modals/Overlays for clean anti-clutter actions
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const [refundReference, setRefundReference] = useState('');
  
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCancelRequestModal, setShowCancelRequestModal] = useState(false);

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

  const handleChatWithBuyer = () => {
    if (!order.buyer?.id || !order.business_id) return;
    window.dispatchEvent(
      new CustomEvent('open-polymart-chat', {
        detail: {
          businessId: order.business_id,
          buyerId: order.buyer.id
        }
      })
    );
  };

  const totalAmount = order.items.reduce((sum, i) => sum + i.total_price, 0);
  const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      <motion.div layout className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden hover:border-amber-500/20 transition-all duration-300 shadow-md">
        {/* Status bar */}
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: cfg.bg }}>
          {showCheckbox && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-4.5 h-4.5 rounded border-border text-amber-500 focus:ring-amber-500 mr-2 cursor-pointer accent-amber-500"
            />
          )}
          <span className="text-[11px] font-black" style={{ color: cfg.color }}>{cfg.label}</span>
          <span className="ml-auto text-[10px] text-muted-foreground/60 font-semibold">
            {new Date(order.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Buyer Info Header (Shopee Style) */}
          <div className="flex items-center gap-3 pb-3.5 border-b border-border/30">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-black text-muted-foreground uppercase border border-border/40 shrink-0">
              {order.buyer?.full_name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[12px] font-black text-foreground leading-tight truncate">{order.buyer?.full_name ?? 'Tidak diketahui'}</h4>
              <p className="text-[10px] text-muted-foreground/60 font-semibold mt-0.5">{order.buyer?.matric_no ?? 'Tiada No Matrik'}</p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {order.pickup_time && (
                <div className="px-2.5 py-1 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-1.5 text-[10px] font-black text-muted-foreground">
                  <Clock className="w-3 h-3 text-muted-foreground/60" /> {order.pickup_time}
                </div>
              )}
              
              {/* Native Chat Button */}
              <button 
                onClick={handleChatWithBuyer}
                title="Chat bersama pembeli"
                className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-white transition-all shadow-sm active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
              </button>

              {/* WhatsApp Button */}
              {order.share_phone && order.buyer?.phone && (
                <a 
                  href={`https://wa.me/${order.buyer.phone.replace(/\D/g, '').replace(/^0/, '60')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="WhatsApp pembeli"
                  className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-95"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}

              <button onClick={() => setExpanded(e => !e)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-muted/30 border border-border/30 hover:bg-muted/60 transition-colors">
                {expanded ? <ChevronUp className="w-4.5 h-4.5 text-muted-foreground" /> : <ChevronDown className="w-4.5 h-4.5 text-muted-foreground" />}
              </button>
            </div>
          </div>

          {/* Expanded buyer info */}
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="pb-3.5 border-b border-border/30 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-muted-foreground/80">No. Telefon Pelajar:</span>
                    <span className="text-foreground font-black">{order.buyer?.phone ?? 'Tidak dikongsi'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-muted-foreground/80">ID Pesanan:</span>
                    <span className="text-foreground font-mono text-[9px] font-black">{order.id}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Products List */}
          <div className="space-y-2.5">
            {order.items.map(item => {
              const emoji = CATEGORY_EMOJI[item.category] ?? '📦';
              return (
                <div key={item.order_id} className="flex gap-3 py-2 border-b border-border/30 last:border-0 last:pb-0 first:pt-0">
                  <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-muted flex items-center justify-center text-xl border border-border/40">
                    {item.image_url
                      ? <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : emoji
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[12px] font-black text-foreground truncate">{item.name}</p>
                      {item.selected_variation && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[8px] font-black text-amber-500 uppercase">
                          {item.selected_variation}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground/75 font-bold mt-0.5">RM {item.unit_price.toFixed(2)} × {item.quantity}</p>
                    
                    {item.note && (
                      <div className="mt-1 px-2.5 py-1.5 rounded-xl bg-muted/40 border border-border/20 text-[10px] text-muted-foreground leading-snug">
                        <span className="font-bold text-amber-600 dark:text-amber-400">Nota: </span>
                        {item.note}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-black text-foreground">RM {item.total_price.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Price Row */}
          <div className="flex justify-between items-center pt-3 border-t border-border/30">
            <div className="flex items-center gap-2">
              {order.payment_method && (
                <span className={`flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full ${
                  order.payment_method === 'QR_ONLINE' 
                    ? 'bg-blue-500/10 border border-blue-500/20 text-blue-500' 
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-600'
                }`}>
                  {order.payment_method === 'QR_ONLINE' ? <CreditCard className="w-3 h-3" /> : <Handshake className="w-3 h-3" />}
                  {order.payment_method === 'QR_ONLINE' ? 'QR Online' : 'COD'}
                  {order.payment_verified_at ? ' (Sah)' : ''}
                </span>
              )}

              {/* Status Indicator for QR with receipt awaiting verification */}
              {order.payment_method === 'QR_ONLINE' && order.payment_receipt_url && !order.payment_verified_at && !order.payment_receipt_rejected && order.status !== 'CANCELLED' && (
                <button
                  onClick={() => setShowReceiptModal(true)}
                  className="px-2.5 py-1 rounded-full bg-blue-500 text-white text-[9px] font-black hover:bg-blue-600 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Eye className="w-3 h-3" /> Sahkan Bayaran
                </button>
              )}

              {/* Verified receipt view button */}
              {order.payment_method === 'QR_ONLINE' && order.payment_receipt_url && order.payment_verified_at && (
                <button 
                  onClick={() => setShowReceiptModal(true)}
                  className="px-2.5 py-1 rounded-full bg-muted/40 border border-border/50 text-muted-foreground hover:bg-muted/70 text-[9px] font-black flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3 h-3" /> Resit
                </button>
              )}
            </div>
            
            <div className="text-right flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-bold">Jumlah ({totalQty} unit):</span>
              <span className="text-sm font-black text-amber-500">RM {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Alert banners placed neatly */}
          {order.cancellation_requested_at && order.status !== 'CANCELLED' && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black text-rose-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Pembeli Minta Batal
                </p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{order.cancellation_reason}</p>
              </div>
              <button
                onClick={() => setShowCancelRequestModal(true)}
                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] rounded-xl transition-all shrink-0 shadow-sm active:scale-95"
              >
                Urus Permintaan
              </button>
            </div>
          )}

          {/* Cancellation Alert for QR code manual refund warning */}
          {order.status === 'CANCELLED' && order.payment_method === 'QR_ONLINE' && order.payment_receipt_url && (
            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse shrink-0" /> Alert Pulangan Wang (QR)
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Jualan dibatalkan tetapi resit dikesan. Sila buat pemulangan manual.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReceiptModal(true)}
                  className="flex-1 h-8 rounded-xl bg-muted/40 hover:bg-muted text-[10px] font-bold text-muted-foreground flex items-center justify-center gap-1 border border-border/40 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Semak Resit
                </button>
                {order.buyer?.phone && (
                  <button
                    onClick={() => {
                      const phone = order.buyer!.phone!.replace(/\D/g, '').replace(/^0/, '60');
                      const waMsg = encodeURIComponent(
                        `Hai ${order.buyer!.full_name}! Mengenai pesanan anda berjumlah RM${totalAmount.toFixed(2)} yang terbatal di PolyMart, boleh berikan no. akaun DuitNow untuk refund? Terima kasih.`
                      );
                      window.open(`https://wa.me/${phone}?text=${waMsg}`, '_blank');
                    }}
                    className="flex-1 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[10px] font-black transition-colors flex items-center justify-center gap-1 border border-rose-500/20"
                  >
                    <Phone className="w-3.5 h-3.5" /> Hubungi WhatsApp
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Unpaid / Waiting for Receipt Warning */}
          {order.payment_method === 'QR_ONLINE' && !order.payment_receipt_url && !order.payment_verified_at && order.status !== 'CANCELLED' && (
            <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center gap-2 text-[10px] text-muted-foreground font-semibold">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0 animate-pulse" />
              <span>Menunggu pembayaran / resit daripada pelajar...</span>
            </div>
          )}

          {order.payment_method === 'QR_ONLINE' && order.payment_receipt_rejected && order.status !== 'CANCELLED' && (
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-center gap-2 text-[10px] text-amber-500 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Resit ditolak. Menunggu pelajar memuat naik resit baharu...</span>
            </div>
          )}

          {/* Action buttons list */}
          <div className="flex gap-2">
            {order.status === 'PENDING' && order.payment_method === 'COD' && (
              <>
                <button onClick={() => updateStatus('CONFIRMED')} disabled={loading}
                  className="flex-1 h-9 rounded-xl text-[11px] font-black text-white transition-all disabled:opacity-60 shadow-sm hover:scale-[1.02] active:scale-95"
                  style={{ background: PM_GRADIENT }}>
                  {loading ? '⏳...' : '✅ Sahkan'}
                </button>
                <button onClick={() => setShowCancel(true)} disabled={loading}
                  className="flex-1 h-9 rounded-xl text-[11px] font-black text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors disabled:opacity-60">
                  ❌ Tolak
                </button>
              </>
            )}
            {order.status === 'PENDING' && order.payment_method === 'QR_ONLINE' && (
              <button onClick={() => setShowCancel(true)} disabled={loading}
                className="flex-1 h-9 rounded-xl text-[11px] font-black text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 transition-colors disabled:opacity-60">
                ❌ Batalkan Pesanan
              </button>
            )}
            {order.status === 'CONFIRMED' && (
              <>
                <button onClick={() => updateStatus('READY')} disabled={loading}
                  className="flex-1 h-9 rounded-xl text-[11px] font-black text-white transition-all disabled:opacity-60 shadow-sm hover:scale-[1.02] active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                  🎉 Siap Diambil
                </button>
                <button onClick={() => setShowCancel(true)} disabled={loading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors">
                  <XCircle className="w-4 h-4 text-rose-500" />
                </button>
              </>
            )}
            {order.status === 'READY' && !showComplete && (
              <button onClick={() => setShowComplete(true)} disabled={loading}
                className="flex-1 h-9 rounded-xl text-[11px] font-black text-white transition-all disabled:opacity-60 shadow-sm hover:scale-[1.02] active:scale-95"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                ✔️ Tandakan Selesai
              </button>
            )}
          </div>

          {/* Cancellation Forms */}
          <AnimatePresence>
            {showCancel && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="pt-3 border-t border-border/30 space-y-2">
                <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  placeholder="Nyatakan sebab pembatalan..."
                  className="w-full h-9.5 px-3 rounded-xl text-xs outline-none bg-muted/40 border border-border/50 text-foreground placeholder:text-muted-foreground/45" />
                <div className="flex gap-2">
                  <button onClick={() => setShowCancel(false)}
                    className="flex-1 h-8 rounded-xl text-[11px] font-bold border border-border hover:bg-muted/40 transition-colors">
                    Batal
                  </button>
                  <button onClick={() => updateStatus('CANCELLED', { cancel_reason: cancelReason })}
                    disabled={loading} className="flex-1 h-8 rounded-xl text-[11px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/25 hover:bg-rose-500/20 transition-colors">
                    Sahkan Batal
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Completion Form */}
          <AnimatePresence>
            {showComplete && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="pt-3 border-t border-border/30 space-y-3">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Sahkan Cara Bayaran Sebenar</p>
                <div className="flex gap-2">
                  {['CASH', 'QR', 'TRANSFER'].map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m as any)}
                      className={`flex-1 h-8.5 rounded-xl text-[10px] font-bold transition-all ${paymentMethod === m ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 font-black' : 'bg-muted/20 border-border/50 text-muted-foreground'} border`}>
                      {m === 'CASH' ? 'Tunai' : m === 'QR' ? 'QR Pay' : 'Transfer'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowComplete(false)}
                    className="flex-1 h-8 rounded-xl text-[11px] font-bold border border-border hover:bg-muted/40 transition-colors">
                    Batal
                  </button>
                  <button onClick={() => updateStatus('COMPLETED')}
                    disabled={loading} className="flex-1 h-8 rounded-xl text-[11px] font-black text-white bg-green-500 hover:bg-green-600 transition-colors shadow-sm">
                    Sahkan Selesai
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Modal 1: Resit / Verify Payment Overlay ── */}
      <AnimatePresence>
        {showReceiptModal && order.payment_receipt_url && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-border/40 relative"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-border/30 flex items-center justify-between bg-muted/20">
                <h3 className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <CreditCard className="w-4.5 h-4.5 text-blue-500" /> Resit Pembayaran QR
                </h3>
                <button onClick={() => setShowReceiptModal(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-rose-500/10 hover:text-rose-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-4">
                <a href={order.payment_receipt_url} target="_blank" rel="noopener noreferrer" className="block group relative rounded-xl overflow-hidden border border-border bg-white">
                  <img src={order.payment_receipt_url} alt="Resit" className="w-full max-h-72 object-contain bg-white mx-auto cursor-zoom-in group-hover:opacity-90 transition-opacity" />
                  <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-[8px] text-white font-black flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> ZOOM
                  </div>
                </a>

                {/* If verified already */}
                {order.payment_verified_at && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-[10px] text-emerald-500 font-black flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4.5 h-4.5" /> Pembayaran Telah Disahkan!
                    </p>
                  </div>
                )}

                {/* Verification Actions */}
                {!order.payment_verified_at && !order.payment_receipt_rejected && order.status !== 'CANCELLED' && (
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
                          toast.error('Gagal mengesahkan: ' + error.message);
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
                        toast.success('Bayaran disahkan!');
                        setShowReceiptModal(false);
                        onUpdate();
                        setLoading(false);
                      }} disabled={loading}
                      className="flex-1 h-9 rounded-xl text-[11px] font-black text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      Sah Bayaran
                    </button>
                    <button onClick={async () => {
                        setLoading(true);
                        const { error } = await supabase.from('polymart_orders').update({
                          payment_receipt_rejected: true,
                          updated_at: new Date().toISOString(),
                        }).in('id', order.items.map(i => i.order_id));

                        if (error) {
                          toast.error('Gagal menolak: ' + error.message);
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
                        setShowReceiptModal(false);
                        onUpdate();
                        setLoading(false);
                      }} disabled={loading}
                      className="flex-1 h-9 rounded-xl text-[11px] font-black text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors disabled:opacity-50"
                    >
                      Tolak Resit
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal 2: Refund Confirmation Overlay ── */}
      <AnimatePresence>
        {showRefundModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-rose-500/20 relative"
            >
              <div className="p-4 bg-rose-500/10 border-b border-rose-500/20">
                <h3 className="text-xs font-black text-rose-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-5 h-5 animate-pulse text-rose-500" /> Pengesahan Refund (Bayaran QR)
                </h3>
                <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                  Sila pulangkan wang sebanyak <strong>RM {totalAmount.toFixed(2)}</strong> kepada pelajar terlebih dahulu.
                </p>
              </div>

              <div className="p-4 space-y-3.5">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 text-[10px] space-y-1.5">
                  <div className="flex justify-between font-bold text-muted-foreground">
                    <span>Penerima:</span>
                    <span className="text-foreground font-black truncate max-w-[150px]">{order.buyer?.full_name ?? 'Pelajar'}</span>
                  </div>
                  <div className="flex justify-between font-bold text-muted-foreground">
                    <span>Telefon:</span>
                    <span className="text-foreground font-black">{order.buyer?.phone ?? 'Tiada'}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border/30">
                    <span className="font-black text-rose-500">JUMLAH PULANGAN:</span>
                    <span className="text-sm font-black text-rose-500">RM {totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {order.buyer?.phone && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between gap-3">
                    <p className="text-[9px] text-muted-foreground leading-normal min-w-0 flex-1">
                      Perlukan maklumat bank? Hubungi WhatsApp pelajar.
                    </p>
                    <button
                      onClick={() => {
                        const phone = order.buyer!.phone!.replace(/\D/g, '').replace(/^0/, '60');
                        const waMsg = encodeURIComponent(
                          `Hai ${order.buyer!.full_name}! Mengenai pembatalan pesanan anda berjumlah RM${totalAmount.toFixed(2)} di PolyMart, boleh berikan butiran bank / nombor DuitNow untuk refund? Terima kasih.`
                        );
                        window.open(`https://wa.me/${phone}?text=${waMsg}`, '_blank');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-[9px] font-black hover:bg-emerald-600 transition-colors flex items-center gap-1 shrink-0 shadow-sm"
                    >
                      <Phone className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">
                    Kaedah / Rujukan Refund <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    value={refundReference} 
                    onChange={e => setRefundReference(e.target.value)}
                    placeholder="Cth: DuitNow Transfer / MAE / Tunai"
                    className="w-full h-9.5 px-3 text-xs bg-muted/50 rounded-xl border border-border outline-none focus:border-rose-500/30 text-foreground" 
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={refundConfirmed} 
                    onChange={e => setRefundConfirmed(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-rose-500 focus:ring-rose-500 mt-0.5 accent-rose-500" 
                  />
                  <span className="text-[10px] font-medium text-muted-foreground/80 leading-normal">
                    Saya mengesahkan wang sebanyak <strong>RM {totalAmount.toFixed(2)}</strong> telah dipulangkan.
                  </span>
                </label>
              </div>

              <div className="p-3 border-t border-border/40 flex gap-2 bg-muted/20">
                <button 
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundConfirmed(false);
                    setRefundReference('');
                  }} 
                  className="flex-1 h-9 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/40 transition-colors border border-border/50"
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

                      const fullReason = `${order.cancellation_reason || ''} [Batal] | Refund Sah: ${refundReference}`;
                      await supabase.from('polymart_orders').update({
                        cancel_reason: fullReason
                      }).in('id', order.items.map(i => i.order_id));

                      if (order.buyer?.id) {
                        await sendNotificationToUser(order.buyer.id, {
                          title: '✅ Pembatalan & Refund Diluluskan',
                          message: `Tuntutan bayaran balik (refund) berjaya diproses. Rujukan: ${refundReference}`,
                          type: 'polymart_cancellation_approved',
                          module: 'POLYMART',
                          link: '/polymart/pesanan-saya',
                          reference_id: order.id,
                        });
                      }

                      toast.success('Pembatalan & refund diluluskan!');
                      setShowRefundModal(false);
                      setShowCancelRequestModal(false);
                      onUpdate();
                    } catch (e: any) {
                      toast.error(e.message || 'Gagal memproses');
                    } finally {
                      setLoading(false);
                      setRefundConfirmed(false);
                      setRefundReference('');
                    }
                  }}
                  className="flex-1 h-9 rounded-xl text-xs font-black text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50"
                >
                  Sahkan & Refund
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal 3: Cancellation Request Action overlay ── */}
      <AnimatePresence>
        {showCancelRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-border/40 relative"
            >
              <div className="p-4 border-b border-border/30 flex items-center justify-between">
                <h3 className="text-xs font-black text-rose-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-4.5 h-4.5" /> Permintaan Batal Pesanan
                </h3>
                <button onClick={() => setShowCancelRequestModal(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-rose-500/10 hover:text-rose-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3.5">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 text-[10px] space-y-1.5">
                  <p className="font-bold text-muted-foreground">SEBAB PERMINTAAN:</p>
                  <p className="text-foreground font-black italic">"{order.cancellation_reason || 'Tiada'}"</p>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
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
                        setShowCancelRequestModal(false);
                        onUpdate();
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="flex-1 h-9 rounded-xl text-[11px] font-black text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    Luluskan Batal
                  </button>
                  
                  <button 
                    onClick={async () => {
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
                      toast.success('Pembatalan ditolak');
                      setShowCancelRequestModal(false);
                      onUpdate();
                      setLoading(false);
                    }}
                    disabled={loading}
                    className="flex-1 h-9 rounded-xl text-[11px] font-black border border-border/50 hover:bg-muted/40 transition-colors disabled:opacity-50"
                  >
                    Tolak Permintaan
                  </button>
                </div>
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
        status: 'DRAFT',
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
      <div className="flex items-center justify-between p-4 bg-white/5 border border-border/30 rounded-2xl">
        <div>
          <p className="text-xs font-black text-foreground">Permohonan Iklan (Promo)</p>
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
        <div className="text-center py-10 opacity-50 bg-card/20 rounded-2xl border border-border/30">
          <p className="text-xs font-bold text-muted-foreground">Tiada permohonan iklan lagi.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {ads.map(ad => (
            <div key={ad.id} className="flex gap-4 p-3 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-md">
              <img src={ad.image_url} className="w-24 h-16 object-cover rounded-xl bg-muted shrink-0 border border-border/30" alt="" loading="lazy" />
              <div>
                <p className="text-xs font-black text-foreground">{ad.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest text-white uppercase ${
                    ad.status === 'ACTIVE' ? 'bg-emerald-500' : ad.status === 'DRAFT' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}>
                    {ad.status === 'DRAFT' ? 'Menunggu Kelulusan' : ad.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold">
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
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-border/40 relative">
              <div className="p-5 space-y-4">
                <h3 className="text-xs font-black text-foreground uppercase tracking-widest">Permohonan Iklan</h3>
                <p className="text-[11px] text-muted-foreground leading-normal -mt-2">Promosikan produk anda di muka depan PolyMart! Iklan ini memerlukan kelulusan Exco Keusahawanan.</p>
                
                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Tajuk Promo</label>
                    <input value={title} onChange={e => setTitle(e.target.value)}
                      placeholder="Cth: Promosi Nasi Lemak Diskaun 50%!"
                      className="w-full h-9.5 px-3 text-xs bg-muted/40 rounded-xl border border-border/50 outline-none focus:border-amber-500/50 text-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pautan / Link (Jika ada)</label>
                    <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full h-9.5 px-3 text-xs bg-muted/40 rounded-xl border border-border/50 outline-none focus:border-amber-500/50 text-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Banner Gambar (Nisbah 2.5:1)</label>
                    <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
                      className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-amber-500/10 file:text-amber-600 outline-none text-foreground" />
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-border/40 flex gap-2 bg-muted/20">
                <button onClick={() => setShowModal(false)} className="flex-1 h-9 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/40 transition-colors border border-border/50">
                  Kembali
                </button>
                <button disabled={saving} onClick={handleApply}
                  className="flex-1 h-9 rounded-xl text-xs font-black text-white transition-all disabled:opacity-50"
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
  
  // Tabs System
  const [activeMainTab, setActiveMainTab] = useState<'orders' | 'products' | 'ads'>('orders');
  
  // Orders Sub-tabs
  // actions = awaiting actions (PENDING)
  // processing = CONFIRMED + READY
  // completed = COMPLETED
  // all = all orders
  const [activeOrderTab, setActiveOrderTab] = useState<'actions' | 'processing' | 'completed' | 'all'>('actions');
  
  // Inner Pending Groups
  // all_actions = all pending
  // unpaid = pending + qr + no receipt
  // verification = pending + (cod or qr+uploaded)
  const [activeActionSubTab, setActiveActionSubTab] = useState<'all_actions' | 'unpaid' | 'verification'>('all_actions');

  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Dropdown states
  const [myBusinesses, setMyBusinesses] = useState<{ id: string; name: string; is_active: boolean }[]>([]);
  const [selectedBizId, setSelectedBizId] = useState<string>(() => localStorage.getItem('polymart_vendor_selected_biz') || 'all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedVariation, setSelectedVariation] = useState<string>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Product stock management states
  const [bizProducts, setBizProducts] = useState<any[]>([]);
  const [fetchingProducts, setFetchingProducts] = useState(false);
  const [editingVarStock, setEditingVarStock] = useState<{ productId: string, varName: string, value: string } | null>(null);
  const [editingBaseStock, setEditingBaseStock] = useState<{ productId: string, value: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order');
    if (orderId) {
      setSearchQuery(orderId);
      setActiveMainTab('orders');
      setActiveOrderTab('all');
    }
  }, []);

  const handleBizChange = (id: string) => {
    setSelectedBizId(id);
    localStorage.setItem('polymart_vendor_selected_biz', id);
    setSelectedDateFilter('all');
    setSelectedCategory('all');
    setSelectedProduct('all');
    setSelectedVariation('all');
    setSelectedOrderIds([]);
  };

  const handleDateChange = (date: string) => {
    setSelectedDateFilter(date);
    setSelectedCategory('all');
    setSelectedProduct('all');
    setSelectedVariation('all');
    setSelectedOrderIds([]);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedProduct('all');
    setSelectedVariation('all');
    setSelectedOrderIds([]);
  };

  const handleProductChange = (prod: string) => {
    setSelectedProduct(prod);
    setSelectedVariation('all');
    setSelectedOrderIds([]);
  };

  useEffect(() => {
    setSelectedOrderIds([]);
  }, [activeOrderTab, activeActionSubTab]);

  const loadOrders = async () => {
    if (!user) return;
    
    // Get all businesses where user is owner or member
    const [businessesRes, memberBizRes] = await Promise.all([
      supabase
        .from('keusahawanan_businesses')
        .select('id, name, is_active')
        .eq('owner_id', user.id)
        .eq('status', 'ACTIVE'),
      supabase
        .from('student_business_memberships')
        .select('business_id, business:keusahawanan_businesses(id, name, is_active)')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
    ]);

    const bizList: { id: string; name: string; is_active: boolean }[] = [];
    const seen = new Set<string>();

    if (businessesRes.data) {
      businessesRes.data.forEach(b => {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          bizList.push({ id: b.id, name: b.name, is_active: b.is_active });
        }
      });
    }
    if (memberBizRes.data) {
      memberBizRes.data.forEach(m => {
        const b = m.business as any;
        if (b && !seen.has(b.id)) {
          seen.add(b.id);
          bizList.push({ id: b.id, name: b.name, is_active: b.is_active });
        }
      });
    }

    setMyBusinesses(bizList);

    const ids = bizList.map(b => b.id);
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

  const loadBizProducts = async () => {
    if (selectedBizId === 'all') return;
    setFetchingProducts(true);
    const { data, error } = await supabase
      .from('business_products')
      .select('id, name, price, image_url, category, is_available, variations, stock_quantity, reserved_stock')
      .eq('business_id', selectedBizId)
      .order('name');
    if (!error) setBizProducts(data || []);
    setFetchingProducts(false);
  };

  useEffect(() => { loadOrders(); }, [user]);

  useEffect(() => {
    if (activeMainTab === 'products') {
      loadBizProducts();
    }
  }, [activeMainTab, selectedBizId]);

  const handleUpdate = () => { loadOrders(); refetchCounts(); if (activeMainTab === 'products') loadBizProducts(); };

  const handleToggleStoreStatus = async (bizId: string, currentStatus: boolean) => {
    setLoading(true);
    const { error } = await supabase
      .from('keusahawanan_businesses')
      .update({ is_active: !currentStatus })
      .eq('id', bizId);
    
    if (error) {
      toast.error('Gagal menukar status kedai: ' + error.message);
    } else {
      toast.success(`Kedai ${!currentStatus ? 'dibuka!' : 'ditutup!'}`);
      loadOrders();
    }
    setLoading(false);
  };

  const toggleProductAvailability = async (prodId: string, current: boolean) => {
    setBizProducts(prev => prev.map(p => p.id === prodId ? { ...p, is_available: !current } : p));
    const { error } = await supabase
      .from('business_products')
      .update({ is_available: !current })
      .eq('id', prodId);
    if (error) {
      toast.error('Ralat mengemaskini status ketersediaan');
      loadBizProducts();
    } else {
      toast.success('Status ketersediaan berjaya dikemaskini');
    }
  };

  const handleSaveVariationStock = async (prodId: string, variations: any[], varName: string, valueStr: string) => {
    const newVal = parseInt(valueStr);
    if (isNaN(newVal) || newVal < 0) {
      toast.error('Masukkan kuantiti stok yang sah!'); return;
    }
    const updatedVariations = variations.map(v => v.name === varName ? { ...v, stock: newVal } : v);
    setBizProducts(prev => prev.map(p => p.id === prodId ? { ...p, variations: updatedVariations } : p));
    const { error } = await supabase
      .from('business_products')
      .update({ variations: updatedVariations })
      .eq('id', prodId);
    if (error) {
      toast.error('Gagal kemaskini stok variasi');
      loadBizProducts();
    } else {
      toast.success('Stok variasi dikemaskini');
      setEditingVarStock(null);
    }
  };

  const handleSaveBaseStock = async (prodId: string, valueStr: string) => {
    const newVal = parseInt(valueStr);
    if (isNaN(newVal) || newVal < 0) {
      toast.error('Masukkan kuantiti stok yang sah!'); return;
    }
    setBizProducts(prev => prev.map(p => p.id === prodId ? { ...p, stock_quantity: newVal } : p));
    const { error } = await supabase
      .from('business_products')
      .update({ stock_quantity: newVal })
      .eq('id', prodId);
    if (error) {
      toast.error('Gagal kemaskini stok produk');
      loadBizProducts();
    } else {
      toast.success('Stok produk dikemaskini');
      setEditingBaseStock(null);
    }
  };

  // ── Filters & Tab Computations ──────────────────────────────────────────
  
  // 1. Business Filter
  let filteredByBiz = orders;
  if (selectedBizId !== 'all') {
    filteredByBiz = orders.filter(o => o.business_id === selectedBizId);
  }

  const currentBiz = myBusinesses.find(b => b.id === selectedBizId);

  // 2. Date Filter
  let filteredByDate = filteredByBiz;
  if (selectedDateFilter !== 'all') {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    const threeDaysAgoStart = new Date(todayStart);
    threeDaysAgoStart.setDate(threeDaysAgoStart.getDate() - 2);
    const sevenDaysAgoStart = new Date(todayStart);
    sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 6);

    filteredByDate = filteredByBiz.filter(o => {
      const oDate = new Date(o.created_at);
      if (selectedDateFilter === 'today') return oDate >= todayStart;
      if (selectedDateFilter === 'yesterday') return oDate >= yesterdayStart && oDate < yesterdayEnd;
      if (selectedDateFilter === '3days') return oDate >= threeDaysAgoStart;
      if (selectedDateFilter === '7days') return oDate >= sevenDaysAgoStart;
      return true;
    });
  }

  // 3. Extract and filter Category options
  const availableCategories = ['all', ...new Set(filteredByDate.map(o => o.business_products?.category).filter(Boolean))];

  let filteredByCategory = filteredByDate;
  if (selectedCategory !== 'all') {
    filteredByCategory = filteredByDate.filter(o => o.business_products?.category === selectedCategory);
  }
  const availableProducts = ['all', ...new Set(filteredByCategory.map(o => o.business_products?.name).filter(Boolean))];

  let filteredByProduct = filteredByCategory;
  if (selectedProduct !== 'all') {
    filteredByProduct = filteredByCategory.filter(o => o.business_products?.name === selectedProduct);
  }
  const availableVariations = ['all', ...new Set(filteredByProduct.map(o => o.selected_variation).filter(Boolean))];

  // 4. Final filtered orders
  let finalFiltered = filteredByProduct;
  if (selectedVariation !== 'all') {
    finalFiltered = finalFiltered.filter(o => o.selected_variation === selectedVariation);
  }

  // 5. Split Tab logic
  const todayOrders = finalFiltered.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const activeOrders = finalFiltered.filter(o => ['PENDING','CONFIRMED','READY'].includes(o.status));
  const totalRev = finalFiltered.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + (o.total_price ?? o.unit_price * o.quantity), 0);

  // Sub-groups for Actions Required
  const unpaid = finalFiltered.filter(o => 
    o.status === 'PENDING' && 
    o.payment_method === 'QR_ONLINE' && 
    (!o.payment_receipt_url || o.payment_receipt_rejected)
  );
  
  const awaitingVerification = finalFiltered.filter(o => 
    o.status === 'PENDING' && (
      o.payment_method === 'COD' || 
      (o.payment_method === 'QR_ONLINE' && o.payment_receipt_url && !o.payment_verified_at && !o.payment_receipt_rejected)
    )
  );

  const actionsRequired = finalFiltered.filter(o => o.status === 'PENDING');
  const processing = finalFiltered.filter(o => ['CONFIRMED', 'READY'].includes(o.status));
  const completed = finalFiltered.filter(o => o.status === 'COMPLETED');

  // Mapping sub-tabs of Actions Required
  const actionTabMap = {
    all_actions: actionsRequired,
    unpaid: unpaid,
    verification: awaitingVerification
  };

  const orderTabMap = {
    actions: actionTabMap[activeActionSubTab],
    processing: processing,
    completed: completed,
    all: finalFiltered
  };
  
  let displayedRaw = orderTabMap[activeOrderTab] || actionsRequired;

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayedRaw = displayedRaw.filter(o => 
      o.id.toLowerCase().includes(q) || 
      o.buyer?.full_name?.toLowerCase().includes(q) ||
      o.buyer?.matric_no?.toLowerCase().includes(q)
    );
  }

  const displayed = groupVendorOrders(displayedRaw);

  // 6. Bulk verify totals
  const totalAwaitingVerificationSum = displayed.reduce((sum, order) => {
    if (order.status === 'PENDING' && (order.payment_method === 'COD' || (order.payment_method === 'QR_ONLINE' && order.payment_receipt_url && !order.payment_verified_at))) {
      const orderTotal = order.items.reduce((s, item) => s + item.total_price, 0);
      return sum + orderTotal;
    }
    return sum;
  }, 0);

  const selectedOrdersSum = displayed.reduce((sum, order) => {
    if (selectedOrderIds.includes(order.id)) {
      const orderTotal = order.items.reduce((s, item) => s + item.total_price, 0);
      return sum + orderTotal;
    }
    return sum;
  }, 0);

  const handleBulkApprove = async () => {
    if (selectedOrderIds.length === 0) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const selectedGroups = displayed.filter(o => selectedOrderIds.includes(o.id));
      const allItemOrderIds = selectedGroups.flatMap(g => g.items.map(item => item.order_id));
      
      if (allItemOrderIds.length === 0) {
        toast.error('Tiada pesanan terpilih');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('polymart_orders')
        .update({
          status: 'CONFIRMED',
          payment_verified_at: now,
          payment_verified_by: user?.id,
          confirmed_at: now,
          updated_at: now
        })
        .in('id', allItemOrderIds);

      if (error) throw error;

      await Promise.all(selectedGroups.map(async (group) => {
        const buyerId = group.buyer?.id;
        if (buyerId) {
          const itemsDesc = group.items.map(i => `${i.quantity}x ${i.name}${i.selected_variation ? ` (${i.selected_variation})` : ''}`).join(', ');
          
          await sendNotificationToUser(buyerId, {
            title: '✅ Bayaran Disahkan!',
            message: `Bayaran untuk tempahan anda telah disahkan secara pukal. Pesanan sedang diproses! Sedia pada: ${group.pickup_time ?? 'TBA'}`,
            type: 'polymart_payment_verified',
            module: 'POLYMART',
            link: '/polymart/pesanan-saya',
            reference_id: group.id
          });

          if (group.share_phone && group.buyer?.phone) {
            const phone = group.buyer.phone.replace(/\D/g, '').replace(/^0/, '60');
            const waMsg = encodeURIComponent(`Hai ${group.buyer.full_name}! Pesanan anda di PolyMart sudah kami sahkan 🎉\n\n📦 ${itemsDesc}\n⏰ Ambil: ${group.pickup_time ?? 'TBA'}\n\nTerima kasih!`);
            const waUrl = `https://wa.me/${phone}?text=${waMsg}`;
            window.open(waUrl, '_blank');
          }
        }
      }));

      toast.success(`Berjaya mengesahkan ${allItemOrderIds.length} pesanan secara pukal!`);
      setSelectedOrderIds([]);
      handleUpdate();
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal mengesahkan secara pukal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-foreground">Dashboard Peniaga</h1>
          <p className="text-xs text-muted-foreground/60">Urus pesanan & stok produk PolyMart anda</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/keusahawanan/pos/stats')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black text-white transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{ background: PM_GRADIENT }}>
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Lihat Analitik POS</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard label="Pesanan Hari Ini" value={todayOrders.length} icon={ShoppingBag} color={PM_ACCENT} />
        <StatCard label="Menunggu Sahkan"  value={awaitingVerification.length} icon={Clock} color="#f97316" />
        <StatCard label="Aktif Sekarang"   value={activeOrders.length} icon={Package} color="#6366f1" />
        <StatCard label="Hasil Selesai"    value={`RM ${totalRev.toFixed(0)}`} icon={TrendingUp} color="#22c55e" />
      </motion.div>

      {/* Main Tab Switcher */}
      <div className="flex border-b border-border/30 bg-muted/20 p-1 rounded-2xl">
        <button 
          onClick={() => setActiveMainTab('orders')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'orders' ? 'bg-card text-amber-500 shadow-sm border border-border/40' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Urus Pesanan
        </button>
        <button 
          onClick={() => setActiveMainTab('products')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'products' ? 'bg-card text-amber-500 shadow-sm border border-border/40' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Store className="w-4 h-4" />
          Urus Produk
        </button>
        <button 
          onClick={() => setActiveMainTab('ads')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeMainTab === 'ads' ? 'bg-card text-amber-500 shadow-sm border border-border/40' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Image className="w-4 h-4" />
          Iklan Promo
        </button>
      </div>

      {/* Store Status Toggle Switch */}
      {selectedBizId !== 'all' && activeMainTab !== 'ads' && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md flex items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${currentBiz?.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <div className="min-w-0">
              <p className="text-[12px] font-black text-foreground">
                Kedai: {currentBiz?.name} ({currentBiz?.is_active ? 'BUKA' : 'TUTUP'})
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {currentBiz?.is_active 
                  ? 'Kedai anda aktif di PolyMart. Pelajar boleh membeli produk anda.' 
                  : 'Kedai ditutup. Pelajar tidak boleh menempah produk baru buat sementara.'
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggleStoreStatus(selectedBizId, currentBiz?.is_active ?? false)}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs font-black text-white transition-all shadow-sm active:scale-95 shrink-0 ${
              currentBiz?.is_active 
                ? 'bg-rose-500 hover:bg-rose-600' 
                : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {loading ? 'Memproses...' : currentBiz?.is_active ? 'Tutup Kedai' : 'Buka Kedai'}
          </button>
        </motion.div>
      )}

      {/* ── URUS PESANAN TAB CONTENT ── */}
      {activeMainTab === 'orders' && (
        <div className="space-y-4">
          {/* Carian & Toggle Advanced Filters */}
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1 flex items-center h-10 px-3.5 rounded-xl bg-muted/30 border border-border/40 focus-within:border-amber-500/50 transition-all">
                <Search className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama pembeli, no. matrik, atau ID pesanan..."
                  className="w-full h-full px-2.5 text-xs font-semibold outline-none bg-transparent text-foreground placeholder:text-muted-foreground/45"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); window.history.replaceState({}, '', '/polymart/vendor'); }} className="text-muted-foreground hover:text-rose-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Advanced Filter Trigger Button */}
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                  showAdvancedFilters 
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-500' 
                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Filter className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Collapsible Advanced Filters Panel */}
            <AnimatePresence>
              {showAdvancedFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-2xl bg-card/40 border border-border/40">
                    {/* Business Selector */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider block">Kedai</span>
                      <div className="relative">
                        <select
                          value={selectedBizId}
                          onChange={(e) => handleBizChange(e.target.value)}
                          className="w-full h-8.5 pl-3 pr-8 rounded-lg text-xs bg-muted/40 border border-border outline-none appearance-none text-foreground font-bold cursor-pointer"
                        >
                          <option value="all">🏢 Semua Kedai</option>
                          {myBusinesses.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 pointer-events-none text-muted-foreground/50" />
                      </div>
                    </div>

                    {/* Date Selector */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider block">Tarikh</span>
                      <div className="relative">
                        <select
                          value={selectedDateFilter}
                          onChange={(e) => handleDateChange(e.target.value)}
                          className="w-full h-8.5 pl-3 pr-8 rounded-lg text-xs bg-muted/40 border border-border outline-none appearance-none text-foreground font-bold cursor-pointer"
                        >
                          <option value="all">📅 Semua Tarikh</option>
                          <option value="today">Hari Ini</option>
                          <option value="yesterday">Semalam</option>
                          <option value="3days">3 Hari Lepas</option>
                          <option value="7days">7 Hari Lepas</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 pointer-events-none text-muted-foreground/50" />
                      </div>
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider block">Kategori</span>
                      <div className="relative">
                        <select
                          value={selectedCategory}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                          className="w-full h-8.5 pl-3 pr-8 rounded-lg text-xs bg-muted/40 border border-border outline-none appearance-none text-foreground font-bold cursor-pointer"
                        >
                          <option value="all">🛍️ Semua Kategori</option>
                          {availableCategories.filter(c => c !== 'all').map(c => (
                            <option key={c} value={c}>{CATEGORY_EMOJI[c] || '📦'} {c}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 pointer-events-none text-muted-foreground/50" />
                      </div>
                    </div>

                    {/* Product Selector */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider block">Produk</span>
                      <div className="relative">
                        <select
                          value={selectedProduct}
                          onChange={(e) => handleProductChange(e.target.value)}
                          className="w-full h-8.5 pl-3 pr-8 rounded-lg text-xs bg-muted/40 border border-border outline-none appearance-none text-foreground font-bold cursor-pointer"
                        >
                          <option value="all">🏷️ Semua Produk</option>
                          {availableProducts.filter(p => p !== 'all').map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 pointer-events-none text-muted-foreground/50" />
                      </div>
                    </div>

                    {/* Variation Selector */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider block">Variasi</span>
                      <div className="relative">
                        <select
                          value={selectedVariation}
                          onChange={(e) => setSelectedVariation(e.target.value)}
                          className="w-full h-8.5 pl-3 pr-8 rounded-lg text-xs bg-muted/40 border border-border outline-none appearance-none text-foreground font-bold cursor-pointer"
                        >
                          <option value="all">📏 Semua Variasi</option>
                          {availableVariations.filter(v => v !== 'all').map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 pointer-events-none text-muted-foreground/50" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Grouped Status Tabs (Logical Tabs) */}
          <div className="flex gap-2 border-b border-border/30 overflow-x-auto scrollbar-hide pb-2">
            {[
              { key: 'actions', label: 'Tindakan Diperlukan', emoji: '⏳', count: actionsRequired.length },
              { key: 'processing', label: 'Sedang Diproses', emoji: '🔥', count: processing.length },
              { key: 'completed', label: 'Selesai', emoji: '⭐', count: completed.length },
              { key: 'all', label: 'Semua Jualan', emoji: '📋', count: finalFiltered.length }
            ].map(tab => (
              <button 
                key={tab.key}
                onClick={() => setActiveOrderTab(tab.key as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-black shrink-0 transition-all ${
                  activeOrderTab === tab.key 
                    ? 'bg-amber-500 text-white shadow-md' 
                    : 'bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                    activeOrderTab === tab.key ? 'bg-white text-amber-500' : 'bg-muted text-muted-foreground'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sub-Filters inside "Tindakan Diperlukan" */}
          {activeOrderTab === 'actions' && (
            <div className="flex gap-2 p-1 bg-muted/15 rounded-xl border border-border/30 w-fit">
              {[
                { key: 'all_actions', label: 'Semua Tindakan', count: actionsRequired.length },
                { key: 'unpaid', label: 'Belum Bayar (QR)', count: unpaid.length },
                { key: 'verification', label: 'Menunggu Pengesahan', count: awaitingVerification.length }
              ].map(sub => (
                <button
                  key={sub.key}
                  onClick={() => setActiveActionSubTab(sub.key as any)}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${
                    activeActionSubTab === sub.key 
                      ? 'bg-card text-amber-500 shadow-sm border border-border/40' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sub.label} ({sub.count})
                </button>
              ))}
            </div>
          )}

          {/* Bulk Approve banner in action-required / verification tab */}
          {activeOrderTab === 'actions' && activeActionSubTab === 'verification' && displayed.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Jumlah Menunggu Sahkan</p>
                  <p className="text-lg font-black text-foreground mt-0.5">RM {totalAwaitingVerificationSum.toFixed(2)}</p>
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold">{displayed.length} kumpulan pesanan</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-blue-500/10">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={displayed.length > 0 && selectedOrderIds.length === displayed.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrderIds(displayed.map(o => o.id));
                      } else {
                        setSelectedOrderIds([]);
                      }
                    }}
                    className="w-4.5 h-4.5 rounded border-border text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                  />
                  <span className="text-[11px] font-bold text-muted-foreground/80">Pilih Semua ({displayed.length})</span>
                </label>

                {selectedOrderIds.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-amber-500">
                      Pilih: {selectedOrderIds.length} (RM {selectedOrdersSum.toFixed(2)})
                    </span>
                    <button
                      onClick={handleBulkApprove}
                      disabled={loading}
                      className="px-4 py-2 rounded-xl text-[11px] font-black text-white bg-emerald-500 hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-md"
                    >
                      {loading ? '⏳ Sahkan...' : '✅ Sahkan Pukal'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Orders list */}
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin border-amber-500" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card/15 rounded-2xl border border-border/20">
              <div className="text-5xl">🎯</div>
              <p className="text-xs font-bold text-muted-foreground/60">Tiada pesanan dalam kategori ini</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              <AnimatePresence>
                {displayed.map(o => (
                  <VendorOrderCard
                    key={o.id}
                    order={o}
                    onUpdate={handleUpdate}
                    isSelected={selectedOrderIds.includes(o.id)}
                    onToggleSelect={() => {
                      setSelectedOrderIds(prev =>
                        prev.includes(o.id) ? prev.filter(id => id !== o.id) : [...prev, o.id]
                      );
                    }}
                    showCheckbox={activeOrderTab === 'actions' && activeActionSubTab === 'verification'}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ── URUS PRODUK TAB CONTENT ── */}
      {activeMainTab === 'products' && (
        <div className="space-y-4">
          {selectedBizId === 'all' ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card/15 rounded-2xl border border-border/20 text-center px-4">
              <Store className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-xs font-black text-muted-foreground/70 uppercase tracking-wide">Pilih Kedai Terlebih Dahulu</p>
              <p className="text-[11px] text-muted-foreground/50 max-w-xs -mt-1 leading-normal">
                Sila klik butang penapis di penjuru carian atas untuk memilih kedai spesifik untuk mengurus stok produk.
              </p>
              <button 
                onClick={() => setShowAdvancedFilters(true)}
                className="mt-2 h-9 px-4 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-black rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm"
              >
                Pilih Kedai Sekarang
              </button>
            </div>
          ) : fetchingProducts ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin border-amber-500" />
            </div>
          ) : bizProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card/15 rounded-2xl border border-border/20">
              <Store className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-xs font-bold text-muted-foreground/60">Tiada produk didaftarkan di bawah kedai ini.</p>
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {bizProducts.map(p => {
                const hasVariations = Array.isArray(p.variations) && p.variations.length > 0;
                return (
                  <div key={p.id} className="p-4 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md shadow-sm space-y-3.5 hover:border-amber-500/15 transition-all duration-300">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-muted border border-border/40 flex items-center justify-center text-2xl font-bold">
                        {p.image_url 
                          ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> 
                          : CATEGORY_EMOJI[p.category] || '📦'
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] font-black text-foreground truncate">{p.name}</p>
                          <span className="text-[10px] font-black text-amber-500 shrink-0">RM {p.price.toFixed(2)}</span>
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">{p.category}</p>
                      </div>
                    </div>

                    {/* Stock Status Toggles */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${p.is_available ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="text-[10px] font-black text-foreground">
                          {p.is_available ? 'Tersedia untuk Pelanggan' : 'Hampir Habis / Tutup Jualan'}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleProductAvailability(p.id, p.is_available)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black text-white transition-all shadow-sm ${
                          p.is_available 
                            ? 'bg-rose-500/80 hover:bg-rose-600' 
                            : 'bg-emerald-500/80 hover:bg-emerald-600'
                        }`}
                      >
                        {p.is_available ? 'Nyah-aktif' : 'Aktifkan'}
                      </button>
                    </div>

                    {/* Variations Stock Manager */}
                    {hasVariations ? (
                      <div className="p-3.5 rounded-xl bg-muted/30 border border-border/30 space-y-2.5">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Stok Mengikut Variasi</p>
                        <div className="divide-y divide-border/20 space-y-2">
                          {p.variations.map((v: any) => {
                            const isEditing = editingVarStock?.productId === p.id && editingVarStock?.varName === v.name;
                            return (
                              <div key={v.name} className="flex items-center justify-between pt-2 first:pt-0 text-[11px]">
                                <span className="font-black text-foreground uppercase bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg text-[9px] text-amber-500">
                                  {v.name}
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  <div className="text-right shrink-0 mr-1.5">
                                    <p className="font-bold text-foreground">Stok: {v.stock} unit</p>
                                    {v.reserved > 0 && <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">Ditempah: {v.reserved}</p>}
                                  </div>

                                  {isEditing ? (
                                    <div className="flex items-center gap-1">
                                      <input 
                                        type="number"
                                        value={editingVarStock.value}
                                        onChange={(e) => setEditingVarStock(prev => prev ? { ...prev, value: e.target.value } : null)}
                                        className="w-12 h-7 px-1.5 bg-background border border-border rounded-lg text-center font-bold text-xs"
                                        placeholder="Kuantiti"
                                      />
                                      <button 
                                        onClick={() => handleSaveVariationStock(p.id, p.variations, v.name, editingVarStock.value)}
                                        className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-sm"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => setEditingVarStock(null)}
                                        className="w-7 h-7 bg-muted border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => setEditingVarStock({ productId: p.id, varName: v.name, value: v.stock.toString() })}
                                      className="px-2 py-1 rounded-lg border border-border bg-card/60 text-[9px] font-bold text-muted-foreground hover:text-foreground hover:border-amber-500/30 transition-all"
                                    >
                                      Ubah
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      // Base Product Stock (No Variations)
                      <div className="p-3.5 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Kuantiti Stok Utama</p>
                          <p className="text-[11px] font-bold text-foreground mt-1">Stok Tersedia: {p.stock_quantity ?? 0} unit</p>
                          {(p.reserved_stock || 0) > 0 && (
                            <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">Ditempah: {p.reserved_stock}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {editingBaseStock?.productId === p.id ? (
                            <div className="flex items-center gap-1">
                              <input 
                                type="number"
                                value={editingBaseStock.value}
                                onChange={(e) => setEditingBaseStock(prev => prev ? { ...prev, value: e.target.value } : null)}
                                className="w-12 h-7 px-1.5 bg-background border border-border rounded-lg text-center font-bold text-xs text-foreground"
                              />
                              <button 
                                onClick={() => handleSaveBaseStock(p.id, editingBaseStock.value)}
                                className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setEditingBaseStock(null)}
                                className="w-7 h-7 bg-muted border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setEditingBaseStock({ productId: p.id, value: (p.stock_quantity ?? 0).toString() })}
                              className="px-2 py-1 rounded-lg border border-border bg-card/60 text-[9px] font-bold text-muted-foreground hover:text-foreground hover:border-amber-500/30 transition-all shadow-sm"
                            >
                              Ubah Stok
                            </button>
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
      )}

      {/* ── IKLAN PROMO TAB CONTENT ── */}
      {activeMainTab === 'ads' && (
        <VendorAdsTab />
      )}
    </div>
  );
}
