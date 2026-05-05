import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PM_ACCENT, PM_LIGHT, PM_GRADIENT, CATEGORY_EMOJI } from './PolyMartLayout';
import { sendNotificationToUser } from '@/lib/notifications';
import toast from 'react-hot-toast';
import {
  Flag, CheckCircle, Trash2, Eye, Store, Package,
  TrendingUp, AlertTriangle, Shield, X, Megaphone, Plus, PlusCircle,
  Image as ImageIcon, MoreVertical, Edit, CalendarClock, Link as LinkIcon
} from 'lucide-react';

interface PolyAd {
  id: string;
  title: string;
  image_url: string;
  link_url?: string;
  type: 'INTERNAL' | 'EXTERNAL';
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  start_date?: string;
  end_date?: string;
  clicks: number;
  created_by?: string;
  creator?: {
    full_name: string;
    matric_no: string;
  };
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface Report {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  product_id: string;
  business_products: {
    id: string;
    name: string;
    image_url: string | null;
    category: string;
    price: number;
    business_id: string;
    keusahawanan_businesses: { name: string } | null;
  } | null;
  reporter: { id: string; full_name: string; matric_no: string } | null;
}

// ── Report Card ────────────────────────────────────────────────────────────────
function ReportCard({ report, onAction }: { report: Report; onAction: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const product = report.business_products;
  const emoji = CATEGORY_EMOJI[product?.category ?? ''] ?? '📦';

  const dismiss = async () => {
    setLoading(true);
    await supabase.from('polymart_reports').update({
      status: 'DISMISSED', reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
    }).eq('id', report.id);
    toast.success('Laporan diabaikan');
    onAction();
    setLoading(false);
  };

  const removeProduct = async () => {
    if (!product) return;
    setLoading(true);
    await Promise.all([
      supabase.from('business_products').update({ publish_to_polymart: false }).eq('id', product.id),
      supabase.from('polymart_reports').update({
        status: 'REMOVED', reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
      }).eq('product_id', product.id),
    ]);
    // Notify reporter
    if (report.reporter?.id) {
      await sendNotificationToUser(report.reporter.id, {
        title: '✅ Laporan Diambil Tindakan',
        message: `Produk "${product.name}" telah dikeluarkan dari PolyMart.`,
        type: 'polymart_report_actioned', module: 'POLYMART',
      });
    }
    toast.success(`Produk "${product.name}" dikeluarkan dari PolyMart`);
    onAction();
    setLoading(false);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-rose-500/20 bg-rose-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2 bg-rose-500/10">
        <Flag className="w-3.5 h-3.5 text-rose-500" />
        <span className="text-[11px] font-black text-rose-500">Laporan Baru</span>
        <span className="ml-auto text-[9px] text-muted-foreground/50">
          {new Date(report.created_at).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="p-3.5 space-y-3">
        {/* Product info */}
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: PM_LIGHT }}>
            {product?.image_url
              ? <img src={product.image_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xl">{emoji}</div>
            }
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-foreground">{product?.name ?? 'Produk dipadam'}</p>
            <p className="text-[10px] text-muted-foreground/50">{product?.keusahawanan_businesses?.name} · RM {product?.price?.toFixed(2)}</p>
          </div>
        </div>

        {/* Report reason */}
        <div className="px-3 py-2 rounded-xl bg-background border border-border/40">
          <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">Sebab Laporan</p>
          <p className="text-xs text-foreground">{report.reason}</p>
        </div>

        {/* Reporter */}
        <p className="text-[10px] text-muted-foreground/50">
          Laporan oleh: <span className="font-bold text-foreground/70">{report.reporter?.full_name ?? 'Anonim'}</span>
          {report.reporter?.matric_no && ` (${report.reporter.matric_no})`}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={dismiss} disabled={loading}
            className="flex-1 h-9 rounded-xl text-[11px] font-bold border border-border/50 hover:bg-muted/50 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Abaikan</span>
          </button>
          <button onClick={removeProduct} disabled={loading}
            className="flex-1 h-9 rounded-xl text-[11px] font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Keluarkan Produk</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Ads Manager Tab ─────────────────────────────────────────────────────────────
function AdsManagerTab() {
  const [ads, setAds] = useState<PolyAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<PolyAd | null>(null);
  
  const [adsPhone, setAdsPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [type, setType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'INACTIVE'>('DRAFT');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAds = async () => {
    setLoading(true);
    const [{ data }, { data: phoneData }] = await Promise.all([
      supabase.from('polymart_ads').select(`
        *,
        creator:profiles!created_by(full_name, matric_no)
      `).order('created_at', { ascending: false }),
      supabase.from('system_settings').select('value').eq('key', 'polymart_ads_phone').single(),
    ]);
    setAds((data || []) as any[]);
    if (phoneData) setAdsPhone(phoneData.value?.replace(/["']/g, '') || '');
    setLoading(false);
  };

  useEffect(() => { fetchAds(); }, []);

  const saveAdsPhone = async () => {
    if (!adsPhone) return;
    setSavingPhone(true);
    await supabase.from('system_settings').update({ value: `"${adsPhone}"` }).eq('key', 'polymart_ads_phone');
    toast.success('No. Telefon dikemas kini');
    setSavingPhone(false);
  };

  const handleOpenModal = (ad?: PolyAd) => {
    if (ad) {
      setEditingAd(ad);
      setTitle(ad.title);
      setLinkUrl(ad.link_url || '');
      setType(ad.type);
      setStatus(ad.status);
      setStartDate(ad.start_date ? new Date(ad.start_date).toISOString().slice(0, 16) : '');
      setEndDate(ad.end_date ? new Date(ad.end_date).toISOString().slice(0, 16) : '');
    } else {
      setEditingAd(null);
      setTitle(''); setLinkUrl(''); setType('INTERNAL'); setStatus('DRAFT');
      setStartDate(''); setEndDate('');
    }
    setImageFile(null);
    setShowModal(true);
  };

  const handleApprove = async (ad: PolyAd) => {
    // Determine start/end date for 30 days default if not set
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    
    try {
      setSaving(true);
      const updates = { 
        status: 'ACTIVE', 
        updated_at: new Date().toISOString(),
        start_date: ad.start_date || now.toISOString(),
        end_date: ad.end_date || end.toISOString()
      };
      const { error } = await supabase.from('polymart_ads').update(updates).eq('id', ad.id);
      if (error) throw error;
      toast.success('Iklan berjaya diluluskan (Aktif)!');
      
      // Notify creator if exists
      if (ad.created_by) {
        await sendNotificationToUser(ad.created_by, {
          title: 'Iklan Anda Diluluskan! 🎉',
          message: `Iklan "${ad.title}" telah berada di halaman utama PolyMart.`,
          type: 'polymart_ad_approved',
          module: 'POLYMART'
        });
      }
      
      fetchAds();
    } catch (e: any) {
      toast.error('Gagal kelulusan: ' + e.message);
    }
    setSaving(false);
  };

  const handleSave = async () => {
    if (!title.trim() || (!editingAd && !imageFile)) {
      toast.error('Tajuk & Gambar diperlukan'); return;
    }
    setSaving(true);
    try {
      let imageUrl = editingAd?.image_url;

      if (imageFile) {
        const { compressImage } = await import('@/lib/imageCompression');
        const compressedFile = await compressImage(imageFile);
        
        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${window.crypto.randomUUID()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('polymart-ads')
          .upload(fileName, compressedFile, { contentType: compressedFile.type });
        
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from('polymart-ads').getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const payload = {
        title,
        image_url: imageUrl!,
        link_url: linkUrl || null,
        type,
        status,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        updated_at: new Date().toISOString()
      };

      if (editingAd) {
        const { error } = await supabase.from('polymart_ads').update(payload).eq('id', editingAd.id);
        if (error) throw error;
        toast.success('Iklan dikemas kini');
        
        if (editingAd.status === 'DRAFT' && status === 'ACTIVE' && editingAd.created_by) {
           await sendNotificationToUser(editingAd.created_by, {
             title: 'Iklan Anda Diluluskan! 🎉',
             message: `Iklan "${title}" telah berada di halaman utama PolyMart.`,
             type: 'polymart_ad_approved',
             module: 'POLYMART'
           });
        }
      } else {
        const { error } = await supabase.from('polymart_ads').insert(payload);
        if (error) throw error;
        toast.success('Iklan baharu ditambah');
      }

      setShowModal(false);
      fetchAds();
    } catch (e: any) {
      toast.error('Ralat menyimpan iklan: ' + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (ad: PolyAd) => {
    if (!confirm('Pasti ingin padam iklan ini?')) return;
    try {
      if (ad.image_url) {
        const urlParts = ad.image_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        await supabase.storage.from('polymart-ads').remove([fileName]);
      }
      await supabase.from('polymart_ads').delete().eq('id', ad.id);
      toast.success('Iklan dipadam');
      fetchAds();
    } catch (e: any) {
      toast.error('Ralat memadam iklan');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/50">
        <p className="text-sm font-black flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-amber-500" /> Urus Iklan & Penaja
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/40 rounded-xl overflow-hidden border border-border/50 focus-within:border-amber-500/50 transition-colors">
            <span className="pl-3 pr-2 text-[10px] font-bold text-muted-foreground whitespace-nowrap">No WhatsApp:</span>
            <input value={adsPhone} onChange={e => setAdsPhone(e.target.value)} type="text" placeholder="601..."
              className="w-24 sm:w-28 h-8 bg-transparent text-xs font-bold outline-none text-foreground" />
            <button disabled={savingPhone} onClick={saveAdsPhone} className="h-8 px-3 text-[10px] font-bold bg-muted hover:bg-amber-500/20 hover:text-amber-600 transition-colors border-l border-border/50 disabled:opacity-50">
              {savingPhone ? '...' : 'Simpan'}
            </button>
          </div>
          <button onClick={() => handleOpenModal()}
            className="h-8 px-3 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 transition-all shrink-0"
            style={{ background: PM_GRADIENT }}>
            <Plus className="w-4 h-4" />
            <span>Iklan Baru</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="text-5xl">🪧</div>
          <p className="text-sm font-bold text-muted-foreground">Tiada iklan buat masa ini</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {ads.map(ad => (
            <div key={ad.id} className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl border border-border/50 bg-card">
              {/* Banner visual */}
              <div className="w-full sm:w-40 aspect-[2.5/1] rounded-xl overflow-hidden bg-muted/40 shrink-0 relative">
                <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                <div className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white ${
                  ad.status === 'ACTIVE' ? 'bg-emerald-500' : ad.status === 'DRAFT' ? 'bg-amber-500' : 'bg-slate-500'
                }`}>
                  {ad.status === 'DRAFT' ? 'MENUNGGU KELULUSAN' : ad.status}
                </div>
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-black text-foreground">{ad.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground/80 font-medium">
                      <span className="font-semibold px-1.5 py-0.5 rounded-md bg-muted/50">{ad.type}</span>
                      {ad.creator && (
                        <span>Oleh: {ad.creator.full_name} ({ad.creator.matric_no})</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {ad.status === 'DRAFT' && (
                      <button disabled={saving} onClick={() => handleApprove(ad)} className="h-7 px-2.5 rounded-lg bg-amber-500/10 text-amber-600 font-bold text-[10px] hover:bg-amber-500/20 disabled:opacity-50 flex items-center gap-1 mr-1 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Lulus
                      </button>
                    )}
                    <button disabled={saving} onClick={() => handleOpenModal(ad)} className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 disabled:opacity-50">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button disabled={saving} onClick={() => handleDelete(ad)} className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-500/20 disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[10px] text-muted-foreground/80 pt-1">
                  {ad.clicks > 0 && (
                    <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                      <TrendingUp className="w-3 h-3" /> {ad.clicks} Klik
                    </span>
                  )}
                  {ad.link_url && (
                    <span className="flex items-center gap-1 truncate max-w-[120px]">
                      <LinkIcon className="w-3 h-3" /> Berkait
                    </span>
                  )}
                  {(ad.start_date || ad.end_date) && (
                    <span className="flex items-center gap-1 shrink-0">
                      <CalendarClock className="w-3 h-3" />
                      {ad.start_date ? new Date(ad.start_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' }) : '*'} - 
                      {ad.end_date ? new Date(ad.end_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' }) : '*'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/60 p-4">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="w-full max-w-md bg-background rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <h3 className="text-sm font-black text-foreground">{editingAd ? 'Edit Iklan' : 'Iklan Baru'}</h3>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tajuk</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} type="text" placeholder="Cth: Maxis Student Promo"
                    className="w-full h-10 px-3 rounded-xl border border-border/50 bg-background text-sm font-medium outline-none focus:border-amber-500/50 transition-colors" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gambar Banner (Horizontal)</label>
                  <div className="flex items-center gap-3">
                    {imageFile ? (
                      <div className="w-20 aspect-[2.5/1] rounded-lg overflow-hidden shrink-0"><img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover" /></div>
                    ) : editingAd?.image_url && (
                      <div className="w-20 aspect-[2.5/1] rounded-lg overflow-hidden shrink-0"><img src={editingAd.image_url} className="w-full h-full object-cover" /></div>
                    )}
                    <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
                      className="text-[10px] file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-amber-500/10 file:text-amber-600 hover:file:bg-amber-500/20" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Jenis</label>
                    <select value={type} onChange={e => setType(e.target.value as any)}
                      className="w-full h-10 px-2 rounded-xl border border-border/50 bg-background text-xs font-bold outline-none focus:border-amber-500/50">
                      <option value="INTERNAL">Internal (Pelajar)</option>
                      <option value="EXTERNAL">External (Penaja)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value as any)}
                      className="w-full h-10 px-2 rounded-xl border border-border/50 bg-background text-xs font-bold outline-none focus:border-amber-500/50">
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Aktif</option>
                      <option value="INACTIVE">Tidak Aktif</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">URL Pautan (Opsional)</label>
                  <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} type="url" placeholder="https://..."
                    className="w-full h-10 px-3 rounded-xl border border-border/50 bg-background text-sm font-medium outline-none focus:border-amber-500/50 transition-colors" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mula</label>
                    <input value={startDate} onChange={e => setStartDate(e.target.value)} type="datetime-local" 
                      className="w-full h-10 px-2 text-xs rounded-xl border border-border/50 bg-background outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tamat</label>
                    <input value={endDate} onChange={e => setEndDate(e.target.value)} type="datetime-local" 
                      className="w-full h-10 px-2 text-xs rounded-xl border border-border/50 bg-background outline-none" />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border/50 pt-3 flex gap-2">
                <button onClick={() => setShowModal(false)} className="flex-1 h-11 rounded-xl text-xs font-bold bg-muted/50 hover:bg-muted text-foreground">Batal</button>
                <button disabled={saving} onClick={handleSave} className="flex-1 h-11 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: PM_GRADIENT }}>
                  {saving ? 'Menyimpan...' : 'Simpan Iklan'}
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
export function PolyMartAdminPanel({ hideHeader = false }: { hideHeader?: boolean }) {
  const { hasKeusahawananAccess, isSuperAdmin } = useAuth();
  const [reports,  setReports]  = useState<Report[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<'reports' | 'stats' | 'ads'>('reports');
  const [stats,    setStats]    = useState({ products: 0, orders: 0, vendors: 0, completedOrders: 0 });

  const loadData = async () => {
    setLoading(true);
    const [reportsRes, statsRes] = await Promise.all([
      supabase.from('polymart_reports').select(`
        *, business_products!product_id(id, name, image_url, category, price, business_id,
          keusahawanan_businesses!business_id(name)),
        reporter:profiles!reporter_id(id, full_name, matric_no)
      `).eq('status', 'OPEN').order('created_at', { ascending: false }),

      Promise.all([
        supabase.from('business_products').select('id', { count: 'exact', head: true }).eq('publish_to_polymart', true),
        supabase.from('polymart_orders').select('id', { count: 'exact', head: true }),
        supabase.from('keusahawanan_businesses').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        supabase.from('polymart_orders').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
      ]),
    ]);

    setReports((reportsRes.data ?? []) as Report[]);
    const [p, o, v, c] = statsRes;
    setStats({ products: p.count ?? 0, orders: o.count ?? 0, vendors: v.count ?? 0, completedOrders: c.count ?? 0 });
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (!hasKeusahawananAccess && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Shield className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm font-bold text-muted-foreground/50">Akses Ditolak</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      {!hideHeader && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: PM_GRADIENT }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">Panel Admin PolyMart</h1>
              <p className="text-xs text-muted-foreground/60">Moderasi dan statistik marketplace</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 relative z-10 w-full overflow-x-auto scrollbar-hide pb-2">
        {[
          { key: 'reports', label: 'Laporan', icon: Flag, badge: reports.length },
          { key: 'ads',     label: 'Pengurusan Iklan', icon: Megaphone, badge: 0 },
          { key: 'stats',   label: 'Statistik', icon: TrendingUp, badge: 0 },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={tab === t.key
              ? { background: PM_LIGHT, color: PM_ACCENT, border: `1.5px solid ${PM_ACCENT}40` }
              : { background: 'transparent', color: 'hsl(var(--muted-foreground))', border: '1.5px solid hsl(var(--border)/0.5)' }
            }>
            <t.icon className="w-3.5 h-3.5" />
            <span>{t.label}</span>
            {t.badge > 0 && (
              <span className="w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center bg-rose-500 text-white">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reports tab */}
      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="text-5xl">✨</div>
              <p className="text-sm font-bold text-muted-foreground/60">Tiada laporan baharu</p>
              <p className="text-xs text-muted-foreground/40">PolyMart bersih!</p>
            </div>
          ) : (
            <AnimatePresence>
              {reports.map(r => <ReportCard key={r.id} report={r} onAction={loadData} />)}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Ads Manager tab */}
      {tab === 'ads' && <AdsManagerTab />}

      {/* Stats tab */}
      {tab === 'stats' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="grid grid-cols-2 gap-3">
          {[
            { label: 'Produk Aktif di PolyMart', value: stats.products,        color: PM_ACCENT,   icon: Package },
            { label: 'Jumlah Pesanan',            value: stats.orders,          color: '#6366f1',   icon: TrendingUp },
            { label: 'Vendor Aktif',               value: stats.vendors,         color: '#22c55e',   icon: Store },
            { label: 'Pesanan Selesai',            value: stats.completedOrders, color: '#94a3b8',   icon: CheckCircle },
          ].map(s => (
            <div key={s.label}
              className="rounded-2xl border border-border/40 bg-card p-4 space-y-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <p className="text-2xl font-black text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground/60 font-medium leading-tight">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
