import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { 
  Bell, Plus, ShieldAlert, AlertTriangle, Info, Lock, 
  Trash2, FileText, CheckCircle2, XCircle, Users, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SystemAnnouncement, AnnouncementFormField, AnnouncementPriority, AnnouncementTarget } from '@/types';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('EASY');
  const [target, setTarget] = useState<AnnouncementTarget>('ALL');
  const [actionUrl, setActionUrl] = useState('');
  
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

  const handleCreate = async () => {
    if (!title || !content) {
      toast.error('Sila isi tajuk dan kandungan');
      return;
    }

    setCreating(true);
    try {
      const payload: Partial<SystemAnnouncement> = {
        title,
        content_body: content,
        priority,
        target_audience: target,
        action_url: actionUrl || null,
        form_schema: useFormBuilder && priority === 'HIGH' && formFields.length > 0 ? formFields : null,
        is_active: true
      };

      const { error } = await supabase.from('system_announcements').insert(payload);
      if (error) throw error;

      toast.success('Makluman berjaya dicipta!');
      setShowCreate(false);
      resetForm();
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mencipta makluman');
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Adakah anda pasti untuk memadam makluman ini? JAWAPAN PELAJAR AKAN TURUT TERPADAM.')) return;
    
    const { error } = await supabase.from('system_announcements').delete().eq('id', id);
    if (error) toast.error('Gagal memadam');
    else {
      toast.success('Makluman dipadam');
      fetchAnnouncements();
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setPriority('EASY');
    setTarget('ALL');
    setActionUrl('');
    setUseFormBuilder(false);
    setFormFields([]);
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

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-none">JPP HQ / Hebahan Info</Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">Makluman Global</h1>
          <p className="text-muted-foreground font-medium max-w-2xl text-lg">Pusat penyiaran notis seluruh portal. Bina pengumuman mandatori atau hebahan biasa menggunakan Modul *Popout* Bersepadu.</p>
        </div>
        {!showCreate && (
          <Button onClick={() => setShowCreate(true)} className="h-12 px-6 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all font-bold tracking-wide">
            <Plus className="mr-2" /> Cipta Hebahan Baru
          </Button>
        )}
      </div>

      {showCreate ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-[2rem] border border-border/50 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-border/50 bg-muted/20">
            <h2 className="text-2xl font-black tracking-tight">Enjin Pencipta Hebahan</h2>
            <p className="text-sm text-muted-foreground">Parameter hebahan akan dibaca terus oleh sistem login pengguna.</p>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="font-bold">Tajuk Notis</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Kemaskini Alamat Rumah" className="h-12 bg-muted/50 rounded-xl" />
              </div>
              <div className="space-y-4">
                <Label className="font-bold">Sasaran Pengguna</Label>
                <Select value={target} onValueChange={(val: any) => setTarget(val)}>
                  <SelectTrigger className="h-12 bg-muted/50 rounded-xl">
                    <SelectValue placeholder="Pilih sasaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua (Pelajar & Staf)</SelectItem>
                    <SelectItem value="STUDENT">Pelajar Sahaja</SelectItem>
                    <SelectItem value="STAFF">Staf Sahaja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="font-bold">Kandungan Utama</Label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="Penerangan terperinci notis..." className="resize-none bg-muted/50 rounded-xl p-4" />
            </div>

            <div className="space-y-4">
              <Label className="font-bold text-lg">Tahap Keutamaan (Priority)</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'EASY', title: 'Hebahan Biasa', desc: 'Boleh dipangkah dan ada butang "Jangan Minta Lagi".' },
                  { id: 'MEDIUM', title: 'Peringatan Setiap Sesi', desc: 'Boleh dipangkah tapi akan muncul selagi notis aktif.' },
                  { id: 'HIGH', title: 'Paksaan (Mandatori)', desc: 'Menghalang login skrin sepenuhnya sehingga syarat dipenuhi.' }
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

            {priority === 'HIGH' && (
              <div className="p-8 rounded-[2rem] border-2 border-rose-500/20 bg-rose-500/5 space-y-6">
                <div className="flex gap-4 items-center">
                  <div className="p-3 bg-rose-500/20 text-rose-600 rounded-xl"><Lock size={20} /></div>
                  <div>
                    <h3 className="font-black text-rose-600">Tetapan Sekatan HIGH Priority</h3>
                    <p className="text-sm text-muted-foreground">Pelajar wajib melakukan tindakan sebelum dibenarkan melepasi skrin ini.</p>
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
            )}

            <div className="flex justify-end gap-4 pt-8 border-t border-border/50">
              <Button variant="ghost" onClick={() => {setShowCreate(false); resetForm();}} className="h-12 px-8 rounded-xl font-bold">Batal</Button>
              <Button disabled={creating} onClick={handleCreate} className="h-12 px-8 rounded-xl bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all font-bold">
                {creating ? 'Menyimpan...' : 'Terbitkan Notis'}
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
             <div className="h-32 flex items-center justify-center text-muted-foreground"><Activity className="animate-spin" /></div>
          ) : announcements.length === 0 ? (
             <div className="text-center p-12 border-2 border-dashed border-border/50 rounded-[2rem] text-muted-foreground">Tiada makluman direkodkan setakat ini.</div>
          ) : announcements.map((a) => {
             const Icon = PriorityIcon[a.priority];
             return (
               <div key={a.id} className="bg-card rounded-[2rem] border border-border/50 p-6 sm:p-8 flex flex-col md:flex-row gap-8 shadow-sm hover:shadow-md transition-shadow">
                 <div className="flex-1 space-y-4">
                   <div className="flex flex-wrap items-center gap-3">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current ${PriorityColor[a.priority]}`}>
                       <Icon size={12} className="inline mr-1" /> {a.priority} Priority
                     </span>
                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-muted`}>
                       Sasaran: {a.target_audience}
                     </span>
                     {!a.is_active && (
                       <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20">
                         TIDAK AKTIF / DITUTUP
                       </span>
                     )}
                   </div>
                   
                   <h3 className="text-2xl font-black tracking-tight">{a.title}</h3>
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
                     <Label className="text-xs font-bold uppercase text-muted-foreground">Status Aktif</Label>
                     <Switch checked={a.is_active} onCheckedChange={() => toggleActive(a.id, a.is_active)} className="data-[state=checked]:bg-emerald-500" />
                   </div>
                   <Button variant="outline" className="h-10 rounded-xl w-full border-border/50 text-xs font-bold text-muted-foreground"><Users size={14} className="mr-2"/> Lihat Respon Pelajar</Button>
                   <Button variant="ghost" onClick={() => handleDelete(a.id)} className="h-10 rounded-xl w-full text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"><Trash2 size={14} className="mr-2"/> Padam Notis Mengarut</Button>
                 </div>
               </div>
             )
          })}
        </div>
      )}
    </div>
  )
}
