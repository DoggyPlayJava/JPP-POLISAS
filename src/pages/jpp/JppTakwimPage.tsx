import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTakwimPusat } from '@/hooks/useTakwimPusat';
import { TAKWIM_JENIS, TAKWIM_FILTER_OPTIONS, SESI_OPTIONS, INSTITUSI_LABEL, type TakwimItem } from '@/config/takwim-constants';
import { TakwimPusatBulkForm } from '@/components/takwim/TakwimPusatBulkForm';
import { cn, hexToRgba } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ms } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { logAuditAction } from '@/lib/auditLogger';
import TakwimPusatPDFTemplate from '@/components/reports/TakwimPusatPDFTemplate';
import {
  CalendarDays, Plus, Filter, Download, ChevronLeft, ChevronRight,
  Pencil, Trash2, X, Table, LayoutGrid, Bell, Loader2, Upload, Check, Palette, Home,
} from 'lucide-react';
import { getContrastColor } from '@/lib/color-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { JPP_MT_POSITIONS } from '@/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DayDetailSheet } from '@/components/takwim/DayDetailSheet';
import { FloatingActionDock } from '@/components/ui/FloatingActionDock';

// ── Logo URLs ──
const LOGO_POLISAS_URL = '/polisas-logo.jpg';
async function toBase64(url: string): Promise<string> {
  try { const r = await fetch(url, { cache: 'force-cache' }); if (!r.ok) throw 0; const b = await r.blob(); return new Promise((res, rej) => { const rd = new FileReader(); rd.onloadend = () => res(rd.result as string); rd.onerror = rej; rd.readAsDataURL(b); }); }
  catch { return ''; }
}

// ── RBAC helper ──
function useRbac() {
  const { user, profile, isSuperAdmin } = useAuth();
  const jppPos = profile?.jpp_position as string | undefined;
  const jppUnit = profile?.jpp_unit as string | undefined;
  const isYDP = jppPos === 'YDP' || jppPos === 'YANG_DIPERTUA' || isSuperAdmin;
  const isMT = !isYDP && JPP_MT_POSITIONS.includes(jppPos as any);
  const [assigned, setAssigned] = useState<string[]>([]);
  useEffect(() => {
    if (!isMT || !user?.id) return;
    supabase.from('jpp_mt_assignments').select('unit').eq('mt_user_id', user.id)
      .then(({ data }) => { if (data) setAssigned(data.map((d: any) => d.unit)); });
  }, [user?.id, isMT]);

  const canAddJenis = (jenis: string) => {
    if (isYDP) return true;
    if (isMT) {
      const mod = TAKWIM_JENIS[jenis]?.excoModule;
      return mod ? assigned.includes(mod) : false;
    }
    if (jppUnit === 'AKADEMIK') return jenis === 'AKADEMIK' || jenis === 'AKADEMIK_EXCO' || jenis === 'CUTI_UMUM';
    if (jppUnit) return TAKWIM_JENIS[jenis]?.excoModule === jppUnit;
    return false;
  };

  const canEdit = (item: TakwimItem) => {
    if (item.type !== 'takwim_pusat') return false;
    if (isYDP) return true;
    if (isMT && item.exco_module) return assigned.includes(item.exco_module);
    return item.created_by === user?.id;
  };

  const allowedJenis = Object.keys(TAKWIM_JENIS).filter(j => canAddJenis(j) && j !== 'KELAB');
  const canAdd = allowedJenis.length > 0;
  const isAkademik = jppUnit === 'AKADEMIK' || isYDP;

  return { canAdd, canEdit, allowedJenis, isAkademik, isYDP, userId: user?.id };
}

// ── Main Page ──
export function JppTakwimPage() {
  const { t } = useTranslation(['jpp', 'common']);
  const [filter, setFilter] = useState('KESELURUHAN');
  const [sesi, setSesi] = useState('2026/2027');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TakwimItem | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [logoPolisas, setLogoPolisas] = useState('');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // ── Warna Rasmi (persisted) ──
  const [themeColor, setThemeColor] = useState('#1e3a5f');
  const [colorInput, setColorInput] = useState('#1e3a5f');
  const [savingColor, setSavingColor] = useState(false);
  const textOnTheme = getContrastColor(themeColor);

  useEffect(() => {
    toBase64(LOGO_POLISAS_URL).then(setLogoPolisas);
    // Load saved theme color
    supabase.from('system_settings').select('value').eq('key', 'jpp_theme_color').maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          let c = data.value;
          if (typeof c !== 'string') c = JSON.stringify(c);
          c = c.replace(/^"|"$/g, '');
          if (/^#[0-9A-Fa-f]{6}$/.test(c)) { setThemeColor(c); setColorInput(c); }
        }
      });
  }, []);

  const handleSaveColor = async () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(colorInput)) { toast.error(t('jpp:takwim_invalid_color_format', 'Format warna tidak sah.')); return; }
    setSavingColor(true);
    try {
      const { error } = await supabase.from('system_settings').update({ value: JSON.stringify(colorInput) }).eq('key', 'jpp_theme_color');
      if (error) { await supabase.from('system_settings').insert({ key: 'jpp_theme_color', value: JSON.stringify(colorInput) }); }
      setThemeColor(colorInput);
      toast.success(t('jpp:takwim_official_color_updated', 'Warna rasmi JPP berjaya dikemaskini.'));
    } catch { toast.error(t('jpp:takwim_save_color_failed', 'Gagal menyimpan warna.')); }
    finally { setSavingColor(false); }
  };

  const filterLabel = TAKWIM_FILTER_OPTIONS.find(o => o.value === filter)?.label || 'Keseluruhan';

  const { items, loading, refresh, stats } = useTakwimPusat({ filter, sesi });
  const rbac = useRbac();

  const emptyForm = { jenis: '', tajuk: '', catatan: '', tarikh_mula: '', tarikh_tamat: '', bil_minggu: '', aktiviti: '', warna_custom: '', kelab_kediaman_label: '' };
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState<TakwimItem | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const openCreate = () => { setEditTarget(null); setForm({ ...emptyForm, jenis: rbac.allowedJenis[0] || '' }); setDialogOpen(true); };
  const openEdit = (item: TakwimItem) => {
    setEditTarget(item);
    setForm({ jenis: item.jenis, tajuk: item.tajuk, catatan: item.catatan || '', tarikh_mula: item.tarikh_mula, tarikh_tamat: item.tarikh_tamat || '', bil_minggu: item.bil_minggu || '', aktiviti: item.aktiviti || '', warna_custom: item.warna_custom || '', kelab_kediaman_label: item.kelab_kediaman_label || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.tajuk || !form.tarikh_mula || !form.jenis) { toast.error(t('jpp:takwim_form_fill_required', 'Sila lengkapkan tajuk, tarikh & jenis.')); return; }
    setSaving(true);
    const payload = {
      jenis: form.jenis, tajuk: form.tajuk, catatan: form.catatan || null,
      tarikh_mula: form.tarikh_mula, tarikh_tamat: form.tarikh_tamat || null,
      bil_minggu: form.bil_minggu ? Number(form.bil_minggu) : null,
      aktiviti: form.aktiviti || null, sesi,
      exco_module: TAKWIM_JENIS[form.jenis]?.excoModule || null,
      created_by: rbac.userId,
      warna_custom: form.warna_custom || null,
      kelab_kediaman_label: form.jenis === 'KELAB_KEDIAMAN' ? (form.kelab_kediaman_label || null) : null,
    };
    try {
      const res = editTarget
        ? await supabase.from('takwim_pusat').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editTarget.id)
        : await supabase.from('takwim_pusat').insert([payload]);
      if (res.error) throw res.error;
      toast.success(editTarget ? t('jpp:takwim_entry_updated', 'Entri berjaya dikemaskini.') : t('jpp:takwim_entry_added', 'Entri berjaya ditambah.'));
      if (rbac.userId) logAuditAction({ actionType: editTarget ? 'TAKWIM_UPDATED' : 'TAKWIM_ADDED', module: 'Takwim', entityId: editTarget?.id, description: t('jpp:takwim_audit_entry_changed', 'Takwim {{action}}: {{title}} ({{jenis}})', { action: editTarget ? t('jpp:takwim_action_updated', 'dikemaskini') : t('jpp:takwim_action_added', 'ditambah'), title: form.tajuk, jenis: TAKWIM_JENIS[form.jenis]?.label || form.jenis }), actorId: rbac.userId });
      setDialogOpen(false);
      refresh();
    } catch (e: any) { toast.error(e.message || 'Gagal.'); }
    finally { setSaving(false); }
  };

  const executeSingleDelete = async () => {
    if (!deleteTargetItem) return;
    const item = deleteTargetItem;
    const { error } = await supabase.from('takwim_pusat').delete().eq('id', item.id);
    if (error) {
      toast.error(error.message || t('jpp:takwim_delete_item_failed', 'Gagal memadam item takwim.'));
    } else {
      toast.success(t('jpp:takwim_entry_deleted', 'Entri takwim berjaya dipadam.'));
      if (rbac.userId) logAuditAction({ actionType: 'TAKWIM_DELETED', module: 'Takwim', entityId: item.id, description: t('jpp:takwim_audit_deleted', 'Takwim dipadam: {{title}}', { title: item.tajuk }), actorId: rbac.userId });
      setDeleteTargetItem(null);
      refresh();
    }
  };

  const executeBulkDelete = async () => {
    const ids = Array.from(bulkSelected);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const { error } = await supabase.from('takwim_pusat').delete().in('id', ids);
      if (error) throw error;
      toast.success(t('jpp:takwim_bulk_deleted_success', '{{count}} entri berjaya dipadam.', { count: ids.length }));
      if (rbac.userId) logAuditAction({ actionType: 'TAKWIM_BULK_DELETED', module: 'Takwim', description: t('jpp:takwim_audit_bulk_deleted', '{{count}} entri takwim dipadam secara pukal', { count: ids.length }), actorId: rbac.userId, metadata: { count: ids.length } });
      setBulkSelected(new Set());
      setBulkConfirmOpen(false);
      refresh();
    } catch (e: any) {
      toast.error(e.message || t('jpp:takwim_delete_failed', 'Gagal memadam.'));
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleNotify = async () => {
    try {
      const { sendNotificationToAkademikExco } = await import('@/lib/notifications');
      await sendNotificationToAkademikExco({ title: t('jpp:takwim_notif_updated_title', 'Takwim Dikemaskini'), message: t('jpp:takwim_notif_updated_msg', 'Takwim POLISAS Berpusat telah dikemaskini. Sila semak.'), type: 'GENERAL', module: 'AKADEMIK', link: '/akademik/takwim' });
      toast.success(t('jpp:takwim_notif_sent', 'Notifikasi berjaya dihantar.'));
    } catch { toast.error(t('jpp:takwim_notif_failed', 'Gagal hantar notifikasi.')); }
  };

  return (
    <div className="w-full text-slate-900 dark:text-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {t('jpp:takwim_admin_title', 'Takwim Aktiviti Kampus & Jadual Akademik')}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-white/40">
                {INSTITUSI_LABEL} · {sesi} · {t('jpp:takwim_admin_subtitle', 'Pengurusan kalendar akademik, peperiksaan, cuti umum, dan acara rasmi kampus POLISAS.')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Warna Rasmi Panel (YDP / Super Admin only) ── */}
        {rbac.isYDP && (
          <div className="flex items-center gap-4 bg-card p-5 rounded-[2rem] border border-border shadow-sm">
            <Palette className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('jpp:takwim_official_color', 'Warna Rasmi JPP')}</p>
              <p className="text-[10px] text-muted-foreground">{t('jpp:takwim_official_color_desc', 'Digunakan pada header jadual, baris cuti & PDF takwim.')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input type="color" value={colorInput} onChange={e => setColorInput(e.target.value)} className="w-11 h-11 rounded-xl border-2 border-border cursor-pointer" />
              <div className="hidden sm:flex h-11 px-3 rounded-xl items-center font-black text-[10px] uppercase tracking-widest shadow-sm" style={{ backgroundColor: colorInput, color: getContrastColor(colorInput) }}>{colorInput}</div>
              <Button onClick={handleSaveColor} disabled={savingColor || colorInput === themeColor} variant="outline" size="sm" className="rounded-xl h-11 px-4 font-black text-xs">
                {savingColor ? '...' : t('common:save', 'Simpan')}
              </Button>
            </div>
          </div>
        )}

        {/* ── Controls ── */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white shadow-sm">
              <Filter className="w-3 h-3 mr-2 text-slate-400 dark:text-white/40" /><SelectValue />
            </SelectTrigger>
            <SelectContent>{TAKWIM_FILTER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={sesi} onValueChange={setSesi}>
            <SelectTrigger className="w-[150px] h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white shadow-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{SESI_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-xl p-1 border border-slate-200 dark:border-white/10">
            <button onClick={() => setViewMode('table')} className={cn('p-2 rounded-lg transition-all', viewMode === 'table' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70')}><Table className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('calendar')} className={cn('p-2 rounded-lg transition-all', viewMode === 'calendar' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70')}><LayoutGrid className="w-4 h-4" /></button>
          </div>
          <div className="ml-auto flex flex-wrap justify-end items-center gap-2">
            {rbac.isAkademik && (
              <Button onClick={() => setBulkMode(true)} variant="outline" className="h-10 rounded-xl border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-[10px] font-black uppercase tracking-widest">
                <Upload className="w-3 h-3 md:mr-2" />
                <span className="hidden md:inline">{t('jpp:takwim_autofill_btn', 'Auto-Fill Akademik')}</span>
              </Button>
            )}
            {rbac.isYDP && (
              <Button onClick={handleNotify} variant="outline" className="h-10 rounded-xl border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-[10px] font-black uppercase tracking-widest">
                <Bell className="w-3 h-3 md:mr-2" />
                <span className="hidden md:inline">{t('jpp:takwim_broadcast_btn', 'Hebah')}</span>
              </Button>
            )}
            {items.length > 0 && (
              <Button
                onClick={async () => {
                  setIsExportingPdf(true);
                  try {
                    const { pdf } = await import('@react-pdf/renderer');
                    const { saveAs } = await import('file-saver');
                    const doc = <TakwimPusatPDFTemplate data={items} themeColor={themeColor} session={sesi} filterLabel={filterLabel} logoPolisas={logoPolisas} />;
                    const blob = await pdf(doc).toBlob();
                    saveAs(blob, ['Takwim_POLISAS', sesi.replace('/', '-'), filterLabel].join('_') + '.pdf');
                  } catch (err) {
                    console.error('PDF export error:', err);
                    toast.error(t('jpp:takwim_pdf_gen_failed', 'Gagal menjana PDF takwim.'));
                  } finally {
                    setIsExportingPdf(false);
                  }
                }}
                disabled={isExportingPdf}
                variant="outline"
                className="h-10 rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase tracking-widest"
              >
                {isExportingPdf ? <Loader2 className="w-3 h-3 animate-spin md:mr-2" /> : <Download className="w-3 h-3 md:mr-2" />}
                <span className="hidden md:inline">{t('jpp:takwim_export_pdf', 'Eksport PDF')}</span>
              </Button>
            )}
            {rbac.canAdd && (
              <Button onClick={openCreate} className="h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest">
                <Plus className="w-3 h-3 md:mr-2" />
                <span className="hidden md:inline">{t('jpp:takwim_add_event_btn', 'Tambah Acara Takwim')}</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Stats Badges ── */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats || {}).filter(([k]) => k !== 'KESELURUHAN').map(([k, v]) => {
            const cfg = TAKWIM_JENIS[k];
            if (!cfg || v === 0) return null;
            return (
              <Badge key={k} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border-none cursor-pointer hover:scale-105 transition-transform"
                style={{ background: cfg.bgColor, color: cfg.color }}
                onClick={() => setFilter(k)}>
                {cfg.shortLabel}: {v}
              </Badge>
            );
          })}
          {(stats?.KESELURUHAN || 0) > 0 && <Badge className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border border-slate-200 dark:border-white/10">Jumlah: {stats.KESELURUHAN}</Badge>}
        </div>

        {/* ── Floating Bulk Actions Dock ── */}
        <FloatingActionDock
          count={bulkSelected.size}
          onClear={() => setBulkSelected(new Set())}
          actions={[
            {
              label: bulkDeleting ? t('jpp:takwim_deleting_progress', 'Memadam...') : t('jpp:takwim_bulk_delete_btn', 'Padam Pukal'),
              onClick: () => setBulkConfirmOpen(true),
              icon: Trash2,
              variant: 'destructive',
              disabled: bulkDeleting,
            },
          ]}
        />

        {/* ── Content ── */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden bg-white/50 dark:bg-white/[0.02] p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100 dark:border-white/5 last:border-none animate-pulse">
                <div className="w-4 h-4 rounded bg-slate-200 dark:bg-white/10" />
                <div className="w-20 h-4 rounded-full bg-slate-200 dark:bg-white/10" />
                <div className="flex-1 h-4 rounded bg-slate-200 dark:bg-white/10" />
                <div className="w-28 h-4 rounded bg-slate-200 dark:bg-white/10" />
                <div className="w-16 h-4 rounded bg-slate-200 dark:bg-white/10" />
              </div>
            ))}
          </div>
        ) : viewMode === 'table' ? (
          <TakwimTable items={items} rbac={rbac} onEdit={openEdit} onDelete={(item) => setDeleteTargetItem(item)} bulkSelected={bulkSelected} onBulkToggle={setBulkSelected} />
        ) : (
          <TakwimCalendar items={items} month={calMonth} onPrev={() => setCalMonth(m => subMonths(m, 1))} onNext={() => setCalMonth(m => addMonths(m, 1))} onDayClick={setSelectedDay} />
        )}
      </div>

      {/* Day Detail Popup */}
      <DayDetailSheet
        day={selectedDay}
        events={selectedDay ? items.filter(i => {
          const s = parseISO(i.tarikh_mula);
          const e = i.tarikh_tamat ? parseISO(i.tarikh_tamat) : s;
          return selectedDay >= s && selectedDay <= e;
        }) : []}
        onClose={() => setSelectedDay(null)}
      />

      {/* ── CRUD Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-[2rem] p-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
          <div className="p-8 space-y-6 overflow-y-auto flex-1">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{editTarget ? t('jpp:takwim_edit_title', 'Kemaskini') : t('jpp:takwim_new_entry_title', 'Entri Baharu')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/50 tracking-widest">Jenis *</Label>
                <Select value={form.jenis} onValueChange={v => setForm({ ...form, jenis: v })} disabled={!!editTarget}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>{rbac.allowedJenis.map(j => <SelectItem key={j} value={j}>{TAKWIM_JENIS[j]?.label || j}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/50 tracking-widest">Tajuk *</Label>
                <Input value={form.tajuk} onChange={e => setForm({ ...form, tajuk: e.target.value })} className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold" placeholder={t('jpp:takwim_title_placeholder', 'Nama aktiviti / peristiwa...')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/50 tracking-widest">{t('jpp:takwim_start_date_required', 'Tarikh Mula *')}</Label>
                  <Input type="date" value={form.tarikh_mula} onChange={e => setForm({ ...form, tarikh_mula: e.target.value })} className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/50 tracking-widest">{t('jpp:takwim_end_date_label', 'Tarikh Tamat')}</Label>
                  <Input type="date" value={form.tarikh_tamat} onChange={e => setForm({ ...form, tarikh_tamat: e.target.value })} className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/50 tracking-widest">Catatan</Label>
                <Textarea value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} className="rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-medium min-h-[60px] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/50 tracking-widest">Bil. Minggu</Label>
                  <Input type="number" value={form.bil_minggu} onChange={e => setForm({ ...form, bil_minggu: e.target.value })} className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold" placeholder="—" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/50 tracking-widest">Aktiviti</Label>
                  <Input value={form.aktiviti} onChange={e => setForm({ ...form, aktiviti: e.target.value })} className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold" />
                </div>
              </div>
              {/* Kelab Kediaman Label */}
              {form.jenis === 'KELAB_KEDIAMAN' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/50 tracking-widest">{t('jpp:takwim_hostel_club_name', 'Nama Kelab Kediaman')}</Label>
                  <Input value={form.kelab_kediaman_label} onChange={e => setForm({ ...form, kelab_kediaman_label: e.target.value })} className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold" placeholder="cth: JPPI, AG, IS..." />
                </div>
              )}
              {/* Color Picker */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-white/50 tracking-widest">{t('jpp:takwim_custom_color', 'Warna Custom (Pilihan)')}</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.warna_custom || TAKWIM_JENIS[form.jenis]?.color || '#94A3B8'} onChange={e => setForm({ ...form, warna_custom: e.target.value })} className="w-12 h-12 rounded-xl border-2 border-slate-200 dark:border-white/10 cursor-pointer bg-transparent" />
                  <div className="flex-1">
                    <Input value={form.warna_custom} onChange={e => setForm({ ...form, warna_custom: e.target.value })} className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold" placeholder={TAKWIM_JENIS[form.jenis]?.color || '#94A3B8'} />
                  </div>
                  {form.warna_custom && (
                    <button onClick={() => setForm({ ...form, warna_custom: '' })} className="text-[10px] font-bold text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/60">Reset</button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/5 gap-3">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 h-12 rounded-xl text-slate-600 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/5">{t('common:cancel', 'Batal')}</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-[2] h-12 rounded-xl bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest">
              {saving ? t('common:saving', 'Menyimpan...') : editTarget ? t('jpp:takwim_edit_title', 'Kemaskini') : t('common:save', 'Simpan')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Form Dialog ── */}
      {rbac.userId && (
        <TakwimPusatBulkForm
          open={bulkMode}
          onClose={() => setBulkMode(false)}
          onSuccess={refresh}
          userId={rbac.userId}
          sesi={sesi}
        />
      )}

      {/* Single Item Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTargetItem)}
        onOpenChange={(open) => !open && setDeleteTargetItem(null)}
        title={t('jpp:takwim_confirm_delete_title', 'Padam Entri Takwim')}
        description={deleteTargetItem ? t('jpp:takwim_confirm_delete_single_desc', 'Adakah anda pasti mahu memadam "{{title}}" daripada takwim berpusat?', { title: deleteTargetItem.tajuk }) : ''}
        confirmLabel={t('jpp:takwim_delete_entry_btn', 'Padam Entri')}
        cancelLabel={t('common:cancel', 'Batal')}
        variant="destructive"
        onConfirm={executeSingleDelete}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title={t('jpp:takwim_delete_bulk_title', 'Padam Entri Pukal')}
        description={t('jpp:takwim_confirm_delete_bulk_desc', 'Adakah anda pasti mahu memadam {{count}} entri takwim yang dipilih?', { count: bulkSelected.size })}
        confirmLabel={t('jpp:takwim_delete_all_btn', 'Padam Semua')}
        cancelLabel={t('common:cancel', 'Batal')}
        variant="destructive"
        isLoading={bulkDeleting}
        onConfirm={executeBulkDelete}
      />
    </div>
  );
}

// ── Table View ──
function TakwimTable({ items, rbac, onEdit, onDelete, bulkSelected, onBulkToggle }: {
  items: TakwimItem[]; rbac: any; onEdit: (i: TakwimItem) => void; onDelete: (i: TakwimItem) => void;
  bulkSelected: Set<string>; onBulkToggle: (s: Set<string>) => void;
}) {
  const { t } = useTranslation(['jpp', 'common']);
  if (items.length === 0) return <EmptyState />;
  const fmtDate = (d: string) => { try { return format(parseISO(d), 'd MMM yyyy', { locale: ms }); } catch { return d; } };
  const editableItems = items.filter(i => i.type === 'takwim_pusat' && rbac.canEdit(i));
  const allSelected = editableItems.length > 0 && editableItems.every(i => bulkSelected.has(i.id));

  const toggleAll = () => {
    if (allSelected) { onBulkToggle(new Set()); }
    else { onBulkToggle(new Set(editableItems.map(i => i.id))); }
  };
  const toggleOne = (id: string) => {
    const next = new Set(bulkSelected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onBulkToggle(next);
  };

  return (
    <div className="bg-white dark:bg-transparent rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10">
              <th className="px-3 py-3 w-10">
                {editableItems.length > 0 && (
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 text-rose-500 focus:ring-rose-500/30" />
                )}
              </th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">{t('jpp:takwim_th_type', 'Jenis')}</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">{t('jpp:takwim_th_title', 'Tajuk')}</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">{t('jpp:takwim_th_date', 'Tarikh')}</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">{t('jpp:takwim_th_week', 'Minggu')}</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">{t('jpp:takwim_th_notes', 'Catatan')}</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {items.map(item => {
              const cfg = TAKWIM_JENIS[item.jenis];
              const color = item.warna_custom || cfg?.color || '#94A3B8';
              const canMod = rbac.canEdit(item);
              const isChecked = bulkSelected.has(item.id);
              return (
                <tr key={`${item.type}-${item.id}`} className={cn('hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group', isChecked && 'bg-rose-500/[0.03]')}>
                  <td className="px-3 py-3">
                    {canMod && (
                      <input type="checkbox" checked={isChecked} onChange={() => toggleOne(item.id)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 text-rose-500 focus:ring-rose-500/30" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border-none" style={{ background: hexToRgba(color, 0.15), color }}>{cfg?.shortLabel || item.jenis}</Badge>
                    {item.status && <Badge className="ml-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-amber-500/10 text-amber-500 dark:text-amber-400 border-none">{item.status}</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-black text-slate-900 dark:text-white/90 leading-tight">{item.tajuk}</p>
                    {item.club_name && <p className="text-[10px] text-slate-500 dark:text-white/30 mt-0.5">{item.club_name}</p>}
                    {item.kelab_kediaman_label && <p className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400/60 mt-0.5 flex items-center gap-1"><Home className="w-3 h-3 inline" /> {item.kelab_kediaman_label}</p>}
                  </td>
                  <td className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-white/60 whitespace-nowrap">
                    {fmtDate(item.tarikh_mula)}{item.tarikh_tamat && item.tarikh_tamat !== item.tarikh_mula ? ' — ' + fmtDate(item.tarikh_tamat) : ''}
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-slate-600 dark:text-white/40 text-center">{item.bil_minggu || '—'}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-500 dark:text-white/40 max-w-[200px] truncate">{item.catatan || '—'}</td>
                  <td className="px-4 py-3">
                    {canMod && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(item)} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/40 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"><Pencil size={11} /></button>
                        <button onClick={() => onDelete(item)} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/40 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 size={11} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Calendar View ──
function TakwimCalendar({ items, month, onPrev, onNext, onDayClick }: { items: TakwimItem[]; month: Date; onPrev: () => void; onNext: () => void; onDayClick: (day: Date) => void }) {
  const { t } = useTranslation(['jpp', 'common']);
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startDay = getDay(startOfMonth(month));
  const getEvents = (day: Date) => items.filter(i => { const s = parseISO(i.tarikh_mula); const e = i.tarikh_tamat ? parseISO(i.tarikh_tamat) : s; return day >= s && day <= e; });

  return (
    <div className="bg-white dark:bg-transparent rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5">
        <button onClick={onPrev} className="p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-600 dark:text-white/50 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{format(month, 'MMMM yyyy', { locale: ms })}</h3>
        <button onClick={onNext} className="p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-600 dark:text-white/50 transition-colors"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7">
        {['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'].map(d => (
          <div key={d} className="p-2 text-center text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/25 border-b border-slate-100 dark:border-white/5">{d}</div>
        ))}
        {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} className="p-2 min-h-[80px] border-b border-r border-slate-100 dark:border-white/[0.03]" />)}
        {days.map(day => {
          const evts = getEvents(day);
          const isToday = isSameDay(day, new Date());
          const hasEvents = evts.length > 0;
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                'p-1.5 min-h-[80px] border-b border-r border-slate-100 dark:border-white/[0.03] transition-colors cursor-pointer select-none overflow-hidden',
                isToday && 'bg-indigo-500/5',
                hasEvents ? 'hover:bg-slate-50 dark:hover:bg-white/[0.04] active:bg-slate-100 dark:active:bg-white/[0.07]' : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'
              )}
            >
              <span className={cn('text-[10px] font-black', isToday ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-600 dark:text-white/40')}>
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-0.5">
                {evts.slice(0, 3).map(e => {
                  const c = e.warna_custom || TAKWIM_JENIS[e.jenis]?.color || '#94A3B8';
                  return <div key={e.id} className="text-[8px] font-bold px-1.5 py-0.5 rounded truncate w-full" style={{ background: hexToRgba(c, 0.15), color: c }}>{e.tajuk}</div>;
                })}
                {evts.length > 3 && (
                  <div className="text-[8px] font-black text-slate-500 dark:text-white/40 px-1.5 py-0.5 rounded truncate w-full" style={{ background: 'rgba(148,163,184,0.15)' }}>{t('jpp:takwim_more_items', '+{{count}} lagi', { count: evts.length - 3 })}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation(['jpp', 'common']);
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <CalendarDays className="w-10 h-10 text-slate-300 dark:text-white/10 mb-3" />
      <p className="text-xs font-black text-slate-600 dark:text-white/40 uppercase tracking-widest">{t('jpp:takwim_empty_title', 'Tiada entri takwim')}</p>
      <p className="text-[10px] text-slate-400 dark:text-white/20 mt-1">{t('jpp:takwim_empty_desc', 'Gunakan butang "Tambah" untuk menambah entri baru')}</p>
    </div>
  );
}
