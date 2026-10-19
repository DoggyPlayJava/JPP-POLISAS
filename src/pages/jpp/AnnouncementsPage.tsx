import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Bell, Plus, ShieldAlert, AlertTriangle, Info, Lock, 
  Trash2, FileText, CheckCircle2, XCircle, Users, Activity, X, Upload, Star, Gift, Megaphone, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SlideOverSheet } from '@/components/jpp/SlideOverSheet';
import { SystemAnnouncement, AnnouncementFormField, AnnouncementPriority, AnnouncementTarget } from '@/types';

export function AnnouncementsPage() {
  const { t } = useTranslation(['jpp', 'common']);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);

  // Modal confirmation states
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; imageUrl: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<SystemAnnouncement | null>(null);

  // Viewing responses state
  const [viewingResponsesFor, setViewingResponsesFor] = useState<SystemAnnouncement | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('EASY');
  const [target, setTarget] = useState<AnnouncementTarget>('ALL');
  const [actionUrl, setActionUrl] = useState('');
  
  // Media states
  const [iconType, setIconType] = useState('INFO');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Dynamic Form Builder statres
  const [useFormBuilder, setUseFormBuilder] = useState(false);
  const [formFields, setFormFields] = useState<AnnouncementFormField[]>([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_announcements')
        .select(`*`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err: any) {
      toast.error('Gagal memuat turun senarai makluman');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async () => {
    if (!title || !content) {
      toast.error('Sila isi tajuk dan kandungan');
      return;
    }

    setCreating(true);
    try {
      let finalImageUrl = imagePreview && !imageFile ? imagePreview : null;

      if (!editingId && imageFile) {
        toast.loading('Memuat naik imej...', { id: 'upload_image' });
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${window.crypto.randomUUID()}.${fileExt}`;
        
        const { compressImage } = await import('@/lib/imageCompression');
        const compressedFile = await compressImage(imageFile);

        const { error: uploadError } = await supabase.storage
          .from('announcements')
          .upload(fileName, compressedFile, { contentType: compressedFile.type });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('announcements')
          .getPublicUrl(fileName);
          
        finalImageUrl = publicUrl;
        toast.dismiss('upload_image');
      }

      if (editingId) {
        const { error: dbError } = await supabase
          .from('system_announcements')
          .update({
            title,
            content_body: content,
            priority,
            target_audience: target,
            action_url: actionUrl,
            form_schema: useFormBuilder ? formFields : null,
            icon_type: iconType
          })
          .eq('id', editingId);

        if (dbError) throw dbError;
        toast.success('Hebahan berjaya dikemas kini.');
      } else {
        const { error: dbError } = await supabase
          .from('system_announcements')
          .insert({
            title,
            content_body: content,
            priority,
            target_audience: target,
            action_url: actionUrl,
            form_schema: useFormBuilder ? formFields : null,
            image_url: finalImageUrl,
            icon_type: iconType,
            is_active: true
          });

        if (dbError) throw dbError;
        toast.success('Hebahan berjaya dicipta.');

        // --- Trigger Push Notification ---
        try {
          const { broadcastAnnouncement } = await import('@/lib/notifications');
          const targetRoles = target === 'ALL' ? [] : 
                              target === 'STUDENT' ? ['CLUB_MEMBER', 'CLUB_MT', 'CLUB_PRESIDENT', 'JPP'] : 
                              target === 'STAFF' ? ['STAFF', 'CLUB_ADVISOR', 'SUPER_ADMIN_JPP'] : [];
          
          await broadcastAnnouncement({
            title: 'Notis Baru JPP',
            message: title,
            type: 'ANNOUNCEMENT',
            module: 'JPP',
            link: '/portal' // Or any relevant link
          }, targetRoles);
        } catch (e) {
          console.error("Gagal menghantar notifikasi push", e);
        }
      }

      setShowCreate(false);
      resetForm();
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses makluman');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('system_announcements')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    if (error) toast.error('Ralat mengemaskini status');
    else {
      toast.success('Status dikemaskini');
      fetchAnnouncements();
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const { id, imageUrl } = deleteTarget;
    setDeleting(true);
    
    if (imageUrl) {
      const parts = imageUrl.split('/');
      const fileName = parts[parts.length - 1];
      await supabase.storage.from('announcements').remove([fileName]);
    }

    const { error } = await supabase.from('system_announcements').delete().eq('id', id);
    if (error) {
      toast.error('Gagal memadam makluman.');
    } else {
      toast.success('Makluman berjaya dipadam.');
      setDeleteTarget(null);
      fetchAnnouncements();
    }
    setDeleting(false);
  };

  const handleEdit = (a: SystemAnnouncement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setContent(a.content_body);
    setPriority(a.priority);
    setTarget(a.target_audience);
    setActionUrl(a.action_url || '');
    setIconType(a.icon_type || 'INFO');
    setUseFormBuilder(!!(a.form_schema && a.form_schema.length > 0));
    setFormFields(a.form_schema || []);
    setImageFile(null);
    setImagePreview(a.image_url || null);
    setShowCreate(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setPriority('EASY');
    setTarget('ALL');
    setActionUrl('');
    setIconType('INFO');
    setImageFile(null);
    setImagePreview(null);
    setUseFormBuilder(false);
    setFormFields([]);
  };

  const executeBroadcast = async () => {
    if (!broadcastTarget) return;
    const announcement = broadcastTarget;
    
    setBroadcastingId(announcement.id);
    toast.loading('Menghantar notifikasi push...', { id: 'broadcast_push' });
    
    try {
      const { broadcastAnnouncement } = await import('@/lib/notifications');
      const targetRoles = announcement.target_audience === 'ALL' ? [] : 
                          announcement.target_audience === 'STUDENT' ? ['CLUB_MEMBER', 'CLUB_MT', 'CLUB_PRESIDENT', 'JPP'] : 
                          announcement.target_audience === 'STAFF' ? ['STAFF', 'CLUB_ADVISOR', 'SUPER_ADMIN_JPP'] : [];
      
      const briefMessage = announcement.content_body.length > 120 
        ? announcement.content_body.substring(0, 120) + '...' 
        : announcement.content_body;
        
      await broadcastAnnouncement({
        title: announcement.title,
        message: briefMessage,
        type: 'ANNOUNCEMENT',
        module: 'JPP',
        link: '/portal'
      }, targetRoles);
      
      toast.success('Hebahan push berjaya dihantar.', { id: 'broadcast_push' });
      setBroadcastTarget(null);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghantar hebahan', { id: 'broadcast_push' });
    } finally {
      setBroadcastingId(null);
    }
  };

  const addFormField = () => {
    setFormFields([...formFields, {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'Soalan Baru',
      required: true
    }]);
  };

  const PriorityIcon = {
    EASY: Info,
    MEDIUM: AlertTriangle,
    HIGH: ShieldAlert
  };

  const PriorityColor = {
    EASY: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    MEDIUM: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    HIGH: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
  };

  const handleViewResponses = async (announcement: SystemAnnouncement) => {
    setViewingResponsesFor(announcement);
    setLoadingResponses(true);
    try {
      const { data, error } = await supabase
        .from('user_announcement_responses')
        .select(`
          status,
          form_data,
          created_at,
          profiles(full_name, matric_no)
        `)
        .eq('announcement_id', announcement.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (err: any) {
      toast.error('Gagal memuat turun respon');
    } finally {
      setLoadingResponses(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-3">
            JPP HQ • Hebahan Rasmi
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            {t('jpp:announcements_page_title', 'Pusat Hebahan Kampus')}
          </h1>
          <p className="text-muted-foreground font-medium max-w-2xl text-xs sm:text-sm mt-1">{t('jpp:announcements_page_subtitle', 'Pusat penyiaran notis seluruh portal. Bina pengumuman mandatori atau hebahan biasa menggunakan Modul Popout Bersepadu.')}</p>
        </div>
        {!showCreate && (
          <Button onClick={() => setShowCreate(true)} className="h-11 px-5 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-2xs hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-xs uppercase tracking-wider">
            <Plus className="mr-2 h-4 w-4" /> {t('jpp:announcements_create_new', 'Cipta Hebahan Baharu')}
          </Button>
        )}
      </div>

      {showCreate ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-[2rem] border border-border/50 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-border/50 bg-muted/20">
            <h2 className="text-2xl font-black tracking-tight text-foreground">{editingId ? t('jpp:announcements_edit_title', 'Sunting Hebahan') : t('jpp:announcements_composer_title', 'Enjin Pencipta Hebahan')}</h2>
            <p className="text-sm text-muted-foreground">{editingId ? 'Kemaskini maklumat di bawah. Pertukaran imej dihadkan untuk elakkan isu storan.' : 'Parameter hebahan akan dibaca terus oleh sistem login pengguna.'}</p>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="font-bold">{t('jpp:announcements_notice_title', 'Tajuk Notis')}</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Kemaskini Alamat Rumah" className="h-12 bg-muted/50 rounded-xl" />
              </div>
              <div className="space-y-4">
                <Label className="font-bold">{t('jpp:announcements_target_audience', 'Sasaran Pengguna')}</Label>
                <Select value={target} onValueChange={(val: any) => setTarget(val)}>
                  <SelectTrigger className="h-12 bg-muted/50 rounded-xl">
                    <SelectValue placeholder="Pilih sasaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('jpp:announcements_target_all', 'Semua (Pelajar & Staf)')}</SelectItem>
                    <SelectItem value="STUDENT">{t('jpp:announcements_target_student', 'Pelajar Sahaja')}</SelectItem>
                    <SelectItem value="STAFF">{t('jpp:announcements_target_staff', 'Staf Sahaja')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="font-bold">{t('jpp:announcements_content_label', 'Kandungan Utama')}</Label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Penerangan terperinci notis..." className="resize-none bg-muted/50 rounded-xl p-4" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <Label className="font-bold">Pilihan Ikon</Label>
                  <Select value={iconType} onValueChange={(val: any) => setIconType(val)}>
                     <SelectTrigger className="h-12 bg-muted/50 rounded-xl">
                        <SelectValue placeholder="Pilih Ikon" />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="INFO"><div className="flex items-center"><Info size={16} className="mr-2"/> Info Umum</div></SelectItem>
                        <SelectItem value="ALERT"><div className="flex items-center"><ShieldAlert size={16} className="mr-2"/> Amaran / Penting</div></SelectItem>
                        <SelectItem value="GIFT"><div className="flex items-center"><Gift size={16} className="mr-2"/> Hadiah / Imbuhan</div></SelectItem>
                        <SelectItem value="STAR"><div className="flex items-center"><Star size={16} className="mr-2"/> Sorotan utama</div></SelectItem>
                        <SelectItem value="MEGAPHONE"><div className="flex items-center"><Megaphone size={16} className="mr-2"/> Sorakan / Promosi</div></SelectItem>
                        <SelectItem value="CALENDAR"><div className="flex items-center"><Calendar size={16} className="mr-2"/> Tarikh Acara</div></SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               
               <div className="space-y-4">
                  <Label className="font-bold">Poster / Imej {editingId ? '(Dikunci)' : '(Opsional)'}</Label>
                  {!editingId ? (
                     <>
                        <label className="flex items-center justify-center gap-2 h-12 bg-muted/50 rounded-xl border border-dashed border-border/50 cursor-pointer hover:bg-muted/80 transition-colors">
                           <Upload size={16} className="text-muted-foreground" />
                           <span className="text-sm font-medium text-muted-foreground">Muat Naik Gambar (Max 10MB)</span>
                           <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                           * Nisbah terbaik: <b>Lanskap (16:9)</b> atau <b>Segi Empat Sama (1:1)</b>.<br/>
                           * <i>Format Memanjang (9:16) dibenarkan</i>; ruang tepi akan diisi dengan estetik kesan kabur (blur).
                        </p>
                     </>
                  ) : (
                     <p className="text-[10px] text-amber-500 font-bold bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        * Pemuat naik gambar dimatikan semasa suntingan bagi mengimbangi integriti storan. Sila padam dan cipta hebahan baharu sekiranya gambar perlu ditukar.
                     </p>
                  )}
                  {imagePreview && (
                     <div className="relative mt-2 rounded-xl overflow-hidden border border-border/50 h-32 bg-muted/30">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        {!editingId && (
                           <button onClick={() => {setImageFile(null); setImagePreview(null);}} className="absolute top-2 right-2 p-1 bg-background/50 hover:bg-background/80 rounded-full text-foreground"><X size={14}/></button>
                        )}
                     </div>
                  )}
               </div>
            </div>

            <div className="space-y-4">
              <Label className="font-bold text-lg">{t('jpp:announcements_priority_level', 'Tahap Keutamaan (Priority)')}</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'EASY', title: t('jpp:announcements_priority_easy', 'Hebahan Biasa'), desc: 'Boleh dipangkah dan ada butang "Jangan Minta Lagi".' },
                  { id: 'MEDIUM', title: t('jpp:announcements_priority_medium', 'Peringatan Setiap Sesi'), desc: 'Boleh dipangkah tapi akan muncul selagi notis aktif.' },
                  { id: 'HIGH', title: t('jpp:announcements_priority_high', 'Paksaan (Mandatori)'), desc: 'Menghalang login skrin sepenuhnya sehingga syarat dipenuhi.' }
                ].map(p => (
                  <div 
                    key={p.id}
                    onClick={() => setPriority(p.id as AnnouncementPriority)}
                    className={`cursor-pointer border-2 rounded-[1.5rem] p-6 transition-all ${priority === p.id ? 'border-primary bg-primary/5 shadow-xl' : 'border-transparent bg-muted/30 hover:bg-muted/50'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                       <h3 className="font-black tracking-tight">{p.title}</h3>
                       <div className={`w-4 h-4 rounded-full border-2 ${priority === p.id ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 rounded-[2rem] border-2 border-primary/20 bg-primary/5 space-y-6">
              <div className="flex gap-4 items-center">
                <div className="p-3 bg-primary/20 text-primary rounded-xl"><Lock size={20} /></div>
                <div>
                  <h3 className="font-black text-primary">Tindakan Aksi & Borang (Opsional)</h3>
                  <p className="text-sm text-muted-foreground">Kumpul pendaftaran (seperti Fun Run) atau lilit butang URL luaran.</p>
                </div>
              </div>

                <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-background">
                   <Switch checked={useFormBuilder} onCheckedChange={setUseFormBuilder} />
                   <div>
                     <Label className="font-bold">Gunakan JSON Form Builder (Kutip Data di JPP-POLISAS)</Label>
                     <p className="text-xs text-muted-foreground">Bina borang in-house tanpa perlukan Google form luaran.</p>
                   </div>
                </div>

                {!useFormBuilder ? (
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <Label className="font-bold">Action URL (Pautan Borang Luaran - Optional)</Label>
                    <Input value={actionUrl} onChange={e => setActionUrl(e.target.value)} placeholder="https://forms.gle/..." className="h-12 bg-background rounded-xl" />
                    <p className="text-xs text-muted-foreground">Jika diisi, modal akan memaparkan butang "Buka Pautan" ke pautan di atas dan butang pengesahan.</p>
                  </div>
                ) : (
                  <div className="space-y-6 pt-4 border-t border-border/50">
                     <div className="flex justify-between items-center">
                        <Label className="font-bold text-lg">Konfigurasi Borang Dinamik</Label>
                        <Button variant="outline" size="sm" onClick={addFormField} className="rounded-xl"><Plus size={16} className="mr-2"/> Tambah Soalan</Button>
                     </div>
                     
                     <div className="space-y-4">
                        {formFields.map((field, idx) => (
                           <div key={field.id} className="grid grid-cols-12 gap-4 items-end bg-background p-4 rounded-[1.5rem] border border-border/50 relative group">
                              <Button variant="destructive" size="icon" className="absolute -top-3 -right-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setFormFields(formFields.filter((_, i) => i !== idx))}><Trash2 size={14}/></Button>
                              <div className="col-span-12 md:col-span-6 space-y-2">
                                 <Label className="text-xs font-bold text-muted-foreground uppercase">Soalan / Label</Label>
                                 <Input value={field.label} onChange={(e) => {
                                    const nf = [...formFields]; nf[idx].label = e.target.value; setFormFields(nf);
                                 }} className="bg-muted/50" />
                              </div>
                              <div className="col-span-12 md:col-span-6 space-y-2">
                                 <Label className="text-xs font-bold text-muted-foreground uppercase">Jenis Data</Label>
                                 <Select value={field.type} onValueChange={(val: any) => {
                                    const nf = [...formFields]; nf[idx].type = val; setFormFields(nf);
                                 }}>
                                    <SelectTrigger className="bg-muted/50"><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                       <SelectItem value="text">Teks Pendek</SelectItem>
                                       <SelectItem value="number">Nombor</SelectItem>
                                       <SelectItem value="tel">Nombor Telefon</SelectItem>
                                    </SelectContent>
                                 </Select>
                              </div>
                           </div>
                        ))}
                        {formFields.length === 0 && <div className="text-center p-8 border-2 border-dashed border-border/50 rounded-[1.5rem] text-muted-foreground text-sm font-medium">Klik butang 'Tambah Soalan' untuk bina medan borang.</div>}
                     </div>
                  </div>
                )}
               </div>

            <div className="flex justify-end gap-4 pt-8 border-t border-border/50">
              <Button variant="ghost" onClick={() => {setShowCreate(false); resetForm();}} className="h-12 px-8 rounded-xl font-bold">Batal</Button>
              <Button disabled={creating} onClick={handleCreate} className="h-12 px-8 rounded-xl bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all font-bold">
                {creating ? 'Menyimpan...' : t('jpp:announcements_publish_button', 'Terbitkan Notis')}
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
             <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((n) => (
                   <div key={n} className="bg-card rounded-[2rem] border border-border/50 p-6 sm:p-8 flex flex-col md:flex-row gap-8">
                      <div className="flex-1 space-y-3">
                         <div className="flex gap-2">
                            <div className="h-5 w-24 bg-muted rounded-full" />
                            <div className="h-5 w-32 bg-muted rounded-full" />
                         </div>
                         <div className="h-7 w-3/4 bg-muted rounded-lg" />
                         <div className="h-4 w-full bg-muted/60 rounded" />
                         <div className="h-4 w-2/3 bg-muted/60 rounded" />
                      </div>
                      <div className="md:w-64 flex flex-col justify-center gap-2.5 md:border-l border-border/50 md:pl-8">
                         <div className="h-9 w-full bg-muted rounded-xl" />
                         <div className="h-9 w-full bg-muted rounded-xl" />
                         <div className="h-9 w-full bg-muted rounded-xl" />
                      </div>
                   </div>
                ))}
             </div>
          ) : announcements.length === 0 ? (
             <div className="text-center p-12 rounded-[2rem] border border-dashed border-border/60 bg-muted/10 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/40 mx-auto flex items-center justify-center text-muted-foreground">
                   <Megaphone className="w-6 h-6" />
                </div>
                <p className="text-base font-bold text-foreground">{t('jpp:announcements_empty_title')}</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">{t('jpp:announcements_empty_desc')}</p>
                {!showCreate && (
                   <Button onClick={() => setShowCreate(true)} variant="outline" className="h-9 rounded-xl text-xs font-bold mt-2">
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> {t('jpp:announcements_create_first')}
                   </Button>
                )}
             </div>
          ) : announcements.map((a) => {
             const Icon = PriorityIcon[a.priority];
             return (
               <div key={a.id} className="bg-card rounded-[2rem] border border-border/50 p-6 sm:p-8 flex flex-col md:flex-row gap-8 shadow-sm hover:shadow-md transition-shadow">
                 <div className="flex-1 space-y-4">
                   <div className="flex flex-wrap items-center gap-3">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current ${PriorityColor[a.priority]}`}>
                       <Icon size={12} className="inline mr-1" /> {a.priority} Priority
                     </span>
                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-muted text-muted-foreground`}>
                       {t('jpp:announcements_target_label', { target: a.target_audience })}
                     </span>
                     {!a.is_active && (
                       <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20">
                         {t('jpp:announcements_inactive_badge')}
                       </span>
                     )}
                   </div>
                   
                   <h3 className="text-2xl font-black tracking-tight text-foreground">{a.title}</h3>
                   <p className="text-muted-foreground whitespace-pre-wrap text-sm">{a.content_body}</p>
                   
                   {a.priority === 'HIGH' && a.form_schema && a.form_schema.length > 0 && (
                     <div className="p-4 bg-muted/40 rounded-xl rounded-tl-sm text-xs font-bold text-muted-foreground border-l-4 border-indigo-500 flex flex-col gap-2">
                       <span className="text-indigo-500 uppercase tracking-widest text-[10px]">Tugasan Berorientasikan Borang (Data Responses)</span>
                       Mempunyai {a.form_schema.length} soalan tertanam: {a.form_schema.map(f => f.label).join(', ')}.
                     </div>
                   )}
                 </div>
                 
                 <div className="md:w-64 flex flex-col justify-center items-stretch gap-3 md:border-l border-border/50 md:pl-8">
                   <div className="flex items-center justify-between mb-2">
                     <Label className="text-xs font-bold uppercase text-muted-foreground">{t('jpp:announcements_active_status')}</Label>
                     <Switch checked={a.is_active} onCheckedChange={() => toggleActive(a.id, a.is_active)} className="data-[state=checked]:bg-emerald-500" />
                   </div>
                   <Button 
                     onClick={() => setBroadcastTarget(a)} 
                     disabled={!a.is_active || broadcastingId === a.id}
                     className="h-10 rounded-xl w-full bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                   >
                     {broadcastingId === a.id ? (
                       <><Activity size={14} className="mr-2 animate-spin" /> {t('jpp:announcements_sending')}</>
                     ) : (
                       <><Megaphone size={14} className="mr-2" /> {t('jpp:announcements_broadcast_push')}</>
                     )}
                   </Button>
                   <Button variant="outline" onClick={() => handleEdit(a)} className="h-10 rounded-xl w-full border-border/50 text-xs font-bold"><Plus size={14} className="mr-2"/> {t('jpp:announcements_edit_notice')}</Button>
                   <Button variant="outline" onClick={() => handleViewResponses(a)} className="h-10 rounded-xl w-full border-border/50 text-xs font-bold text-muted-foreground"><Users size={14} className="mr-2"/> {t('jpp:announcements_view_responses')}</Button>
                   <Button variant="ghost" onClick={() => setDeleteTarget({ id: a.id, imageUrl: a.image_url })} className="h-10 rounded-xl w-full text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"><Trash2 size={14} className="mr-2"/> {t('jpp:announcements_delete_notice')}</Button>
                 </div>
               </div>
             )
          })}
        </div>
      )}

      {/* View Responses Drawer (SlideOverSheet) */}
      <SlideOverSheet
        isOpen={Boolean(viewingResponsesFor)}
        onClose={() => setViewingResponsesFor(null)}
        title={viewingResponsesFor?.title || t('jpp:announcements_responses_title')}
        description={t('jpp:announcements_responses_count', { count: responses.length })}
        className="max-w-2xl"
      >
        <div className="p-6 space-y-4">
          {loadingResponses ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted/60 rounded" />
                </div>
              ))}
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border/50 rounded-2xl text-muted-foreground space-y-2">
              <Users className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-bold text-foreground">{t('jpp:announcements_responses_empty')}</p>
              <p className="text-xs text-muted-foreground">{t('jpp:announcements_responses_desc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {responses.map((r, i) => (
                <div key={i} className="bg-muted/30 border border-border/50 p-4 rounded-xl flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-foreground text-sm">{r.profiles?.full_name || 'Pelajar'}</p>
                      <p className="text-xs font-mono text-muted-foreground">{r.profiles?.matric_no || 'Tiada No. Matrik'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${r.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                      {r.status}
                    </span>
                  </div>
                  {r.form_data && (
                    <div className="mt-2 bg-background p-3 rounded-lg text-xs space-y-1 font-mono text-muted-foreground border border-border/40">
                      {Object.entries(r.form_data).map(([key, value]) => {
                        const field = viewingResponsesFor?.form_schema?.find(f => f.id === key);
                        return (
                          <div key={key}>
                            <span className="font-bold text-foreground">{field ? field.label : key}:</span> {String(value)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SlideOverSheet>
    
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('jpp:announcements_delete_confirm_title')}
        description={t('jpp:announcements_delete_confirm_desc')}
        confirmLabel={t('jpp:announcements_delete_notice')}
        cancelLabel={t('common:cancel')}
        variant="destructive"
        isLoading={deleting}
        onConfirm={executeDelete}
      />

      {/* Confirm Broadcast Dialog */}
      <ConfirmDialog
        open={Boolean(broadcastTarget)}
        onOpenChange={(open) => !open && setBroadcastTarget(null)}
        title={t('jpp:announcements_broadcast_confirm_title')}
        description={t('jpp:announcements_broadcast_confirm_desc')}
        confirmLabel={t('jpp:announcements_broadcast_push')}
        cancelLabel={t('common:cancel')}
        variant="default"
        isLoading={Boolean(broadcastingId)}
        onConfirm={executeBroadcast}
      />
</div>
  )
}
