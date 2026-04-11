import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSwitcher } from '@/contexts/BusinessSwitcherContext';
import { usePosData } from '@/hooks/usePosData';
import { supabase } from '@/lib/supabase';
import { hexToRgba } from '@/lib/utils';
import {
  Camera, Save, Users, ShieldCheck, Trash2, Check, X, Clock,
  Activity, Building2, ToggleLeft, ToggleRight, UserPlus, Logs,
  Tag, Ticket, BadgePercent, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { type BusinessPromotion, type PosDiscountType } from '@/types';


type LogActionLabel = Record<string, string>;
const LOG_LABELS: LogActionLabel = {
  TRANSACTION_CREATE: 'Transaksi Baharu',
  TRANSACTION_VOID:   'Transaksi Dibatalkan',
  PRODUCT_ADD:        'Produk Ditambah',
  PRODUCT_EDIT:       'Produk Dikemaskini',
  PRODUCT_DELETE:     'Produk Dipadam',
  STOCK_EDIT:         'Stok Dikemaskini',
  POS_ASSIGNED:       'Penugasan POS',
  STAFF_APPROVED:     'Ahli Diluluskan',
  STAFF_REMOVED:      'Ahli Dibuang',
  SETTINGS_UPDATED:   'Tetapan Dikemaskini',
  EXPENSE_ADD:        'Perbelanjaan Direkodkan',
  EXPENSE_DELETE:     'Perbelanjaan Dipadam',
  PROMO_CREATE:       'Promosi Dicipta',
  PROMO_USED:         'Kupon Digunakan',
  PROMO_TOGGLE:       'Promosi Dikemaskini',
  CASH_CHECKPOINT:    'Checkpoint Tunai',
};

const fmtDT = (iso: string) => new Date(iso).toLocaleString('ms-MY', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

export function UrusPerniagaanPage() {
  const { color } = useExcoTheme();
  const { user, profile, isSuperAdmin } = useAuth();
  const { selectedBusiness, isKeusahawananAdmin } = useBusinessSwitcher();

  const [businessData, setBusinessData] = useState<any>(null);
  const [members, setMembers]           = useState<any[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState<'identiti' | 'staff' | 'pos' | 'ciri' | 'log'>('identiti');

  const [description, setDescription] = useState('');
  const [useShiftSystem, setUseShiftSystem] = useState(true);

  // Derived
  const businessId = selectedBusiness?.id;
  const isOwner = isKeusahawananAdmin || 
    (selectedBusiness?.owner_id === user?.id) || 
    (members.find(m => m.user_id === user?.id)?.role === 'OWNER');

  const pos = usePosData(businessId);

  // Ciri: toggles & promosi
  const [promotionsEnabled, setPromotionsEnabled] = useState(false);
  const [cashSessionEnabled, setCashSessionEnabled] = useState(false);
  const [toggSaving, setToggSaving] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<BusinessPromotion[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const EMPTY_PROMO = { code: '', name: '', discount_type: 'PERCENT' as PosDiscountType, discount_value: '', min_purchase: '0', max_uses: '', valid_from: '', valid_until: '' };
  const [promoForm, setPromoForm] = useState({ ...EMPTY_PROMO });
  const [promoSaving, setPromoSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    const { data: biz } = await supabase
      .from('keusahawanan_businesses')
      .select('*, category:category_id(name)')
      .eq('id', businessId)
      .single();
    setBusinessData(biz);
    setDescription(biz?.description || '');
    // Toggles
    setPromotionsEnabled(biz?.promotions_enabled ?? false);
    setCashSessionEnabled(biz?.cash_session_enabled ?? false);

    const { data: mems } = await supabase
      .from('student_business_memberships')
      .select('*, user:user_id(id, full_name, avatar_url)')
      .eq('business_id', businessId)
      .order('joined_at');
    setMembers(mems || []);

    await pos.fetchLogs(businessId);
  }, [businessId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load promotions when ciri tab is opened
  useEffect(() => {
    if (activeTab === 'ciri' && businessId) loadPromotions();
  }, [activeTab, businessId]);

  const loadPromotions = async () => {
    if (!businessId) return;
    setPromoLoading(true);
    const data = await pos.fetchPromotions(businessId);
    setPromotions(data);
    setPromoLoading(false);
  };

  const handleToggleFeature = async (field: 'promotions_enabled' | 'cash_session_enabled', value: boolean) => {
    if (!businessId) return;
    setToggSaving(field);
    const { error } = await supabase.from('keusahawanan_businesses').update({ [field]: value }).eq('id', businessId);
    if (error) { toast.error('Gagal kemaskini tetapan.'); }
    else {
      if (field === 'promotions_enabled') setPromotionsEnabled(value);
      else setCashSessionEnabled(value);
      await pos.writeLog(businessId, 'SETTINGS_UPDATED', `${field === 'promotions_enabled' ? 'Sistem Promosi' : 'Sesi Tunai'} ${value ? 'diaktifkan' : 'dinyahaktifkan'}.`);
      toast.success((field === 'promotions_enabled' ? 'Sistem Promosi' : 'Sesi Tunai') + (value ? ' diaktifkan.' : ' dinyahaktifkan.'));
    }
    setToggSaving(null);
  };

  const handleAddPromo = async () => {
    if (!businessId) return;
    if (!promoForm.code.trim() || !promoForm.name.trim()) { toast.error('Kod dan nama promosi wajib diisi.'); return; }
    if (!promoForm.discount_value || parseFloat(promoForm.discount_value) <= 0) { toast.error('Nilai diskaun mesti lebih dari 0.'); return; }
    setPromoSaving(true);
    const ok = await pos.addPromotion(businessId, {
      code:           promoForm.code.toUpperCase().trim(),
      name:           promoForm.name.trim(),
      discount_type:  promoForm.discount_type,
      discount_value: parseFloat(promoForm.discount_value),
      min_purchase:   parseFloat(promoForm.min_purchase) || 0,
      max_uses:       promoForm.max_uses ? parseInt(promoForm.max_uses) : null,
      valid_from:     promoForm.valid_from || null,
      valid_until:    promoForm.valid_until || null,
      is_active:      true,
    });
    if (ok) { setPromoForm({ ...EMPTY_PROMO }); await loadPromotions(); }
    setPromoSaving(false);
  };

  const handleTogglePromo = async (p: BusinessPromotion) => {
    await pos.togglePromotion(p.id, businessId!, !p.is_active);
    await loadPromotions();
  };

  const handleDeletePromo = async (p: BusinessPromotion) => {
    if (!window.confirm(`Padam promosi "${p.code}"?`)) return;
    await pos.deletePromotion(p.id, businessId!, p.code);
    await loadPromotions();
  };

  // ── Identity save ────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    await supabase.from('keusahawanan_businesses').update({ description }).eq('id', businessId);
    await pos.writeLog(businessId, 'SETTINGS_UPDATED', 'Maklumat perniagaan dikemaskini.');
    toast.success('Perniagaan disimpan!');
    await fetchData();
    setSaving(false);
  };

  // ── Logo upload ──────────────────────────────────────────────────────────

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !businessId) return;
    setUploading(true);
    const file = e.target.files[0];
    const path = `logos/${businessId}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('keusahawanan-products').upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('keusahawanan-products').getPublicUrl(path);
    await supabase.from('keusahawanan_businesses').update({ logo_url: publicUrl }).eq('id', businessId);
    setBusinessData((prev: any) => ({ ...prev, logo_url: publicUrl }));
    toast.success('Logo dikemaskini!');
    await pos.writeLog(businessId, 'SETTINGS_UPDATED', 'Logo perniagaan dikemaskini.');
    setUploading(false);
  };

  // ── Staff management ──────────────────────────────────────────────────────

  const handleApproveMember = async (memberId: string, userId: string, userName: string) => {
    const { error } = await supabase.from('student_business_memberships').update({ status: 'ACTIVE' }).eq('id', memberId);
    if (error) {
      toast.error('Gagal meluluskan: ' + error.message);
      return;
    }
    await pos.writeLog(businessId!, 'STAFF_APPROVED', `${userName} telah diluluskan sebagai ahli perniagaan.`, { user_id: userId, user_name: userName });
    toast.success(`${userName} diluluskan!`);
    fetchData();
  };

  const handleRejectMember = async (memberId: string, userId: string, userName: string) => {
    const { error } = await supabase.from('student_business_memberships').update({ status: 'REJECTED' }).eq('id', memberId);
    if (error) {
      toast.error('Gagal menolak: ' + error.message);
      return;
    }
    toast.success('Permohonan ditolak.');
    fetchData();
  };

  const handleRemoveMember = async (memberId: string, userId: string, userName: string) => {
    if (!window.confirm(`Buang ${userName} dari perniagaan?`)) return;
    const { error } = await supabase.from('student_business_memberships').delete().eq('id', memberId);
    if (error) {
      toast.error('Gagal membuang: ' + error.message);
      return;
    }
    await pos.writeLog(businessId!, 'STAFF_REMOVED', `${userName} telah dibuang dari perniagaan.`, { user_id: userId, user_name: userName });
    toast.success(`${userName} dibuang.`);
    fetchData();
  };

  // ── Members by status ─────────────────────────────────────────────────────

  const pending  = members.filter(m => m.status === 'PENDING');
  const active   = members.filter(m => m.status === 'ACTIVE');
  const rejected = members.filter(m => m.status === 'REJECTED');

  // ── Render ────────────────────────────────────────────────────────────────

  const tabs = [
    { key: 'identiti', label: 'Identiti',  icon: Building2 },
    { key: 'staff',    label: 'Staff',      icon: Users },
    { key: 'pos',      label: 'POS',        icon: ToggleRight },
    { key: 'ciri',     label: 'Ciri',       icon: Tag },
    { key: 'log',      label: 'Log',        icon: Logs },
  ] as const;

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 rounded-full" style={{ background: color }} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">e-Keusahawanan</p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Urus Perniagaan</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{businessData?.name}</p>
          </div>
          {pending.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-black text-amber-600">{pending.length} permohonan baharu</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-2xl overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all min-w-[80px]"
            style={activeTab === key ? { background: color, color: '#fff' } : { color: 'hsl(var(--muted-foreground)/0.6)' }}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'identiti' && (
          <motion.div key="identiti" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid lg:grid-cols-3 gap-6">
            {/* Logo + visual */}
            <div className="rounded-[2rem] p-6 bg-card border border-border space-y-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                <Camera className="w-3.5 h-3.5" /> Logo Perniagaan
              </p>
              <div className="relative group mx-auto w-32">
                <div className="w-32 h-32 rounded-[2rem] bg-muted/30 border-4 overflow-hidden flex items-center justify-center shadow-xl"
                  style={{ borderColor: hexToRgba(color, 0.4) }}>
                  {businessData?.logo_url
                    ? <img src={businessData.logo_url} alt="logo" className="w-full h-full object-cover" />
                    : <Building2 className="w-12 h-12 text-muted-foreground/20" />
                  }
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} disabled={uploading} />
                </label>
              </div>
              <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{uploading ? 'Memuat naik...' : 'Klik logo untuk tukar'}</p>

              <div className="p-4 rounded-2xl bg-muted/30">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">Kategori</p>
                <p className="text-sm font-black">{businessData?.category?.name || '—'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/30">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">Status Perniagaan</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${businessData?.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <p className="text-sm font-black">{businessData?.status === 'ACTIVE' ? 'Aktif' : businessData?.status === 'PENDING_INTERVIEW' ? 'Menunggu Temuduga' : businessData?.status}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="lg:col-span-2 rounded-[2rem] p-6 bg-card border border-border space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> Maklumat Perniagaan
              </p>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Nama Perniagaan</p>
                <p className="text-xl font-black text-foreground">{businessData?.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Penerangan</p>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Ceritakan tentang perniagaan anda..."
                  className="w-full h-28 px-4 py-3 rounded-2xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground resize-none placeholder:text-muted-foreground/40 focus:border-border transition-all" />
              </div>
              {isOwner && (
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 h-11 px-6 rounded-2xl text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 shadow-lg transition-all hover:brightness-110 active:scale-95"
                  style={{ background: color }}>
                  <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Maklumat'}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'staff' && (
          <motion.div key="staff" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Pending */}
            {pending.length > 0 && (
              <div className="rounded-[2rem] border border-amber-500/30 bg-amber-500/[0.03] p-6 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> {pending.length} Permohonan Menunggu
                </p>
                {pending.map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border">
                    <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center font-black text-sm flex-shrink-0" style={{ color }}>
                      {m.user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground">{m.user?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">Memohon {new Date(m.joined_at).toLocaleDateString('ms-MY')}</p>
                    </div>
                    {isOwner && (
                      <div className="flex gap-2">
                        <button onClick={() => handleRejectMember(m.id, m.user_id, m.user?.full_name)}
                          className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center hover:bg-rose-500/20 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleApproveMember(m.id, m.user_id, m.user?.full_name)}
                          className="w-9 h-9 rounded-xl text-white flex items-center justify-center transition-colors hover:brightness-110"
                          style={{ background: color }}>
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Active members */}
            <div className="rounded-[2rem] bg-card border border-border p-6 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Ahli Aktif ({active.length})
              </p>
              {active.length === 0
                ? <p className="text-sm text-muted-foreground/40 text-center py-6">Tiada ahli aktif lagi.</p>
                : active.map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white flex-shrink-0" style={{ background: color }}>
                      {m.user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground">{m.user?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.role === 'OWNER' ? '👑 Pemilik' : 'Ahli'}</p>
                    </div>
                    {isOwner && m.role !== 'OWNER' && (
                      <button onClick={() => handleRemoveMember(m.id, m.user_id, m.user?.full_name)}
                        className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              }
            </div>
          </motion.div>
        )}

        {activeTab === 'pos' && (
          <motion.div key="pos" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-[2rem] bg-card border border-border p-6 space-y-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <ToggleRight className="w-4 h-4" style={{ color }} /> Tetapan Akses POS
            </p>

            {/* Shift system toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
              <div>
                <p className="text-sm font-black text-foreground">Sistem Syif Automatik</p>
                <p className="text-xs text-muted-foreground mt-0.5">POS diaktifkan secara auto apabila staff ada syif hari ini.</p>
              </div>
              <button onClick={() => setUseShiftSystem(v => !v)}
                className="transition-transform active:scale-95">
                {useShiftSystem
                  ? <ToggleRight className="w-8 h-8" style={{ color }} />
                  : <ToggleLeft className="w-8 h-8 text-muted-foreground/40" />
                }
              </button>
            </div>

            {/* Manual assignment */}
            {!useShiftSystem && (
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                  <UserPlus className="w-3.5 h-3.5" /> Assign Staff POS Manual (Hari Ini)
                </p>
                <div className="space-y-2">
                  {active.filter(m => m.role !== 'OWNER').map(m => {
                    const isAssigned = pos.assignments.some(a => a.user_id === m.user_id);
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20">
                        <div className="flex-1">
                          <p className="text-sm font-black">{m.user?.full_name}</p>
                        </div>
                        <button
                          onClick={() => isAssigned
                            ? pos.removePosAssignment(pos.assignments.find(a => a.user_id === m.user_id)!.id, businessId!)
                            : pos.assignPosToday(businessId!, m.user_id, m.user?.full_name)
                          }
                          className="h-8 px-4 rounded-xl text-[10px] font-black uppercase border transition-all"
                          style={isAssigned
                            ? { background: hexToRgba(color, 0.1), borderColor: hexToRgba(color, 0.4), color }
                            : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground)/0.5)' }
                          }>
                          {isAssigned ? '✓ Bertugas' : 'Assign'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="text-[10px] text-muted-foreground/40 italic px-1">
              * Pemilik perniagaan dan Exco Keusahawanan sentiasa boleh akses POS tanpa assignment.
            </div>
          </motion.div>
        )}

        {activeTab === 'ciri' && (
          <motion.div key="ciri" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-6">

            {/* Feature toggles */}
            <div className="rounded-[2rem] bg-card border border-border p-6 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <ToggleRight className="w-4 h-4" style={{ color }} /> Aktifkan Ciri Komersial
              </p>

              {/* Promotions toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
                <div>
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4" style={{ color }} />
                    <p className="text-sm font-black text-foreground">Sistem Kupon & Promosi</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Benarkan penggunaan kod kupon semasa proses pembayaran di POS.</p>
                </div>
                <button onClick={() => isOwner && handleToggleFeature('promotions_enabled', !promotionsEnabled)}
                  disabled={toggSaving === 'promotions_enabled' || !isOwner}
                  className="transition-transform active:scale-95 disabled:opacity-40">
                  {promotionsEnabled
                    ? <ToggleRight className="w-8 h-8" style={{ color }} />
                    : <ToggleLeft className="w-8 h-8 text-muted-foreground/40" />}
                </button>
              </div>

              {/* Cash session toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
                <div>
                  <div className="flex items-center gap-2">
                    <BadgePercent className="w-4 h-4" style={{ color }} />
                    <p className="text-sm font-black text-foreground">Sesi Baldi Wang (Cash Checkpoint)</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Rekod amaun tunai dalam baldi pada sebarang masa (buka pagi, semak tengahari, tutup malam).</p>
                </div>
                <button onClick={() => isOwner && handleToggleFeature('cash_session_enabled', !cashSessionEnabled)}
                  disabled={toggSaving === 'cash_session_enabled' || !isOwner}
                  className="transition-transform active:scale-95 disabled:opacity-40">
                  {cashSessionEnabled
                    ? <ToggleRight className="w-8 h-8" style={{ color }} />
                    : <ToggleLeft className="w-8 h-8 text-muted-foreground/40" />}
                </button>
              </div>
            </div>

            {/* Promotion management — only shown when promotions enabled */}
            {promotionsEnabled && (
              <div className="grid lg:grid-cols-5 gap-6">
                {/* Create form */}
                <div className="lg:col-span-2 rounded-[2rem] bg-card border border-border p-6 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> Cipta Kupon Baharu
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Kod Kupon</p>
                      <input type="text" value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                        placeholder="JIMAT10" className="w-full h-9 px-3 rounded-xl text-xs font-black outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all tracking-widest" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Jenis Diskaun</p>
                      <select value={promoForm.discount_type} onChange={e => setPromoForm(f => ({ ...f, discount_type: e.target.value as PosDiscountType }))}
                        className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all">
                        <option value="PERCENT">Peratus (%)</option>
                        <option value="FIXED">Tetap (RM)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Nama Promosi</p>
                    <input type="text" value={promoForm.name} onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Diskaun Hari Jadi" className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Nilai {promoForm.discount_type === 'PERCENT' ? '(%)' : '(RM)'}</p>
                      <input type="number" min="0" step="0.01" value={promoForm.discount_value} onChange={e => setPromoForm(f => ({ ...f, discount_value: e.target.value }))}
                        placeholder="10" className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Min Beli (RM)</p>
                      <input type="number" min="0" step="0.01" value={promoForm.min_purchase} onChange={e => setPromoForm(f => ({ ...f, min_purchase: e.target.value }))}
                        placeholder="0" className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Had Guna (kosong=∞)</p>
                      <input type="number" min="1" value={promoForm.max_uses} onChange={e => setPromoForm(f => ({ ...f, max_uses: e.target.value }))}
                        placeholder="∞" className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Sah Dari</p>
                      <input type="date" value={promoForm.valid_from} onChange={e => setPromoForm(f => ({ ...f, valid_from: e.target.value }))}
                        className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Sah Hingga</p>
                      <input type="date" value={promoForm.valid_until} onChange={e => setPromoForm(f => ({ ...f, valid_until: e.target.value }))}
                        className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all" />
                    </div>
                  </div>

                  <button onClick={handleAddPromo} disabled={promoSaving}
                    className="w-full h-10 rounded-xl text-xs font-black transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: color, color: '#fff' }}>
                    {promoSaving ? 'Menyimpan...' : '+ Cipta Kupon'}
                  </button>
                </div>

                {/* Promo list */}
                <div className="lg:col-span-3 rounded-[2rem] bg-card border border-border p-6 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                    <Ticket className="w-3.5 h-3.5" style={{ color }} /> Senarai Kupon ({promotions.length})
                  </p>
                  {promoLoading ? (
                    <div className="h-20 flex items-center justify-center">
                      <div className="w-5 h-5 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
                    </div>
                  ) : promotions.length === 0 ? (
                    <p className="text-sm text-muted-foreground/40 text-center py-8 font-black">Tiada kupon lagi. Cipta yang pertama!</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
                      {promotions.map(p => {
                        const isExpired = p.valid_until && new Date().toISOString().split('T')[0] > p.valid_until;
                        const isFull    = p.max_uses !== null && p.uses_count >= p.max_uses;
                        return (
                          <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors group">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black tracking-widest"
                                  style={{ background: hexToRgba(color, 0.1), color }}>{p.code}</span>
                                <p className="text-xs font-black text-foreground truncate">{p.name}</p>
                                {(isExpired || isFull) && <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-rose-500/10 text-rose-500">TAMAT</span>}
                              </div>
                              <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                                {p.discount_type === 'PERCENT' ? `${p.discount_value}% diskaun` : `RM${p.discount_value.toFixed(2)} diskaun`}
                                {p.min_purchase > 0 ? ` · Min RM${p.min_purchase.toFixed(2)}` : ''}
                                {p.max_uses !== null ? ` · ${p.uses_count}/${p.max_uses} guna` : ` · ${p.uses_count} kali guna`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => handleTogglePromo(p)} className="transition-transform active:scale-95">
                                {p.is_active
                                  ? <ToggleRight className="w-6 h-6" style={{ color }} />
                                  : <ToggleLeft className="w-6 h-6 text-muted-foreground/40" />}
                              </button>
                              <button onClick={() => handleDeletePromo(p)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground/40 hover:text-rose-500 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'log' && (
          <motion.div key="log" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-[2rem] bg-card border border-border p-6 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" style={{ color }} /> Log Aktiviti Perniagaan
            </p>
            <p className="text-[10px] text-muted-foreground/50 italic">Rekod terperinci semua tindakan dalam sistem. Menunjukkan 100 log terkini.</p>
            {pos.logs.length === 0 ? (
              <div className="py-12 text-center">
                <Activity className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm font-black text-muted-foreground/40">Tiada log lagi.</p>
              </div>
            ) : (
              <div className="space-y-2 mt-4">
                {pos.logs.map((log, i) => (
                  <motion.div key={log.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.02 * i }}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-black text-foreground">{LOG_LABELS[log.action_type] || log.action_type}</p>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-[9px] font-black uppercase text-muted-foreground">{log.action_type}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{log.description}</p>
                      <p className="text-[9px] text-muted-foreground/40 mt-1">{log.actor_name} · {fmtDT(log.created_at)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
