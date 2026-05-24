import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PM_ACCENT, PM_LIGHT, PM_GRADIENT, PM_GLOW, CATEGORY_EMOJI } from './PolyMartLayout';
import toast from 'react-hot-toast';
import {
  CreditCard, ShieldCheck, Clock, Copy, Check, Upload,
  ArrowLeft, AlertTriangle, AlertCircle, Phone, ArrowRight,
  Sparkles, FileText, Image as ImageIcon, CheckCircle, Info
} from 'lucide-react';

interface PaymentOrder {
  id: string;
  status: string;
  payment_method: string | null;
  payment_receipt_url: string | null;
  payment_receipt_rejected: boolean;
  payment_deadline_at: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
  buyer_id: string;
  product: {
    id: string;
    name: string;
    image_url: string | null;
    category: string;
  } | null;
  business: {
    id: string;
    name: string;
    logo_url: string | null;
    online_payment_enabled: boolean;
    payment_qr_url: string | null;
    payment_instructions: string | null;
    business_phone: string | null;
  } | null;
}

export function PolyMartPaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [groupOrders, setGroupOrders] = useState<PaymentOrder[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (!orderId || !user) return;
    fetchPaymentDetails();
  }, [orderId, user]);

  const fetchPaymentDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch current order
      const { data, error } = await supabase
        .from('polymart_orders')
        .select(`
          id, status, payment_method, payment_receipt_url, payment_receipt_rejected, payment_deadline_at,
          quantity, unit_price, created_at, buyer_id,
          product:business_products!product_id(id, name, image_url, category),
          business:keusahawanan_businesses!business_id(id, name, logo_url, online_payment_enabled, payment_qr_url, payment_instructions, business_phone)
        `)
        .eq('id', orderId)
        .single();

      if (error || !data) {
        toast.error('Pesanan tidak dijumpai');
        setLoading(false);
        return;
      }

      const currentOrder = data as unknown as PaymentOrder;
      setOrder(currentOrder);

      // Access Check: Only the buyer can access their payment page
      if (currentOrder.buyer_id !== user.id) {
        toast.error('Akses ditolak.');
        setLoading(false);
        return;
      }

      // 2. Fetch other orders placed in the same cart checkout batch
      // (same buyer, same business, pending, QR, created within 10 seconds of this one)
      const createdAtTime = new Date(currentOrder.created_at).getTime();
      const minTime = new Date(createdAtTime - 10000).toISOString();
      const maxTime = new Date(createdAtTime + 10000).toISOString();

      const { data: batchOrders, error: batchErr } = await supabase
        .from('polymart_orders')
        .select(`
          id, status, payment_method, payment_receipt_url, payment_receipt_rejected, payment_deadline_at,
          quantity, unit_price, created_at, buyer_id,
          product:business_products!product_id(id, name, image_url, category),
          business:keusahawanan_businesses!business_id(id, name, logo_url, online_payment_enabled, payment_qr_url, payment_instructions, business_phone)
        `)
        .eq('buyer_id', user.id)
        .eq('business_id', currentOrder.business?.id)
        .eq('status', 'PENDING')
        .eq('payment_method', 'QR_ONLINE')
        .gte('created_at', minTime)
        .lte('created_at', maxTime);

      if (!batchErr && batchOrders && batchOrders.length > 0) {
        setGroupOrders(batchOrders as unknown as PaymentOrder[]);
      } else {
        setGroupOrders([currentOrder]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuatkan butiran pembayaran');
    } finally {
      setLoading(false);
    }
  };

  // Timer logic
  useEffect(() => {
    if (!order?.payment_deadline_at) return;

    const timer = setInterval(() => {
      const deadline = new Date(order.payment_deadline_at!).getTime();
      const now = new Date().getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft('00:00');
        setIsExpired(true);
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const formatted = `${hours > 0 ? String(hours).padStart(2, '0') + ':' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        setTimeLeft(formatted);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order?.payment_deadline_at]);

  const copyToClipboard = () => {
    if (!order?.business?.payment_instructions) return;
    navigator.clipboard.writeText(order.business.payment_instructions);
    setCopied(true);
    toast.success('Salinan arahan pembayaran berjaya disimpan!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Sila pilih fail gambar sahaja (PNG, JPG, WEBP)');
      return;
    }
    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
  };

  const uploadReceipt = async () => {
    if (!selectedFile || groupOrders.length === 0) return;
    setUploading(true);

    try {
      const { compressImage } = await import('@/lib/imageCompression');
      const compressed = await compressImage(selectedFile);
      
      // Use the main orderId to prefix file path
      const path = `receipts/${orderId}/${Date.now()}.${compressed.name.split('.').pop()}`;

      // Upload to supabase bucket
      const { error: upErr } = await supabase.storage.from('polymart-receipts').upload(path, compressed, {
        upsert: true,
        contentType: compressed.type,
      });

      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('polymart-receipts').getPublicUrl(path);

      // Update all orders in the group concurrently
      const updatePromises = groupOrders.map(o => 
        supabase.from('polymart_orders').update({
          payment_receipt_url: publicUrl,
          payment_receipt_rejected: false,
          updated_at: new Date().toISOString()
        }).eq('id', o.id)
      );

      const updateResults = await Promise.all(updatePromises);
      const failed = updateResults.some(res => res.error);
      if (failed) throw new Error('Gagal mengemaskini status tempahan database.');

      setUploadSuccess(true);
      toast.success('Resit pembayaran berjaya dihantar!', { icon: '✨' });

      // Clean preview URL memory leak
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      // Redirect after a brief moment
      setTimeout(() => {
        navigate('/polymart/pesanan-saya');
      }, 3000);

    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat naik resit');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: PM_ACCENT, borderTopColor: 'transparent' }} />
        <p className="text-xs font-bold text-muted-foreground">Membuka Gerbang Pembayaran...</p>
      </div>
    );
  }

  if (!order) return null;

  const totalAmount = groupOrders.reduce((sum, o) => sum + (o.unit_price * o.quantity), 0);
  const business = order.business;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12 px-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/polymart/pesanan-saya')}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Batal & Lihat Pesanan
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" /> SECURE CHECKOUT
        </div>
      </div>

      <AnimatePresence mode="wait">
        {uploadSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="p-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-500 animate-bounce" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">Resit Pembayaran Dihantar!</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Vendor sedang menyemak bayaran anda. Anda akan dimaklumkan sebaik sahaja pesanan disahkan.
              </p>
            </div>
            <div className="pt-2">
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-lg">
                <Sparkles className="w-3 h-3" /> Mengalihkan anda ke Pesanan Saya...
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="main" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Top Gateway Summary */}
            <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card p-5 shadow-xl space-y-4">
              {/* Timer Bar */}
              {order.payment_deadline_at && !isExpired && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-foreground">Selesaikan bayaran dalam tempoh:</span>
                  </div>
                  <span className="text-sm font-black text-amber-600 font-mono tracking-wider">{timeLeft}</span>
                </div>
              )}

              {isExpired && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-rose-600">Had Masa Pembayaran Tamat</h4>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Tempahan ini mungkin telah dibatalkan secara automatik oleh sistem.</p>
                  </div>
                </div>
              )}

              {/* Vendor & Amount Info */}
              <div className="flex justify-between items-center pb-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border/40">
                    {business?.logo_url ? (
                      <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Penerima Bayaran</p>
                    <h3 className="text-sm font-black text-foreground">{business?.name || 'Perniagaan'}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Jumlah Bayaran</p>
                  <p className="text-xl font-black" style={{ color: PM_ACCENT }}>RM {totalAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* Items Summary Accordion style */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Ringkasan Tempahan ({groupOrders.length} Barang)</p>
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin">
                  {groupOrders.map(o => {
                    const emoji = CATEGORY_EMOJI[o.product?.category ?? ''] ?? '📦';
                    return (
                      <div key={o.id} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-muted/20 border border-border/20">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg shrink-0">{emoji}</span>
                          <span className="font-bold text-foreground truncate">{o.product?.name || 'Produk'}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted font-bold text-muted-foreground shrink-0">×{o.quantity}</span>
                        </div>
                        <span className="font-bold text-foreground">RM {(o.unit_price * o.quantity).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Steps & QR Display */}
            <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-xl space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Langkah 1: Buat Bayaran</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Sila imbas QR di bawah atau salin arahan akaun bank untuk melakukan pindahan wang.</p>
              </div>

              {/* QR Image Display */}
              {business?.payment_qr_url ? (
                <div className="flex flex-col items-center py-4 bg-muted/20 rounded-2xl border border-border/30 relative group">
                  <div className="relative w-48 h-48 bg-white p-2 rounded-2xl shadow-md border border-border/60 overflow-hidden flex items-center justify-center">
                    <img src={business.payment_qr_url} alt="QR Code Perniagaan" className="max-w-full max-h-full object-contain" />
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 font-bold mt-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Sila tangkap layar (screenshot) untuk imbasan e-wallet
                  </p>
                </div>
              ) : (
                <div className="p-6 text-center bg-muted/20 border border-dashed border-border/40 rounded-2xl">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-foreground">Tiada Gambar QR disediakan</p>
                  <p className="text-[10px] text-muted-foreground/60">Perniagaan tidak memuat naik kod QR. Sila gunakan arahan bank di bawah.</p>
                </div>
              )}

              {/* Bank Account / Payment Instructions */}
              {business?.payment_instructions && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">Arahan Bank / Nombor Akaun</span>
                    <button type="button" onClick={copyToClipboard} className="flex items-center gap-1 text-[9px] font-bold text-blue-500 hover:text-blue-600 transition-colors">
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Salin berjaya!' : 'Salin Arahan'}
                    </button>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 text-xs font-medium text-foreground relative font-sans whitespace-pre-wrap leading-relaxed">
                    {business.payment_instructions}
                  </div>
                </div>
              )}

              {business?.business_phone && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-xs">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-muted-foreground">Hubungi Vendor:</span>
                    <span className="font-bold text-foreground">{business.business_phone}</span>
                  </div>
                  <a href={`https://wa.me/${business.business_phone.replace(/\D/g, '').replace(/^0/, '60')}?text=${encodeURIComponent('Hai, saya baru sahaja membuat tempahan di PolyMart.')}`}
                    target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-wider">
                    WhatsApp Vendor
                  </a>
                </div>
              )}
            </div>

            {/* Receipt Uploader */}
            <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-xl space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Langkah 2: Muat Naik Bukti Resit</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Setelah selesai membuat bayaran, muat naik resit/bukti bayaran rasmi anda di sini.</p>
              </div>

              {/* Drag Drop Area */}
              {!previewUrl ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`w-full border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-blue-500 bg-blue-500/5 scale-[1.01]'
                      : 'border-border/60 hover:border-border/80 bg-muted/10'
                  }`}
                  style={{ pointerEvents: uploading || isExpired ? 'none' : 'auto' }}
                >
                  <label className="flex flex-col items-center gap-2 cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-blue-500 hover:underline">Muat Naik Resit</span>
                      <span className="text-xs text-muted-foreground"> atau seret ke sini</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground/40 font-bold uppercase">Format: PNG, JPG, WEBP (Maks 5MB)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading || isExpired} />
                  </label>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/40 bg-muted/20 p-3.5 space-y-3">
                  <div className="relative aspect-[3/4] max-h-72 w-full rounded-xl overflow-hidden border border-border/30 bg-muted/30">
                    <img src={previewUrl} alt="Pratonton Resit" className="w-full h-full object-contain" />
                    {uploading && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white">
                        <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin border-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Memuat naik...</span>
                      </div>
                    )}
                  </div>
                  
                  {!uploading && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrl(null);
                          setSelectedFile(null);
                        }}
                        className="flex-1 h-10 rounded-xl border border-border hover:bg-muted text-xs font-bold text-muted-foreground transition-all"
                      >
                        Tukar Fail
                      </button>
                      <button
                        type="button"
                        onClick={uploadReceipt}
                        className="flex-[2] h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 transition-all"
                        style={{ background: PM_GRADIENT }}
                      >
                        Hantar Resit Sekarang <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Warning/Notes */}
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-muted/20 border border-border/20">
                <Info className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
                  Sila pastikan jumlah bayaran, nombor rujukan bank, tarikh & masa tertera dengan jelas pada resit anda. Penyerahan resit palsu boleh mengakibatkan tindakan demerit/tatatertib.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
