import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PM_ACCENT, PM_LIGHT, PM_GRADIENT, CATEGORY_EMOJI, usePolymart } from './PolyMartLayout';
import { sendNotificationToUser } from '@/lib/notifications';
import toast from 'react-hot-toast';
import {
  Package, CheckCircle, XCircle, Truck, Clock, Store,
  Phone, MessageCircle, ChevronDown, ChevronUp, AlertTriangle,
  TrendingUp, ShoppingBag, Bike
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
  const [showComplete,setShowComplete] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH'|'QR'|'TRANSFER'>('QR');
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

      if (newStatus === 'CANCELLED') {
        // Bebaskan reserved_stock
        await supabase.rpc('release_polymart_stock', {
          p_product_id: order.business_products?.id,
          p_quantity: order.quantity
        });
      }

      if (newStatus === 'COMPLETED') {
        const { error } = await supabase.rpc('complete_polymart_order', {
          p_order_id: order.id,
          p_business_id: order.business_id,
          p_product_id: order.business_products?.id,
          p_quantity: order.quantity,
          p_unit_price: order.unit_price,
          p_payment_method: paymentMethod,
          p_served_by: profile?.id
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('polymart_orders').update(updates).eq('id', order.id);
        if (error) throw error;
      }

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
            const phone = order.buyer.phone.replace(/\D/g, '').replace(/^0/, '60');
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
      setShowComplete(false);
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
              ? <img src={order.business_products.image_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
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

        {/* Complete form */}
        <AnimatePresence>
          {showComplete && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
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
    all:       orders,
    active:    active,
    PENDING:   pending,
    CONFIRMED: orders.filter(o => o.status === 'CONFIRMED'),
    READY:     orders.filter(o => o.status === 'READY'),
    COMPLETED: orders.filter(o => o.status === 'COMPLETED'),
    CANCELLED: orders.filter(o => o.status === 'CANCELLED'),
  };
  
  let displayed = tabMap[activeTab] ?? active;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayed = displayed.filter(o => 
      o.id.toLowerCase().includes(q) || 
      o.buyer?.full_name?.toLowerCase().includes(q) ||
      o.buyer?.matric_no?.toLowerCase().includes(q)
    );
  }

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
            onClick={() => navigate('/polyrider')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black text-amber-700 bg-amber-100 dark:bg-amber-500/20 dark:text-amber-400 transition-all hover:scale-105 active:scale-95 border border-amber-200 dark:border-amber-500/30"
          >
            <Bike className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Panggil Rider</span>
          </button>
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

