// ============================================================
// ExcoAktivitiPage — Template Universal untuk Aktiviti Exco JPP
// Guna sama mekanisma dengan AktivitiKelabTab (AktivitiFull.tsx)
// Tanpa tab Takwim (tidak relevan untuk exco)
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadFileToDrive } from '@/lib/driveUpload';
import { toast } from 'react-hot-toast';
import {
  Plus, Pencil, Calendar, MapPin, Trash2,
  Users, Activity, Image as ImageIcon, X, Zap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { format, parseISO, isValid } from 'date-fns';
import { ms } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { AIGrammarCheck } from '@/components/ai/AIGrammarCheck';
import { JPP_EXCO_POSITIONS, JPP_MT_POSITIONS } from '@/types';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const ACTIVITY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  perancangan: { label: 'Perancangan', color: 'text-blue-600', bg: 'bg-blue-500/10' },
  aktif:       { label: 'Aktif',       color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  selesai:     { label: 'Selesai',     color: 'text-muted-foreground', bg: 'bg-muted' },
  ditangguh:   { label: 'Ditangguh',   color: 'text-orange-600', bg: 'bg-orange-500/10' },
};

const PRIORITY_CONFIG: Record<string, { label: string; dot: string }> = {
  rendah:    { label: 'Rendah',    dot: 'bg-blue-400' },
  sederhana: { label: 'Sederhana', dot: 'bg-amber-400' },
  tinggi:    { label: 'Tinggi',    dot: 'bg-rose-500' },
};

// ─── PROPS ───────────────────────────────────────────────────────────────────
interface Props {
  excoUnit:   string;  // e.g. 'KEBAJIKAN'
  themeColor: string;  // hex color dari UNIT_CFG
  excoLabel:  string;  // e.g. 'Exco Kebajikan & Pengaduan Awam'
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function ExcoAktivitiPage({ excoUnit, themeColor, excoLabel }: Props) {
  const { t } = useTranslation(['kpp', 'common']);
  const { user, profile, isSuperAdmin } = useAuth();
  const [activities, setActivities]     = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState('semua');
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<any>(null);
  const [saving, setSaving]             = useState(false);
  
  const PAGE_SIZE = 20;
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  // Reset limit when filter changes
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [filterStatus, PAGE_SIZE]);

  // ── Access ─────────────────────────────────────────────────────────────────
  const jppPos  = profile?.jpp_position as string | undefined;
  const jppUnit = profile?.jpp_unit as string | undefined;

  // Boleh tambah: ahli exco unit ini, MT yang oversee, atau SuperAdmin
  const isExcoMember = jppUnit === excoUnit;
  const isMTOversee  = JPP_MT_POSITIONS.includes(jppPos as any);
  const canManage    = isExcoMember || isMTOversee || isSuperAdmin;

  // ── Form ──────────────────────────────────────────────────────────────────
  const emptyForm = {
    title: '', description: '', status: 'perancangan', priority: 'sederhana',
    start_date: '', end_date: '', venue: '', tindakan: '', imageUrls: [] as string[],
  };
  const [form, setForm] = useState(emptyForm);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('club_activities')
      .select('*, creator:profiles!user_id(full_name)')
      .eq('exco_unit', excoUnit)
      .eq('is_archived', false)
      .order('start_date', { ascending: false });
    if (!error) setActivities(data || []);
    setLoading(false);
  }, [excoUnit]);

  useEffect(() => { load(); }, [load]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (act: any) => {
    setEditTarget(act);
    setForm({
      title:       act.title || '',
      description: act.description || '',
      status:      act.status || 'perancangan',
      priority:    act.priority || 'sederhana',
      start_date:  act.start_date ? act.start_date.split('T')[0] : '',
      end_date:    act.end_date   ? act.end_date.split('T')[0]   : '',
      venue:       act.location || '',
      tindakan:    act.tindakan || '',
      imageUrls:   act.image_urls || [],
    });
    setDialogOpen(true);
  };

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;
    // Convert ke array DAHULU sebelum reset — supaya reference tidak hilang
    const allFiles = Array.from(rawFiles) as File[];
    // Reset input supaya fail yang sama boleh dipilih semula
    e.target.value = '';
    const remaining = 2 - (form.imageUrls?.length || 0);
    if (remaining <= 0) { toast.error(t('kpp:proof_images_max2', 'Maksimum 2 gambar dibenarkan.')); return; }
    const filesToUpload = allFiles.filter(f => f.type.startsWith('image/')).slice(0, remaining);
    if (filesToUpload.length === 0) { toast.error(t('kpp:no_valid_image_file', 'Tiada fail imej yang sah.')); return; }
    const toastId = toast.loading(t('kpp:uploading_images_count', 'Memuat naik {{count}} gambar...', { count: filesToUpload.length }));
    const urls: string[] = [];
    setUploading(true);
    try {
      for (const file of filesToUpload) {
        const url = await uploadFileToDrive(file, `exco_${excoUnit.toLowerCase()}`);
        urls.push(url);
      }
      setForm(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), ...urls] }));
      toast.success(t('kpp:images_uploaded_count', '{{count}} gambar dimuat naik! ☁️', { count: urls.length }), { id: toastId });
    } catch (err: any) {
      toast.error(err.message || t('kpp:failed_upload_image', 'Gagal upload gambar.'), { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setForm(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.start_date) {
      toast.error(t('kpp:title_and_date_required', 'Tajuk dan Tarikh Mula wajib diisi.'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        exco_unit:   excoUnit,
        club_id:     null,   // Bukan kelab — exco JPP
        title:       form.title.trim(),
        description: form.description.trim(),
        status:      form.status,
        priority:    form.priority,
        start_date:  new Date(form.start_date).toISOString(),
        end_date:    form.end_date ? new Date(form.end_date).toISOString() : null,
        location:    form.venue.trim(),
        tindakan:    form.tindakan.trim(),
        image_urls:  form.imageUrls,
        user_id:     user?.id,
        budget:      0,
      };
      if (editTarget) {
        const { error } = await supabase.from('club_activities').update(payload).eq('id', editTarget.id);
        if (error) throw error;
        toast.success(t('kpp:activity_updated', 'Aktiviti dikemaskini!'));
      } else {
        const { error } = await supabase.from('club_activities').insert([payload]);
        if (error) throw error;
        toast.success(t('kpp:activity_added', 'Aktiviti baharu ditambah!'));
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || t('common:action_failed', 'Gagal menyimpan.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('kpp:confirm_delete_activity', 'Padam aktiviti ini?'))) return;
    const { error } = await supabase.from('club_activities').delete().eq('id', id);
    if (!error) { toast.success(t('kpp:activity_deleted', 'Aktiviti dipadamkan.')); load(); }
    else toast.error(t('common:delete_failed', 'Gagal memadam.'));
  };

  // ── Filter & Counts ───────────────────────────────────────────────────────
  const filtered = filterStatus === 'semua'
    ? activities
    : activities.filter(a => a.status === filterStatus);

  const statusCounts = activities.reduce((acc: any, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});
  
  const displayedActivities = filtered.slice(0, displayLimit);

  const groupActivitiesByMonth = (acts: any[]) => {
    const grouped: Record<string, any[]> = {};
    const keys: string[] = [];

    acts.forEach(a => {
      let m = t('kpp:no_date', 'Tiada Tarikh');
      if (a.start_date) {
        try {
          const d = parseISO(a.start_date);
          if (isValid(d)) m = format(d, 'MMMM yyyy', { locale: ms });
        } catch {}
      }
      if (!grouped[m]) {
        grouped[m] = [];
        keys.push(m);
      }
      grouped[m].push(a);
    });

    return { grouped, keys };
  };

  const { grouped, keys: groupKeys } = groupActivitiesByMonth(displayedActivities);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F6EE] dark:bg-[#0a0a0f] text-slate-900 dark:text-white transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: `${themeColor}20`, color: themeColor }}
            >
              {excoUnit}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-200/80 text-slate-700 dark:bg-white/5 dark:text-white/40">
              {t('kpp:exco_activity', 'Aktiviti Exco')}
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">{t('kpp:activities', 'Aktiviti')}</h1>
          <p className="text-sm text-slate-600 dark:text-white/40 mt-1 font-medium">{excoLabel}</p>
        </motion.div>

        {/* Stat bar + tambah */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'semua',      label: t('common:all', 'Semua'),      count: activities.length },
              { key: 'perancangan', label: t('kpp:planning', 'Perancangan'), count: statusCounts.perancangan || 0 },
              { key: 'aktif',      label: t('common:active', 'Aktif'),      count: statusCounts.aktif || 0 },
              { key: 'selesai',    label: t('kpp:completed', 'Selesai'),    count: statusCounts.selesai || 0 },
              { key: 'ditangguh',  label: t('kpp:postponed', 'Ditangguh'),  count: statusCounts.ditangguh || 0 },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={cn(
                  'px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
                  filterStatus === f.key
                    ? 'text-white shadow-lg'
                    : 'bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/70 shadow-xs'
                )}
                style={filterStatus === f.key ? { background: themeColor } : {}}
              >
                {f.label}
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black',
                  filterStatus === f.key ? 'bg-black/20 text-white' : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white'
                )}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
          {canManage && (
            <Button
              onClick={openCreate}
              className="rounded-2xl h-11 px-6 font-black text-[10px] uppercase tracking-widest text-white shadow-lg transition-all hover:scale-105 active:scale-95 shrink-0"
              style={{ background: themeColor }}
            >
              <Plus className="w-4 h-4 mr-2" /> {t('kpp:new_activity', 'Aktiviti Baru')}
            </Button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 rounded-[2rem] bg-slate-100 dark:bg-white/[0.03] animate-pulse border border-slate-200 dark:border-white/[0.05]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 border-2 border-dashed border-slate-300 dark:border-white/[0.06] rounded-[3rem]">
            <div className="w-16 h-16 rounded-[1.5rem] bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center">
              <Activity className="w-8 h-8 text-slate-400 dark:text-white/10" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/20">
              {filterStatus === 'semua' ? t('kpp:no_activities_yet', 'Tiada aktiviti lagi') : t('kpp:no_activities_filter', 'Tiada aktiviti \'{{filter}}\'', { filter: filterStatus })}
            </p>
            {canManage && (
              <button
                onClick={openCreate}
                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:text-white/30 dark:hover:text-white/60 transition-all underline underline-offset-4"
              >
                {t('kpp:add_first_activity', 'Tambah Aktiviti Pertama')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            <AnimatePresence mode="popLayout">
              {groupKeys.map(month => (
                <motion.div key={month} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-white/40 shrink-0">{month}</h3>
                    <div className="h-px bg-slate-200 dark:bg-white/[0.06] flex-1" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {grouped[month].map(act => (
                      <motion.div
                        key={act.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <ExcoActivityCard
                          act={act}
                          canManage={canManage}
                          currentUserId={user?.id}
                          themeColor={themeColor}
                          onEdit={() => openEdit(act)}
                          onDelete={() => handleDelete(act.id)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filtered.length > displayLimit && (
              <div className="pt-8 flex justify-center">
                <Button
                  onClick={() => setDisplayLimit(prev => prev + PAGE_SIZE)}
                  variant="outline"
                  className="rounded-full px-8 h-12 bg-white dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xs"
                >
                  {t('common:load_more', 'Muat Lagi')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Dialog Form */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[560px] rounded-[2.5rem] p-0 border border-slate-200 dark:border-transparent overflow-hidden flex flex-col max-h-[95vh] bg-[#F8F6EE] dark:bg-[#0f0f17] text-slate-900 dark:text-white shadow-xl">
            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {editTarget ? t('kpp:update_activity', 'Kemaskini Aktiviti') : t('kpp:new_activity_title', 'Aktiviti Baharu')}
                </DialogTitle>
                <p className="text-xs text-slate-600 dark:text-white/40 font-medium">
                  {t('kpp:record_exco_activity_desc', 'Rekod aktiviti {{label}} tanpa kertas kerja rasmi', { label: excoLabel })}
                </p>
              </DialogHeader>

              <div className="space-y-5">
                {/* Tajuk */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/40 tracking-widest">{t('kpp:activity_title_req', 'Tajuk Aktiviti *')}</Label>
                  <Input
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder={t('kpp:title_placeholder_exco', 'Cth: Mesyuarat Bulanan, Gotong-Royong...')}
                    className="h-12 rounded-2xl bg-white dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 font-bold"
                  />
                </div>

                {/* Tarikh */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/40 tracking-widest">{t('kpp:start_date_req', 'Tarikh Mula *')}</Label>
                    <Input
                      type="date"
                      value={form.start_date}
                      onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="h-12 rounded-2xl bg-white dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/40 tracking-widest">{t('kpp:end_date', 'Tarikh Tamat')}</Label>
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={e => setForm({ ...form, end_date: e.target.value })}
                      className="h-12 rounded-2xl bg-white dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>

                {/* Lokasi */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/40 tracking-widest">{t('kpp:venue_location', 'Lokasi')}</Label>
                  <Input
                    value={form.venue}
                    onChange={e => setForm({ ...form, venue: e.target.value })}
                    placeholder={t('kpp:venue_placeholder_exco', 'Cth: Bilik Mesyuarat JPP, Dewan Serbaguna...')}
                    className="h-12 rounded-2xl bg-white dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 font-bold"
                  />
                </div>

                {/* Status + Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/40 tracking-widest">{t('common:status', 'Status')}</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger className="h-12 rounded-2xl bg-white dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-white font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#161622] text-slate-900 dark:text-white border-slate-200 dark:border-white/10">
                        <SelectItem value="perancangan">{t('kpp:planning', 'Perancangan')}</SelectItem>
                        <SelectItem value="aktif">{t('common:active', 'Aktif')}</SelectItem>
                        <SelectItem value="selesai">{t('kpp:completed', 'Selesai')}</SelectItem>
                        <SelectItem value="ditangguh">{t('kpp:postponed', 'Ditangguh')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/40 tracking-widest">{t('kpp:priority', 'Keutamaan')}</Label>
                    <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                      <SelectTrigger className="h-12 rounded-2xl bg-white dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-white font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#161622] text-slate-900 dark:text-white border-slate-200 dark:border-white/10">
                        <SelectItem value="rendah">{t('kpp:priority_low', 'Rendah')}</SelectItem>
                        <SelectItem value="sederhana">{t('kpp:priority_medium', 'Sederhana')}</SelectItem>
                        <SelectItem value="tinggi">{t('kpp:priority_high', 'Tinggi')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Objektif */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/40 tracking-widest flex-1">{t('kpp:objective', 'Objektif')}</Label>
                    <AIGrammarCheck textValue={form.description} onApply={v => setForm({ ...form, description: v })} disabled={saving} />
                  </div>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder={t('kpp:summary_placeholder', 'Ringkasan aktiviti...')}
                    className="rounded-2xl bg-white dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 font-medium resize-none min-h-[80px]"
                  />
                </div>

                {/* Tindakan */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/40 tracking-widest flex-1">
                      {t('kpp:action_notes', 'Tindakan / Catatan')}
                      <span className="ml-2 text-emerald-600 dark:text-emerald-400 normal-case tracking-normal">{t('kpp:for_monthly_report', '← untuk Laporan Bulanan')}</span>
                    </Label>
                    <AIGrammarCheck textValue={form.tindakan} onApply={v => setForm({ ...form, tindakan: v })} disabled={saving} />
                  </div>
                  <Textarea
                    value={form.tindakan}
                    onChange={e => setForm({ ...form, tindakan: e.target.value })}
                    placeholder={t('kpp:action_notes_placeholder', 'Tindakan yang telah diambil atau rumusan aktiviti...')}
                    className="rounded-2xl bg-white dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.07] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 font-medium resize-none min-h-[80px]"
                  />
                </div>

                {/* Gambar Bukti */}
                <div className="p-4 rounded-[2rem] border border-slate-200 dark:border-white/[0.06] bg-white/70 dark:bg-white/[0.02] space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/40 tracking-widest flex justify-between">
                    <span>{t('kpp:proof_images_max2', 'Gambar Bukti (Maks 2)')}</span>
                    <span className="text-slate-400 dark:text-white/20">{form.imageUrls?.length || 0} / 2</span>
                  </Label>
                  <div className="grid grid-cols-4 gap-3">
                    {(form.imageUrls || []).map((url: string, idx: number) => (
                      <div key={idx} className="relative group rounded-2xl overflow-hidden h-20 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.07]">
                        <img src={url} alt={`bukti ${idx}`} className="w-full h-full object-cover" />
                        <button
                          onClick={(e) => { e.preventDefault(); handleRemoveImage(idx); }}
                          type="button"
                          className="absolute top-1.5 right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 z-10"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {(!form.imageUrls || form.imageUrls.length < 2) && (
                      <div className="relative border-2 border-dashed border-slate-300 dark:border-white/[0.1] rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 hover:border-slate-400 dark:hover:border-white/30 transition-colors h-20 cursor-pointer group">
                        <ImageIcon size={16} className="text-slate-400 dark:text-white/20 group-hover:text-slate-600 dark:group-hover:text-white/40" />
                        <span className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase text-center group-hover:text-slate-600 dark:group-hover:text-white/40">{t('common:add', 'Tambah')}</span>
                        <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 bg-slate-100 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/[0.05] gap-3 shrink-0">
              <Button
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:text-slate-900 dark:text-white/40 dark:hover:text-white"
              >
                {t('common:cancel', 'Batal')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || uploading}
                className="flex-[2] h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl hover:scale-105 transition-all"
                style={{ background: themeColor }}
              >
                {uploading ? t('common:uploading', 'Memuat naik gambar...') : saving ? t('common:saving', 'Menyimpan...') : editTarget ? t('common:update', 'Kemaskini') : t('kpp:save_activity', 'Simpan Aktiviti')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ─── CARD ────────────────────────────────────────────────────────────────────
function ExcoActivityCard({ act, canManage, currentUserId, themeColor, onEdit, onDelete }: any) {
  const { t } = useTranslation(['kpp', 'common']);
  const statusCfg   = ACTIVITY_STATUS[act.status] || ACTIVITY_STATUS.perancangan;
  const priorityCfg = PRIORITY_CONFIG[act.priority] || PRIORITY_CONFIG.sederhana;
  const isCreator   = act.user_id === currentUserId;

  const statusLabel = act.status === 'perancangan' ? t('kpp:planning', 'Perancangan')
    : act.status === 'aktif' ? t('common:active', 'Aktif')
    : act.status === 'selesai' ? t('kpp:completed', 'Selesai')
    : t('kpp:postponed', 'Ditangguh');

  const priorityLabel = act.priority === 'rendah' ? t('kpp:priority_low', 'Rendah')
    : act.priority === 'tinggi' ? t('kpp:priority_high', 'Tinggi')
    : t('kpp:priority_medium', 'Sederhana');

  const formatDate = (d: string | null) => {
    if (!d) return null;
    try { return format(parseISO(d), 'd MMM yyyy', { locale: ms }); }
    catch { return d; }
  };

  return (
    <div className="group rounded-[2rem] p-5 border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/[0.1] shadow-xs transition-all duration-300 flex flex-col gap-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-[10px] font-black uppercase px-2.5 py-1 rounded-full', statusCfg.bg, statusCfg.color)}>
            {statusLabel}
          </span>
          <div className="flex items-center gap-1.5">
            <div className={cn('w-1.5 h-1.5 rounded-full', priorityCfg.dot)} />
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-white/25 tracking-widest">{priorityLabel}</span>
          </div>
        </div>
        {(canManage || isCreator) && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white transition-colors flex items-center justify-center"
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={onDelete}
              className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:bg-white/[0.06] dark:text-white/30 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 transition-colors flex items-center justify-center"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-black text-base tracking-tight leading-snug line-clamp-2 text-slate-900 dark:text-white">{act.title}</h3>

      {/* Meta */}
      <div className="space-y-1.5 text-[11px] font-bold text-slate-500 dark:text-white/30">
        {act.start_date && (
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-slate-400 dark:text-white/20 shrink-0" />
            <span>{formatDate(act.start_date)}{act.end_date ? ` — ${formatDate(act.end_date)}` : ''}</span>
          </div>
        )}
        {act.location && (
          <div className="flex items-center gap-2">
            <MapPin size={12} className="text-slate-400 dark:text-white/20 shrink-0" />
            <span className="truncate">{act.location}</span>
          </div>
        )}
        {act.creator?.full_name && (
          <div className="flex items-center gap-2">
            <Users size={12} className="text-slate-400 dark:text-white/20 shrink-0" />
            <span className="truncate">{act.creator.full_name}</span>
          </div>
        )}
      </div>

      {/* Tindakan */}
      {act.tindakan && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest mb-1">{t('kpp:action', 'Tindakan')}</p>
          <p className="text-xs font-medium text-emerald-700/80 dark:text-emerald-300/80 line-clamp-2">{act.tindakan}</p>
        </div>
      )}
    </div>
  );
}
