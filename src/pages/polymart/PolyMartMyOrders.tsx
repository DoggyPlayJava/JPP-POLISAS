import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PM_ACCENT, PM_LIGHT, PM_GRADIENT, PM_GLOW, CATEGORY_ICON_MAP } from './PolyMartLayout';
import { sendNotificationToUser } from '@/lib/notifications';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  Package, Clock, CheckCircle, XCircle, Truck, Star, Store,
  ChevronRight, MessageCircle, Phone, X, RefreshCw,
  CreditCard, Handshake, Upload, Image, AlertCircle, Award, ListFilter,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
type OrderStatus = 'PENDING' | 'CONFIRMED' | 'READY' | 'COMPLETED' | 'CANCELLED';

interface Order {
  id: string;
  business_id: string;
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
  // Payment fields
  payment_method: 'COD' | 'QR_ONLINE' | null;
  payment_receipt_url: string | null;
  payment_receipt_rejected: boolean;
  payment_verified_at: string | null;
  payment_deadline_at: string | null;
  // Cancellation fields
  cancellation_requested_at: string | null;
  cancellation_reason: string | null;
  selected_variation: string | null;
}


// ── Review Modal ───────────────────────────────────────────────────────────────
function ReviewModal({ order, onClose }: { order: Order; onClose: (submitted: boolean) => void }) {
  const { t } = useTranslation(['commerce', 'common']);
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
      toast.success(t('commerce:review_submitted_success', 'Terima kasih atas ulasan anda!')); 
      
      // Award merit (Exco Kediaman boleh adjust nilai di pangkalan data kelak)
      const { error: meritErr } = await supabase.rpc('increment_merit_by_source', {
        p_user_id: user.id,
        p_amount: 1,
        p_source: `Ulasan PolyMart: ${order.business_products.name.slice(0, 30)}`,
        p_type: 'RESIDENTIAL'
      });
      
      if (!meritErr) {
        toast.success(t('commerce:merit_rewarded_toast', '+1 Merit Kediaman!'), {
          style: { background: '#f59e0b', color: '#fff', fontWeight: 900 }
        });
      }
      
      onClose(true); 
    }
    else toast.error(t('commerce:review_submit_failed', 'Gagal hantar ulasan'));
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 " onClick={() => onClose(false)} />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative w-full sm:max-w-sm bg-card rounded-3xl border border-border/50 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-foreground">{t('commerce:write_review_title', 'Beri Ulasan')}</h3>
          <button onClick={() => onClose(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/60 cursor-pointer">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm font-bold text-muted-foreground">{order.business_products?.name}</p>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center">
          <p className="text-[11px] font-black text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1.5">
            <Award className="w-3.5 h-3.5" /> {t('commerce:review_reward_title', 'Ganjaran Ulasan')}
          </p>
          <p className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400/80 mt-0.5 leading-tight">
            {t('commerce:review_reward_desc', 'Tinggalkan ulasan jujur untuk menerima automatik +1 Merit Kediaman.')}
          </p>
        </div>

        {/* Star picker */}
        <div className="flex items-center justify-center gap-2 py-3">
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() => setRating(s)} className="cursor-pointer">
              <Star className="w-9 h-9 transition-all" style={{ color: s <= rating ? '#f59e0b' : 'hsl(var(--border))', fill: s <= rating ? '#f59e0b' : 'none' }} />
            </button>
          ))}
        </div>

        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
          placeholder={t('commerce:review_comment_placeholder', 'Bagaimana pengalaman anda? (pilihan)')}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 resize-none focus:border-amber-500/50 transition-all" />

        <button onClick={submit} disabled={submitting}
          className="w-full h-11 rounded-2xl text-white font-black text-sm disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
          style={{ background: PM_GRADIENT }}>
          {submitting ? t('commerce:submitting_review_dots', 'Menghantar...') : (
            <>
              <Star className="w-4 h-4 fill-current" />
              <span>{t('commerce:submit_review_btn', 'Hantar Ulasan')}</span>
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Order Timeline ─────────────────────────────────────────────────────────────
function OrderTimeline({ status, cancelReason }: { status: OrderStatus, cancelReason?: string | null }) {
  const { t } = useTranslation(['commerce', 'common']);
  if (status === 'CANCELLED') {
    return (
      <div className="px-3.5 py-3 border-t border-border/30 bg-rose-500/5">
        <div className="flex items-center gap-3">
          <XCircle className="w-6 h-6 text-rose-500" />
          <div>
            <p className="text-sm font-black text-rose-500">{t('commerce:status_cancelled_label', 'Dibatalkan')}</p>
            {cancelReason && <p className="text-[11px] font-bold text-rose-500/70 mt-0.5">{cancelReason}</p>}
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { key: 'PENDING',   label: t('commerce:step_placed', 'Dibuat'),   icon: Clock },
    { key: 'CONFIRMED', label: t('commerce:step_processing', 'Diproses'), icon: Package },
    { key: 'READY',     label: t('commerce:step_ready', 'Sedia'),    icon: Truck },
    { key: 'COMPLETED', label: t('commerce:step_done', 'Selesai'),  icon: Star },
  ];

  const currentIdx = steps.findIndex(s => s.key === status);

  return (
    <div className="px-6 py-5 border-t border-border/30 bg-muted/5">
      <div className="flex items-center justify-between relative">
        {/* Progress Background Line */}
        <div className="absolute top-4 left-2 right-2 h-1 bg-muted rounded-full" />
        
        {/* Active Progress Line */}
        <motion.div 
          className="absolute top-4 left-2 right-2 h-1 rounded-full z-0 origin-left"
          style={{ background: PM_ACCENT }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: Math.max(0, currentIdx) / (steps.length - 1) }}
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
                }}
                style={{ boxShadow: isCurrent ? `0 0 12px ${PM_ACCENT}40` : 'none' }}
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

// ── Receipt Upload Button ──────────────────────────────────────────────────────
function ReceiptUploadButton({ orderId, onUploaded }: { orderId: string; onUploaded: () => void }) {
  const { t } = useTranslation(['commerce', 'common']);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const { compressImage } = await import('@/lib/imageCompression');
      const compressed = await compressImage(file);
      const path = `receipts/${orderId}/${Date.now()}.${compressed.name.split('.').pop()}`;

      const { error: upErr } = await supabase.storage.from('polymart-receipts').upload(path, compressed, {
        upsert: true,
        contentType: compressed.type,
      });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('polymart-receipts').getPublicUrl(path);

      const { error: updateErr } = await supabase.from('polymart_orders').update({
        payment_receipt_url: publicUrl,
        payment_receipt_rejected: false,
        updated_at: new Date().toISOString(),
      }).eq('id', orderId);

      if (updateErr) throw updateErr;

      toast.success(t('commerce:payment_receipt_submitted_success', 'Resit berjaya dimuat naik!'));
      onUploaded();
    } catch (err: any) {
      toast.error(err.message || t('commerce:upload_receipt_failed', 'Gagal muat naik resit'));
    }
    setUploading(false);
  };

  return (
    <label className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-blue-500/30 bg-blue-500/5 text-blue-600 text-[11px] font-black cursor-pointer hover:bg-blue-500/10 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
      <Upload className="w-4 h-4" />
      {uploading ? t('commerce:uploading_dots', 'Memuat naik...') : t('commerce:upload_receipt_btn', 'Muat Naik Resit Pembayaran')}
      <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
    </label>
  );
}

// ── Cancel Modal ───────────────────────────────────────────────────────────────

function CancelModal({ order, onClose }: { order: Order; onClose: (cancelled: boolean) => void }) {
  const { t } = useTranslation(['commerce', 'common']);
  const { user } = useAuth();
  const cancelReasons = [
    { key: 'size', label: t('commerce:cancel_reason_size', 'Salah saiz / variasi') },
    { key: 'product', label: t('commerce:cancel_reason_product', 'Salah pilih produk') },
    { key: 'mind', label: t('commerce:cancel_reason_mind', 'Tak jadi beli') },
    { key: 'price', label: t('commerce:cancel_reason_price', 'Harga berubah') },
    { key: 'other', label: t('commerce:cancel_reason_other', 'Lain-lain') },
  ];
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCancel = async () => {
    if (!user) return;
    const finalReason = reason === 'Lain-lain' ? customReason || 'Lain-lain' : reason;
    if (!finalReason) { toast.error(t('commerce:cancel_select_reason_error', 'Sila pilih sebab pembatalan')); return; }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('buyer_cancel_polymart_order', {
        p_order_id: order.id,
        p_buyer_id: user.id,
        p_reason: finalReason,
      });
      if (error) throw error;

      const result = (data as any)?.result;
      if (result === 'CANCELLED') {
        toast.success(t('commerce:order_cancelled_success', 'Pesanan berjaya dibatalkan'));
      } else if (result === 'CANCELLATION_REQUESTED') {
        toast.success(t('commerce:cancellation_requested_success', 'Permintaan pembatalan dihantar kepada vendor'));
        // Notify vendor
        if (order.keusahawanan_businesses?.id) {
          const { data: bizData } = await supabase.from('keusahawanan_businesses')
            .select('owner_id').eq('id', order.keusahawanan_businesses.id).single();
          if (bizData?.owner_id) {
            await sendNotificationToUser(bizData.owner_id, {
              title: t('commerce:cancellation_request_title', 'Permintaan Pembatalan'),
              message: t('commerce:cancellation_request_msg', 'Pembeli meminta pembatalan pesanan {{product}}. Sebab: {{reason}}', { product: order.business_products?.name, reason: finalReason }),
              type: 'polymart_cancellation_request',
              module: 'POLYMART',
              link: '/polymart/vendor',
              reference_id: order.id,
            });
          }
        }
      }
      onClose(true);
    } catch (err: any) {
      toast.error(err.message || t('commerce:cancel_order_failed', 'Gagal membatalkan pesanan'));
    }
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 " onClick={() => onClose(false)} />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative w-full sm:max-w-sm bg-card rounded-3xl border border-border/50 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-foreground">{t('commerce:cancel_order_title', 'Batalkan Pesanan')}</h3>
          <button onClick={() => onClose(false)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/60 cursor-pointer">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm font-bold text-muted-foreground">{order.business_products?.name}</p>

        {order.status === 'CONFIRMED' && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{t('commerce:cancel_confirmed_warning', 'Pesanan sudah disahkan. Pembatalan memerlukan kelulusan vendor.')}</span>
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">{t('commerce:cancel_reason_label', 'Sebab Pembatalan')}</p>
          {cancelReasons.map(r => (
            <button key={r.key} onClick={() => setReason(r.label)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                reason === r.label
                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-600'
                  : 'border-border/50 bg-muted/20 text-foreground hover:bg-muted/40'
              }`}>
              {r.label}
            </button>
          ))}
          {reason === 'Lain-lain' && (
            <textarea value={customReason} onChange={e => setCustomReason(e.target.value)} rows={2}
              placeholder={t('commerce:cancel_custom_reason_placeholder', 'Nyatakan sebab...')}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 resize-none focus:border-rose-500/50 transition-all" />
          )}
        </div>

        <button onClick={handleCancel} disabled={submitting || !reason}
          className="w-full h-11 rounded-2xl text-white font-black text-sm bg-rose-500 hover:bg-rose-600 disabled:opacity-60 transition-colors cursor-pointer">
          {submitting ? t('common:loading', 'Memproses...') : order.status === 'PENDING' ? t('commerce:cancel_order_now', 'Batalkan Sekarang') : t('commerce:send_cancellation_request', 'Hantar Permintaan Batal')}
        </button>
      </motion.div>
    </motion.div>
  );
}


function OrderCard({ order, onReview, onCancel }: { key?: any; order: Order; onReview: (o: Order) => void; onCancel: (o: Order) => void }) {
  const { t } = useTranslation(['commerce', 'common']);
  const navigate = useNavigate();
  const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.FC<any> }> = {
    PENDING:   { label: t('commerce:status_awaiting_verification', 'Menunggu Pengesahan'), color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: Clock },
    CONFIRMED: { label: t('commerce:status_vendor_confirmed', 'Disahkan Vendor'),     color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: CheckCircle },
    READY:     { label: t('commerce:status_ready_pickup', 'Sedia Diambil!'),      color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  icon: Truck },
    COMPLETED: { label: t('commerce:status_completed_label', 'Selesai'),             color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: CheckCircle },
    CANCELLED: { label: t('commerce:status_cancelled_label', 'Dibatalkan'),          color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: XCircle },
  };
  const cfg = statusConfig[order.status];
  const StatusIcon = cfg.icon;
  const FallbackIcon = CATEGORY_ICON_MAP[order.business_products?.category ?? ''] ?? Package;
  const biz = order.keusahawanan_businesses;

  const vendorPhone = biz?.owner?.phone;
  const formattedVendorPhone = vendorPhone ? vendorPhone.replace(/\D/g, '').replace(/^0/, '60') : '';

  const waMsg = encodeURIComponent(t('commerce:whatsapp_buyer_order_msg', 'Hai! Saya dari PolyMart — pesanan saya: {{count}}x {{product}} (ID: {{id}})', { count: order.quantity, product: order.business_products?.name ?? t('commerce:product_fallback', 'produk'), id: order.id.slice(0, 8) }));
  const whatsappUrl = biz?.polymart_contact_method === 'whatsapp' && order.share_phone && formattedVendorPhone
    ? `https://wa.me/${formattedVendorPhone}?text=${waMsg}` : null;

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
        <span className="ml-auto text-[9px] text-muted-foreground/50 font-mono tabular-nums">
          {new Date(order.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="p-3.5 flex gap-3">
        {/* Product image */}
        <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: PM_LIGHT }}>
          {order.business_products?.image_url
            ? <img src={order.business_products.image_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            : <FallbackIcon className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => {
              const targetId = order.business_id || biz?.id;
              if (targetId) navigate(`/polymart/kedai/${targetId}`);
            }}
            className="text-[10px] text-muted-foreground/60 hover:text-amber-500 font-bold flex items-center gap-1 transition-colors text-left group cursor-pointer"
          >
            <Store className="w-2.5 h-2.5 text-amber-500" />
            <span className="group-hover:underline">{biz?.name ?? t('commerce:store_label', 'Kedai')}</span>
            <ChevronRight className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
          </button>
          <p className="text-sm font-black text-foreground truncate [text-wrap:balance]">{order.business_products?.name}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-black font-mono tabular-nums" style={{ color: PM_ACCENT }}>RM {(order.total_price ?? order.unit_price * order.quantity).toFixed(2)}</span>
            <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums">×{order.quantity}</span>
          </div>
          {order.pickup_time && (
            <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1 mt-0.5">
              <Clock className="w-2.5 h-2.5" /> {order.pickup_time}
            </p>
          )}
          {order.selected_variation && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase tracking-wider border border-indigo-500/20">
              {t('commerce:size_label', `Saiz: ${order.selected_variation}`, { variation: order.selected_variation })}
            </span>
          )}
        </div>
      </div>

      {/* Payment method badge */}
      {order.payment_method && (
        <div className="px-3.5 pb-1">
          <div className="flex items-center gap-2">
            {order.payment_method === 'QR_ONLINE' ? (
              <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                <CreditCard className="w-3 h-3" /> QR Online
                {order.payment_verified_at
                  ? <span className="text-emerald-600 ml-1 inline-flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> {t('commerce:verified_badge', 'Disahkan')}</span>
                  : order.payment_receipt_url
                    ? <span className="text-amber-600 ml-1 inline-flex items-center gap-0.5"><Clock className="w-3 h-3" /> {t('commerce:status_awaiting_verification', 'Menunggu Pengesahan')}</span>
                    : <span className="text-rose-500 ml-1 inline-flex items-center gap-0.5"><AlertCircle className="w-3 h-3" /> {t('commerce:qr_unpaid', 'Belum Bayar')}</span>
                }
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                <Handshake className="w-3 h-3" /> COD
              </span>
            )}
            {order.payment_deadline_at && !order.payment_verified_at && order.status === 'PENDING' && (
              <span className="text-[9px] text-rose-500 font-bold font-mono tabular-nums">
                {t('commerce:payment_deadline_short', `Had: ${new Date(order.payment_deadline_at).toLocaleString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`, { time: new Date(order.payment_deadline_at).toLocaleString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Visual Timeline Tracker */}
      <OrderTimeline status={order.status} cancelReason={order.cancel_reason} />

      {/* Receipt upload for QR payment — when PENDING and no receipt yet */}
      {order.payment_method === 'QR_ONLINE' && order.status === 'PENDING' && !order.payment_verified_at && (
        <div className="px-3.5 pb-3.5">
          {order.payment_receipt_rejected && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 mb-2">
              <p className="text-[10px] font-black text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{t('commerce:receipt_rejected_notice', 'Resit ditolak oleh vendor. Sila muat naik semula.')}</span>
              </p>
            </div>
          )}
          {order.payment_receipt_url && !order.payment_receipt_rejected ? (
            <button onClick={() => navigate(`/polymart/bayar/${order.id}`)}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-600 text-[11px] font-black hover:bg-blue-500/10 transition-all cursor-pointer">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span>{t('commerce:receipt_submitted_title', 'Resit Dihantar — Lihat Butiran Bayaran')}</span>
            </button>
          ) : (
            <button onClick={() => navigate(`/polymart/bayar/${order.id}`)}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-blue-500/30 bg-blue-500/5 text-blue-600 text-[11px] font-black hover:bg-blue-500/10 transition-all cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{t('commerce:complete_payment_upload_btn', 'Selesaikan Pembayaran (Muat Naik Resit)')}</span>
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      {(order.status === 'CONFIRMED' || order.status === 'READY') && (
        <div className="px-3.5 pb-3.5 space-y-3">
          <div className="bg-white dark:bg-card p-4 rounded-2xl flex flex-col items-center justify-center border border-border/50 shadow-sm mx-auto max-w-[200px]">
            <QRCode value={`${window.location.origin}/polymart/verify/${order.id}`} size={120} className="dark:bg-white p-2 rounded-xl" />
            <p className="text-[10px] text-center text-muted-foreground font-bold mt-3 leading-tight">
              {t('commerce:show_qr_to_vendor_hint', 'Tunjuk QR ini kepada vendor semasa ambil pesanan')}
            </p>
          </div>
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl border border-green-500/30 bg-green-500/10 text-[11px] font-bold text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{t('commerce:whatsapp_vendor_link', 'Hubungi via WhatsApp')}</span>
            </a>
          )}
        </div>
      )}

      {/* Cancel button for PENDING or CONFIRMED orders */}
      {(order.status === 'PENDING' || (order.status === 'CONFIRMED' && !order.cancellation_requested_at)) && (
        <div className="px-3.5 pb-2">
          <button onClick={() => onCancel(order)}
            className="w-full h-9 rounded-xl text-[11px] font-black border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer">
            {order.status === 'PENDING' ? t('commerce:cancel_order_btn', 'Batalkan Pesanan') : t('commerce:request_cancellation_btn', 'Minta Pembatalan')}
          </button>
        </div>
      )}

      {/* Cancellation request pending indicator */}
      {order.cancellation_requested_at && order.status !== 'CANCELLED' && (
        <div className="px-3.5 pb-2">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{t('commerce:cancellation_pending_vendor', 'Permintaan pembatalan dihantar. Menunggu kelulusan vendor...')}</span>
            </p>
            <p className="text-[9px] text-amber-500/60 mt-0.5">{t('commerce:cancel_reason_label', 'Sebab')}: {order.cancellation_reason}</p>
          </div>
        </div>
      )}

      {order.status === 'COMPLETED' && (
        <div className="px-3.5 pb-3.5">
          <button onClick={() => onReview(order)}
            className="w-full h-9 rounded-xl text-[11px] font-black transition-all hover:brightness-110 cursor-pointer flex items-center justify-center gap-1.5"
            style={{ background: PM_LIGHT, color: PM_ACCENT }}>
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{t('commerce:write_review_title', 'Beri Ulasan')}</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export function PolyMartMyOrders() {
  const { t } = useTranslation(['commerce', 'common']);
  const { user } = useAuth();
  const statusTabs: { key: OrderStatus | 'all'; label: string; icon: React.FC<any> }[] = [
    { key: 'all',       label: t('commerce:tab_all', 'Semua'),    icon: ListFilter },
    { key: 'PENDING',   label: t('commerce:tab_pending', 'Menunggu'), icon: Clock },
    { key: 'CONFIRMED', label: t('commerce:tab_confirmed', 'Disahkan'), icon: CheckCircle },
    { key: 'READY',     label: t('commerce:tab_ready', 'Siap'),     icon: Truck },
    { key: 'COMPLETED', label: t('commerce:tab_completed', 'Selesai'),  icon: Star },
    { key: 'CANCELLED', label: t('commerce:tab_cancelled', 'Batal'),    icon: XCircle },
  ];
  const [orders,         setOrders]         = useState<Order[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [isRefreshing,   setIsRefreshing]   = useState(false);
  const [lastRefreshed,  setLastRefreshed]  = useState<Date | null>(null);
  const [activeTab,      setActiveTab]      = useState<OrderStatus | 'all'>('all');
  const [reviewTarget,   setReviewTarget]   = useState<Order | null>(null);
  const [cancelTarget,   setCancelTarget]   = useState<Order | null>(null);
  const [reviewedIds,    setReviewedIds]    = useState<Set<string>>(new Set());

  const loadOrders = useCallback(async (showRefreshSpinner = false) => {
    if (!user) return;
    if (showRefreshSpinner) setIsRefreshing(true);
    const { data } = await supabase.from('polymart_orders')
      .select(`
        id, business_id, quantity, unit_price, total_price, note, pickup_time, share_phone,
        status, created_at, confirmed_at, ready_at, cancel_reason,
        payment_method, payment_receipt_url, payment_receipt_rejected,
        payment_verified_at, payment_deadline_at,
        cancellation_requested_at, cancellation_reason, selected_variation,
        business_products!product_id(id, name, image_url, category),
        keusahawanan_businesses!business_id(
          id, name, logo_url, polymart_contact_method,
          owner:profiles!owner_id(phone)
        ),
        buyer:profiles!buyer_id(phone)
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    setOrders((data ?? []) as unknown as Order[]);
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

  // Custom event listener for receipt upload refresh
  useEffect(() => {
    const handleRefresh = () => loadOrders();
    window.addEventListener('polymart-refresh-orders', handleRefresh);
    return () => window.removeEventListener('polymart-refresh-orders', handleRefresh);
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
            toast.success(t('commerce:order_ready_toast', `Pesanan ${updated.id.slice(0, 8)} sedia diambil!`, { id: updated.id.slice(0, 8) }));
          } else if (updated.status === 'CONFIRMED') {
            toast.success(t('commerce:order_processing_toast', 'Pesanan sedang diproses!'));
          } else if (updated.status === 'CANCELLED') {
            toast.error(t('commerce:order_cancelled_toast', 'Pesanan dibatalkan.'));
          }
        }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(channel);
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
              <h1 className="text-xl font-black text-foreground">{t('commerce:my_orders_title', 'Pesanan Saya')}</h1>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{t('commerce:total_orders_count', `${orders.length} pesanan keseluruhan`, { count: orders.length })}</p>
            </div>
            {/* Butang Semak Status + Masa Terakhir Dikemas Kini */}
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => loadOrders(true)}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all disabled:opacity-60 cursor-pointer"
                style={{ background: PM_LIGHT, color: PM_ACCENT }}
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? t('commerce:checking_status_dots', 'Menyemak...') : t('commerce:check_status_btn', 'Semak Status')}
              </button>
              {lastRefreshed && (
                <p className="text-[9px] text-muted-foreground/40 font-bold font-mono tabular-nums">
                  {t('common:updated_at', 'Dikemas kini')}: {lastRefreshed.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {statusTabs.map(tab => {
            const count = tab.key === 'all' ? orders.length : tabCounts[tab.key] ?? 0;
            const Icon = tab.icon;
            return (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer"
                style={activeTab === tab.key
                  ? { background: PM_LIGHT, color: PM_ACCENT, border: `1.5px solid ${PM_ACCENT}40` }
                  : { background: 'transparent', color: 'hsl(var(--muted-foreground))', border: '1.5px solid hsl(var(--border)/0.5)' }
                }>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center font-mono tabular-nums"
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
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-28 bg-muted/60 rounded" />
                  <div className="h-3 w-16 bg-muted/40 rounded" />
                </div>
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-muted/40 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 bg-muted/40 rounded" />
                    <div className="h-4 w-40 bg-muted/60 rounded" />
                    <div className="h-3 w-24 bg-muted/50 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-xs">
              <Package className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-muted-foreground/80">{t('commerce:no_orders_empty', 'Tiada pesanan')}</p>
            <p className="text-xs text-muted-foreground/50">{t('commerce:orders_will_appear_here', 'Pesanan anda akan muncul di sini')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onReview={o => !reviewedIds.has(o.id) && setReviewTarget(o)}
                  onCancel={o => setCancelTarget(o)}
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

      <AnimatePresence>
        {cancelTarget && (
          <CancelModal
            order={cancelTarget}
            onClose={(cancelled) => {
              setCancelTarget(null);
              if (cancelled) loadOrders();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
