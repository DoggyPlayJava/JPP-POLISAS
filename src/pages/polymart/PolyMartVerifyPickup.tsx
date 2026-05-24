import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PM_ACCENT, PM_LIGHT, PM_GRADIENT, CATEGORY_EMOJI } from './PolyMartLayout';
import toast from 'react-hot-toast';
import {
  Package, CheckCircle, Clock, CreditCard, Handshake,
  User, ShoppingBag, AlertCircle, ArrowLeft, Loader2,
} from 'lucide-react';

interface VerifyOrder {
  id: string;
  status: string;
  payment_method: string | null;
  payment_verified_at: string | null;
  payment_receipt_url: string | null;
  quantity: number;
  unit_price: number;
  total_price: number | null;
  note: string | null;
  pickup_time: string | null;
  created_at: string;
  business_id: string;
  product: {
    id: string;
    name: string;
    image_url: string | null;
    category: string;
  } | null;
  buyer: {
    full_name: string;
    matric_no: string;
  } | null;
  business: {
    id: string;
    name: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:   { label: 'Menunggu Bayaran',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <Clock className="w-4 h-4" /> },
  CONFIRMED: { label: 'Bayaran Disahkan', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: <CreditCard className="w-4 h-4" /> },
  READY:     { label: 'Sedia Diambil',    color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: <Package className="w-4 h-4" /> },
  COMPLETED: { label: 'Selesai',          color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: <CheckCircle className="w-4 h-4" /> },
  CANCELLED: { label: 'Dibatalkan',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: <AlertCircle className="w-4 h-4" /> },
};

export function PolyMartVerifyPickup() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, hasKeusahawananAccess } = useAuth();

  const [order, setOrder] = useState<VerifyOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [readying, setReadying] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!orderId || !user) return;
    const load = async () => {
      // Fetch order
      const { data, error } = await supabase
        .from('polymart_orders')
        .select(`
          id, status, payment_method, payment_verified_at, payment_receipt_url,
          quantity, unit_price, total_price, note, pickup_time, created_at, business_id,
          product:business_products!product_id(id, name, image_url, category),
          buyer:profiles!buyer_id(full_name, matric_no),
          business:keusahawanan_businesses!business_id(id, name)
        `)
        .eq('id', orderId)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      setOrder(data as unknown as VerifyOrder);

      // Check authorization — JPP Exco/SuperAdmin/YDP bypasses, otherwise owner or active member
      if (hasKeusahawananAccess) {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      const [ownerRes, memberRes] = await Promise.all([
        supabase
          .from('keusahawanan_businesses')
          .select('id')
          .eq('id', data.business_id)
          .eq('owner_id', user.id)
          .eq('status', 'ACTIVE')
          .maybeSingle(),
        supabase
          .from('student_business_memberships')
          .select('id')
          .eq('business_id', data.business_id)
          .eq('user_id', user.id)
          .eq('status', 'ACTIVE')
          .maybeSingle()
      ]);

      setAuthorized(!!ownerRes.data || !!memberRes.data);
      setLoading(false);
    };
    load();
  }, [orderId, user, hasKeusahawananAccess]);

  const markReady = async () => {
    if (!order) return;
    setReadying(true);
    const { error } = await supabase
      .from('polymart_orders')
      .update({ status: 'READY', updated_at: new Date().toISOString() })
      .eq('id', order.id);
    if (error) {
      toast.error('Gagal mengemaskini status');
    } else {
      toast.success('Pesanan ditanda sedia!', { icon: '📦' });
      setOrder(prev => prev ? { ...prev, status: 'READY' } : prev);
    }
    setReadying(false);
  };

  const markCompleted = async () => {
    if (!order) return;
    setCompleting(true);
    const { error } = await supabase.rpc('complete_polymart_order', {
      p_order_id: order.id,
      p_business_id: order.business_id,
      p_product_id: order.product?.id,
      p_quantity: order.quantity,
      p_unit_price: order.unit_price,
      p_payment_method: order.payment_method === 'QR_ONLINE' ? 'QR' : 'CASH',
      p_served_by: user?.id
    });
    if (error) {
      toast.error(error.message || 'Gagal menyelesaikan pesanan');
    } else {
      setCompleted(true);
      setOrder(prev => prev ? { ...prev, status: 'COMPLETED' } : prev);
      toast.success('Pesanan selesai!', { icon: '🎉', style: { borderRadius: '16px', fontWeight: 700 } });
    }
    setCompleting(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: PM_ACCENT, borderTopColor: 'transparent' }} />
    </div>
  );

  if (!order) return (
    <div className="text-center py-20">
      <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-sm font-bold text-foreground">Pesanan tidak dijumpai</p>
      <p className="text-xs text-muted-foreground mt-1">ID pesanan tidak sah atau tidak wujud.</p>
      <button onClick={() => navigate('/polymart')}
        className="mt-4 px-5 py-2 rounded-xl text-xs font-bold text-white"
        style={{ background: PM_GRADIENT }}>
        Kembali ke PolyMart
      </button>
    </div>
  );

  if (!authorized) return (
    <div className="text-center py-20">
      <AlertCircle className="w-12 h-12 text-rose-500/30 mx-auto mb-3" />
      <p className="text-sm font-bold text-foreground">Akses Ditolak</p>
      <p className="text-xs text-muted-foreground mt-1">Anda bukan ahli perniagaan ini.</p>
    </div>
  );

  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  const emoji = CATEGORY_EMOJI[order.product?.category ?? ''] ?? '📦';
  const totalAmt = order.total_price ?? (order.unit_price * order.quantity);
  const shortId = order.id.slice(0, 8).toUpperCase();
  const paymentLabel = order.payment_method === 'QR_ONLINE' ? '💳 QR Online' : '🤝 Bersemuka (COD)';
  const paymentVerified = !!order.payment_verified_at;

  return (
    <div className="max-w-md mx-auto space-y-4 pb-8">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      {/* Completed Celebration */}
      {completed && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3 py-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/5">
          <CheckCircle className="w-14 h-14 text-emerald-500" />
          <p className="text-lg font-black text-foreground">Pesanan Selesai!</p>
          <p className="text-xs text-muted-foreground">Terima kasih. Pesanan telah ditandakan selesai.</p>
        </motion.div>
      )}

      {/* Order Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-3xl border border-border/50 bg-card shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Pesanan</p>
            <p className="text-xl font-black text-foreground">#{shortId}</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black"
            style={{ background: statusCfg.bg, color: statusCfg.color }}>
            {statusCfg.icon}
            <span>{statusCfg.label}</span>
          </div>
        </div>

        {/* Payment Status */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30 mb-4">
          <div className="flex items-center gap-2">
            {order.payment_method === 'QR_ONLINE'
              ? <CreditCard className="w-4 h-4 text-blue-500" />
              : <Handshake className="w-4 h-4 text-amber-500" />
            }
            <span className="text-xs font-bold text-foreground">{paymentLabel}</span>
          </div>
          {order.payment_method === 'QR_ONLINE' && (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              paymentVerified
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-amber-500/10 text-amber-600'
            }`}>
              {paymentVerified ? '✅ Disahkan' : '⏳ Belum Disahkan'}
            </span>
          )}
        </div>

        {/* Product */}
        <div className="flex gap-3 p-3 rounded-2xl bg-muted/10 border border-border/20">
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ background: PM_LIGHT }}>
            {order.product?.image_url
              ? <img src={order.product.image_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              : <div className="w-full h-full flex items-center justify-center text-2xl">{emoji}</div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-foreground leading-tight truncate">{order.product?.name ?? 'Produk'}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">×{order.quantity} @ RM {order.unit_price.toFixed(2)}</p>
            <p className="text-base font-black mt-1" style={{ color: PM_ACCENT }}>RM {totalAmt.toFixed(2)}</p>
          </div>
        </div>
      </motion.div>

      {/* Buyer Info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="p-5 rounded-3xl border border-border/50 bg-card shadow-sm space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Maklumat Pembeli</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-black text-foreground">{order.buyer?.full_name ?? 'Tidak diketahui'}</p>
            <p className="text-[11px] text-muted-foreground">{order.buyer?.matric_no ?? '-'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-muted/20 border border-border/20">
            <p className="text-[9px] font-bold text-muted-foreground/50 uppercase mb-0.5">Tarikh Tempah</p>
            <p className="font-bold text-foreground">
              {new Date(order.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/20 border border-border/20">
            <p className="text-[9px] font-bold text-muted-foreground/50 uppercase mb-0.5">Masa Ambil</p>
            <p className="font-bold text-foreground">{order.pickup_time ?? '-'}</p>
          </div>
        </div>
        {order.note && (
          <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
            <p className="text-[9px] font-bold text-amber-600/60 uppercase mb-0.5">Nota</p>
            <p className="text-xs text-foreground">{order.note}</p>
          </div>
        )}
      </motion.div>

      {/* Receipt Preview (if QR) */}
      {order.payment_method === 'QR_ONLINE' && order.payment_receipt_url && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="p-5 rounded-3xl border border-border/50 bg-card shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-3">Resit Pembayaran</p>
          <a href={order.payment_receipt_url} target="_blank" rel="noopener noreferrer">
            <img src={order.payment_receipt_url} alt="Resit"
              className="w-full rounded-2xl border border-border/30 max-h-60 object-contain bg-muted/20 cursor-pointer hover:opacity-80 transition-opacity" />
          </a>
        </motion.div>
      )}

      {/* Action Buttons */}
      {!completed && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="space-y-2">
          {order.status === 'CONFIRMED' && (
            <button onClick={markReady} disabled={readying}
              className="w-full h-14 rounded-2xl text-white font-black text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              {readying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
              {readying ? 'Mengemaskini...' : '📦 Pesanan Sedia Diambil'}
            </button>
          )}
          {order.status === 'READY' && (
            <button onClick={markCompleted} disabled={completing}
              className="w-full h-14 rounded-2xl text-white font-black text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              {completing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {completing ? 'Mengemaskini...' : '✅ Tandakan Selesai'}
            </button>
          )}
          {(order.status === 'PENDING' || order.status === 'CANCELLED' || order.status === 'COMPLETED') && (
            <div className="text-center py-4 rounded-2xl bg-muted/20 border border-border/30">
              <p className="text-xs text-muted-foreground font-bold">
                {order.status === 'PENDING' && 'Menunggu pembayaran dari pembeli'}
                {order.status === 'CANCELLED' && 'Pesanan telah dibatalkan'}
                {order.status === 'COMPLETED' && 'Pesanan telah selesai'}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Business Info */}
      <div className="text-center text-[10px] text-muted-foreground/40 pt-2">
        <ShoppingBag className="w-3 h-3 inline mr-1" />
        {order.business?.name ?? 'Perniagaan'}
      </div>
    </div>
  );
}
