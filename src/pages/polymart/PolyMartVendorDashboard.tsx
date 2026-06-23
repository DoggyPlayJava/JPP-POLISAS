import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { type PolyAd } from '@/types';
import { PM_ACCENT, PM_LIGHT, PM_GRADIENT, usePolymart } from './PolyMartLayout';
import { sendNotificationToUser } from '@/lib/notifications';
import toast from 'react-hot-toast';
import mockData from './mockData.json';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Package, CheckCircle, XCircle, Clock, Store, Home,
  Phone, MessageCircle, ChevronDown, ChevronUp, AlertTriangle,
  TrendingUp, ShoppingBag, CreditCard, Handshake, Eye, Image,
  Search, X, Filter, Settings, Plus, Minus, Check, HelpCircle,
  Tag, Calendar, Layers, Utensils, Coffee, Smartphone, Wrench,
  FileSpreadsheet, Copy
} from 'lucide-react';

const getCategoryIcon = (category: string) => {
  const className = "w-5 h-5 text-muted-foreground/60 stroke-[1.5]";
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
function StatCard({ label, value, icon: Icon, color, onClick }: { label: string; value: number | string; icon: any; color: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`flex-1 rounded-[1.25rem] bg-zinc-100 dark:bg-zinc-950/20 ring-1 ring-zinc-200 dark:ring-zinc-800/30 p-0.5 shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        onClick 
          ? 'cursor-pointer hover:ring-amber-500/40 hover:scale-[1.02] hover:bg-zinc-200 dark:hover:bg-zinc-950/30 active:scale-98' 
          : 'hover:ring-amber-500/30'
      }`}
    >
      <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-[calc(1.25rem-0.125rem)] p-3.5 flex items-center gap-3 min-w-0 shadow-[inset_0_1px_1px_rgba(0,0,0,0.01)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}14` }}>
          <Icon className="w-4.5 h-4.5 stroke-[1.5]" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-[20px] font-mono font-black text-foreground leading-none tracking-tight">{value}</p>
          <p className="text-[9.5px] text-muted-foreground/50 font-black mt-1.5 uppercase tracking-wider truncate">{label}</p>
        </div>
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
  bizName,
}: {
  order: GroupedVendorOrder;
  onUpdate: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
  bizName?: string;
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

      if (localStorage.getItem('use_mock_auth') === 'true') {
        const storedOrders = localStorage.getItem('mock_vendor_orders');
        if (storedOrders) {
          const parsed = JSON.parse(storedOrders);
          const updated = parsed.map((o: any) => {
            if (orderIds.includes(o.id)) {
              return { ...o, ...updates };
            }
            return o;
          });
          localStorage.setItem('mock_vendor_orders', JSON.stringify(updated));
        }

        if (newStatus === 'CANCELLED') {
          const storedProds = localStorage.getItem('mock_vendor_products');
          if (storedProds) {
            const parsedProds = JSON.parse(storedProds);
            const updatedProds = parsedProds.map((p: any) => {
              const matchedItem = order.items.find(item => item.product_id === p.id);
              if (matchedItem) {
                if (matchedItem.selected_variation && p.variations) {
                  return {
                    ...p,
                    variations: p.variations.map((v: any) => 
                      v.name === matchedItem.selected_variation 
                        ? { ...v, stock: v.stock + matchedItem.quantity } 
                        : v
                    )
                  };
                } else {
                  return {
                    ...p,
                    stock_quantity: (p.stock_quantity || 0) + matchedItem.quantity
                  };
                }
              }
              return p;
            });
            localStorage.setItem('mock_vendor_products', JSON.stringify(updatedProds));
          }
        }

        toast.success(`Status dikemaskini: ${STATUS_CONFIG[newStatus].label}`);
        onUpdate();
        return;
      }

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
    if (order.business_id && order.buyer?.id) {
      window.dispatchEvent(
        new CustomEvent('open-polymart-chat', {
          detail: {
            businessId: order.business_id,
            buyerId: order.buyer.id,
          },
        })
      );
    }
  };

  const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = order.items.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <>
      <motion.div layout className="rounded-[2rem] bg-zinc-100 dark:bg-zinc-950/20 ring-1 ring-zinc-200 dark:ring-zinc-800/30 p-0.5 shadow-sm hover:ring-amber-500/10 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-[calc(2rem-0.125rem)] overflow-hidden shadow-inner dark:shadow-white/5 border border-zinc-100 dark:border-transparent space-y-4 pb-4">
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/20">
            <div className="flex items-center gap-2">
              {showCheckbox && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={onToggleSelect}
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-white dark:focus:ring-offset-zinc-900 cursor-pointer accent-amber-500 bg-white dark:bg-zinc-950"
                />
              )}
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: `${cfg.color}15` }}>
                {cfg.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(order.id);
                  toast.success('ID pesanan disalin!');
                }}
                className="text-[9.5px] text-muted-foreground/50 hover:text-amber-500 font-mono font-bold bg-zinc-100 dark:bg-zinc-800/30 hover:bg-zinc-200 dark:hover:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/30 px-1.5 py-0.5 rounded transition-all shrink-0"
                title="Klik untuk salin ID penuh"
              >
                #{order.id.slice(0, 8).toUpperCase()}
              </button>
              <span className="text-[9.5px] text-muted-foreground/45 font-mono font-bold">
                {new Date(order.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 space-y-4">
            {/* Buyer Info Header */}
            <div className="flex items-center gap-3 pb-3.5 border-b border-zinc-200 dark:border-zinc-800/20">
              <div className="w-8.5 h-8.5 rounded-full bg-zinc-100 dark:bg-zinc-800/20 ring-1 ring-zinc-200 dark:ring-zinc-700/30 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black text-muted-foreground uppercase">{order.buyer?.full_name?.[0] ?? '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[11.5px] font-black text-foreground leading-tight truncate">{order.buyer?.full_name ?? 'Tidak diketahui'}</h4>
                <p className="text-[9.5px] text-muted-foreground/50 font-black uppercase tracking-wider mt-0.5">{order.buyer?.matric_no ?? 'Tiada No Matrik'}</p>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {order.pickup_time && (
                  <div className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800/30 flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase tracking-wide">
                    <Clock className="w-3 h-3 text-muted-foreground/40" />
                    <span>{order.pickup_time}</span>
                  </div>
                )}
                
                {/* Native Chat Button */}
                <button 
                  onClick={handleChatWithBuyer}
                  title="Chat bersama pembeli"
                  className="w-9.5 h-9.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/40 hover:bg-amber-500 hover:text-white text-muted-foreground flex items-center justify-center border border-zinc-200 dark:border-zinc-800/50 hover:border-amber-500/25 active:scale-95 transition-all duration-300 shadow-sm"
                >
                  <MessageCircle className="w-4.5 h-4.5 stroke-[1.5]" />
                </button>

                {/* WhatsApp Button with Dynamic Status Templates */}
                {order.share_phone && order.buyer?.phone && (() => {
                  const phone = order.buyer.phone.replace(/\D/g, '').replace(/^0/, '60');
                  const storeName = bizName || 'PolyMart';
                  const shortId = order.id.slice(0, 8).toUpperCase();
                  
                  // Construct dynamic templates based on status
                  let text = '';
                  if (order.status === 'PENDING') {
                    if (order.payment_method === 'QR_ONLINE') {
                      text = `Hai ${order.buyer.full_name}! Tempahan anda #${shortId} di kedai ${storeName} telah diterima. Sila buat pembayaran QR Online dan muat naik resit ke sistem supaya kami boleh mengesahkan pesanan anda. Terima kasih! 💳`;
                    } else {
                      text = `Hai ${order.buyer.full_name}! Tempahan anda #${shortId} secara COD di kedai ${storeName} telah diterima. Sila tunggu maklum balas daripada kami untuk pengesahan lanjut ya. Terima kasih! 🤝`;
                    }
                  } else if (order.status === 'CONFIRMED') {
                    text = `Hai ${order.buyer.full_name}! Pembayaran / pesanan anda #${shortId} di kedai ${storeName} telah disahkan. Kami sedang menyiapkannya sekarang. Kami akan maklumkan semula apabila ia sedia untuk diambil! 📦`;
                  } else if (order.status === 'READY') {
                    const pickupText = order.pickup_time ? ` pada ${order.pickup_time}` : '';
                    text = `Hai ${order.buyer.full_name}! Tempahan anda #${shortId} di kedai ${storeName} telah SEDIA untuk diambil. Sila datang ambil di lokasi perniagaan kami${pickupText}. Jumpa anda nanti! 😊`;
                  } else if (order.status === 'CANCELLED') {
                    text = `Hai ${order.buyer.full_name}! Tempahan anda #${shortId} di kedai ${storeName} terpaksa dibatalkan. Jika bayaran telah dibuat, pihak kami akan berhubung lanjut untuk proses refund. Maaf atas kesulitan. 🙏`;
                  }
                  
                  const waLink = text ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/${phone}`;
                  
                  return (
                    <a 
                      href={waLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      title="WhatsApp pembeli dengan notifikasi status"
                      className="w-9.5 h-9.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/40 hover:bg-emerald-500 hover:text-white text-muted-foreground flex items-center justify-center border border-zinc-200 dark:border-zinc-800/50 hover:border-emerald-500/25 active:scale-95 transition-all duration-300 shadow-sm"
                    >
                      <Phone className="w-4 h-4 stroke-[1.5]" />
                    </a>
                  );
                })()}

                <button onClick={() => setExpanded(e => !e)}
                  className="w-9.5 h-9.5 rounded-2xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-800/25 hover:bg-zinc-200 dark:hover:bg-zinc-800/50 transition-colors">
                  {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>

            {/* Expanded buyer info */}
            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="pb-3.5 border-b border-zinc-200 dark:border-zinc-800/20 space-y-2 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-muted-foreground/60 uppercase tracking-wider">No. Telefon Pelajar:</span>
                      <span className="text-foreground font-black">{order.buyer?.phone ?? 'Tidak dikongsi'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-muted-foreground/60 uppercase tracking-wider">ID Pesanan:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(order.id);
                          toast.success('ID pesanan disalin!');
                        }}
                        className="flex items-center gap-1.5 text-foreground hover:text-amber-500 font-mono text-[9px] font-black bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800/50 px-2 py-0.5 rounded transition-all"
                        title="Klik untuk salin ID penuh"
                      >
                        <span>{order.id}</span>
                        <Copy className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Products List */}
            <div className="space-y-3">
              {order.items.map(item => {
                const IconComponent = item.category === 'Pakaian' ? Tag : item.category === 'Aksesori' ? Layers : Package;
                return (
                  <div key={item.order_id} className="flex gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800/10 last:border-0 last:pb-0 first:pt-0">
                    <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-950/20 ring-1 ring-zinc-200 dark:ring-zinc-800/30 p-0.5 shrink-0 shadow-sm">
                      <div className="w-full h-full rounded-[calc(0.75rem-0.0625rem)] overflow-hidden bg-white dark:bg-zinc-900/60 flex items-center justify-center shadow-inner">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <IconComponent className="w-4 h-4 text-muted-foreground/60 stroke-[1.5]" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[11.5px] font-black text-foreground truncate">{item.name}</p>
                        {item.selected_variation && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-850 text-[7.5px] font-black text-muted-foreground uppercase">
                            {item.selected_variation}
                          </span>
                        )}
                      </div>
                      <p className="text-[9.5px] text-muted-foreground/60 font-semibold mt-0.5">RM {item.unit_price.toFixed(2)} × {item.quantity}</p>
                      
                      {item.note && (
                        <div className="mt-1.5 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-100 dark:border-zinc-800/10 text-[9.5px] text-muted-foreground/80 leading-normal flex items-start gap-1 shadow-inner">
                          <span className="font-black text-amber-500 uppercase tracking-wide shrink-0">Nota:</span>
                          <span className="italic">"{item.note}"</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11.5px] font-black text-foreground">RM {item.total_price.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Price Row */}
            <div className="flex justify-between items-center pt-3.5 border-t border-zinc-200 dark:border-zinc-800/20">
              <div className="flex items-center gap-2">
                {order.payment_method && (
                  <span className={`flex items-center gap-1.5 text-[9px] font-black px-2.5 py-1 rounded-full border ${
                    order.payment_method === 'COD'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                      : order.payment_verified_at
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                      : order.payment_receipt_rejected
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                      : order.payment_receipt_url
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                      : 'bg-neutral-500/10 border-neutral-500/25 text-muted-foreground'
                  }`}>
                    {order.payment_method === 'COD' ? (
                      <>
                        <Handshake className="w-3 h-3" />
                        <span>COD - Tunai</span>
                      </>
                    ) : order.payment_verified_at ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        <span>QR - Telah Dibayar</span>
                      </>
                    ) : order.payment_receipt_rejected ? (
                      <>
                        <XCircle className="w-3 h-3" />
                        <span>QR - Resit Ditolak</span>
                      </>
                    ) : order.payment_receipt_url ? (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>QR - Perlu Semak Resit</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>QR - Belum Bayar</span>
                      </>
                    )}
                  </span>
                )}

                {/* Status Indicator for QR with receipt awaiting verification */}
                {order.payment_method === 'QR_ONLINE' && order.payment_receipt_url && !order.payment_verified_at && !order.payment_receipt_rejected && order.status !== 'CANCELLED' && (
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className="px-2.5 py-1 rounded-full bg-blue-500 text-white text-[9px] font-black hover:bg-blue-600 transition-colors flex items-center gap-1 shadow-sm active:scale-95"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Sahkan Bayaran</span>
                  </button>
                )}

                {/* Verified receipt view button */}
                {order.payment_method === 'QR_ONLINE' && order.payment_receipt_url && order.payment_verified_at && (
                  <button 
                    onClick={() => setShowReceiptModal(true)}
                    className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800/40 text-muted-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800/80 text-[9px] font-black flex items-center gap-1.5 transition-colors active:scale-95"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Resit</span>
                  </button>
                )}
              </div>
              
              <div className="text-right flex items-center gap-2">
                <span className="text-[9.5px] text-muted-foreground/40 font-black uppercase tracking-wider">Jumlah ({totalQty} unit):</span>
                <span className="text-[13px] font-mono font-black text-amber-500">RM {totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Alert banners placed neatly */}
            {order.cancellation_requested_at && order.status !== 'CANCELLED' && (
              <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/15 flex items-center justify-between gap-3 shadow-inner">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                    <span>Pembeli Minta Batal</span>
                  </p>
                  <p className="text-[9.5px] text-muted-foreground/60 italic mt-0.5 truncate">"{order.cancellation_reason}"</p>
                </div>
                <button
                  onClick={() => setShowCancelRequestModal(true)}
                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] rounded-xl transition-all shrink-0 shadow-md active:scale-95"
                >
                  Urus Permintaan
                </button>
              </div>
            )}

            {/* Cancellation Alert for QR code manual refund warning */}
            {order.status === 'CANCELLED' && order.payment_method === 'QR_ONLINE' && order.payment_receipt_url && (
              <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/15 space-y-2.5 shadow-inner">
                <p className="text-[9.5px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse shrink-0" />
                  <span>Alert Pulangan Wang (QR)</span>
                </p>
                <p className="text-[9.5px] text-muted-foreground/70 leading-relaxed">
                  Jualan dibatalkan tetapi resit dikesan. Sila buat pemulangan wang secara manual.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className="flex-1 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800/40 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 text-[9.5px] font-black text-muted-foreground flex items-center justify-center gap-1 border border-zinc-200 dark:border-zinc-800/40 transition-colors active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Semak Resit</span>
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
                      className="flex-1 h-8 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 text-[9.5px] font-black transition-colors flex items-center justify-center gap-1 border border-rose-500/20 active:scale-95"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Hubungi WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Unpaid / Waiting for Receipt Warning */}
            {order.payment_method === 'QR_ONLINE' && !order.payment_receipt_url && !order.payment_verified_at && order.status !== 'CANCELLED' && (
              <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-800/30 flex items-center gap-2 text-[10px] text-muted-foreground/70 font-semibold shadow-inner">
                <Clock className="w-4 h-4 text-muted-foreground/40 shrink-0 animate-pulse" />
                <span>Menunggu pembayaran / resit daripada pelajar...</span>
              </div>
            )}

            {order.payment_method === 'QR_ONLINE' && order.payment_receipt_rejected && order.status !== 'CANCELLED' && (
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-center gap-2 text-[10px] text-amber-500 font-bold shadow-inner">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Resit ditolak. Menunggu pelajar memuat naik resit baharu...</span>
              </div>
            )}

            {/* Action buttons list */}
            <div className="flex gap-2 pt-1">
              {order.status === 'PENDING' && order.payment_method === 'COD' && (
                <>
                  <button onClick={() => updateStatus('CONFIRMED')} disabled={loading}
                    className="flex-1 h-11 rounded-2xl text-[12px] font-black text-white transition-all disabled:opacity-60 shadow-md hover:brightness-110 active:scale-95"
                    style={{ background: PM_GRADIENT }}>
                    {loading ? 'Proses...' : 'Sahkan'}
                  </button>
                  <button onClick={() => setShowCancel(true)} disabled={loading}
                    className="flex-1 h-11 rounded-2xl text-[12px] font-black text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors disabled:opacity-60 active:scale-95">
                    Tolak
                  </button>
                </>
              )}
              {order.status === 'PENDING' && order.payment_method === 'QR_ONLINE' && (
                <button onClick={() => setShowCancel(true)} disabled={loading}
                  className="flex-1 h-11 rounded-2xl text-[12px] font-black text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 transition-colors disabled:opacity-60 active:scale-95">
                  Batalkan Pesanan
                </button>
              )}
              {order.status === 'CONFIRMED' && (
                <>
                  <button onClick={() => updateStatus('READY')} disabled={loading}
                    className="flex-1 h-11 rounded-2xl text-[12px] font-black text-white transition-all disabled:opacity-60 shadow-md hover:brightness-110 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                    {loading ? 'Proses...' : 'Siap Diambil'}
                  </button>
                  <button onClick={() => setShowCancel(true)} disabled={loading}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-500 transition-colors active:scale-95 shrink-0">
                    <XCircle className="w-4.5 h-4.5" />
                  </button>
                </>
              )}
              {order.status === 'READY' && !showComplete && (
                <button onClick={() => setShowComplete(true)} disabled={loading}
                  className="flex-1 h-11 rounded-2xl text-[12px] font-black text-white transition-all disabled:opacity-60 shadow-md hover:brightness-110 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  Tandakan Selesai
                </button>
              )}
            </div>

            {/* Cancellation Forms */}
            <AnimatePresence>
              {showCancel && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="pt-3 border-t border-zinc-200 dark:border-zinc-800/20 space-y-2">
                  <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                    placeholder="Nyatakan sebab pembatalan..."
                    className="w-full h-11 px-3.5 rounded-2xl text-xs outline-none bg-white dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/50 text-foreground placeholder:text-muted-foreground/35 animate-in fade-in" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCancel(false)}
                      className="flex-1 h-10 rounded-2xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 text-muted-foreground transition-colors active:scale-95">
                      Batal
                    </button>
                    <button onClick={() => updateStatus('CANCELLED', { cancel_reason: cancelReason })}
                      disabled={loading} className="flex-1 h-10 rounded-2xl text-[11px] font-black bg-rose-500/15 text-rose-500 border border-rose-500/25 hover:bg-rose-500/25 transition-colors active:scale-95">
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
                  className="pt-3 border-t border-zinc-200 dark:border-zinc-800/20 space-y-3">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Sahkan Cara Bayaran Sebenar</p>
                  <div className="flex gap-2">
                    {['CASH', 'QR', 'TRANSFER'].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m as any)}
                        className={`flex-1 h-10 rounded-2xl text-[11px] font-bold transition-all ${paymentMethod === m ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 font-black' : 'bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-850 text-muted-foreground'} border active:scale-95`}>
                        {m === 'CASH' ? 'Tunai' : m === 'QR' ? 'QR Pay' : 'Transfer'}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowComplete(false)}
                      className="flex-1 h-10 rounded-2xl text-[11px] font-bold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 text-muted-foreground transition-colors active:scale-95">
                      Batal
                    </button>
                    <button onClick={() => updateStatus('COMPLETED')}
                      disabled={loading} className="flex-1 h-10 rounded-2xl text-[11px] font-black text-white bg-green-600 hover:bg-green-700 transition-colors shadow-md active:scale-95">
                      Sahkan Selesai
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
                        
                        if (localStorage.getItem('use_mock_auth') === 'true') {
                          const storedOrders = localStorage.getItem('mock_vendor_orders');
                          if (storedOrders) {
                            const parsed = JSON.parse(storedOrders);
                            const updated = parsed.map((o: any) => {
                              if (order.items.map(i => i.order_id).includes(o.id)) {
                                return {
                                  ...o,
                                  payment_verified_at: now,
                                  payment_verified_by: profile?.id,
                                  status: 'CONFIRMED',
                                  confirmed_at: now,
                                  updated_at: now,
                                };
                              }
                              return o;
                            });
                            localStorage.setItem('mock_vendor_orders', JSON.stringify(updated));
                          }
                          toast.success('Bayaran disahkan!');
                          setShowReceiptModal(false);
                          onUpdate();
                          setLoading(false);
                          return;
                        }
                        
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
                        
                        if (localStorage.getItem('use_mock_auth') === 'true') {
                          const storedOrders = localStorage.getItem('mock_vendor_orders');
                          if (storedOrders) {
                            const parsed = JSON.parse(storedOrders);
                            const updated = parsed.map((o: any) => {
                              if (order.items.map(i => i.order_id).includes(o.id)) {
                                return {
                                  ...o,
                                  payment_receipt_rejected: true,
                                  updated_at: new Date().toISOString(),
                                };
                              }
                              return o;
                            });
                            localStorage.setItem('mock_vendor_orders', JSON.stringify(updated));
                          }
                          toast.error('Resit ditolak');
                          setShowReceiptModal(false);
                          onUpdate();
                          setLoading(false);
                          return;
                        }
                        
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
                      if (localStorage.getItem('use_mock_auth') === 'true') {
                        const storedOrders = localStorage.getItem('mock_vendor_orders');
                        if (storedOrders) {
                          const parsed = JSON.parse(storedOrders);
                          const fullReason = `${order.cancellation_reason || ''} [Batal] | Refund Sah: ${refundReference}`;
                          const updated = parsed.map((o: any) => {
                            if (order.items.map(i => i.order_id).includes(o.id)) {
                              return {
                                ...o,
                                status: 'CANCELLED',
                                cancelled_at: new Date().toISOString(),
                                cancel_reason: fullReason,
                                updated_at: new Date().toISOString(),
                              };
                            }
                            return o;
                          });
                          localStorage.setItem('mock_vendor_orders', JSON.stringify(updated));
                        }

                        // Release mock stock
                        const storedProds = localStorage.getItem('mock_vendor_products');
                        if (storedProds) {
                          const parsedProds = JSON.parse(storedProds);
                          const updatedProds = parsedProds.map((p: any) => {
                            const matchedItem = order.items.find(item => item.product_id === p.id);
                            if (matchedItem) {
                              if (matchedItem.selected_variation && p.variations) {
                                return {
                                  ...p,
                                  variations: p.variations.map((v: any) => 
                                    v.name === matchedItem.selected_variation 
                                      ? { ...v, stock: v.stock + matchedItem.quantity } 
                                      : v
                                  )
                                };
                              } else {
                                return {
                                  ...p,
                                  stock_quantity: (p.stock_quantity || 0) + matchedItem.quantity
                                };
                              }
                            }
                            return p;
                          });
                          localStorage.setItem('mock_vendor_products', JSON.stringify(updatedProds));
                        }

                        toast.success('Pembatalan & refund diluluskan!');
                        setShowRefundModal(false);
                        setShowCancelRequestModal(false);
                        onUpdate();
                        setLoading(false);
                        setRefundConfirmed(false);
                        setRefundReference('');
                        return;
                      }

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
                        
                        if (localStorage.getItem('use_mock_auth') === 'true') {
                          const storedOrders = localStorage.getItem('mock_vendor_orders');
                          if (storedOrders) {
                            const parsed = JSON.parse(storedOrders);
                            const updated = parsed.map((o: any) => {
                              if (o.id === order.id) {
                                return {
                                  ...o,
                                  status: 'CANCELLED',
                                  cancelled_at: new Date().toISOString(),
                                  cancel_reason: order.cancellation_reason,
                                  updated_at: new Date().toISOString(),
                                };
                              }
                              return o;
                            });
                            localStorage.setItem('mock_vendor_orders', JSON.stringify(updated));
                          }
                          
                          // Release mock stock
                          const storedProds = localStorage.getItem('mock_vendor_products');
                          if (storedProds) {
                            const parsedProds = JSON.parse(storedProds);
                            const updatedProds = parsedProds.map((p: any) => {
                              const matchedItem = order.items.find(item => item.product_id === p.id);
                              if (matchedItem) {
                                if (matchedItem.selected_variation && p.variations) {
                                  return {
                                    ...p,
                                    variations: p.variations.map((v: any) => 
                                      v.name === matchedItem.selected_variation 
                                        ? { ...v, stock: v.stock + matchedItem.quantity } 
                                        : v
                                    )
                                  };
                                } else {
                                  return {
                                    ...p,
                                    stock_quantity: (p.stock_quantity || 0) + matchedItem.quantity
                                  };
                                }
                              }
                              return p;
                            });
                            localStorage.setItem('mock_vendor_products', JSON.stringify(updatedProds));
                          }
                          
                          toast.success('Pembatalan diluluskan');
                          setShowCancelRequestModal(false);
                          onUpdate();
                          setLoading(false);
                          return;
                        }
                        
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
                      
                      if (localStorage.getItem('use_mock_auth') === 'true') {
                        const storedOrders = localStorage.getItem('mock_vendor_orders');
                        if (storedOrders) {
                          const parsed = JSON.parse(storedOrders);
                          const updated = parsed.map((o: any) => {
                            if (o.id === order.id) {
                              return {
                                ...o,
                                cancellation_requested_at: null,
                                cancellation_reason: null,
                                updated_at: new Date().toISOString(),
                              };
                            }
                            return o;
                          });
                          localStorage.setItem('mock_vendor_orders', JSON.stringify(updated));
                        }
                        toast.success('Pembatalan ditolak');
                        setShowCancelRequestModal(false);
                        onUpdate();
                        setLoading(false);
                        return;
                      }
                      
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
    if (localStorage.getItem('use_mock_auth') === 'true') {
      let storedAds = localStorage.getItem('mock_vendor_ads');
      if (!storedAds) {
        const defaultAds = [
          { id: 'mock-ad-1', title: 'Nasi Lemak RM1 Cik Jah Promo', image_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="250" viewBox="0 0 600 250"><rect width="100%" height="100%" fill="%23f59e0b"/><text x="50" y="100" font-family="sans-serif" font-size="28" font-weight="bold" fill="white">Nasi Lemak RM1!</text><text x="50" y="140" font-family="sans-serif" font-size="16" fill="white">Cik Jah Catering - 100% Student Price</text></svg>', link_url: '/polymart', type: 'INTERNAL', status: 'APPROVED', created_by: user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { id: 'mock-ad-2', title: 'T-Shirt JPP Preorder', image_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="250" viewBox="0 0 600 250"><rect width="100%" height="100%" fill="%233b82f6"/><text x="50" y="100" font-family="sans-serif" font-size="28" font-weight="bold" fill="white">T-Shirt JPP 2026</text><text x="50" y="140" font-family="sans-serif" font-size="16" fill="white">Order yours now - PolyMerch Co.</text></svg>', link_url: '/polymart', type: 'INTERNAL', status: 'DRAFT', created_by: user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        localStorage.setItem('mock_vendor_ads', JSON.stringify(defaultAds));
        storedAds = JSON.stringify(defaultAds);
      }
      const parsedAds = JSON.parse(storedAds);
      setAds(parsedAds);
      setLoading(false);
      return;
    }
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
      if (localStorage.getItem('use_mock_auth') === 'true') {
        const payload = {
          id: `mock-ad-${Date.now()}`,
          title,
          image_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="250" viewBox="0 0 600 250"><rect width="100%" height="100%" fill="%236b7280"/><text x="50" y="100" font-family="sans-serif" font-size="28" font-weight="bold" fill="white">' + encodeURIComponent(title) + '</text></svg>',
          link_url: linkUrl || null,
          type: 'INTERNAL',
          status: 'DRAFT',
          created_by: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const stored = localStorage.getItem('mock_vendor_ads');
        const parsed = stored ? JSON.parse(stored) : [];
        parsed.unshift(payload);
        localStorage.setItem('mock_vendor_ads', JSON.stringify(parsed));
        
        toast.success('Permohonan iklan dihantar! Sila tunggu kelulusan Exco.');
        setShowModal(false);
        setTitle(''); setLinkUrl(''); setImageFile(null);
        loadAds();
        setSaving(false);
        return;
      }

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
  const [activeOrderTab, setActiveOrderTab] = useState<'actions' | 'processing' | 'completed' | 'cancelled' | 'all'>('actions');
  
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
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Product stock management states
  const [bizProducts, setBizProducts] = useState<any[]>([]);
  const [fetchingProducts, setFetchingProducts] = useState(false);
  const [editingVarStock, setEditingVarStock] = useState<{ productId: string, varName: string, value: string } | null>(null);
  const [editingBaseStock, setEditingBaseStock] = useState<{ productId: string, value: string } | null>(null);

  // Analytics & Auto-refresh poller states
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);

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
    setSelectedPaymentFilter('all');
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
    
    if (localStorage.getItem('use_mock_auth') === 'true') {
      const mockBizList = mockData.businesses && mockData.businesses.length > 0 
        ? mockData.businesses.map((b: any) => ({ id: b.id, name: b.name, is_active: b.is_active ?? true }))
        : [
            { id: 'mock-biz-1', name: 'Kedai Mock Cik Jah', is_active: true },
            { id: 'mock-biz-2', name: 'PolyMerch Co.', is_active: false }
          ];
      setMyBusinesses(mockBizList);
      
      let storedOrders = localStorage.getItem('mock_vendor_orders');
      let parsedOrders = [];
      try {
        parsedOrders = storedOrders ? JSON.parse(storedOrders) : [];
      } catch (e) {
        parsedOrders = [];
      }
      
      if (!Array.isArray(parsedOrders) || parsedOrders.length === 0) {
        const defaultOrders = mockData.orders && mockData.orders.length > 0 
          ? mockData.orders 
          : [];
        localStorage.setItem('mock_vendor_orders', JSON.stringify(defaultOrders));
        parsedOrders = defaultOrders;
      }
      setOrders(parsedOrders);
      setLoading(false);
      return;
    }
    
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

    if (localStorage.getItem('use_mock_auth') === 'true') {
      let storedProducts = localStorage.getItem('mock_vendor_products');
      let parsedProducts = [];
      try {
        parsedProducts = storedProducts ? JSON.parse(storedProducts) : [];
      } catch (e) {
        parsedProducts = [];
      }
      
      if (!Array.isArray(parsedProducts) || parsedProducts.length === 0) {
        const defaultProducts = mockData.products && mockData.products.length > 0 
          ? mockData.products 
          : [];
        localStorage.setItem('mock_vendor_products', JSON.stringify(defaultProducts));
        parsedProducts = defaultProducts;
      }
      const filtered = parsedProducts.filter((p: any) => p.business_id === selectedBizId);
      setBizProducts(filtered);
      setFetchingProducts(false);
      return;
    }

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
    if (localStorage.getItem('use_mock_auth') === 'true') {
      setMyBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, is_active: !currentStatus } : b));
      toast.success(`Kedai ${!currentStatus ? 'dibuka!' : 'ditutup!'}`);
      setLoading(false);
      return;
    }
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
    if (localStorage.getItem('use_mock_auth') === 'true') {
      const stored = localStorage.getItem('mock_vendor_products');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.map((p: any) => p.id === prodId ? { ...p, is_available: !current } : p);
        localStorage.setItem('mock_vendor_products', JSON.stringify(updated));
      }
      setBizProducts(prev => prev.map(p => p.id === prodId ? { ...p, is_available: !current } : p));
      toast.success('Status ketersediaan berjaya dikemaskini');
      return;
    }
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
    if (localStorage.getItem('use_mock_auth') === 'true') {
      const stored = localStorage.getItem('mock_vendor_products');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.map((p: any) => p.id === prodId ? { ...p, variations: updatedVariations } : p);
        localStorage.setItem('mock_vendor_products', JSON.stringify(updated));
      }
      setBizProducts(prev => prev.map(p => p.id === prodId ? { ...p, variations: updatedVariations } : p));
      toast.success('Stok variasi dikemaskini');
      setEditingVarStock(null);
      return;
    }
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
    if (localStorage.getItem('use_mock_auth') === 'true') {
      const stored = localStorage.getItem('mock_vendor_products');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.map((p: any) => p.id === prodId ? { ...p, stock_quantity: newVal } : p);
        localStorage.setItem('mock_vendor_products', JSON.stringify(updated));
      }
      setBizProducts(prev => prev.map(p => p.id === prodId ? { ...p, stock_quantity: newVal } : p));
      toast.success('Stok produk dikemaskini');
      setEditingBaseStock(null);
      return;
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
    filteredByDate = filteredByBiz.filter(o => {
      const oDate = new Date(o.created_at);
      const [year, month, day] = selectedDateFilter.split('-').map(Number);
      const filterDateStr = new Date(year, month - 1, day).toDateString();
      return oDate.toDateString() === filterDateStr;
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
  // Payment Method/Status Filter
  let filteredByPayment = filteredByProduct;
  if (selectedPaymentFilter !== 'all') {
    filteredByPayment = filteredByProduct.filter(o => {
      if (selectedPaymentFilter === 'cod') {
        return o.payment_method === 'COD';
      }
      if (selectedPaymentFilter === 'qr_paid') {
        return o.payment_method === 'QR_ONLINE' && o.payment_receipt_url && o.payment_verified_at;
      }
      if (selectedPaymentFilter === 'qr_pending') {
        return o.payment_method === 'QR_ONLINE' && o.payment_receipt_url && !o.payment_verified_at && !o.payment_receipt_rejected;
      }
      if (selectedPaymentFilter === 'qr_unpaid') {
        return o.payment_method === 'QR_ONLINE' && (!o.payment_receipt_url || o.payment_receipt_rejected);
      }
      return true;
    });
  }

  const availableVariations = ['all', ...new Set(filteredByPayment.map(o => o.selected_variation).filter(Boolean))];

  // 4. Final filtered orders
  let finalFiltered = filteredByPayment;
  if (selectedVariation !== 'all') {
    finalFiltered = finalFiltered.filter(o => o.selected_variation === selectedVariation);
  }

  // 30-Second Polling for Auto Refresh
  useEffect(() => {
    let interval: any;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadOrders();
        refetchCounts();
        if (selectedBizId !== 'all') {
          loadBizProducts();
        }
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedBizId, user]);

  // Calculate daily totals for last 7 calendar days
  const chartData = React.useMemo(() => {
    const data: Record<string, { date: string; 'Jumlah Hasil (RM)': number; 'Kuantiti Tempahan': number }> = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit' });
      const key = d.toDateString();
      data[key] = {
        date: dateStr,
        'Jumlah Hasil (RM)': 0,
        'Kuantiti Tempahan': 0
      };
    }

    // Populate from finalFiltered
    finalFiltered.forEach(o => {
      const oDate = new Date(o.created_at);
      const key = oDate.toDateString();
      if (data[key]) {
        // Increment order quantity (or count)
        data[key]['Kuantiti Tempahan'] += o.quantity;
        
        // Sum revenue (only if completed)
        if (o.status === 'COMPLETED') {
          data[key]['Jumlah Hasil (RM)'] += o.total_price ?? (o.unit_price * o.quantity);
        }
      }
    });

    return Object.values(data);
  }, [finalFiltered]);

  const lowStockProducts = React.useMemo(() => {
    if (selectedBizId === 'all') return [];
    
    const list: { id: string; name: string; business_id: string; stock_quantity: number; reserved_stock: number }[] = [];
    
    bizProducts.forEach(p => {
      const hasVariations = Array.isArray(p.variations) && p.variations.length > 0;
      if (hasVariations) {
        p.variations.forEach((v: any) => {
          const available = (v.stock ?? 0) - (v.reserved ?? 0);
          if (available <= 5) {
            list.push({
              id: `${p.id}_${v.name}`,
              name: `${p.name} (${v.name})`,
              business_id: p.business_id,
              stock_quantity: v.stock ?? 0,
              reserved_stock: v.reserved ?? 0
            });
          }
        });
      } else {
        const available = (p.stock_quantity ?? 0) - (p.reserved_stock ?? 0);
        if (available <= 5) {
          list.push({
            id: p.id,
            name: p.name,
            business_id: p.business_id,
            stock_quantity: p.stock_quantity ?? 0,
            reserved_stock: p.reserved_stock ?? 0
          });
        }
      }
    });
    
    return list;
  }, [bizProducts, selectedBizId]);

  const lowStockAlertsCount = lowStockProducts.length;

  const handleExportExcel = async () => {
    try {
      if (finalFiltered.length === 0) {
        toast.error('Tiada pesanan untuk dieksport!');
        return;
      }
      
      const workbook = new ExcelJS.Workbook();
      const sheet1 = workbook.addWorksheet('Senarai Pesanan');
      const sheet2 = workbook.addWorksheet('Ringkasan Produk');

      // Styles for header
      const headerStyle = {
        font: { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF59E0B' } // Amber #F59E0B
        },
        alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
        border: {
          bottom: { style: 'thin', color: { argb: 'FFD97706' } }
        }
      };

      // Styles for data rows
      const dataBorder = {
        top: { style: 'thin', color: { argb: 'FFE4E4E7' } },
        left: { style: 'thin', color: { argb: 'FFE4E4E7' } },
        bottom: { style: 'thin', color: { argb: 'FFE4E4E7' } },
        right: { style: 'thin', color: { argb: 'FFE4E4E7' } }
      };

      // --- Sheet 1: Senarai Pesanan ---
      sheet1.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
      
      const columns1 = [
        { header: 'ID Pesanan', key: 'id', width: 38 },
        { header: 'Tarikh', key: 'date', width: 18 },
        { header: 'Nama Pembeli', key: 'buyer_name', width: 22 },
        { header: 'No Matrik', key: 'matric_no', width: 14 },
        { header: 'No Telefon', key: 'phone', width: 16 },
        { header: 'Nama Produk', key: 'product_name', width: 25 },
        { header: 'Variasi', key: 'variation', width: 15 },
        { header: 'Kuantiti', key: 'qty', width: 10 },
        { header: 'Harga Seunit', key: 'unit_price', width: 15 },
        { header: 'Jumlah Harga', key: 'total_price', width: 15 },
        { header: 'Kaedah Bayaran', key: 'payment_method', width: 18 },
        { header: 'Status Bayaran', key: 'payment_status', width: 20 },
        { header: 'Status Pesanan', key: 'order_status', width: 16 },
        { header: 'Nota Pembeli', key: 'buyer_note', width: 30 },
        { header: 'Waktu Pickup', key: 'pickup_time', width: 20 }
      ];
      
      sheet1.columns = columns1;
      
      // Style header row
      const hRow1 = sheet1.getRow(1);
      hRow1.height = 28;
      columns1.forEach((_, colIndex) => {
        const cell = hRow1.getCell(colIndex + 1);
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill as any;
        cell.alignment = headerStyle.alignment as any;
        cell.border = headerStyle.border as any;
      });

      // Populate sheet 1
      finalFiltered.forEach(o => {
        // Format date
        const dateStr = new Date(o.created_at).toLocaleString('ms-MY', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Determine Payment Status
        let payStatus = 'Belum Bayar';
        if (o.payment_method === 'COD') {
          payStatus = o.status === 'COMPLETED' ? 'Selesai (Tunai)' : 'Bayar Semasa Ambil (COD)';
        } else if (o.payment_method === 'QR_ONLINE') {
          if (o.payment_verified_at) {
            payStatus = 'Disahkan';
          } else if (o.payment_receipt_url) {
            payStatus = o.payment_receipt_rejected ? 'Ditolak (Resit Tidak Sah)' : 'Menunggu Pengesahan';
          }
        }

        const rowValues = {
          id: o.id,
          date: dateStr,
          buyer_name: o.buyer?.full_name || 'Pembeli',
          matric_no: o.buyer?.matric_no || 'N/A',
          phone: o.buyer?.phone || 'N/A',
          product_name: o.business_products?.name || 'Produk',
          variation: o.selected_variation || 'Tiada',
          qty: o.quantity,
          unit_price: o.unit_price,
          total_price: o.total_price ?? (o.unit_price * o.quantity),
          payment_method: o.payment_method || 'COD',
          payment_status: payStatus,
          order_status: STATUS_CONFIG[o.status]?.label || o.status,
          buyer_note: o.note || 'N/A',
          pickup_time: o.pickup_time || 'N/A'
        };

        const addedRow = sheet1.addRow(rowValues);
        addedRow.height = 20;

        // Apply borders, alignments, and number formats
        addedRow.eachCell((cell, colIndex) => {
          cell.border = dataBorder;
          cell.font = { name: 'Segoe UI', size: 10 };
          
          // Alignments
          if ([1, 2, 4, 5, 8, 9, 10, 11, 12, 13, 15].includes(colIndex)) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }

          // Currency formats
          if (colIndex === 9 || colIndex === 10) {
            cell.numFormat = '"RM" #,##0.00';
          }
        });
      });

      // --- Sheet 2: Ringkasan Produk ---
      sheet2.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

      const columns2 = [
        { header: 'Nama Produk', key: 'product_name', width: 35 },
        { header: 'Variasi', key: 'variation', width: 20 },
        { header: 'Jumlah Kuantiti Dipesan', key: 'total_qty', width: 22 },
        { header: 'Anggaran Kos Seunit', key: 'unit_price', width: 20 },
        { header: 'Jumlah Anggaran Kos', key: 'total_cost', width: 22 }
      ];

      sheet2.columns = columns2;

      // Style header row
      const hRow2 = sheet2.getRow(1);
      hRow2.height = 28;
      columns2.forEach((_, colIndex) => {
        const cell = hRow2.getCell(colIndex + 1);
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill as any;
        cell.alignment = headerStyle.alignment as any;
        cell.border = headerStyle.border as any;
      });

      // Aggregate products & variations
      const aggregation: Record<string, { product_name: string; variation: string; qty: number; unit_price: number }> = {};
      
      finalFiltered.forEach(o => {
        const name = o.business_products?.name || 'Produk';
        const variation = o.selected_variation || 'Tiada';
        const key = `${name}_${variation}`;
        
        if (!aggregation[key]) {
          aggregation[key] = {
            product_name: name,
            variation: variation,
            qty: 0,
            unit_price: o.unit_price
          };
        }
        aggregation[key].qty += o.quantity;
      });

      Object.values(aggregation).forEach(item => {
        const rowValues = {
          product_name: item.product_name,
          variation: item.variation,
          total_qty: item.qty,
          unit_price: item.unit_price,
          total_cost: item.qty * item.unit_price
        };

        const addedRow = sheet2.addRow(rowValues);
        addedRow.height = 20;

        addedRow.eachCell((cell, colIndex) => {
          cell.border = dataBorder;
          cell.font = { name: 'Segoe UI', size: 10 };

          // Alignments
          if ([2, 3, 4, 5].includes(colIndex)) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }

          // Currency formats
          if (colIndex === 4 || colIndex === 5) {
            cell.numFormat = '"RM" #,##0.00';
          }
        });
      });

      // Auto-fit column widths (with margin)
      [sheet1, sheet2].forEach(sheet => {
        sheet.columns.forEach(col => {
          let maxLen = 0;
          col.eachCell({ includeEmpty: true }, cell => {
            const val = cell.value ? cell.value.toString() : '';
            if (val.length > maxLen) {
              maxLen = val.length;
            }
          });
          col.width = Math.max(maxLen + 4, 12);
        });
      });

      // Write to buffer and save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `PolyMart_Laporan_Pesanan_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success('Laporan Excel berjaya dimuat turun!');
    } catch (err: any) {
      console.error('Error generating Excel:', err);
      toast.error('Ralat semasa menjana fail Excel: ' + err.message);
    }
  };

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
  const cancelled = finalFiltered.filter(o => o.status === 'CANCELLED');

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
    cancelled: cancelled,
    all: finalFiltered
  };

  // Global counts for active business (ignores search queries, categories, variations, and dates)
  const globalActionsRequired = filteredByBiz.filter(o => o.status === 'PENDING');
  const globalProcessing = filteredByBiz.filter(o => ['CONFIRMED', 'READY'].includes(o.status));
  const globalCompleted = filteredByBiz.filter(o => o.status === 'COMPLETED');
  const globalCancelled = filteredByBiz.filter(o => o.status === 'CANCELLED');
  const globalAll = filteredByBiz;

  const globalUnpaid = filteredByBiz.filter(o => 
    o.status === 'PENDING' && 
    o.payment_method === 'QR_ONLINE' && 
    (!o.payment_receipt_url || o.payment_receipt_rejected)
  );

  const globalAwaitingVerification = filteredByBiz.filter(o => 
    o.status === 'PENDING' && (
      o.payment_method === 'COD' || 
      (o.payment_method === 'QR_ONLINE' && o.payment_receipt_url && !o.payment_verified_at && !o.payment_receipt_rejected)
    )
  );
  
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

  const handleBulkReady = async () => {
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

      if (localStorage.getItem('use_mock_auth') === 'true') {
        const storedOrders = localStorage.getItem('mock_vendor_orders');
        if (storedOrders) {
          const parsed = JSON.parse(storedOrders);
          const updated = parsed.map((o: any) => {
            if (allItemOrderIds.includes(o.id)) {
              return {
                ...o,
                status: 'READY',
                ready_at: now,
                updated_at: now,
              };
            }
            return o;
          });
          localStorage.setItem('mock_vendor_orders', JSON.stringify(updated));
        }
      } else {
        const { error } = await supabase
          .from('polymart_orders')
          .update({
            status: 'READY',
            ready_at: now,
            updated_at: now
          })
          .in('id', allItemOrderIds);

        if (error) throw error;
      }

      await Promise.all(selectedGroups.map(async (group) => {
        const buyerId = group.buyer?.id;
        if (buyerId) {
          const itemsDesc = group.items.map(i => `${i.quantity}x ${i.name}${i.selected_variation ? ` (${i.selected_variation})` : ''}`).join(', ');
          
          await sendNotificationToUser(buyerId, {
            title: '🎉 Pesanan Siap Diambil!',
            message: `Pesanan anda (${itemsDesc}) sudah siap. Sila datang ambil!`,
            type: 'polymart_order_ready',
            module: 'POLYMART',
            link: '/polymart/pesanan-saya',
            reference_id: group.id
          });

          if (group.share_phone && group.buyer?.phone) {
            const phone = group.buyer.phone.replace(/\D/g, '').replace(/^0/, '60');
            const waMsg = encodeURIComponent(`Hai ${group.buyer.full_name}! Pesanan anda di PolyMart sudah siap sedia untuk diambil 🎉\n\n📦 ${itemsDesc}\n\nSila datang ambil di kedai kami. Terima kasih!`);
            const waUrl = `https://wa.me/${phone}?text=${waMsg}`;
            window.open(waUrl, '_blank');
          }
        }
      }));

      toast.success(`Berjaya menukar status ${allItemOrderIds.length} pesanan kepada Siap Diambil secara pukal!`);
      setSelectedOrderIds([]);
      handleUpdate();
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal menukar status secara pukal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {localStorage.getItem('use_mock_auth') === 'true' && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/35 text-amber-500 animate-in fade-in slide-in-from-top-3">
          <AlertTriangle className="w-5 h-5 animate-pulse shrink-0" />
          <div className="text-left flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-wider">Mod Pembangunan Aktif (Mock Mode)</p>
            <p className="text-[10px] text-amber-500/70 font-semibold mt-0.5 leading-normal">
              Anda sedang melihat dashboard peniaga menggunakan data olok-olok (mock). Sebarang perubahan disimpan dalam storan penyemak imbas anda (localStorage).
            </p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('mock_vendor_orders');
              localStorage.removeItem('mock_vendor_products');
              localStorage.removeItem('mock_vendor_ads');
              toast.success('Mock data direset!');
              window.location.reload();
            }}
            className="px-3 py-1.5 bg-amber-500 text-white rounded-xl text-[10px] font-black shadow-md hover:brightness-110 active:scale-95 transition-all shrink-0"
          >
            Reset Data
          </button>
        </div>
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/10 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-black text-foreground">Dashboard Peniaga</h1>
            
            {myBusinesses.length > 1 && (
              <div className="relative">
                <select
                  value={selectedBizId}
                  onChange={(e) => handleBizChange(e.target.value)}
                  className="h-8 pl-3 pr-8 rounded-xl text-xs bg-amber-500/10 border border-amber-500/30 outline-none appearance-none text-amber-500 font-black cursor-pointer hover:bg-amber-500/20 transition-all"
                >
                  <option value="all">Semua Kedai</option>
                  {myBusinesses.map(b => (
                    <option key={b.id} value={b.id} className="bg-neutral-900 text-foreground font-semibold">
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2 pointer-events-none text-amber-500" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Urus pesanan & stok produk PolyMart anda</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all ${
              autoRefresh
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 ring-1 ring-emerald-500/20'
                : 'bg-zinc-100 dark:bg-zinc-950/20 ring-1 ring-zinc-200 dark:ring-zinc-800/30 border border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
            <span>Kemas Kini Auto {autoRefresh ? '(On)' : '(Off)'}</span>
          </button>

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
        <StatCard 
          label="Pesanan Hari Ini" 
          value={todayOrders.length} 
          icon={ShoppingBag} 
          color={PM_ACCENT} 
          onClick={() => {
            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;
            setActiveMainTab('orders');
            setActiveOrderTab('all');
            handleDateChange(todayStr);
          }}
        />
        <StatCard 
          label="Menunggu Sahkan"  
          value={awaitingVerification.length} 
          icon={Clock} 
          color="#f97316" 
          onClick={() => {
            setActiveMainTab('orders');
            setActiveOrderTab('actions');
            setActiveActionSubTab('verification');
            handleDateChange('all');
          }}
        />
        <StatCard 
          label="Aktif Sekarang"   
          value={activeOrders.length} 
          icon={Package} 
          color="#6366f1" 
          onClick={() => {
            setActiveMainTab('orders');
            setActiveOrderTab('processing');
            handleDateChange('all');
          }}
        />
        <StatCard 
          label="Hasil Selesai"    
          value={`RM ${totalRev.toFixed(0)}`} 
          icon={TrendingUp} 
          color="#22c55e" 
          onClick={() => {
            setActiveMainTab('orders');
            setActiveOrderTab('completed');
            handleDateChange('all');
          }}
        />
      </motion.div>

      {/* Analytics & Stock Warnings Collapsible Panel */}
      <div className="rounded-[1.25rem] bg-zinc-100 dark:bg-zinc-950/20 ring-1 ring-zinc-200 dark:ring-zinc-800/30 p-0.5 shadow-sm transition-all duration-300">
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-[calc(1.25rem-0.125rem)] overflow-hidden">
          {/* Header click area */}
          <button
            onClick={() => setShowAnalyticsPanel(!showAnalyticsPanel)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/20 transition-all cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-amber-500" />
              <span className="text-[12px] font-black uppercase tracking-wider text-foreground">Analitik & Amaran Stok</span>
            </div>
            <div className="flex items-center gap-2">
              {/* If there are low stock items, show badge */}
              {lowStockAlertsCount > 0 && (
                <span className="text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-full animate-pulse">
                  {lowStockAlertsCount} Amaran
                </span>
              )}
              {showAnalyticsPanel ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>

          <AnimatePresence>
            {showAnalyticsPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-border/20 p-4 space-y-4"
              >
                {/* Low Stock Warnings list */}
                {lowStockProducts.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-rose-400/80 uppercase tracking-widest block">Amaran Inventori</span>
                    <div className="grid grid-cols-1 gap-2">
                      {lowStockProducts.map(p => {
                        const available = p.stock_quantity - p.reserved_stock;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setActiveMainTab('products');
                              toast('Menavigasi ke tab Urus Produk...');
                            }}
                            className="group flex items-center justify-between p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 animate-bounce" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                                <p className="text-[10px] text-muted-foreground/80 mt-0.5">Kedai: {myBusinesses.find(b => b.id === p.business_id)?.name || 'N/A'}</p>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-black text-rose-400 shrink-0">
                              Sisa: {available} unit
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Daily pre-order sales trend AreaChart */}
                <div className="space-y-2.5">
                  <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-widest block">Trend Pra-Pesanan (7 Hari Terakhir)</span>
                  
                  {chartData.length === 0 ? (
                    <div className="h-48 rounded-xl bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-border/30 flex items-center justify-center text-xs text-muted-foreground font-semibold">
                      Tiada data jualan untuk tempoh ini.
                    </div>
                  ) : (
                    <div className="h-48 w-full bg-zinc-50 dark:bg-zinc-950/30 p-2 border border-zinc-200 dark:border-border/30 rounded-xl">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800/60" vertical={false} />
                          <XAxis dataKey="date" stroke="currentColor" className="text-zinc-500" fontSize={10} tickLine={false} />
                          <YAxis yAxisId="left" stroke="#f59e0b" fontSize={10} tickLine={false} />
                          <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={10} tickLine={false} />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: '0.75rem',
                              fontSize: '11px',
                              fontFamily: 'Segoe UI, system-ui',
                              color: 'var(--foreground)'
                            }}
                          />
                          <Area yAxisId="left" type="monotone" dataKey="Jumlah Hasil (RM)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                          <Area yAxisId="right" type="monotone" dataKey="Kuantiti Tempahan" stroke="#6366f1" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
                  showAdvancedFilters 
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-500' 
                    : 'bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Filter className="w-4.5 h-4.5" />
              </button>

              {/* Eksport Excel Button */}
              <button 
                onClick={handleExportExcel}
                className="px-3.5 h-10 rounded-xl flex items-center gap-1.5 border bg-muted/30 border-border/40 text-muted-foreground hover:text-amber-500 hover:border-amber-500/30 transition-all font-semibold text-xs shrink-0"
                title="Eksport data pesanan ke Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                <span className="hidden md:inline">Eksport Excel</span>
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
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 p-3 rounded-2xl bg-card/40 border border-border/40">
                    {/* Business Selector */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider block">Kedai</span>
                      <div className="relative">
                        <select
                          value={selectedBizId}
                          onChange={(e) => handleBizChange(e.target.value)}
                          className="w-full h-8.5 pl-3 pr-8 rounded-lg text-xs bg-muted/40 border border-border outline-none appearance-none text-foreground font-bold cursor-pointer"
                        >
                          <option value="all">Semua Kedai</option>
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
                      <div className="relative flex items-center">
                        <input
                          type="date"
                          value={selectedDateFilter === 'all' ? '' : selectedDateFilter}
                          onChange={(e) => handleDateChange(e.target.value || 'all')}
                          className="w-full h-8.5 px-3 rounded-lg text-xs bg-muted/40 border border-border outline-none text-foreground font-bold cursor-pointer [color-scheme:dark] focus:border-amber-500/50 transition-all"
                        />
                        {selectedDateFilter !== 'all' && (
                          <button
                            onClick={() => handleDateChange('all')}
                            className="absolute right-8 text-muted-foreground hover:text-rose-500 p-1"
                            title="Reset Tarikh"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {/* Quick date pills */}
                      <div className="flex gap-1 overflow-x-auto scrollbar-hide pt-1">
                        {[
                          { label: 'Hari Ini', val: () => {
                            const d = new Date();
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                          }},
                          { label: 'Semalam', val: () => {
                            const d = new Date();
                            d.setDate(d.getDate() - 1);
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                          }},
                          { label: 'Semua', val: () => 'all' }
                        ].map(chip => {
                          const valStr = chip.val();
                          const active = selectedDateFilter === valStr;
                          return (
                            <button
                              key={chip.label}
                              type="button"
                              onClick={() => handleDateChange(valStr)}
                              className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold transition-all border shrink-0 ${
                                active 
                                  ? 'bg-amber-500 border-amber-500 text-white' 
                                  : 'bg-muted/20 border-border/30 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {chip.label}
                            </button>
                          );
                        })}
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
                          <option value="all">Semua Kategori</option>
                          {availableCategories.filter(c => c !== 'all').map(c => (
                            <option key={c} value={c}>{c}</option>
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
                          <option value="all">Semua Produk</option>
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
                          <option value="all">Semua Variasi</option>
                          {availableVariations.filter(v => v !== 'all').map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 pointer-events-none text-muted-foreground/50" />
                      </div>
                    </div>

                    {/* Payment Selector */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider block">Bayaran</span>
                      <div className="relative">
                        <select
                          value={selectedPaymentFilter}
                          onChange={(e) => setSelectedPaymentFilter(e.target.value)}
                          className="w-full h-8.5 pl-3 pr-8 rounded-lg text-xs bg-muted/40 border border-border outline-none appearance-none text-foreground font-bold cursor-pointer"
                        >
                          <option value="all">Semua Cara</option>
                          <option value="cod">COD (Tunai)</option>
                          <option value="qr_paid">QR - Telah Bayar</option>
                          <option value="qr_pending">QR - Semak Resit</option>
                          <option value="qr_unpaid">QR - Belum Bayar</option>
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
          <div id="vendor-order-list-start" className="flex gap-2 border-b border-border/30 overflow-x-auto scrollbar-hide pb-2 scroll-mt-20">
            {[
              { key: 'actions', label: 'Tindakan Diperlukan', icon: Clock, count: globalActionsRequired.length },
              { key: 'processing', label: 'Sedang Diproses', icon: TrendingUp, count: globalProcessing.length },
              { key: 'completed', label: 'Selesai', icon: CheckCircle, count: globalCompleted.length },
              { key: 'cancelled', label: 'Dibatalkan', icon: XCircle, count: globalCancelled.length },
              { key: 'all', label: 'Semua Jualan', icon: Package, count: globalAll.length }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button 
                  key={tab.key}
                  onClick={() => setActiveOrderTab(tab.key as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-black shrink-0 transition-all ${
                    activeOrderTab === tab.key 
                      ? 'bg-amber-500 text-white shadow-md' 
                      : 'bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                      activeOrderTab === tab.key ? 'bg-white text-amber-500' : 'bg-muted text-muted-foreground'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-Filters inside "Tindakan Diperlukan" */}
          {activeOrderTab === 'actions' && (
            <div className="flex gap-2 p-1 bg-muted/15 rounded-xl border border-border/30 w-fit">
              {[
                { key: 'all_actions', label: 'Semua Tindakan', count: globalActionsRequired.length },
                { key: 'unpaid', label: 'Belum Bayar (QR)', count: globalUnpaid.length },
                { key: 'verification', label: 'Menunggu Pengesahan', count: globalAwaitingVerification.length }
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
                      className="px-4 py-2 rounded-xl text-[11px] font-black text-white bg-emerald-500 hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-md flex items-center gap-1.5"
                    >
                      {loading ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Sahkan...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Sahkan Pukal</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Bulk Ready banner in processing tab */}
          {activeOrderTab === 'processing' && displayed.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl border border-green-500/20 bg-green-500/5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-green-550">Kumpulan Pesanan Diproses</p>
                  <p className="text-lg font-black text-foreground mt-0.5">{displayed.length} pesanan</p>
                </div>
              </div>
 
              <div className="flex items-center justify-between pt-3 border-t border-green-500/10">
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
                    <span className="text-[11px] font-black text-green-500">
                      Pilih: {selectedOrderIds.length} pesanan
                    </span>
                    <button
                      onClick={handleBulkReady}
                      disabled={loading}
                      className="px-4 py-2 rounded-xl text-[11px] font-black text-white bg-green-600 hover:bg-green-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-md flex items-center gap-1.5"
                    >
                      {loading ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <Package className="w-3.5 h-3.5" />
                          <span>Siap Diambil Pukal</span>
                        </>
                      )}
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
            <div className="flex flex-col items-center justify-center py-16 gap-3.5 bg-card/15 rounded-2xl border border-border/20">
              <div className="w-12 h-12 rounded-full bg-muted/30 border border-border/40 flex items-center justify-center text-muted-foreground/35">
                <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
              </div>
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
                    showCheckbox={(activeOrderTab === 'actions' && activeActionSubTab === 'verification') || activeOrderTab === 'processing'}
                    bizName={myBusinesses.find(b => b.id === o.business_id)?.name}
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
                          : getCategoryIcon(p.category)
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
                            const varAvailable = v.stock - (v.reserved || 0);
                            const isLowVar = varAvailable <= 5;
                            return (
                              <div key={v.name} className="flex items-center justify-between pt-2 first:pt-0 text-[11px]">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-foreground uppercase bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg text-[9px] text-amber-500">
                                    {v.name}
                                  </span>
                                  {isLowVar && (
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 uppercase tracking-wide animate-pulse flex items-center gap-0.5 shrink-0">
                                      <AlertTriangle className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                                      <span>Stok Rendah</span>
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <div className="text-right shrink-0 mr-1.5">
                                    <p className="font-bold text-foreground">Stok Fizikal: {v.stock} unit</p>
                                    {v.reserved > 0 && (
                                      <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                                        Ditempah: {v.reserved}
                                      </p>
                                    )}
                                    <p className={`text-[9.5px] font-black ${isLowVar ? 'text-rose-500' : 'text-emerald-500'}`}>
                                      Boleh Dijual: {varAvailable}
                                    </p>
                                  </div>

                                  {isEditing ? (
                                    <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1 shadow-inner">
                                      <button 
                                        onClick={() => setEditingVarStock(prev => prev ? { ...prev, value: Math.max(0, parseInt(prev.value || '0') - 1).toString() } : null)}
                                        className="w-7 h-7 bg-muted/50 border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg flex items-center justify-center transition-all"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <input 
                                        type="number"
                                        value={editingVarStock.value}
                                        onChange={(e) => setEditingVarStock(prev => prev ? { ...prev, value: e.target.value } : null)}
                                        className="w-12 h-7 bg-transparent border-0 text-center font-black text-xs text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="Kuantiti"
                                      />
                                      <button 
                                        onClick={() => setEditingVarStock(prev => prev ? { ...prev, value: (parseInt(prev.value || '0') + 1).toString() } : null)}
                                        className="w-7 h-7 bg-muted/50 border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg flex items-center justify-center transition-all"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      
                                      <div className="w-px h-5 bg-border/40 mx-1" />

                                      <button 
                                        onClick={() => handleSaveVariationStock(p.id, p.variations, v.name, editingVarStock.value)}
                                        className="w-7 h-7 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg flex items-center justify-center shadow-md active:scale-95 transition-all"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => setEditingVarStock(null)}
                                        className="w-7 h-7 bg-rose-500 text-white hover:bg-rose-600 rounded-lg flex items-center justify-center shadow-md active:scale-95 transition-all"
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
                          <div className="mt-1 space-y-1">
                            <p className="text-[11px] font-bold text-foreground">
                              Stok Fizikal: <span className="font-extrabold">{p.stock_quantity ?? 0}</span> unit
                            </p>
                            {(p.reserved_stock || 0) > 0 && (
                              <p className="text-[9.5px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>Ditempah: {p.reserved_stock} unit</span>
                              </p>
                            )}
                            <p className={`text-[11px] font-black flex items-center gap-1 ${
                              (p.stock_quantity ?? 0) - (p.reserved_stock ?? 0) <= 5
                                ? 'text-rose-500'
                                : 'text-emerald-500'
                            }`}>
                              <span>Boleh Dijual: {(p.stock_quantity ?? 0) - (p.reserved_stock ?? 0)} unit</span>
                              {(p.stock_quantity ?? 0) - (p.reserved_stock ?? 0) <= 5 && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 uppercase tracking-wide animate-pulse flex items-center gap-1 shrink-0">
                                  <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                  <span>Stok Rendah</span>
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {editingBaseStock?.productId === p.id ? (
                            <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1 shadow-inner">
                              <button 
                                onClick={() => setEditingBaseStock(prev => prev ? { ...prev, value: Math.max(0, parseInt(prev.value || '0') - 1).toString() } : null)}
                                className="w-7 h-7 bg-muted/50 border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg flex items-center justify-center transition-all"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input 
                                type="number"
                                value={editingBaseStock.value}
                                onChange={(e) => setEditingBaseStock(prev => prev ? { ...prev, value: e.target.value } : null)}
                                className="w-12 h-7 bg-transparent border-0 text-center font-black text-xs text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button 
                                onClick={() => setEditingBaseStock(prev => prev ? { ...prev, value: (parseInt(prev.value || '0') + 1).toString() } : null)}
                                className="w-7 h-7 bg-muted/50 border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg flex items-center justify-center transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              
                              <div className="w-px h-5 bg-border/40 mx-1" />

                              <button 
                                onClick={() => handleSaveBaseStock(p.id, editingBaseStock.value)}
                                className="w-7 h-7 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg flex items-center justify-center shadow-md active:scale-95 transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setEditingBaseStock(null)}
                                className="w-7 h-7 bg-rose-500 text-white hover:bg-rose-600 rounded-lg flex items-center justify-center shadow-md active:scale-95 transition-all"
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

      {/* Floating Sticky Bottom Bar for Mobile - Switch order status tabs quickly */}
      {activeMainTab === 'orders' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-3 py-2 rounded-full border border-zinc-200 dark:border-zinc-800/60 shadow-lg flex items-center gap-1.5 max-w-[92vw] w-max sm:hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {[
            { key: 'actions', label: 'Tindakan', icon: Clock, count: globalActionsRequired.length, action: () => {
              setActiveOrderTab('actions');
              const element = document.getElementById('vendor-order-list-start');
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }},
            { key: 'processing', label: 'Proses', icon: TrendingUp, count: globalProcessing.length, action: () => {
              setActiveOrderTab('processing');
              const element = document.getElementById('vendor-order-list-start');
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }},
            { key: 'home', label: 'Home', icon: Home, count: 0, action: () => navigate('/polymart') },
            { key: 'cancelled', label: 'Batal', icon: XCircle, count: globalCancelled.length, action: () => {
              setActiveOrderTab('cancelled');
              const element = document.getElementById('vendor-order-list-start');
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }},
            { key: 'all', label: 'Semua', icon: Package, count: globalAll.length, action: () => {
              setActiveOrderTab('all');
              const element = document.getElementById('vendor-order-list-start');
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeOrderTab === tab.key;
            const isHomeButton = tab.key === 'home';
            return (
              <button
                key={tab.key}
                onClick={tab.action}
                className={`relative flex flex-col items-center justify-center w-12 py-1.5 rounded-xl transition-all ${
                  isHomeButton
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30 font-black scale-105 animate-pulse'
                    : isActive 
                    ? 'text-amber-500 font-extrabold' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={isHomeButton ? "w-4 h-4 stroke-[2.5]" : "w-4 h-4 stroke-[2]"} />
                <span className={`text-[8.5px] tracking-tighter mt-0.5 ${isHomeButton ? 'font-black text-white' : 'font-black'}`}>{tab.label}</span>
                {tab.count > 0 && !isHomeButton && (
                  <span className="absolute -top-1.5 -right-1 min-w-4 h-4 px-1 rounded-full text-[8.5px] font-black flex items-center justify-center shadow-sm bg-red-500 text-white animate-pulse">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
