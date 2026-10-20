import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSwitcher } from '@/contexts/BusinessSwitcherContext';
import { usePosData } from '@/hooks/usePosData';
import { supabase } from '@/lib/supabase';
import { cn, hexToRgba } from '@/lib/utils';
import {
  Camera, Save, Users, ShieldCheck, Trash2, Check, X, Clock,
  Activity, Building2, ToggleLeft, ToggleRight, UserPlus,
  Tag, Ticket, BadgePercent, Plus, ShieldAlert, HelpCircle,
  CreditCard, Handshake, Phone, Upload, Image, Store, Crown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTour } from '@/hooks/useTour';
import { SystemTour } from '@/components/ui/SystemTour';
import { sendNotificationToUser } from '@/lib/notifications';
import { type BusinessPromotion, type PosDiscountType } from '@/types';
import { BusinessJadual, SesiBusiness } from './BusinessShiftModule';
import { useTranslation } from 'react-i18next';

// Dynamic log action labels resolved via getLogLabel with i18n in UrusPerniagaanPage

const fmtDT = (iso: string) => new Date(iso).toLocaleString('ms-MY', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

export function UrusPerniagaanPage() {
  const { color } = useExcoTheme();
  const { t } = useTranslation(['commerce', 'keusahawanan', 'common']);
  const { user, profile } = useAuth();
  const { selectedBusiness, isKeusahawananAdmin, refreshBusinesses } = useBusinessSwitcher();
  const { runTour, startTour, closeTour } = useTour('KEUSAHAWANAN_URUS', !!selectedBusiness?.id);
  const getLogLabel = (actionType: string) => {
    switch (actionType) {
      case 'TRANSACTION_CREATE': return t('commerce:log_action_trans_create', 'Transaksi Baharu');
      case 'TRANSACTION_VOID': return t('commerce:log_action_trans_void', 'Transaksi Dibatalkan');
      case 'PRODUCT_ADD': return t('commerce:log_action_prod_add', 'Produk Ditambah');
      case 'PRODUCT_EDIT': return t('commerce:log_action_prod_edit', 'Produk Dikemaskini');
      case 'PRODUCT_DELETE': return t('commerce:log_action_prod_delete', 'Produk Dipadam');
      case 'STOCK_EDIT': return t('commerce:log_action_stock_edit', 'Stok Dikemaskini');
      case 'POS_ASSIGNED': return t('commerce:log_action_pos_assigned', 'Penugasan POS');
      case 'STAFF_APPROVED': return t('commerce:log_action_staff_approved', 'Ahli Diluluskan');
      case 'STAFF_REMOVED': return t('commerce:log_action_staff_removed', 'Ahli Dibuang');
      case 'SETTINGS_UPDATED': return t('commerce:log_action_settings_updated', 'Tetapan Dikemaskini');
      case 'EXPENSE_ADD': return t('commerce:log_action_expense_add', 'Perbelanjaan Direkodkan');
      case 'EXPENSE_DELETE': return t('commerce:log_action_expense_delete', 'Perbelanjaan Dipadam');
      case 'PROMO_CREATE': return t('commerce:log_action_promo_create', 'Promosi Dicipta');
      case 'PROMO_USED': return t('commerce:log_action_promo_used', 'Kupon Digunakan');
      case 'PROMO_TOGGLE': return t('commerce:log_action_promo_toggle', 'Promosi Dikemaskini');
      case 'CASH_CHECKPOINT': return t('commerce:log_action_cash_checkpoint', 'Checkpoint Tunai');
      default: return actionType;
    }
  };
  const getLogLabel = (actionType: string) => {
    switch (actionType) {
      case 'TRANSACTION_CREATE': return t('commerce:log_action_trans_create', 'Transaksi Baharu');
      case 'TRANSACTION_VOID': return t('commerce:log_action_trans_void', 'Transaksi Dibatalkan');
      case 'PRODUCT_ADD': return t('commerce:log_action_prod_add', 'Produk Ditambah');
      case 'PRODUCT_EDIT': return t('commerce:log_action_prod_edit', 'Produk Dikemaskini');
      case 'PRODUCT_DELETE': return t('commerce:log_action_prod_delete', 'Produk Dipadam');
      case 'STOCK_EDIT': return t('commerce:log_action_stock_edit', 'Stok Dikemaskini');
      case 'POS_ASSIGNED': return t('commerce:log_action_pos_assigned', 'Penugasan POS');
      case 'STAFF_APPROVED': return t('commerce:log_action_staff_approved', 'Ahli Diluluskan');
      case 'STAFF_REMOVED': return t('commerce:log_action_staff_removed', 'Ahli Dibuang');
      case 'SETTINGS_UPDATED': return t('commerce:log_action_settings_updated', 'Tetapan Dikemaskini');
      case 'EXPENSE_ADD': return t('commerce:log_action_expense_add', 'Perbelanjaan Direkodkan');
      case 'EXPENSE_DELETE': return t('commerce:log_action_expense_delete', 'Perbelanjaan Dipadam');
      case 'PROMO_CREATE': return t('commerce:log_action_promo_create', 'Promosi Dicipta');
      case 'PROMO_USED': return t('commerce:log_action_promo_used', 'Kupon Digunakan');
      case 'PROMO_TOGGLE': return t('commerce:log_action_promo_toggle', 'Promosi Dikemaskini');
      case 'CASH_CHECKPOINT': return t('commerce:log_action_cash_checkpoint', 'Checkpoint Tunai');
      default: return actionType;
    }
  };

  const [businessData, setBusinessData] = useState<any>(null);
  const [members, setMembers]           = useState<any[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState<'profil' | 'pasukan' | 'kupon_log'>('profil');

  const [description, setDescription] = useState('');
  const [useShiftSystem, setUseShiftSystem] = useState(false);
  const [regType, setRegType] = useState<'SSM' | 'PUSKEP' | 'EMS'>('PUSKEP');
  const [ssmRegNumber, setSsmRegNumber] = useState('');
  const [mentors, setMentors] = useState<{ name: string; department: string }[]>([]);

  // Derived
  const businessId = selectedBusiness?.id;
  const isOwner = isKeusahawananAdmin || 
    (selectedBusiness?.owner_id === user?.id) || 
    (members.find(m => m.user_id === user?.id)?.role === 'OWNER');

  const pos = usePosData(businessId);

  // Commercial toggles & promosi
  const [promotionsEnabled, setPromotionsEnabled] = useState(false);
  const [cashSessionEnabled, setCashSessionEnabled] = useState(false);
  const [toggSaving, setToggSaving] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<BusinessPromotion[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const EMPTY_PROMO = { code: '', name: '', discount_type: 'PERCENT' as PosDiscountType, discount_value: '', min_purchase: '0', max_uses: '', valid_from: '', valid_until: '' };
  const [promoForm, setPromoForm] = useState({ ...EMPTY_PROMO });
  const [promoSaving, setPromoSaving] = useState(false);

  // Ownership Transfer
  const [transferToId, setTransferToId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // PolyMart Payment Settings
  const [onlinePayEnabled, setOnlinePayEnabled] = useState(false);
  const [codEnabled, setCodEnabled] = useState(true);
  const [paymentQrUrl, setPaymentQrUrl] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [paymentDeadlineValue, setPaymentDeadlineValue] = useState(24);
  const [paymentDeadlineUnit, setPaymentDeadlineUnit] = useState<'HOURS' | 'DAYS' | 'WEEKS'>('HOURS');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);

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
    setUseShiftSystem(biz?.is_shift_enabled ?? false);
    setRegType(biz?.registration_type === 'SSM' ? 'SSM' : biz?.registration_type === 'EMS' ? 'EMS' : 'PUSKEP');
    setSsmRegNumber(biz?.ssm_registration_number || '');
    setMentors(biz?.mentors || []);
    // Payment settings
    setOnlinePayEnabled(biz?.online_payment_enabled ?? false);
    setCodEnabled(biz?.cod_enabled ?? true);
    setPaymentQrUrl(biz?.payment_qr_url || '');
    setPaymentInstructions(biz?.payment_instructions || '');
    setBusinessPhone(biz?.business_phone || '');
    setPaymentDeadlineValue(biz?.payment_deadline_value ?? 24);
    setPaymentDeadlineUnit(biz?.payment_deadline_unit ?? 'HOURS');

    const { data: mems } = await supabase
      .from('student_business_memberships')
      .select('*, user:user_id(id, full_name, avatar_url)')
      .eq('business_id', businessId)
      .order('joined_at');
    setMembers(mems || []);

    await pos.fetchLogs(businessId);
  }, [businessId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load promotions when kupon_log tab is opened
  useEffect(() => {
    if (activeTab === 'kupon_log' && businessId) loadPromotions();
  }, [activeTab, businessId]);

  const loadPromotions = async () => {
    if (!businessId) return;
    setPromoLoading(true);
    const data = await pos.fetchPromotions(businessId);
    setPromotions(data);
    setPromoLoading(false);
  };

  const handleToggleFeature = async (field: 'promotions_enabled' | 'cash_session_enabled' | 'is_shift_enabled', value: boolean) => {
    if (!businessId) return;
    setToggSaving(field);
    const { error } = await supabase.from('keusahawanan_businesses').update({ [field]: value }).eq('id', businessId);
    if (error) { toast.error(t('keusahawanan:toast_settings_update_failed', 'Gagal kemaskini tetapan.')); }
    else {
      let label = '';
      if (field === 'promotions_enabled') { setPromotionsEnabled(value); label = 'Sistem Promosi'; }
      else if (field === 'cash_session_enabled') { setCashSessionEnabled(value); label = 'Sesi Tunai'; }
      else { setUseShiftSystem(value); label = 'Sistem Syif'; }
      
      await pos.writeLog(businessId, 'SETTINGS_UPDATED', `${label} ${value ? 'diaktifkan' : 'dinyahaktifkan'}.`);
      toast.success(t('keusahawanan:toast_setting_status', '{{label}} {{status}}.', { label, status: value ? 'diaktifkan' : 'dinyahaktifkan' }));
    }
    setToggSaving(null);
  };

  const handleTransferOwnership = async () => {
    if (!transferToId || !businessId) return;
    
    // Find member
    const member = members.find(m => m.user_id === transferToId);
    if (!member) return;

    if (!window.confirm(t('commerce:confirm_transfer_ownership', "AMARAN: Adakah anda pasti mahu menyerahkan pemilikan '{{bizName}}' kepada '{{memberName}}'?\n\nTindakan ini TIDAK boleh diundurkan dan anda akan dilucutkan peranan Pemilik secara serta merta.", { bizName: businessData?.name || '', memberName: member.user?.full_name || '' }))) {
      return;
    }

    setIsTransferring(true);
    const success = await pos.transferOwnership(businessId, transferToId, member.user?.full_name || t('commerce:new_member_fallback', 'Ahli Baru'));
    
    if (success) {
      setTransferToId('');
      await fetchData();
      refreshBusinesses(); // Refresh globally to update the sidebar if owner lost ownership
    }
    setIsTransferring(false);
  };

  const handleAddPromo = async () => {
    if (!businessId) return;
    if (!promoForm.code.trim() || !promoForm.name.trim()) { toast.error(t('keusahawanan:toast_promo_required', 'Kod dan nama promosi wajib diisi.')); return; }
    if (!promoForm.discount_value || parseFloat(promoForm.discount_value) <= 0) { toast.error(t('commerce:discount_value_positive', 'Nilai diskaun mesti lebih dari 0.')); return; }
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
    if (!window.confirm(t('commerce:confirm_delete_promo', 'Padam promosi "{{code}}"?', { code: p.code }))) return;
    await pos.deletePromotion(p.id, businessId!, p.code);
    await loadPromotions();
  };

  // Identity save
  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    let finalRegType = regType;
    let finalSsm = ssmRegNumber.trim();
    let updatedHistory = businessData?.registration_history || [];
    
    // Generate PUSKEP code if switching from SSM to PUSKEP and it doesn't have a PUSKEP code yet
    if (finalRegType === 'PUSKEP' && (!finalSsm || !finalSsm.startsWith('P-'))) {
       const { data: puskepNumber, error: puskepError } = await supabase.rpc('generate_puskep_reg_number');
       if (!puskepError && puskepNumber) {
          if (businessData?.registration_type === 'SSM' && businessData?.ssm_registration_number) {
              updatedHistory = [
                ...updatedHistory, 
                { type: 'SSM', number: businessData.ssm_registration_number, changed_at: new Date().toISOString() }
              ];
          }
          finalSsm = puskepNumber;
          setSsmRegNumber(finalSsm);
       }
    }

    await supabase.from('keusahawanan_businesses').update({ 
       description,
       registration_type: finalRegType,
       ssm_registration_number: finalSsm,
       mentors: mentors.filter(m => m.name.trim() !== ''),
       registration_history: updatedHistory
    }).eq('id', businessId);
    await pos.writeLog(businessId, 'SETTINGS_UPDATED', t('commerce:log_biz_info_updated', 'Maklumat perniagaan dikemaskini.'));
    toast.success(t('keusahawanan:toast_business_saved', 'Perniagaan disimpan!'));
    await fetchData();
    setSaving(false);
  };

  // Payment settings save
  const handleSavePaymentSettings = async () => {
    if (!businessId) return;
    if (onlinePayEnabled && !paymentQrUrl) {
      toast.error(t('keusahawanan:toast_qr_required', 'Sila muat naik gambar QR dahulu.'));
      return;
    }
    setPaymentSaving(true);
    const { error } = await supabase.from('keusahawanan_businesses').update({
      online_payment_enabled: onlinePayEnabled,
      cod_enabled: codEnabled,
      payment_qr_url: paymentQrUrl || null,
      payment_instructions: paymentInstructions || null,
      business_phone: businessPhone || null,
      payment_deadline_value: paymentDeadlineValue,
      payment_deadline_unit: paymentDeadlineUnit,
    }).eq('id', businessId);
    if (error) {
      toast.error(t('keusahawanan:toast_save_failed', 'Gagal menyimpan: {{error}}', { error: error.message }));
    } else {
      await pos.writeLog(
        businessId,
        'SETTINGS_UPDATED',
        t('commerce:log_polymart_payment_updated', 'Tetapan pembayaran PolyMart dikemaskini. Online QR: {{online}}, COD: {{cod}}', { online: onlinePayEnabled ? 'ON' : 'OFF', cod: codEnabled ? 'ON' : 'OFF' })
      );
      toast.success(t('keusahawanan:toast_payment_settings_saved', 'Tetapan pembayaran disimpan!'));
    }
    setPaymentSaving(false);
  };

  // Logo upload
  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0 || !businessId) return;
      const file = e.target.files[0];
      
      const { compressImage } = await import('@/lib/imageCompression');
      const compressedFile = await compressImage(file);
      
      const path = `logos/${businessId}/${Date.now()}.${compressedFile.name.split('.').pop()}`;
      
      const { error } = await supabase.storage.from('keusahawanan-products').upload(path, compressedFile, { upsert: true, contentType: compressedFile.type });
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('keusahawanan-products').getPublicUrl(path);
      
      await supabase.from('keusahawanan_businesses').update({ logo_url: publicUrl }).eq('id', businessId);
      setBusinessData((prev: any) => ({ ...prev, logo_url: publicUrl }));
      
      await refreshBusinesses();
      toast.success(t('keusahawanan:toast_logo_updated', 'Logo dikemaskini!'));
      await pos.writeLog(businessId, 'SETTINGS_UPDATED', t('commerce:log_logo_uploaded', 'Pemilik telah memuat naik logo perniagaan yang baharu.'));
    } catch (err: any) {
      toast.error(t('keusahawanan:toast_logo_upload_error', 'Ralat muat naik logo: {{error}}', { error: err.message }));
    } finally {
      setUploading(false);
    }
  };

  // Staff management
  const handleApproveMember = async (memberId: string, userId: string, userName: string) => {
    const { error } = await supabase.from('student_business_memberships').update({ status: 'ACTIVE' }).eq('id', memberId);
    if (error) {
      toast.error(t('keusahawanan:toast_member_approve_failed', 'Gagal meluluskan: {{error}}', { error: error.message }));
      return;
    }
    await pos.writeLog(businessId!, 'STAFF_APPROVED', t('commerce:log_staff_approved_desc', '{{name}} telah diluluskan sebagai ahli perniagaan.', { name: userName }), { user_id: userId, user_name: userName });
    try {
      await sendNotificationToUser(userId, {
        title: t('commerce:notif_membership_approved_title', 'Permohonan Diterima!'),
        message: t('commerce:notif_membership_approved_desc', 'Anda telah diluluskan sebagai ahli perniagaan "{{name}}". Selamat datang!', { name: businessData?.name || '' }),
        type: 'STATUS_UPDATE',
        module: 'KEUSAHAWANAN',
        link: '/keusahawanan/dashboard',
      });
    } catch {}
    toast.success(t('keusahawanan:toast_member_approved', '{{name}} diluluskan!', { name: userName }));
    fetchData();
  };

  const handleRejectMember = async (memberId: string, userId: string, userName: string) => {
    const { error } = await supabase.from('student_business_memberships').update({ status: 'REJECTED' }).eq('id', memberId);
    if (error) {
      toast.error(t('keusahawanan:toast_member_reject_failed', 'Gagal menolak: {{error}}', { error: error.message }));
      return;
    }
    try {
      await sendNotificationToUser(userId, {
        title: t('commerce:notif_membership_rejected_title', 'Permohonan Ditolak'),
        message: t('commerce:notif_membership_rejected_desc', 'Permohonan anda untuk menyertai perniagaan "{{name}}" telah ditolak oleh pemilik.', { name: businessData?.name || '' }),
        type: 'STATUS_UPDATE',
        module: 'KEUSAHAWANAN',
        link: '/keusahawanan/dashboard',
      });
    } catch {}
    toast.success(t('keusahawanan:toast_member_rejected', 'Permohonan ditolak.'));
    fetchData();
  };

  const handleRemoveMember = async (memberId: string, userId: string, userName: string) => {
    if (!window.confirm(t('commerce:confirm_remove_member', 'Buang {{name}} dari perniagaan?', { name: userName }))) return;
    const { error } = await supabase.from('student_business_memberships').delete().eq('id', memberId);
    if (error) {
      toast.error(t('keusahawanan:toast_member_remove_failed', 'Gagal membuang: {{error}}', { error: error.message }));
      return;
    }
    await pos.writeLog(businessId!, 'STAFF_REMOVED', t('commerce:log_staff_removed_desc', '{{name}} telah dibuang dari perniagaan.', { name: userName }), { user_id: userId, user_name: userName });
    try {
      await sendNotificationToUser(userId, {
        title: t('commerce:notif_membership_revoked_title', 'Keahlian Perniagaan Ditarik Balik'),
        message: t('commerce:notif_membership_revoked_desc', 'Keahlian anda dalam perniagaan "{{name}}" telah ditarik balik oleh pemilik.', { name: businessData?.name || '' }),
        type: 'STATUS_UPDATE',
        module: 'KEUSAHAWANAN',
        link: '/keusahawanan/dashboard',
      });
    } catch {}
    toast.success(t('keusahawanan:toast_member_removed', '{{name}} dibuang.', { name: userName }));
    fetchData();
  };

  // Members by status
  const pending  = members.filter(m => m.status === 'PENDING');
  const active   = members.filter(m => m.status === 'ACTIVE');

  // Tabs configuration: 3 Consolidated Domains
  const tabs = [
    { key: 'profil' as const, label: t('keusahawanan:biz_tab_profile', 'Profil & Pendaftaran'), icon: Store },
    { key: 'pasukan' as const, label: t('keusahawanan:biz_tab_team', 'Pasukan & Operasi'), icon: Users, badge: pending.length > 0 ? pending.length : undefined },
    { key: 'kupon_log' as const, label: t('keusahawanan:biz_tab_coupons', 'Komersial & Log'), icon: Tag },
  ];

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6 pb-28 md:pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 rounded-full" style={{ background: color }} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">{t('keusahawanan:module_title', 'Modul Keusahawanan Siswa')}</p>
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                {t('keusahawanan:biz_manage_title', 'Urus Perniagaan')}
                <button onClick={startTour} className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer">
                  <HelpCircle className="w-4 h-4" />
                </button>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{businessData?.name}</p>
            </div>
          </div>
          {pending.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-black text-amber-600">{t('keusahawanan:biz_new_applications_count', '{{count}} permohonan baharu', { count: pending.length })}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modern Segmented Tab bar */}
      <div className="tour-urus-nav flex gap-1.5 p-1 rounded-2xl bg-muted/40 border border-border/50 max-w-xl overflow-x-auto scrollbar-hide">
        {tabs.map(({ key, label, icon: Icon, badge }) => {
          let tourClass = '';
          if (key === 'pasukan') tourClass = 'tour-urus-add';
          if (key === 'kupon_log') tourClass = 'tour-urus-setting';

          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-xs font-black tracking-wide transition-all shrink-0 cursor-pointer",
                tourClass,
                activeTab === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
              style={activeTab === key ? { background: color, color: '#fff' } : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
              {badge && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'profil' && (
          <motion.div key="profil" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Logo + visual */}
              <div className="rounded-[2rem] p-6 bg-card border border-border space-y-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5" /> {t('commerce:business_logo', 'Logo Perniagaan')}
                </p>
                <div className="relative group mx-auto w-32">
                  <div className="w-32 h-32 rounded-[2rem] bg-muted/30 border-4 overflow-hidden flex items-center justify-center shadow-xl"
                    style={{ borderColor: hexToRgba(color, 0.4) }}>
                    {businessData?.logo_url
                      ? <img src={businessData.logo_url} alt="logo" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      : <Building2 className="w-12 h-12 text-muted-foreground/20" />
                    }
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} disabled={uploading} />
                  </label>
                </div>
                <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{uploading ? t('commerce:uploading', 'Memuat naik...') : t('commerce:click_logo_to_change', 'Klik logo untuk tukar')}</p>

                <div className="p-4 rounded-2xl bg-muted/30">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">{t('keusahawanan:business_category', 'Kategori')}</p>
                  <p className="text-sm font-black">{businessData?.category?.name || '—'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">{t('keusahawanan:approval_status', 'Status Perniagaan')}</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${businessData?.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <p className="text-sm font-black">{businessData?.status === 'ACTIVE' ? t('commerce:status_active', 'Aktif') : businessData?.status === 'PENDING_INTERVIEW' ? t('commerce:status_pending_interview', 'Menunggu Temuduga') : businessData?.status}</p>
                  </div>
                </div>
              </div>

              {/* Description & Business Info */}
              <div className="lg:col-span-2 rounded-[2rem] p-6 bg-card border border-border space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" /> {t('commerce:business_info', 'Maklumat Perniagaan')}
                </p>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">{t('keusahawanan:business_name', 'Nama Perniagaan')}</p>
                  <p className="text-xl font-black text-foreground">{businessData?.name}</p>
                </div>

                {/* Registration and Mentor */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">{t('commerce:registration_type', 'Jenis Pendaftaran')}</p>
                    <select value={regType} onChange={e => setRegType(e.target.value as 'SSM'|'PUSKEP'|'EMS')} disabled={regType === 'EMS'}
                      className="w-full h-11 px-4 rounded-2xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all">
                      <option value="PUSKEP">PUSKEP-POLISAS</option>
                      <option value="SSM">SSM</option>
                      <option value="EMS">EMS (Sementara)</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">{t('commerce:registration_number', 'No. Pendaftaran')}</p>
                    <input type="text" value={ssmRegNumber} onChange={e => setSsmRegNumber(e.target.value)} disabled={regType === 'PUSKEP' || regType === 'EMS'}
                      placeholder={regType === 'PUSKEP' ? t('commerce:will_be_generated', 'Akan Dijana') : regType === 'EMS' ? t('commerce:ems_serial_no', 'No. Siri EMS') : t('commerce:reg_no_placeholder', 'Contoh: 202101000001')}
                      className="w-full h-11 px-4 rounded-2xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all disabled:opacity-50" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">{t('commerce:advisor_mentors_max5', 'Mentor Penasihat (Maks 5)')}</p>
                    {isOwner && mentors.length < 5 && (
                      <button type="button" onClick={() => setMentors([...mentors, { name: '', department: '' }])}
                        className="text-xs text-amber-600 dark:text-amber-500 font-bold hover:text-amber-700 dark:hover:text-amber-400 flex items-center gap-1 cursor-pointer">
                        <Plus className="w-3 h-3" /> {t('commerce:add_mentor', 'Tambah Mentor')}
                      </button>
                    )}
                  </div>
                  {mentors.map((m, i) => (
                    <div key={i} className="flex flex-col gap-4 p-4 rounded-2xl bg-muted/20 border border-border/50 relative group">
                      {isOwner && (
                        <button type="button" onClick={() => setMentors(mentors.filter((_, idx) => idx !== i))}
                          className="absolute top-3 right-3 text-muted-foreground/40 hover:text-rose-500 cursor-pointer">
                          {t('common:close', 'Tutup')}
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">{t('commerce:mentor_name', 'Nama Mentor')}</p>
                          <input type="text" value={m.name} onChange={e => {
                              const newM = [...mentors];
                              newM[i].name = e.target.value;
                              setMentors(newM);
                            }}
                            placeholder="Contoh: Dr. Ahmad Ali"
                            disabled={!isOwner}
                            className="w-full h-11 px-4 rounded-2xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all disabled:opacity-50" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">{t('commerce:mentor_department', 'Jabatan Mentor')}</p>
                          <input type="text" value={m.department} onChange={e => {
                              const newM = [...mentors];
                              newM[i].department = e.target.value;
                              setMentors(newM);
                            }}
                            placeholder="Contoh: JTMK"
                            disabled={!isOwner}
                            className="w-full h-11 px-4 rounded-2xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all disabled:opacity-50" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">{t('keusahawanan:biz_description', 'Keterangan Perniagaan')}</p>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder={t('keusahawanan:biz_desc_placeholder', 'Ceritakan tentang perniagaan anda...')}
                    className="w-full h-28 px-4 py-3 rounded-2xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground resize-none placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                </div>
                {isOwner && (
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 h-11 px-6 rounded-2xl text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 shadow-lg transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                    style={{ background: color }}>
                    <Save className="w-4 h-4" /> {saving ? t('common:saving', 'Menyimpan...') : t('keusahawanan:biz_save_changes', 'Simpan Perubahan')}
                  </button>
                )}
              </div>
            </div>

            {/* PolyMart Payment Settings */}
            <div className="rounded-[2rem] bg-card border border-border p-6 space-y-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4" style={{ color }} /> {t('commerce:polymart_payment_settings', 'Tetapan Pembayaran PolyMart')}
              </p>
              <p className="text-xs text-muted-foreground -mt-2">
                {t('commerce:polymart_payment_desc', 'Aktifkan pembayaran dalam talian untuk pesanan di PolyMart. Pelanggan akan nampak QR atau pilihan COD semasa checkout.')}
              </p>

              {/* QR Online toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    <p className="text-sm font-black text-foreground">{t('commerce:online_payment_qr', 'Pembayaran Online (QR)')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('commerce:online_payment_qr_desc', 'Pelanggan bayar melalui QR dan upload resit sebagai bukti.')}</p>
                </div>
                <button onClick={() => {
                    if (!isOwner) return;
                    const newVal = !onlinePayEnabled;
                    if (!newVal && !codEnabled) { toast.error(t('keusahawanan:toast_min_one_payment_method', 'Mesti ada sekurang-kurangnya satu kaedah pembayaran aktif.')); return; }
                    setOnlinePayEnabled(newVal);
                  }}
                  disabled={!isOwner}
                  className="transition-transform active:scale-95 disabled:opacity-40 cursor-pointer">
                  {onlinePayEnabled
                    ? <ToggleRight className="w-8 h-8" style={{ color }} />
                    : <ToggleLeft className="w-8 h-8 text-muted-foreground/40" />}
                </button>
              </div>

              {/* COD toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
                <div>
                  <div className="flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-amber-500" />
                    <p className="text-sm font-black text-foreground">{t('commerce:cod_payment', 'Bayar Bersemuka (COD)')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('keusahawanan:biz_cod_desc', 'Pelanggan bayar terus kepada vendor semasa ambil pesanan.')}</p>
                </div>
                <button onClick={() => {
                    if (!isOwner) return;
                    const newVal = !codEnabled;
                    if (!newVal && !onlinePayEnabled) { toast.error(t('keusahawanan:toast_min_one_payment_method', 'Mesti ada sekurang-kurangnya satu kaedah pembayaran aktif.')); return; }
                    setCodEnabled(newVal);
                  }}
                  disabled={!isOwner}
                  className="transition-transform active:scale-95 disabled:opacity-40 cursor-pointer">
                  {codEnabled
                    ? <ToggleRight className="w-8 h-8" style={{ color }} />
                    : <ToggleLeft className="w-8 h-8 text-muted-foreground/40" />}
                </button>
              </div>

              {/* QR Details */}
              <AnimatePresence>
                {onlinePayEnabled && (
                  <motion.div initial={{ opacity: 0, }} animate={{ opacity: 1, }} exit={{ opacity: 0, }} className="overflow-hidden">
                    <div className="space-y-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/15">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                        <Image className="w-3.5 h-3.5" /> {t('commerce:payment_qr_info', 'Maklumat QR Pembayaran')}
                      </p>

                      {/* QR image upload */}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">{t('commerce:payment_qr_image', 'Gambar QR Pembayaran')}</p>
                        <div className="flex items-start gap-4">
                          {paymentQrUrl && (
                            <img src={paymentQrUrl} alt="QR" className="w-24 h-24 rounded-xl border border-border/50 object-contain bg-white" />
                          )}
                          <label className={`flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-black cursor-pointer transition-all border border-border/50 hover:bg-muted/50 ${qrUploading ? 'opacity-50' : ''}`}>
                            <Upload className="w-4 h-4" />
                            {qrUploading ? t('commerce:uploading', 'Memuat naik...') : paymentQrUrl ? t('commerce:change_qr', 'Tukar QR') : t('commerce:upload_qr', 'Muat Naik QR')}
                            <input type="file" accept="image/*" className="hidden" disabled={qrUploading} onChange={async (e) => {
                              if (!e.target.files?.[0] || !businessId) return;
                              setQrUploading(true);
                              try {
                                const file = e.target.files[0];
                                const path = `payment-qr/${businessId}/${Date.now()}.${file.name.split('.').pop()}`;
                                const { error: upErr } = await supabase.storage.from('keusahawanan-products').upload(path, file, { upsert: true, contentType: file.type });
                                if (upErr) throw upErr;
                                const { data: { publicUrl } } = supabase.storage.from('keusahawanan-products').getPublicUrl(path);
                                setPaymentQrUrl(publicUrl);
                                toast.success(t('keusahawanan:toast_qr_uploaded', 'QR dimuat naik!'));
                              } catch (err: any) { toast.error(err.message); }
                              setQrUploading(false);
                            }} />
                          </label>
                        </div>
                      </div>

                      {/* Bank details / instructions */}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">{t('keusahawanan:biz_bank_instructions_label', 'Arahan / Maklumat Bank (untuk pelanggan salin)')}</p>
                        <textarea value={paymentInstructions} onChange={e => setPaymentInstructions(e.target.value)}
                          placeholder={t('keusahawanan:biz_bank_instructions_placeholder', 'Contoh:&#10;Bank: Maybank&#10;No. Akaun: 1234567890&#10;Nama: Ahmad Bin Ali&#10;&#10;Sila masukkan ID Pesanan dalam rujukan pembayaran.')}
                          className="w-full h-28 px-4 py-3 rounded-2xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground resize-none placeholder:text-muted-foreground/40 focus:border-blue-500/50 transition-all" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Phone */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 flex items-center gap-1.5">
                  <Phone className="w-3 h-3" /> {t('commerce:business_phone', 'No. Telefon Perniagaan')}
                </p>
                <input type="tel" value={businessPhone} onChange={e => setBusinessPhone(e.target.value)}
                  placeholder="01X-XXXXXXX"
                  className="w-full h-11 px-4 rounded-2xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                <p className="text-[9px] text-muted-foreground/40 mt-1 italic">{t('commerce:business_phone_desc', 'Dipaparkan kepada pelanggan COD untuk penyelarasan bayaran.')}</p>
              </div>

              {/* Payment Deadline */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground/60" /> {t('commerce:payment_time_limit', 'Had Masa Pembayaran')}
                </p>
                <p className="text-xs text-muted-foreground mb-3">{t('keusahawanan:biz_auto_cancel_desc', 'Pesanan akan auto-cancel jika pembayaran tidak disahkan dalam tempoh ini.')}</p>
                <div className="flex gap-3">
                  <input type="number" min={1} value={paymentDeadlineValue} onChange={e => setPaymentDeadlineValue(parseInt(e.target.value) || 1)}
                    className="w-24 h-11 px-4 rounded-2xl text-sm font-black text-center outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all" />
                  <select value={paymentDeadlineUnit} onChange={e => setPaymentDeadlineUnit(e.target.value as 'HOURS' | 'DAYS' | 'WEEKS')}
                    className="flex-1 h-11 px-4 rounded-2xl text-sm font-medium outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all">
                    <option value="HOURS">{t('commerce:unit_hours', 'Jam')}</option>
                    <option value="DAYS">{t('commerce:unit_days', 'Hari')}</option>
                    <option value="WEEKS">{t('commerce:unit_weeks', 'Minggu')}</option>
                  </select>
                </div>
              </div>

              {/* Save Payment Settings */}
              {isOwner && (
                <button onClick={handleSavePaymentSettings}
                  disabled={paymentSaving}
                  className="w-full h-11 rounded-2xl text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 shadow-lg transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: color }}>
                  <Save className="w-4 h-4" /> {paymentSaving ? t('commerce:saving', 'Menyimpan...') : t('commerce:save_payment_settings', 'Simpan Tetapan Pembayaran')}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'pasukan' && (
          <motion.div key="pasukan" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Summary Header */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">{t('commerce:active_members_label', 'Ahli Aktif')}</p>
                <p className="text-2xl font-black text-foreground">{active.length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">{t('keusahawanan:biz_pending_requests', 'Permohonan Tertunggak')}</p>
                <p className={cn("text-2xl font-black", pending.length > 0 ? "text-amber-500" : "text-muted-foreground")}>{pending.length}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-card border border-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Mod Syif</p>
                <p className="text-sm font-black text-foreground mt-1.5">{useShiftSystem ? t('commerce:shift_system_active', 'Sistem Syif Aktif') : t('commerce:manual_assignment', 'Penugasan Manual')}</p>
              </div>
            </div>

            {/* Pending Requests */}
            {pending.length > 0 && (
              <div className="rounded-[2rem] border border-amber-500/30 bg-amber-500/[0.03] p-6 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> {t('commerce:pending_applications_count', '{{count}} Permohonan Menunggu', { count: pending.length })}
                </p>
                {pending.map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border">
                    <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center font-black text-sm flex-shrink-0" style={{ color }}>
                      {m.user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground">{m.user?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{t('commerce:applied_date', 'Memohon {{date}}', { date: new Date(m.joined_at).toLocaleDateString('ms-MY') })}</p>
                    </div>
                    {isOwner && (
                      <div className="flex gap-2">
                        <button onClick={() => handleRejectMember(m.id, m.user_id, m.user?.full_name)}
                          className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center hover:bg-rose-500/20 transition-colors cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleApproveMember(m.id, m.user_id, m.user?.full_name)}
                          className="w-9 h-9 rounded-xl text-white flex items-center justify-center transition-colors hover:brightness-110 cursor-pointer"
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
                <ShieldCheck className="w-3.5 h-3.5" /> {t('commerce:active_members_count', 'Ahli Aktif ({{count}})', { count: active.length })}
              </p>
              {active.length === 0
                ? <p className="text-sm text-muted-foreground/40 text-center py-6">{t('commerce:no_active_members_yet', 'Tiada ahli aktif lagi.')}</p>
                : active.map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white flex-shrink-0" style={{ background: color }}>
                      {m.user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground">{m.user?.full_name}</p>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        {m.role === 'OWNER' ? (
                          <>
                            <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="font-bold text-amber-600">{t('commerce:role_owner', 'Pemilik')}</span>
                          </>
                        ) : (
                          <span>{t('commerce:role_member', 'Ahli')}</span>
                        )}
                      </div>
                    </div>
                    {isOwner && m.role !== 'OWNER' && (
                      <button onClick={() => handleRemoveMember(m.id, m.user_id, m.user?.full_name)}
                        className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              }
            </div>

            {/* Transfer Ownership */}
            {isOwner && (
              <div className="rounded-[2rem] bg-card border border-border p-6 space-y-4">
                <div className="flex items-center gap-2 text-rose-500">
                  <ShieldAlert className="w-4 h-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none mt-0.5">{t('commerce:danger_zone', 'Zon Berbahaya')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">{t('keusahawanan:biz_transfer_ownership', 'Pindah Milik Perniagaan')}</p>
                  <p className="text-xs text-muted-foreground mb-4">{t('keusahawanan:biz_transfer_desc', 'Pilih ahli untuk diserahkan tanggungjawab sebagai Pemilik baharu. Tindakan ini tidak boleh diundurkan dan selepas berjaya, anda akan berstatus Ahli biasa.')}</p>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select 
                      value={transferToId} 
                      onChange={e => setTransferToId(e.target.value)}
                      className="flex-1 h-11 px-4 rounded-2xl bg-muted/30 border border-border/50 text-sm font-medium focus:border-rose-500/50 outline-none transition-all"
                    >
                      <option value="">{t('commerce:select_active_member', '-- Pilih Ahli Aktif --')}</option>
                      {active.filter(m => m.user_id !== user?.id).map((m) => (
                        <option key={m.id} value={m.user_id}>{m.user?.full_name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleTransferOwnership}
                      disabled={!transferToId || isTransferring}
                      className="h-11 px-6 rounded-2xl bg-rose-500 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 transition-all hover:bg-rose-600 active:scale-95 whitespace-nowrap cursor-pointer"
                    >
                      {isTransferring ? t('commerce:transferring', 'Memindahkan...') : t('commerce:transfer_ownership_btn', 'Pindah Milik')}
                    </button>
                  </div>
                  {active.filter(m => m.user_id !== user?.id).length === 0 && (
                    <p className="text-[10px] text-rose-500/80 mt-2">{t('keusahawanan:biz_transfer_requirement', 'Perniagaan mesti mempunyai sekurang-kurangnya seorang Ahli Aktif lain sebelum pindah milik boleh dilakukan.')}</p>
                  )}
                </div>
              </div>
            )}

            {/* Shift & Session Operations */}
            <div className="rounded-[2rem] bg-card border border-border p-6 space-y-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <ToggleRight className="w-4 h-4" style={{ color }} /> {t('commerce:ops_shift_settings', 'Tetapan Operasi & Syif')}
              </p>

              {/* Shift system toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
                <div>
                  <p className="text-sm font-black text-foreground">{t('commerce:auto_shift_system', 'Sistem Syif Automatik')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('commerce:auto_shift_system_desc', 'POS diaktifkan secara auto apabila staff ada syif hari ini. Jika dimatikan, semua staf {{self}} dibenarkan akses secara manual.', { self: isOwner ? t('commerce:including_you', '(termasuk anda)') : '' })}</p>
                </div>
                <button onClick={() => isOwner && handleToggleFeature('is_shift_enabled', !useShiftSystem)}
                  disabled={toggSaving === 'is_shift_enabled' || !isOwner}
                  className="transition-transform active:scale-95 disabled:opacity-40 cursor-pointer">
                  {useShiftSystem
                    ? <ToggleRight className="w-8 h-8" style={{ color }} />
                    : <ToggleLeft className="w-8 h-8 text-muted-foreground/40" />
                  }
                </button>
              </div>

              {/* If shift system is enabled, display Shift Schedule and Cashier Sessions */}
              {useShiftSystem && businessId ? (
                <div className="space-y-6 pt-2">
                  <div className="rounded-2xl border border-border/60 p-4 sm:p-6 bg-muted/10">
                    <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      {t('keusahawanan:shift_tab_schedule', 'Jadual Syif Mingguan')}
                    </h3>
                    <BusinessJadual 
                      businessId={businessId}
                      color={color}
                      canManage={isOwner}
                      currentUserId={user!.id}
                      businessMembers={members.filter(m => m.status === 'ACTIVE')}
                    />
                  </div>

                  <div className="rounded-2xl border border-border/60 p-4 sm:p-6 bg-muted/10">
                    <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      {t('keusahawanan:shift_tab_session', 'Sesi Juruwang & Tunai')}
                    </h3>
                    <SesiBusiness 
                      businessId={businessId}
                      color={color}
                      profile={profile}
                    />
                  </div>
                </div>
              ) : (
                /* Manual assignment when shift system is off */
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                    <UserPlus className="w-3.5 h-3.5" /> {t('keusahawanan:shift_assign_manual_today', 'Assign Staff POS Manual (Hari Ini)')}
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
                            className="h-8 px-4 rounded-xl text-[10px] font-black uppercase border transition-all flex items-center gap-1 cursor-pointer"
                            style={isAssigned
                              ? { background: hexToRgba(color, 0.1), borderColor: hexToRgba(color, 0.4), color }
                              : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground)/0.5)' }
                            }>
                            {isAssigned ? (
                              <>
                                <Check className="w-3 h-3 shrink-0" />
                                <span>{t('commerce:on_duty', 'Bertugas')}</span>
                              </>
                            ) : (
                              'Assign'
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-muted-foreground/40 italic px-1">
                    {t('commerce:pos_owner_always_access', '* Pemilik perniagaan dan Exco Keusahawanan sentiasa boleh akses POS tanpa assignment.')}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'kupon_log' && (
          <motion.div key="kupon_log" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Section A: Commercial Features & POS Coupons */}
            <div className="rounded-[2rem] bg-card border border-border p-6 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <ToggleRight className="w-4 h-4" style={{ color }} /> {t('commerce:activate_commercial_features', 'Aktifkan Ciri Komersial')}
              </p>

              {/* Promotions toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
                <div>
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4" style={{ color }} />
                    <p className="text-sm font-black text-foreground">{t('commerce:coupons_and_promotions_system', 'Sistem Kupon & Promosi')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('commerce:allow_coupons_pos_desc', 'Benarkan penggunaan kod kupon semasa proses pembayaran di POS.')}</p>
                </div>
                <button onClick={() => isOwner && handleToggleFeature('promotions_enabled', !promotionsEnabled)}
                  disabled={toggSaving === 'promotions_enabled' || !isOwner}
                  className="transition-transform active:scale-95 disabled:opacity-40 cursor-pointer">
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
                    <p className="text-sm font-black text-foreground">{t('keusahawanan:cash_checkpoint_title', 'Sesi Baldi Wang (Cash Checkpoint)')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('keusahawanan:cash_checkpoint_desc', 'Rekod amaun tunai dalam baldi pada sebarang masa (buka pagi, semak tengahari, tutup malam).')}</p>
                </div>
                <button onClick={() => isOwner && handleToggleFeature('cash_session_enabled', !cashSessionEnabled)}
                  disabled={toggSaving === 'cash_session_enabled' || !isOwner}
                  className="transition-transform active:scale-95 disabled:opacity-40 cursor-pointer">
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
                    <Plus className="w-3.5 h-3.5" /> {t('keusahawanan:promo_create_new_btn', 'Cipta Kupon Baharu')}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">{t('keusahawanan:promo_code_label', 'Kod Kupon')}</p>
                      <input type="text" value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                        placeholder="JIMAT10" className="w-full h-9 px-3 rounded-xl text-xs font-black outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all tracking-widest" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">{t('keusahawanan:promo_discount_type', 'Jenis Diskaun')}</p>
                      <select value={promoForm.discount_type} onChange={e => setPromoForm(f => ({ ...f, discount_type: e.target.value as PosDiscountType }))}
                        className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all">
                        <option value="PERCENT">{t('keusahawanan:promo_type_percent', 'Peratus (%)')}</option>
                        <option value="FIXED">{t('keusahawanan:promo_type_fixed', 'Tetap (RM)')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">{t('commerce:promotion_name', 'Nama Promosi')}</p>
                    <input type="text" value={promoForm.name} onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={t('commerce:birthday_discount_placeholder', 'Diskaun Hari Jadi')} className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">{t('commerce:value_label', 'Nilai {{unit}}', { unit: promoForm.discount_type === 'PERCENT' ? '(%)' : '(RM)' })}</p>
                      <input type="number" min="0" step="0.01" value={promoForm.discount_value} onChange={e => setPromoForm(f => ({ ...f, discount_value: e.target.value }))}
                        placeholder="10" className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">{t('commerce:min_purchase_rm', 'Min Beli (RM)')}</p>
                      <input type="number" min="0" step="0.01" value={promoForm.min_purchase} onChange={e => setPromoForm(f => ({ ...f, min_purchase: e.target.value }))}
                        placeholder="0" className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">{t('commerce:max_uses_label', 'Had Guna (kosong=∞)')}</p>
                      <input type="number" min="1" value={promoForm.max_uses} onChange={e => setPromoForm(f => ({ ...f, max_uses: e.target.value }))}
                        placeholder="∞" className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:border-border transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">{t('commerce:valid_from', 'Sah Dari')}</p>
                      <input type="date" value={promoForm.valid_from} onChange={e => setPromoForm(f => ({ ...f, valid_from: e.target.value }))}
                        className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">{t('commerce:valid_until', 'Sah Hingga')}</p>
                      <input type="date" value={promoForm.valid_until} onChange={e => setPromoForm(f => ({ ...f, valid_until: e.target.value }))}
                        className="w-full h-9 px-3 rounded-xl text-xs font-medium outline-none bg-muted/30 border border-border/50 text-foreground focus:border-border transition-all" />
                    </div>
                  </div>

                  <button onClick={handleAddPromo} disabled={promoSaving}
                    className="w-full h-10 rounded-xl text-xs font-black transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    style={{ background: color, color: '#fff' }}>
                    {promoSaving ? t('commerce:saving', 'Menyimpan...') : t('commerce:create_coupon_btn', '+ Cipta Kupon')}
                  </button>
                </div>

                {/* Promo list */}
                <div className="lg:col-span-3 rounded-[2rem] bg-card border border-border p-6 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                    <Ticket className="w-3.5 h-3.5" style={{ color }} /> {t('commerce:coupon_list_count', 'Senarai Kupon ({{count}})', { count: promotions.length })}
                  </p>
                  {promoLoading ? (
                    <div className="h-20 flex items-center justify-center">
                      <div className="w-5 h-5 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
                    </div>
                  ) : promotions.length === 0 ? (
                    <p className="text-sm text-muted-foreground/40 text-center py-8 font-black">{t('commerce:no_coupons_yet', 'Tiada kupon lagi. Cipta yang pertama!')}</p>
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
                                {(isExpired || isFull) && <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-rose-500/10 text-rose-500">{t('commerce:status_expired', 'TAMAT')}</span>}
                              </div>
                              <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                                {p.discount_type === 'PERCENT'
                                  ? t('commerce:percent_discount', '{{val}}% diskaun', { val: p.discount_value })
                                  : t('commerce:fixed_discount', 'RM{{val}} diskaun', { val: p.discount_value.toFixed(2) })}
                                {p.min_purchase > 0 ? t('commerce:min_purchase_prefix', ' · Min RM{{min}}', { min: p.min_purchase.toFixed(2) }) : ''}
                                {p.max_uses !== null
                                  ? t('commerce:uses_with_limit', ' · {{uses}}/{{max}} guna', { uses: p.uses_count, max: p.max_uses })
                                  : t('commerce:uses_unlimited', ' · {{uses}} kali guna', { uses: p.uses_count })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => handleTogglePromo(p)} className="transition-transform active:scale-95 cursor-pointer">
                                {p.is_active
                                  ? <ToggleRight className="w-6 h-6" style={{ color }} />
                                  : <ToggleLeft className="w-6 h-6 text-muted-foreground/40" />}
                              </button>
                              <button onClick={() => handleDeletePromo(p)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground/40 hover:text-rose-500 transition-all cursor-pointer">
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

            {/* Section B: System Logs & Audit */}
            <div className="rounded-[2rem] bg-card border border-border p-6 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" style={{ color }} /> {t('commerce:business_activity_logs', 'Log Aktiviti Perniagaan')}
              </p>
              <p className="text-[10px] text-muted-foreground/50 italic">{t('keusahawanan:biz_audit_logs_desc', 'Rekod terperinci semua tindakan dalam sistem. Menunjukkan 100 log terkini.')}</p>
              {pos.logs.length === 0 ? (
                <div className="py-12 text-center">
                  <Activity className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm font-black text-muted-foreground/40">{t('commerce:no_logs_yet', 'Tiada log lagi.')}</p>
                </div>
              ) : (
                <div className="space-y-2 mt-4 max-h-[500px] overflow-y-auto scrollbar-hide">
                  {pos.logs.map((log, i) => (
                    <motion.div key={log.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.02 * i }}
                      className="flex items-start gap-4 p-4 rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-black text-foreground">{getLogLabel(log.action_type)}</p>
                          <span className="px-2 py-0.5 rounded-full bg-muted text-[9px] font-black uppercase text-muted-foreground">{log.action_type}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{log.description}</p>
                        <p className="text-[9px] text-muted-foreground/40 mt-1">{log.actor_name} · {fmtDT(log.created_at)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SystemTour run={runTour} onClose={closeTour} tourKey="KEUSAHAWANAN_URUS" />
    </div>
  );
}
